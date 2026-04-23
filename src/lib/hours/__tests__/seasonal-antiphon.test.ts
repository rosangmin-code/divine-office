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
    expect(pickSeasonalVariant(baseEntry, 'LENT')).toBeUndefined()
  })

  it('returns undefined when season is undefined', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан Эзэн... Аллэлуяа!' },
    }
    expect(pickSeasonalVariant(entry, undefined)).toBeUndefined()
  })

  it('picks the easter variant during EASTER', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн бидний хүч. Аллэлуяа!',
        lent: 'Загалмайд өргөгдсөн Эзэнийг тахин мөргөе.',
      },
    }
    expect(pickSeasonalVariant(entry, 'EASTER')).toBe(
      'Амилсан Эзэн бидний хүч. Аллэлуяа!',
    )
  })

  it('picks the lent variant during LENT', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн. Аллэлуяа!',
        lent: 'Загалмайд өргөгдсөн Эзэнийг тахин мөргөе.',
      },
    }
    expect(pickSeasonalVariant(entry, 'LENT')).toBe(
      'Загалмайд өргөгдсөн Эзэнийг тахин мөргөе.',
    )
  })

  it('picks the christmas variant during CHRISTMAS', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { christmas: 'Мессиа өнөөдөр төржээ.' },
    }
    expect(pickSeasonalVariant(entry, 'CHRISTMAS')).toBe(
      'Мессиа өнөөдөр төржээ.',
    )
  })

  it('returns undefined during EASTER when only lent variant is authored', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { lent: 'Л...' },
    }
    expect(pickSeasonalVariant(entry, 'EASTER')).toBeUndefined()
  })

  it('applies adventDec17_23 only within the Dec 17-23 window', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { adventDec17_23: 'О Эмманвел, биднийг чөлөөл.' },
    }
    // inside window
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-17')).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-20')).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-23')).toBe(
      'О Эмманвел, биднийг чөлөөл.',
    )
    // outside window — must return undefined even though season is ADVENT
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-16')).toBeUndefined()
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-24')).toBeUndefined()
    expect(pickSeasonalVariant(entry, 'ADVENT', '2025-12-04')).toBeUndefined()
  })

  it('returns undefined during ADVENT when dateStr is missing (defensive)', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { adventDec17_23: 'О...' },
    }
    expect(pickSeasonalVariant(entry, 'ADVENT', undefined)).toBeUndefined()
  })

  it('returns undefined for ORDINARY_TIME even if a variant exists', () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'А...' },
    }
    expect(pickSeasonalVariant(entry, 'ORDINARY_TIME')).toBeUndefined()
  })
})
