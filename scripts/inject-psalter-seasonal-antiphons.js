#!/usr/bin/env node
/**
 * Inject seasonal_antiphons (from
 * scripts/output/seasonal-antiphons-extracted.json) into each psalter
 * entry in src/data/loth/psalter/week-{1..4}.json.
 *
 * Entries with no extracted variants are left untouched (field absent).
 * Re-running this script is idempotent — existing seasonal_antiphons
 * fields are fully overwritten from the extracted source.
 *
 * Schema: PsalmEntry.seasonal_antiphons?: {
 *   easter?: string
 *   easterAlt?: string
 *   advent?: string
 *   adventDec17_23?: string
 *   adventDec24?: string
 *   easterSunday?: Record<number, string>
 *   lentSunday?: Record<number, string>
 *   lentPassionSunday?: string
 * }
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PSALTER_DIR = path.join(ROOT, 'src', 'data', 'loth', 'psalter')
const EXTRACT_PATH = path.join(
  ROOT,
  'scripts',
  'output',
  'seasonal-antiphons-extracted.json',
)

function main() {
  const extracted = JSON.parse(fs.readFileSync(EXTRACT_PATH, 'utf8'))

  const report = { weeks: {}, totals: { entries: 0, injected: 0 } }

  for (const n of [1, 2, 3, 4]) {
    const filePath = path.join(PSALTER_DIR, `week-${n}.json`)
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    let entries = 0
    let injected = 0

    for (const day of Object.keys(json.days)) {
      const hours = json.days[day]
      for (const hour of Object.keys(hours)) {
        const psalms = hours[hour].psalms
        if (!Array.isArray(psalms)) continue
        for (const p of psalms) {
          entries++
          const sa = extracted[p.antiphon_key]
          if (sa && Object.keys(sa).length > 0) {
            // Preserve stable key order to minimise diffs.
            const ordered = {}
            for (const k of [
              'easter',
              'easterAlt',
              'advent',
              'adventDec17_23',
              'adventDec24',
              'easterSunday',
              'lentSunday',
              'lentPassionSunday',
            ]) {
              if (k in sa) ordered[k] = sa[k]
            }
            p.seasonal_antiphons = ordered
            injected++
          } else if ('seasonal_antiphons' in p) {
            delete p.seasonal_antiphons
          }
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
    report.weeks[`week-${n}`] = { entries, injected, coverage: (injected / entries).toFixed(3) }
    report.totals.entries += entries
    report.totals.injected += injected
  }

  report.totals.coverage = (
    report.totals.injected / report.totals.entries
  ).toFixed(3)

  console.log('[inject] done')
  console.log(JSON.stringify(report, null, 2))
}

main()
