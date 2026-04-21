#!/usr/bin/env node
/**
 * verify-sanctoral-pages.js
 *
 * Validates `page` values in src/data/loth/sanctoral/*.json against
 * parsed_data/full_pdf.txt. Same body-fingerprint rule as verify-propers-pages.
 *
 * Sanctoral entries live at `<date>.<hour>.<field>` (no weeks layer).
 *
 * Read-only. Emits:
 *   scripts/out/sanctoral-page-corrections.json
 *   scripts/out/sanctoral-page-review.json
 */

const fs = require('fs')
const path = require('path')
const { buildSourceIndex, buildFirstTokenIndex, lookupPage } = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'sanctoral-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'sanctoral-page-review.json')

const FILES = ['solemnities', 'feasts', 'memorials', 'optional-memorials']
const WINDOW = 1

function collectFromHour(hourData, prefix, out) {
  if (!hourData || typeof hourData !== 'object') return
  if (hourData.shortReading && typeof hourData.shortReading === 'object' && typeof hourData.shortReading.page === 'number') {
    out.push({ kind: 'shortReading', locator: `${prefix}.shortReading`, body: hourData.shortReading.text, declared: hourData.shortReading.page, targetField: 'page' })
  }
  if (hourData.responsory && typeof hourData.responsory === 'object' && typeof hourData.responsory.page === 'number') {
    out.push({ kind: 'responsory', locator: `${prefix}.responsory`, body: `${hourData.responsory.versicle || ''} ${hourData.responsory.response || ''}`.trim(), declared: hourData.responsory.page, targetField: 'page' })
  }
  if (typeof hourData.gospelCanticleAntiphonPage === 'number' && typeof hourData.gospelCanticleAntiphon === 'string') {
    out.push({ kind: 'gospelCanticleAntiphonPage', locator: `${prefix}.gospelCanticleAntiphonPage`, body: hourData.gospelCanticleAntiphon, declared: hourData.gospelCanticleAntiphonPage, targetField: null })
  }
  if (typeof hourData.intercessionsPage === 'number' && Array.isArray(hourData.intercessions) && hourData.intercessions.length > 0) {
    out.push({ kind: 'intercessionsPage', locator: `${prefix}.intercessionsPage`, body: hourData.intercessions[0], declared: hourData.intercessionsPage, targetField: null })
  }
  if (typeof hourData.concludingPrayerPage === 'number' && typeof hourData.concludingPrayer === 'string') {
    out.push({ kind: 'concludingPrayerPage', locator: `${prefix}.concludingPrayerPage`, body: hourData.concludingPrayer, declared: hourData.concludingPrayerPage, targetField: null })
  }
  if (typeof hourData.alternativeConcludingPrayerPage === 'number' && typeof hourData.alternativeConcludingPrayer === 'string') {
    out.push({ kind: 'alternativeConcludingPrayerPage', locator: `${prefix}.alternativeConcludingPrayerPage`, body: hourData.alternativeConcludingPrayer, declared: hourData.alternativeConcludingPrayerPage, targetField: null })
  }
}

function collect(data) {
  const out = []
  for (const [date, dateData] of Object.entries(data)) {
    if (!dateData || typeof dateData !== 'object') continue
    for (const [hour, hourData] of Object.entries(dateData)) {
      // skip non-hour keys like "name", "rank"
      if (hour === 'name' || hour === 'rank') continue
      if (!hourData || typeof hourData !== 'object') continue
      collectFromHour(hourData, `${date}.${hour}`, out)
    }
  }
  return out
}

function main() {
  console.log('=== verify-sanctoral-pages ===')
  const srcTokens = buildSourceIndex(FULL_PDF)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}`)

  const corrections = { version: 1, generated: new Date().toISOString(), source: path.relative(ROOT, FULL_PDF), files: {} }
  const review = { version: 1, generated: corrections.generated, entries: [] }
  const statusCounts = { agree: 0, 'verified-correction': 0, 'manual-review': 0 }
  const perKind = {}

  for (const bucket of FILES) {
    const file = path.join(ROOT, `src/data/loth/sanctoral/${bucket}.json`)
    const relFile = path.relative(ROOT, file)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const entries = collect(data)

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
