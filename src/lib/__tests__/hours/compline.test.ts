import { describe, it, expect } from 'vitest'
import { assembleCompline, mergeComplineDefaults } from '../../hours/compline'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers } from '../../types'
import type { ComplineData } from '../../psalter-loader'

const mockComplineData: ComplineData = {
  psalms: [],
  shortReading: { ref: 'Jeremiah 14:9', text: 'Direct text' },
  responsory: { versicle: 'CV', response: 'CR' },
  nuncDimittisAntiphon: 'Nunc ant',
  concludingPrayer: { primary: 'Primary prayer' },
  examen: 'Examen text',
  blessing: { text: 'Blessing text', response: 'Amen' },
  marianAntiphon: [{ title: 'Salve Regina', text: 'Salve text' }],
}

function makeContext(overrides: Partial<HourContext> = {}): HourContext {
  return {
    hour: 'compline',
    dateStr: '2026-03-15',
    dayOfWeek: 'SUN',
    liturgicalDay: { season: 'LENT', psalterWeek: 1 } as LiturgicalDayInfo,
    assembledPsalms: [
      { psalmType: 'psalm', reference: 'Psalm 91', antiphon: 'A', verses: [{ verse: 1, text: 'v' }], gloriaPatri: true },
    ] as AssembledPsalm[],
    mergedPropers: {
      hymn: 'Compline hymn',
      shortReading: { ref: 'Jeremiah 14:9', text: 'Direct text' },
      responsory: { versicle: 'CV', response: 'CR' },
      gospelCanticleAntiphon: 'Nunc ant',
      concludingPrayer: 'Primary prayer',
    } as HourPropers,
    ordinarium: {
      invitatory: { openingVersicle: { versicle: 'V', response: 'R' }, psalms: [] },
      canticles: { nuncDimittis: { ref: 'Luke 2:29-32', titleMn: 'Nunc Dimittis' } },
      commonPrayers: {},
      complineData: {},
    },
    isFirstHourOfDay: false,
    complineData: mockComplineData,
    ...overrides,
  }
}

describe('assembleCompline', () => {
  it('produces correct section order', () => {
    const sections = assembleCompline(makeContext())
    const types = sections.map((s) => s.type)
    expect(types).toEqual([
      'examen', 'hymn', 'psalmody', 'shortReading', 'responsory',
      'gospelCanticle', 'concludingPrayer', 'blessing', 'marianAntiphon',
    ])
  })

  it('starts with examen', () => {
    const sections = assembleCompline(makeContext())
    expect(sections[0].type).toBe('examen')
  })

  it('ends with marianAntiphon', () => {
    const sections = assembleCompline(makeContext())
    expect(sections[sections.length - 1].type).toBe('marianAntiphon')
  })

  it('has blessing instead of dismissal', () => {
    const sections = assembleCompline(makeContext())
    expect(sections.some((s) => s.type === 'blessing')).toBe(true)
    expect(sections.some((s) => s.type === 'dismissal')).toBe(false)
  })

  it('never includes intercessions or ourFather', () => {
    const sections = assembleCompline(makeContext())
    expect(sections.some((s) => s.type === 'intercessions')).toBe(false)
    expect(sections.some((s) => s.type === 'ourFather')).toBe(false)
  })
})

describe('mergeComplineDefaults', () => {
  it('fills missing shortReading from complineData', () => {
    const result = mergeComplineDefaults({}, mockComplineData)
    expect(result.shortReading).toEqual(mockComplineData.shortReading)
  })

  it('fills missing responsory from complineData', () => {
    const result = mergeComplineDefaults({}, mockComplineData)
    expect(result.responsory).toEqual(mockComplineData.responsory)
  })

  it('fills missing gospelCanticleAntiphon from nuncDimittisAntiphon', () => {
    const result = mergeComplineDefaults({}, mockComplineData)
    expect(result.gospelCanticleAntiphon).toBe('Nunc ant')
  })

  it('fills missing concludingPrayer from complineData.primary', () => {
    const result = mergeComplineDefaults({}, mockComplineData)
    expect(result.concludingPrayer).toBe('Primary prayer')
  })

  it('does not override existing propers', () => {
    const existing: HourPropers = {
      shortReading: { ref: 'Custom:1:1' },
      responsory: { versicle: 'CustomV', response: 'CustomR' },
      gospelCanticleAntiphon: 'Custom ant',
      concludingPrayer: 'Custom prayer',
    }
    const result = mergeComplineDefaults(existing, mockComplineData)
    expect(result.shortReading!.ref).toBe('Custom:1:1')
    expect(result.responsory!.versicle).toBe('CustomV')
    expect(result.gospelCanticleAntiphon).toBe('Custom ant')
    expect(result.concludingPrayer).toBe('Custom prayer')
  })
})
