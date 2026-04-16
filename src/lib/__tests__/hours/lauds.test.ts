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
      invitatory: {
        openingVersicle: { versicle: 'V: Open', response: 'R: Response' },
        invitatoryPsalms: [{ ref: 'Psalm 95:1-11', title: 'Test psalm', stanzas: [['line1']] }],
        gloryBe: { text: 'Glory Be', shortText: 'Glory' },
      },
      invitatoryAntiphons: {
        ordinaryTime: { odd: { SUN: 'OT odd SUN' }, even: { SUN: 'OT even SUN' } },
        advent: { default: 'Advent' }, christmas: { default: 'Christmas' },
        lent: { default: 'Lent ant' }, easter: { default: 'Easter' }, feasts: {},
      },
      canticles: { benedictus: { ref: 'Luke 1:68-79', titleMn: 'Benedictus', verses: ['Verse 1', 'Verse 2'], doxology: 'Glory Be.' } },
      commonPrayers: {
        openingVersicle: { versicle: 'V: God', response: 'R: Help', gloryBe: 'Glory', alleluia: 'Alleluia' },
        dismissal: { priest: { greeting: { versicle: 'V', response: 'R' }, blessing: { text: 'B', response: 'A' }, dismissalVersicle: { versicle: 'V', response: 'R' } }, individual: { versicle: 'V', response: 'R' } },
      },
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
      'invitatory', 'openingVersicle', 'hymn', 'psalmody', 'responsory',
      'gospelCanticle', 'intercessions', 'ourFather', 'concludingPrayer', 'dismissal',
    ])
  })

  it('always includes openingVersicle', () => {
    const sections = assembleLauds(makeContext())
    expect(sections.some((s) => s.type === 'openingVersicle')).toBe(true)
  })

  it('places openingVersicle right after invitatory when first hour', () => {
    const sections = assembleLauds(makeContext({ isFirstHourOfDay: true }))
    const types = sections.map((s) => s.type)
    expect(types[0]).toBe('invitatory')
    expect(types[1]).toBe('openingVersicle')
  })

  it('omits invitatory and starts with openingVersicle when not first hour', () => {
    const sections = assembleLauds(makeContext({ isFirstHourOfDay: false }))
    expect(sections.some((s) => s.type === 'invitatory')).toBe(false)
    expect(sections[0].type).toBe('openingVersicle')
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
