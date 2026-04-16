import { describe, it, expect } from 'vitest'
import { getHymnForHour, getHymnCandidatesForHour } from '../propers-loader'
import type { DayOfWeek, LiturgicalSeason, HourType } from '../types'

const DAYS: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

describe('getHymnForHour — daily rotation', () => {
  it('returns different hymns for different days in the same week', () => {
    const hymns = DAYS.map(day =>
      getHymnForHour('ORDINARY_TIME', 1, day, 'lauds')
    )
    // With 26 lauds candidates and 7 days, all 7 should be distinct
    const titles = hymns.map(h => h?.title)
    const unique = new Set(titles)
    expect(unique.size).toBe(7)
  })

  it('returns the same hymn for the same date parameters (deterministic)', () => {
    const a = getHymnForHour('ADVENT', 2, 'WED', 'lauds')
    const b = getHymnForHour('ADVENT', 2, 'WED', 'lauds')
    expect(a?.title).toBe(b?.title)
    expect(a?.text).toBe(b?.text)
  })

  it('wraps around correctly when index exceeds candidate count', () => {
    // ADVENT has 6 candidates; week 2 gives indices 7-13, all should mod to valid
    const hymns = DAYS.map(day =>
      getHymnForHour('ADVENT', 2, day, 'lauds')
    )
    hymns.forEach(h => {
      expect(h).not.toBeNull()
      expect(h!.text.length).toBeGreaterThan(0)
    })
  })

  it('handles Lent weekOfSeason=0 without negative index', () => {
    // Lent starts at weekOfSeason=0 (Ash Wednesday week)
    // Should not throw, and if data exists should return a valid hymn
    const hymn = getHymnForHour('LENT', 0, 'WED', 'lauds')
    if (hymn) {
      expect(hymn.text.length).toBeGreaterThan(0)
    }
    // Also verify via candidates to confirm no negative index
    const result = getHymnCandidatesForHour('LENT', 0, 'WED', 'lauds')
    if (result) {
      expect(result.selectedIndex).toBeGreaterThanOrEqual(0)
      expect(result.selectedIndex).toBeLessThan(result.candidates.length)
    }
  })

  it('returns null for a season with no candidates', () => {
    // Using a cast to test unknown season
    const hymn = getHymnForHour('UNKNOWN' as LiturgicalSeason, 1, 'SUN', 'lauds')
    expect(hymn).toBeNull()
  })

  it('selects different candidates per hour in ORDINARY_TIME', () => {
    const lauds = getHymnForHour('ORDINARY_TIME', 1, 'MON', 'lauds')
    const vespers = getHymnForHour('ORDINARY_TIME', 1, 'MON', 'vespers')
    const compline = getHymnForHour('ORDINARY_TIME', 1, 'MON', 'compline')
    // Different pools → likely different hymns (not guaranteed but pools are distinct)
    const titles = new Set([lauds?.title, vespers?.title, compline?.title])
    expect(titles.size).toBeGreaterThanOrEqual(2)
  })
})

describe('getHymnCandidatesForHour', () => {
  it('returns all candidates for a given season and hour', () => {
    const result = getHymnCandidatesForHour('ORDINARY_TIME', 1, 'MON', 'lauds')
    expect(result).not.toBeNull()
    // OT lauds has 26 candidates in hymns-index.json
    expect(result!.candidates.length).toBeGreaterThanOrEqual(10)
  })

  it('each candidate has required fields', () => {
    const result = getHymnCandidatesForHour('ADVENT', 1, 'SUN', 'lauds')
    expect(result).not.toBeNull()
    for (const c of result!.candidates) {
      expect(c.number).toBeGreaterThan(0)
      expect(c.title.length).toBeGreaterThan(0)
      expect(c.text.length).toBeGreaterThan(0)
    }
  })

  it('selectedIndex is within candidates range', () => {
    const seasons: LiturgicalSeason[] = ['ADVENT', 'CHRISTMAS', 'LENT', 'EASTER', 'ORDINARY_TIME']
    for (const season of seasons) {
      for (const day of DAYS) {
        const result = getHymnCandidatesForHour(season, 1, day, 'lauds')
        if (result) {
          expect(result.selectedIndex).toBeGreaterThanOrEqual(0)
          expect(result.selectedIndex).toBeLessThan(result.candidates.length)
        }
      }
    }
  })

  it('selectedIndex matches the hymn returned by getHymnForHour', () => {
    const hymn = getHymnForHour('ORDINARY_TIME', 3, 'THU', 'vespers')
    const result = getHymnCandidatesForHour('ORDINARY_TIME', 3, 'THU', 'vespers')
    expect(result).not.toBeNull()
    expect(hymn).not.toBeNull()
    const selected = result!.candidates[result!.selectedIndex]
    expect(selected.text).toBe(hymn!.text)
    expect(selected.title).toBe(hymn!.title)
  })

  it('returns null for unknown season', () => {
    const result = getHymnCandidatesForHour('UNKNOWN' as LiturgicalSeason, 1, 'SUN', 'lauds')
    expect(result).toBeNull()
  })

  it('Lent weekOfSeason=0 produces valid selectedIndex', () => {
    const result = getHymnCandidatesForHour('LENT', 0, 'WED', 'lauds')
    expect(result).not.toBeNull()
    expect(result!.selectedIndex).toBeGreaterThanOrEqual(0)
    expect(result!.selectedIndex).toBeLessThan(result!.candidates.length)
  })
})
