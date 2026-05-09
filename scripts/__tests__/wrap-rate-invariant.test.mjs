/**
 * Wrap-rate invariant on `psalter-texts.rich.json`.
 *
 * FR-161 #375 (F-X10) + #396 (FU-1, FU-4) — guards rich-data regressions
 * across four orthogonal axes:
 *
 *   1. PILOT REGRESSION — the FR-161 R-7 PILOT (Psalm 110:1-5,7) MUST
 *      retain at least one multi-line `PhraseGroup` (`lineRange[1] >
 *      lineRange[0]`). Pre-fix, the PILOT had ALL single-line phrases
 *      because the column-level baseline detector unconditionally
 *      skipped col-0 lines, losing the wrap signal even when the body
 *      was at col 3+. R-7 originally validated multi-line wraps; this
 *      assertion restores that contract.
 *
 *   2. WRAP-RATE FLOOR — across all phrase-injected refs (`stanzasRich`
 *      blocks with a `phrases?` array), the share of multi-line groups
 *      must remain ≥ 13%. The threshold was 15% post-F-X10 (339/2258);
 *      FU-1 (#396) deliberately lowers it to ≈13.7% (324/2362) by
 *      correcting 11 over-merge collapses. The collapsed cases
 *      previously REGISTERED as multi-line (a 15-line phrase IS
 *      multi-line) and inflated both numerator and false-positive
 *      "wrap" detection; FU-1 fragments them, REDUCING numerator
 *      while raising denominator. The 13% floor is the post-FU-1
 *      stable level — a drop below 13% indicates a true extractor
 *      regression (or builder flattening) rather than the legitimate
 *      adjustment FU-1 introduced.
 *
 *   3. MAX PHRASE SPAN (FU-4) — no single phrase may span more than
 *      MAX_PHRASE_SPAN lines. The pre-FU-1 baseline detector flipped
 *      to col-0 on mixed-content columns where a single
 *      header→body transition counted as a wrap pair (Psalm 32:1-11
 *      block 1: 15 lines collapsed into 1 phrase; Psalm 143:1-11 block
 *      1: 14 lines; Rev 11:17-18 block 0: 12 lines; etc., 11 over-merge
 *      stanzas total). The wrap-rate floor (#2) is unable to detect
 *      this because the single huge phrase IS multi-line — collapse
 *      INCREASES the multi-line count. Capping max span gives a real
 *      structural floor.
 *
 *   4. PHRASE/LINE RATIO (FU-4) — per-block, ≥40% of lines must be
 *      phrase-starts. Catches collapse cases where the wrap-rate
 *      invariant alone is satisfied (a 15-line block as 1 phrase is
 *      multi-line so it counts toward (#2), but the ratio is 0.07).
 *      Healthy psalm bodies cluster ≥0.5 (typical wrap pair is 2 lines
 *      → 0.5 ratio); 0.4 is a conservative floor that allows long
 *      "verse + 3-line wrap" continuations without flagging.
 *
 * Known structural deferrals — see KNOWN_DEFERRED_OVER_MERGE:
 *
 *   Per-page baseline detection (the unit `detectBaselineCol` operates
 *   on) cannot distinguish body indent from prose indent when one
 *   column dominates by raw line count but mixes a closing-prayer
 *   prose body (col 0) with blank-separated psalm-verse stanzas
 *   (col 3). The Stage 1 dominance check then picks col 0 because
 *   col 0 has more total lines, even though the verses ARE the body.
 *   Solving this requires per-content-block (per-stanza) baseline
 *   detection (review #389 F-3 / FU-3). That work is deferred to the
 *   F-X11 cohort; until then, specific blocks remain over-merged and
 *   are listed below with their structural cause.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const TARGET = resolve(
  HERE,
  '..',
  '..',
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)

function loadRich() {
  return JSON.parse(readFileSync(TARGET, 'utf-8'))
}

// FU-4 thresholds (review #389 → #396 fix).
const MAX_PHRASE_SPAN = 5
const MIN_PHRASE_LINE_RATIO = 0.4
const RATIO_MIN_BLOCK_LINES = 5 // skip tiny blocks where ratio is unstable

// Structural per-content-block baseline limitation (FU-3 deferral).
// These blocks span page-break columns where a closing-prayer prose
// body at col 0 dominates by line count over col-3 psalm verses
// separated by blank lines. Stage 1 dominance (col 0 occ > 2× col 3
// occ) selects col 0, then `splitIntoStanzas` flattens the
// blank-separated col-3 verses into one continuous stanza. Resolution
// requires per-stanza baseline detection — tracked in review #389 F-3
// / FU-3, deferred to the F-X11 cohort.
const KNOWN_DEFERRED_OVER_MERGE = new Set([
  'Psalm 147:12-20::block-1', // PDF physical 135 left col, page 268 →
  // col 0 prose (closing prayer "Дууллыг төгсгөх залбирал" + Reading)
  // = 20 lines; col 3 (5 verses, blank-separated) = 7 lines. 20 > 14
  // (= 7×2) so Stage 1 picks col 0; the 5 col-3 verses then collapse
  // into 1 phrase per the builder's flattening pass.
])

// @fr FR-161
describe('psalter-texts.rich.json — wrap-rate invariants (F-X10)', () => {
  it('PILOT Psalm 110:1-5,7 retains at least one multi-line phrase (R-7 regression guard)', () => {
    const data = loadRich()
    const psalm = data['Psalm 110:1-5, 7']
    expect(psalm).toBeDefined()
    let multi = 0
    for (const block of psalm.stanzasRich?.blocks ?? []) {
      if (block.kind !== 'stanza') continue
      for (const phrase of block.phrases ?? []) {
        if (phrase.lineRange[1] > phrase.lineRange[0]) multi++
      }
    }
    expect(multi).toBeGreaterThanOrEqual(1)
  })

  it('Psalm 46:2-12 user-reported wrap pair "Далайн зүрх рүү ... / бид айхгүй." is detected as multi-line', () => {
    const data = loadRich()
    const psalm = data['Psalm 46:2-12']
    expect(psalm).toBeDefined()
    let foundUserCase = false
    for (const block of psalm.stanzasRich?.blocks ?? []) {
      if (block.kind !== 'stanza') continue
      for (const phrase of block.phrases ?? []) {
        if (phrase.lineRange[1] === phrase.lineRange[0]) continue
        const lines = block.lines.slice(phrase.lineRange[0], phrase.lineRange[1] + 1)
        const joined = lines.map((l) => l.spans?.[0]?.text ?? '').join(' ')
        if (joined.includes('Далайн зүрх') && joined.includes('бид айхгүй')) {
          foundUserCase = true
        }
      }
    }
    expect(foundUserCase).toBe(true)
  })

  it('overall multi-line wrap rate >= 13% across phrase-injected refs (post-FU-1 floor)', () => {
    const data = loadRich()
    let total = 0
    let multi = 0
    for (const payload of Object.values(data)) {
      for (const block of payload.stanzasRich?.blocks ?? []) {
        if (block.kind !== 'stanza') continue
        for (const phrase of block.phrases ?? []) {
          total++
          if (phrase.lineRange[1] > phrase.lineRange[0]) multi++
        }
      }
    }
    expect(total).toBeGreaterThan(0)
    const rate = multi / total
    expect(rate).toBeGreaterThanOrEqual(0.13)
  })

  // NIT batch #409 (review #402 NIT-FU-3): 13% wrap-rate floor leaves
  // only ~16-phrase margin at the post-FU-1 baseline (324/2362 ≈
  // 13.7%). This margin monitor surfaces the buffer as a soft signal
  // (warn-only) so future corrective sweeps can spot creep toward the
  // floor before it crosses. The assertion stays loose — the only
  // hard contract is the 13% floor above and the FU-4 max-span /
  // ratio invariants below; this test never fails on its own. It
  // simply records margin via expect-pass + a console.warn when
  // buffer drops below WARN_BUFFER_PHRASES so reviewers see the
  // narrowing in vitest output.
  it('wrap-rate margin monitor: surface buffer above 13% floor (warn-only)', () => {
    const FLOOR = 0.13
    const WARN_BUFFER_PHRASES = 10
    const data = loadRich()
    let total = 0
    let multi = 0
    for (const payload of Object.values(data)) {
      for (const block of payload.stanzasRich?.blocks ?? []) {
        if (block.kind !== 'stanza') continue
        for (const phrase of block.phrases ?? []) {
          total++
          if (phrase.lineRange[1] > phrase.lineRange[0]) multi++
        }
      }
    }
    expect(total).toBeGreaterThan(0)
    const rate = multi / total
    // Exact phrase-count margin: how many multi-line phrases could be
    // demoted to single before tripping the FLOOR.
    const minMultiAtFloor = Math.ceil(FLOOR * total)
    const bufferPhrases = multi - minMultiAtFloor
    if (bufferPhrases < WARN_BUFFER_PHRASES) {
      // eslint-disable-next-line no-console
      console.warn(
        `[wrap-rate margin] buffer narrowing — ${bufferPhrases} phrases above ${FLOOR * 100}% floor (multi=${multi}, total=${total}, rate=${(rate * 100).toFixed(2)}%). Consider raising FLOOR or auditing recent phrase-data sweep.`,
      )
    }
    // Soft contract — never fails. Only asserts the buffer is computable.
    expect(Number.isFinite(bufferPhrases)).toBe(true)
  })

  it(`max phrase span <= ${MAX_PHRASE_SPAN} lines per stanza block (FU-4 over-merge guard)`, () => {
    const data = loadRich()
    const violations = []
    for (const [ref, payload] of Object.entries(data)) {
      for (const [bi, block] of (payload.stanzasRich?.blocks ?? []).entries()) {
        if (block.kind !== 'stanza') continue
        const key = `${ref}::block-${bi}`
        if (KNOWN_DEFERRED_OVER_MERGE.has(key)) continue
        for (const phrase of block.phrases ?? []) {
          const span = phrase.lineRange[1] - phrase.lineRange[0] + 1
          if (span > MAX_PHRASE_SPAN) {
            violations.push({
              ref,
              blockIndex: bi,
              lineRange: phrase.lineRange,
              span,
            })
          }
        }
      }
    }
    expect(
      violations,
      `Over-merge regression: ${violations.length} phrase(s) exceed max span ${MAX_PHRASE_SPAN}.\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })

  it(`per-block phrase/line ratio >= ${MIN_PHRASE_LINE_RATIO} (FU-4 collapse guard)`, () => {
    const data = loadRich()
    const violations = []
    for (const [ref, payload] of Object.entries(data)) {
      for (const [bi, block] of (payload.stanzasRich?.blocks ?? []).entries()) {
        if (block.kind !== 'stanza') continue
        const phrases = block.phrases ?? []
        if (phrases.length === 0) continue
        const lineCount = block.lines?.length ?? 0
        if (lineCount < RATIO_MIN_BLOCK_LINES) continue
        const key = `${ref}::block-${bi}`
        if (KNOWN_DEFERRED_OVER_MERGE.has(key)) continue
        const ratio = phrases.length / lineCount
        if (ratio < MIN_PHRASE_LINE_RATIO) {
          violations.push({
            ref,
            blockIndex: bi,
            phraseCount: phrases.length,
            lineCount,
            ratio: +ratio.toFixed(3),
          })
        }
      }
    }
    expect(
      violations,
      `Over-merge regression: ${violations.length} block(s) have phrase/line ratio < ${MIN_PHRASE_LINE_RATIO}.\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([])
  })
})
