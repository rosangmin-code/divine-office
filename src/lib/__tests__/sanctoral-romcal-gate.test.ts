import { describe, it, expect } from 'vitest'
import { getCalendarForYear, getLiturgicalDay } from '../calendar'
import { assembleHour, getHoursSummary, isFirstVespersEligibleDate } from '../loth-service'
import { getSeasonHourPropers } from '../propers-loader'
import { resolveSanctoralForDay } from '../sanctoral-resolver'
import solemnities from '../../data/loth/sanctoral/solemnities.json'
import feasts from '../../data/loth/sanctoral/feasts.json'
import memorials from '../../data/loth/sanctoral/memorials.json'
import type { AssembledHour, HourSection, LiturgicalDayInfo, SanctoralEntry } from '../types'

// P0-3 (docs/bug-reports/2026-09-13-sunday-solemnity-sanctoral-override.md).
//
// `RANK_MAP` folds romcal's SUNDAY into SOLEMNITY, and every sanctoral lookup
// used the MM-DD alone. So a Sunday that merely shares its MM-DD with a
// fixed-date solemnity rendered the solemnity (2028-03-19 3rd Sunday of Lent
// → "Гэгээн Иосеф", 2030-12-08 2nd Sunday of Advent → Immaculate Conception,
// 2035-03-25 Easter Sunday → Annunciation) while the date romcal transferred
// the solemnity to (2028-03-20, 2030-12-09, 2035-04-02) rendered as a plain
// weekday. `sanctoral-resolver.ts` now applies an entry only when romcal
// chose that celebration for the date (`romcalType` / `romcalKey` preserved
// on `LiturgicalDayInfo`), finding transferred entries via the data-side
// `romcalKey` meta field.

const SOL = solemnities as Record<string, SanctoralEntry>
const FEA = feasts as Record<string, SanctoralEntry>
const MEM = memorials as Record<string, SanctoralEntry>

function section<T extends HourSection['type']>(
  hour: AssembledHour | null,
  type: T,
): Extract<HourSection, { type: T }> | undefined {
  return hour?.sections.find((s) => s.type === type) as Extract<HourSection, { type: T }> | undefined
}

function day(dateStr: string): LiturgicalDayInfo {
  const d = getLiturgicalDay(dateStr)
  if (!d) throw new Error(`no liturgical day for ${dateStr}`)
  return d
}

async function laudsPrayer(dateStr: string): Promise<string | undefined> {
  return section(await assembleHour(dateStr, 'lauds'), 'concludingPrayer')?.text
}

describe('romcal-gated sanctoral resolution (P0-3)', () => {
  // @fr FR-001
  it('LiturgicalDayInfo carries romcal type/key (SUNDAY is distinguishable from SOLEMNITY)', () => {
    expect(day('2028-03-19')).toMatchObject({ romcalType: 'SUNDAY', romcalKey: '3rdSundayOfLent', rank: 'SOLEMNITY' })
    expect(day('2028-03-20')).toMatchObject({ romcalType: 'SOLEMNITY', romcalKey: 'josephHusbandOfMary' })
    expect(day('2027-03-25')).toMatchObject({ romcalType: 'TRIDUUM', romcalKey: 'holyThursday' })
    expect(day('2026-09-13')).toMatchObject({ romcalType: 'SUNDAY', romcalKey: '24thSundayOfOrdinaryTime' })
  })

  // @fr FR-007
  it('a Sunday that shares its MM-DD with a solemnity keeps the Sunday (2028-03-19 / 2030-12-08 / 2035-03-25)', async () => {
    const cases = [
      { date: '2028-03-19', label: 'Дөч хоногийн цаг улирлын 3-р Ням', entry: SOL['03-19'] },
      { date: '2030-12-08', label: 'Ирэлтийн цаг улирлын 2-р Ням', entry: SOL['12-08'] },
      { date: '2035-03-25', label: 'Дээгүүр өнгөрөх цаг улирлын 1-р Ням', entry: SOL['03-25'] },
    ]
    for (const { date, label, entry } of cases) {
      const d = day(date)
      expect(d.nameMn, date).toBe(label)
      expect(d.nameMn, date).not.toBe(entry.name)
      const prayer = await laudsPrayer(date)
      expect(prayer, date).toBeTruthy()
      expect(prayer, date).not.toBe(entry.lauds?.concludingPrayer)
      // The Sunday's own season propers are rendered instead.
      const seasonal = getSeasonHourPropers(d.season, d.weekOfSeason, 'SUN', 'lauds', date, d.name)
      expect(prayer, date).toBe(seasonal?.concludingPrayer)
    }
  })

  // @fr FR-040
  it('the transferred solemnity renders on the date romcal moved it to (2028-03-20 Joseph, 2030-12-09 Immaculate Conception, Annunciation 2027-04-05 / 2029-04-09 / 2035-04-02)', async () => {
    const cases = [
      { date: '2028-03-20', entry: SOL['03-19'] },
      { date: '2030-12-09', entry: SOL['12-08'] },
      { date: '2027-04-05', entry: SOL['03-25'] },
      { date: '2029-04-09', entry: SOL['03-25'] },
      { date: '2035-04-02', entry: SOL['03-25'] },
    ]
    for (const { date, entry } of cases) {
      const d = day(date)
      expect(d.rank, date).toBe('SOLEMNITY')
      expect(d.nameMn, date).toBe(entry.name)
      expect(await laudsPrayer(date), date).toBe(entry.lauds?.concludingPrayer)
      expect(isFirstVespersEligibleDate(date), date).toBe(true)
      const fv = await assembleHour(date, 'firstVespers')
      expect(section(fv, 'gospelCanticle')?.antiphon, date).toContain(entry.firstVespers?.gospelCanticleAntiphon)
    }
  })

  // @fr FR-007
  it('a Triduum day sharing the MM-DD is not the solemnity (2027-03-25 Holy Thursday ≠ Annunciation)', async () => {
    const d = day('2027-03-25')
    expect(d.nameMn).toBe('Дөч хоногийн цаг улирлын 6-р долоо хоног')
    expect(await laudsPrayer('2027-03-25')).not.toBe(SOL['03-25'].lauds?.concludingPrayer)
  })

  // @fr FR-040
  it('positive: a solemnity/feast romcal keeps on its Sunday still applies (2025-06-29 Peter & Paul, 2026-11-01 All Saints, 2025-09-14 Exaltation)', async () => {
    const cases = [
      { date: '2025-06-29', entry: SOL['06-29'] },
      { date: '2026-11-01', entry: SOL['11-01'] },
      { date: '2025-09-14', entry: FEA['09-14'] },
    ]
    for (const { date, entry } of cases) {
      const d = day(date)
      expect(d.romcalType, date).toMatch(/^(SOLEMNITY|FEAST)$/)
      expect(d.nameMn, date).toBe(entry.name)
      expect(await laudsPrayer(date), date).toBe(entry.lauds?.concludingPrayer)
    }
  })

  // @fr FR-160-B-7
  it('All Souls keeps displacing an Ordinary-Time Sunday (outranksSunday; romcal 1.3 reports a plain SUNDAY on 2025-11-02 / 2031-11-02)', async () => {
    for (const date of ['2025-11-02', '2031-11-02']) {
      const d = day(date)
      expect(d.romcalType, date).toBe('SUNDAY')
      expect(d.nameMn, date).toBe(MEM['11-02'].name)
      expect(await laudsPrayer(date), date).toBe(MEM['11-02'].lauds?.concludingPrayer)
    }
    // Weekday All Souls resolves through its romcal key (FEAST allSouls).
    expect(day('2026-11-02')).toMatchObject({ romcalType: 'FEAST', romcalKey: 'allSouls', nameMn: MEM['11-02'].name })
  })

  // @fr FR-007
  it('2024..2036 sweep: temporale days never carry a sanctoral name (All Souls Sunday excepted) and every keyed solemnity/feast resolves to its entry', () => {
    const keyed = new Map<string, SanctoralEntry>()
    for (const table of [SOL, FEA, MEM]) {
      for (const entry of Object.values(table)) if (entry.romcalKey) keyed.set(entry.romcalKey, entry)
    }
    expect(keyed.size).toBe(14)
    const sanctoralNames = new Set([...keyed.values()].map((e) => e.name))

    const temporaleHits: string[] = []
    const keyedMisses: string[] = []
    for (let year = 2024; year <= 2036; year++) {
      for (const d of getCalendarForYear(year)) {
        if (['SUNDAY', 'FERIA', 'HOLY_WEEK', 'TRIDUUM'].includes(d.romcalType ?? '')) {
          if (sanctoralNames.has(d.nameMn) && !(d.romcalType === 'SUNDAY' && d.nameMn === MEM['11-02'].name)) {
            temporaleHits.push(`${d.date} ${d.romcalKey} ${d.nameMn}`)
          }
        }
        const entry = d.romcalKey ? keyed.get(d.romcalKey) : undefined
        if (entry && d.nameMn !== entry.name) keyedMisses.push(`${d.date} ${d.romcalKey} ${d.nameMn}`)
      }
    }
    expect(temporaleHits).toEqual([])
    expect(keyedMisses).toEqual([])
  })

  // @fr FR-NEW (#230 F-X5)
  it('eve handling around a transferred Joseph (2028): Saturday 03-18 has no Joseph First Vespers, the Lenten Sunday keeps its II Vespers cards, Monday 03-20 carries the Joseph First Vespers', async () => {
    // Saturday 03-18: eve of the 3rd Sunday of Lent, not of St Joseph.
    expect(getHoursSummary('2028-03-18')?.hours.map((h) => h.type)).toEqual(['lauds'])
    expect(isFirstVespersEligibleDate('2028-03-18')).toBe(false)
    const saturdayVespers = await assembleHour('2028-03-18', 'vespers')
    expect(section(saturdayVespers, 'gospelCanticle')?.antiphon).not.toContain(SOL['03-19'].firstVespers!.gospelCanticleAntiphon!)
    expect(section(saturdayVespers, 'concludingPrayer')?.text).not.toBe(SOL['03-19'].firstVespers?.concludingPrayer)

    // Sunday 03-19: privileged Lenten Sunday — its own cards stay.
    expect(getHoursSummary('2028-03-19')?.hours.map((h) => h.type)).toEqual([
      'firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline',
    ])
    const sundayFirstVespers = await assembleHour('2028-03-19', 'firstVespers')
    expect(section(sundayFirstVespers, 'gospelCanticle')?.antiphon).not.toContain(SOL['03-19'].firstVespers!.gospelCanticleAntiphon!)

    // Monday 03-20: St Joseph (transferred) — First Vespers via romcal key.
    expect(getHoursSummary('2028-03-20')?.hours.map((h) => h.type)).toEqual([
      'firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline',
    ])
    const josephFirstVespers = await assembleHour('2028-03-20', 'firstVespers')
    expect(section(josephFirstVespers, 'gospelCanticle')?.antiphon).toContain(SOL['03-19'].firstVespers!.gospelCanticleAntiphon!)
  })
})

// Regression surfaced by the transfer index: the vespers eve branch of
// `assembleHour` (FR-156 "tomorrow is a Solemnity/Feast with First Vespers")
// started finding the Monday solemnity romcal transferred off a privileged
// Sunday, so 2027-04-04 (2nd Sunday of Easter) rendered the Annunciation
// First Vespers instead of its own Evening Prayer II. Universal Norms n. 61
// / Table of Liturgical Days: Sundays of Advent / Lent / Easter (I.2)
// outrank a Solemnity (I.3), and `getHoursSummary` already protects them
// (#240). The body now applies the same `keepsSundayEveningPrayerII` rule.
describe('privileged Sunday keeps its Evening Prayer II over a Monday solemnity First Vespers', () => {
  // @fr FR-011
  it.each([
    { date: '2027-04-04', label: '2nd Sunday of Easter → Annunciation (transferred to 04-05)', entry: SOL['03-25'] },
    { date: '2028-03-19', label: '3rd Sunday of Lent → St Joseph (transferred to 03-20)', entry: SOL['03-19'] },
    { date: '2030-12-08', label: '2nd Sunday of Advent → Immaculate Conception (transferred to 12-09)', entry: SOL['12-08'] },
  ])('$date $label: vespers is the Sunday II Vespers and the cards agree', async ({ date, entry }) => {
    const d = day(date)
    // romcal types the 2nd Sunday of Easter (Divine Mercy) as SOLEMNITY, the
    // others as SUNDAY — the guard keys on dayOfWeek + privileged season.
    expect(['SUNDAY', 'SOLEMNITY']).toContain(d.romcalType)
    expect(new Date(date + 'T00:00:00Z').getUTCDay()).toBe(0)
    expect(['ADVENT', 'LENT', 'EASTER']).toContain(d.season)
    const vespers = await assembleHour(date, 'vespers')
    const antiphon = section(vespers, 'gospelCanticle')?.antiphon
    const prayer = section(vespers, 'concludingPrayer')?.text
    // Not the solemnity's First Vespers…
    expect(antiphon, date).not.toContain(entry.firstVespers!.gospelCanticleAntiphon!)
    expect(prayer, date).not.toBe(entry.firstVespers?.concludingPrayer)
    // …but the Sunday's own seasonal Evening Prayer II propers.
    const sundayRegular = getSeasonHourPropers(d.season, d.weekOfSeason, 'SUN', 'vespers', date, d.name)
    expect(sundayRegular?.gospelCanticleAntiphon, date).toBeTruthy()
    expect(antiphon, date).toContain(sundayRegular!.gospelCanticleAntiphon!)
    expect(prayer, date).toBe(sundayRegular?.concludingPrayer)
    // Card list and body agree: the Sunday keeps vespers + compline.
    expect(getHoursSummary(date)?.hours.map((h) => h.type), date).toEqual([
      'firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline',
    ])
  })

  // @fr FR-011
  it('non-privileged Sunday still yields to the Monday First Vespers (2026-09-13 → Exaltation of the Cross) and the Advent → Christmas boundary still yields (2028-12-24 → Christmas)', async () => {
    const otSunday = await assembleHour('2026-09-13', 'vespers')
    expect(section(otSunday, 'gospelCanticle')?.antiphon).toContain(FEA['09-14'].firstVespers!.gospelCanticleAntiphon!)
    expect(getHoursSummary('2026-09-13')?.hours.map((h) => h.type)).toEqual(['firstVespers', 'firstCompline', 'lauds'])

    expect(day('2028-12-24')).toMatchObject({ season: 'ADVENT', romcalType: 'SUNDAY' })
    const adventSunday = await assembleHour('2028-12-24', 'vespers')
    expect(section(adventSunday, 'gospelCanticle')?.antiphon).toContain(SOL['12-25'].firstVespers!.gospelCanticleAntiphon!)
    expect(getHoursSummary('2028-12-24')?.hours.map((h) => h.type)).toEqual(['firstVespers', 'firstCompline', 'lauds'])
  })
})

describe('resolveSanctoralForDay (unit)', () => {
  const base = { date: '2028-03-19', season: 'LENT' as const, rank: 'SOLEMNITY' as const }

  // @fr FR-040
  it('legacy callers without romcal metadata keep the MM-DD lookup', () => {
    expect(resolveSanctoralForDay(base)?.key).toBe('03-19')
    expect(resolveSanctoralForDay({ ...base, rank: 'WEEKDAY' })).toBeNull()
  })

  // @fr FR-009
  it('temporale types block the MM-DD entry; All Souls on an ORDINARY_TIME Sunday is the only exception', () => {
    expect(resolveSanctoralForDay({ ...base, romcalType: 'SUNDAY', romcalKey: '3rdSundayOfLent' })).toBeNull()
    expect(resolveSanctoralForDay({ date: '2027-03-25', season: 'LENT', rank: 'SOLEMNITY', romcalType: 'TRIDUUM', romcalKey: 'holyThursday' })).toBeNull()
    expect(resolveSanctoralForDay({ date: '2025-11-02', season: 'ORDINARY_TIME', rank: 'SOLEMNITY', romcalType: 'SUNDAY', romcalKey: '31stSundayOfOrdinaryTime' })?.key).toBe('11-02')
    // The exception is scoped to Ordinary Time: a privileged Sunday is never displaced.
    expect(resolveSanctoralForDay({ date: '2025-11-02', season: 'ADVENT', rank: 'SOLEMNITY', romcalType: 'SUNDAY', romcalKey: '1stSundayOfAdvent' })).toBeNull()
  })

  // @fr FR-040
  it('a sanctoral romcal type resolves by matching key on the MM-DD, or by key on the transferred date', () => {
    expect(resolveSanctoralForDay({ ...base, romcalType: 'SOLEMNITY', romcalKey: 'josephHusbandOfMary' })?.key).toBe('03-19')
    // Same MM-DD, but romcal celebrates something else (e.g. an Easter-octave day on 03-25).
    expect(resolveSanctoralForDay({ date: '2008-03-25', season: 'EASTER', rank: 'SOLEMNITY', romcalType: 'SOLEMNITY', romcalKey: 'easterTuesday' })).toBeNull()
    const transferred = resolveSanctoralForDay({ date: '2028-03-20', season: 'LENT', rank: 'SOLEMNITY', romcalType: 'SOLEMNITY', romcalKey: 'josephHusbandOfMary' })
    expect(transferred?.key).toBe('03-19')
    expect(transferred?.entry.name).toBe(SOL['03-19'].name)
  })
})
