import { describe, it, expect } from 'vitest'
import { assembleVespers } from '../../hours/vespers'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers } from '../../types'

function makeContext(overrides: Partial<HourContext> = {}): HourContext {
  return {
    hour: 'vespers',
    dateStr: '2026-03-15',
    dayOfWeek: 'SUN',
    liturgicalDay: { season: 'LENT', psalterWeek: 1 } as LiturgicalDayInfo,
    assembledPsalms: [
      { psalmType: 'psalm', reference: 'Psalm 110:1-5', antiphon: 'Test', verses: [{ verse: 1, text: 'v' }], gloriaPatri: true },
    ] as AssembledPsalm[],
    mergedPropers: {
      hymn: 'Vespers hymn',
      responsory: { fullResponse: 'FR', versicle: 'V', shortResponse: 'SR' },
      gospelCanticleAntiphon: 'Magnificat ant',
      intercessions: ['Int 1'],
      concludingPrayer: 'Prayer text',
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
      canticles: { magnificat: { ref: 'Luke 1:46-55', titleMn: 'Magnificat', verses: ['Verse 1', 'Verse 2'], doxology: 'Glory Be.' } },
      commonPrayers: {
        openingVersicle: { versicle: 'V: God', response: 'R: Help', gloryBe: 'Glory', alleluia: 'Alleluia' },
        dismissal: { priest: { greeting: { versicle: 'V', response: 'R' }, blessing: { text: 'B', response: 'A' }, dismissalVersicle: { versicle: 'V', response: 'R' } }, individual: { versicle: 'V', response: 'R' } },
      },
      complineData: {},
    },
    isFirstHourOfDay: false,
    complineData: null,
    ...overrides,
  }
}

describe('assembleVespers', () => {
  it('produces correct section order', () => {
    const sections = assembleVespers(makeContext())
    const types = sections.map((s) => s.type)
    expect(types).toEqual([
      'openingVersicle', 'hymn', 'psalmody', 'responsory',
      'gospelCanticle', 'intercessions', 'ourFather', 'concludingPrayer', 'dismissal',
    ])
  })

  it('never includes invitatory', () => {
    const sections = assembleVespers(makeContext())
    expect(sections.some((s) => s.type === 'invitatory')).toBe(false)
  })

  it('includes Magnificat as gospel canticle', () => {
    const sections = assembleVespers(makeContext())
    const canticle = sections.find((s) => s.type === 'gospelCanticle')
    expect(canticle).toBeDefined()
    if (canticle?.type === 'gospelCanticle') {
      expect(canticle.canticle).toBe('magnificat')
    }
  })

  it('always includes ourFather', () => {
    const sections = assembleVespers(makeContext())
    expect(sections.some((s) => s.type === 'ourFather')).toBe(true)
  })
})
