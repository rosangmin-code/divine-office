#!/usr/bin/env node
/**
 * Task #40 Stage 4 — replace Part II body for Psalm 136:10-26 and
 * Psalm 144:11-15 in psalter-texts.json. The existing entries have
 * Part I body (Roman "I" marker + verses 1-N) stored under the Part II
 * key — this is a pre-existing extractor bug. Replace with the actual
 * Part II body extracted from parsed_data/full_pdf.txt.
 *
 * Also adds psalmPrayer + psalmPrayerPage for both entries (currently
 * missing from JSON despite being present in PDF).
 *
 * PDF source coordinates (1-indexed awk NR → JS lines[NR-1]):
 *
 * Psalm 136:10-26 Part II:
 *   - Lines 14999-15026: verses 10-17 (on book page 434)
 *   - Lines 15034-15052: verses 18-26 (on book page 435)
 *   - Lines 15055-15060: psalmPrayer (book page 435)
 *
 * Psalm 144:11-15 Part II:
 *   - Lines 16671-16677: verses 9-11 (on book page 481)
 *   - Lines 16685-16702: verses 12-15 (on book page 482)
 *   - Lines 16705-16712: psalmPrayer (book page 482)
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PDF = path.join(ROOT, 'parsed_data', 'full_pdf.txt')
const PT_PATH = path.join(ROOT, 'src', 'data', 'loth', 'psalter-texts.json')

function readLines(start, end) {
  const lines = fs.readFileSync(PDF, 'utf8').split(/\r?\n/)
  // Convert 1-indexed awk NR → 0-indexed JS array.
  return lines.slice(start - 1, end).map(l => l.replace(/\s+$/, ''))
}

function flatten(lines) {
  // Return lines as-is, stripped trailing whitespace, preserving
  // leading indentation (some stanza lines have indent spaces).
  return lines.filter(l => l.trim().length > 0)
}

function joinProse(lines) {
  // For psalmPrayer: collapse multi-line prose into single paragraph
  // (match how existing entries store prayer as single string).
  return lines.map(l => l.trim()).filter(l => l.length > 0).join(' ').replace(/\s+/g, ' ').trim()
}

// Psalm 136:10-26 Part II
const ps136 = {
  stanzas: [
    // Book page 434 (Part II header "II" at 14998, body 14999-15026)
    // Skip the "II" marker line — we don't emit Roman-numeral markers
    // into stanza[0][0] (existing entries don't have them either —
    // the "I" in the old broken data was a bug).
    flatten(readLines(14999, 15026)),
    // Book page 435 (body continues 15034-15052)
    flatten(readLines(15034, 15052)),
  ],
  psalmPrayer: joinProse(readLines(15055, 15060)),
  psalmPrayerPage: 435,
}

// Psalm 144:11-15 Part II
const ps144 = {
  stanzas: [
    // Book page 481 (Part II header "II" at 16670, body 16671-16677)
    flatten(readLines(16671, 16677)),
    // Book page 482 (body continues 16685-16702)
    flatten(readLines(16685, 16702)),
  ],
  psalmPrayer: joinProse(readLines(16705, 16712)),
  psalmPrayerPage: 482,
}

function main() {
  const pt = JSON.parse(fs.readFileSync(PT_PATH, 'utf8'))

  // Preserve all non-stanza/prayer fields (future-safe).
  const e136 = pt['Psalm 136:10-26']
  const e144 = pt['Psalm 144:11-15']

  console.log('=== Psalm 136:10-26 Part II reconstruction ===')
  console.log('OLD stanzas:', e136.stanzas.length, 'lines:', e136.stanzas.reduce((s, st) => s + st.length, 0))
  console.log('NEW stanzas:', ps136.stanzas.length, 'lines:', ps136.stanzas.reduce((s, st) => s + st.length, 0))
  console.log('NEW first line:', ps136.stanzas[0][0])
  console.log('NEW last line:', ps136.stanzas[ps136.stanzas.length - 1].slice(-1)[0])
  console.log('NEW psalmPrayer head:', ps136.psalmPrayer.slice(0, 80))
  console.log('NEW psalmPrayerPage:', ps136.psalmPrayerPage)
  pt['Psalm 136:10-26'] = {
    ...e136,
    stanzas: ps136.stanzas,
    psalmPrayer: ps136.psalmPrayer,
    psalmPrayerPage: ps136.psalmPrayerPage,
  }

  console.log('\n=== Psalm 144:11-15 Part II reconstruction ===')
  console.log('OLD stanzas:', e144.stanzas.length, 'lines:', e144.stanzas.reduce((s, st) => s + st.length, 0))
  console.log('NEW stanzas:', ps144.stanzas.length, 'lines:', ps144.stanzas.reduce((s, st) => s + st.length, 0))
  console.log('NEW first line:', ps144.stanzas[0][0])
  console.log('NEW last line:', ps144.stanzas[ps144.stanzas.length - 1].slice(-1)[0])
  console.log('NEW psalmPrayer head:', ps144.psalmPrayer.slice(0, 80))
  console.log('NEW psalmPrayerPage:', ps144.psalmPrayerPage)
  pt['Psalm 144:11-15'] = {
    ...e144,
    stanzas: ps144.stanzas,
    psalmPrayer: ps144.psalmPrayer,
    psalmPrayerPage: ps144.psalmPrayerPage,
  }

  fs.writeFileSync(PT_PATH, JSON.stringify(pt, null, 2) + '\n', 'utf8')
  console.log('\nWrote', PT_PATH)
}

main()
