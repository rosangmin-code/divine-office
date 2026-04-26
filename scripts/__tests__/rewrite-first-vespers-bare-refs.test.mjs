/**
 * Unit tests for scripts/rewrite-first-vespers-bare-refs.js (FR-156
 * Phase 5 WI-A2). Uses an in-memory propers fixture + mocked versed-map
 * to validate the planning, rewrite, and catalog-miss classification
 * logic without touching the real propers JSON or psalter-texts.json.
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = resolve(HERE, '..', 'rewrite-first-vespers-bare-refs.js')
const require = createRequire(import.meta.url)
const {
  parseArgs,
  planRewritesInTree,
  applyRewrites,
  classifyBlocks,
  selectTargets,
  PROPERS_SEASONS,
  SANCTORAL_FILES,
} = require(SCRIPT_PATH)

function buildFixturePropers() {
  return {
    weeks: {
      '1': {
        SUN: {
          firstVespers: {
            psalms: [
              { type: 'psalm', ref: 'Psalm 141:1-9', antiphon_key: 'fv-w1-sun-ps1' },
              { type: 'psalm', ref: 'Psalm 142', antiphon_key: 'fv-w1-sun-ps2' },
              { type: 'canticle', ref: 'Philippians 2:6-11', antiphon_key: 'fv-w1-sun-cant' },
            ],
          },
        },
      },
      '2': {
        SUN: {
          firstVespers: {
            psalms: [
              { type: 'psalm', ref: 'Psalm 119:105-112', antiphon_key: 'fv-w2-sun-ps1' },
              { type: 'psalm', ref: 'Psalm 16', antiphon_key: 'fv-w2-sun-ps2' },
            ],
          },
        },
      },
      '3': {
        SUN: {
          // Non-firstVespers section should be ignored.
          lauds: { psalms: [{ ref: 'Psalm 100', antiphon_key: 'lauds-w3-ps1' }] },
        },
      },
    },
  }
}

const REWRITES = {
  'Psalm 16': { versed: 'Psalm 16:1-6', catalogAction: 'none', caseVerdict: 'A*' },
  'Psalm 142': { versed: 'Psalm 142:1-7', catalogAction: 'ADD', caseVerdict: 'B' },
  // Psalm 141 absent on purpose — rewrite_needed=false, so loadVersedMap
  // skips it. The fixture's Psalm 141:1-9 cell should NOT be planned.
}

describe('parseArgs', () => {
  it('defaults: season=null, dryRun=false, allowMissingCatalog=false', () => {
    const args = parseArgs(['node', 'script.js'])
    expect(args).toEqual({ season: null, dryRun: false, allowMissingCatalog: false })
  })

  it('--dry-run sets dryRun=true', () => {
    expect(parseArgs(['node', 'script.js', '--dry-run']).dryRun).toBe(true)
  })

  it('--season SEASON (space form)', () => {
    expect(parseArgs(['node', 'script.js', '--season', 'easter']).season).toBe('easter')
  })

  it('--season=SEASON (equals form)', () => {
    expect(parseArgs(['node', 'script.js', '--season=lent']).season).toBe('lent')
  })

  it('--allow-missing-catalog sets allowMissingCatalog=true', () => {
    expect(parseArgs(['node', 'script.js', '--allow-missing-catalog']).allowMissingCatalog).toBe(true)
  })
})

describe('planRewritesInTree', () => {
  it('plans cells whose ref matches a rewrites key (rewrite_needed=true entries)', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const summaries = planned.map((p) => ({ from: p.fromRef, to: p.toRef, path: p.path }))
    expect(summaries).toEqual([
      { from: 'Psalm 142', to: 'Psalm 142:1-7', path: '$.weeks.1.SUN.firstVespers.psalms[1]' },
      { from: 'Psalm 16', to: 'Psalm 16:1-6', path: '$.weeks.2.SUN.firstVespers.psalms[1]' },
    ])
  })

  it('skips cells whose ref does not appear in rewrites (Psalm 141:1-9, canticle, lauds)', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const refs = planned.map((p) => p.fromRef)
    // Psalm 141:1-9 is rewrite_needed=false → not in REWRITES → not planned.
    expect(refs).not.toContain('Psalm 141:1-9')
    // Philippians canticle is not in REWRITES → not planned.
    expect(refs).not.toContain('Philippians 2:6-11')
    // Lauds psalm at week 3 is not under firstVespers → not planned.
    expect(refs).not.toContain('Psalm 100')
  })

  it('attaches catalogAction from rewrites for downstream block classification', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const psalm142 = planned.find((p) => p.fromRef === 'Psalm 142')
    const psalm16 = planned.find((p) => p.fromRef === 'Psalm 16')
    expect(psalm142.catalogAction).toBe('ADD')
    expect(psalm16.catalogAction).toBe('none')
  })
})

describe('applyRewrites', () => {
  it('mutates psalmNode.ref in place', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    applyRewrites(planned)
    expect(tree.weeks['1'].SUN.firstVespers.psalms[1].ref).toBe('Psalm 142:1-7')
    expect(tree.weeks['2'].SUN.firstVespers.psalms[1].ref).toBe('Psalm 16:1-6')
  })

  it('preserves non-rewritten fields (type, antiphon_key)', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    applyRewrites(planned)
    const psalm = tree.weeks['1'].SUN.firstVespers.psalms[1]
    expect(psalm.type).toBe('psalm')
    expect(psalm.antiphon_key).toBe('fv-w1-sun-ps2')
  })

  it('round-trips through JSON.stringify deterministically', () => {
    const tree = buildFixturePropers()
    const before = JSON.parse(JSON.stringify(tree)) // snapshot
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    applyRewrites(planned)
    const after = JSON.parse(JSON.stringify(tree, null, 2))
    // Only ref values changed; structure intact.
    expect(after.weeks['1'].SUN.firstVespers.psalms[0]).toEqual(before.weeks['1'].SUN.firstVespers.psalms[0])
    expect(after.weeks['1'].SUN.firstVespers.psalms[1].ref).toBe('Psalm 142:1-7')
    expect(after.weeks['1'].SUN.firstVespers.psalms[1].antiphon_key).toBe('fv-w1-sun-ps2')
  })
})

describe('classifyBlocks', () => {
  it('flags target absent + catalog_action="ADD" as blocked', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const catalog = new Set(['Psalm 16:1-6']) // Psalm 142:1-7 absent
    const { blocked, inconsistent } = classifyBlocks(planned, catalog)
    expect(blocked).toHaveLength(1)
    expect(blocked[0].fromRef).toBe('Psalm 142')
    expect(inconsistent).toHaveLength(0)
  })

  it('flags target absent + catalog_action="none" as inconsistent', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const catalog = new Set([]) // even Psalm 16:1-6 absent
    const { blocked, inconsistent } = classifyBlocks(planned, catalog)
    expect(blocked).toHaveLength(1) // Psalm 142 still blocked
    expect(inconsistent).toHaveLength(1) // Psalm 16 inconsistent
    expect(inconsistent[0].fromRef).toBe('Psalm 16')
  })

  it('returns no blocks when catalog covers all targets', () => {
    const tree = buildFixturePropers()
    const planned = planRewritesInTree(tree, 'fixture.json', REWRITES)
    const catalog = new Set(['Psalm 16:1-6', 'Psalm 142:1-7'])
    const { blocked, inconsistent } = classifyBlocks(planned, catalog)
    expect(blocked).toHaveLength(0)
    expect(inconsistent).toHaveLength(0)
  })
})

describe('selectTargets', () => {
  it('returns all 5 propers + 1 sanctoral when season is null', () => {
    const targets = selectTargets(null)
    expect(targets).toHaveLength(PROPERS_SEASONS.length + SANCTORAL_FILES.length)
    expect(targets.map((t) => t.label)).toEqual([
      ...PROPERS_SEASONS.map((s) => `propers/${s}.json`),
      ...SANCTORAL_FILES.map((f) => `sanctoral/${f}`),
    ])
  })

  it('limits scope to one propers season', () => {
    const targets = selectTargets('easter')
    expect(targets).toHaveLength(1)
    expect(targets[0].label).toBe('propers/easter.json')
  })

  it('limits scope to sanctoral when season is "solemnities"', () => {
    const targets = selectTargets('solemnities')
    expect(targets).toHaveLength(1)
    expect(targets[0].label).toBe('sanctoral/solemnities.json')
  })

  it('throws on unknown season', () => {
    expect(() => selectTargets('jubilee')).toThrow(/--season "jubilee" not recognized/)
  })
})
