import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveMonthRouting } from '../page'

// @fr FR-145
// GOAL #4 (#14) wi-002 — page.tsx `?month=` routing + ±60일 윈도우 폐기.
// Tests cover the 3-tier searchParams priority and invalid-input fallback
// plus the AC6/AC7 structural assertions on the page.tsx source (no stale
// INITIAL_BEFORE_DAYS / INITIAL_AFTER_DAYS constants, no direct
// getCalendarWindow calls).
describe('resolveMonthRouting (FR-145, GOAL #4 wi-002)', () => {
  const TODAY = '2026-05-14' // Asia/Ulaanbaatar today seed used by AC text

  it('AC1: ?date=YYYY-MM-DD → month from date, initialDate echoed', () => {
    const r = resolveMonthRouting({ date: '2026-05-14' }, TODAY)
    expect(r.yearMonth).toBe('2026-05')
    expect(r.initialDate).toBe('2026-05-14')
  })

  it('AC2: ?month=YYYY-MM → month as-is, no initialDate', () => {
    const r = resolveMonthRouting({ month: '2026-06' }, TODAY)
    expect(r.yearMonth).toBe('2026-06')
    expect(r.initialDate).toBeUndefined()
  })

  it('AC3: neither param → today’s month, no initialDate', () => {
    const r = resolveMonthRouting({}, TODAY)
    expect(r.yearMonth).toBe('2026-05')
    expect(r.initialDate).toBeUndefined()
  })

  it('AC4: ?month invalid (‘2026-13’, ‘abc’, single-digit, slash, short-year) → today fallback', () => {
    for (const bad of ['2026-13', '2026-00', 'abc', '2026-5', '26-05', '', '2026/05']) {
      const r = resolveMonthRouting({ month: bad }, TODAY)
      expect(r.yearMonth).toBe('2026-05')
      expect(r.initialDate).toBeUndefined()
    }
  })

  it('AC5: ?date invalid → today fallback, initialDate NOT echoed', () => {
    for (const bad of ['abc', '2026-13-01', '2026-05-32', '2026-05', '2026/05/14', '', '2026-99-99']) {
      const r = resolveMonthRouting({ date: bad }, TODAY)
      expect(r.yearMonth).toBe('2026-05')
      // initialDate is deliberately NOT propagated when ?date is malformed —
      // it would otherwise anchor LiturgicalCalendarList to a bogus row.
      expect(r.initialDate).toBeUndefined()
    }
  })

  it('priority: ?date wins over ?month when both present', () => {
    const r = resolveMonthRouting({ date: '2026-08-15', month: '2026-06' }, TODAY)
    expect(r.yearMonth).toBe('2026-08')
    expect(r.initialDate).toBe('2026-08-15')
  })

  it('priority: ?date invalid still suppresses ?month fallthrough (degrades to today)', () => {
    // Per the dispatch's silent-degrade policy, an invalid ?date does NOT
    // fall through to ?month — it short-circuits to today's month.
    const r = resolveMonthRouting({ date: 'abc', month: '2026-06' }, TODAY)
    expect(r.yearMonth).toBe('2026-05')
    expect(r.initialDate).toBeUndefined()
  })

  it('boundary: ?date on the last day of December stays in December', () => {
    const r = resolveMonthRouting({ date: '2026-12-31' }, '2026-12-31')
    expect(r.yearMonth).toBe('2026-12')
    expect(r.initialDate).toBe('2026-12-31')
  })

  it('boundary: ?date on the first day of January resolves to January', () => {
    const r = resolveMonthRouting({ date: '2027-01-01' }, '2026-12-31')
    expect(r.yearMonth).toBe('2027-01')
    expect(r.initialDate).toBe('2027-01-01')
  })
})

// AC6 + AC7 — structural guards on page.tsx source. Implemented as a file
// content scan so the negative constraint is enforced by the test suite
// rather than relying on manual review.
describe('page.tsx structural guards (FR-145, GOAL #4 wi-002)', () => {
  const PAGE_SRC = readFileSync(
    resolve(__dirname, '../page.tsx'),
    'utf8',
  )

  it('AC6: INITIAL_BEFORE_DAYS / INITIAL_AFTER_DAYS constants removed', () => {
    expect(PAGE_SRC).not.toMatch(/\bINITIAL_BEFORE_DAYS\b/)
    expect(PAGE_SRC).not.toMatch(/\bINITIAL_AFTER_DAYS\b/)
  })

  it('AC7: no direct getCalendarWindow(...) call in page.tsx', () => {
    // The function may still appear in unrelated identifiers — pin to a
    // call-site shape: `getCalendarWindow(` is the giveaway.
    expect(PAGE_SRC).not.toMatch(/\bgetCalendarWindow\s*\(/)
  })

  it('uses getCalendarMonth as the data source', () => {
    expect(PAGE_SRC).toMatch(/\bgetCalendarMonth\s*\(/)
  })
})
