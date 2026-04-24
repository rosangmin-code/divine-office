#!/usr/bin/env node
/**
 * FR-156 Phase 3b injector. Takes scripts/output/solemnity-first-vespers-extracted.json
 * and writes the `fixed` MM-DD entries into the appropriate sanctoral
 * file (solemnities.json for SOLEMNITY rank, feasts.json for FEAST
 * rank). Keys are normalised to "MM-DD" with leading zeros. Existing
 * hours data (lauds / vespers / vespers2 / name / ...) is preserved;
 * only `firstVespers` is added/overwritten.
 *
 * Entries not in either file (e.g. 01-01 Motherhood of Mary, 12-25
 * Christmas) are created fresh on solemnities.json with a name inferred
 * from the extracted _meta.name.
 *
 * Movable celebrations (Easter Sunday, Pentecost, Christ the King, …)
 * stay in `fixed`'s sibling `movable` bucket — they have no MM-DD
 * sanctoral slot in the current schema, and the Phase 3a resolver only
 * fires for rank===SOLEMNITY via getSanctoralPropers(MM-DD). A future
 * phase can wire them into propers/easter.json (or similar) via named
 * keys. This injector skips them.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EXTRACTED_PATH = path.join(ROOT, 'scripts', 'output', 'solemnity-first-vespers-extracted.json')
const SANCTORAL_DIR = path.join(ROOT, 'src', 'data', 'loth', 'sanctoral')
const SOLEMNITIES_PATH = path.join(SANCTORAL_DIR, 'solemnities.json')
const FEASTS_PATH = path.join(SANCTORAL_DIR, 'feasts.json')

function buildFirstVespers(block, antiphonKeyPrefix) {
  const typeKey = ['ps1', 'ps2', 'cant']
  const fv = {}
  if (block.psalms && block.psalms.length > 0) {
    fv.psalms = block.psalms.map((p, i) => {
      const entry = {
        type: p.type === 'canticle' ? 'canticle' : 'psalm',
        ref: p.ref || null,
        antiphon_key: `${antiphonKeyPrefix}-${typeKey[i] || `slot${i}`}`,
        default_antiphon: p.default_antiphon,
        gloria_patri: true,
      }
      if (p.seasonal_antiphons && Object.keys(p.seasonal_antiphons).length > 0) {
        entry.seasonal_antiphons = p.seasonal_antiphons
      }
      return entry
    })
  }
  if (block.shortReading) fv.shortReading = block.shortReading
  if (block.responsory) fv.responsory = block.responsory
  if (block.gospelCanticleAntiphon) fv.gospelCanticleAntiphon = block.gospelCanticleAntiphon
  if (block.intercessions && block.intercessions.length > 0) fv.intercessions = block.intercessions
  if (block.concludingPrayer) fv.concludingPrayer = block.concludingPrayer
  if (block.alternativeConcludingPrayer) fv.alternativeConcludingPrayer = block.alternativeConcludingPrayer
  return fv
}

function main() {
  const extracted = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))
  const solemnities = JSON.parse(fs.readFileSync(SOLEMNITIES_PATH, 'utf8'))
  const feasts = JSON.parse(fs.readFileSync(FEASTS_PATH, 'utf8'))

  const report = { injected: [], created: [], skippedMovable: [] }

  for (const [key, block] of Object.entries(extracted.fixed)) {
    // Strip _meta before building the stable injection payload.
    const { _meta, ...data } = block
    const rank = _meta?.rank ?? 'SOLEMNITY'
    const name = _meta?.name

    // antiphon_key prefix — e.g. "solemnity-12-25" or "feast-02-02".
    const prefix = `${rank === 'FEAST' ? 'feast' : 'solemnity'}-${key}`
    const fv = buildFirstVespers(data, prefix)

    // Route by existing file membership, else rank.
    let targetFile, target
    if (solemnities[key]) { targetFile = 'solemnities'; target = solemnities }
    else if (feasts[key]) { targetFile = 'feasts'; target = feasts }
    else if (rank === 'FEAST') { targetFile = 'feasts'; target = feasts }
    else { targetFile = 'solemnities'; target = solemnities }

    const existed = !!target[key]
    if (!existed) {
      target[key] = {}
      if (name) target[key].name = name
      report.created.push({ key, file: targetFile, rank })
    }
    target[key].firstVespers = fv
    report.injected.push({ key, file: targetFile, rank, hasPsalms: !!fv.psalms })
  }

  // Movable entries stay out of the sanctoral files — log for transparency.
  for (const key of Object.keys(extracted.movable || {})) {
    report.skippedMovable.push(key)
  }

  fs.writeFileSync(SOLEMNITIES_PATH, JSON.stringify(solemnities, null, 2) + '\n', 'utf8')
  fs.writeFileSync(FEASTS_PATH, JSON.stringify(feasts, null, 2) + '\n', 'utf8')

  console.log('[inject-solemnity-fv] report:')
  console.log(`  injected: ${report.injected.length} (${report.created.length} new entries created)`)
  for (const inj of report.injected) {
    console.log(`    ${inj.key} → ${inj.file}.json (${inj.rank})${inj.hasPsalms ? ' +psalms' : ''}${report.created.find(c => c.key === inj.key) ? ' [NEW]' : ''}`)
  }
  console.log(`  skipped movable (no MM-DD slot): ${report.skippedMovable.length}`)
  for (const m of report.skippedMovable) {
    console.log(`    ${m}`)
  }
}

main()
