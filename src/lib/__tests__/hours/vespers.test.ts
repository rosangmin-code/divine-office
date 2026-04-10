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
      responsory: { versicle: 'V', response: 'R' },
      gospelCanticleAntiphon: 'Magnificat ant',
      intercessions: ['Int 1'],
      concludingPrayer: 'Prayer text',
    } as HourPropers,
    ordinarium: {
      invitatory: { openingVersicle: { versicle: 'V', response: 'R' }, psalms: [] },
      canticles: { magnificat: { ref: 'Luke 1:46-55', titleMn: 'Magnificat' } },
      commonPrayers: {},
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
      'hymn', 'psalmody', 'responsory',
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
