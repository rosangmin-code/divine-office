import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Data-level regression: assert that PDF page coverage stays within
 * configured thresholds. Mirrors scripts/audit-page-coverage.js but runs
 * inside vitest so npm test catches data drift in CI.
 *
 * Thresholds reflect the current achievable coverage given source-PDF
 * extraction quality. Raise them as source data improves; never lower
 * silently — a regression in coverage means data was lost.
 */

const ROOT = path.resolve(__dirname, '../../../..')

function read(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

interface CoverEntry { have: number; total: number }
type Cover = Record<string, CoverEntry>

function bump(cov: Cover, key: string, hasPage: boolean) {
  if (!cov[key]) cov[key] = { have: 0, total: 0 }
  cov[key].total++
  if (hasPage) cov[key].have++
}

function walkPropers(node: unknown, cov: Cover) {
  if (Array.isArray(node)) {
    for (const item of node) walkPropers(item, cov)
    return
  }
  if (!node || typeof node !== 'object') return
  const n = node as Record<string, unknown>
  if (typeof n.concludingPrayer === 'string' && (n.concludingPrayer as string).trim()) {
    bump(cov, 'propersConcludingPrayer', typeof n.concludingPrayerPage === 'number')
  }
  if (typeof n.gospelCanticleAntiphon === 'string' && (n.gospelCanticleAntiphon as string).trim()) {
    bump(cov, 'propersGospelCanticleAnt', typeof n.gospelCanticleAntiphonPage === 'number')
  }
  if (Array.isArray(n.intercessions) && (n.intercessions as unknown[]).length > 0) {
    bump(cov, 'propersIntercessions', typeof n.intercessionsPage === 'number')
  }
  const sr = n.shortReading as Record<string, unknown> | undefined
  if (sr && (sr.text || sr.ref)) {
    bump(cov, 'propersShortReading', typeof sr.page === 'number')
  }
  const r = n.responsory as Record<string, unknown> | undefined
  if (r && (r.fullResponse || r.versicle)) {
    bump(cov, 'propersResponsory', typeof r.page === 'number')
  }
  // FR-156 Phase 2: First Vespers data is injected without page
  // annotations in Phase 2 (page extraction deferred to a follow-up).
  // Skip the `firstVespers` subtree so its pageless entries don't drag
  // the propersX thresholds below the existing (regular-hours) baseline.
  for (const [k, v] of Object.entries(n)) {
    if (k === 'firstVespers') continue
    walkPropers(v, cov)
  }
}

function collect(): Cover {
  const cov: Cover = {}

  // Hymns (only count entries with non-empty body)
  const hymns = read('src/data/loth/ordinarium/hymns.json')
  for (const entry of Object.values(hymns) as Array<{ text?: string; page?: number }>) {
    if (typeof entry?.text === 'string' && entry.text.trim()) {
      bump(cov, 'hymns', typeof entry.page === 'number')
    }
  }

  // Psalter
  for (const w of [1, 2, 3, 4]) {
    const data = read(`src/data/loth/psalter/week-${w}.json`)
    for (const dayData of Object.values(data.days) as Array<Record<string, unknown>>) {
      for (const hourDataRaw of Object.values(dayData)) {
        const hourData = hourDataRaw as Record<string, unknown>
        if (!hourData || typeof hourData !== 'object') continue
        if (Array.isArray(hourData.psalms)) {
          for (const p of hourData.psalms as Array<{ page?: number }>) {
            bump(cov, 'psalterPsalms', typeof p.page === 'number')
          }
        }
        const sr = hourData.shortReading as { text?: string; page?: number } | undefined
        if (sr?.text) bump(cov, 'psalterShortReading', typeof sr.page === 'number')
        const r = hourData.responsory as { fullResponse?: string; versicle?: string; page?: number } | undefined
        if (r?.fullResponse || r?.versicle) bump(cov, 'psalterResponsory', typeof r?.page === 'number')
        if (Array.isArray(hourData.intercessions) && (hourData.intercessions as unknown[]).length > 0) {
          bump(cov, 'psalterIntercessions', typeof hourData.intercessionsPage === 'number')
        }
        if (typeof hourData.concludingPrayer === 'string' && (hourData.concludingPrayer as string).trim()) {
          bump(cov, 'psalterConcludingPrayer', typeof hourData.concludingPrayerPage === 'number')
        }
      }
    }
  }

  // Propers
  for (const f of ['advent', 'christmas', 'easter', 'lent', 'ordinary-time']) {
    walkPropers(read(`src/data/loth/propers/${f}.json`), cov)
  }

  // Sanctoral (separate keys)
  const sanctoralCov: Cover = {}
  for (const f of ['feasts', 'memorials', 'optional-memorials', 'solemnities']) {
    walkPropers(read(`src/data/loth/sanctoral/${f}.json`), sanctoralCov)
  }
  // Translate propers* keys to sanctoral* keys for separate thresholding
  for (const [k, v] of Object.entries(sanctoralCov)) {
    cov[k.replace('propers', 'sanctoral')] = v
  }

  return cov
}

const THRESHOLDS: Record<string, number> = {
  hymns:                      0.95,
  psalterPsalms:              0.30,
  psalterShortReading:        0.95,
  psalterResponsory:          0.95,
  psalterIntercessions:       0.95,
  psalterConcludingPrayer:    0.95,
  propersConcludingPrayer:    0.99,
  propersGospelCanticleAnt:   0.95,
  propersIntercessions:       0.95,
  propersShortReading:        0.95,
  propersResponsory:          0.85,
  sanctoralConcludingPrayer:  0.85,
  sanctoralGospelCanticleAnt: 0.80,
}

describe('PDF page reference coverage', () => {
  const cov = collect()
  for (const [key, min] of Object.entries(THRESHOLDS)) {
    it(`${key} >= ${(min * 100).toFixed(0)}%`, () => {
      const e = cov[key]
      expect(e, `category ${key} not collected`).toBeDefined()
      const ratio = e.total === 0 ? 1 : e.have / e.total
      expect(ratio, `${key}: ${e.have}/${e.total} = ${(ratio * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(min)
    })
  }
})
