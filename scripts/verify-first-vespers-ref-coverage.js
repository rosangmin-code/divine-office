#!/usr/bin/env node
/**
 * FR-156 Phase 5 verifier (WI-A3). Scans firstVespers psalms[*].ref across
 * propers/{advent,christmas,lent,easter,ordinary-time}.json and
 * sanctoral/solemnities.json, then enforces three invariants:
 *
 *   AC #1 versed-form: ref matches /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/.
 *           Bare refs ("Psalm 122") fail; the parser regex in
 *           src/lib/scripture-ref-parser.ts requires a colon, so bare
 *           cells fall through to placeholder rendering.
 *   AC #2 catalog match: ref appears as an exact key in
 *           src/data/loth/psalter-texts.json. Cells whose ref is not
 *           in catalog also fall through (Bible JSONL lookup is a
 *           secondary fallback that loses stanza structure).
 *   AC #3 antiphon-slot consistency: cells that share the same catalog
 *           ref share the same antiphon_key slot suffix (last "-"
 *           segment, e.g. ps1/ps2/cant). A drift here means the same
 *           psalm is assigned to different positions across cells —
 *           a data-authoring red flag even if both keys exist.
 *
 * Exit codes:
 *   0 — all three invariants hold, all cells valid.
 *   1 — one or more violations. Position list is printed to stdout.
 *
 * Basal expectation (pre-rewrite, FR-156 Phase 5 plan §1.2):
 *   bare-ref violations = 66 (Psalm 16/113/122/130/142/147 cells).
 *
 * Usage: node scripts/verify-first-vespers-ref-coverage.js
 *        package.json: `npm run verify:first-vespers-ref`
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PROPERS_DIR = path.join(ROOT, 'src', 'data', 'loth', 'propers')
const SANCTORAL_DIR = path.join(ROOT, 'src', 'data', 'loth', 'sanctoral')
const PSALTER_TEXTS_PATH = path.join(ROOT, 'src', 'data', 'loth', 'psalter-texts.json')

const PROPERS_SEASONS = ['advent', 'christmas', 'lent', 'easter', 'ordinary-time']
const SANCTORAL_FILES = ['solemnities.json']

// AC #1 versed-form regex (verbatim from FR-156 Phase 5 plan §3.2).
const VERSED_REGEX = /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function collectFirstVespersRefs(root, sourceLabel) {
  const cells = []
  const walk = (node, refPath) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${refPath}[${i}]`))
      return
    }
    if (node && typeof node === 'object') {
      if (node.firstVespers && Array.isArray(node.firstVespers.psalms)) {
        node.firstVespers.psalms.forEach((p, i) => {
          if (p && typeof p.ref === 'string') {
            cells.push({
              source: sourceLabel,
              path: `${refPath}.firstVespers.psalms[${i}]`,
              ref: p.ref,
              antiphonKey: typeof p.antiphon_key === 'string' ? p.antiphon_key : null,
            })
          }
        })
      }
      Object.entries(node).forEach(([k, v]) => walk(v, `${refPath}.${k}`))
    }
  }
  walk(root, '$')
  return cells
}

function gatherCells() {
  const cells = []
  for (const season of PROPERS_SEASONS) {
    const filePath = path.join(PROPERS_DIR, `${season}.json`)
    if (!fs.existsSync(filePath)) continue
    cells.push(...collectFirstVespersRefs(loadJSON(filePath), `propers/${season}.json`))
  }
  for (const fname of SANCTORAL_FILES) {
    const filePath = path.join(SANCTORAL_DIR, fname)
    if (!fs.existsSync(filePath)) continue
    cells.push(...collectFirstVespersRefs(loadJSON(filePath), `sanctoral/${fname}`))
  }
  return cells
}

function slotSuffix(antiphonKey) {
  if (!antiphonKey) return null
  const idx = antiphonKey.lastIndexOf('-')
  return idx >= 0 ? antiphonKey.slice(idx + 1) : antiphonKey
}

function verify() {
  const cells = gatherCells()
  const catalog = loadJSON(PSALTER_TEXTS_PATH)
  const catalogKeys = new Set(Object.keys(catalog))

  const violations = {
    bareRef: [],
    catalogMiss: [],
    antiphonSlotDrift: [],
  }

  // AC #1, AC #2 — per-cell checks.
  for (const cell of cells) {
    if (!VERSED_REGEX.test(cell.ref)) {
      violations.bareRef.push(cell)
    } else if (!catalogKeys.has(cell.ref)) {
      // Only count catalog miss when the form is at least versed; a bare
      // ref is already counted as bareRef and would double-count here.
      violations.catalogMiss.push(cell)
    }
  }

  // AC #3 — same ref → same antiphon_key slot suffix.
  // Skip refs that are already bareRef-failed: their fix in WI-B*
  // will set both ref and (presumably) antiphon_key consistently.
  const slotByRef = new Map()
  for (const cell of cells) {
    if (!cell.antiphonKey) continue
    if (!VERSED_REGEX.test(cell.ref)) continue
    const slot = slotSuffix(cell.antiphonKey)
    if (!slotByRef.has(cell.ref)) {
      slotByRef.set(cell.ref, { slot, witnesses: [cell] })
      continue
    }
    const group = slotByRef.get(cell.ref)
    if (group.slot === slot) {
      group.witnesses.push(cell)
      continue
    }
    violations.antiphonSlotDrift.push({
      ref: cell.ref,
      expectedSlot: group.slot,
      actualSlot: slot,
      cell,
      firstWitness: group.witnesses[0],
    })
  }

  return { cells, catalogKeys, violations }
}

function formatCell(cell) {
  const antiphon = cell.antiphonKey ? ` antiphon_key="${cell.antiphonKey}"` : ''
  return `  ${cell.source} ${cell.path} ref="${cell.ref}"${antiphon}`
}

function main() {
  const { cells, violations } = verify()
  const total = violations.bareRef.length + violations.catalogMiss.length + violations.antiphonSlotDrift.length

  console.log('verify-first-vespers-ref-coverage (FR-156 Phase 5 WI-A3)')
  console.log('---------------------------------------------------------')
  console.log(`Cells scanned:            ${cells.length}`)
  console.log(`Bare-ref violations:      ${violations.bareRef.length}  (AC #1 versed-form)`)
  console.log(`Catalog-miss violations:  ${violations.catalogMiss.length}  (AC #2 psalter-texts.json key)`)
  console.log(`Antiphon-slot drift:      ${violations.antiphonSlotDrift.length}  (AC #3 same ref → same slot)`)
  console.log('')

  if (violations.bareRef.length > 0) {
    console.log('Bare-ref offenders (AC #1 — ref missing colon, fails parser regex):')
    for (const cell of violations.bareRef) console.log(formatCell(cell))
    console.log('')
  }
  if (violations.catalogMiss.length > 0) {
    console.log('Catalog-miss offenders (AC #2 — versed ref absent from psalter-texts.json):')
    for (const cell of violations.catalogMiss) console.log(formatCell(cell))
    console.log('')
  }
  if (violations.antiphonSlotDrift.length > 0) {
    console.log('Antiphon-slot drift (AC #3 — same catalog key in different slot):')
    for (const v of violations.antiphonSlotDrift) {
      console.log(
        `  ref="${v.ref}" expected slot "${v.expectedSlot}" (from ${v.firstWitness.source} ${v.firstWitness.path}), ` +
          `got "${v.actualSlot}" at ${v.cell.source} ${v.cell.path}`,
      )
    }
    console.log('')
  }

  if (total === 0) {
    console.log('Result: PASS — all firstVespers refs are versed-form, catalog-matched, and slot-consistent.')
    process.exit(0)
  }
  console.log(`Result: FAIL — ${total} total violations.`)
  process.exit(1)
}

if (require.main === module) main()

module.exports = { verify, VERSED_REGEX }
