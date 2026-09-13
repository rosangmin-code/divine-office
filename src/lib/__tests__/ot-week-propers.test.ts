import { describe, it, expect } from 'vitest'
import { getCalendarForYear, getLiturgicalDay } from '../calendar'
import { assembleHour } from '../loth-service'
import { resolveSpecialKey } from '../propers-loader'
import ordinaryTime from '../../data/loth/propers/ordinary-time.json'
import type { AssembledHour, HourSection } from '../types'

// P0-1 (docs/bug-reports/2026-09-13-ot-sunday-propers-weekofseason.md).
//
// `propers/ordinary-time.json weeks[1..34]` is authored by the LITURGICAL
// Ordinary-Time week (cross-checked against the missal collects: weeks[1]
// "청원을 들으시어 해야 할 일을 알게 하시고", weeks[2] "하늘과 땅을 다스리시는…
// 우리 시대에 평화를", weeks[5] "모든 희망을 주님께 두오니", weeks[13] "빛의
// 자녀로 부르셨으니"). Before the fix `LiturgicalDayInfo.weekOfSeason` for
// OT days was a season COUNTER (1 on the Monday after the Baptism of the
// Lord, restarting at 1 on the Monday after Pentecost), so the 13th Sunday
// (2026-06-28) rendered weeks[5] and the 24th Sunday (2026-09-13) rendered
// weeks[16] / first vespers weeks[17]. `calendar.ts` now sets
// `weekOfSeason = otWeek` for every ORDINARY_TIME day so all consumers
// (propers, seasonal rich overlays, hymn rotation, first-vespers nextWeek)
// use the liturgical week.

type HourCell = {
  concludingPrayer?: string
  gospelCanticleAntiphon?: string
}
type SundayCell = {
  lauds?: HourCell
  vespers?: HourCell
  firstVespers?: HourCell
}
const OT_WEEKS = ordinaryTime.weeks as unknown as Record<string, { SUN?: SundayCell }>

const NUMBERED_OT_SUNDAY = /^\d+(st|nd|rd|th) Sunday of Ordinary Time$/

function section<T extends HourSection['type']>(
  hour: AssembledHour | null,
  type: T,
): Extract<HourSection, { type: T }> | undefined {
  return hour?.sections.find((s) => s.type === type) as Extract<HourSection, { type: T }> | undefined
}

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay() === 0
}

describe('Ordinary Time weekOfSeason is the liturgical week (P0-1)', () => {
  // @fr FR-006
  it('2025-01-01..2028-12-31: every ORDINARY_TIME day has otWeek in 1..34 and weekOfSeason === otWeek; no other season carries otWeek', () => {
    let otDays = 0
    for (const year of [2025, 2026, 2027, 2028]) {
      for (const day of getCalendarForYear(year)) {
        if (day.season !== 'ORDINARY_TIME') {
          expect(day.otWeek, `${day.date} (${day.season}) must not carry otWeek`).toBeUndefined()
          continue
        }
        otDays++
        expect(day.otWeek, day.date).toBeGreaterThanOrEqual(1)
        expect(day.otWeek, day.date).toBeLessThanOrEqual(34)
        expect(day.weekOfSeason, day.date).toBe(day.otWeek)
      }
    }
    // ~33 OT weeks × 7 days × 4 years — guards against a silent empty sweep.
    expect(otDays).toBeGreaterThan(800)
  })

  // @fr FR-006
  it('post-Pentecost Monday does not restart at week 1 (2026-05-25 = OT week 8; 2026-09-13 = OT week 24)', () => {
    expect(getLiturgicalDay('2026-05-25')?.weekOfSeason).toBe(8)
    expect(getLiturgicalDay('2026-09-13')?.weekOfSeason).toBe(24)
    // Early OT: the Monday after the Baptism of the Lord is week 1, and the
    // following Sunday is the 2nd Sunday (there is no "1st Sunday" of OT).
    expect(getLiturgicalDay('2026-01-12')?.weekOfSeason).toBe(1)
    expect(getLiturgicalDay('2026-01-18')?.weekOfSeason).toBe(2)
  })
})

describe('Ordinary Time Sunday propers follow the liturgical week (P0-1)', () => {
  // @fr FR-030
  it.each([2026, 2027])('%i: every numbered OT Sunday Lauds concluding prayer is weeks[otWeek].SUN.lauds; movable-solemnity Sundays use their special-key block', async (year) => {
    const sundays = getCalendarForYear(year).filter(
      (d) => d.season === 'ORDINARY_TIME' && isSunday(d.date),
    )
    expect(sundays.length).toBeGreaterThan(25)

    let numbered = 0
    for (const day of sundays) {
      const lauds = await assembleHour(day.date, 'lauds')
      expect(lauds, day.date).not.toBeNull()
      const prayer = section(lauds, 'concludingPrayer')
      const canticle = section(lauds, 'gospelCanticle')
      const specialKey = resolveSpecialKey(day.season, day.name, day.date)

      if (NUMBERED_OT_SUNDAY.test(day.name)) {
        numbered++
        const expected = OT_WEEKS[String(day.otWeek)]?.SUN?.lauds
        expect(expected?.concludingPrayer, `${day.date} weeks[${day.otWeek}]`).toBeTruthy()
        expect(prayer?.text, `${day.date} ${day.name} (otWeek ${day.otWeek})`).toBe(expected!.concludingPrayer)
        if (expected!.gospelCanticleAntiphon) {
          expect(canticle?.antiphon, `${day.date} Benedictus antiphon`).toContain(expected!.gospelCanticleAntiphon)
        }
      } else if (specialKey) {
        // Trinity Sunday / Corpus Christi / Christ the King — the numeric
        // week must NOT leak in; the special-key block's own antiphon (and,
        // where authored, concluding prayer) is rendered.
        const special = OT_WEEKS[specialKey]?.SUN?.lauds
        expect(special?.gospelCanticleAntiphon, `${day.date} ${specialKey}`).toBeTruthy()
        expect(canticle?.antiphon, `${day.date} ${day.name}`).toContain(special!.gospelCanticleAntiphon!)
        if (special!.concludingPrayer) {
          expect(prayer?.text, `${day.date} ${day.name}`).toBe(special!.concludingPrayer)
        }
        const numeric = OT_WEEKS[String(day.otWeek)]?.SUN?.lauds
        expect(prayer?.text, `${day.date} must not use weeks[${day.otWeek}]`).not.toBe(numeric?.concludingPrayer)
      }
      // Other Sundays (fixed-date solemnities that displace the Sunday, e.g.
      // 2026-11-01 All Saints, 2027-08-15 Assumption) are sanctoral-driven
      // and out of scope here.
    }
    expect(numbered).toBeGreaterThanOrEqual(26)
  })

  // @fr FR-032
  it('2026-09-12 (Sat) vespers and 2026-09-13 firstVespers carry the 24th Sunday Magnificat antiphon (Mt 18:21-35, "долоон удаа")', async () => {
    const expected = OT_WEEKS['24'].SUN!.vespers!.gospelCanticleAntiphon!
    expect(expected).toContain('долоон удаа')

    const saturdayVespers = await assembleHour('2026-09-12', 'vespers')
    expect(section(saturdayVespers, 'gospelCanticle')?.antiphon).toContain(expected)

    const sundayFirstVespers = await assembleHour('2026-09-13', 'firstVespers')
    expect(section(sundayFirstVespers, 'gospelCanticle')?.antiphon).toContain(expected)

    // The headline symptom: 24th Sunday Lauds rendered weeks[16] before the fix.
    const sundayLauds = await assembleHour('2026-09-13', 'lauds')
    expect(section(sundayLauds, 'concludingPrayer')?.text).toBe(OT_WEEKS['24'].SUN!.lauds!.concludingPrayer)
    expect(section(sundayLauds, 'concludingPrayer')?.text).not.toBe(OT_WEEKS['16'].SUN!.lauds!.concludingPrayer)
  })

  // @fr FR-032
  it('boundary: 2026-01-17 (Sat, OT week 1) evening is the 2nd Sunday First Vespers (weeks[2])', async () => {
    expect(getLiturgicalDay('2026-01-17')?.weekOfSeason).toBe(1)
    expect(getLiturgicalDay('2026-01-18')?.weekOfSeason).toBe(2)
    const expected = OT_WEEKS['2'].SUN!.vespers!.gospelCanticleAntiphon!
    expect(expected.length).toBeGreaterThan(0)

    const saturdayVespers = await assembleHour('2026-01-17', 'vespers')
    expect(section(saturdayVespers, 'gospelCanticle')?.antiphon).toContain(expected)

    const sundayFirstVespers = await assembleHour('2026-01-18', 'firstVespers')
    expect(section(sundayFirstVespers, 'gospelCanticle')?.antiphon).toContain(expected)
    expect(section(await assembleHour('2026-01-18', 'lauds'), 'concludingPrayer')?.text)
      .toBe(OT_WEEKS['2'].SUN!.lauds!.concludingPrayer)
  })

  // @fr FR-032
  it('boundary: 2026-05-30 (Sat after Pentecost, OT week 8) evening is Trinity Sunday First Vespers (special key, not weeks[9])', async () => {
    expect(getLiturgicalDay('2026-05-30')?.weekOfSeason).toBe(8)
    expect(getLiturgicalDay('2026-05-31')?.weekOfSeason).toBe(9)
    const expected = OT_WEEKS.trinitySunday.SUN!.firstVespers!.gospelCanticleAntiphon!
    expect(expected.length).toBeGreaterThan(0)

    const saturdayVespers = await assembleHour('2026-05-30', 'vespers')
    expect(section(saturdayVespers, 'gospelCanticle')?.antiphon).toContain(expected)

    const trinityFirstVespers = await assembleHour('2026-05-31', 'firstVespers')
    expect(section(trinityFirstVespers, 'gospelCanticle')?.antiphon).toContain(expected)
  })
})
