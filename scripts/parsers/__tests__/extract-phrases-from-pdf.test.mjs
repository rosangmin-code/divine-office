/**
 * Unit + snapshot tests for `extract-phrases-from-pdf.mjs` (FR-161 R-1).
 *
 * Fixtures: raw `pdftotext -layout` output for three pilot psalms captured
 * directly from `public/psalter.pdf`:
 *
 *   - psalter-physical-035.txt — Psalm 110:1-5,7 (book 68 left col)
 *   - psalter-physical-047.txt — Psalm 24:1-10  (book 92 left col)
 *   - psalter-physical-142.txt — Psalm 8:2-10   (book 282 left col)
 *
 * Why fixtures and not a live `pdftotext` shell call: the test must run on
 * any machine without poppler-utils installed, must be deterministic across
 * pdftotext minor-version drift, and must keep CI byte-for-byte stable. The
 * fixtures are captured ONCE (regenerate with the helper command in the
 * comment block at the top of each fixture's parent dir).
 *
 * What the tests assert (NOT just snapshot drift):
 *   1. baseline detection lands on the expected ASCII column for each pilot.
 *   2. Phrase grouping aligns with the manual phrase boundaries documented
 *      in fr-161-r0-pdf-reparse-spike.md (Psalm 24 left col: 6 wrap pairs,
 *      Psalm 110 left col: each line is its own phrase, etc.).
 *   3. needsReview flag triggers when Stage 1 ↔ Stage 2 disagree (synthetic
 *      input, not a fixture).
 *   4. Output strictly matches R-3 PhraseGroup contract — `lineRange` is a
 *      [start, end] tuple of nonneg ints, `indent` ∈ {0,1,2}.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  extractPhrasesFromColumn,
  detectBaselineCol,
  splitIntoStanzas,
  runStage1,
  runStage2,
  crossCheckDisagrees,
} from '../extract-phrases-from-pdf.mjs'
import { splitColumns } from '../pdftotext-column-splitter.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = resolve(HERE, 'fixtures')

function loadColumn(physicalPage, side) {
  const txt = readFileSync(
    resolve(FIXTURE_DIR, `psalter-physical-${String(physicalPage).padStart(3, '0')}.txt`),
    'utf-8',
  )
  const split = splitColumns(txt, [physicalPage])
  const stream = split.find((s) => s.column === side)
  if (!stream) throw new Error(`no ${side} column for page ${physicalPage}`)
  return stream.lines
}

// @fr FR-161
describe('detectBaselineCol', () => {
  it('finds the dominant phrase-start column on Psalm 24 left', () => {
    const lines = loadColumn(47, 'left')
    const baseline = detectBaselineCol(lines)
    // Psalm 24 left col body lines start at col 3 (3-space indent).
    expect(baseline).toBe(3)
  })

  it('finds the dominant phrase-start column on Psalm 8 left', () => {
    const lines = loadColumn(142, 'left')
    const baseline = detectBaselineCol(lines)
    expect(baseline).toBe(3)
  })

  it('returns 0 for an all-blank column', () => {
    expect(detectBaselineCol(['', '', ''])).toBe(0)
  })

  it('falls back to the smallest indent when no indent has >=2 hits', () => {
    // One line at col 5, no other repeated indents → fallback path.
    expect(detectBaselineCol(['     solo'])).toBe(5)
  })
})

// @fr FR-161
describe('splitIntoStanzas', () => {
  it('groups consecutive non-blank lines and skips empty ones', () => {
    const groups = splitIntoStanzas([
      '   a',
      '      b',
      '',
      '',
      '   c',
      '   d',
      '',
      '   e',
    ])
    expect(groups).toHaveLength(3)
    expect(groups[0]).toEqual(['   a', '      b'])
    expect(groups[1]).toEqual(['   c', '   d'])
    expect(groups[2]).toEqual(['   e'])
  })

  it('returns an empty array for all-blank input', () => {
    expect(splitIntoStanzas(['', '', ''])).toEqual([])
  })
})

// @fr FR-161
describe('runStage1 phrase grouping', () => {
  it('treats baseline-aligned lines as phrase starts and +3 lines as wraps', () => {
    // Synthetic stanza modelled on Psalm 24 verses 1-2.
    const stanza = [
      '   Газар хийгээд', // col 3 = baseline
      '      түүнийг дүүргэдэг бүхэн,', // col 6 = wrap
      '   Дэлхий хийгээд', // col 3 = phrase 2 start
      '      түүнд оршигч бүгд ЭЗЭНийх юм.', // col 6 = wrap
    ]
    const out = runStage1(stanza, 3)
    expect(out.lines).toEqual([
      'Газар хийгээд',
      'түүнийг дүүргэдэг бүхэн,',
      'Дэлхий хийгээд',
      'түүнд оршигч бүгд ЭЗЭНийх юм.',
    ])
    expect(out.phrases).toEqual([
      { lineRange: [0, 1], indent: 0 },
      { lineRange: [2, 3], indent: 0 },
    ])
  })

  it('leaves each baseline-only line as its own phrase (no wraps present)', () => {
    const stanza = [
      '   ЭЗЭН миний Эзэнд',
      '   "Би чиний дайснуудыг',
      '   Хөлийн чинь гишгүүр болготол',
    ]
    const out = runStage1(stanza, 3)
    expect(out.phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
  })

  it('promotes a deeply-indented phrase start to indent=1', () => {
    const stanza = [
      '   baseline phrase', // col 3 = indent 0
      '         indented phrase', // col 9 = baseline + 6 → indent 1
    ]
    const out = runStage1(stanza, 3)
    expect(out.phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 1 },
    ])
  })
})

// @fr FR-161
describe('runStage2 punctuation heuristic (Cyrillic-safe)', () => {
  it('treats sentence-end + capital-start as a phrase boundary', () => {
    const lines = [
      'Газар хийгээд',
      'түүнийг дүүргэдэг бүхэн,',
      'ЭЗЭНийх юм.', // sentence end
      'Дэлхий хийгээд', // Cyrillic capital start
    ]
    expect(runStage2(lines)).toEqual([0, 3])
  })

  it('handles closing curly quote after the terminator', () => {
    const lines = [
      'гэв.”', // .” = end
      'Сионоос',
    ]
    expect(runStage2(lines)).toEqual([0, 1])
  })

  it('returns [0] when no boundary is detected', () => {
    const lines = ['comma at end,', 'lowercase next']
    expect(runStage2(lines)).toEqual([0])
  })
})

// @fr FR-161
describe('crossCheckDisagrees', () => {
  it('returns false when Stage 1 and Stage 2 starts match exactly', () => {
    const stage1 = [{ lineRange: [0, 1] }, { lineRange: [2, 3] }]
    const stage2 = [0, 2]
    expect(crossCheckDisagrees(stage1, stage2)).toBe(false)
  })

  it('returns true when phrase counts differ', () => {
    const stage1 = [{ lineRange: [0, 0] }, { lineRange: [1, 1] }]
    const stage2 = [0]
    expect(crossCheckDisagrees(stage1, stage2)).toBe(true)
  })

  it('returns true when starts differ even with matching counts', () => {
    const stage1 = [{ lineRange: [0, 1] }, { lineRange: [2, 2] }]
    const stage2 = [0, 1]
    expect(crossCheckDisagrees(stage1, stage2)).toBe(true)
  })
})

// @fr FR-161
describe('extractPhrasesFromColumn — end-to-end on pilot fixtures', () => {
  it('Psalm 24 left col: detects 6 wrap-pair phrases across verses 1-6', () => {
    const lines = loadColumn(47, 'left')
    const out = extractPhrasesFromColumn(lines)
    expect(out.baselineCol).toBe(3)

    // The R-0 spike documented 6 wrap pairs (verses 1-6: each verse is one
    // baseline-start line + one +3-indented wrap line). Count phrases of
    // length 2 across all stanzas — should be exactly 6.
    const wrapPairs = []
    for (const stanza of out.stanzas) {
      for (const phrase of stanza.phrases) {
        const [start, end] = phrase.lineRange
        if (end - start === 1) wrapPairs.push({ stanza, phrase })
      }
    }
    expect(wrapPairs).toHaveLength(6)

    // Verse 1 lives in the stanza starting "Газар хийгээд" → its single
    // phrase covers both lines (start + wrap).
    const v1 = out.stanzas.find((s) => s.lines[0] === 'Газар хийгээд')
    expect(v1).toBeDefined()
    expect(v1.phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])

    // The wider 6-line block (verses 4-6 with no internal blank lines —
    // "Гол мөрнүүд дээр" through "хэн зогсож болох вэ?") must split into
    // 3 wrap pairs.
    const denseBlock = out.stanzas.find((s) => s.lines[0] === 'Гол мөрнүүд дээр')
    expect(denseBlock).toBeDefined()
    expect(denseBlock.phrases).toEqual([
      { lineRange: [0, 1], indent: 0 },
      { lineRange: [2, 3], indent: 0 },
      { lineRange: [4, 5], indent: 0 },
    ])
  })

  it('Psalm 8 left col: produces stanzas with consistent phrase coverage', () => {
    const lines = loadColumn(142, 'left')
    const out = extractPhrasesFromColumn(lines)
    expect(out.baselineCol).toBe(3)

    // Every stanza's phrases together must cover ALL of its lines exactly
    // once (no overlap, no gap) — that is the FR-161 R-6 verifier contract,
    // enforced here as a structural invariant.
    for (const stanza of out.stanzas) {
      const covered = new Set()
      for (const phrase of stanza.phrases) {
        const [start, end] = phrase.lineRange
        expect(start).toBeGreaterThanOrEqual(0)
        expect(end).toBeLessThan(stanza.lines.length)
        expect(start).toBeLessThanOrEqual(end)
        for (let i = start; i <= end; i++) {
          expect(covered.has(i)).toBe(false) // no overlap
          covered.add(i)
        }
      }
      expect(covered.size).toBe(stanza.lines.length) // no gaps
    }
  })

  it('Psalm 110 left col: each phrase typically a single line (wrap-free)', () => {
    const lines = loadColumn(35, 'left')
    const out = extractPhrasesFromColumn(lines)

    // Find the stanza containing "ЭЗЭН миний Эзэнд" (Psalm 110 v1 opening).
    const v1Stanza = out.stanzas.find((s) =>
      s.lines.some((l) => l.includes('ЭЗЭН миний Эзэнд')),
    )
    expect(v1Stanza).toBeDefined()

    // In Psalm 110 left col, the spike documented phrase-wraps are absent —
    // each line should be its own phrase. Assert at least one stanza in
    // this page has 1-line-per-phrase ratio.
    const oneLinePhrases = v1Stanza.phrases.filter(
      (p) => p.lineRange[0] === p.lineRange[1],
    )
    expect(oneLinePhrases.length).toBe(v1Stanza.phrases.length)
  })

  it('output strictly matches R-3 PhraseGroup contract across all 3 fixtures', () => {
    for (const physical of [35, 47, 142]) {
      const lines = loadColumn(physical, 'left')
      const out = extractPhrasesFromColumn(lines)
      for (const stanza of out.stanzas) {
        for (const phrase of stanza.phrases) {
          // PhraseGroup.lineRange: [number, number] of nonneg ints.
          expect(Array.isArray(phrase.lineRange)).toBe(true)
          expect(phrase.lineRange).toHaveLength(2)
          expect(Number.isInteger(phrase.lineRange[0])).toBe(true)
          expect(Number.isInteger(phrase.lineRange[1])).toBe(true)
          expect(phrase.lineRange[0]).toBeGreaterThanOrEqual(0)
          expect(phrase.lineRange[1]).toBeGreaterThanOrEqual(phrase.lineRange[0])
          // PhraseGroup.indent: 0 | 1 | 2.
          expect([0, 1, 2]).toContain(phrase.indent)
        }
      }
    }
  })
})

// @fr FR-161
describe('extractPhrasesFromColumn — Stage 3 review queue', () => {
  it('flags needsReview=true when Stage 1 splits a phrase that Stage 2 considers continuous', () => {
    // Stage 1 sees baseline=3 and treats every line as a new phrase
    // (no +3 indent → no wraps). Stage 2 sees the lines as ONE flowing
    // phrase (no sentence-end punctuation between them). The two stages
    // disagree → needsReview should fire.
    const synthetic = [
      '   first line of phrase',
      '   second line of same phrase',
      '   third line of same phrase',
    ]
    const out = extractPhrasesFromColumn(synthetic, { baseline: 3 })
    expect(out.stanzas).toHaveLength(1)
    expect(out.stanzas[0].needsReview).toBe(true)
    expect(out.stanzas[0].phrases).toHaveLength(3)
  })

  it('keeps needsReview=false when Stage 1 ↔ Stage 2 align (sentence-ended phrases)', () => {
    const aligned = [
      '   phrase one ends here.',
      '   Phrase two ends too.',
    ]
    const out = extractPhrasesFromColumn(aligned, { baseline: 3 })
    expect(out.stanzas[0].needsReview).toBe(false)
    expect(out.stanzas[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ])
  })
})
