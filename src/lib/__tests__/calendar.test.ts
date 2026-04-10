import { describe, it, expect } from 'vitest'
import { getLiturgicalDay, getCalendarForYear } from '../calendar'

describe('getLiturgicalDay', () => {
  it('returns null for malformed date', () => {
    expect(getLiturgicalDay('not-a-date')).toBeNull()
  })

  it('returns correct season for Ordinary Time', () => {
    const day = getLiturgicalDay('2026-06-15')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('ORDINARY_TIME')
    expect(day!.color).toBe('GREEN')
  })

  it('returns ADVENT for December date', () => {
    const day = getLiturgicalDay('2025-12-07')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('ADVENT')
    expect(day!.color).toBe('VIOLET')
  })

  it('returns LENT for Lenten date', () => {
    const day = getLiturgicalDay('2026-03-10')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('LENT')
  })

  it('returns CHRISTMAS for Dec 25', () => {
    const day = getLiturgicalDay('2025-12-25')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('CHRISTMAS')
    expect(day!.color).toBe('WHITE')
  })

  it('has psalter week 1-4', () => {
    const day = getLiturgicalDay('2026-06-15')
    expect(day).not.toBeNull()
    expect([1, 2, 3, 4]).toContain(day!.psalterWeek)
  })

  it('has sunday cycle A/B/C', () => {
    const day = getLiturgicalDay('2026-06-15')
    expect(day).not.toBeNull()
    expect(['A', 'B', 'C']).toContain(day!.sundayCycle)
  })
})

describe('getCalendarForYear', () => {
  it('returns 365+ days for a year', () => {
    const calendar = getCalendarForYear(2026)
    expect(calendar.length).toBeGreaterThanOrEqual(365)
  })

  it('contains all 5 seasons', () => {
    const calendar = getCalendarForYear(2026)
    const seasons = new Set(calendar.map((d) => d.season))
    expect(seasons.has('ADVENT')).toBe(true)
    expect(seasons.has('CHRISTMAS')).toBe(true)
    expect(seasons.has('LENT')).toBe(true)
    expect(seasons.has('EASTER')).toBe(true)
    expect(seasons.has('ORDINARY_TIME')).toBe(true)
  })

  it('assigns OT weeks', () => {
    const calendar = getCalendarForYear(2026)
    const otDays = calendar.filter((d) => d.season === 'ORDINARY_TIME' && d.otWeek !== undefined)
    expect(otDays.length).toBeGreaterThan(0)
  })
})
