import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * TEAM GOAL #2 — W1 Saturday Lauds Benedictus (gospelCanticle) antiphon
 * page-boundary truncation regression (DOGFOODING).
 *
 * Bug: the Week 1 · Saturday · Lauds `gospelCanticleAntiphon` was dropped
 * mid-sentence at a PDF page boundary, shipping the truncated prefix
 *   "Эзэн, Та харанхуйн дотор, үхлийн"
 * instead of the complete SoT line. The SAME antiphon already ships
 * complete on Week 3 · Saturday · Lauds (week-3.json), so week-3 is the
 * byte-identical SoT cross-check (no machine translation involved).
 *
 * These assertions lock the POST-FIX committed-data state and are
 * intentionally RED before the week-1.json single-field replacement:
 *   - [A] W1 SAT Lauds antiphon == the COMPLETE SoT value
 *   - [B] W1 SAT Lauds antiphon == W3 SAT Lauds antiphon (same antiphon)
 *   - [C] antiphon ends with sentence-final "." (prefix-truncation guard)
 *   - [D] antiphon is NOT the known truncated prefix (negative guard)
 *
 * Sibling data-correction test pattern: psalm63-caption-reposition.test.ts.
 * No @fr tag: this is a data-integrity regression with no dedicated FR in
 * docs/traceability-matrix.md (cf. page-coverage.test.ts), so tagging an
 * absent FR would fail `traceability:check`.
 *
 * Mongolian liturgical text is quoted verbatim from the PDF-sourced data
 * (citation exception). Do NOT alter orthography.
 */

const ROOT = path.resolve(__dirname, '../../../..')

function read(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

const WEEK1 = 'src/data/loth/psalter/week-1.json'
const WEEK3 = 'src/data/loth/psalter/week-3.json'

// Complete SoT value (byte-identical to week-3.json SAT Lauds antiphon).
const COMPLETE_ANTIPHON =
  'Эзэн, Та харанхуйн дотор, үхлийн сүүдэрт буй хүмүүсийг гийгүүлнэ үү.'

// The shipped truncated prefix the fix removes (negative guard).
const TRUNCATED_PREFIX = 'Эзэн, Та харанхуйн дотор, үхлийн'

describe('TEAM GOAL #2 — W1 SAT Lauds Benedictus antiphon · truncation regression', () => {
  it('[A] W1 SAT Lauds gospelCanticleAntiphon equals the complete SoT value', () => {
    const week1 = read(WEEK1)
    // RED before fix: currently the truncated prefix.
    expect(week1.days.SAT.lauds.gospelCanticleAntiphon).toBe(COMPLETE_ANTIPHON)
  })

  it('[B] W1 SAT Lauds antiphon equals W3 SAT Lauds antiphon (same antiphon)', () => {
    const week1 = read(WEEK1)
    const week3 = read(WEEK3)
    const w1Ant = week1.days.SAT.lauds.gospelCanticleAntiphon
    const w3Ant = week3.days.SAT.lauds.gospelCanticleAntiphon
    // W3 is the already-shipped complete SoT cross-check.
    expect(w3Ant).toBe(COMPLETE_ANTIPHON)
    // RED before fix: W1 differs (truncated) from W3 (complete).
    expect(w1Ant).toBe(w3Ant)
  })

  it('[C] W1 SAT Lauds antiphon ends with sentence-final "." (prefix-truncation guard)', () => {
    const week1 = read(WEEK1)
    // RED before fix: the truncated prefix ends with "үхлийн", no period.
    expect(week1.days.SAT.lauds.gospelCanticleAntiphon.endsWith('.')).toBe(true)
  })

  it('[D] W1 SAT Lauds antiphon is NOT the known truncated prefix (negative guard)', () => {
    const week1 = read(WEEK1)
    // RED before fix: currently exactly equals the truncated prefix.
    expect(week1.days.SAT.lauds.gospelCanticleAntiphon).not.toBe(
      TRUNCATED_PREFIX,
    )
  })
})
