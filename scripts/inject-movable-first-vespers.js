#!/usr/bin/env node
/**
 * FR-156 Phase 4b (task #24) injector. Takes the `movable` bucket of
 * scripts/output/solemnity-first-vespers-extracted.json and injects
 * each movable solemnity's 1st Vespers into the proper season JSON
 * under a special-key slot, where the Phase 4a resolver can find it:
 *
 *   EASTER:
 *     weeks['ascension'].SUN.firstVespers   ← movable.ascension
 *     weeks['pentecost'].SUN.firstVespers   ← movable.pentecost
 *   ORDINARY_TIME:
 *     weeks['trinitySunday'].SUN.firstVespers ← movable.trinitySunday
 *     weeks['corpusChristi'].SUN.firstVespers ← movable.corpusChristi
 *     weeks['sacredHeart'].SUN.firstVespers   ← movable.sacredHeart
 *     weeks['christTheKing'].SUN.firstVespers ← movable.christTheKing
 *
 * Notes:
 *   - Easter already has `weeks['ascension'].SUN` and `weeks['pentecost'].SUN`
 *     carrying `vespers` / `lauds` / `vespers2` hours (Phase 2 + earlier
 *     work). This injector only adds the `firstVespers` field — it does
 *     NOT overwrite the existing hour propers.
 *   - OT special keys (`trinitySunday`, `corpusChristi`, `sacredHeart`,
 *     `christTheKing`) do not exist yet. They are created fresh with
 *     only `SUN.firstVespers`. The Phase 4a resolver looks up under
 *     `weeks[specialKey]?.['SUN']` so keeping the bucket scoped to
 *     `SUN.firstVespers` is sufficient — regular hour propers for those
 *     celebrations still flow through the per-week lookup.
 *   - Movable entries `baptismOfTheLord` and `palmSunday` are Phase 2
 *     concerns (mapped via `weeks['lentW6']`/christmas baptism keys in
 *     FR-156 Phase 2). They are SKIPPED here.
 *   - antiphon_key prefix uses `movable-<slug>-<ps1|ps2|cant|slotN>` so
 *     seasonal_antiphons never collide with fixed-date solemnity keys.
 *
 * Source-of-truth mirror: `verify-movable-first-vespers.js` rebuilds the
 * expected payload the same way and diff-compares byte-for-byte.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EXTRACTED_PATH = path.join(ROOT, 'scripts', 'output', 'solemnity-first-vespers-extracted.json')
const PROPERS_DIR = path.join(ROOT, 'src', 'data', 'loth', 'propers')
const EASTER_PATH = path.join(PROPERS_DIR, 'easter.json')
const OT_PATH = path.join(PROPERS_DIR, 'ordinary-time.json')

const TARGET_SLUGS = [
  // slug          ,  season,     file
  ['ascension',      'EASTER',         'easter'],
  ['pentecost',      'EASTER',         'easter'],
  ['trinitySunday',  'ORDINARY_TIME',  'ordinary-time'],
  ['corpusChristi',  'ORDINARY_TIME',  'ordinary-time'],
  ['sacredHeart',    'ORDINARY_TIME',  'ordinary-time'],
  ['christTheKing',  'ORDINARY_TIME',  'ordinary-time'],
]

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
  const easter = JSON.parse(fs.readFileSync(EASTER_PATH, 'utf8'))
  const ot = JSON.parse(fs.readFileSync(OT_PATH, 'utf8'))

  const report = { injected: [], createdSpecialKeys: [], skipped: [] }

  for (const [slug, season, file] of TARGET_SLUGS) {
    const block = extracted.movable?.[slug]
    if (!block) {
      report.skipped.push({ slug, reason: 'not-in-extracted-movable-bucket' })
      continue
    }
    // Strip _meta before building the stable injection payload.
    const { _meta, ...data } = block
    const prefix = `movable-${slug}`
    const fv = buildFirstVespers(data, prefix)

    // Route to the right season JSON object (shared reference, edited in place).
    const seasonObj = file === 'easter' ? easter : ot
    if (!seasonObj.weeks[slug]) {
      seasonObj.weeks[slug] = { SUN: {} }
      report.createdSpecialKeys.push({ slug, file, season })
    } else if (!seasonObj.weeks[slug].SUN) {
      seasonObj.weeks[slug].SUN = {}
    }
    seasonObj.weeks[slug].SUN.firstVespers = fv
    report.injected.push({
      slug,
      file,
      season,
      hasPsalms: !!fv.psalms,
      fields: Object.keys(fv),
    })
  }

  // Log movable entries skipped (baptismOfTheLord, palmSunday, easterSundayVigil, holyFamily — not in scope).
  for (const k of Object.keys(extracted.movable || {})) {
    if (!TARGET_SLUGS.find(([s]) => s === k)) {
      report.skipped.push({ slug: k, reason: 'out-of-scope-for-phase-4b' })
    }
  }

  fs.writeFileSync(EASTER_PATH, JSON.stringify(easter, null, 2) + '\n', 'utf8')
  fs.writeFileSync(OT_PATH, JSON.stringify(ot, null, 2) + '\n', 'utf8')

  console.log('[inject-movable-fv] report:')
  console.log(`  injected: ${report.injected.length} (${report.createdSpecialKeys.length} new special keys created)`)
  for (const inj of report.injected) {
    const newFlag = report.createdSpecialKeys.find(c => c.slug === inj.slug) ? ' [NEW-KEY]' : ''
    console.log(`    ${inj.slug} → propers/${inj.file}.json weeks['${inj.slug}'].SUN.firstVespers${newFlag}`)
    console.log(`      fields: ${inj.fields.join(',')}`)
  }
  console.log(`  skipped: ${report.skipped.length}`)
  for (const s of report.skipped) {
    console.log(`    ${s.slug}  (${s.reason})`)
  }
}

main()
