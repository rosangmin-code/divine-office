#!/usr/bin/env node
/**
 * verify-propers-pages.js
 *
 * Validates `page` values in src/data/loth/propers/*.json against
 * parsed_data/full_pdf.txt using body-only fingerprints with
 * safeAmbiguousMin:15 (same body-only rule as verify-psalter-body-pages).
 *
 * Fields:
 *   - shortReading.page              ← shortReading.text
 *   - responsory.page                ← versicle + response
 *   - gospelCanticleAntiphonPage     ← gospelCanticleAntiphon
 *   - intercessionsPage              ← intercessions[0]
 *   - concludingPrayerPage           ← concludingPrayer
 *   - alternativeConcludingPrayerPage ← alternativeConcludingPrayer
 *
 * Propers are organised as `weeks.<WEEK>.<DAY>.<hour>.<field>`.
 *
 * Read-only. Emits:
 *   scripts/out/propers-page-corrections.json
 *   scripts/out/propers-page-review.json
 */

const fs = require('fs')
const path = require('path')
const { buildSourceIndex, buildFirstTokenIndex, lookupPage } = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'propers-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'propers-page-review.json')

const SEASONS = ['advent', 'christmas', 'easter', 'lent', 'ordinary-time']
const WINDOW = 1

function collectFromHour(hourData, pathPrefix, out) {
  if (!hourData || typeof hourData !== 'object') return
  // shortReading
  if (hourData.shortReading && typeof hourData.shortReading === 'object' && typeof hourData.shortReading.page === 'number') {
    out.push({
      kind: 'shortReading',
      locator: `${pathPrefix}.shortReading`,
      body: hourData.shortReading.text,
      declared: hourData.shortReading.page,
      targetField: 'page',
    })
  }
  // responsory
  if (hourData.responsory && typeof hourData.responsory === 'object' && typeof hourData.responsory.page === 'number') {
    out.push({
      kind: 'responsory',
      locator: `${pathPrefix}.responsory`,
      body: `${hourData.responsory.versicle || ''} ${hourData.responsory.response || ''}`.trim(),
      declared: hourData.responsory.page,
      targetField: 'page',
    })
  }
  // gospelCanticleAntiphon / gospelCanticleAntiphonPage
  if (typeof hourData.gospelCanticleAntiphonPage === 'number' && typeof hourData.gospelCanticleAntiphon === 'string') {
    out.push({
      kind: 'gospelCanticleAntiphonPage',
      locator: `${pathPrefix}.gospelCanticleAntiphonPage`,
      body: hourData.gospelCanticleAntiphon,
      declared: hourData.gospelCanticleAntiphonPage,
      targetField: null, // parallel key
    })
  }
  // intercessionsPage
  if (typeof hourData.intercessionsPage === 'number' && Array.isArray(hourData.intercessions) && hourData.intercessions.length > 0) {
    out.push({
      kind: 'intercessionsPage',
      locator: `${pathPrefix}.intercessionsPage`,
      body: hourData.intercessions[0],
      declared: hourData.intercessionsPage,
      targetField: null,
    })
  }
  // concludingPrayerPage
  if (typeof hourData.concludingPrayerPage === 'number' && typeof hourData.concludingPrayer === 'string') {
    out.push({
      kind: 'concludingPrayerPage',
      locator: `${pathPrefix}.concludingPrayerPage`,
      body: hourData.concludingPrayer,
      declared: hourData.concludingPrayerPage,
      targetField: null,
    })
  }
  // alternativeConcludingPrayerPage
  if (typeof hourData.alternativeConcludingPrayerPage === 'number' && typeof hourData.alternativeConcludingPrayer === 'string') {
    out.push({
      kind: 'alternativeConcludingPrayerPage',
      locator: `${pathPrefix}.alternativeConcludingPrayerPage`,
      body: hourData.alternativeConcludingPrayer,
      declared: hourData.alternativeConcludingPrayerPage,
      targetField: null,
    })
  }
}

function collectFromSeason(data) {
  const out = []
  const weeks = data.weeks || {}
  for (const [weekKey, weekData] of Object.entries(weeks)) {
    if (!weekData || typeof weekData !== 'object') continue
    for (const [day, dayData] of Object.entries(weekData)) {
      if (!dayData || typeof dayData !== 'object') continue
      for (const [hour, hourData] of Object.entries(dayData)) {
        const prefix = `weeks.${weekKey}.${day}.${hour}`
        collectFromHour(hourData, prefix, out)
      }
    }
  }
  return out
}

function main() {
  console.log('=== verify-propers-pages ===')
  const srcTokens = buildSourceIndex(FULL_PDF)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}`)

  const corrections = { version: 1, generated: new Date().toISOString(), source: path.relative(ROOT, FULL_PDF), files: {} }
  const review = { version: 1, generated: corrections.generated, entries: [] }
  const statusCounts = { agree: 0, 'verified-correction': 0, 'manual-review': 0 }
  const perKind = {}

  for (const season of SEASONS) {
    const file = path.join(ROOT, `src/data/loth/propers/${season}.json`)
    const relFile = path.relative(ROOT, file)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const entries = collectFromSeason(data)

    for (const e of entries) {
      perKind[e.kind] = perKind[e.kind] || { agree: 0, changed: 0, review: 0 }
      if (typeof e.body !== 'string' || e.body.trim().length === 0) {
        statusCounts['manual-review']++
        perKind[e.kind].review++
        review.entries.push({ file: relFile, kind: e.kind, locator: e.locator, declared: e.declared, reason: 'empty-body' })
        continue
      }
      const match = lookupPage(e.body, srcTokens, firstTokenIndex, { safeAmbiguousMin: 15 })
      if (match === null) {
        statusCounts['manual-review']++
        perKind[e.kind].review++
        review.entries.push({ file: relFile, kind: e.kind, locator: e.locator, declared: e.declared, reason: 'no-fingerprint-match' })
        continue
      }
      if (match === e.declared) { statusCounts.agree++; perKind[e.kind].agree++; continue }
      if (Math.abs(match - e.declared) > WINDOW) {
        statusCounts['manual-review']++
        perKind[e.kind].review++
        review.entries.push({ file: relFile, kind: e.kind, locator: e.locator, declared: e.declared, matched: match, delta: match - e.declared, reason: 'out-of-window' })
        continue
      }
      statusCounts['verified-correction']++
      perKind[e.kind].changed++
      if (!corrections.files[relFile]) corrections.files[relFile] = []
      corrections.files[relFile].push({ kind: e.kind, locator: e.locator, from: e.declared, to: match, delta: match - e.declared, targetField: e.targetField })
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n')
  fs.writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2) + '\n')

  console.log('')
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k.padEnd(28)}: ${v}`)
  console.log('')
  console.log('--- Per-kind ---')
  for (const [k, v] of Object.entries(perKind)) console.log(`  ${k.padEnd(34)}: agree=${v.agree}  changed=${v.changed}  review=${v.review}`)
  console.log('')
  console.log(`corrections: ${path.relative(ROOT, OUT_CORRECTIONS)} (${statusCounts['verified-correction']} entries)`)
  console.log(`review     : ${path.relative(ROOT, OUT_REVIEW)} (${review.entries.length} entries)`)
}

main()
