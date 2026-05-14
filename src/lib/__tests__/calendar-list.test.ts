import { describe, it, expect } from 'vitest'
import {
  getCalendarRow,
  getCalendarWindow,
  getTodayAnchorRow,
  shiftDate,
  describeDate,
  shouldRowUseRedAccent,
} from '../calendar-list'

// @fr FR-145
describe('calendar-list helpers (FR-145)', () => {
  it('shiftDate adds + subtracts days correctly across month boundaries', () => {
    expect(shiftDate('2026-05-14', 0)).toBe('2026-05-14')
    expect(shiftDate('2026-05-14', 1)).toBe('2026-05-15')
    expect(shiftDate('2026-05-14', -1)).toBe('2026-05-13')
    expect(shiftDate('2026-04-30', 1)).toBe('2026-05-01')
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('describeDate emits short Mongolian weekday + dd/mm', () => {
    // 2026-05-14 = Thursday
    const d = describeDate('2026-05-14')
    expect(d.dayLabel).toBe('Пүр') // Пүрэв → 3-char prefix
    expect(d.dayOfMonth).toBe(14)
    expect(d.month).toBe(5)
  })
})

// @fr FR-145
describe('getCalendarRow (FR-145)', () => {
  it('returns the default option + alternatives for a regular weekday', () => {
    // 2026-05-15 = Friday of 6th week of Eastertide (no PDF optional)
    const row = getCalendarRow('2026-05-15', '2026-05-14')
    expect(row).not.toBeNull()
    expect(row!.kind).toBe('date')
    expect(row!.isToday).toBe(false)
    expect(row!.defaultCelebration.isDefault).toBe(true)
    expect(row!.defaultCelebration.kind).toBe('weekday-baseline')
    expect(row!.alternatives).toHaveLength(0)
  })

  it('classifies romcal sanctoral default (Ascension) as fixed-sanctoral', () => {
    // 2026-05-14 = Ascension of the Lord (Thursday). Rank=SOLEMNITY,
    // liturgical color=WHITE (Ascension is a glorious mystery). The red
    // accent below is rank-driven, NOT color-driven.
    const row = getCalendarRow('2026-05-14', '2026-05-14')
    expect(row).not.toBeNull()
    expect(row!.isToday).toBe(true)
    expect(row!.defaultCelebration.kind).toBe('fixed-sanctoral')
    expect(row!.rank).toBe('SOLEMNITY')
  })

  it('marks SOLEMNITY rows as needing the red calendar-list accent', () => {
    // Per user decision 6 (image.png "THE ASCENSION OF THE LORD" in red),
    // rank=SOLEMNITY triggers the red accent regardless of liturgical color
    // (Ascension is white liturgically but red on the calendar-list).
    const row = getCalendarRow('2026-05-14', '2026-05-14')
    expect(shouldRowUseRedAccent(row!)).toBe(true)
  })

  it('does NOT apply red accent to weekday baselines', () => {
    const row = getCalendarRow('2026-05-15', '2026-05-14')
    expect(shouldRowUseRedAccent(row!)).toBe(false)
  })

  it('returns null for unresolvable dates', () => {
    // romcal range is bounded; far past should be null
    expect(getCalendarRow('not-a-date', '2026-05-14')).toBeNull()
  })

  it('exposes the hours summary for inline expansion', () => {
    const row = getCalendarRow('2026-05-14', '2026-05-14')
    expect(row!.hoursSummary.length).toBeGreaterThan(0)
    const types = row!.hoursSummary.map((h) => h.type)
    expect(types).toContain('lauds')
  })

  it('appends saturday-mary as alternative on OT Saturday (PDF data present)', () => {
    // 2026-05-30 = OT Saturday — saturday-mary is registered in
    // memorials.json so it should surface as an alternative.
    const row = getCalendarRow('2026-05-30', '2026-05-14')
    expect(row).not.toBeNull()
    const altIds = row!.alternatives.map((a) => a.id)
    expect(altIds).toContain('saturday-mary')
    const alt = row!.alternatives.find((a) => a.id === 'saturday-mary')!
    expect(alt.kind).toBe('optional-memorial')
    expect(alt.isDefault).toBe(false)
  })

  it('does NOT surface alternatives on a SOLEMNITY (Ascension Thu 2026-05-14)', () => {
    // User decision 2 + 5/7: pre-empted feasts with no PDF data do not
    // appear as alternatives. Ascension already pre-empts the day; the
    // calendar-list should not invent a Matthias alternative because
    // there's no PDF entry for it.
    const row = getCalendarRow('2026-05-14', '2026-05-14')
    expect(row!.alternatives).toHaveLength(0)
  })

  it('does NOT surface alternatives on a non-Saturday weekday with empty optional-memorials.json', () => {
    // optional-memorials.json is currently {} → no MM-DD entries
    const row = getCalendarRow('2026-05-13', '2026-05-14') // Wed 13 May
    expect(row!.alternatives).toHaveLength(0)
  })
})

// @fr FR-145
describe('getTodayAnchorRow (FR-145)', () => {
  it('returns a synthetic anchor row tagged with kind=today-anchor', () => {
    const anchor = getTodayAnchorRow('2026-05-14')
    expect(anchor).not.toBeNull()
    expect(anchor!.kind).toBe('today-anchor')
    expect(anchor!.date).toBe('2026-05-14')
    expect(anchor!.defaultCelebration.kind).toBe('automatic')
    expect(anchor!.isToday).toBe(false) // anchor does not own the highlight
    expect(anchor!.dayLabel).toBe('')
    expect(anchor!.alternatives).toHaveLength(0)
  })
})

// @fr FR-145
describe('getCalendarWindow (FR-145)', () => {
  it('builds a chronological window anchored at the given date', () => {
    const window = getCalendarWindow('2026-05-14', {
      before: 1,
      after: 3,
      todayStr: '2026-05-14',
    })
    // 1 anchor + 5 dates (14 ± 1d before, 3d after = 13,14,15,16,17)
    expect(window.rows.length).toBe(6)
    expect(window.rows[0].kind).toBe('today-anchor')
    expect(window.rows[1].date).toBe('2026-05-13')
    expect(window.rows[2].date).toBe('2026-05-14')
    expect(window.rows[5].date).toBe('2026-05-17')
  })

  it('omits the anchor when includeTodayAnchor=false', () => {
    const window = getCalendarWindow('2026-05-14', {
      before: 0,
      after: 0,
      todayStr: '2026-05-14',
      includeTodayAnchor: false,
    })
    expect(window.rows).toHaveLength(1)
    expect(window.rows[0].kind).toBe('date')
  })

  it('marks the today row with isToday=true', () => {
    const window = getCalendarWindow('2026-05-14', {
      before: 2,
      after: 2,
      todayStr: '2026-05-14',
      includeTodayAnchor: false,
    })
    const today = window.rows.find((r) => r.date === '2026-05-14')
    expect(today).toBeDefined()
    expect(today!.isToday).toBe(true)
    const others = window.rows.filter((r) => r.date !== '2026-05-14')
    expect(others.every((r) => !r.isToday)).toBe(true)
  })

  it('clamps absurdly large windows defensively', () => {
    const window = getCalendarWindow('2026-05-14', {
      before: 9999999,
      after: 0,
      todayStr: '2026-05-14',
      includeTodayAnchor: false,
    })
    // Clamp is to ±3650; rows may still be empty far in the past where
    // romcal returns null, but the call must not OOM or infinite-loop.
    // Smoke test: it returned an array and didn't crash.
    expect(Array.isArray(window.rows)).toBe(true)
  })
})
