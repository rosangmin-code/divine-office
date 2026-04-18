#!/usr/bin/env node
/**
 * audit-page-coverage.js
 *
 * Walks every data JSON under src/data/loth and reports per-section page
 * coverage. Exits non-zero if any category falls below its configured
 * threshold — used as a CI gate.
 *
 * Coverage definition: an entry "could have a page" if it is structurally a
 * leaf prayer/reading/responsory/etc. with the appropriate text fields.
 * Coverage = entries-with-page / entries-could-have-page.
 *
 * Pages do not have to be present — they're optional. The thresholds reflect
 * realistic targets given current source-data quality.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const THRESHOLDS = {
  hymns:                    { min: 0.95 },
  psalterPsalms:            { min: 0.30 },  // Office of Readings + minor hours uncovered
  psalterShortReading:      { min: 0.95 },
  psalterResponsory:        { min: 0.95 },
  psalterIntercessions:     { min: 0.95 },
  psalterConcludingPrayer:  { min: 0.95 },
  propersConcludingPrayer:  { min: 0.99 },
  propersGospelCanticleAnt: { min: 0.95 },
  propersIntercessions:     { min: 0.95 },
  propersShortReading:      { min: 0.95 },
  propersResponsory:        { min: 0.85 },
  sanctoralConcludingPrayer:{ min: 0.85 },  // optional-memorials saint-specific propers aren't in source PDF
  sanctoralGospelCanticleAnt:{ min: 0.80 },
}

function pct(have, total) {
  if (total === 0) return 1
  return have / total
}

function fmt(have, total) {
  return `${have}/${total} (${(pct(have, total) * 100).toFixed(1)}%)`
}

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

function auditHymns() {
  const data = read('src/data/loth/ordinarium/hymns.json')
  let total = 0, have = 0
  for (const entry of Object.values(data)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.text !== 'string' || !entry.text.trim()) continue
    total++
    if (typeof entry.page === 'number') have++
  }
  return { total, have }
}

function auditPsalter() {
  const result = {
    psalterPsalms: { total: 0, have: 0 },
    psalterShortReading: { total: 0, have: 0 },
    psalterResponsory: { total: 0, have: 0 },
    psalterIntercessions: { total: 0, have: 0 },
    psalterConcludingPrayer: { total: 0, have: 0 },
  }
  for (const w of [1, 2, 3, 4]) {
    const data = read(`src/data/loth/psalter/week-${w}.json`)
    for (const dayData of Object.values(data.days)) {
      for (const hourData of Object.values(dayData)) {
        if (!hourData || typeof hourData !== 'object') continue
        if (Array.isArray(hourData.psalms)) {
          for (const p of hourData.psalms) {
            result.psalterPsalms.total++
            if (typeof p.page === 'number') result.psalterPsalms.have++
          }
        }
        if (hourData.shortReading?.text) {
          result.psalterShortReading.total++
          if (typeof hourData.shortReading.page === 'number') result.psalterShortReading.have++
        }
        if (hourData.responsory?.versicle) {
          result.psalterResponsory.total++
          if (typeof hourData.responsory.page === 'number') result.psalterResponsory.have++
        }
        if (Array.isArray(hourData.intercessions) && hourData.intercessions.length > 0) {
          result.psalterIntercessions.total++
          if (typeof hourData.intercessionsPage === 'number') result.psalterIntercessions.have++
        }
        if (typeof hourData.concludingPrayer === 'string' && hourData.concludingPrayer.trim()) {
          result.psalterConcludingPrayer.total++
          if (typeof hourData.concludingPrayerPage === 'number') result.psalterConcludingPrayer.have++
        }
      }
    }
  }
  return result
}

function auditPropers() {
  const result = {
    propersConcludingPrayer: { total: 0, have: 0 },
    propersGospelCanticleAnt: { total: 0, have: 0 },
    propersIntercessions: { total: 0, have: 0 },
    propersShortReading: { total: 0, have: 0 },
    propersResponsory: { total: 0, have: 0 },
  }
  for (const f of ['advent', 'christmas', 'easter', 'lent', 'ordinary-time']) {
    const data = read(`src/data/loth/propers/${f}.json`)
    walk(data, result, false)
  }
  return result
}

function auditSanctoral() {
  const result = {
    sanctoralConcludingPrayer: { total: 0, have: 0 },
    sanctoralGospelCanticleAnt: { total: 0, have: 0 },
  }
  for (const f of ['feasts', 'memorials', 'optional-memorials', 'solemnities']) {
    const data = read(`src/data/loth/sanctoral/${f}.json`)
    walkSanctoral(data, result)
  }
  return result
}

function walk(node, result, isSanctoral) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, result, isSanctoral)
    return
  }
  if (!node || typeof node !== 'object') return

  const cpKey = isSanctoral ? 'sanctoralConcludingPrayer' : 'propersConcludingPrayer'
  const gcaKey = isSanctoral ? 'sanctoralGospelCanticleAnt' : 'propersGospelCanticleAnt'

  if (typeof node.concludingPrayer === 'string' && node.concludingPrayer.trim()) {
    result[cpKey].total++
    if (typeof node.concludingPrayerPage === 'number') result[cpKey].have++
  }
  if (typeof node.gospelCanticleAntiphon === 'string' && node.gospelCanticleAntiphon.trim()) {
    result[gcaKey].total++
    if (typeof node.gospelCanticleAntiphonPage === 'number') result[gcaKey].have++
  }
  if (!isSanctoral) {
    if (Array.isArray(node.intercessions) && node.intercessions.length > 0) {
      result.propersIntercessions.total++
      if (typeof node.intercessionsPage === 'number') result.propersIntercessions.have++
    }
    if (node.shortReading?.text || node.shortReading?.ref) {
      result.propersShortReading.total++
      if (typeof node.shortReading.page === 'number') result.propersShortReading.have++
    }
    if (node.responsory?.versicle) {
      result.propersResponsory.total++
      if (typeof node.responsory.page === 'number') result.propersResponsory.have++
    }
  }

  for (const v of Object.values(node)) walk(v, result, isSanctoral)
}

function walkSanctoral(node, result) {
  walk(node, result, true)
}

function main() {
  const sections = {
    hymns: auditHymns(),
    ...auditPsalter(),
    ...auditPropers(),
    ...auditSanctoral(),
  }

  console.log('=== PDF page coverage audit ===\n')
  let fail = 0
  for (const [key, value] of Object.entries(sections)) {
    const t = THRESHOLDS[key]
    const ratio = pct(value.have, value.total)
    const status = t && ratio < t.min ? 'FAIL' : 'OK'
    if (status === 'FAIL') fail++
    const minStr = t ? ` (min ${(t.min * 100).toFixed(0)}%)` : ''
    console.log(`  ${status.padEnd(4)} ${key.padEnd(28)} ${fmt(value.have, value.total)}${minStr}`)
  }
  console.log()
  if (fail > 0) {
    console.log(`FAIL: ${fail} categor${fail > 1 ? 'ies' : 'y'} below threshold.`)
    process.exit(1)
  }
  console.log('All thresholds met.')
}

main()
