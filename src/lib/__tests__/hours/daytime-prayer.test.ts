import { describe, it, expect } from 'vitest'
import { assembleDaytimePrayer } from '../../hours/daytime-prayer'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers } from '../../types'

function makeContext(hour: 'terce' | 'sext' | 'none'): HourContext {
  return {
    hour,
    dateStr: '2026-03-15',
    dayOfWeek: 'MON',
    liturgicalDay: { season: 'LENT', psalterWeek: 1 } as LiturgicalDayInfo,
    assembledPsalms: [
      { psalmType: 'psalm', reference: 'Psalm 119:1-8', antiphon: 'A', verses: [{ verse: 1, text: 'v' }], gloriaPatri: true },
    ] as AssembledPsalm[],
    mergedPropers: {
      hymn: 'Daytime hymn',
      concludingPrayer: 'Prayer',
    } as HourPropers,
    ordinarium: {
      invitatory: {
        openingVersicle: { versicle: 'V', response: 'R' },
        invitatoryPsalms: [{ ref: 'Psalm 95:1-11', title: 'Test', stanzas: [['l1']] }],
        gloryBe: { text: 'Glory Be', shortText: 'Glory' },
      },
      invitatoryAntiphons: {
        ordinaryTime: { odd: { SUN: 'A' }, even: { SUN: 'B' } },
        advent: { default: 'A' }, christmas: { default: 'C' },
        lent: { default: 'L' }, easter: { default: 'E' }, feasts: {},
      },
      canticles: {},
      commonPrayers: {
        openingVersicle: { versicle: 'V: God', response: 'R: Help', gloryBe: 'Glory', alleluia: 'Alleluia' },
        dismissal: { priest: { greeting: { versicle: 'V', response: 'R' }, blessing: { text: 'B', response: 'A' }, dismissalVersicle: { versicle: 'V', response: 'R' } }, individual: { versicle: 'V', response: 'R' } },
      },
      complineData: {},
    },
    isFirstHourOfDay: false,
    complineData: null,
  }
}

describe('assembleDaytimePrayer', () => {
  it.each(['terce', 'sext', 'none'] as const)('%s produces correct section order', (hour) => {
    const sections = assembleDaytimePrayer(makeContext(hour))
    const types = sections.map((s) => s.type)
    expect(types).toEqual(['openingVersicle', 'hymn', 'psalmody', 'concludingPrayer', 'dismissal'])
  })

  it('never includes gospelCanticle, intercessions, ourFather', () => {
    const sections = assembleDaytimePrayer(makeContext('terce'))
    expect(sections.some((s) => s.type === 'gospelCanticle')).toBe(false)
    expect(sections.some((s) => s.type === 'intercessions')).toBe(false)
    expect(sections.some((s) => s.type === 'ourFather')).toBe(false)
  })

  it('all three hours produce identical structure', () => {
    const terce = assembleDaytimePrayer(makeContext('terce')).map((s) => s.type)
    const sext = assembleDaytimePrayer(makeContext('sext')).map((s) => s.type)
    const none = assembleDaytimePrayer(makeContext('none')).map((s) => s.type)
    expect(terce).toEqual(sext)
    expect(sext).toEqual(none)
  })
})
