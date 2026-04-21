#!/usr/bin/env node
/**
 * verify-compline-pages.js
 *
 * Validates `page` values on src/data/loth/ordinarium/compline.json against
 * parsed_data/full_pdf.txt.
 *
 * Compline has a mixed schema: per-day psalms / shortReading / concludingPrayer,
 * plus common examen / responsory / nuncDimittis / blessing / anteMarian.
 * All have long-enough body text to use body-only fingerprint with
 * safeAmbiguousMin:15.
 *
 * Read-only. Emits:
 *   scripts/out/compline-page-corrections.json
 *   scripts/out/compline-page-review.json
 */

const fs = require('fs')
const path = require('path')
const { buildSourceIndex, buildFirstTokenIndex, lookupPage } = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const TARGET = path.join(ROOT, 'src/data/loth/ordinarium/compline.json')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'compline-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'compline-page-review.json')

const WINDOW = 1

/**
 * Collect (locator, body, declared) tuples from compline.json.
 */
function collect(data) {
  const out = []
  function add(locator, body, declared) {
    if (typeof declared !== 'number') return
    out.push({ locator, body, declared })
  }
  // examen
  add('examen', data.examen?.text, data.examen?.page)
  // per-day
  for (const [day, dayData] of Object.entries(data.days || {})) {
    // psalms (reuse title + default_antiphon like psalter)
    const psalms = dayData.psalms || []
    for (let i = 0; i < psalms.length; i++) {
      const p = psalms[i]
      const body = `${p.title || ''} ${p.default_antiphon || ''}`.trim()
      add(`days.${day}.psalms[${i}]`, body, p.page)
    }
    // shortReading
    add(`days.${day}.shortReading`, dayData.shortReading?.text, dayData.shortReading?.page)
    // concludingPrayer (object with primary, page)
    add(`days.${day}.concludingPrayer`, dayData.concludingPrayer?.primary, dayData.concludingPrayer?.page)
  }
  // common responsory
  const r = data.responsory
  if (r) add('responsory', `${r.versicle || ''} ${r.response || ''}`.trim(), r.page)
  // nuncDimittis
  const n = data.nuncDimittis
  if (n) add('nuncDimittis', n.antiphon, n.page)
  // blessing
  const b = data.blessing
  if (b) add('blessing', b.text, b.page)
  // anteMarian
  const am = data.anteMarian
  if (am?.salveRegina) add('anteMarian.salveRegina', am.salveRegina.text, am.salveRegina.page)
  if (Array.isArray(am?.alternatives)) {
    am.alternatives.forEach((alt, i) => {
      add(`anteMarian.alternatives[${i}]`, alt.text, alt.page)
    })
  }
  return out
}

function main() {
  console.log('=== verify-compline-pages ===')
  console.log(`source: ${path.relative(ROOT, FULL_PDF)}`)
  const srcTokens = buildSourceIndex(FULL_PDF)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}`)

  const data = JSON.parse(fs.readFileSync(TARGET, 'utf8'))
  const entries = collect(data)
  const relFile = path.relative(ROOT, TARGET)

  const corrections = { version: 1, generated: new Date().toISOString(), source: path.relative(ROOT, FULL_PDF), files: {} }
  const review = { version: 1, generated: corrections.generated, entries: [] }
  const statusCounts = { agree: 0, 'verified-correction': 0, 'manual-review': 0 }

  for (const { locator, body, declared } of entries) {
    if (typeof body !== 'string' || body.trim().length === 0) {
      statusCounts['manual-review']++
      review.entries.push({ file: relFile, locator, declared, reason: 'empty-body' })
      continue
    }
    const match = lookupPage(body, srcTokens, firstTokenIndex, { safeAmbiguousMin: 15 })
    if (match === null) {
      statusCounts['manual-review']++
      review.entries.push({ file: relFile, locator, declared, reason: 'no-fingerprint-match' })
      continue
    }
    if (match === declared) { statusCounts.agree++; continue }
    if (Math.abs(match - declared) > WINDOW) {
      statusCounts['manual-review']++
      review.entries.push({ file: relFile, locator, declared, matched: match, delta: match - declared, reason: 'out-of-window' })
      continue
    }
    statusCounts['verified-correction']++
    if (!corrections.files[relFile]) corrections.files[relFile] = []
    corrections.files[relFile].push({ locator, from: declared, to: match, delta: match - declared })
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n')
  fs.writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2) + '\n')

  console.log('')
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k.padEnd(28)}: ${v}`)
  console.log('')
  console.log(`corrections: ${path.relative(ROOT, OUT_CORRECTIONS)} (${statusCounts['verified-correction']} entries)`)
  console.log(`review     : ${path.relative(ROOT, OUT_REVIEW)} (${review.entries.length} entries)`)
}

main()
