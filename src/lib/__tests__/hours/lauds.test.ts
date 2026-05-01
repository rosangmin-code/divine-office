import { describe, it, expect } from 'vitest'
import { assembleLauds } from '../../hours/lauds'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers, DayOfWeek } from '../../types'

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
      responsory: { fullResponse: 'FR', versicle: 'V', shortResponse: 'SR' },
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

  it('includes openingVersicle in both branches; marks it paired when invitatory is present', () => {
    const firstHour = assembleLauds(makeContext({ isFirstHourOfDay: true }))
    const firstOv = firstHour.find((s) => s.type === 'openingVersicle')
    expect(firstOv).toBeTruthy()
    expect(firstOv && firstOv.type === 'openingVersicle' && firstOv.pairedWithInvitatory).toBe(true)

    const laterHour = assembleLauds(makeContext({ isFirstHourOfDay: false }))
    const laterOv = laterHour.find((s) => s.type === 'openingVersicle')
    expect(laterOv).toBeTruthy()
    expect(laterOv && laterOv.type === 'openingVersicle' && laterOv.pairedWithInvitatory).toBeFalsy()
  })

  it('pairs openingVersicle after invitatory when present (GILH §266 collapse fallback)', () => {
    const types = assembleLauds(makeContext({ isFirstHourOfDay: true })).map((s) => s.type)
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

// F-2 (#214) — Solemnity-not-on-Sunday concluding-prayer auto-swap.
// Lauds shares the same rubric as Compline; helper applies uniformly.
describe('assembleLauds — F-2 concluding-prayer auto-swap (#214)', () => {
  function withPrayerCtx(opts: {
    rank: import('../../types').CelebrationRank
    season: import('../../types').LiturgicalSeason
    weekOfSeason: number
    dayOfWeek: DayOfWeek
  }): HourContext {
    return makeContext({
      dayOfWeek: opts.dayOfWeek,
      liturgicalDay: {
        season: opts.season,
        psalterWeek: 1,
        rank: opts.rank,
        weekOfSeason: opts.weekOfSeason,
      } as LiturgicalDayInfo,
      mergedPropers: {
        responsory: { fullResponse: 'FR', versicle: 'V', shortResponse: 'SR' },
        gospelCanticleAntiphon: 'A',
        intercessions: ['P1'],
        concludingPrayer: 'PRIMARY',
        concludingPrayerPage: 100,
        alternativeConcludingPrayer: 'ALTERNATE',
        alternativeConcludingPrayerPage: 200,
      } as HourPropers,
    })
  }

  function getCp(ctx: HourContext) {
    const cp = assembleLauds(ctx).find((s) => s.type === 'concludingPrayer')
    if (!cp || cp.type !== 'concludingPrayer') throw new Error('concludingPrayer missing')
    return cp
  }

  // @fr FR-NEW
  it('Sunday → primary stays primary', () => {
    const cp = getCp(withPrayerCtx({ rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 14, dayOfWeek: 'SUN' }))
    expect(cp.text).toBe('PRIMARY')
    expect(cp.alternateText).toBe('ALTERNATE')
  })

  // @fr FR-NEW
  it('Plain weekday → primary stays primary', () => {
    const cp = getCp(withPrayerCtx({ rank: 'WEEKDAY', season: 'ORDINARY_TIME', weekOfSeason: 14, dayOfWeek: 'WED' }))
    expect(cp.text).toBe('PRIMARY')
  })

  // @fr FR-NEW
  it('Weekday Solemnity → swap (alternate becomes default; page also swaps)', () => {
    const cp = getCp(withPrayerCtx({ rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 20, dayOfWeek: 'FRI' }))
    expect(cp.text).toBe('ALTERNATE')
    expect(cp.alternateText).toBe('PRIMARY')
    expect(cp.page).toBe(200)
  })

  // @fr FR-NEW
  it('Easter Octave weekday → primary stays primary', () => {
    const cp = getCp(withPrayerCtx({ rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 1, dayOfWeek: 'WED' }))
    expect(cp.text).toBe('PRIMARY')
  })
})
