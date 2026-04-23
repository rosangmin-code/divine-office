#!/usr/bin/env node
/**
 * Verify that every psalter/week-*.json `seasonal_antiphons` value is
 * byte-equal to the variant text extracted from parsed_data/full_pdf.txt.
 *
 * Strategy: re-run the extraction (source of truth = PDF) and diff it
 * against what's currently injected in the psalter JSONs. Anything that
 * doesn't match is a regression that must be investigated before ship.
 *
 * Mirror of the NFR-009c verified-correction pattern used by the other
 * `verify-*-pages.js` scripts.
 *
 * Exit code:
 *   0 — all variants match (or JSON has no variant where extract has none)
 *   1 — at least one mismatch / missing / unexpected
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PSALTER_DIR = path.join(ROOT, 'src', 'data', 'loth', 'psalter')
const EXTRACT_SCRIPT = path.join(__dirname, 'extract-psalter-seasonal-antiphons.js')
const EXTRACT_PATH = path.join(
  ROOT,
  'scripts',
  'output',
  'seasonal-antiphons-extracted.json',
)

function run() {
  // 1. Regenerate the extraction to ensure freshness. The extractor
  //    writes to scripts/output/seasonal-antiphons-extracted.json.
  execSync(`node ${JSON.stringify(EXTRACT_SCRIPT)}`, {
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  const extracted = JSON.parse(fs.readFileSync(EXTRACT_PATH, 'utf8'))

  // 2. Load every psalter entry's injected seasonal_antiphons.
  const injected = {}
  for (const n of [1, 2, 3, 4]) {
    const json = JSON.parse(
      fs.readFileSync(path.join(PSALTER_DIR, `week-${n}.json`), 'utf8'),
    )
    for (const day of Object.keys(json.days)) {
      for (const hour of Object.keys(json.days[day])) {
        const psalms = json.days[day][hour].psalms
        if (!Array.isArray(psalms)) continue
        for (const p of psalms) {
          if (p.seasonal_antiphons) {
            injected[p.antiphon_key] = p.seasonal_antiphons
          }
        }
      }
    }
  }

  // 3. Diff.
  const issues = { missing: [], unexpected: [], mismatch: [] }

  // (a) keys present in extraction but missing from JSON
  for (const key of Object.keys(extracted)) {
    if (!injected[key]) {
      issues.missing.push({ key, reason: 'JSON has no seasonal_antiphons' })
      continue
    }
    const inj = injected[key]
    const ext = extracted[key]
    for (const season of Object.keys(ext)) {
      if (season === 'easterSunday' || season === 'lentSunday') {
        const injBucket = inj[season] || {}
        const extBucket = ext[season]
        for (const wk of Object.keys(extBucket)) {
          const extVal = extBucket[wk]
          const injVal = injBucket[wk]
          if (injVal === undefined) {
            issues.missing.push({
              key,
              season: `${season}[${wk}]`,
              expected: extVal.slice(0, 60),
            })
          } else if (injVal !== extVal) {
            issues.mismatch.push({
              key,
              season: `${season}[${wk}]`,
              expected: extVal,
              actual: injVal,
            })
          }
        }
        // unexpected sub-keys
        for (const wk of Object.keys(injBucket)) {
          if (!(wk in extBucket)) {
            issues.unexpected.push({
              key,
              season: `${season}[${wk}]`,
              value: injBucket[wk].slice(0, 60),
            })
          }
        }
      } else {
        if (!(season in inj)) {
          issues.missing.push({
            key,
            season,
            expected: ext[season].slice(0, 60),
          })
        } else if (inj[season] !== ext[season]) {
          issues.mismatch.push({
            key,
            season,
            expected: ext[season],
            actual: inj[season],
          })
        }
      }
    }
    // unexpected top-level seasons in JSON
    for (const season of Object.keys(inj)) {
      if (!(season in ext)) {
        issues.unexpected.push({
          key,
          season,
          value: typeof inj[season] === 'string'
            ? inj[season].slice(0, 60)
            : JSON.stringify(inj[season]).slice(0, 80),
        })
      }
    }
  }

  // (b) keys present in JSON but missing from extraction
  for (const key of Object.keys(injected)) {
    if (!extracted[key]) {
      issues.unexpected.push({ key, reason: 'JSON has seasonal_antiphons, PDF extraction has none' })
    }
  }

  // 4. Report.
  const total = issues.missing.length + issues.unexpected.length + issues.mismatch.length
  console.log(`[verify] mismatch=${issues.mismatch.length} missing=${issues.missing.length} unexpected=${issues.unexpected.length}`)
  if (total === 0) {
    console.log('[verify] PASS — all psalter seasonal_antiphons byte-equal to PDF extraction')
    process.exit(0)
  }

  for (const m of issues.mismatch.slice(0, 10)) {
    console.log('\n[MISMATCH]', m.key, m.season)
    console.log('  expected:', m.expected)
    console.log('  actual  :', m.actual)
  }
  for (const m of issues.missing.slice(0, 10)) {
    console.log('\n[MISSING]', m.key, m.season || '(any)', '→', m.expected || m.reason)
  }
  for (const m of issues.unexpected.slice(0, 10)) {
    console.log('\n[UNEXPECTED]', m.key, m.season || '(any)', '→', m.value || m.reason)
  }

  process.exit(1)
}

run()
