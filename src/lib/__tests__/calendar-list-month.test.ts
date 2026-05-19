import { describe, it, expect } from 'vitest'
import { getCalendarMonth } from '../calendar-list'

// @fr FR-145
// GOAL #4 (#13) wi-001 — getCalendarMonth data 어댑터. Covers the 8 ACs:
//   1. May 2026 (today in month)   → 1 anchor + 31 dates = 32 rows
//   2. June 2026 (today not in mo) → 0 anchor + 30 dates = 30 rows
//   3. Leap-year Feb 2024          → 29 dates
//   4. Common-year Feb 2025        → 28 dates
//   5. December 2026               → 31 dates (December→January boundary)
//   6. January 2027                → 31 dates (January following Dec)
//   7. Invalid 'YYYY-MM'           → throws TypeError
//   8. (this file is AC #8 — ≥5 cases)
describe('getCalendarMonth (FR-145, GOAL #4 wi-001)', () => {
  it('AC1: May 2026 with today in month → 32 rows (1 anchor + 31 dates)', () => {
    const window = getCalendarMonth('2026-05', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(32)
    expect(window.rows[0].kind).toBe('today-anchor')
    expect(window.rows[1].kind).toBe('date')
    expect(window.rows[1].date).toBe('2026-05-01')
    expect(window.rows[31].date).toBe('2026-05-31')
    expect(window.anchorDate).toBe('2026-05-01')
    expect(window.todayStr).toBe('2026-05-14')
    // The today-row inside the window should own the highlight, not the anchor.
    const todayRow = window.rows.find((r) => r.kind === 'date' && r.date === '2026-05-14')
    expect(todayRow).toBeDefined()
    expect(todayRow!.isToday).toBe(true)
  })

  it('AC2: June 2026 with today NOT in month → 30 rows, no anchor', () => {
    const window = getCalendarMonth('2026-06', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(30)
    expect(window.rows.every((r) => r.kind === 'date')).toBe(true)
    expect(window.rows[0].date).toBe('2026-06-01')
    expect(window.rows[29].date).toBe('2026-06-30')
    // No row should be marked isToday — today is outside the window.
    expect(window.rows.every((r) => !r.isToday)).toBe(true)
  })

  it('AC3: leap-year February 2024 → 29 dates', () => {
    // todayStr explicitly outside Feb 2024 so the anchor never sneaks in.
    const window = getCalendarMonth('2024-02', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(29)
    expect(window.rows[0].date).toBe('2024-02-01')
    expect(window.rows[28].date).toBe('2024-02-29')
  })

  it('AC4: common-year February 2025 → 28 dates', () => {
    const window = getCalendarMonth('2025-02', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(28)
    expect(window.rows[0].date).toBe('2025-02-01')
    expect(window.rows[27].date).toBe('2025-02-28')
  })

  it('AC5: December 2026 → 31 dates (December→January boundary intact)', () => {
    const window = getCalendarMonth('2026-12', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(31)
    expect(window.rows[0].date).toBe('2026-12-01')
    expect(window.rows[30].date).toBe('2026-12-31')
    // No row should bleed past month-end into 2027-01-01.
    expect(window.rows.every((r) => r.date.startsWith('2026-12-'))).toBe(true)
  })

  it('AC6: January 2027 → 31 dates (January following December)', () => {
    const window = getCalendarMonth('2027-01', { todayStr: '2026-05-14' })
    expect(window.rows.length).toBe(31)
    expect(window.rows[0].date).toBe('2027-01-01')
    expect(window.rows[30].date).toBe('2027-01-31')
    // No row should bleed backwards into 2026-12-31.
    expect(window.rows.every((r) => r.date.startsWith('2027-01-'))).toBe(true)
  })

  it('AC7: invalid yearMonth → throws TypeError', () => {
    expect(() => getCalendarMonth('2026-13')).toThrow(TypeError)
    expect(() => getCalendarMonth('2026-00')).toThrow(TypeError)
    expect(() => getCalendarMonth('abc')).toThrow(TypeError)
    expect(() => getCalendarMonth('2026-5')).toThrow(TypeError) // single-digit month
    expect(() => getCalendarMonth('26-05')).toThrow(TypeError) // 2-digit year
    expect(() => getCalendarMonth('')).toThrow(TypeError)
    expect(() => getCalendarMonth('2026/05')).toThrow(TypeError)
  })

  it('anchor inclusion: todayStr inside requested month → anchor included', () => {
    const window = getCalendarMonth('2026-05', { todayStr: '2026-05-01' })
    expect(window.rows[0].kind).toBe('today-anchor')
    // Edge: last day of month also triggers anchor.
    const lastDay = getCalendarMonth('2026-05', { todayStr: '2026-05-31' })
    expect(lastDay.rows[0].kind).toBe('today-anchor')
  })

  it('anchor inclusion: todayStr outside requested month → anchor omitted', () => {
    // Same year, different month.
    const window = getCalendarMonth('2026-05', { todayStr: '2026-04-30' })
    expect(window.rows.every((r) => r.kind === 'date')).toBe(true)
    // Different year, same month.
    const otherYear = getCalendarMonth('2026-05', { todayStr: '2025-05-14' })
    expect(otherYear.rows.every((r) => r.kind === 'date')).toBe(true)
  })

  it('window metadata: anchorDate is the 1st of the month, not today', () => {
    const window = getCalendarMonth('2026-05', { todayStr: '2026-05-14' })
    expect(window.anchorDate).toBe('2026-05-01')
  })
})
