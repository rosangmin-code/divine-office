/**
 * Unit tests for `scripts/build-paragraphs-into-rich.mjs`
 * (F-X11 Phase 2 R-2 #501 paragraph builder bridge).
 *
 * These tests cover:
 *   - Pilot manifest enumerates the expected 6 (ref, blockIndex) pairs
 *     for Psalm 42:2-6 + Psalm 63:2-9. Sweep-task is OUT OF SCOPE.
 *   - End-to-end extractor → builder → rich.json verification:
 *     the on-disk rich.json carries the PB values that R-2 PoC + the
 *     PDF y-coord analysis predicted (4 PB-positive blocks). This is
 *     the dispatch's snapshot contract.
 *   - extractBlockLines mirror the rich-AST line shape (defensive
 *     against malformed input — empty span list throws).
 *   - shallowEqArray utility behaviour (used for SAME/DIFF/NEW diff
 *     status in the builder summary).
 *
 * NOT covered (intentional, Pilot scope):
 *   - Sweep over the other 122 refs — separate task
 *   - End-to-end builder write idempotency — covered manually + the
 *     CACHE bump check in sw.test.ts
 *   - Python extractor unit (the extractor is tested via the PoC data
 *     in this test's snapshot expectations — running it through the
 *     bridge against the real PDF on the test machine doubles as the
 *     PoC reproduction).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractBlockLines,
  shallowEqArray,
  _PILOT_MANIFEST,
} from '../build-paragraphs-into-rich.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RICH_PATH = resolve(
  ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)

// @fr FR-161
describe('Pilot manifest (#501)', () => {
  it('enumerates exactly the 6 (Psalm 63 + Psalm 42) Pilot blocks', () => {
    expect(_PILOT_MANIFEST.length).toBe(6)
    const seen = _PILOT_MANIFEST.map((e) => `${e.ref}#${e.blockIndex}`)
    expect(seen).toEqual([
      'Psalm 63:2-9#0',
      'Psalm 63:2-9#1',
      'Psalm 42:2-6#0',
      'Psalm 42:2-6#1',
      'Psalm 42:2-6#2',
      'Psalm 42:2-6#3',
    ])
  })

  it('pins each block to a single page idx + column hint', () => {
    for (const entry of _PILOT_MANIFEST) {
      expect(Array.isArray(entry.pages)).toBe(true)
      // Pilot blocks are single-page (multi-page handling is out of
      // scope for #501 per dispatch Q3).
      expect(entry.pages.length).toBe(1)
      expect(['left', 'right', 'auto']).toContain(entry.column)
    }
  })
})

// @fr FR-161
describe('extractBlockLines', () => {
  it('returns the first text span of each line in order', () => {
    const block = {
      lines: [
        { spans: [{ kind: 'text', text: 'line A' }], indent: 0 },
        { spans: [{ kind: 'text', text: 'line B' }], indent: 1 },
      ],
    }
    expect(extractBlockLines(block)).toEqual(['line A', 'line B'])
  })

  it('throws when a line has no text span (malformed rich-AST)', () => {
    const bad = { lines: [{ spans: [{ kind: 'meta' }], indent: 0 }] }
    expect(() => extractBlockLines(bad)).toThrow(/no text span/)
  })
})

// @fr FR-161
describe('shallowEqArray', () => {
  it('considers two arrays equal element-wise', () => {
    expect(shallowEqArray([1, 2, 3], [1, 2, 3])).toBe(true)
  })
  it('rejects different length', () => {
    expect(shallowEqArray([1, 2], [1, 2, 3])).toBe(false)
  })
  it('rejects different element', () => {
    expect(shallowEqArray([1, 2], [1, 3])).toBe(false)
  })
  it('returns false for non-array on either side', () => {
    expect(shallowEqArray(null, [1])).toBe(false)
    expect(shallowEqArray([1], null)).toBe(false)
  })
})

// @fr FR-161
describe('Pilot snapshot — rich.json post-inject', () => {
  // These expected PB values are the dispatch's contract — they
  // pin the PoC outcome from R-1 (#500) and the y-coord re-derivation
  // run during R-2 (#501) builder execution.
  //
  // If the extractor heuristic is tuned later and these change,
  // update BOTH the snapshot and the sw.js v26 rationale block in
  // the same commit, then bump CACHE (v26 → v27).
  const EXPECTED = {
    'Psalm 63:2-9': {
      0: [6], // PDF y-gap derived [6] (was stale [2,8] PoC; see GOAL204-ps63-pb.md)
      1: [6], // new finding
    },
    'Psalm 42:2-6': {
      0: [4, 8, 12], // R-1 PoC: body idx 4/8/13, wrap-join at idx 9 → rich 4/8/12
      1: [], // refrain — no within-block paragraph
      2: [], // refrain repeat — no within-block paragraph
      3: [3, 7, 11, 15, 19], // 5 paragraphs across 20 rich lines
    },
  }

  const rich = JSON.parse(readFileSync(RICH_PATH, 'utf-8'))

  for (const ref of Object.keys(EXPECTED)) {
    for (const blockIndexStr of Object.keys(EXPECTED[ref])) {
      const blockIndex = Number(blockIndexStr)
      const expected = EXPECTED[ref][blockIndex]
      it(`${ref} block ${blockIndex} carries paragraphBoundaries=${JSON.stringify(expected)}`, () => {
        const stanzas = rich[ref].stanzasRich.blocks.filter(
          (b) => b.kind === 'stanza',
        )
        const block = stanzas[blockIndex]
        const actual = block.paragraphBoundaries || []
        expect(actual).toEqual(expected)
      })
    }
  }

  it('preserves the existing phrases arrays alongside the new PB', () => {
    // R-2 must NOT touch phrases — Phase 1 phrase grouping is the
    // SSOT for phrase-level layout. This test guards the additive
    // contract (PB is layered ON TOP of phrases).
    const ref = rich['Psalm 42:2-6']
    const b0 = ref.stanzasRich.blocks.filter((b) => b.kind === 'stanza')[0]
    expect(Array.isArray(b0.phrases)).toBe(true)
    expect(b0.phrases.length).toBeGreaterThan(0)
    // Block 0 line count is locked at 19 (Phase 1 SSOT — capital-start
    // phrase rebuild applied via #498).
    expect(b0.lines.length).toBe(19)
  })
})
