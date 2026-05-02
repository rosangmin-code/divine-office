import { describe, it, expect } from 'vitest'
import {
  assembleCompline,
  mergeComplineDefaults,
  selectSeasonalMarianIndex,
  selectSeasonalCompResponsory,
} from '../../hours/compline'
import type { HourContext } from '../../hours/types'
import type { LiturgicalDayInfo, AssembledPsalm, HourPropers, MarianAntiphonCandidate, LiturgicalSeason, DayOfWeek } from '../../types'
import type { ComplineData, SeasonalComplineResponsoryMap } from '../../psalter-loader'

const mockComplineData: ComplineData = {
  psalms: [],
  shortReading: { ref: 'Jeremiah 14:9', text: 'Direct text' },
  responsory: { fullResponse: 'CFR', versicle: 'CV', shortResponse: 'CSR' },
  seasonalResponsory: null,
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

  // @fr FR-161
  it('passes mergedPropers.gospelCanticleAntiphonRich into the gospelCanticle section (C-3a/wi-001)', () => {
    const sampleAntiphonRich = {
      blocks: [
        {
          kind: 'para' as const,
          spans: [{ kind: 'text' as const, text: 'Аллэлүяа, Аллэлүяа.' }],
        },
      ],
    }
    const sections = assembleCompline(
      makeContext({
        mergedPropers: {
          gospelCanticleAntiphon: 'Аллэлүяа, Аллэлүяа.',
          gospelCanticleAntiphonPage: 545,
          gospelCanticleAntiphonRich: sampleAntiphonRich,
        } as HourPropers,
      }),
    )
    const canticle = sections.find((s) => s.type === 'gospelCanticle')
    if (!canticle || canticle.type !== 'gospelCanticle') {
      throw new Error('gospelCanticle section missing')
    }
    expect(canticle.antiphonRich).toBe(sampleAntiphonRich)
    // Plain antiphon path still populated for legacy renderer fallback.
    expect(canticle.antiphon).toBe('Аллэлүяа, Аллэлүяа.')
  })

  // @fr FR-161
  it('leaves canticle.antiphonRich undefined when no rich overlay is present (legacy path)', () => {
    const sections = assembleCompline(makeContext())
    const canticle = sections.find((s) => s.type === 'gospelCanticle')
    if (!canticle || canticle.type !== 'gospelCanticle') {
      throw new Error('gospelCanticle section missing')
    }
    expect(canticle.antiphonRich).toBeUndefined()
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

// F-1 (task #210) — Easter Compline responsory seasonal variant selector.
// Mirrors the production data shape from
// src/data/loth/ordinarium/compline.json `seasonalResponsory`.
const productionSeasonalResponsory: SeasonalComplineResponsoryMap = {
  eastertideOctave: {
    fullResponse: 'Энэ нь Эзэний бүтээсэн өдөр тул үүнд хөгжилдөн баярлацгаая. Аллэлуяа!',
    versicle: '',
    shortResponse: '',
    page: 515,
  },
  eastertide: {
    fullResponse: 'Эзэн минь, Таны гарт би сүнсээ даатгая. Аллэлуяа, аллэлуяа!',
    versicle: 'Үнэний Тэнгэрбурхан Эзэн минь, Та биднийг зольсон.',
    shortResponse: 'Аллэлуяа, аллэлуяа!',
    page: 515,
  },
}

describe('selectSeasonalCompResponsory (F-1, task #210)', () => {
  // @fr FR-easter-NEW
  it('returns null for non-Easter seasons', () => {
    for (const season of ['ORDINARY_TIME', 'ADVENT', 'CHRISTMAS', 'LENT'] as LiturgicalSeason[]) {
      expect(
        selectSeasonalCompResponsory(productionSeasonalResponsory, season, 'WED', 1),
      ).toBeNull()
    }
  })

  // @fr FR-easter-NEW
  it('returns null when seasonalResponsory map is null/undefined', () => {
    expect(selectSeasonalCompResponsory(null, 'EASTER', 'WED', 1)).toBeNull()
    expect(selectSeasonalCompResponsory(undefined, 'EASTER', 'WED', 1)).toBeNull()
  })

  // @fr FR-easter-NEW
  it('returns null when dayOfWeek/weekOfSeason are missing', () => {
    expect(
      selectSeasonalCompResponsory(productionSeasonalResponsory, 'EASTER', undefined, 1),
    ).toBeNull()
    expect(
      selectSeasonalCompResponsory(productionSeasonalResponsory, 'EASTER', 'WED', undefined),
    ).toBeNull()
  })

  // @fr FR-easter-NEW
  it('selects Octave variant for week 1 any day (Easter Sunday + 6 weekdays)', () => {
    for (const day of ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayOfWeek[]) {
      const variant = selectSeasonalCompResponsory(
        productionSeasonalResponsory,
        'EASTER',
        day,
        1,
      )
      expect(variant?.fullResponse).toContain('Энэ нь Эзэний бүтээсэн өдөр')
    }
  })

  // @fr FR-easter-NEW
  it('selects Octave variant for week 2 SUN (Octave Sunday / Divine Mercy Sunday — closing day of Octave)', () => {
    const variant = selectSeasonalCompResponsory(
      productionSeasonalResponsory,
      'EASTER',
      'SUN',
      2,
    )
    expect(variant?.fullResponse).toContain('Энэ нь Эзэний бүтээсэн өдөр')
  })

  // @fr FR-easter-NEW
  it('selects Eastertide (post-Octave) variant for week 2 weekdays through week 7', () => {
    // 2026-04-29 = Eastertide week 4 Wed → double-Alleluia variant.
    for (const [day, week] of [
      ['MON', 2], ['TUE', 2], ['WED', 2], ['THU', 2], ['FRI', 2], ['SAT', 2],
      ['WED', 4], // 2026-04-29 specific probe
      ['SUN', 7], ['SAT', 7],
    ] as [DayOfWeek, number][]) {
      const variant = selectSeasonalCompResponsory(
        productionSeasonalResponsory,
        'EASTER',
        day,
        week,
      )
      expect(variant?.fullResponse).toContain('Аллэлуяа, аллэлуяа!')
      expect(variant?.versicle).toContain('Үнэний Тэнгэрбурхан')
      expect(variant?.shortResponse).toBe('Аллэлуяа, аллэлуяа!')
    }
  })

  // @fr FR-easter-NEW
  it('falls back to eastertide when eastertideOctave is unauthored (data degradation guard)', () => {
    const partial: SeasonalComplineResponsoryMap = {
      eastertide: productionSeasonalResponsory.eastertide,
    }
    const variant = selectSeasonalCompResponsory(partial, 'EASTER', 'WED', 1)
    expect(variant?.fullResponse).toContain('Аллэлуяа, аллэлуяа!')
  })
})

describe('mergeComplineDefaults — Easter responsory variants (F-1, task #210)', () => {
  const mockWithSeasonal: ComplineData = {
    ...mockComplineData,
    seasonalResponsory: productionSeasonalResponsory,
  }

  // @fr FR-easter-NEW
  it('Ordinary Time → uses default ordinarium responsory (no seasonal substitution)', () => {
    const result = mergeComplineDefaults(
      {},
      mockWithSeasonal,
      { season: 'ORDINARY_TIME', weekOfSeason: 14 },
      'WED',
    )
    // Default ordinarium responsory, NOT Easter variant.
    expect(result.responsory).toEqual(mockWithSeasonal.responsory)
    expect(result.responsory!.fullResponse).toBe('CFR')
  })

  // @fr FR-easter-NEW
  it('Easter Octave (week 1 WED) → substitutes Octave variant + rich overlay', () => {
    const seasonalWithRich: ComplineData = {
      ...mockComplineData,
      seasonalResponsory: {
        eastertideOctave: {
          ...productionSeasonalResponsory.eastertideOctave!,
          rich: { blocks: [{ kind: 'rubric-line', text: 'Амилалтын Найман хоногийн доторх өдрүүдэд:' }] },
        },
        eastertide: productionSeasonalResponsory.eastertide,
      },
    }
    const result = mergeComplineDefaults(
      {},
      seasonalWithRich,
      { season: 'EASTER', weekOfSeason: 1 },
      'WED',
    )
    expect(result.responsory!.fullResponse).toContain('Энэ нь Эзэний бүтээсэн өдөр')
    expect(result.responsory!.versicle).toBe('')
    expect(result.responsoryRich).toBeDefined()
    expect(result.responsoryRich!.blocks[0].kind).toBe('rubric-line')
  })

  // @fr FR-easter-NEW
  it('Eastertide post-Octave (2026-04-29 = week 4 WED) → substitutes double-Alleluia variant', () => {
    const result = mergeComplineDefaults(
      {},
      mockWithSeasonal,
      { season: 'EASTER', weekOfSeason: 4 },
      'WED',
    )
    expect(result.responsory!.fullResponse).toContain('Аллэлуяа, аллэлуяа!')
    expect(result.responsory!.versicle).toContain('Үнэний Тэнгэрбурхан')
    expect(result.responsory!.shortResponse).toBe('Аллэлуяа, аллэлуяа!')
  })

  // @fr FR-easter-NEW
  it('explicit propers responsory (sanctoral / season override) still wins over seasonal substitution', () => {
    const existing: HourPropers = {
      responsory: {
        fullResponse: 'OverrideFR',
        versicle: 'OverrideV',
        shortResponse: 'OverrideSR',
      },
    }
    const result = mergeComplineDefaults(
      existing,
      mockWithSeasonal,
      { season: 'EASTER', weekOfSeason: 1 },
      'WED',
    )
    expect(result.responsory!.fullResponse).toBe('OverrideFR')
  })

  // @fr FR-easter-NEW
  it('legacy callers (no liturgicalDay/dayOfWeek) get default ordinarium responsory (back-compat)', () => {
    const result = mergeComplineDefaults({}, mockWithSeasonal)
    expect(result.responsory!.fullResponse).toBe('CFR')
  })

  // F-1 source-aware guard (#212, post-#211 review) — Layer-4 rich-overlay
  // unconditionally seeds `responsoryRich` from commons/compline default,
  // tagged `source: { kind: 'common', id: 'compline-responsory' }`. Without
  // a source-aware check, the seasonal Easter overlay loses every overwrite
  // race in production (the bug #211 surfaced as AC-5 NOT_MET).
  // @fr FR-easter-NEW
  it('replaces commons-default responsoryRich (source.id="compline-responsory") with seasonal Easter rich', () => {
    const seasonalRich = {
      blocks: [{ kind: 'rubric-line' as const, text: 'Амилалтын улирал:' }],
    }
    const seasonalWithRich: ComplineData = {
      ...mockComplineData,
      seasonalResponsory: {
        eastertide: { ...productionSeasonalResponsory.eastertide!, rich: seasonalRich },
      },
    }
    // Simulate Layer-4 having pre-populated responsoryRich from
    // commons/compline/{DAY}.rich.json — `kind: 'common', id: 'compline-responsory'`.
    const propers: HourPropers = {
      responsoryRich: {
        blocks: [{ kind: 'para', spans: [{ kind: 'text', text: 'OLD common default' }] }],
        source: { kind: 'common', id: 'compline-responsory' },
      },
    }
    const result = mergeComplineDefaults(
      propers,
      seasonalWithRich,
      { season: 'EASTER', weekOfSeason: 4 },
      'WED',
    )
    // Seasonal Easter rich now wins over the common default (was the #211 bug).
    expect(result.responsoryRich).toBe(seasonalRich)
    expect(result.responsoryRich!.blocks[0].kind).toBe('rubric-line')
  })

  // @fr FR-easter-NEW
  it('preserves a non-default responsoryRich (e.g. sanctoral kind="sanctoral") over seasonal Easter rich', () => {
    const seasonalWithRich: ComplineData = {
      ...mockComplineData,
      seasonalResponsory: {
        eastertide: {
          ...productionSeasonalResponsory.eastertide!,
          rich: { blocks: [{ kind: 'rubric-line' as const, text: 'Амилалтын улирал:' }] },
        },
      },
    }
    const sanctoralOverride = {
      blocks: [{ kind: 'para' as const, spans: [{ kind: 'text' as const, text: 'sanctoral override' }] }],
      source: { kind: 'sanctoral' as const, celebrationId: 'st-mark', hour: 'compline' as const },
    }
    const propers: HourPropers = { responsoryRich: sanctoralOverride }
    const result = mergeComplineDefaults(
      propers,
      seasonalWithRich,
      { season: 'EASTER', weekOfSeason: 4 },
      'WED',
    )
    // Sanctoral source.kind !== 'common' → priority preserved.
    expect(result.responsoryRich).toBe(sanctoralOverride)
  })

  // @fr FR-easter-NEW
  it('preserves a common-but-non-default responsoryRich (different id) over seasonal Easter rich', () => {
    const seasonalWithRich: ComplineData = {
      ...mockComplineData,
      seasonalResponsory: {
        eastertide: {
          ...productionSeasonalResponsory.eastertide!,
          rich: { blocks: [{ kind: 'rubric-line' as const, text: 'Амилалтын улирал:' }] },
        },
      },
    }
    const otherCommon = {
      blocks: [{ kind: 'para' as const, spans: [{ kind: 'text' as const, text: 'other common' }] }],
      source: { kind: 'common' as const, id: 'some-other-common-id' },
    }
    const propers: HourPropers = { responsoryRich: otherCommon }
    const result = mergeComplineDefaults(
      propers,
      seasonalWithRich,
      { season: 'EASTER', weekOfSeason: 4 },
      'WED',
    )
    // Different common id ⇒ guard does not match ⇒ existing rich preserved.
    expect(result.responsoryRich).toBe(otherCommon)
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

// FR-161 #208 — end-to-end wiring: commons/compline/{DAY}.rich.json data
// flows through resolveRichOverlay → mergedPropers.gospelCanticleAntiphonRich
// → assembleCompline → canticle.antiphonRich. Reads the ACTUAL on-disk
// rich files (no fs mock) so we catch the production "DEAD DATA" regression
// reported in #207 — where the renderer was wired correctly but no overlay
// data ever reached it because the field was authored in the wrong file.
//
// @fr FR-161
describe('compline commons rich overlay → assembleCompline (#208 end-to-end)', () => {
  it.each(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const)(
    'reads gospelCanticleAntiphonRich from commons/compline/%s.rich.json + propagates to canticle.antiphonRich',
    async (day) => {
      // Reset module cache so resolveRichOverlay actually re-reads the
      // file each test iteration (mtime cache hold over from earlier
      // tests would otherwise mask data drift).
      const richOverlayMod = await import('../../prayers/rich-overlay')
      richOverlayMod.__resetRichOverlayCache()
      const { resolveRichOverlay } = await import('../../prayers/resolver')
      const overlay = resolveRichOverlay({
        season: 'ORDINARY_TIME',
        weekKey: '1',
        day,
        hour: 'compline',
      })
      // Authored data presence — the critical fix vs #207 DEAD DATA
      // finding (review verdict FAIL).
      expect(overlay.gospelCanticleAntiphonRich).toBeDefined()
      expect(overlay.gospelCanticleAntiphonRich!.blocks.length).toBeGreaterThan(0)
      // Page matches ordinarium nuncDimittis page (515) — proves the
      // file carries the expected default antiphon, not stale data.
      expect(overlay.gospelCanticleAntiphonRich!.page).toBe(515)
      // Source tag identifies the commons-compline origin so future
      // overlay-attribution UIs can label the antiphon source.
      const src = overlay.gospelCanticleAntiphonRich!.source as
        | { kind: string; dayKey?: string }
        | undefined
      expect(src?.kind).toBe('compline-commons')
      expect(src?.dayKey).toBe(day)

      // Feed the overlay into assembleCompline via mergedPropers — this
      // mirrors the loth-service Layer 4 spread that runs in production.
      // The assembler must surface antiphonRich on the gospelCanticle
      // section (wi-001 wired) so the renderer (this WI / #208) can
      // detect + render the rich path.
      const sections = assembleCompline(
        makeContext({
          dayOfWeek: day,
          mergedPropers: {
            gospelCanticleAntiphon: 'plain antiphon for fallback',
            gospelCanticleAntiphonPage: 515,
            gospelCanticleAntiphonRich: overlay.gospelCanticleAntiphonRich,
          } as HourPropers,
        }),
      )
      const canticle = sections.find((s) => s.type === 'gospelCanticle')
      if (!canticle || canticle.type !== 'gospelCanticle') {
        throw new Error('gospelCanticle section missing')
      }
      expect(canticle.antiphonRich).toBeDefined()
      expect(canticle.antiphonRich!.blocks.length).toBeGreaterThan(0)
      // Plain `antiphon` still populated for legacy fallback — both
      // paths carry the same logical content.
      expect(canticle.antiphon).toBe('plain antiphon for fallback')
    },
  )

  // The reverse: when the overlay JSON ships without the rich field,
  // canticle.antiphonRich must be undefined so the renderer falls back
  // to the legacy plain AntiphonBox. We synthesize this by injecting a
  // mergedPropers without the rich field — equivalent to a hypothetical
  // future overlay that drops the field.
  it('canticle.antiphonRich stays undefined when overlay lacks the field (legacy fallback)', () => {
    const sections = assembleCompline(
      makeContext({
        mergedPropers: {
          gospelCanticleAntiphon: 'plain only',
          // gospelCanticleAntiphonRich intentionally absent
        } as HourPropers,
      }),
    )
    const canticle = sections.find((s) => s.type === 'gospelCanticle')
    if (!canticle || canticle.type !== 'gospelCanticle') {
      throw new Error('gospelCanticle section missing')
    }
    expect(canticle.antiphonRich).toBeUndefined()
    expect(canticle.antiphon).toBe('plain only')
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

// ─── L2 Integration: production assembleHour() — F-1 source-aware guard (#212) ───
//
// Why integration-level — the F-1 bug (#211 AC-5 NOT_MET) only reproduces when
// Layer-4 rich-overlay (loth-service.ts) actually loads
// `src/data/loth/prayers/commons/compline/{DAY}.rich.json` and seeds
// `responsoryRich` BEFORE `mergeComplineDefaults` runs. The original unit suite
// passed mocked empty propers to `mergeComplineDefaults` directly and never
// observed the Layer-4 → Layer-8b layering, so the silent overwrite skip was
// invisible. These probes wire the real assembler with real liturgical-day
// resolution and inspect the assembled `responsory` HourSection — the exact
// shape `responsory-section.tsx:16` consumes.
import { assembleHour } from '../../loth-service'
import { isCommonSource as isCommonSrc } from '../../types'

describe('assembleHour() — Compline responsory rich propagation (F-1 #212 L2)', () => {
  const findResponsory = (sections: import('../../types').HourSection[]) =>
    sections.find((s): s is Extract<import('../../types').HourSection, { type: 'responsory' }> =>
      s.type === 'responsory',
    )

  // @fr FR-easter-NEW
  it('Easter Octave (2026-04-08 WED) → rich carries Octave rubric, NOT compline-commons default', async () => {
    const result = await assembleHour('2026-04-08', 'compline')
    expect(result).not.toBeNull()
    const responsory = findResponsory(result!.sections)
    expect(responsory).toBeDefined()
    // Plain text already substitutes correctly (the #211 partial-pass surface).
    expect(responsory!.fullResponse).toContain('Энэ нь Эзэний бүтээсэн өдөр')
    // The bug: rich was silently overwritten by Layer-4 commons default. After
    // the source-aware guard in mergeComplineDefaults, rich now carries the
    // Octave rubric block, not the default 5-block compline-responsory shape.
    expect(responsory!.rich).toBeDefined()
    expect(responsory!.rich!.blocks[0]).toMatchObject({ kind: 'rubric-line' })
    // Distinguish from the default common rich (would have source.id="compline-responsory").
    if (responsory!.rich!.source) {
      const srcOk =
        !isCommonSrc(responsory!.rich!.source) ||
        responsory!.rich!.source.id !== 'compline-responsory'
      expect(srcOk).toBe(true)
    }
  })

  // @fr FR-easter-NEW
  it('Eastertide post-Octave (2026-04-29 WED) → rich carries double-Alleluia variant, NOT compline-commons default', async () => {
    const result = await assembleHour('2026-04-29', 'compline')
    expect(result).not.toBeNull()
    const responsory = findResponsory(result!.sections)
    expect(responsory).toBeDefined()
    expect(responsory!.fullResponse).toContain('Аллэлуяа, аллэлуяа!')
    expect(responsory!.shortResponse).toBe('Аллэлуяа, аллэлуяа!')
    expect(responsory!.rich).toBeDefined()
    // Eastertide rich opens with "Амилалтын улирал:" rubric, then V/R blocks
    // including the double-Alleluia full response. Must not be the default
    // commons rich (5-block "Эзэн минь, Таны гарт..." Glory Be cue layout).
    expect(responsory!.rich!.blocks[0]).toMatchObject({
      kind: 'rubric-line',
      text: expect.stringContaining('Амилалтын улирал'),
    })
    const allBodyText = JSON.stringify(responsory!.rich!.blocks)
    expect(allBodyText).toContain('Аллэлуяа, аллэлуяа!')
    if (responsory!.rich!.source) {
      const srcOk =
        !isCommonSrc(responsory!.rich!.source) ||
        responsory!.rich!.source.id !== 'compline-responsory'
      expect(srcOk).toBe(true)
    }
  })

  // @fr FR-NEW (F-X1 #217)
  // 사용자 모바일 검증 surface — Eastertide Saturday compline Nunc Dimittis
  // antiphon must (a) carry Alleluia on the plain string path
  // (post-`mergeComplineDefaults` re-augmentation) AND (b) carry an
  // Alleluia rubric span in the rich AST (rich-side seasonal helper).
  // Non-Eastertide variant follows in the next test to guard against
  // over-augmentation.
  it('Eastertide Saturday (2026-05-02 SAT) → Nunc Dimittis antiphon carries Alleluia on plain + rich paths', async () => {
    const result = await assembleHour('2026-05-02', 'compline')
    expect(result).not.toBeNull()
    const gc = result!.sections.find((s): s is Extract<import('../../types').HourSection, { type: 'gospelCanticle' }> => s.type === 'gospelCanticle')
    expect(gc).toBeDefined()
    // Plain path — `mergeComplineDefaults` fills `gospelCanticleAntiphon`
    // from compline.json (NO Alleluia in source) AFTER Layer 5; the
    // post-merge re-augmentation must re-fire the helper so the plain
    // string ends with Alleluia.
    expect(gc!.antiphon).toMatch(/Аллэлуяа!\s*$/)
    // Rich path — `applySeasonalAntiphonRich` appends a rubric span to
    // the last para block. The renderer (`gospel-canticle-section.tsx`)
    // surfaces this as red + upright (PDF parenthetical convention).
    expect(gc!.antiphonRich).toBeDefined()
    const lastBlock = gc!.antiphonRich!.blocks[gc!.antiphonRich!.blocks.length - 1]
    expect(lastBlock.kind).toBe('para')
    if (lastBlock.kind !== 'para') throw new Error('expected para')
    const lastSpan = lastBlock.spans[lastBlock.spans.length - 1]
    expect(lastSpan).toEqual({ kind: 'rubric', text: 'Аллэлуяа!' })
    // The penultimate span is the leading-space text-span injected by
    // `applySeasonalAntiphonRich` so the rubric does not run into the
    // body.
    const penult = lastBlock.spans[lastBlock.spans.length - 2]
    expect(penult).toEqual({ kind: 'text', text: ' ' })
  })

  // @fr FR-NEW (F-X1 #217)
  it('non-Easter Saturday compline (e.g. ORDINARY_TIME) → Nunc Dimittis antiphon does NOT carry Alleluia', async () => {
    // 2026-08-15 falls in ORDINARY_TIME but is the Assumption Solemnity
    // (Saturday) — pick a vanilla OT Saturday instead. 2026-08-29 is
    // SAT in week 22 of OT (no movable feast typically).
    const result = await assembleHour('2026-08-29', 'compline')
    expect(result).not.toBeNull()
    const gc = result!.sections.find((s): s is Extract<import('../../types').HourSection, { type: 'gospelCanticle' }> => s.type === 'gospelCanticle')
    expect(gc).toBeDefined()
    // Plain — should NOT have Alleluia appended.
    expect(gc!.antiphon).not.toMatch(/Аллэлуяа/i)
    // Rich — should be untouched (no rubric Alleluia span injected).
    expect(gc!.antiphonRich).toBeDefined()
    const allText = JSON.stringify(gc!.antiphonRich)
    expect(allText).not.toMatch(/Аллэлуяа/i)
  })

  // @fr FR-easter-NEW
  it('non-Easter season (2026-08-12 WED, ORDINARY_TIME) → rich preserved as compline-commons default (no regression)', async () => {
    const result = await assembleHour('2026-08-12', 'compline')
    expect(result).not.toBeNull()
    const responsory = findResponsory(result!.sections)
    expect(responsory).toBeDefined()
    // Default ordinarium responsory body — source-aware guard MUST NOT fire
    // outside EASTER (selectSeasonalCompResponsory returns null).
    expect(responsory!.rich).toBeDefined()
    // Layer-4 commons rich is the authoritative non-Easter source.
    expect(isCommonSrc(responsory!.rich!.source)).toBe(true)
    if (isCommonSrc(responsory!.rich!.source)) {
      expect(responsory!.rich!.source.id).toBe('compline-responsory')
    }
  })
})

// ─── F-2 (#214) — concluding-prayer Solemnity-not-on-Sunday auto-swap ───
//
// PDF rubric "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр" (Or: Solemnity
// not on Sunday) flips the alternate concluding prayer into the default slot
// for weekday-Solemnities. Sister rubric "Ням гарагуудад болон амилалтын
// найм хоногийн үеэр" (On Sundays AND during Easter Octave) keeps the
// primary on Octave weekdays even though romcal flags each Octave day as
// rank=SOLEMNITY.
import {
  shouldUseAlternateConcludingPrayer,
  buildConcludingPrayerFields,
} from '../../hours/concluding-prayer'

describe('shouldUseAlternateConcludingPrayer (F-2, #214)', () => {
  // @fr FR-NEW
  it('Sunday Compline (rank=SOLEMNITY by mappings.ts: SUNDAY → SOLEMNITY) → primary (no swap)', () => {
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 14 } as LiturgicalDayInfo,
        'SUN',
      ),
    ).toBe(false)
  })

  // @fr FR-NEW
  it('Weekday (rank=WEEKDAY) → primary (no swap)', () => {
    for (const day of ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayOfWeek[]) {
      expect(
        shouldUseAlternateConcludingPrayer(
          { rank: 'WEEKDAY', season: 'ORDINARY_TIME', weekOfSeason: 14 } as LiturgicalDayInfo,
          day,
        ),
      ).toBe(false)
    }
  })

  // @fr FR-NEW
  it('Weekday Solemnity (e.g. 2026-08-15 Assumption = Friday) → swap (alternate becomes default)', () => {
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 20 } as LiturgicalDayInfo,
        'FRI',
      ),
    ).toBe(true)
    // Same day-of-week with FEAST/MEMORIAL rank → no swap (rubric is rank-gated).
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'FEAST', season: 'ORDINARY_TIME', weekOfSeason: 20 } as LiturgicalDayInfo,
        'FRI',
      ),
    ).toBe(false)
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'MEMORIAL', season: 'ORDINARY_TIME', weekOfSeason: 20 } as LiturgicalDayInfo,
        'FRI',
      ),
    ).toBe(false)
  })

  // @fr FR-NEW
  it('Easter Octave weekdays (week 1 MON-SAT, rank=SOLEMNITY) → primary (no swap; sister rubric)', () => {
    for (const day of ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayOfWeek[]) {
      expect(
        shouldUseAlternateConcludingPrayer(
          { rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 1 } as LiturgicalDayInfo,
          day,
        ),
      ).toBe(false)
    }
  })

  // @fr FR-NEW
  it('Eastertide post-Octave weekday Solemnity (e.g. 2026-04-29 Catherine of Siena, week 4) → swap', () => {
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 4 } as LiturgicalDayInfo,
        'WED',
      ),
    ).toBe(true)
  })

  // @fr FR-NEW
  it('Easter Sunday (week 1, rank=SOLEMNITY, dayOfWeek=SUN) → primary (Sunday rubric wins)', () => {
    expect(
      shouldUseAlternateConcludingPrayer(
        { rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 1 } as LiturgicalDayInfo,
        'SUN',
      ),
    ).toBe(false)
  })
})

describe('buildConcludingPrayerFields (F-2, #214)', () => {
  const richA = { blocks: [{ kind: 'para' as const, spans: [{ kind: 'text' as const, text: 'AAA' }] }] }
  const richB = { blocks: [{ kind: 'para' as const, spans: [{ kind: 'text' as const, text: 'BBB' }] }] }

  // @fr FR-NEW
  it('swap=false → primary in default slot, alternate preserved', () => {
    const fields = buildConcludingPrayerFields({
      primaryText: 'P', primaryRich: richA, primaryPage: 100,
      alternateText: 'A', alternateRich: richB, alternatePage: 200,
    }, false)
    expect(fields.text).toBe('P')
    expect(fields.textRich).toBe(richA)
    expect(fields.page).toBe(100)
    expect(fields.alternateText).toBe('A')
    expect(fields.alternateTextRich).toBe(richB)
  })

  // @fr FR-NEW
  it('swap=true with alternate authored → alternate ↔ primary swap (text + rich + page)', () => {
    const fields = buildConcludingPrayerFields({
      primaryText: 'P', primaryRich: richA, primaryPage: 100,
      alternateText: 'A', alternateRich: richB, alternatePage: 200,
    }, true)
    expect(fields.text).toBe('A')
    expect(fields.textRich).toBe(richB)
    expect(fields.page).toBe(200)
    expect(fields.alternateText).toBe('P')
    expect(fields.alternateTextRich).toBe(richA)
  })

  // @fr FR-NEW
  it('swap=true but no alternate authored → graceful fallback (primary stays primary)', () => {
    const fields = buildConcludingPrayerFields({
      primaryText: 'P', primaryRich: richA, primaryPage: 100,
    }, true)
    expect(fields.text).toBe('P')
    expect(fields.textRich).toBe(richA)
    expect(fields.page).toBe(100)
    expect(fields.alternateText).toBeUndefined()
    expect(fields.alternateTextRich).toBeUndefined()
  })

  // @fr FR-NEW
  it('swap=true alternatePage missing but primaryPage present → falls back to primary page after swap', () => {
    const fields = buildConcludingPrayerFields({
      primaryText: 'P', primaryPage: 100,
      alternateText: 'A',
    }, true)
    expect(fields.text).toBe('A')
    expect(fields.page).toBe(100)
  })
})

describe('assembleCompline — F-2 concluding-prayer auto-swap (#214)', () => {
  function ctxWithPrayers(opts: {
    rank: import('../../types').CelebrationRank
    season: LiturgicalSeason
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
        concludingPrayer: 'PRIMARY prayer body',
        concludingPrayerPage: 516,
        alternativeConcludingPrayer: 'ALTERNATE prayer body',
        alternativeConcludingPrayerPage: 516,
      } as HourPropers,
    })
  }

  function getConcluding(ctx: HourContext) {
    const sections = assembleCompline(ctx)
    const cp = sections.find((s) => s.type === 'concludingPrayer')
    if (!cp || cp.type !== 'concludingPrayer') {
      throw new Error('concludingPrayer section missing')
    }
    return cp
  }

  // @fr FR-NEW
  it('Sunday Compline (rank=SOLEMNITY, dayOfWeek=SUN) → primary stays primary', () => {
    const cp = getConcluding(
      ctxWithPrayers({ rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 14, dayOfWeek: 'SUN' }),
    )
    expect(cp.text).toBe('PRIMARY prayer body')
    expect(cp.alternateText).toBe('ALTERNATE prayer body')
  })

  // @fr FR-NEW
  it('Plain weekday (rank=WEEKDAY) → primary stays primary', () => {
    const cp = getConcluding(
      ctxWithPrayers({ rank: 'WEEKDAY', season: 'ORDINARY_TIME', weekOfSeason: 14, dayOfWeek: 'WED' }),
    )
    expect(cp.text).toBe('PRIMARY prayer body')
    expect(cp.alternateText).toBe('ALTERNATE prayer body')
  })

  // @fr FR-NEW
  it('Weekday Solemnity (Friday, e.g. 2026-08-15 Assumption) → alternate becomes default; primary moves to alternate slot', () => {
    const cp = getConcluding(
      ctxWithPrayers({ rank: 'SOLEMNITY', season: 'ORDINARY_TIME', weekOfSeason: 20, dayOfWeek: 'FRI' }),
    )
    expect(cp.text).toBe('ALTERNATE prayer body')
    expect(cp.alternateText).toBe('PRIMARY prayer body')
  })

  // @fr FR-NEW
  it('Easter Octave weekday (week 1 WED, rank=SOLEMNITY) → primary stays primary (sister rubric)', () => {
    const cp = getConcluding(
      ctxWithPrayers({ rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 1, dayOfWeek: 'WED' }),
    )
    expect(cp.text).toBe('PRIMARY prayer body')
    expect(cp.alternateText).toBe('ALTERNATE prayer body')
  })

  // @fr FR-NEW
  it('Eastertide post-Octave weekday Solemnity (week 4 WED, rank=SOLEMNITY) → swap fires', () => {
    const cp = getConcluding(
      ctxWithPrayers({ rank: 'SOLEMNITY', season: 'EASTER', weekOfSeason: 4, dayOfWeek: 'WED' }),
    )
    expect(cp.text).toBe('ALTERNATE prayer body')
    expect(cp.alternateText).toBe('PRIMARY prayer body')
  })

  // @fr FR-NEW
  it('Weekday Solemnity but only primary authored (no alternate) → graceful: primary stays as default (no empty section)', () => {
    const ctx = makeContext({
      dayOfWeek: 'FRI',
      liturgicalDay: {
        season: 'ORDINARY_TIME',
        psalterWeek: 1,
        rank: 'SOLEMNITY',
        weekOfSeason: 20,
      } as LiturgicalDayInfo,
      mergedPropers: {
        concludingPrayer: 'ONLY primary',
        concludingPrayerPage: 100,
        // no alternative*
      } as HourPropers,
    })
    const sections = assembleCompline(ctx)
    const cp = sections.find((s) => s.type === 'concludingPrayer')
    if (!cp || cp.type !== 'concludingPrayer') throw new Error('missing')
    expect(cp.text).toBe('ONLY primary')
    expect(cp.alternateText).toBeUndefined()
  })

  // @fr FR-NEW
  // Compline-specific: alternate flows from complineData.concludingPrayer.alternate
  // when mergedPropers.alternativeConcludingPrayer is unset (legacy fallback).
  it('compline alternate fallback from complineData.concludingPrayer.alternate participates in swap', () => {
    const dataWithAlt: ComplineData = {
      ...mockComplineData,
      concludingPrayer: { primary: 'C-PRIMARY', alternate: 'C-ALT', page: 516 },
    }
    const sections = assembleCompline(
      makeContext({
        dayOfWeek: 'FRI',
        liturgicalDay: {
          season: 'ORDINARY_TIME',
          psalterWeek: 1,
          rank: 'SOLEMNITY',
          weekOfSeason: 20,
        } as LiturgicalDayInfo,
        mergedPropers: {
          concludingPrayer: 'C-PRIMARY',
          // no alternativeConcludingPrayer — complineData fallback should win
        } as HourPropers,
        complineData: dataWithAlt,
      }),
    )
    const cp = sections.find((s) => s.type === 'concludingPrayer')
    if (!cp || cp.type !== 'concludingPrayer') throw new Error('missing')
    expect(cp.text).toBe('C-ALT')
    expect(cp.alternateText).toBe('C-PRIMARY')
  })
})
