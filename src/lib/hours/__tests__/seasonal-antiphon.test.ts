import { describe, it, expect } from 'vitest'
import { applySeasonalAntiphon, pickSeasonalVariant } from '../seasonal-antiphon'
import type { PsalmEntry } from '../../types'

describe('applySeasonalAntiphon', () => {
  it('passes non-Easter seasons through unchanged', () => {
    const a = 'Эзэн бол миний хүч бөгөөд миний аврал.'
    expect(applySeasonalAntiphon(a, 'ORDINARY_TIME')).toBe(a)
    expect(applySeasonalAntiphon(a, 'LENT')).toBe(a)
    expect(applySeasonalAntiphon(a, 'ADVENT')).toBe(a)
    expect(applySeasonalAntiphon(a, 'CHRISTMAS')).toBe(a)
  })

  it('passes empty antiphons through unchanged', () => {
    expect(applySeasonalAntiphon('', 'EASTER')).toBe('')
    expect(applySeasonalAntiphon('   ', 'EASTER')).toBe('   ')
  })

  it('appends Alleluia to Easter antiphons without one', () => {
    const a = 'Эзэн бол миний хүч бөгөөд миний аврал.'
    expect(applySeasonalAntiphon(a, 'EASTER')).toBe(
      'Эзэн бол миний хүч бөгөөд миний аврал. Аллэлуяа!',
    )
  })

  it('adds a sentence-closing period when missing before appending', () => {
    const a = 'Эзэн бол миний хүч'
    expect(applySeasonalAntiphon(a, 'EASTER')).toBe('Эзэн бол миний хүч. Аллэлуяа!')
  })

  it('leaves antiphons that already end with Аллэлуяа unchanged', () => {
    const a = 'Сионы ард түмэн өөрсдийн Хаандаа баярлацгаа. Аллэлуяа!'
    expect(applySeasonalAntiphon(a, 'EASTER')).toBe(a)
  })

  it('leaves doubled-Alleluia terminators unchanged', () => {
    const a = 'Амилсан Эзэн дотор бид найдлагаа олдог. Аллэлуяа, аллэлуяа!'
    expect(applySeasonalAntiphon(a, 'EASTER')).toBe(a)
  })

  it('handles an undefined season as a no-op', () => {
    const a = 'Эзэн бол миний хүч'
    expect(applySeasonalAntiphon(a, undefined)).toBe(a)
  })

  it('ignores trailing whitespace when detecting existing Alleluia', () => {
    const a = 'Эзэн бол миний хүч. Аллэлуяа!   '
    // trimEnd happens internally — we expect the original (with trailing spaces)
    // to pass through because the detected suffix is still Alleluia.
    expect(applySeasonalAntiphon(a, 'EASTER')).toBe(a)
  })
})

describe('pickSeasonalVariant', () => {
  const baseEntry: PsalmEntry = {
    type: 'psalm',
    ref: 'Psalm 63:2-9',
    antiphon_key: 'w3-thu-vespers-ps2',
    default_antiphon: 'Эзэн бол миний хүч бөгөөд миний аврал.',
    gloria_patri: true,
  }

  it('returns undefined when entry has no seasonal_antiphons block', () => {
    expect(pickSeasonalVariant(baseEntry, 'EASTER')).toBeUndefined()
    expect(pickSeasonalVariant(baseEntry, 'ADVENT', '2025-12-20')).toBeUndefined()
  })

  it('returns undefined when season is undefined', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан Эзэн... Аллэлуяа!' },
    }
    expect(pickSeasonalVariant(entry, undefined)).toBeUndefined()
  })

  it('picks the easter (season general) variant on a weekday in EASTER', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан Эзэн бидний хүч. Аллэлуяа!' },
    }
    expect(pickSeasonalVariant(entry, 'EASTER', '2026-04-23', 'THU', 3)).toBe(
      'Амилсан Эзэн бидний хүч. Аллэлуяа!',
    )
  })

  it('picks the advent (weekday general) variant for ADVENT outside 12/17+', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { advent: 'Эзэн ирж байна. Залбирцгаая.' },
    }
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-04', 'THU', 1)).toBe(
      'Эзэн ирж байна. Залбирцгаая.',
    )
  })

  it('picks adventDec17_23 only within the Dec 17-23 window and only when season==ADVENT', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { adventDec17_23: 'О Эмманвел, биднийг чөлөөл.' },
    }
    // Inside window — all three boundary dates
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-17', 'WED', 3)).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-20', 'SAT', 3)).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-23', 'TUE', 4)).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    // Outside window — returns undefined even though season is ADVENT.
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-16', 'TUE', 3)).toBeUndefined()
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-25', 'THU', 1)).toBeUndefined()
    // Season mismatch (e.g. CHRISTMAS on 12/20 after Dec 25 shift) — also undefined.
    expect(pickSeasonalVariant(entry, 'CHRISTMAS', '2025-12-20', 'SAT', 1)).toBeUndefined()
  })

  it('picks adventDec24 on Dec 24 when authored', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { adventDec24: 'Өнөөдөр Эзэний ирэлтийн босгон дээр.' },
    }
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-24', 'WED', 4)).toBe(
      'Өнөөдөр Эзэний ирэлтийн босгон дээр.',
    )
    // Dec 24 outside ADVENT (shouldn't happen but defensive) → undefined.
    expect(pickSeasonalVariant(entry, 'CHRISTMAS', '2025-12-24', 'WED', 1)).toBeUndefined()
  })

  it('per-Sunday override easterSunday[weekOfSeason] wins over season general', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн. Аллэлуяа!',
        easterSunday: {
          3: '3 дахь Ням гарагийн Pascha онцгой. Аллэлуяа!',
          5: '5 дэх Ням гарагийн онцгой. Аллэлуяа!',
        },
      },
    }
    // Sunday + matching week → per-Sunday picked
    expect(pickSeasonalVariant(entry, 'EASTER', '2026-04-19', 'SUN', 3)).toBe(
      '3 дахь Ням гарагийн Pascha онцгой. Аллэлуяа!',
    )
    // Sunday + unmatched week → falls back to season general
    expect(pickSeasonalVariant(entry, 'EASTER', '2026-04-26', 'SUN', 4)).toBe(
      'Амилсан Эзэн. Аллэлуяа!',
    )
    // Weekday → per-Sunday ignored, season general picked
    expect(pickSeasonalVariant(entry, 'EASTER', '2026-04-23', 'THU', 3)).toBe(
      'Амилсан Эзэн. Аллэлуяа!',
    )
  })

  it('per-Sunday override lentSunday[weekOfSeason] works on LENT Sunday; weekday falls through (no season-wide LENT marker)', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        lentSunday: {
          1: '1 дэх Ням гарагийн Lent онцгой.',
          4: '4 дэх Ням гарагийн Laetare онцгой.',
        },
      },
    }
    // Matching Sunday + week
    expect(pickSeasonalVariant(entry, 'LENT', '2026-02-22', 'SUN', 1)).toBe(
      '1 дэх Ням гарагийн Lent онцгой.',
    )
    expect(pickSeasonalVariant(entry, 'LENT', '2026-03-15', 'SUN', 4)).toBe(
      '4 дэх Ням гарагийн Laetare онцгой.',
    )
    // Weekday in LENT — no season-wide marker, no variant → undefined
    expect(pickSeasonalVariant(entry, 'LENT', '2026-03-04', 'WED', 1)).toBeUndefined()
    // Sunday but unmatched week → undefined
    expect(pickSeasonalVariant(entry, 'LENT', '2026-03-22', 'SUN', 5)).toBeUndefined()
  })

  it('returns undefined for ORDINARY_TIME and CHRISTMAS (no PDF markers)', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'А...',
        advent: 'B...',
      },
    }
    expect(pickSeasonalVariant(entry, 'ORDINARY_TIME', '2026-06-15', 'MON', 11)).toBeUndefined()
    expect(pickSeasonalVariant(entry, 'CHRISTMAS', '2025-12-28', 'SUN', 1)).toBeUndefined()
  })

  it('empty per-Sunday variant string falls through to season general', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн. Аллэлуяа!',
        easterSunday: { 3: '' }, // intentionally empty — skip to fallback
      },
    }
    expect(pickSeasonalVariant(entry, 'EASTER', '2026-04-19', 'SUN', 3)).toBe(
      'Амилсан Эзэн. Аллэлуяа!',
    )
  })
})
