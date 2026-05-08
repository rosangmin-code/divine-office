/**
 * Wrap-rate invariant on `psalter-texts.rich.json`.
 *
 * FR-161 #375 (F-X10) — guards two regressions at the rich-data level:
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
 *      must remain ≥ 15%. Pre-fix the rate was 7.2% (179/2476); the
 *      F-X10 fix lifts it to ≈15% by re-injecting the 96 phrase-bearing
 *      refs through the corrected extractor. A drop below 15% indicates
 *      either an extractor regression or a builder/auto-reconciler step
 *      flattening wraps post-extraction.
 *
 * The threshold is intentionally tight — 15% is the post-fix floor, not
 * an aspirational ceiling. Future work to broaden coverage will raise
 * it; future regressions will breach it. Either way, the test is the
 * canary.
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

  it('overall multi-line wrap rate >= 15% across phrase-injected refs', () => {
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
    expect(rate).toBeGreaterThanOrEqual(0.15)
  })
})
