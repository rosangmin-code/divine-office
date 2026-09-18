import { describe, it, expect } from 'vitest'
import { getLiturgicalDay } from '../calendar'
import { assembleHour, getHoursSummary } from '../loth-service'
import {
  getSeasonHourPropers,
  getSeasonVespers2,
  resolveSpecialKey,
} from '../propers-loader'
import christmasPropers from '../../data/loth/propers/christmas.json'
import ordinaryTimePropers from '../../data/loth/propers/ordinary-time.json'
import type { AssembledHour, HourSection, LiturgicalDayInfo } from '../types'

// GOAL #268 — docs/research/2026-09-16-sunday-vespers2.md,
// docs/bug-reports/2026-09-16-sunday-vespers2-epiphany.md.
//
// Three bugs, one family: the Sunday's own `/vespers` re-used the Evening
// Prayer I cell (FR-171), the Epiphany formulary was unreachable because
// `resolveSpecialKey` matched romcal's display name rather than its key
// (FR-172), and the legacy eve URL of a Feast of the Lord on a Sunday
// (Holy Family, Baptism) disagreed with the card list (FR-173).

type Weeks = Record<string, Record<string, Record<string, unknown>>>
const CHRISTMAS = (christmasPropers as { weeks: Weeks }).weeks
const OT = (ordinaryTimePropers as { weeks: Weeks }).weeks

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

function cell(weeks: Weeks, key: string, hour: string): Record<string, unknown> {
  const c = weeks[key]?.SUN?.[hour] as Record<string, unknown> | undefined
  if (!c) throw new Error(`missing propers cell weeks.${key}.SUN.${hour}`)
  return c
}

// ─────────────────────────────────────────────────────────────────────────
// FR-172 — special-key resolution keys on romcal's stable `key`
// ─────────────────────────────────────────────────────────────────────────

describe('FR-172 resolveSpecialKey — romcalKey first, exact-name fallback', () => {
  // @fr FR-172
  it('resolves the Christmas variable-date observances by romcal key', () => {
    expect(resolveSpecialKey('CHRISTMAS', 'Epiphany', undefined, 'epiphany')).toBe('epiphany')
    expect(resolveSpecialKey('CHRISTMAS', 'Holy Family', undefined, 'holyFamily')).toBe('holyFamily')
    expect(resolveSpecialKey('CHRISTMAS', 'Baptism of the Lord', undefined, 'baptismOfTheLord')).toBe('baptism')
  })

  // @fr FR-172
  it('still resolves from the display name alone (mocked fixtures keep working)', () => {
    // romcal 1.3's actual string — the pre-GOAL-#268 substring gates
    // ('epiphany of the lord' / 'the epiphany') never matched it.
    expect(resolveSpecialKey('CHRISTMAS', 'Epiphany')).toBe('epiphany')
    expect(resolveSpecialKey('CHRISTMAS', 'The Epiphany of the Lord')).toBe('epiphany')
    expect(resolveSpecialKey('CHRISTMAS', 'Holy Family')).toBe('holyFamily')
  })

  // @fr FR-172
  it('does NOT swallow the post-Epiphany weekdays (they are a different formulary)', () => {
    // Name alone (no date): nothing to resolve — must not become 'epiphany'.
    expect(resolveSpecialKey('CHRISTMAS', 'Monday after Epiphany')).toBeNull()
    // With a date the weekday resolves to ITS OWN formulary (FR-181,
    // `weeks.epiphanyWeek`, p.611) — still never to 'epiphany'.
    expect(resolveSpecialKey('CHRISTMAS', 'Saturday after Epiphany', '2026-01-10')).toBe('epiphanyWeek')
    expect(resolveSpecialKey('CHRISTMAS', 'Saturday after Epiphany', '2026-01-10', 'saturdayAfterEpiphany')).toBe('epiphanyWeek')
  })

  // @fr FR-172
  it('romcal really does emit the bare name + key (calendar contract)', () => {
    for (const date of ['2026-01-04', '2027-01-03', '2028-01-02']) {
      expect(day(date), date).toMatchObject({ name: 'Epiphany', romcalKey: 'epiphany', rank: 'SOLEMNITY' })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// FR-172 — the Epiphany formulary is reachable on the Solemnity itself
// ─────────────────────────────────────────────────────────────────────────

describe('FR-172 Epiphany renders its own propers (2026 / 2027 / 2028)', () => {
  const EPIPHANY_DATES = ['2026-01-04', '2027-01-03', '2028-01-02']

  // @fr FR-172
  it.each(EPIPHANY_DATES)('%s Lauds: Benedictus antiphon + concluding prayer are the Epiphany cell (p.609)', async (date) => {
    const lauds = await assembleHour(date, 'lauds')
    const antiphon = section(lauds, 'gospelCanticle')?.antiphon
    const prayer = section(lauds, 'concludingPrayer')
    const data = cell(CHRISTMAS, 'epiphany', 'lauds')
    expect(antiphon, date).toBeTruthy()
    expect(antiphon, date).toBe(data.gospelCanticleAntiphon)
    expect(section(lauds, 'gospelCanticle')?.antiphonPage, date).toBe(609)
    expect(prayer?.text, date).toBeTruthy()
    expect(prayer?.text, date).toBe(data.concludingPrayer)
    expect(prayer?.page, date).toBe(609)
  })

  // @fr FR-172
  it.each(EPIPHANY_DATES)('%s Vespers: the Magnificat antiphon is Evening Prayer II (p.610)', async (date) => {
    const vespers = await assembleHour(date, 'vespers')
    const antiphon = section(vespers, 'gospelCanticle')?.antiphon
    const data = cell(CHRISTMAS, 'epiphany', 'vespers2')
    expect(antiphon, date).toBeTruthy()
    expect(antiphon, date).toBe(data.gospelCanticleAntiphon)
    expect(section(vespers, 'gospelCanticle')?.antiphonPage, date).toBe(610)
    expect(section(vespers, 'concludingPrayer')?.text, date).toBe(data.concludingPrayer)
  })

  // @fr FR-172
  it.each(EPIPHANY_DATES)('%s First Vespers: the Magnificat antiphon is Evening Prayer I (p.609)', async (date) => {
    const fv = await assembleHour(date, 'firstVespers')
    const antiphon = section(fv, 'gospelCanticle')?.antiphon
    const data = cell(CHRISTMAS, 'epiphany', 'vespers')
    expect(antiphon, date).toBeTruthy()
    expect(antiphon, date).toBe(data.gospelCanticleAntiphon)
    expect(section(fv, 'gospelCanticle')?.antiphonPage, date).toBe(609)
    expect(section(fv, 'concludingPrayer')?.text, date).toBe(data.concludingPrayer)
  })

  // @fr FR-172
  it.each([
    // Eves whose own day is an ordinary Christmas-season day. 2028-01-01 is
    // excluded on purpose: the eve there is 1 January (Mary, Mother of God,
    // a Solemnity with its own sanctoral Second Vespers), and promoting
    // Epiphany's First Vespers over it would need a
    // `weeks['epiphany'].SUN.firstVespers` cell the book does not print
    // separately — see the bug report's "left unfixed" section.
    { date: '2026-01-04', eve: '2026-01-03' },
    { date: '2027-01-03', eve: '2027-01-02' },
  ])('$eve evening sings the Epiphany Evening Prayer I of $date', async ({ eve }) => {
    const veg = await assembleHour(eve, 'vespers')
    const data = cell(CHRISTMAS, 'epiphany', 'vespers')
    expect(section(veg, 'gospelCanticle')?.antiphon, eve).toBe(data.gospelCanticleAntiphon)
    expect(section(veg, 'concludingPrayer')?.text, eve).toBe(data.concludingPrayer)
  })

  // @fr FR-172
  it('the Epiphany bucket holds the Solemnity and `epiphanyWeek` the days after it', () => {
    // p.609-610: ЭЗЭНИЙ ИЛРЭХҮЙ · Их баяр — no short reading printed.
    expect(cell(CHRISTMAS, 'epiphany', 'lauds').shortReading).toBeUndefined()
    expect(cell(CHRISTMAS, 'epiphany', 'vespers2')).toBeTruthy()
    // p.611-615: ЭЗЭНИЙ ИЛРЭХҮЙН ДАРААХ ДОЛОО ХОНОГ — Isa 4:2-3 / Eph 2:3b-5.
    expect((cell(CHRISTMAS, 'epiphanyWeek', 'lauds').shortReading as { ref: string }).ref).toBe('Isa 4:2-3')
    expect((cell(CHRISTMAS, 'epiphanyWeek', 'vespers').shortReading as { ref: string }).ref).toBe('Eph 2:3b-5')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// FR-171 — the Sunday's own Evening Prayer renders Evening Prayer II
// ─────────────────────────────────────────────────────────────────────────

describe('FR-171 Sunday /vespers is Evening Prayer II', () => {
  // One Sunday per season, plus a week whose `vespers2` is absent so the
  // week-1 template fallback fires (Advent w2, Lent w3, Easter w5).
  const CASES = [
    { date: '2026-09-20', label: 'Ordinary Time 25 (own vespers2, added by GOAL #268)', page: 800 },
    { date: '2026-07-19', label: 'Ordinary Time 16 (vespers2 corrected to p.782)', page: 782 },
    { date: '2026-11-29', label: 'Advent 1 (own vespers2)', page: 554 },
    { date: '2026-12-06', label: 'Advent 2 (week-1 template fallback)', page: 554 },
    { date: '2026-02-22', label: 'Lent 1 (own vespers2)', page: 624 },
    { date: '2026-03-08', label: 'Lent 3 (week-1 template fallback)', page: 624 },
    { date: '2026-04-12', label: 'Easter 2 (week-1 template fallback)', page: 706 },
  ]

  // @fr FR-171
  it.each(CASES)('$date $label', async ({ date, page }) => {
    const d = day(date)
    expect(new Date(date + 'T00:00:00Z').getUTCDay(), date).toBe(0)
    const epII = getSeasonVespers2(d.season, d.weekOfSeason, date, d.name, d.romcalKey)
    const epI = getSeasonHourPropers(d.season, d.weekOfSeason, 'SUN', 'vespers', date, d.name, d.romcalKey)
    expect(epII?.gospelCanticleAntiphon, date).toBeTruthy()
    expect(epII!.gospelCanticleAntiphon, date).not.toBe(epI!.gospelCanticleAntiphon)

    const vespers = await assembleHour(date, 'vespers')
    const gc = section(vespers, 'gospelCanticle')
    expect(gc?.antiphon, date).toBe(epII!.gospelCanticleAntiphon)
    expect(gc?.antiphonPage, date).toBe(page)
    // …and the Evening Prayer I antiphon is gone.
    expect(gc?.antiphon, date).not.toBe(epI!.gospelCanticleAntiphon)
  })

  // @fr FR-171
  it('Advent / Lent / Easter also swap the short reading + intercessions (the season prints a full EP II)', async () => {
    const vespers = await assembleHour('2026-11-29', 'vespers')
    // Advent EP II: Phil 4:4-7 (p.553), not EP I's 1 Thess 5:19-24 (p.548).
    expect(section(vespers, 'shortReading')?.page).toBe(553)
    const firstVespers = await assembleHour('2026-11-29', 'firstVespers')
    expect(section(firstVespers, 'shortReading')?.page).toBe(548)
  })

  // @fr FR-171
  it('Ordinary Time keeps the alternate concluding prayer the vespers2 cell does not print', async () => {
    const vespers = await assembleHour('2026-09-20', 'vespers')
    const prayer = section(vespers, 'concludingPrayer')
    const epI = cell(OT, '25', 'vespers')
    expect(prayer?.text).toBe(cell(OT, '25', 'vespers2').concludingPrayer)
    expect(prayer?.alternateText).toBe(epI.alternativeConcludingPrayer)
  })

  // @fr FR-171
  it('getSeasonVespers2 falls back to the week-1 template but never across a special key', () => {
    // Advent / Lent / Easter print ONE Sunday formulary for the season.
    expect(getSeasonVespers2('ADVENT', 3)).toEqual(getSeasonVespers2('ADVENT', 1))
    expect(getSeasonVespers2('EASTER', 5)).toEqual(getSeasonVespers2('EASTER', 1))
    // Easter Sunday's own cell has no vespers2 (its `vespers` IS EP II) and
    // must not borrow the week template.
    expect(getSeasonVespers2('EASTER', 1, '2026-04-05', 'Easter Sunday')).toBeNull()
    // Ordinary Time week 1 is always the Baptism of the Lord — no vespers2
    // anywhere in the fallback chain.
    expect(getSeasonVespers2('ORDINARY_TIME', 1)).toBeNull()
  })

  // @fr FR-171
  it('Saturday evening and /firstVespers still sing Evening Prayer I (regression guard)', async () => {
    for (const { sat, sun } of [
      { sat: '2026-09-19', sun: '2026-09-20' },
      { sat: '2026-11-28', sun: '2026-11-29' },
      { sat: '2026-02-21', sun: '2026-02-22' },
    ]) {
      const d = day(sun)
      const epI = getSeasonHourPropers(d.season, d.weekOfSeason, 'SUN', 'vespers', sun, d.name, d.romcalKey)
      const satVespers = await assembleHour(sat, 'vespers')
      const sunFirstVespers = await assembleHour(sun, 'firstVespers')
      expect(section(satVespers, 'gospelCanticle')?.antiphon, sat).toBe(epI!.gospelCanticleAntiphon)
      expect(section(sunFirstVespers, 'gospelCanticle')?.antiphon, sun).toBe(epI!.gospelCanticleAntiphon)
    }
  })

  // @fr FR-171
  it('a movable Solemnity keeps the GOAL #20 vespers2 swap and a displaced Sunday keeps its sanctoral', async () => {
    // Christ the King 2026-11-22 — special key, unchanged by FR-171.
    const ctk = await assembleHour('2026-11-22', 'vespers')
    expect(section(ctk, 'gospelCanticle')?.antiphon)
      .toBe(cell(OT, 'christTheKing', 'vespers2').gospelCanticleAntiphon)
    // All Saints on a Sunday keeps the sanctoral Second Vespers: the
    // Ordinary-Time week-31 EP II overlay lands on Layer 2 but Layer 3
    // (sanctoral 11-01 `vespers2`) still wins the rendered antiphon.
    const allSaints = await assembleHour('2026-11-01', 'vespers')
    expect(day('2026-11-01').rank).toBe('SOLEMNITY')
    const allSaintsAntiphon = section(allSaints, 'gospelCanticle')?.antiphon
    expect(allSaintsAntiphon).toBeTruthy()
    expect(allSaintsAntiphon).not.toBe(cell(OT, '31', 'vespers2').gospelCanticleAntiphon)
    expect(allSaintsAntiphon).not.toBe(cell(OT, '31', 'vespers').gospelCanticleAntiphon)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// FR-173 — Feast of the Lord on a Sunday: First Vespers on the eve
// ─────────────────────────────────────────────────────────────────────────

describe('FR-173 Holy Family / Baptism First Vespers on the eve', () => {
  // @fr FR-173
  it.each([
    { eve: '2026-12-26', feast: '2026-12-27', key: 'holyFamily' },
    { eve: '2027-12-25', feast: '2027-12-26', key: 'holyFamily' },
    { eve: '2026-01-10', feast: '2026-01-11', key: 'baptism' },
    { eve: '2028-12-30', feast: '2028-12-31', key: 'holyFamily' },
  ])('$eve evening = First Vespers of $feast? (card list decides)', async ({ eve, feast, key }) => {
    const cards = getHoursSummary(eve)?.hours.map((h) => h.type)
    const eveBody = await assembleHour(eve, 'vespers')
    const routeBody = await assembleHour(feast, 'firstVespers')
    const epI = cell(CHRISTMAS, key, 'vespers')

    if (day(eve).rank === 'SOLEMNITY') {
      // 2027-12-25: Christmas (Table of Liturgical Days I.2) keeps its own
      // Evening Prayer II over the Feast of the Lord's First Vespers (II.5).
      // The card-list gap noted here originally (`keepsSundayEveningPrayerII`
      // protected only Advent/Lent/Easter SUNDAYS, never a Solemnity on a
      // Saturday) was closed by FR-175 — `keepsOwnEveningPrayerII` now covers
      // the weekday-Solemnity-vs-Feast case, so the cards follow the body.
      expect(section(eveBody, 'gospelCanticle')?.antiphon, eve)
        .not.toBe(epI.gospelCanticleAntiphon)
      expect(eveBody?.effectiveLiturgicalDay, eve).toBeUndefined()
      expect(cards, eve).toContain('vespers')
      expect(cards, eve).toContain('compline')
      return
    }

    // Cards send the reader to tomorrow's `firstVespers` card…
    expect(cards, eve).toEqual(['lauds'])
    // …and the legacy eve URL renders exactly what that card renders.
    expect(section(eveBody, 'gospelCanticle')?.antiphon, eve).toBe(epI.gospelCanticleAntiphon)
    expect(section(eveBody, 'gospelCanticle')?.antiphon, eve)
      .toBe(section(routeBody, 'gospelCanticle')?.antiphon)
    expect(section(eveBody, 'concludingPrayer')?.text, eve)
      .toBe(section(routeBody, 'concludingPrayer')?.text)
    expect(section(eveBody, 'shortReading')?.ref, eve)
      .toBe(section(routeBody, 'shortReading')?.ref)
    // …and declares the promoted identity.
    expect(eveBody?.effectiveLiturgicalDay?.date, eve).toBe(feast)
  })

  // @fr FR-173
  it('no First Vespers in the years Christmas falls on a Sunday (book p.599 red rubric)', async () => {
    // «Хэрэв Эзэний Мэндэлсэн өдөр … Ням гарагт таарвал … 12 сарын 30-нд
    // ёслон тэмдэглэх бөгөөд "1 дүгээр Оройн даатгал залбирал" гэж байхгүй.»
    for (const { christmas, holyFamily } of [
      { christmas: '2033-12-25', holyFamily: '2033-12-30' },
      { christmas: '2039-12-25', holyFamily: '2039-12-30' },
      { christmas: '2044-12-25', holyFamily: '2044-12-30' },
    ]) {
      expect(new Date(christmas + 'T00:00:00Z').getUTCDay(), christmas).toBe(0)
      expect(day(holyFamily).romcalKey, holyFamily).toBe('holyFamily')
      expect(new Date(holyFamily + 'T00:00:00Z').getUTCDay(), holyFamily).toBe(5)
      const eve = holyFamily.replace(/30$/, '29')
      const eveBody = await assembleHour(eve, 'vespers')
      const epI = cell(CHRISTMAS, 'holyFamily', 'vespers')
      expect(section(eveBody, 'gospelCanticle')?.antiphon, eve).not.toBe(epI.gospelCanticleAntiphon)
      expect(eveBody?.effectiveLiturgicalDay, eve).toBeUndefined()
      // The Feast itself still renders its own Evening Prayer II.
      const feastVespers = await assembleHour(holyFamily, 'vespers')
      expect(section(feastVespers, 'gospelCanticle')?.antiphon, holyFamily)
        .toBe(cell(CHRISTMAS, 'holyFamily', 'vespers2').gospelCanticleAntiphon)
    }
  })

  // @fr FR-173
  it('a Monday Baptism does not displace the Epiphany Sunday Evening Prayer II (2029 / 2034 / 2035)', async () => {
    for (const { epiphany, baptism } of [
      { epiphany: '2029-01-07', baptism: '2029-01-08' },
      { epiphany: '2034-01-08', baptism: '2034-01-09' },
      { epiphany: '2035-01-07', baptism: '2035-01-08' },
    ]) {
      expect(day(baptism).romcalKey, baptism).toBe('baptismOfTheLord')
      expect(new Date(baptism + 'T00:00:00Z').getUTCDay(), baptism).toBe(1)
      const vespers = await assembleHour(epiphany, 'vespers')
      expect(section(vespers, 'gospelCanticle')?.antiphon, epiphany)
        .toBe(cell(CHRISTMAS, 'epiphany', 'vespers2').gospelCanticleAntiphon)
      expect(vespers?.effectiveLiturgicalDay, epiphany).toBeUndefined()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Data corrections carried by GOAL #268
// ─────────────────────────────────────────────────────────────────────────

describe('GOAL #268 Ordinary-Time Evening Prayer II data', () => {
  // @fr FR-171
  it('every Ordinary-Time Sunday except week 1 has a vespers2 cell', () => {
    const missing: string[] = []
    for (let w = 1; w <= 34; w++) {
      if (!OT[String(w)]?.SUN?.vespers2) missing.push(String(w))
    }
    // Week 1 is always replaced by the Baptism of the Lord (PDF p.753).
    expect(missing).toEqual(['1'])
  })

  // @fr FR-171
  it('the Magnificat antiphon page is always the Evening Prayer I page + 1', () => {
    const offenders: string[] = []
    for (let w = 2; w <= 34; w++) {
      const epI = OT[String(w)].SUN.vespers as Record<string, number>
      const epII = OT[String(w)].SUN.vespers2 as Record<string, number>
      if (epII.gospelCanticleAntiphonPage !== epI.gospelCanticleAntiphonPage + 1) {
        offenders.push(`${w}: ${epI.gospelCanticleAntiphonPage} → ${epII.gospelCanticleAntiphonPage}`)
      }
    }
    expect(offenders).toEqual([])
  })

  // @fr FR-171
  it('weeks 12 / 15 / 16 / 25 carry the antiphons printed on pp. 774 / 780 / 782 / 800', () => {
    expect(cell(OT, '12', 'vespers2').gospelCanticleAntiphon)
      .toBe('Хэн нэг нь Миний араас дагахыг хүсвэл тэр өөрийгөө үгүйсгэн, загалмайгаа авч Намайг дага.')
    expect(cell(OT, '15', 'vespers2').gospelCanticleAntiphon)
      .toContain('Чи Тэнгэрбурхан Эзэнээ бүх зүрх, бүх сэтгэл, бүх оюун ухаанаараа хайрла.')
    expect(cell(OT, '16', 'vespers2').gospelCanticleAntiphon)
      .toBe('Өөрөөс нь булаагдашгүй сайныг Мариа сонгон авчээ.')
    expect(cell(OT, '25', 'vespers2').gospelCanticleAntiphon)
      .toBe('Ямар ч зарц, хоёр эзэнд үйлчилж чадахгүй. Та нар Тэнгэрбурхан, эд баялаг хоёрт зэрэг үйлчилж чадахгүй.')
  })
})
