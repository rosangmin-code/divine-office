import { describe, it, expect } from 'vitest'
import { applySeasonalAntiphon } from '../seasonal-antiphon'

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
