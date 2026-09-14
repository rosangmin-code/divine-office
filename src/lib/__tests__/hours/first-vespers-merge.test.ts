import { describe, it, expect } from 'vitest'
import { mergeSundayFirstVespers } from '../../hours/first-vespers-merge'
import type { FirstVespersPropers, HourPropers } from '../../types'

// docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md §6-② —
// the season's Sunday EP I proper wins over the firstVespers cell's psalter
// copies for reading / responsory / intercessions / concluding prayer(s).
describe('mergeSundayFirstVespers', () => {
  const firstVespers: FirstVespersPropers = {
    psalms: [
      { type: 'psalm', ref: 'Psalm 141:1-9', antiphon_key: 'fv-w1-sun-ps1', default_antiphon: 'FV-PS1', gloria_patri: true },
    ],
    shortReading: { ref: 'Romans 11:25, 30-36', text: 'PSALTER-READING', page: 55 },
    responsory: { fullResponse: 'PSALTER-R', versicle: 'PSALTER-V', shortResponse: 'PSALTER-SR', page: 55 },
    intercessions: ['PSALTER-INT'],
    intercessionsPage: 56,
    antiphons: { 'fv-w1-sun-ps1': 'FV-OVERRIDE' },
  }

  // @fr FR-156
  it('season cell printing reading / responsory / intercessions / prayers wins those fields; psalms + antiphons stay firstVespers', () => {
    const seasonal: HourPropers = {
      shortReading: { ref: '1 Thess 5:19-24', text: 'SEASON-READING', page: 548 },
      responsory: { fullResponse: 'SEASON-R', versicle: 'SEASON-V', shortResponse: 'SEASON-SR', page: 549 },
      intercessions: ['SEASON-INT'],
      intercessionsPage: 549,
      gospelCanticleAntiphon: 'SEASON-GC',
      gospelCanticleAntiphonPage: 549,
      concludingPrayer: 'SEASON-CP',
      concludingPrayerPage: 550,
      alternativeConcludingPrayer: 'SEASON-ALT',
      alternativeConcludingPrayerPage: 550,
    }
    const merged = mergeSundayFirstVespers(seasonal, firstVespers)
    expect(merged.shortReading).toEqual(seasonal.shortReading)
    expect(merged.responsory).toEqual(seasonal.responsory)
    expect(merged.intercessions).toEqual(['SEASON-INT'])
    expect(merged.intercessionsPage).toBe(549)
    expect(merged.concludingPrayer).toBe('SEASON-CP')
    expect(merged.concludingPrayerPage).toBe(550)
    expect(merged.alternativeConcludingPrayer).toBe('SEASON-ALT')
    expect(merged.gospelCanticleAntiphon).toBe('SEASON-GC')
    expect((merged as FirstVespersPropers).psalms).toEqual(firstVespers.psalms)
    expect(merged.antiphons).toEqual(firstVespers.antiphons)
  })

  // @fr FR-156
  it('Ordinary-Time shape (season cell prints only antiphon + prayers) leaves the firstVespers reading / responsory / intercessions intact', () => {
    const seasonal: HourPropers = {
      gospelCanticleAntiphon: 'OT-GC',
      concludingPrayer: 'OT-CP',
      concludingPrayerPage: 754,
      alternativeConcludingPrayer: 'OT-ALT',
      alternativeConcludingPrayerPage: 754,
    }
    const merged = mergeSundayFirstVespers(seasonal, firstVespers)
    expect(merged.shortReading).toEqual(firstVespers.shortReading)
    expect(merged.responsory).toEqual(firstVespers.responsory)
    expect(merged.intercessions).toEqual(['PSALTER-INT'])
    expect(merged.intercessionsPage).toBe(56)
    expect(merged.concludingPrayer).toBe('OT-CP')
    expect(merged.gospelCanticleAntiphon).toBe('OT-GC')
  })

  // @fr FR-156
  it('season primary prayer without an alternate drops a firstVespers alternate (pair stays from one source) and page fields follow their text', () => {
    const fvWithPrayers: FirstVespersPropers = {
      ...firstVespers,
      concludingPrayer: 'FV-CP',
      concludingPrayerPage: 1,
      alternativeConcludingPrayer: 'FV-ALT',
      alternativeConcludingPrayerPage: 2,
    }
    const seasonal: HourPropers = { concludingPrayer: 'SEASON-CP', intercessions: ['SEASON-INT'] }
    const merged = mergeSundayFirstVespers(seasonal, fvWithPrayers)
    expect(merged.concludingPrayer).toBe('SEASON-CP')
    expect(merged.concludingPrayerPage).toBeUndefined()
    expect(merged.alternativeConcludingPrayer).toBeUndefined()
    expect(merged.alternativeConcludingPrayerPage).toBeUndefined()
    expect(merged.intercessions).toEqual(['SEASON-INT'])
    expect(merged.intercessionsPage).toBeUndefined()
  })

  // @fr FR-156
  it('no season cell → plain spread of the firstVespers cell', () => {
    const merged = mergeSundayFirstVespers(null, firstVespers)
    expect(merged).toEqual({ ...firstVespers })
  })
})
