import { describe, it, expect } from 'vitest'
import { assembleCompline, mergeComplineDefaults, selectSeasonalMarianIndex } from '../../hours/compline'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers, MarianAntiphonCandidate, LiturgicalSeason } from '../../types'
import type { ComplineData } from '../../psalter-loader'

const mockComplineData: ComplineData = {
  psalms: [],
  shortReading: { ref: 'Jeremiah 14:9', text: 'Direct text' },
  responsory: { fullResponse: 'CFR', versicle: 'CV', shortResponse: 'CSR' },
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
      responsory: { fullResponse: 'CFR', versicle: 'CV', shortResponse: 'CSR' },
      gospelCanticleAntiphon: 'Nunc ant',
      concludingPrayer: 'Primary prayer',
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
      canticles: { nuncDimittis: { ref: 'Luke 2:29-32', titleMn: 'Nunc Dimittis', verses: ['Verse 1', 'Verse 2'], doxology: 'Glory Be.' } },
      commonPrayers: {
        openingVersicle: { versicle: 'V: God', response: 'R: Help', gloryBe: 'Glory', alleluia: 'Alleluia' },
        dismissal: { priest: { greeting: { versicle: 'V', response: 'R' }, blessing: { text: 'B', response: 'A' }, dismissalVersicle: { versicle: 'V', response: 'R' } }, individual: { versicle: 'V', response: 'R' } },
      },
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
      'openingVersicle', 'examen', 'hymn', 'psalmody', 'shortReading', 'responsory',
      'gospelCanticle', 'concludingPrayer', 'blessing', 'marianAntiphon',
    ])
  })

  it('starts with openingVersicle', () => {
    const sections = assembleCompline(makeContext())
    expect(sections[0].type).toBe('openingVersicle')
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
      responsory: { fullResponse: 'CustomFR', versicle: 'CustomV', shortResponse: 'CustomSR' },
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

// FR-easter-3 (task #205) — season-aware Marian default selector.
// Mirrors the production data shape from src/data/loth/ordinarium/compline.json
// `anteMarian` so the test reflects what assembleCompline actually receives.
const productionMarians: MarianAntiphonCandidate[] = [
  { title: 'Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу', text: 'Salve Regina (Mn)', page: 544 },
  { title: 'Аврагчийн хайрт эх', text: 'Alma Redemptoris (Mn)', page: 544 },
  { title: 'Тэнгэрийн Хатан', text: 'Regina Caeli (Mn) Аллэлуяа!', page: 545 },
  { title: 'Амар амгалан Мариа', text: 'Hail Mary (Mn)', page: 545 },
]

describe('selectSeasonalMarianIndex (FR-easter-3, #205)', () => {
  it('returns Salve Regina (idx 0) for ORDINARY_TIME', () => {
    expect(selectSeasonalMarianIndex('ORDINARY_TIME', productionMarians)).toBe(0)
  })

  it('returns Regina Caeli (Тэнгэрийн Хатан, idx 2) for EASTER', () => {
    expect(selectSeasonalMarianIndex('EASTER', productionMarians)).toBe(2)
  })

  it('returns Alma Redemptoris (Аврагчийн хайрт эх, idx 1) for ADVENT', () => {
    expect(selectSeasonalMarianIndex('ADVENT', productionMarians)).toBe(1)
  })

  it('returns Alma Redemptoris (idx 1) for CHRISTMAS (shared with Advent)', () => {
    expect(selectSeasonalMarianIndex('CHRISTMAS', productionMarians)).toBe(1)
  })

  it('falls back to Salve Regina (idx 0) for LENT when Ave Regina is not authored', () => {
    // Production Mongolian PDF lacks Ave Regina as of 2026 (out-of-scope per
    // dispatch #205 C-2). Fallback should be Salve Regina, not a missed match.
    expect(selectSeasonalMarianIndex('LENT', productionMarians)).toBe(0)
  })

  it('matches Ave Regina (LENT) when authored in candidates', () => {
    const lentSet: MarianAntiphonCandidate[] = [
      { title: 'Salve Regina', text: 's' },
      { title: 'Ave Regina Caelorum', text: 'ar' },
    ]
    expect(selectSeasonalMarianIndex('LENT', lentSet)).toBe(1)
  })

  it('matches Regina Caeli by Latin/English title (case-insensitive)', () => {
    const latinSet: MarianAntiphonCandidate[] = [
      { title: 'Salve Regina', text: 's' },
      { title: 'Regina Caeli', text: 'rc' },
    ]
    expect(selectSeasonalMarianIndex('EASTER', latinSet)).toBe(1)
  })

  it('matches Alma Redemptoris by Latin title', () => {
    const latinSet: MarianAntiphonCandidate[] = [
      { title: 'Salve Regina', text: 's' },
      { title: 'Alma Redemptoris Mater', text: 'alma' },
    ]
    expect(selectSeasonalMarianIndex('ADVENT', latinSet)).toBe(1)
  })

  it('returns 0 when undefined season passed', () => {
    expect(selectSeasonalMarianIndex(undefined, productionMarians)).toBe(0)
  })

  it('returns 0 when candidates list is empty', () => {
    expect(selectSeasonalMarianIndex('EASTER', [])).toBe(0)
  })

  it('returns 0 when candidates is undefined', () => {
    expect(selectSeasonalMarianIndex('EASTER', undefined)).toBe(0)
  })

  it('returns 0 when target season has no matching candidate', () => {
    const minimalSet: MarianAntiphonCandidate[] = [
      { title: 'Salve Regina', text: 's' },
    ]
    expect(selectSeasonalMarianIndex('EASTER', minimalSet)).toBe(0)
  })

  it('does not crash on candidates with empty title', () => {
    const oddSet: MarianAntiphonCandidate[] = [
      { title: '', text: '' },
      { title: 'Тэнгэрийн Хатан', text: 'rc' },
    ]
    expect(selectSeasonalMarianIndex('EASTER', oddSet)).toBe(1)
  })

  it('first match wins among multiple Easter candidates', () => {
    // Тэнгэрийн Хатан is checked before "Аллэлуяа", so an entry whose title
    // contains the primary needle is preferred over an Аллэлуяа-only title.
    const easterSet: MarianAntiphonCandidate[] = [
      { title: 'Salve Regina', text: 's' },
      { title: 'Аллэлуяа Hymn (placeholder)', text: 'a' },
      { title: 'Тэнгэрийн Хатан', text: 'rc' },
    ]
    expect(selectSeasonalMarianIndex('EASTER', easterSet)).toBe(2)
  })
})

describe('assembleCompline — seasonal Marian selection (FR-easter-3, #205)', () => {
  function withMarians(season: LiturgicalSeason): HourContext {
    const seasonalComplineData: ComplineData = {
      ...mockComplineData,
      marianAntiphon: productionMarians,
    }
    return {
      hour: 'compline',
      dateStr: '2026-04-29',
      dayOfWeek: 'WED',
      liturgicalDay: { season, psalterWeek: 1 } as LiturgicalDayInfo,
      assembledPsalms: [
        { psalmType: 'psalm', reference: 'Psalm 91', antiphon: 'A', verses: [{ verse: 1, text: 'v' }], gloriaPatri: true },
      ] as AssembledPsalm[],
      mergedPropers: {} as HourPropers,
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
        canticles: { nuncDimittis: { ref: 'Luke 2:29-32', titleMn: 'Nunc Dimittis', verses: ['Verse 1'], doxology: 'Glory Be.' } },
        commonPrayers: {
          openingVersicle: { versicle: 'V', response: 'R', gloryBe: 'G', alleluia: 'A' },
        },
        complineData: {},
      },
      isFirstHourOfDay: false,
      complineData: seasonalComplineData,
    }
  }

  function getMarianSection(season: LiturgicalSeason) {
    const sections = assembleCompline(withMarians(season))
    const marian = sections.find((s) => s.type === 'marianAntiphon')
    if (!marian || marian.type !== 'marianAntiphon') {
      throw new Error('marianAntiphon section missing')
    }
    return marian
  }

  it('EASTER → Regina Caeli (Тэнгэрийн Хатан) at idx 2', () => {
    const m = getMarianSection('EASTER')
    expect(m.title).toBe('Тэнгэрийн Хатан')
    expect(m.selectedIndex).toBe(2)
    expect(m.page).toBe(545)
  })

  it('ADVENT → Alma Redemptoris (Аврагчийн хайрт эх) at idx 1', () => {
    const m = getMarianSection('ADVENT')
    expect(m.title).toBe('Аврагчийн хайрт эх')
    expect(m.selectedIndex).toBe(1)
  })

  it('CHRISTMAS → Alma Redemptoris (idx 1, shared with Advent)', () => {
    const m = getMarianSection('CHRISTMAS')
    expect(m.title).toBe('Аврагчийн хайрт эх')
    expect(m.selectedIndex).toBe(1)
  })

  it('ORDINARY_TIME → Salve Regina default at idx 0', () => {
    const m = getMarianSection('ORDINARY_TIME')
    expect(m.title).toBe('Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу')
    expect(m.selectedIndex).toBe(0)
  })

  it('LENT (no Ave Regina authored) → Salve Regina fallback at idx 0', () => {
    const m = getMarianSection('LENT')
    expect(m.selectedIndex).toBe(0)
  })

  it('preserves all candidates so renderer dropdown still lists every option', () => {
    const m = getMarianSection('EASTER')
    expect(m.candidates).toHaveLength(productionMarians.length)
    expect(m.candidates?.map((c) => c.title)).toEqual(
      productionMarians.map((c) => c.title),
    )
  })
})
