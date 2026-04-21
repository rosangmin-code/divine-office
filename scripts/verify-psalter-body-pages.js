#!/usr/bin/env node
/**
 * verify-psalter-body-pages.js
 *
 * Validates `page` values on the non-psalm fields of
 * src/data/loth/psalter/week-{1..4}.json:
 *   - shortReading.page    (via shortReading.text fingerprint)
 *   - responsory.page      (via versicle + response fingerprint)
 *   - intercessionsPage    (via intercessions[0] fingerprint)
 *   - concludingPrayerPage (via concludingPrayer fingerprint)
 *
 * Single-anchor evidence rule (body-only): bodies here are long enough
 * (>=15 tokens) that `lookupPage` with safeAmbiguousMin:15 refuses to
 * guess on short-ambiguous matches. If match page p_match lies within
 * {declared-1, declared, declared+1} and differs from declared → verified.
 * Otherwise → manual-review.
 *
 * Read-only. Emits:
 *   scripts/out/psalter-body-page-corrections.json
 *   scripts/out/psalter-body-page-review.json
 */

const fs = require('fs')
const path = require('path')
const {
  buildSourceIndex,
  buildFirstTokenIndex,
  lookupPage,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'psalter-body-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'psalter-body-page-review.json')

const WINDOW = 1

// field definition: which hour sub-object, how to extract body, where the page lives
const FIELD_DEFS = [
  {
    kind: 'shortReading',
    locator: (day, hour) => `days.${day}.${hour}.shortReading`,
    getBody: h => h.shortReading?.text,
    getDeclared: h => h.shortReading?.page,
    pageField: 'page',
    objectAt: h => h.shortReading,
  },
  {
    kind: 'responsory',
    locator: (day, hour) => `days.${day}.${hour}.responsory`,
    getBody: h => {
      const r = h.responsory
      if (!r) return null
      return `${r.versicle || ''} ${r.response || ''}`.trim()
    },
    getDeclared: h => h.responsory?.page,
    pageField: 'page',
    objectAt: h => h.responsory,
  },
  {
    kind: 'intercessionsPage',
    locator: (day, hour) => `days.${day}.${hour}.intercessionsPage`,
    getBody: h => Array.isArray(h.intercessions) && h.intercessions.length > 0 ? h.intercessions[0] : null,
    getDeclared: h => h.intercessionsPage,
    pageField: 'intercessionsPage',
    objectAt: h => h, // parallel key on hour itself
  },
  {
    kind: 'concludingPrayerPage',
    locator: (day, hour) => `days.${day}.${hour}.concludingPrayerPage`,
    getBody: h => typeof h.concludingPrayer === 'string' ? h.concludingPrayer : null,
    getDeclared: h => h.concludingPrayerPage,
    pageField: 'concludingPrayerPage',
    objectAt: h => h,
  },
]

function main() {
  console.log('=== verify-psalter-body-pages ===')
  console.log(`source: ${path.relative(ROOT, FULL_PDF)}`)
  const srcTokens = buildSourceIndex(FULL_PDF)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}`)

  const corrections = {
    version: 1,
    generated: new Date().toISOString(),
    source: path.relative(ROOT, FULL_PDF),
    files: {},
  }
  const review = { version: 1, generated: corrections.generated, entries: [] }

  const freq = { 'within-window': 0, 'out-of-window': 0, 'no-match': 0 }
  const statusCounts = { agree: 0, 'verified-correction': 0, 'manual-review': 0 }
  const perKindStats = {}
  for (const fd of FIELD_DEFS) perKindStats[fd.kind] = { agree: 0, changed: 0, review: 0 }

  for (const w of [1, 2, 3, 4]) {
    const file = path.join(ROOT, `src/data/loth/psalter/week-${w}.json`)
    const relFile = path.relative(ROOT, file)
    const weekData = JSON.parse(fs.readFileSync(file, 'utf8'))

    for (const [day, dayData] of Object.entries(weekData.days || {})) {
      for (const [hour, hourData] of Object.entries(dayData || {})) {
        if (!hourData || typeof hourData !== 'object') continue

        for (const fd of FIELD_DEFS) {
          const declared = fd.getDeclared(hourData)
          if (typeof declared !== 'number') continue
          const body = fd.getBody(hourData)
          if (typeof body !== 'string' || body.trim().length === 0) {
            statusCounts['manual-review']++
            perKindStats[fd.kind].review++
            review.entries.push({
              file: relFile,
              kind: fd.kind,
              locator: fd.locator(day, hour),
              declared,
              reason: 'empty-body',
            })
            continue
          }
          const match = lookupPage(body, srcTokens, firstTokenIndex, { safeAmbiguousMin: 15 })
          if (match === null) {
            freq['no-match']++
            statusCounts['manual-review']++
            perKindStats[fd.kind].review++
            review.entries.push({
              file: relFile,
              kind: fd.kind,
              locator: fd.locator(day, hour),
              declared,
              reason: 'no-fingerprint-match',
            })
            continue
          }
          const inWindow = Math.abs(match - declared) <= WINDOW
          if (inWindow) freq['within-window']++
          else freq['out-of-window']++

          if (match === declared) {
            statusCounts.agree++
            perKindStats[fd.kind].agree++
            continue
          }
          if (!inWindow) {
            statusCounts['manual-review']++
            perKindStats[fd.kind].review++
            review.entries.push({
              file: relFile,
              kind: fd.kind,
              locator: fd.locator(day, hour),
              declared,
              matched: match,
              delta: match - declared,
              reason: 'out-of-window',
            })
            continue
          }
          statusCounts['verified-correction']++
          perKindStats[fd.kind].changed++
          if (!corrections.files[relFile]) corrections.files[relFile] = []
          corrections.files[relFile].push({
            kind: fd.kind,
            locator: fd.locator(day, hour),
            from: declared,
            to: match,
            delta: match - declared,
          })
        }
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n')
  fs.writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2) + '\n')

  console.log('')
  console.log('--- Match window (|match - declared| vs WINDOW=±1) ---')
  for (const [k, v] of Object.entries(freq)) console.log(`  ${k.padEnd(16)}: ${v}`)

  console.log('')
  console.log('--- Status counts ---')
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k.padEnd(30)}: ${v}`)

  console.log('')
  console.log('--- Per-kind breakdown ---')
  for (const [k, v] of Object.entries(perKindStats)) {
    console.log(`  ${k.padEnd(24)}: agree=${v.agree}  changed=${v.changed}  review=${v.review}`)
  }

  console.log('')
  console.log(`corrections: ${path.relative(ROOT, OUT_CORRECTIONS)} (${statusCounts['verified-correction']} entries)`)
  console.log(`review     : ${path.relative(ROOT, OUT_REVIEW)} (${review.entries.length} entries)`)
}

main()
