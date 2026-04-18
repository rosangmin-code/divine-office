#!/usr/bin/env node
/**
 * extract-psalm-prayer-pages.js
 *
 * Annotates src/data/loth/psalter-texts.json entries that have a
 * `psalmPrayer` field with a parallel `psalmPrayerPage` key matching the
 * first occurrence of the prayer text in parsed_data/full_pdf.txt.
 *
 * Add-only: never overwrites an existing psalmPrayerPage value. Conservative
 * safeAmbiguousMin=15 to avoid short-text false positives.
 */

const fs = require('fs')
const path = require('path')
const {
  buildSourceIndex,
  buildFirstTokenIndex,
  lookupPage,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'parsed_data/full_pdf.txt')
const TARGET = path.join(ROOT, 'src/data/loth/psalter-texts.json')

function main() {
  console.log('Indexing source:', path.relative(ROOT, SOURCE))
  const tokens = buildSourceIndex(SOURCE)
  const fti = buildFirstTokenIndex(tokens)
  console.log(`  ${tokens.length.toLocaleString()} tokens, ${fti.size.toLocaleString()} unique`)

  const data = JSON.parse(fs.readFileSync(TARGET, 'utf8'))
  let added = 0, unchanged = 0, missed = 0
  const missedRefs = []

  for (const [ref, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.psalmPrayer !== 'string' || !entry.psalmPrayer.trim()) continue

    if (typeof entry.psalmPrayerPage === 'number') {
      unchanged++
      continue
    }

    const page = lookupPage(entry.psalmPrayer, tokens, fti, { safeAmbiguousMin: 15 })
    if (page !== null) {
      entry.psalmPrayerPage = page
      added++
    } else {
      missed++
      missedRefs.push(ref)
    }
  }

  fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n', 'utf8')

  const total = added + unchanged + missed
  console.log(`\n[ok] ${path.relative(ROOT, TARGET)}`)
  console.log(`  added: ${added}, unchanged: ${unchanged}, missed: ${missed} / ${total}`)
  if (missedRefs.length > 0) {
    console.log(`  missed refs: ${missedRefs.join(', ')}`)
  }
}

main()
