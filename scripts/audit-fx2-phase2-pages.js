#!/usr/bin/env node
/**
 * F-X2 Phase 2 page-verification script (read-only audit helper).
 *
 * For each of the 11 keys × 15 occurrences flagged by the deeper audit
 * (`docs/handoff-fx2-psalmprayer-audit.md` §3.1), locate the corresponding
 * `Дууллыг төгсгөх залбирал` (psalm prayer) instance in `parsed_data/full_pdf.txt`
 * and print the printed page number it sits on. The audit-estimated pages
 * (occurrence_psalm_page + 1 or +2) are compared to the actual PDF pages so we
 * can land exact `psalmPrayerPage` overrides in week-N.json.
 *
 * Usage: node scripts/audit-fx2-phase2-pages.js
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const PDF_PATH = path.join(__dirname, '..', 'parsed_data', 'full_pdf.txt')
const PSALTER_TEXTS_PATH = path.join(
  __dirname,
  '..',
  'src',
  'data',
  'loth',
  'psalter-texts.json',
)

const targets = [
  { ref: 'Psalm 110:1-5, 7', week: 2, day: 'SUN', hour: 'vespers', expect: 186 },
  { ref: 'Psalm 110:1-5, 7', week: 3, day: 'SUN', hour: 'vespers', expect: 305 },
  { ref: 'Psalm 110:1-5, 7', week: 4, day: 'SUN', hour: 'vespers', expect: 416 },
  { ref: 'Psalm 119:145-152', week: 3, day: 'SAT', hour: 'lauds', expect: 392 },
  { ref: 'Psalm 51:3-19', week: 2, day: 'FRI', hour: 'lauds', expect: 264 },
  { ref: 'Psalm 51:3-19', week: 3, day: 'FRI', hour: 'lauds', expect: 376 },
  { ref: 'Psalm 51:3-19', week: 4, day: 'FRI', hour: 'lauds', expect: 489 },
  { ref: 'Psalm 100:1-5', week: 3, day: 'FRI', hour: 'lauds', expect: 380 },
  { ref: 'Psalm 118:1-16', week: 4, day: 'SUN', hour: 'lauds', expect: 406 },
  { ref: 'Psalm 150:1-6', week: 4, day: 'SUN', hour: 'lauds', expect: 412 },
  { ref: 'Psalm 67:2-8', week: 3, day: 'TUE', hour: 'lauds', expect: 334 },
  { ref: 'Psalm 8:2-10', week: 4, day: 'SAT', hour: 'lauds', expect: 509 },
  { ref: 'Psalm 135:1-12', week: 4, day: 'MON', hour: 'lauds', expect: 429 },
  { ref: 'Psalm 144:1-10', week: 4, day: 'THU', hour: 'vespers', expect: 482 },
  { ref: 'Psalm 147:12-20', week: 4, day: 'FRI', hour: 'lauds', expect: 493 },
]

// LOTH 4-week cycle page ranges (per audit §2)
const WEEK_RANGES = {
  1: [49, 165],
  2: [166, 286],
  3: [287, 397],
  4: [398, 511],
}

function psalmNumber(ref) {
  const m = /^Psalm\s+(\d+)/.exec(ref)
  return m ? Number(m[1]) : null
}

/**
 * Detect printed-page boundaries and assign a printed-page number to each line.
 *
 * Strategy:
 *   - Split the file by lines (\n) — gives 1-based line numbers matching `awk NR`.
 *   - A line containing exactly the form-feed character (\f) marks a new page.
 *   - The first standalone numeric line (1..600) AFTER the form feed is the
 *     printed page number.
 *   - All lines until the next form feed inherit that printed page.
 */
function buildLineToPageMap(text) {
  const lines = text.split('\n') // lines[i] = line number (i+1)
  const lineToPage = new Array(lines.length + 1).fill(null)
  let currentPage = null
  // Find the first page number from the start of file (line 1 onwards).
  // Scan: when we hit a form-feed line, we reset; until next plausible page
  // number is found.
  let i = 0
  let waitingForPage = true
  while (i < lines.length) {
    // NOTE: String.trim() also strips \f, so check raw line for form feed.
    if (lines[i].includes('\f')) {
      waitingForPage = true
      lineToPage[i + 1] = currentPage
      i++
      continue
    }
    const t = lines[i].trim()
    if (waitingForPage && /^\d+$/.test(t)) {
      const n = Number(t)
      if (n >= 1 && n <= 600) {
        currentPage = n
        waitingForPage = false
      }
    }
    lineToPage[i + 1] = currentPage
    i++
  }
  return lineToPage
}

function main() {
  const text = fs.readFileSync(PDF_PATH, 'utf8')
  const lines = text.split('\n')
  const lineToPage = buildLineToPageMap(text)

  const psalterTexts = JSON.parse(fs.readFileSync(PSALTER_TEXTS_PATH, 'utf8'))

  console.log('=== F-X2 Phase 2 page verification ===')
  console.log('Total lines:', lines.length)
  console.log()

  // Sanity check: line 9536 (W2-SAT-Lauds Psalm 92 prayer) should be page 280
  console.log('SANITY: line 9536 should be page 280; got:', lineToPage[9536])
  console.log('SANITY: line 17528 should be page 506; got:', lineToPage[17528])
  console.log()

  const PRAYER_HEADER = 'Дууллыг төгсгөх залбирал'
  const prayerHeaderLines = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === PRAYER_HEADER) prayerHeaderLines.push(i + 1)
  }
  console.log('Prayer header occurrences (total):', prayerHeaderLines.length)
  console.log()

  const dayMarkers = {
    SUN: ['Ням гараг'],
    MON: ['Даваа гараг'],
    TUE: ['Мягмар гараг'],
    WED: ['Лхагва гараг'],
    THU: ['Пүрэв гараг'],
    FRI: ['Баасан гараг'],
    SAT: ['Бямба гараг'],
  }

  // Normalize for fuzzy matching: strip leading/trailing curly quotes and punctuation,
  // collapse whitespace.
  const stripQuotes = (s) =>
    s
      .replace(/[“”«»"‘’']/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  console.log('# | ref | wk/day/hour | expected | found | match | prayer-text-match? | note')
  console.log('--|-----|-------------|----------|-------|-------|------|-----')

  let allMatch = true
  const results = []
  for (const t of targets) {
    const psalterEntry = psalterTexts[t.ref]
    if (!psalterEntry) {
      console.log(`! NO_CATALOG ${t.ref}`)
      continue
    }
    const prayerText = psalterEntry.psalmPrayer || ''
    const catalogProbe = stripQuotes(prayerText).slice(0, 25)
    const psNum = psalmNumber(t.ref)
    const [pageLo, pageHi] = WEEK_RANGES[t.week]

    // Two pass: first locate the occurrence regardless of prayer text match
    // (using week range + psalm label + day marker), then compare prayer text.
    const candidates = []
    for (const hLine of prayerHeaderLines) {
      const page = lineToPage[hLine]
      if (!page || page < pageLo || page > pageHi) continue

      // Find nearest preceding "Дуулал N" within 500 lines
      let psalmLabelLine = null
      let psalmLabelNum = null
      for (let k = hLine - 1; k >= Math.max(0, hLine - 500); k--) {
        const lt = lines[k - 1]
        const m = /^Дуулал\s+(\d+)/.exec(lt.trim())
        if (m) {
          psalmLabelLine = k
          psalmLabelNum = Number(m[1])
          break
        }
      }
      if (psalmLabelNum !== psNum) continue

      // Find nearest preceding day marker within 500 lines
      let dayMarkerLine = null
      const wantDay = dayMarkers[t.day]
      for (let k = (psalmLabelLine ?? hLine) - 1; k >= Math.max(0, hLine - 500); k--) {
        const lt = lines[k - 1]
        if (wantDay.some((mk) => lt.includes(mk))) {
          dayMarkerLine = k
          break
        }
      }
      if (!dayMarkerLine) continue

      // Capture actual prayer text (next 12 non-blank lines after header) and
      // compare to the catalog probe.
      const after = stripQuotes(lines.slice(hLine, hLine + 12).join(' '))
      const prayerMatches = after.includes(catalogProbe)
      const actualSnippet = stripQuotes(
        lines
          .slice(hLine, hLine + 8)
          .filter((ln) => ln.trim() && !ln.includes('\f'))
          .join(' '),
      ).slice(0, 60)

      candidates.push({ hLine, page, psalmLabelLine, dayMarkerLine, prayerMatches, actualSnippet })
    }

    const idx = targets.indexOf(t) + 1
    if (candidates.length === 0) {
      console.log(`${idx} | ${t.ref} | w${t.week}-${t.day}-${t.hour} | ${t.expect} | NO_MATCH | ✗ | — | no PDF candidate`)
      allMatch = false
      results.push({ ...t, found: null, ok: false })
      continue
    }
    if (candidates.length > 1) {
      console.log(`${idx} | ${t.ref} | w${t.week}-${t.day}-${t.hour} | ${t.expect} | ${candidates.map((c) => c.page).join(',')} | ? | — | multiple`)
      allMatch = false
      results.push({ ...t, found: candidates.map((c) => c.page), ok: false, ambiguous: true })
      continue
    }
    const c = candidates[0]
    const ok = c.page === t.expect
    if (!ok) allMatch = false
    console.log(
      `${idx} | ${t.ref} | w${t.week}-${t.day}-${t.hour} | ${t.expect} | ${c.page} | ${ok ? '✓' : '✗'} | ${c.prayerMatches ? '✓' : '✗ DIFFERS'} | header@${c.hLine} psalmLabel@${c.psalmLabelLine}${c.prayerMatches ? '' : ' actual="' + c.actualSnippet + '..."'}`,
    )
    results.push({ ...t, found: c.page, ok, prayerMatches: c.prayerMatches, actualSnippet: c.actualSnippet, headerLine: c.hLine })
  }

  console.log()
  console.log('Summary:', allMatch ? 'ALL_VERIFIED' : 'NEEDS_REVIEW')
  fs.writeFileSync(
    path.join(__dirname, 'out', 'fx2-phase2-page-verification.json'),
    JSON.stringify(results, null, 2),
    'utf8',
  )
  console.log('Wrote scripts/out/fx2-phase2-page-verification.json')
  process.exit(allMatch ? 0 : 1)
}

main()
