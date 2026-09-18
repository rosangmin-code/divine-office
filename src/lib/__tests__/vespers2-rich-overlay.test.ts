import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourPropers, HourSection, PrayerText } from '../types'

// @fr FR-182
//
// Evening Prayer II (`vespers2`) rich overlays. The four rich builders
// (`scripts/build-{intercessions,responsories,concluding-prayers,
// alt-concluding-prayers}-rich.mjs`) iterated `lauds / vespers / compline`
// only, so the six `w{key}-SUN-vespers2.rich.json` files carried nothing but
// `shortReadingRich` and every other section of a fully printed Second
// Vespers fell back to plain text. The builders now author `vespers2` too —
// but ONLY for cells that print their own intercessions: a partial cell
// (Ordinary-Time Sundays, Holy Family, Epiphany, Baptism, Ascension,
// Trinity — antiphon + prayer only) is composed over the EP I cell at
// runtime (FR-171) and takes its rich from the `-vespers` file through
// `seasonalFallback`; a partial `-vespers2` file would shadow that and the
// parity group rule would drop the alternate prayer's rich.

const SEASONAL = path.resolve(__dirname, '../../data/loth/prayers/seasonal')
const PROPERS = path.resolve(__dirname, '../../data/loth/propers')

type Vespers2Cell = HourPropers & {
  intercessionsPage?: number
  concludingPrayerPage?: number
  alternativeConcludingPrayerPage?: number
  responsory?: { fullResponse: string; versicle: string; shortResponse: string; page?: number }
}
type RichFile = Partial<Record<
  | 'shortReadingRich'
  | 'responsoryRich'
  | 'intercessionsRich'
  | 'concludingPrayerRich'
  | 'alternativeConcludingPrayerRich',
  PrayerText & { source?: { hour?: string } }
>>

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}
function cell(season: string, weekKey: string): Vespers2Cell {
  const propers = readJson<{ weeks: Record<string, Record<string, { vespers2?: Vespers2Cell }>> }>(
    path.join(PROPERS, `${season}.json`),
  )
  const c = propers.weeks[weekKey]?.SUN?.vespers2
  if (!c) throw new Error(`${season} weeks[${weekKey}].SUN.vespers2 missing`)
  return c
}
function richFile(season: string, weekKey: string): RichFile {
  return readJson<RichFile>(path.join(SEASONAL, season, `w${weekKey}-SUN-vespers2.rich.json`))
}
function section<T extends HourSection['type']>(
  hour: AssembledHour | null,
  type: T,
): Extract<HourSection, { type: T }> {
  const s = hour?.sections.find((x) => x.type === type)
  if (!s) throw new Error(`${type} section missing`)
  return s as Extract<HourSection, { type: T }>
}

// The six fully printed Second Vespers cells and a date each falls on.
const FULL_CELLS: Array<[season: string, weekKey: string, date: string, label: string]> = [
  ['advent', '1', '2026-11-29', '1st Sunday of Advent'],
  ['christmas', 'dec25', '2025-12-25', 'Christmas'],
  ['lent', '1', '2026-02-22', '1st Sunday of Lent'],
  ['lent', '6', '2026-03-29', 'Palm Sunday'],
  ['easter', '1', '2026-04-12', '2nd Sunday of Easter'],
  ['easter', 'pentecost', '2026-05-24', 'Pentecost'],
]

describe('FR-182 — data contract: the six full vespers2 cells carry every rich field', () => {
  it.each(FULL_CELLS)('%s w%s (%s) rich file has all five fields, hour=vespers2, pages match the cell', (season, weekKey) => {
    const c = cell(season, weekKey)
    const r = richFile(season, weekKey)
    for (const k of [
      'shortReadingRich',
      'responsoryRich',
      'intercessionsRich',
      'concludingPrayerRich',
      'alternativeConcludingPrayerRich',
    ] as const) {
      expect(r[k], k).toBeDefined()
      expect(r[k]!.blocks.length, `${k} blocks`).toBeGreaterThan(0)
    }
    expect(r.intercessionsRich!.page).toBe(c.intercessionsPage)
    expect(r.responsoryRich!.page).toBe(c.responsory!.page)
    expect(r.concludingPrayerRich!.page).toBe(c.concludingPrayerPage)
    expect(r.alternativeConcludingPrayerRich!.page).toBe(c.alternativeConcludingPrayerPage)
    for (const k of ['responsoryRich', 'intercessionsRich', 'concludingPrayerRich', 'alternativeConcludingPrayerRich'] as const) {
      expect(r[k]!.source?.hour, `${k}.source.hour`).toBe('vespers2')
    }
  })

  it('no partial vespers2 cell (antiphon + prayer only) has a -vespers2 rich file', () => {
    const offenders: string[] = []
    for (const season of ['advent', 'christmas', 'lent', 'easter', 'ordinary-time']) {
      const propers = readJson<{ weeks: Record<string, Record<string, { vespers2?: Vespers2Cell }>> }>(
        path.join(PROPERS, `${season}.json`),
      )
      for (const [weekKey, days] of Object.entries(propers.weeks)) {
        for (const [day, dp] of Object.entries(days)) {
          const v2 = dp.vespers2
          if (!v2 || Array.isArray(v2.intercessions)) continue
          const p = path.join(SEASONAL, season, `w${weekKey}-${day}-vespers2.rich.json`)
          if (fs.existsSync(p)) offenders.push(`${season}/w${weekKey}-${day}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('FR-182 — Evening Prayer II renders the rich AST for every section, plain text unchanged', () => {
  it.each(FULL_CELLS)('%s w%s — %s (%s)', async (season, weekKey, date, label) => {
    const c = cell(season, weekKey)
    const h = await assembleHour(date, 'vespers')
    expect(h, label).not.toBeNull()
    expect(h!.effectiveLiturgicalDay?.date ?? date).toBe(date)

    const inter = section(h, 'intercessions')
    expect(inter.rich, 'intercessions rich').toBeDefined()
    expect(inter.rich!.page).toBe(c.intercessionsPage)
    // Plain petitions still come from the vespers2 cell.
    const plain = JSON.stringify(inter)
    for (const item of c.intercessions as string[]) {
      expect(plain).toContain(item.slice(0, 40))
    }

    const resp = section(h, 'responsory')
    expect(resp.rich, 'responsory rich').toBeDefined()
    expect(resp.fullResponse).toBe(c.responsory!.fullResponse)
    expect(resp.versicle).toBe(c.responsory!.versicle)

    // F-2 (`resolveConcludingPrayerSwap`): on a Solemnity that is not a
    // Sunday (Christmas 2025-12-25 is a Thursday) the book's alternate
    // prayer becomes the primary. The rich must follow the same swap.
    const prayer = section(h, 'concludingPrayer')
    const swapped = prayer.text === c.alternativeConcludingPrayer
    const [primaryPlain, primaryPage, altPlain, altPage] = swapped
      ? [c.alternativeConcludingPrayer, c.alternativeConcludingPrayerPage, c.concludingPrayer, c.concludingPrayerPage]
      : [c.concludingPrayer, c.concludingPrayerPage, c.alternativeConcludingPrayer, c.alternativeConcludingPrayerPage]
    expect(prayer.text).toBe(primaryPlain)
    expect(prayer.alternateText).toBe(altPlain)
    expect(prayer.textRich, 'concludingPrayer rich').toBeDefined()
    expect(prayer.textRich!.page).toBe(primaryPage)
    expect(prayer.alternateTextRich, 'alternate prayer rich').toBeDefined()
    expect(prayer.alternateTextRich!.page).toBe(altPage)

    const sr = section(h, 'shortReading')
    expect(sr.textRich, 'short reading rich (pre-existing)').toBeDefined()
  })
})

describe('FR-182 — partial vespers2 cells keep the EP I file as rich source (regression guard)', () => {
  // Authoring `w{N}-SUN-vespers2.rich.json` with only `concludingPrayerRich`
  // for these Sundays dropped `alternateTextRich` (the alternate then came
  // from a different layer than the primary). Both must stay rich.
  it.each([
    ['2026-09-13', '24th Sunday of Ordinary Time'],
    ['2026-01-18', '2nd Sunday of Ordinary Time'],
    ['2026-12-27', 'Holy Family'],
  ])('%s (%s) vespers: primary AND alternate concluding prayer rich present', async (date) => {
    const h = await assembleHour(date, 'vespers')
    const prayer = section(h, 'concludingPrayer')
    expect(prayer.alternateText, 'alternate plain').toBeTruthy()
    expect(prayer.textRich, 'primary rich').toBeDefined()
    expect(prayer.alternateTextRich, 'alternate rich').toBeDefined()
  })
})
