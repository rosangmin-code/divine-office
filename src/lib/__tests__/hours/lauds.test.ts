import { describe, it, expect } from 'vitest'
import { assembleLauds } from '../../hours/lauds'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers } from '../../types'

function makeContext(overrides: Partial<HourContext> = {}): HourContext {
  return {
    hour: 'lauds',
    dateStr: '2026-03-15',
    dayOfWeek: 'SUN',
    liturgicalDay: { season: 'LENT', psalterWeek: 1 } as LiturgicalDayInfo,
    assembledPsalms: [
      { psalmType: 'psalm', reference: 'Psalm 63:2-9', antiphon: 'Test', verses: [{ verse: 2, text: 'verse' }], gloriaPatri: true },
    ] as AssembledPsalm[],
    mergedPropers: {
      hymn: 'Test hymn text',
      responsory: { versicle: 'V', response: 'R' },
      gospelCanticleAntiphon: 'Canticle ant',
      intercessions: ['Prayer 1', 'Prayer 2'],
      concludingPrayer: 'Concluding text',
    } as HourPropers,
    ordinarium: {
      invitatory: { openingVersicle: { versicle: 'V: Open', response: 'R: Response' }, psalms: [] },
      canticles: { benedictus: { ref: 'Luke 1:68-79', titleMn: 'Benedictus' } },
      commonPrayers: {},
      complineData: {},
    },
    isFirstHourOfDay: true,
    complineData: null,
    ...overrides,
  }
}

describe('assembleLauds', () => {
  it('produces correct section order', () => {
    const sections = assembleLauds(makeContext())
    const types = sections.map((s) => s.type)
    expect(types).toEqual([
      'invitatory', 'hymn', 'psalmody', 'responsory',
      'gospelCanticle', 'intercessions', 'ourFather', 'concludingPrayer', 'dismissal',
    ])
  })

  it('includes invitatory when isFirstHourOfDay', () => {
    const sections = assembleLauds(makeContext({ isFirstHourOfDay: true }))
    expect(sections[0].type).toBe('invitatory')
  })

  it('omits invitatory when not first hour', () => {
    const sections = assembleLauds(makeContext({ isFirstHourOfDay: false }))
    expect(sections[0].type).toBe('hymn')
  })

  it('always includes ourFather', () => {
    const sections = assembleLauds(makeContext())
    expect(sections.some((s) => s.type === 'ourFather')).toBe(true)
  })

  it('always ends with dismissal', () => {
    const sections = assembleLauds(makeContext())
    expect(sections[sections.length - 1].type).toBe('dismissal')
  })

  it('omits intercessions when not in propers', () => {
    const sections = assembleLauds(makeContext({
      mergedPropers: { hymn: 'H', concludingPrayer: 'P' },
    }))
    expect(sections.some((s) => s.type === 'intercessions')).toBe(false)
  })
})
