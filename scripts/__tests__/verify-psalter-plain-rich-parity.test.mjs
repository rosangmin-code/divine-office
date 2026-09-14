/**
 * Fixture + live-data tests for scripts/verify-psalter-plain-rich-parity.js
 * (P0-6, 2026-09-14 — plain ↔ rich psalter body text equivalence gate).
 *
 * Fixtures lock the comparison semantics (line re-split and indent are NOT
 * differences; a single word IS). The live-data case is the actual
 * regression guard: `psalter-texts.json` must never drift from
 * `psalter-texts.rich.json` again.
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const verifier = require('../verify-psalter-plain-rich-parity.js')
const { compareCatalogs, ALLOWED_EQUIVALENCES } = verifier

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const SCRIPT_PATH = resolve(__dirname, '..', 'verify-psalter-plain-rich-parity.js')

function plainRef(stanzas, psalmPrayer) {
  return psalmPrayer ? { stanzas, psalmPrayer } : { stanzas }
}

function richLine(text, indent = 0) {
  return { spans: [{ kind: 'text', text }], indent }
}

function richRef(stanzas, psalmPrayer) {
  const out = {
    stanzasRich: {
      blocks: stanzas.map((lines) => ({
        kind: 'stanza',
        lines: lines.map((l) => (typeof l === 'string' ? richLine(l) : richLine(l.text, l.indent))),
      })),
    },
  }
  if (psalmPrayer) {
    out.psalmPrayerRich = { blocks: [{ kind: 'para', spans: [{ kind: 'text', text: psalmPrayer }] }] }
  }
  return out
}

describe('verify-psalter-plain-rich-parity — comparison semantics (fixtures)', () => {
  it('identical bodies → no diffs', () => {
    const { diffs, rawDiffs, keyIssues } = compareCatalogs({
      plainData: { 'Psalm 1': plainRef([['Аяа Эзэн минь,', '  Таныг магтъя.']]) },
      richData: { 'Psalm 1': richRef([['Аяа Эзэн минь,', { text: 'Таныг магтъя.', indent: 1 }]]) },
    })
    expect(keyIssues).toEqual([])
    expect(rawDiffs).toEqual([])
    expect(diffs).toEqual([])
  })

  it('plain leading-space indent convention is not a difference', () => {
    const { diffs } = compareCatalogs({
      plainData: { k: plainRef([['Тэнгэрбурхан, Та миний Тэнгэрбурхан', '    Би Таныг эртлэн хайх болой.']]) },
      richData: { k: richRef([['Тэнгэрбурхан, Та миний Тэнгэрбурхан', 'Би Таныг эртлэн хайх болой.']]) },
    })
    expect(diffs).toEqual([])
  })

  it('a line re-split (rich lines 1:1 with print, plain extractor lines) is not a difference', () => {
    const { diffs } = compareCatalogs({
      plainData: { k: plainRef([['ЭЗЭН таалдаг аливаа зүйлээ Тэнгэрт ба газарт хийгээд']]) },
      richData: { k: richRef([['ЭЗЭН таалдаг аливаа зүйлээ', 'Тэнгэрт ба газарт хийгээд']]) },
    })
    expect(diffs).toEqual([])
  })

  it('a stanza re-grouping is not a difference (bodies are flattened)', () => {
    const { diffs } = compareCatalogs({
      plainData: { k: plainRef([['a b', 'c d'], ['e f']]) },
      richData: { k: richRef([['a b'], ['c d', 'e f']]) },
    })
    expect(diffs).toEqual([])
  })

  it('a single word difference IS a diff and names the token', () => {
    const { diffs, rawDiffs } = compareCatalogs({
      plainData: { 'Psalm 135:1-12': plainRef([['Тэнгэрт ба газарт хийгээд', 'Далайнууд ба']]) },
      richData: { 'Psalm 135:1-12': richRef([['Тэнгэрт ба газарт хийгээд', 'Далайнуудад ба']]) },
    })
    expect(rawDiffs).toHaveLength(1)
    expect(diffs).toHaveLength(1)
    expect(diffs[0].key).toBe('Psalm 135:1-12')
    expect(diffs[0].field).toBe('stanzas')
    expect(diffs[0].tokens.map((t) => t.plain)).toEqual(
      expect.arrayContaining([expect.stringContaining('Далайнууд ба')]),
    )
  })

  it('a punctuation-only difference is still a diff (table is empty by design)', () => {
    expect(ALLOWED_EQUIVALENCES).toHaveLength(0)
    const { diffs } = compareCatalogs({
      plainData: { k: plainRef([['Бүү цуцлаач.']]) },
      richData: { k: richRef([['Бүү цуцлаач!']]) },
    })
    expect(diffs).toHaveLength(1)
  })

  it('an allowed equivalence rule removes the diff from `diffs` but keeps it in `rawDiffs`', () => {
    const table = [{ re: /[“”]/g, to: '"', why: 'test-only' }]
    const { diffs, rawDiffs } = compareCatalogs({
      plainData: { k: plainRef([['"Мартагдсан" гэж']]) },
      richData: { k: richRef([['“Мартагдсан” гэж']]) },
      table,
    })
    expect(rawDiffs).toHaveLength(1)
    expect(diffs).toHaveLength(0)
  })

  it('reports keys missing on either side', () => {
    const { keyIssues } = compareCatalogs({
      plainData: { a: plainRef([['x']]), b: plainRef([['y']]) },
      richData: { a: richRef([['x']]), c: richRef([['z']]) },
    })
    expect(keyIssues).toEqual(
      expect.arrayContaining([
        { key: 'b', side: 'plain-only' },
        { key: 'c', side: 'rich-only' },
      ]),
    )
  })

  it('compares psalmPrayer only when both sides carry one; plain-only is informational', () => {
    const both = compareCatalogs({
      plainData: { k: plainRef([['x']], 'Эцэг минь, гэрлийг хайрлана уу.') },
      richData: { k: richRef([['x']], 'Эцэг минь, гэрлийг хайрлана  уу.') },
    })
    expect(both.stats.prayersCompared).toBe(1)
    expect(both.diffs).toEqual([]) // whitespace-normalised

    const drift = compareCatalogs({
      plainData: { k: plainRef([['x']], 'Эцэг минь, гэрлийг хайрлана уу.') },
      richData: { k: richRef([['x']], 'Эцэг минь, гэрлийг хайрлана уу!') },
    })
    expect(drift.diffs.map((d) => d.field)).toEqual(['psalmPrayer'])

    const plainOnly = compareCatalogs({
      plainData: { k: plainRef([['x']], 'Эцэг минь.') },
      richData: { k: richRef([['x']]) },
    })
    expect(plainOnly.stats.prayerPlainOnly).toBe(1)
    expect(plainOnly.diffs).toEqual([])
  })
})

describe('verify-psalter-plain-rich-parity — live catalogs', () => {
  // @fr NFR-009n — plain ↔ rich must stay text-equivalent (P0-6 regression guard).
  it('psalter-texts.json and psalter-texts.rich.json are text-equivalent', () => {
    const plainData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/loth/psalter-texts.json'), 'utf8'))
    const richData = JSON.parse(
      readFileSync(resolve(ROOT, 'src/data/loth/prayers/commons/psalter-texts.rich.json'), 'utf8'),
    )
    const { keyIssues, diffs, stats } = compareCatalogs({ plainData, richData })
    if (diffs.length) {
      console.error(diffs.map((d) => `${d.key} [${d.field}] ${JSON.stringify(d.tokens[0])}`).join('\n'))
    }
    expect(keyIssues).toEqual([])
    expect(diffs).toEqual([])
    expect(stats.keysCompared).toBeGreaterThan(100)
  })

  it('CLI --check exits 0 on the live catalogs', () => {
    const res = spawnSync(process.execPath, [SCRIPT_PATH, '--check'], { cwd: ROOT, encoding: 'utf8' })
    expect(res.status, res.stdout + res.stderr).toBe(0)
    expect(res.stdout).toContain('OK — plain and rich psalter bodies are text-equivalent')
  })
})
