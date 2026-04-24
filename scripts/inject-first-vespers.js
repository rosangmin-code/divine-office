#!/usr/bin/env node
/**
 * FR-156 Phase 2 injector. Takes the PDF-extracted First Vespers blocks
 * (scripts/output/first-vespers-extracted.json, keyed by psalter week
 * 1..4) and writes them into each season's propers JSON under
 * `weeks[seasonWeekKey].SUN.firstVespers`.
 *
 * Season → season week → psalter week mapping follows the 4-week
 * Roman psalter wrap convention (GILH §§136-139). Palm Sunday (Lent
 * week "6" in lent.json) renders with psalter week 2 per the PDF
 * author's placement of lentPassionSunday variants inside the PDF W2
 * First Vespers block.
 *
 * Injection adds a new top-level key under an existing or new
 * weeks[N].SUN entry; it does NOT overwrite vespers/lauds/vespers2
 * fields. For weeks[N].SUN that didn't exist before, a fresh object is
 * created holding only `firstVespers`. The propers-loader's per-hour
 * fallback (FR-156 Phase 2 resolver hardening) ensures the Sunday
 * regular-vespers/lauds lookup still resolves to weeks['1'].SUN data.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EXTRACTED_PATH = path.join(ROOT, 'scripts', 'output', 'first-vespers-extracted.json')
const PROPERS_DIR = path.join(ROOT, 'src', 'data', 'loth', 'propers')

// season → { seasonWeekKey: psalterWeek }
const MAPPINGS = {
  advent: {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
  },
  lent: {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 1, // 5th Sunday of Lent: psalter W1 wrap (carries lentSunday[5])
    '6': 2, // Palm Sunday = Passion: psalter W2 (carries lentPassionSunday)
  },
  easter: {
    // weeks['1'] is the Easter Octave; Easter Sunday is keyed separately
    // as `easterSunday` and its Saturday-prior (= Holy Saturday) is
    // Triduum, not regular First Vespers — skip that slot.
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 1, // Easter W5 → psalter W1
    '6': 2, // Easter W6 → psalter W2
    '7': 3, // Easter W7 → psalter W3
  },
  christmas: {
    // Limited Christmas coverage: holyFamily and baptism Sundays map to
    // psalter W1 per PDF convention. Other Christmas keys (dec25,
    // octave, jan1, epiphany, epiphanyWeek) are solemnities with their
    // own dedicated First Vespers sections in the PDF (outside Phase 2
    // scope — see coverage report).
    holyFamily: 1,
    baptism: 1,
  },
  'ordinary-time': Object.fromEntries(
    Array.from({ length: 34 }, (_, i) => {
      const N = i + 1
      const psalterWeek = ((N - 1) % 4) + 1
      return [String(N), psalterWeek]
    }),
  ),
}

function buildFirstVespersForWeek(block, psalterWeek) {
  // Convert PDF-extracted psalm entries into PsalmEntry shape compatible
  // with psalter/week-{N}.json.
  const typeKey = ['ps1', 'ps2', 'cant']
  const psalms = block.psalms.map((p, i) => {
    const entry = {
      type: p.type === 'canticle' ? 'canticle' : 'psalm',
      ref: p.ref || null,
      antiphon_key: `fv-w${psalterWeek}-sun-${typeKey[i] || `slot${i}`}`,
      default_antiphon: p.default_antiphon,
      gloria_patri: true,
    }
    if (p.seasonal_antiphons && Object.keys(p.seasonal_antiphons).length > 0) {
      entry.seasonal_antiphons = p.seasonal_antiphons
    }
    return entry
  })

  const fv = { psalms }
  if (block.shortReading) fv.shortReading = block.shortReading
  if (block.responsory) fv.responsory = block.responsory
  if (block.gospelCanticleAntiphon) fv.gospelCanticleAntiphon = block.gospelCanticleAntiphon
  if (block.intercessions && block.intercessions.length > 0) fv.intercessions = block.intercessions
  if (block.concludingPrayer) fv.concludingPrayer = block.concludingPrayer
  return fv
}

function main() {
  const extracted = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))
  const coverage = {}

  for (const [seasonFile, mapping] of Object.entries(MAPPINGS)) {
    const propersPath = path.join(PROPERS_DIR, `${seasonFile}.json`)
    const json = JSON.parse(fs.readFileSync(propersPath, 'utf8'))
    if (!json.weeks) json.weeks = {}
    const seasonCoverage = { injected: [], skipped: [] }

    for (const [weekKey, psalterWeek] of Object.entries(mapping)) {
      const block = extracted[String(psalterWeek)]
      if (!block) {
        seasonCoverage.skipped.push({ weekKey, reason: `no PDF W${psalterWeek} block` })
        continue
      }
      const fv = buildFirstVespersForWeek(block, psalterWeek)

      if (!json.weeks[weekKey]) json.weeks[weekKey] = {}
      if (!json.weeks[weekKey].SUN) json.weeks[weekKey].SUN = {}
      json.weeks[weekKey].SUN.firstVespers = fv
      seasonCoverage.injected.push({ weekKey, psalterWeek, psalmCount: fv.psalms.length })
    }

    fs.writeFileSync(propersPath, JSON.stringify(json, null, 2) + '\n', 'utf8')
    coverage[seasonFile] = seasonCoverage
  }

  // stats
  console.log('[inject-fv] coverage report:')
  let totalInjected = 0
  for (const [season, cov] of Object.entries(coverage)) {
    console.log(`  ${season}: injected=${cov.injected.length} skipped=${cov.skipped.length}`)
    for (const inj of cov.injected) {
      console.log(`    weeks[${inj.weekKey}] → PDF_W${inj.psalterWeek} (${inj.psalmCount} psalms)`)
    }
    for (const s of cov.skipped) {
      console.log(`    weeks[${s.weekKey}] SKIPPED: ${s.reason}`)
    }
    totalInjected += cov.injected.length
  }
  console.log(`[inject-fv] total Sundays injected: ${totalInjected}`)
}

main()
