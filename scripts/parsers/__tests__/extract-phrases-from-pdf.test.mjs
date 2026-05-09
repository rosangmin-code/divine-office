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
  detectRefrains,
  refineParagraphBoundariesWithRefrains,
  splitIntoStanzas,
  dropColumnArtifactBlanks,
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

/**
 * F-X11 (#408) — fixture loader that returns BOTH columns. Used by tests
 * that exercise the production CLI flow (column-aware artifact filtering)
 * via `extractPhrasesFromColumn(thisCol, { otherColumnLines: otherCol })`.
 * Mirrors what `extractPhrasesFromPdf` does in the live extractor.
 */
function loadBothColumns(physicalPage, side) {
  const txt = readFileSync(
    resolve(FIXTURE_DIR, `psalter-physical-${String(physicalPage).padStart(3, '0')}.txt`),
    'utf-8',
  )
  const split = splitColumns(txt, [physicalPage])
  const target = split.find((s) => s.column === side)
  if (!target) throw new Error(`no ${side} column for page ${physicalPage}`)
  const otherSide = side === 'left' ? 'right' : 'left'
  const other = split.find((s) => s.column === otherSide)
  return { lines: target.lines, otherColumnLines: other?.lines ?? [] }
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
  // F-X11 (#408) — paragraph-aware splitting:
  //   1-blank between content lines → paragraph boundary within stanza
  //   ONLY when the prev line ends with sentence-terminator punctuation
  //   AND the next line starts with an uppercase letter (the same
  //   cross-check that Stage 2 uses for phrase boundaries; PDF visual
  //   paragraph breaks consistently land at sentence ends).
  //   Mid-clause 1-blanks (comma-terminated, lowercase wraps) are
  //   treated as column-split artifacts and ignored.
  //   2+-blank → new stanza (unchanged from pre-F-X11).
  //   Each emitted stanza carries `{ lines, paragraphBoundaries }`
  //   (the latter is the in-stanza line index where each within-stanza
  //   paragraph begins).
  it('treats 2+-blank as stanza boundary; 1-blank with sentence-end heuristic as paragraph break', () => {
    const groups = splitIntoStanzas([
      '   First clause part,', // ends with comma → no boundary even with 1-blank
      '      lowercase wrap',
      '',
      '',
      '   Second sentence ends.', // ends with period
      '   Continuing clause,',
      '',
      '   Final sentence opens.', // capital-start AFTER period → boundary
    ])
    // 2-blank → new stanza.
    // 1-blank between "Continuing clause," and "Final sentence opens." has
    // prev=comma → NO boundary (mid-clause artifact).
    expect(groups).toHaveLength(2)
    expect(groups[0].lines).toEqual([
      '   First clause part,',
      '      lowercase wrap',
    ])
    expect(groups[0].paragraphBoundaries).toEqual([])
    expect(groups[1].lines).toEqual([
      '   Second sentence ends.',
      '   Continuing clause,',
      '   Final sentence opens.',
    ])
    // prev "Continuing clause," — comma, NOT a paragraph boundary.
    expect(groups[1].paragraphBoundaries).toEqual([])
  })

  it('promotes 1-blank to paragraph boundary when sentence-end + capital-start match', () => {
    // Mirrors user-reported Psalm 46:2-12 right col — content row,
    // single artifact blank, content row whose prev ended with `.` and
    // next starts capital → real paragraph break.
    const groups = splitIntoStanzas([
      'Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.',
      '',
      'Түг түмдийн ЭЗЭН бидэнтэй хамт',
      'Иаковын Тэнгэрбурхан бидний хүчит цайз.',
      '',
      'Тэнгэрбурханы хотыг,',
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].lines).toEqual([
      'Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.',
      'Түг түмдийн ЭЗЭН бидэнтэй хамт',
      'Иаковын Тэнгэрбурхан бидний хүчит цайз.',
      'Тэнгэрбурханы хотыг,',
    ])
    // Boundaries: before "Түг" (idx 1, prev ends in period, capital
    // start) AND before "Тэнгэрбурханы" (idx 3, same).
    expect(groups[0].paragraphBoundaries).toEqual([1, 3])
  })

  it('returns an empty array for all-blank input', () => {
    expect(splitIntoStanzas(['', '', ''])).toEqual([])
  })

  it('treats leading blanks as no-op (no boundary at index 0)', () => {
    const groups = splitIntoStanzas(['', 'Sentence ends.', 'Next clause,'])
    expect(groups).toHaveLength(1)
    expect(groups[0].lines).toEqual(['Sentence ends.', 'Next clause,'])
    expect(groups[0].paragraphBoundaries).toEqual([])
  })
})

// @fr FR-161
// F-X11 (#408) — column-split artifact detection. `splitColumns` emits a
// blank in the target column whenever the OTHER column has content at the
// same physical row (typical 2-up landscape layout). Those blanks are
// pure layout artifacts — not visual paragraph breaks. The filter drops
// them before stanza splitting so 1-blank vs 2+-blank counts reflect
// real PDF spacing only.
describe('dropColumnArtifactBlanks (F-X11)', () => {
  it('drops blanks where the other column has content at the same row', () => {
    const left = ['line A', '', 'line B', '', 'line C']
    const right = ['', 'left col running', '', 'left col running', '']
    // Row 1, 3 in left col are blank but right col has content → drop.
    expect(dropColumnArtifactBlanks(left, right)).toEqual(['line A', 'line B', 'line C'])
  })

  it('preserves blanks where BOTH columns are blank (real paragraph rows)', () => {
    const left = ['line A', '', 'line B']
    const right = ['', '', '']
    // Row 1 is blank in BOTH columns → real PDF blank row, keep.
    expect(dropColumnArtifactBlanks(left, right)).toEqual(['line A', '', 'line B'])
  })

  it('is a pass-through when the other-column stream is undefined (legacy mode)', () => {
    const lines = ['a', '', 'b']
    expect(dropColumnArtifactBlanks(lines, undefined)).toEqual(lines)
    expect(dropColumnArtifactBlanks(lines, [])).toEqual(lines)
  })

  // F-X11 follow-up batch (#426 — review #419 M-2): defensive test for
  // `otherColLines` shorter than `thisColLines`. Production `splitColumns`
  // emits row-aligned EQUAL-length streams, so this length-mismatch path
  // is never hit by the live extractor today. The function still has to
  // behave defensively (out-of-range index → treat as blank → keep the
  // blank in `out`) because future `splitColumns` refactors could break
  // the equal-length invariant silently. Without this guard the regression
  // would surface as paragraph-boundary corruption in fixtures whose
  // length depends on the other-column stream — far downstream from the
  // root cause. Asserting the defensive behaviour here ensures the
  // contract is locked even though current callers don't exercise it.
  it('treats out-of-range otherColLines as blank (defensive contract for length mismatch)', () => {
    const left = ['line A', '', 'line B', '', 'line C']
    // Right col stops at index 2 — last 2 rows of left have NO paired
    // other-col row. The blank at index 3 should be KEPT (out-of-range
    // = treated as blank → not a column-split artifact). Within range,
    // index 1 still drops because right[1] has content.
    const right = ['', 'right has content', '']
    expect(dropColumnArtifactBlanks(left, right)).toEqual([
      'line A',
      // index 1 dropped (right has content at the same row)
      'line B',
      '', // index 3: out of range, kept as blank (defensive)
      'line C',
    ])
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
// F-X10 (#375) — body-at-flush-left wrap continuation regression guard.
//
// Pre-fix, `detectBaselineCol` unconditionally skipped col-0 lines, which
// silently misanchored baseline at col 3 (the wrap-indent) for psalms
// whose body is flush-left. Every wrap pair (col 0 → col 3) registered
// as `rel = -3` and `rel = 0`, neither of which fires Stage 1's wrap
// branch. 42 of 96 phrase-injected refs were ALL single-line because of
// this. User-reported case: Psalm 46:2-12 lines "Далайн зүрх рүү уулс
// нуран ороход ч" → "бид айхгүй." (book page 153 right col).
//
// The fix is column-level: pick the candidate baseline that maximises
// "valid wrap pairs" (consecutive non-blank lines at baseline + WRAP_DELTA),
// with strict count-dominance as a fast path for unambiguous cases. The
// tests below codify the invariants:
//   - Psalm 46 right col (body @ col 0): baseline=0 + multi-line phrases.
//   - Psalm 110 left col (body @ col 3): baseline=3 preserved (no
//     regression of the FR-161 R-7 PILOT contract).
describe('detectBaselineCol — F-X10 body-at-flush-left handling', () => {
  it('Psalm 46:2-12 right col (book page 153): baseline=0 with wraps', () => {
    const lines = loadColumn(77, 'right')
    const out = extractPhrasesFromColumn(lines)
    expect(out.baselineCol).toBe(0)
    // PDF has at least 3 wrap pairs in the body (L05→L06, L36→L37,
    // L40→L41 from the column dump). After translatePhrases via the
    // builder the count converges to 5 across two rich blocks; at the
    // raw extractor level we only need to assert that wrap detection
    // fires at all.
    let multiLine = 0
    for (const stanza of out.stanzas) {
      for (const phrase of stanza.phrases) {
        if (phrase.lineRange[1] > phrase.lineRange[0]) multiLine++
      }
    }
    expect(multiLine).toBeGreaterThanOrEqual(3)
  })

  it('Psalm 110 left col (FR-161 R-7 PILOT): baseline=3 preserved + stanza 3 wraps detected', () => {
    const lines = loadColumn(35, 'left')
    const out = extractPhrasesFromColumn(lines)
    expect(out.baselineCol).toBe(3)
    // Stanza containing "Эзэн тангарагласан бөгөөд" / "санаагаа
    // өөрчлөхгүй." (the book-page-68 wrap pair) MUST detect the wrap.
    const wrapStanza = out.stanzas.find((s) =>
      s.lines.some((l) => l.includes('Эзэн тангарагласан')),
    )
    expect(wrapStanza).toBeDefined()
    const multiLine = wrapStanza.phrases.filter(
      (p) => p.lineRange[1] > p.lineRange[0],
    )
    expect(multiLine.length).toBeGreaterThanOrEqual(1)
  })
})

// @fr FR-161
// FU-1 (#396) — Stage 2 gate strengthening regression guard.
//
// Pre-FU-1, the Stage 2 wrap-score gate was `score >= 1`: a single
// accidental header→body indent transition (which the indent pattern
// alone cannot distinguish from a real wrap) was sufficient to flip
// baseline. On Psalm 32 continuation page 136 left col, this caused
// the entire 11-line Psalm 32 stanza to collapse into one phrase
// (review #389 F-1 — over-merge MAJOR).
//
// FU-1 fix layers two protections:
//   * scoreWraps now ignores wrap pairs whose `prev` line ends with
//     sentence-terminator punctuation (mid-sentence-only filter — true
//     wraps are continuations, not section transitions).
//   * Stage 2 gate `score >= max(2, occurrence / 5)` — absolute floor
//     of 2 prevents single-pair flips; density floor (≥ 20% of lines)
//     prevents sparse noise from beating populated columns.
//
// Physical page 069 left col is the canonical regression fixture:
// counts col-0 = 11, col-3 = 17 (Stage 1 dominance fails because
// 17 ≤ 22 = 11 × 2). Pre-fix, col-0 won Stage 2 with score 1 and
// baseline=0 collapsed all 11 lines. Post-fix, col-0 score 0 (its
// only wrap-shaped pair was a sentence-end transition, filtered out)
// fails the gate; Stage 3 fallback correctly lands on baseline=3.
describe('detectBaselineCol — F-X10 FU-1 over-merge regression guard (#396)', () => {
  it('Psalm 32 continuation page 136 left col: baseline=3 (col-0 sentence-transition rejected)', () => {
    const lines = loadColumn(69, 'left')
    expect(detectBaselineCol(lines)).toBe(3)
    // End-to-end: the body lines (col 3, blank-separated) must NOT
    // collapse into a single multi-line phrase.
    const out = extractPhrasesFromColumn(lines)
    let maxSpan = 0
    for (const stanza of out.stanzas) {
      for (const phrase of stanza.phrases) {
        const span = phrase.lineRange[1] - phrase.lineRange[0] + 1
        if (span > maxSpan) maxSpan = span
      }
    }
    // Pre-FU-1 the over-merge produced a single phrase spanning 11
    // lines; healthy extraction yields max-span 1-2 (single verse or
    // wrap pair).
    expect(maxSpan).toBeLessThanOrEqual(2)
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

// @fr FR-161
// F-X11 follow-up (#418) — refrain detection + cross-column artifact
// filter. Targets the #411-review MAJOR finding: extractor over-fragmented
// Psalm 46:2-12 (4 spurious mid-stanza paragraph boundaries promoted from
// every-verse-period sentence boundaries that happened to align with
// column-split artifact blanks). The fix is two-layered:
//
//   1. `dropColumnArtifactBlanks` is now invoked from the live path in
//      `extractPhrasesFromColumn` (when `otherColumnLines` is supplied)
//      so the heuristic in `splitIntoStanzas` sees a stream where
//      surviving 1-blanks are predominantly TRUE PDF blanks, not col-A
//      blanks created by col-B content presence.
//   2. `detectRefrains` + `refineParagraphBoundariesWithRefrains` add
//      refrain enter/exit as STRONG paragraph boundaries and drop
//      heuristic boundaries that fall strictly between refrain
//      instances — those are mid-stanza sentence boundaries that the
//      print does NOT separate with paragraph spacing.
//
// Together the two layers preserve real refrain-bracket paragraph
// breaks (Psalm 46 [7, 9, 17, 19] in data block coords = [8, 10, 18, 20]
// in raw extractor coords with header at line 0) while suppressing
// over-fragmentation.
describe('detectRefrains (F-X11 #418)', () => {
  it('detects 2-line refrain repeating twice in a stanza', () => {
    const stanza = [
      'Бид итгэдэг.',
      'Тэр бидэнтэй хамт.',
      'Refrain line A',
      'Refrain line B',
      'Stanza body lives here.',
      'Another stanza body line.',
      'Refrain line A',
      'Refrain line B',
      'Final body line.',
    ]
    const refrains = detectRefrains(stanza)
    expect(refrains).toEqual([
      { start: 2, length: 2 },
      { start: 6, length: 2 },
    ])
  })

  it('returns [] when no 2-line pattern repeats', () => {
    const stanza = [
      'Each line is unique here.',
      'The next is also distinct.',
      'And this third one too.',
      'No repetition anywhere.',
      'Final unique line.',
    ]
    expect(detectRefrains(stanza)).toEqual([])
  })

  it('returns [] for a stanza shorter than 4 lines', () => {
    expect(detectRefrains(['a', 'b'])).toEqual([])
    expect(detectRefrains(['a', 'b', 'c'])).toEqual([])
  })

  it('treats whitespace-only lines as non-matching (single instance only)', () => {
    const stanza = [
      'Line one.',
      '',
      'Line three.',
      '',
      'Line five.',
    ]
    // Empty lines are skipped entirely (length === 0 check); no refrain.
    expect(detectRefrains(stanza)).toEqual([])
  })

  it('compares trimmed text so leading whitespace does not defeat the match', () => {
    const stanza = [
      'Body line 1',
      'Body line 2',
      '   Refrain A',     // wrap-style indent
      '   Refrain B',
      'Mid stanza.',
      'Another mid.',
      'Refrain A',         // baseline indent
      'Refrain B',
    ]
    const refrains = detectRefrains(stanza)
    expect(refrains).toEqual([
      { start: 2, length: 2 },
      { start: 6, length: 2 },
    ])
  })

  it('handles 3+ refrain instances without overlap', () => {
    const stanza = [
      'Intro line.',
      'Setup line.',
      'Refrain X',
      'Refrain Y',
      'Stanza A body.',
      'More A body.',
      'Refrain X',
      'Refrain Y',
      'Stanza B body.',
      'More B body.',
      'Refrain X',
      'Refrain Y',
      'Final body.',
    ]
    const refrains = detectRefrains(stanza)
    expect(refrains).toEqual([
      { start: 2, length: 2 },
      { start: 6, length: 2 },
      { start: 10, length: 2 },
    ])
  })

  // F-X11 follow-up batch (#426 — review #419 N-5): negative tests for
  // 1-line repetitions (must NOT match — refrain detection is strictly
  // 2-line) and a true 3-line refrain (the detector still only locks
  // 2 of the 3 lines because the algorithm is fixed at length=2; this
  // is the documented limitation).
  it('does NOT match a single line that repeats (1-line refrain not supported)', () => {
    // Mimics "Аллэлуяа" repetition — 1-line acclamation that the
    // detector intentionally ignores. The lines BETWEEN the
    // repetitions are also varied so no 2-line pattern emerges.
    const stanza = [
      'Аллэлуяа',
      'First body line.',
      'Second body line.',
      'Аллэлуяа',
      'Third body line.',
      'Fourth body line.',
      'Аллэлуяа',
    ]
    expect(detectRefrains(stanza)).toEqual([])
  })

  it('only locks the first 2 lines of a repeating 3-line refrain (length is fixed at 2)', () => {
    // True 3-line refrain pattern repeats: [A, B, C] at indices 0,1,2
    // and 5,6,7. The detector finds [A, B] match → refrain locked at
    // length=2 only. Line C (line 2 / 7) is NOT protected by the
    // refrain layer; downstream `refineParagraphBoundariesWithRefrains`
    // will still treat C as a regular line. This is documented
    // behaviour — Mongolian liturgical refrains are predominantly
    // 2-line in the print, and broadening to ≥3 lines requires
    // explicit data-quality input (deferred until a real 3-line
    // regression surfaces).
    const stanza = [
      'Refrain line A',
      'Refrain line B',
      'Refrain line C',
      'Body line 1.',
      'Body line 2.',
      'Refrain line A',
      'Refrain line B',
      'Refrain line C',
      'Final body.',
    ]
    const refrains = detectRefrains(stanza)
    expect(refrains).toEqual([
      { start: 0, length: 2 },
      { start: 5, length: 2 },
    ])
  })
})

// @fr FR-161
describe('refineParagraphBoundariesWithRefrains (F-X11 #418)', () => {
  it('drops heuristic boundaries that fall strictly between refrain instances', () => {
    // Mirror the Psalm 46:2-12 over-fragmentation pattern:
    // heuristic = [8, 10, 13, 15, 16, 17, 18, 20] with refrains at
    // [8, 9] and [18, 19]. Expected refined: [8, 10, 18, 20].
    const heuristic = [8, 10, 13, 15, 16, 17, 18, 20]
    const refrains = [
      { start: 8, length: 2 },
      { start: 18, length: 2 },
    ]
    const out = refineParagraphBoundariesWithRefrains(heuristic, refrains, 30)
    expect(out).toEqual([8, 10, 18, 20])
  })

  it('returns heuristic boundaries unchanged when fewer than 2 refrains', () => {
    const heuristic = [3, 7, 11]
    const out = refineParagraphBoundariesWithRefrains(
      heuristic,
      [{ start: 5, length: 2 }],
      20,
    )
    expect(out).toEqual([3, 7, 11])
  })

  it('adds refrain enter/exit even when heuristic is empty (the production Psalm 46 case after artifact filter)', () => {
    const out = refineParagraphBoundariesWithRefrains(
      [],
      [
        { start: 8, length: 2 },
        { start: 18, length: 2 },
      ],
      30,
    )
    expect(out).toEqual([8, 10, 18, 20])
  })

  it('preserves heuristic boundaries OUTSIDE refrain zones (before first / after last)', () => {
    // Heuristic at 3 (before first refrain) and 23 (after last) — both
    // legitimate non-refrain breaks. Refrain instances bracket the
    // middle. The refined set keeps 3 and 23 alongside refrain
    // enter/exit.
    const heuristic = [3, 8, 10, 18, 20, 23]
    const refrains = [
      { start: 8, length: 2 },
      { start: 18, length: 2 },
    ]
    const out = refineParagraphBoundariesWithRefrains(heuristic, refrains, 25)
    expect(out).toEqual([3, 8, 10, 18, 20, 23])
  })

  it('does not emit a 0-index refrain start (idx-0 is never a paragraph boundary by schema convention)', () => {
    const out = refineParagraphBoundariesWithRefrains(
      [],
      [
        { start: 0, length: 2 },
        { start: 6, length: 2 },
      ],
      10,
    )
    // r.start=0 → suppressed; r.start+r.length=2 → kept; second
    // instance contributes 6 (start) and 8 (after).
    expect(out).toEqual([2, 6, 8])
  })

  // F-X11 follow-up batch (#426 — review #419 N-3): explicit boundary
  // equality cases. Pre-#426 the "strictly between" filter `b > after &&
  // b < beforeNext` was implicitly correct on equality because Set-based
  // dedup (N-2) and the strict `>`/`<` operators conspire to handle
  // `b === after` (refrain exit position) and `b === beforeNext` (next
  // refrain enter position) correctly: the heuristic boundary survives
  // the filter (not strictly between) AND collapses against the refrain
  // enter/exit add via Set membership. These tests pin that contract.
  it('preserves a heuristic boundary that EQUALS a refrain exit position (b === after)', () => {
    // refrains at [3,4] and [10,11]. exit of first = 5; heuristic
    // includes 5 (would be a sentence-end-shaped boundary right at the
    // refrain's exit row). The filter must NOT drop it (5 is NOT
    // strictly between (5, 10)) — and the Set dedup must collapse it
    // against the refrain-exit add.
    const heuristic = [5]
    const refrains = [
      { start: 3, length: 2 },
      { start: 10, length: 2 },
    ]
    const out = refineParagraphBoundariesWithRefrains(heuristic, refrains, 20)
    // Refrain enter/exit set = {3, 5, 10, 12}. Heuristic 5 is preserved
    // and dedup'd against refrain exit 5. Final = sorted unique union.
    expect(out).toEqual([3, 5, 10, 12])
  })

  it('preserves a heuristic boundary that EQUALS the next refrain enter position (b === beforeNext)', () => {
    // refrains at [3,4] and [10,11]. enter of next = 10; heuristic
    // includes 10 (sentence-end-shaped boundary right at the next
    // refrain's enter row). The filter must NOT drop it (10 is NOT
    // strictly between (5, 10)) — and the Set dedup must collapse it
    // against the refrain-enter add.
    const heuristic = [10]
    const refrains = [
      { start: 3, length: 2 },
      { start: 10, length: 2 },
    ]
    const out = refineParagraphBoundariesWithRefrains(heuristic, refrains, 20)
    expect(out).toEqual([3, 5, 10, 12])
  })

  it('drops a heuristic boundary 1 step inside the gap (b === after + 1, strictly between)', () => {
    // Tight regression-guard for the strict-inequality filter — the
    // boundary one row past the refrain exit IS strictly between
    // refrain instances and SHOULD drop. Pin this so a regression to
    // `>=` or `<=` surfaces here rather than as a real over-fragment
    // user report.
    const heuristic = [6]
    const refrains = [
      { start: 3, length: 2 },
      { start: 10, length: 2 },
    ]
    const out = refineParagraphBoundariesWithRefrains(heuristic, refrains, 20)
    // 6 is dropped; only refrain enter/exit survive.
    expect(out).toEqual([3, 5, 10, 12])
  })
})

// @fr FR-161
describe('extractPhrasesFromColumn — F-X11 #418 cross-column live integration', () => {
  it('Psalm 46:2-12 right col (book p.153) with both columns: paragraphBoundaries=[8,10,18,20] (refrain enter/exit ONLY)', () => {
    // The user-reported regression case from review #411. With both
    // columns supplied, dropColumnArtifactBlanks removes col-split
    // artifact blanks; detectRefrains identifies the 2-line refrain
    // ("Түг түмдийн ЭЗЭН бидэнтэй хамт / Иаковын Тэнгэрбурхан бидний
    // хүчит цайз.") repeating twice; refineParagraphBoundariesWithRefrains
    // drops the spurious mid-stanza sentence-end boundaries (13, 15,
    // 16, 17 that the pre-#418 heuristic produced).
    const { lines, otherColumnLines } = loadBothColumns(77, 'right')
    const out = extractPhrasesFromColumn(lines, { otherColumnLines })
    expect(out.stanzas).toHaveLength(1)
    expect(out.stanzas[0].paragraphBoundaries).toEqual([8, 10, 18, 20])

    // Sanity-check that the stanza's lines around each paragraph
    // boundary match the user's confirmed-correct refrain framing.
    const refrainLine = 'Түг түмдийн ЭЗЭН бидэнтэй хамт'
    const refrainTail = 'Иаковын Тэнгэрбурхан бидний хүчит цайз.'
    expect(out.stanzas[0].lines[8].trim()).toBe(refrainLine)
    expect(out.stanzas[0].lines[9].trim()).toBe(refrainTail)
    expect(out.stanzas[0].lines[18].trim()).toBe(refrainLine)
    expect(out.stanzas[0].lines[19].trim()).toBe(refrainTail)
  })

  it('Psalm 46:2-12 right col WITHOUT otherColumnLines stays in legacy single-column mode (no paragraphBoundaries)', () => {
    // Backward-compat: legacy fixture-only callers MUST get the
    // pre-F-X11 shape. paragraphBoundaries is always [] under
    // splitOnEveryBlank because every blank already ended a stanza.
    const { lines } = loadBothColumns(77, 'right')
    const out = extractPhrasesFromColumn(lines)
    for (const stanza of out.stanzas) {
      expect(stanza.paragraphBoundaries).toEqual([])
    }
  })
})

// @fr FR-161
describe('splitIntoStanzas (F-X11 #418) — heuristic + refrain refinement', () => {
  it('rejects every-verse-sentence-end over-fragmentation when refrain detection covers the cluster', () => {
    // Synthetic stanza modelled on Psalm 46 mid-stanza body: every line
    // ends with a period, every next line opens with a Cyrillic capital,
    // and 1-blank rows separate them (column-split artifacts in the
    // production layout). Without refrain detection these would all be
    // promoted to paragraph boundaries; with refrain detection they
    // drop because they fall strictly between two refrain instances.
    const stanzaInput = [
      'First verse ends.',
      '',
      'Refrain alpha',
      'Refrain beta.',
      '',
      'Mid one ends.',
      '',
      'Mid two ends.',
      '',
      'Mid three ends.',
      '',
      'Refrain alpha',
      'Refrain beta.',
      '',
      'Final body line.',
    ]
    const groups = splitIntoStanzas(stanzaInput)
    expect(groups).toHaveLength(1)
    // 9 content lines: 0 First / 1 Refrain alpha / 2 Refrain beta /
    // 3 Mid one / 4 Mid two / 5 Mid three / 6 Refrain alpha / 7 Refrain beta /
    // 8 Final.
    // Refrain instances at [1,2] and [6,7] → enter/exit boundaries 1, 3, 6, 8.
    // Heuristic between-refrain boundaries (4, 5) are dropped.
    expect(groups[0].paragraphBoundaries).toEqual([1, 3, 6, 8])
  })

  it('non-refrain stanza preserves heuristic-only boundaries (Psalm 24-shaped)', () => {
    // Each verse cluster is unique; sentence-end + capital-start fires
    // cleanly without over-fragmentation. Refrain detector returns []
    // and the heuristic's output passes through unchanged.
    const stanzaInput = [
      'Cluster one ends.',
      '',
      'Cluster two starts.',
      'Cluster two continues.',
      '',
      'Cluster three opens.',
    ]
    const groups = splitIntoStanzas(stanzaInput)
    expect(groups).toHaveLength(1)
    // Boundary at index 1 (after "Cluster one ends.", before
    // "Cluster two starts.") and at 3 (after "Cluster two continues.",
    // before "Cluster three opens.").
    expect(groups[0].paragraphBoundaries).toEqual([1, 3])
  })
})

// @fr FR-161
describe('SENTENCE_END_RE / STARTS_UPPER_RE edge cases (F-X11 #418 NIT-3 carry)', () => {
  it('curly closing-quote after period still terminates a sentence', () => {
    const groups = splitIntoStanzas([
      'They said the word.”',
      '',
      'Next opens with capital.',
    ])
    expect(groups[0].paragraphBoundaries).toEqual([1])
  })

  it('Latin uppercase start after Cyrillic period still triggers boundary', () => {
    const groups = splitIntoStanzas([
      'Эзэн юм.',
      '',
      'Alleluja!',
    ])
    expect(groups[0].paragraphBoundaries).toEqual([1])
  })

  it('comma at end of prev line does NOT promote 1-blank to paragraph (mid-clause guard)', () => {
    const groups = splitIntoStanzas([
      'Comma-terminated clause,',
      '',
      'Next line still capital',
    ])
    expect(groups[0].paragraphBoundaries).toEqual([])
  })

  it('lowercase next-line start does NOT promote (continuation guard)', () => {
    const groups = splitIntoStanzas([
      'Sentence terminator here.',
      '',
      'lowercase wrapping line',
    ])
    expect(groups[0].paragraphBoundaries).toEqual([])
  })
})
