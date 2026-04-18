#!/usr/bin/env node
/**
 * extract-psalter-pages.js
 *
 * Annotates src/data/loth/psalter/week-{1,2,3,4}.json with PDF page numbers.
 *
 * IMPORTANT — ADD-ONLY:
 *   The source week{N}_*.txt files have IRREGULAR page markers (PDF
 *   extraction occasionally drops the page header at a column break),
 *   yielding off-by-one or worse mismatches for ~10% of entries. Existing
 *   page values were hand-verified against parsed_data/week3/page-mapping.json
 *   and are authoritative — we MUST NOT overwrite them.
 *
 * What we add safely:
 *   - intercessionsPage: parallel key on hours that have intercessions[]
 *     but no existing intercessionsPage. Match by first intercession line
 *     fingerprint (≥ 15 tokens to be conservative).
 *   - For week 3, page-mapping.json is consulted FIRST (canonical source)
 *     for psalms/shortReading/responsory/intercessions when the JSON entry
 *     lacks a page.
 *
 * What we deliberately skip:
 *   - concludingPrayerPage from psalter sources — fingerprint match yields
 *     too many off-by-one false positives. Future work: hand-annotate or
 *     re-extract source PDF with cleaner page markers.
 */

const fs = require('fs')
const path = require('path')
const {
  buildSourceIndex,
  buildFirstTokenIndex,
  lookupPage,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')

// Single canonical source: scripts/reextract-pdf-pages.sh splits each PDF
// page into LEFT/RIGHT halves and writes clean printed-page markers.
// Falls back to the per-week files if the unified source is missing.
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')

function sourceFor(week) {
  if (fs.existsSync(FULL_PDF)) return FULL_PDF
  const full = path.join(ROOT, `parsed_data/week${week}/week${week}_full.txt`)
  if (fs.existsSync(full)) return full
  const fin = path.join(ROOT, `parsed_data/week${week}/week${week}_final.txt`)
  if (fs.existsSync(fin)) return fin
  throw new Error(`No source text for week ${week}`)
}

function targetFor(week) {
  return path.join(ROOT, `src/data/loth/psalter/week-${week}.json`)
}

function annotateHour(hourData, tokens, firstTokenIndex, stats, mapping) {
  // psalms — fill missing only, prefer mapping over fingerprint.
  if (Array.isArray(hourData.psalms)) {
    for (const p of hourData.psalms) {
      if (p.page !== undefined) {
        stats.psalm.unchanged++
        continue
      }
      // Try mapping by ref first
      let page = null
      if (mapping?.psalms && typeof p.ref === 'string') {
        const m = mapping.psalms.find(mp => mp.ref === p.ref)
        if (m && typeof m.page === 'number') page = m.page
      }
      // Fallback fingerprint with HIGH confidence (≥ 15 tokens)
      if (page === null) {
        const tries = []
        if (p.title && p.default_antiphon) tries.push(`${p.title} ${p.default_antiphon}`)
        for (const t of tries) {
          page = lookupPage(t, tokens, firstTokenIndex, { safeAmbiguousMin: 15 })
          if (page !== null) break
        }
      }
      if (page !== null) {
        p.page = page
        stats.psalm.added++
      } else {
        stats.psalm.missed++
      }
    }
  }

  // shortReading — fill missing only.
  if (hourData.shortReading && typeof hourData.shortReading === 'object') {
    const sr = hourData.shortReading
    if (sr.page !== undefined) {
      stats.shortReading.unchanged++
    } else {
      let page = null
      if (mapping?.shortReading?.page) page = mapping.shortReading.page
      if (page === null) {
        const cand = (typeof sr.text === 'string' && sr.text.trim()) ? sr.text : sr.ref
        if (typeof cand === 'string' && cand.trim()) {
          page = lookupPage(cand, tokens, firstTokenIndex, { safeAmbiguousMin: 15 })
        }
      }
      if (page !== null) { sr.page = page; stats.shortReading.added++ }
      else stats.shortReading.missed++
    }
  }

  // responsory — fill missing only.
  if (hourData.responsory && typeof hourData.responsory === 'object') {
    const r = hourData.responsory
    if (r.page !== undefined) {
      stats.responsory.unchanged++
    } else {
      let page = null
      if (mapping?.responsory?.page) page = mapping.responsory.page
      if (page === null) {
        const v = typeof r.versicle === 'string' ? r.versicle.trim() : ''
        const resp = typeof r.response === 'string' ? r.response.trim() : ''
        const tries = []
        if (v && resp) tries.push(`${v} ${resp}`)
        for (const t of tries) {
          page = lookupPage(t, tokens, firstTokenIndex, { safeAmbiguousMin: 15 })
          if (page !== null) break
        }
      }
      if (page !== null) { r.page = page; stats.responsory.added++ }
      else stats.responsory.missed++
    }
  }

  // intercessionsPage — parallel key, never overwrite.
  if (Array.isArray(hourData.intercessions) && hourData.intercessions.length > 0) {
    if (hourData.intercessionsPage !== undefined) {
      stats.intercessions.unchanged++
    } else {
      let page = null
      if (mapping?.intercessions?.page) page = mapping.intercessions.page
      if (page === null) {
        const first = hourData.intercessions[0]
        if (typeof first === 'string') {
          page = lookupPage(first, tokens, firstTokenIndex, { safeAmbiguousMin: 15 })
        }
      }
      if (page !== null) { hourData.intercessionsPage = page; stats.intercessions.added++ }
      else stats.intercessions.missed++
    }
  }

  // concludingPrayerPage — parallel key, never overwrite. With the
  // re-extracted full_pdf.txt, fingerprint matches are reliable enough to
  // enable for psalter (FR-017e). Conservative ≥15-token threshold.
  if (typeof hourData.concludingPrayer === 'string' && hourData.concludingPrayer.trim()) {
    if (hourData.concludingPrayerPage !== undefined) {
      stats.concludingPrayer = stats.concludingPrayer || { added: 0, unchanged: 0, missed: 0 }
      stats.concludingPrayer.unchanged++
    } else {
      stats.concludingPrayer = stats.concludingPrayer || { added: 0, unchanged: 0, missed: 0 }
      const page = lookupPage(hourData.concludingPrayer, tokens, firstTokenIndex, { safeAmbiguousMin: 15 })
      if (page !== null) { hourData.concludingPrayerPage = page; stats.concludingPrayer.added++ }
      else stats.concludingPrayer.missed++
    }
  }
}

function loadMapping(week) {
  // Only week 3 has a page-mapping.json today.
  const fp = path.join(ROOT, `parsed_data/week${week}/page-mapping.json`)
  if (!fs.existsSync(fp)) return null
  return JSON.parse(fs.readFileSync(fp, 'utf8'))
}

function mappingForHour(mapping, day, hour) {
  if (!mapping?.[day]) return null
  // page-mapping uses `vespersI` for Sunday's First Vespers; we don't
  // have that distinction in psalter JSON (the Sunday vespers entry IS
  // First Vespers in current data). Match `vespers` to either.
  if (hour === 'vespers' && mapping[day].vespers) return mapping[day].vespers
  if (hour === 'vespers' && mapping[day].vespersI) return mapping[day].vespersI
  return mapping[day][hour] || null
}

function annotateWeek(week) {
  const src = sourceFor(week)
  const tgt = targetFor(week)
  console.log(`\n=== week ${week} ===`)
  console.log(`  source: ${path.relative(ROOT, src)}`)
  console.log(`  target: ${path.relative(ROOT, tgt)}`)

  const tokens = buildSourceIndex(src)
  const firstTokenIndex = buildFirstTokenIndex(tokens)
  console.log(`  ${tokens.length.toLocaleString()} tokens, ${firstTokenIndex.size.toLocaleString()} unique`)

  const data = JSON.parse(fs.readFileSync(tgt, 'utf8'))
  const mapping = loadMapping(week)
  if (mapping) console.log(`  using page-mapping.json for week ${week}`)

  const stats = {
    psalm: { added: 0, unchanged: 0, missed: 0 },
    shortReading: { added: 0, unchanged: 0, missed: 0 },
    responsory: { added: 0, unchanged: 0, missed: 0 },
    intercessions: { added: 0, unchanged: 0, missed: 0 },
    concludingPrayer: { added: 0, unchanged: 0, missed: 0 },
  }

  for (const [day, dayData] of Object.entries(data.days)) {
    for (const [hour, hourData] of Object.entries(dayData)) {
      if (!hourData || typeof hourData !== 'object') continue
      const hourMapping = mapping ? mappingForHour(mapping, day, hour) : null
      annotateHour(hourData, tokens, firstTokenIndex, stats, hourMapping)
    }
  }

  const out = JSON.stringify(data, null, 2) + '\n'
  JSON.parse(out)
  fs.writeFileSync(tgt, out, 'utf8')

  for (const [k, s] of Object.entries(stats)) {
    const sum = s.added + s.unchanged + s.missed
    if (sum === 0) continue
    console.log(`  ${k.padEnd(18)} added: ${s.added}, unchanged: ${s.unchanged}, missed: ${s.missed}`)
  }
}

function main() {
  for (const w of [1, 2, 3, 4]) {
    annotateWeek(w)
  }
}

main()
