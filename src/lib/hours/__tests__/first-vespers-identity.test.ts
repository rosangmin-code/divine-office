import { describe, it, expect } from 'vitest'
import { promoteToFirstVespersIdentity } from '../first-vespers-identity'

// @fr FR-156
//
// Helper extracted in task #32 from `loth-service.ts` two call sites
// (evening-before-solemnity-or-feast + Saturday→Sunday). Unit tests
// assert the contract the two sites depend on: the helper returns the
// caller's claimed identity unchanged, so both sites can trust that
// `effectiveDayOfWeek === targetDayOfWeek` and
// `effectiveWeekOfSeason === targetWeekOfSeason` after the call.
describe('promoteToFirstVespersIdentity (FR-156 task #32 helper)', () => {
  it('returns the target (dayOfWeek, weekOfSeason) verbatim for a Sunday promotion', () => {
    const result = promoteToFirstVespersIdentity('2026-04-19', 'SUN', 3)
    expect(result.effectiveDayOfWeek).toBe('SUN')
    expect(result.effectiveWeekOfSeason).toBe(3)
  })

  it('accepts any DayOfWeek for FEAST eves on non-Saturday (Transfiguration 08-06 Thursday)', () => {
    // 2026-08-06 = Transfiguration (FEAST), Thursday. Eve is Wednesday
    // 08-05. The evening-before branch promotes to Thursday's
    // identity. Unlike the Saturday→Sunday branch, dayOfWeek is NOT
    // fixed to 'SUN'.
    const result = promoteToFirstVespersIdentity('2026-08-06', 'THU', 18)
    expect(result.effectiveDayOfWeek).toBe('THU')
    expect(result.effectiveWeekOfSeason).toBe(18)
  })

  it('ignores targetDate for the returned identity (date is informational only)', () => {
    // targetDate does not enter the computation — the helper exists
    // to centralise the 2-line promotion and its docstring. Passing a
    // date that disagrees with targetDayOfWeek still returns the
    // claimed identity; callers are responsible for matching them.
    const result = promoteToFirstVespersIdentity('2099-01-01', 'MON', 99)
    expect(result.effectiveDayOfWeek).toBe('MON')
    expect(result.effectiveWeekOfSeason).toBe(99)
  })
})
