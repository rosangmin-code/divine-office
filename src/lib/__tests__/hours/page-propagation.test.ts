import { describe, it, expect } from 'vitest'
import { assembleLauds } from '../../hours/lauds'
import { assembleVespers } from '../../hours/vespers'
import { assembleCompline } from '../../hours/compline'
import { assembleDaytimePrayer } from '../../hours/daytime-prayer'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers } from '../../types'
import type { ComplineData } from '../../psalter-loader'

function makeContext(overrides: Partial<HourContext> = {}): HourContext {
  return {
    hour: 'lauds',
    dateStr: '2026-03-15',
    dayOfWeek: 'SUN',
    liturgicalDay: { season: 'LENT', psalterWeek: 1 } as LiturgicalDayInfo,
    assembledPsalms: [
      { psalmType: 'psalm', reference: 'Psalm 63:2-9', antiphon: 'Test', verses: [{ verse: 2, text: 'verse' }], gloriaPatri: true, page: 58 },
    ] as AssembledPsalm[],
    mergedPropers: {
      hymn: 'Test hymn text',
      hymnPage: 42,
      responsory: { versicle: 'V', response: 'R', page: 66 },
      gospelCanticleAntiphon: 'Canticle ant',
      gospelCanticleAntiphonPage: 70,
      intercessions: ['Prayer 1', 'Prayer 2'],
      intercessionsPage: 68,
      concludingPrayer: 'Concluding text',
      concludingPrayerPage: 71,
      shortReading: { ref: 'Rev 7:9-12', text: 'Reading text', page: 65 },
    } as HourPropers,
    ordinarium: {
      invitatory: {
        openingVersicle: { versicle: 'V: Open', response: 'R: Response' },
        invitatoryPsalms: [{ ref: 'Psalm 95:1-11', title: 'Test', stanzas: [['l1']] }],
        gloryBe: { text: 'Glory Be', shortText: 'Glory' },
      },
      invitatoryAntiphons: {
        ordinaryTime: { odd: { SUN: 'OT odd SUN' }, even: { SUN: 'OT even SUN' } },
        advent: { default: 'Advent' }, christmas: { default: 'Christmas' },
        lent: { default: 'Lent ant' }, easter: { default: 'Easter' }, feasts: {},
      },
      canticles: { benedictus: { ref: 'Luke 1:68-79', titleMn: 'Benedictus' } },
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

describe('page number propagation', () => {
  describe('assembleLauds', () => {
    it('propagates page to hymn section', () => {
      const sections = assembleLauds(makeContext())
      const hymn = sections.find(s => s.type === 'hymn')
      expect(hymn).toBeDefined()
      if (hymn?.type === 'hymn') expect(hymn.page).toBe(42)
    })

    it('propagates page to responsory section', () => {
      const sections = assembleLauds(makeContext())
      const resp = sections.find(s => s.type === 'responsory')
      expect(resp).toBeDefined()
      if (resp?.type === 'responsory') expect(resp.page).toBe(66)
    })

    it('propagates page to intercessions section', () => {
      const sections = assembleLauds(makeContext())
      const inter = sections.find(s => s.type === 'intercessions')
      expect(inter).toBeDefined()
      if (inter?.type === 'intercessions') expect(inter.page).toBe(68)
    })

    it('propagates page to concludingPrayer section', () => {
      const sections = assembleLauds(makeContext())
      const prayer = sections.find(s => s.type === 'concludingPrayer')
      expect(prayer).toBeDefined()
      if (prayer?.type === 'concludingPrayer') expect(prayer.page).toBe(71)
    })

    it('propagates page to shortReading section', () => {
      const sections = assembleLauds(makeContext())
      const reading = sections.find(s => s.type === 'shortReading')
      expect(reading).toBeDefined()
      if (reading?.type === 'shortReading') expect(reading.page).toBe(65)
    })

    it('psalm pages are carried via assembledPsalms', () => {
      const sections = assembleLauds(makeContext())
      const psalmody = sections.find(s => s.type === 'psalmody')
      expect(psalmody).toBeDefined()
      if (psalmody?.type === 'psalmody') {
        expect(psalmody.psalms[0].page).toBe(58)
      }
    })
  })

  describe('assembleVespers', () => {
    it('propagates page to hymn and responsory', () => {
      const sections = assembleVespers(makeContext({ hour: 'vespers', isFirstHourOfDay: false }))
      const hymn = sections.find(s => s.type === 'hymn')
      const resp = sections.find(s => s.type === 'responsory')
      if (hymn?.type === 'hymn') expect(hymn.page).toBe(42)
      if (resp?.type === 'responsory') expect(resp.page).toBe(66)
    })
  })

  describe('assembleDaytimePrayer', () => {
    it('propagates page to hymn, responsory, concludingPrayer', () => {
      const sections = assembleDaytimePrayer(makeContext({ hour: 'terce', isFirstHourOfDay: false }))
      const hymn = sections.find(s => s.type === 'hymn')
      const resp = sections.find(s => s.type === 'responsory')
      const prayer = sections.find(s => s.type === 'concludingPrayer')
      if (hymn?.type === 'hymn') expect(hymn.page).toBe(42)
      if (resp?.type === 'responsory') expect(resp.page).toBe(66)
      if (prayer?.type === 'concludingPrayer') expect(prayer.page).toBe(71)
    })
  })

  describe('assembleCompline', () => {
    it('propagates page to compline-specific sections', () => {
      const complineData: ComplineData = {
        psalms: [],
        shortReading: { ref: 'Rev 22:4-5', text: 'Text', page: 100 },
        responsory: { versicle: 'V', response: 'R', page: 101 },
        nuncDimittisAntiphon: 'Ant',
        concludingPrayer: { primary: 'Prayer', page: 102 },
        examen: 'Examen text',
        examenPage: 99,
        blessing: { text: 'Blessing', response: 'Amen', page: 103 },
        blessingPage: 103,
        marianAntiphon: [{ title: 'Salve Regina', text: 'Text', page: 104 }],
      }
      const sections = assembleCompline(makeContext({
        hour: 'compline',
        isFirstHourOfDay: false,
        complineData,
        mergedPropers: {
          hymn: 'Hymn',
          hymnPage: 98,
          shortReading: complineData.shortReading!,
          responsory: complineData.responsory!,
          gospelCanticleAntiphon: 'Ant',
          concludingPrayer: complineData.concludingPrayer!.primary,
          concludingPrayerPage: 102,
        },
      }))
      const examen = sections.find(s => s.type === 'examen')
      const blessing = sections.find(s => s.type === 'blessing')
      const marian = sections.find(s => s.type === 'marianAntiphon')
      if (examen?.type === 'examen') expect(examen.page).toBe(99)
      if (blessing?.type === 'blessing') expect(blessing.page).toBe(103)
      if (marian?.type === 'marianAntiphon') expect(marian.page).toBe(104)
    })
  })

  describe('undefined pages', () => {
    it('does not error when page fields are undefined', () => {
      const ctx = makeContext({
        mergedPropers: {
          hymn: 'Text',
          responsory: { versicle: 'V', response: 'R' },
          intercessions: ['P1'],
          concludingPrayer: 'Prayer',
        },
        assembledPsalms: [
          { psalmType: 'psalm', reference: 'Psalm 1', antiphon: '', verses: [], gloriaPatri: true },
        ],
      })
      const sections = assembleLauds(ctx)
      const hymn = sections.find(s => s.type === 'hymn')
      if (hymn?.type === 'hymn') expect(hymn.page).toBeUndefined()
    })
  })
})
