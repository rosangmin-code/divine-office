#!/usr/bin/env node
/**
 * FR-156 Phase 5 WI-A2 (task #87). Rewrites firstVespers psalms[*].ref
 * cells from bare-form ("Psalm 122") to versed-form ("Psalm 122:1-9")
 * across propers/{season}.json + sanctoral/solemnities.json.
 *
 * Input: parsed_data/first-vespers-versed-map.json (WI-A1 deliverable).
 * Only entries where `rewrite_needed: true` trigger a rewrite — Psalm 141
 * is intentionally skipped (already versed; WI-C catalog augmentation only).
 *
 * Catalog-miss safety (AC #5):
 *   When the target versed key is absent from psalter-texts.json AND the
 *   versed-map entry has `catalog_action: "ADD"` (CASE B), the rewrite
 *   for that cell is BLOCKED. The default mode refuses to write any
 *   cells when any in-scope cell is blocked, instructing the user to
 *   run WI-C first. `--allow-missing-catalog` overrides this, rewriting
 *   eligible cells and skipping blocked ones (the runtime falls back to
 *   Bible JSONL until WI-C lands — acceptable for staged rollout).
 *
 * Modes:
 *   (default)            apply rewrites, exit 1 if any blocked cell.
 *   --dry-run            list planned rewrites + blocks, do not write.
 *   --allow-missing-catalog
 *                        partial mode: rewrite eligible, skip blocked.
 *   --season {advent|christmas|lent|easter|ordinary-time|solemnities}
 *                        limit scope to one season's file.
 *
 * Exit codes:
 *   0 — success (all planned cells rewritten, OR dry-run completed).
 *   1 — error (catalog miss in default mode, invalid args, or
 *       JSON write failure).
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const VERSED_MAP_PATH = path.join(ROOT, 'parsed_data', 'first-vespers-versed-map.json')
const PROPERS_DIR = path.join(ROOT, 'src', 'data', 'loth', 'propers')
const SANCTORAL_DIR = path.join(ROOT, 'src', 'data', 'loth', 'sanctoral')
const PSALTER_TEXTS_PATH = path.join(ROOT, 'src', 'data', 'loth', 'psalter-texts.json')

const PROPERS_SEASONS = ['advent', 'christmas', 'lent', 'easter', 'ordinary-time']
const SANCTORAL_FILES = ['solemnities.json']

function parseArgs(argv) {
  const args = { season: null, dryRun: false, allowMissingCatalog: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--allow-missing-catalog') args.allowMissingCatalog = true
    else if (a === '--season') args.season = argv[++i]
    else if (a.startsWith('--season=')) args.season = a.slice('--season='.length)
    else if (a === '-h' || a === '--help') {
      console.log(usage())
      process.exit(0)
    } else {
      console.error(`Unknown arg: ${a}`)
      console.error(usage())
      process.exit(1)
    }
  }
  return args
}

function usage() {
  return [
    'Usage: node scripts/rewrite-first-vespers-bare-refs.js [options]',
    '',
    'Options:',
    '  --dry-run                    list planned rewrites without writing',
    '  --season SEASON              one of: advent, christmas, lent, easter,',
    '                               ordinary-time, solemnities (default: all)',
    '  --allow-missing-catalog      apply eligible rewrites, skip cells whose',
    '                               versed target is absent from psalter-texts.json',
    '                               (default: refuse all writes if any block exists)',
    '  -h, --help                   show this message',
  ].join('\n')
}

function loadVersedMap() {
  const raw = JSON.parse(fs.readFileSync(VERSED_MAP_PATH, 'utf8'))
  const rewrites = {}
  for (const [currentRef, entry] of Object.entries(raw)) {
    if (!entry.rewrite_needed) continue
    rewrites[currentRef] = {
      versed: entry.versed,
      catalogAction: entry.catalog_action,
      caseVerdict: entry.case_verdict,
    }
  }
  return rewrites
}

function loadCatalogKeys() {
  const data = JSON.parse(fs.readFileSync(PSALTER_TEXTS_PATH, 'utf8'))
  return new Set(Object.keys(data))
}

function planRewritesInTree(root, sourceLabel, rewrites) {
  const planned = []
  const walk = (node, p) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${p}[${i}]`))
      return
    }
    if (node && typeof node === 'object') {
      if (node.firstVespers && Array.isArray(node.firstVespers.psalms)) {
        node.firstVespers.psalms.forEach((psalm, i) => {
          if (psalm && typeof psalm.ref === 'string' && rewrites[psalm.ref]) {
            const r = rewrites[psalm.ref]
            planned.push({
              source: sourceLabel,
              path: `${p}.firstVespers.psalms[${i}]`,
              fromRef: psalm.ref,
              toRef: r.versed,
              catalogAction: r.catalogAction,
              psalmNode: psalm,
            })
          }
        })
      }
      Object.entries(node).forEach(([k, v]) => walk(v, `${p}.${k}`))
    }
  }
  walk(root, '$')
  return planned
}

function applyRewrites(planned) {
  for (const p of planned) {
    p.psalmNode.ref = p.toRef
  }
}

function classifyBlocks(planned, catalogKeys) {
  // A cell is BLOCKED when its versed target is not yet in the catalog
  // AND its catalog_action is "ADD" (CASE B). Cells with catalog_action
  // "none" should always have their target present — if not, that's a
  // separate inconsistency we treat as a hard error to surface visibly.
  const blocked = []
  const inconsistent = []
  for (const p of planned) {
    if (catalogKeys.has(p.toRef)) continue
    if (p.catalogAction === 'ADD') {
      blocked.push(p)
    } else {
      inconsistent.push(p)
    }
  }
  return { blocked, inconsistent }
}

function selectTargets(season) {
  if (!season) {
    return [
      ...PROPERS_SEASONS.map((s) => ({
        label: `propers/${s}.json`,
        path: path.join(PROPERS_DIR, `${s}.json`),
      })),
      ...SANCTORAL_FILES.map((f) => ({
        label: `sanctoral/${f}`,
        path: path.join(SANCTORAL_DIR, f),
      })),
    ]
  }
  if (season === 'solemnities') {
    return SANCTORAL_FILES.map((f) => ({
      label: `sanctoral/${f}`,
      path: path.join(SANCTORAL_DIR, f),
    }))
  }
  if (PROPERS_SEASONS.includes(season)) {
    return [
      {
        label: `propers/${season}.json`,
        path: path.join(PROPERS_DIR, `${season}.json`),
      },
    ]
  }
  throw new Error(
    `--season "${season}" not recognized. Allowed: ${[...PROPERS_SEASONS, 'solemnities'].join(', ')}`,
  )
}

function processFile(filePath, sourceLabel, rewrites) {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const planned = planRewritesInTree(root, sourceLabel, rewrites)
  return { root, planned }
}

function formatPlan(p, suffix = '') {
  return `  ${p.source} ${p.path}  "${p.fromRef}" → "${p.toRef}"${suffix}`
}

function main() {
  const args = parseArgs(process.argv)
  const rewrites = loadVersedMap()
  const catalogKeys = loadCatalogKeys()

  let targets
  try {
    targets = selectTargets(args.season)
  } catch (e) {
    console.error(`ERROR: ${e.message}`)
    process.exit(1)
  }

  const fileResults = targets.map((t) => ({
    ...t,
    ...processFile(t.path, t.label, rewrites),
  }))
  const allPlanned = fileResults.flatMap((fr) => fr.planned)
  const { blocked, inconsistent } = classifyBlocks(allPlanned, catalogKeys)
  const blockedSet = new Set(blocked)

  console.log('rewrite-first-vespers-bare-refs (FR-156 Phase 5 WI-A2)')
  console.log('-'.repeat(60))
  console.log(`mode:       ${args.dryRun ? 'dry-run' : args.allowMissingCatalog ? 'write (partial)' : 'write (strict)'}`)
  console.log(`scope:      ${args.season || 'all'}`)
  console.log(`planned:    ${allPlanned.length} cells`)
  console.log(`eligible:   ${allPlanned.length - blocked.length} cells`)
  if (blocked.length > 0) {
    const distinctBlocked = [...new Set(blocked.map((p) => p.toRef))].sort()
    console.log(`blocked:    ${blocked.length} cells (catalog miss, catalog_action=ADD): ${distinctBlocked.join(', ')}`)
  }
  if (inconsistent.length > 0) {
    console.log(`inconsistent: ${inconsistent.length} cells (target absent AND catalog_action=none — investigate)`)
  }
  console.log('')

  for (const fr of fileResults) {
    if (fr.planned.length === 0) continue
    console.log(`${fr.label}: ${fr.planned.length} cells`)
    for (const p of fr.planned) {
      let suffix = ''
      if (blockedSet.has(p)) suffix = ' [BLOCKED — WI-C precedence]'
      else if (inconsistent.includes(p)) suffix = ' [INCONSISTENT — catalog target absent]'
      console.log(formatPlan(p, suffix))
    }
  }
  console.log('')

  if (inconsistent.length > 0) {
    console.error('ERROR: catalog inconsistency detected. Versed targets are absent from psalter-texts.json,')
    console.error('but versed-map entries declare catalog_action="none" (i.e. catalog should already have them).')
    console.error('This is unexpected — verify versed-map evidence or catalog state before proceeding.')
    process.exit(1)
  }

  if (blocked.length > 0 && !args.dryRun && !args.allowMissingCatalog) {
    const distinctBlocked = [...new Set(blocked.map((p) => p.toRef))].sort()
    console.error('ERROR: catalog miss for entries with catalog_action="ADD":')
    for (const k of distinctBlocked) console.error(`  - ${k} (psalter-texts.json key absent)`)
    console.error('')
    console.error('WI-C catalog augmentation must precede this rewrite. After WI-C lands, re-run')
    console.error('this script (the catalog-miss check is satisfied automatically once entries exist).')
    console.error('')
    console.error('Override (NOT recommended): re-run with --allow-missing-catalog to rewrite eligible cells')
    console.error('only. Blocked cells stay bare-form; runtime falls back to Bible JSONL until WI-C lands.')
    process.exit(1)
  }

  if (args.dryRun) {
    console.log('Dry run — no files were modified.')
    process.exit(0)
  }

  // Apply rewrites + write back. Skip blocked cells when --allow-missing-catalog.
  let writtenCells = 0
  for (const fr of fileResults) {
    const eligible = fr.planned.filter((p) => !blockedSet.has(p))
    if (eligible.length === 0) continue
    applyRewrites(eligible)
    const serialized = JSON.stringify(fr.root, null, 2) + '\n'
    fs.writeFileSync(fr.path, serialized, 'utf8')
    writtenCells += eligible.length
    console.log(`wrote ${fr.label} (${eligible.length} cells rewritten)`)
  }
  console.log('')
  console.log(`Total: ${writtenCells} cells rewritten.`)
  if (blocked.length > 0) {
    console.log(`Skipped ${blocked.length} blocked cells (catalog miss). Re-run after WI-C to complete.`)
  }
  process.exit(0)
}

if (require.main === module) main()

module.exports = {
  parseArgs,
  loadVersedMap,
  planRewritesInTree,
  applyRewrites,
  classifyBlocks,
  selectTargets,
  PROPERS_SEASONS,
  SANCTORAL_FILES,
}
