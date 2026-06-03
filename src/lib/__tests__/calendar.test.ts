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

  it('computes Ordinary-Time weeks by date across post-Pentecost boundaries', () => {
    const cases = [
      ['2026-06-03', 9, 'Жирийн цаг улирлын 9-р долоо хоног'],
      ['2026-06-04', 9, 'Жирийн цаг улирлын 9-р долоо хоног'],
      ['2026-06-08', 10, 'Жирийн цаг улирлын 10-р долоо хоног'],
      ['2025-06-09', 10, 'Жирийн цаг улирлын 10-р долоо хоног'],
    ] as const

    for (const [date, otWeek, nameMn] of cases) {
      const day = getLiturgicalDay(date)
      expect(day, date).not.toBeNull()
      expect(day!.season, date).toBe('ORDINARY_TIME')
      expect(day!.otWeek, date).toBe(otWeek)
      expect(day!.nameMn, date).toBe(nameMn)
    }
  })

  it('keeps early Ordinary-Time week numbering before Lent', () => {
    const day = getLiturgicalDay('2026-02-10')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('ORDINARY_TIME')
    expect(day!.otWeek).toBe(5)
    expect(day!.nameMn).toBe('Жирийн цаг улирлын 5-р долоо хоног')
  })

  it('assigns OT weeks to boundary solemnities without replacing their names', () => {
    const cases = [
      ['2026-05-31', 9, 'Туйлын Ариун Нандин Гурвалын Ням гараг — Их баяр'],
      ['2026-06-07', 10, 'Христийн Туйлын Ариун Нандин Бие ба Цус — Их баяр'],
      ['2026-11-22', 34, 'Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр'],
    ] as const

    for (const [date, otWeek, nameMn] of cases) {
      const day = getLiturgicalDay(date)
      expect(day, date).not.toBeNull()
      expect(day!.season, date).toBe('ORDINARY_TIME')
      expect(day!.otWeek, date).toBe(otWeek)
      expect(day!.nameMn, date).toBe(nameMn)
    }
  })

  it('does not assign an Ordinary-Time week to Advent', () => {
    const day = getLiturgicalDay('2026-11-29')
    expect(day).not.toBeNull()
    expect(day!.season).toBe('ADVENT')
    expect(day!.otWeek).toBeUndefined()
    expect(day!.nameMn).toBe('Ирэлтийн цаг улирлын 1-р Ням')
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
