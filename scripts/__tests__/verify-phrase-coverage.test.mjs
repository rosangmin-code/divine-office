/**
 * Integration test for `scripts/verify-phrase-coverage.js` (FR-161 R-6).
 *
 * Synthetic 3-ref fixture exercises the four invariants the verifier
 * guards on `psalter-texts.rich.json`:
 *
 *   - 1 ref normal       — phrases tile lines[] exactly, no overlap
 *   - 1 ref gap          — phrases skip a line index (coverage violation)
 *   - 1 ref overlap      — two phrase ranges share a line (overlap violation)
 *
 * Expected aggregate: 2 violating refs (gap + overlap), 1 PASS ref.
 *
 * The verifier's pure module API (`checkRichData`) is the SUT — no disk
 * I/O so the assertion stays close to the input shape. The CLI wrapper
 * around it is exercised by the @fr smoke test below (subprocess).
 */
// @fr FR-161

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const verifier = require('../verify-phrase-coverage.js')
const { checkStanzaPhrases, checkRichData } = verifier

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERIFIER_PATH = resolve(__dirname, '..', 'verify-phrase-coverage.js')
const RICH_TARGET = resolve(
  __dirname,
  '..',
  '..',
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)

// ─── helpers ───────────────────────────────────────────────────────────────

function richStanza(lineCount, phrases) {
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    spans: [{ kind: 'text', text: `L${i}` }],
    indent: 0,
  }))
  return { kind: 'stanza', lines, phrases }
}

function richRef(stanzas) {
  return { stanzasRich: { blocks: stanzas } }
}

// ─── 3-ref synthetic fixture ───────────────────────────────────────────────

function buildFixture() {
  return {
    'Psalm 1:NORMAL': richRef([
      richStanza(4, [
        { lineRange: [0, 1], indent: 0 },
        { lineRange: [2, 3], indent: 1 },
      ]),
    ]),
    'Psalm 2:GAP': richRef([
      richStanza(4, [
        { lineRange: [0, 0], indent: 0 },
        // line 1 uncovered → coverage gap
        { lineRange: [2, 3], indent: 0 },
      ]),
    ]),
    'Psalm 3:OVERLAP': richRef([
      richStanza(4, [
        { lineRange: [0, 2], indent: 0 },
        { lineRange: [2, 3], indent: 0 }, // shares index 2 with above
      ]),
    ]),
  }
}

describe('verify-phrase-coverage — synthetic 3-ref invariant fixture', () => {
  it('PASS ref has zero violations', () => {
    const data = buildFixture()
    const out = checkRichData(data, { ref: 'Psalm 1:NORMAL' })
    expect(out.stanzasInspected).toBe(1)
    expect(out.violations).toEqual([])
  })

  it('GAP ref surfaces a COVERAGE violation citing the missing index', () => {
    const data = buildFixture()
    const out = checkRichData(data, { ref: 'Psalm 2:GAP' })
    expect(out.stanzasInspected).toBe(1)
    const kinds = out.violations.map((v) => v.kind)
    expect(kinds).toContain('COVERAGE')
    const cov = out.violations.find((v) => v.kind === 'COVERAGE')
    expect(cov.ref).toBe('Psalm 2:GAP')
    expect(cov.gap).toEqual([1, 1])
  })

  it('OVERLAP ref surfaces an OVERLAP violation naming both phrase indices', () => {
    const data = buildFixture()
    const out = checkRichData(data, { ref: 'Psalm 3:OVERLAP' })
    expect(out.stanzasInspected).toBe(1)
    const overlap = out.violations.find((v) => v.kind === 'OVERLAP')
    expect(overlap).toBeTruthy()
    expect(overlap.phraseIndices.sort()).toEqual([0, 1])
  })

  it('full fixture: aggregate exactly 2 violating refs (gap + overlap), 3 stanzas inspected', () => {
    const data = buildFixture()
    const out = checkRichData(data)
    expect(out.stanzasInspected).toBe(3)
    const byRef = new Set(out.violations.map((v) => v.ref))
    expect(byRef.has('Psalm 1:NORMAL')).toBe(false)
    expect(byRef.has('Psalm 2:GAP')).toBe(true)
    expect(byRef.has('Psalm 3:OVERLAP')).toBe(true)
    expect(byRef.size).toBe(2)
  })
})

describe('verify-phrase-coverage — bounds + schema invariants', () => {
  it('flags BOUNDS when end >= lines.length', () => {
    const stanza = richStanza(3, [{ lineRange: [0, 5], indent: 0 }])
    const v = checkStanzaPhrases(stanza)
    expect(v.some((x) => x.kind === 'BOUNDS')).toBe(true)
  })

  it('flags SCHEMA when lineRange has wrong shape', () => {
    const stanza = richStanza(3, [{ lineRange: [0], indent: 0 }])
    const v = checkStanzaPhrases(stanza)
    expect(v.length).toBeGreaterThan(0)
    expect(v[0].kind).toBe('SCHEMA')
  })

  it('skips stanzas that have no phrases (additive contract)', () => {
    const data = {
      'Psalm noop': richRef([{ kind: 'stanza', lines: [{ spans: [], indent: 0 }] }]),
    }
    const out = checkRichData(data)
    expect(out.stanzasInspected).toBe(0)
    expect(out.violations).toEqual([])
  })
})

describe('verify-phrase-coverage — real-data smoke', () => {
  it('exits 0 (no-op) on the live psalter-texts.rich.json (currently no phrases)', () => {
    const r = spawnSync('node', [VERIFIER_PATH, '--target', RICH_TARGET], {
      encoding: 'utf-8',
    })
    // Exit 0 on PASS or no-phrases-yet. stderr empty on PASS.
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/0 violations/)
  }, 20_000)
})
