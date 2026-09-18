import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { assembleHour } from '../loth-service'
import { getLiturgicalDay } from '../calendar'
import { dateToDayOfWeek } from '../hours/date-utils'
import { getSeasonHourPropers, getSanctoralPropers, resolveSpecialKey } from '../propers-loader'
import { applyRichSourceParity } from '../prayers/resolver'
import type { AssembledHour, HourSection, PrayerText } from '../types'

// docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md
//
// Three regressions on the FR-156 eve-of-celebration vespers path
// (`/pray/<eve>/vespers` borrowing tomorrow's First Vespers) and on the
// rich-overlay merge, all reproduced against the real data files:
//
//   1. F-2 (#214) "Solemnity not on Sunday" swap was decided with the EVE's
//      civil weekday while the rank came from the promoted day, so every
//      Saturday eve of a Sunday (romcal ranks Sundays SOLEMNITY) rendered
//      the alternate concluding prayer — Trinity Sunday eve 2026-05-30 vs
//      the `/firstVespers` route on 2026-05-31 (primary).
//   2. The rich overlay was keyed on the EVE's season / week / weekday, so
//      Christmas Eve 2026-12-24 carried `advent/w1-THU-vespers` rich (p.571)
//      as `alternateTextRich` under the Christmas First Vespers plain
//      (p.588). Same class on Solemnity days themselves (All Saints Lauds
//      showing the OT Sunday-31 concluding prayer rich) — now guarded by
//      `applyRichSourceParity`.
//   3. Saturday of OT week 34 → 1st Sunday of Advent: the psalm seasonal
//      antiphon variant was picked with the Saturday's season (OT), so
//      Ps 141 kept the psalter default instead of the Advent variant.

function section<T extends HourSection['type']>(
  hour: AssembledHour | null,
  type: T,
): Extract<HourSection, { type: T }> | undefined {
  return hour?.sections.find((s) => s.type === type) as Extract<HourSection, { type: T }> | undefined
}

function cp(hour: AssembledHour | null) {
  const s = section(hour, 'concludingPrayer')
  if (!s) throw new Error('concludingPrayer section missing')
  return s
}

function tomorrowOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

describe('F-2 alternate concluding prayer on the eve path follows the PROMOTED day\'s weekday', () => {
  // @fr FR-156
  it('2026-05-30 (Sat) eve of Trinity Sunday renders the PRIMARY, identical to /2026-05-31/firstVespers', async () => {
    const eve = await assembleHour('2026-05-30', 'vespers')
    const route = await assembleHour('2026-05-31', 'firstVespers')
    expect(getLiturgicalDay('2026-05-31')).toMatchObject({ name: 'Trinity Sunday', rank: 'SOLEMNITY' })
    expect(cp(eve).text).toContain('Өөрийн Үгийг илгээсэн')
    expect(cp(eve).page).toBe(745)
    expect(cp(eve).text).toBe(cp(route).text)
    expect(cp(eve).alternateText).toBe(cp(route).alternateText)
    expect(cp(eve).page).toBe(cp(route).page)
  })

  // @fr FR-156
  it.each([
    ['2026-05-13', 'Ascension of the Lord', 'THU', 'Аяа, Тэнгэр дэх Эцэг минь, Та Христийг бидний нүдний өмнөөс'],
    ['2026-12-24', 'Christmas', 'FRI', 'Аяа, хамаг сайн сайхны Эцэг'],
  ])('%s eve of %s (%s, not Sunday) still renders the ALTERNATE per rubric p.516', async (eve, name, dow, alternateStart) => {
    const tomorrow = tomorrowOf(eve)
    expect(getLiturgicalDay(tomorrow)).toMatchObject({ name, rank: 'SOLEMNITY' })
    expect(dateToDayOfWeek(tomorrow)).toBe(dow)
    const hour = await assembleHour(eve, 'vespers')
    const route = await assembleHour(tomorrow, 'firstVespers')
    expect(cp(hour).text).toContain(alternateStart)
    expect(cp(hour).text).toBe(cp(route).text)
    expect(cp(hour).alternateText).toBe(cp(route).alternateText)
  })

  // @fr FR-156
  it.each([
    ['2026-10-31', 'All Saints', null, 'Аяа, төгс хүчит мөнхийн Тэнгэрбурхан минь, өнөөдөр'],
    ['2026-06-06', 'Corpus Christi', 'corpusChristi', 'Аяа, Эзэн Есүс Христ минь, Та тарчлалтынхаа'],
  ])('%s eve of %s (Sunday Solemnity) renders the PRIMARY', async (eve, name, specialKey, primaryStart) => {
    const tomorrow = tomorrowOf(eve)
    const day = getLiturgicalDay(tomorrow)!
    expect(day.rank).toBe('SOLEMNITY')
    if (specialKey) expect(resolveSpecialKey(day.season, day.name)).toBe(specialKey)
    else expect(day.name).toBe(name)
    expect(dateToDayOfWeek(tomorrow)).toBe('SUN')
    const hour = await assembleHour(eve, 'vespers')
    const route = await assembleHour(tomorrow, 'firstVespers')
    expect(cp(hour).text).toContain(primaryStart)
    expect(cp(hour).text).toBe(cp(route).text)
  })

  // @fr FR-156
  it('2026-08-14 eve of the Assumption (Saturday Solemnity) renders the ALTERNATE when authored; 08-15 Second Vespers too', async () => {
    const eve = await assembleHour('2026-08-14', 'vespers')
    const route = await assembleHour('2026-08-15', 'firstVespers')
    expect(cp(eve).text).toBe(cp(route).text)
    // 08-15 Second Vespers. FR-176 이전에는 이 토요일이 다음 주일로 승격돼
    // **20주일 연중 주일의** 대체 본기도(x.789)가 승천의 본기도에 얹혀 있었다.
    // 지금은 승천(I.3)이 연중 주일(II.6)을 이겨 자기 제2저녁기도를 지키므로,
    // 책이 인쇄한 그대로 x.834 본기도만 있고 대체 본기도는 없다 — 평일에
    // 오는 승천(2028-08-15 화)과 글자까지 동일하다.
    const ep2 = await assembleHour('2026-08-15', 'vespers')
    expect(cp(ep2).page).toBe(834)
    expect(cp(ep2).alternatePage).toBeUndefined()
    expect(cp(ep2).text).toContain('Гэм Нүгэлгүй Цэвэ')
    const weekdayOccurrence = await assembleHour('2028-08-15', 'vespers')
    expect(cp(ep2).text).toBe(cp(weekdayOccurrence).text)
  })

  // @fr FR-156
  it('Easter Octave weekdays (2026-04-06 … 04-11) keep the PRIMARY at vespers (sister rubric)', async () => {
    for (const date of ['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10']) {
      const day = getLiturgicalDay(date)!
      expect(day).toMatchObject({ season: 'EASTER', weekOfSeason: 1, rank: 'SOLEMNITY' })
      const cell = getSeasonHourPropers('EASTER', 1, dateToDayOfWeek(date), 'vespers', date, day.name)
      expect(cell?.concludingPrayer, `${date} seasonal cell`).toBeTruthy()
      const c = cp(await assembleHour(date, 'vespers'))
      expect(c.text, date).toBe(cell!.concludingPrayer)
    }
    // Easter Saturday evening = First Vespers of the 2nd Sunday of Easter
    // (Saturday → Sunday branch): primary, same as the Sunday route.
    const easterSat = await assembleHour('2026-04-11', 'vespers')
    const mercySunday = await assembleHour('2026-04-12', 'firstVespers')
    expect(cp(easterSat).text).toBe(cp(mercySunday).text)
    expect(cp(easterSat).text).toContain('биднийг Эзэний амилалтыг')
  })

  // @fr FR-156
  it('plain Ordinary-Time Saturday eve (2026-01-17) matches the Sunday /firstVespers primary', async () => {
    const eve = await assembleHour('2026-01-17', 'vespers')
    const route = await assembleHour('2026-01-18', 'firstVespers')
    expect(cp(eve).text).toBe(cp(route).text)
    expect(cp(eve).text).toContain('Аяа, Тэнгэр газрын Эцэг минь')
  })
})

describe('Rich overlay follows the plain source on the eve path', () => {
  // @fr FR-156
  it('2026-12-24 vespers: concludingPrayer rich pages match the Christmas plain (no Advent w1 THU p.571 leak)', async () => {
    const hour = await assembleHour('2026-12-24', 'vespers')
    const c = cp(hour)
    expect(c.page).toBe(588)
    expect(c.alternatePage).toBe(588)
    expect(c.textRich?.page).toBe(588)
    expect(c.alternateTextRich?.page).toBe(588)
    expect(c.alternateTextRich?.source).toMatchObject({ season: 'CHRISTMAS', weekKey: 'dec25' })
    const route = await assembleHour('2026-12-25', 'firstVespers')
    expect(c.textRich).toEqual(cp(route).textRich)
    expect(c.alternateTextRich).toEqual(cp(route).alternateTextRich)
  })

  // @fr FR-156
  it('2026-05-13 vespers (Ascension eve): rich from the ascension special key, same as /05-14/firstVespers', async () => {
    const hour = await assembleHour('2026-05-13', 'vespers')
    const route = await assembleHour('2026-05-14', 'firstVespers')
    const c = cp(hour)
    expect(c.textRich?.page).toBe(c.page)
    expect(c.alternateTextRich?.page).toBe(c.alternatePage)
    expect(c.textRich).toEqual(cp(route).textRich)
    expect(c.alternateTextRich).toEqual(cp(route).alternateTextRich)
  })

  // @fr FR-156
  it('2025-02-01 (Sat) eve of the Presentation on a Sunday: no OT Sunday-4 rich (p.757) under the feast\'s plain (p.821)', async () => {
    // FR-180: the Presentation's First Vespers exists only when 02-02 is a
    // Sunday (p.821 «Хэрэв энэ баяр Ням гарагт таарвал …»). 2025-02-02 is
    // one; 2026-02-02 (Mon) no longer promotes the eve.
    const hour = await assembleHour('2025-02-01', 'vespers')
    const c = cp(hour)
    expect(c.page).toBe(821)
    expect(c.textRich).toBeUndefined()
    expect(c.alternateTextRich).toBeUndefined()
  })

  // @fr FR-156
  it('every 2026 eve whose vespers borrows tomorrow\'s First Vespers keeps rich pages equal to plain pages', async () => {
    const eves: string[] = []
    for (let d = new Date('2026-01-01T00:00:00Z'); d.getUTCFullYear() === 2026; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      const tomorrow = getLiturgicalDay(tomorrowOf(dateStr))
      if (tomorrow && (tomorrow.rank === 'SOLEMNITY' || tomorrow.rank === 'FEAST')) {
        eves.push(dateStr)
      }
    }
    // Every Saturday (romcal ranks Sundays SOLEMNITY) + weekday eves.
    expect(eves.length).toBeGreaterThan(52)
    for (const eve of eves) {
      const c = section(await assembleHour(eve, 'vespers'), 'concludingPrayer')
      if (!c) continue
      if (c.textRich && c.textRich.page != null && c.page != null) {
        expect(c.textRich.page, `${eve} textRich`).toBe(c.page)
      }
      if (c.alternateTextRich) {
        expect(c.alternateText, `${eve} alternateTextRich without alternateText`).toBeTruthy()
        if (c.alternateTextRich.page != null && c.alternatePage != null) {
          expect(c.alternateTextRich.page, `${eve} alternateTextRich`).toBe(c.alternatePage)
        }
      }
    }
  })
})

describe('Rich ↔ plain source parity on the celebration day itself (same class, lauds / vespers)', () => {
  // @fr FR-156
  it.each([
    ['2026-11-01', 'lauds', 837, 811],
    ['2026-11-01', 'vespers', 837, 811],
    ['2026-03-19', 'lauds', 823, 641],
    ['2026-12-08', 'vespers', 842, 562],
  ])('%s %s: sanctoral concluding prayer (p.%i) no longer carries the seasonal rich (p.%i)', async (date, hour, plainPage, leakedPage) => {
    const h = await assembleHour(date, hour as 'lauds' | 'vespers')
    const c = cp(h)
    expect(c.page).toBe(plainPage)
    expect(c.textRich?.page).not.toBe(leakedPage)
    if (c.textRich?.page != null) expect(c.textRich.page).toBe(plainPage)
  })

  // @fr FR-156
  it('2026-05-14 Ascension Second Vespers: no empty `text` from a stray First-Vespers alternate rich', async () => {
    const h = await assembleHour('2026-05-14', 'vespers')
    const c = cp(h)
    expect(c.text).toContain('Хүүгийнхээ тэнгэрт заларснаар')
    expect(c.page).toBe(731)
    expect(c.alternateTextRich).toBeUndefined()
    if (c.textRich?.page != null) expect(c.textRich.page).toBe(731)
  })

  // @fr FR-156
  it('Holy Thursday 2026-04-02 vespers: Triduum single-versicle responsory is not overlaid with the psalter Ps 23 rich', async () => {
    const h = await assembleHour('2026-04-02', 'vespers')
    const r = section(h, 'responsory')
    expect(r?.versicle).toContain('Бидний төлөө Христ')
    expect(r?.rich).toBeUndefined()
  })

  // @fr FR-156
  it('Dec 24 2026 lauds: rich comes from the dec24 cell (p.582), not Advent w1 THU (p.571)', async () => {
    const h = await assembleHour('2026-12-24', 'lauds')
    const c = cp(h)
    expect(c.page).toBe(582)
    expect(c.textRich?.page).toBe(582)
    expect(c.textRich?.source).toMatchObject({ weekKey: 'dec24' })
  })
})

describe('Saturday of OT week 34 → 1st Sunday of Advent: seasonal psalm antiphons follow the promoted season', () => {
  // @fr FR-156
  it.each(['2025-11-29', '2026-11-28'])('%s vespers Ps 141 / Phil 2 carry the Advent variants and the concluding prayer is the primary', async (date) => {
    const eve = await assembleHour(date, 'vespers')
    const route = await assembleHour(tomorrowOf(date), 'firstVespers')
    const psalmody = section(eve, 'psalmody')!
    const ps141 = psalmody.psalms.find((p) => p.reference === 'Psalm 141:1-9')!
    expect(ps141.antiphon).toContain('Сайнмэдээний айлдлыг')
    const phil = psalmody.psalms.find((p) => p.reference === 'Philippians 2:6-11')!
    expect(phil.antiphon).toBe(section(route, 'psalmody')!.psalms.find((p) => p.reference === 'Philippians 2:6-11')!.antiphon)
    expect(cp(eve).text).toBe(cp(route).text)
    expect(cp(eve).text).toContain('Аяа, төгс хүчит Тэнгэрбурхан минь, сайн сайхныг')
    // Response contract (unchanged): the eve's liturgicalDay stays the
    // Saturday's civil identity; only the body is promoted.
    expect(eve?.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(eve?.liturgicalDay.weekOfSeason).toBe(34)
  })
})

describe('Plain Sunday First Vespers: reading / responsory / intercessions / prayer follow the SEASON proper', () => {
  // docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md §6-② →
  // `mergeSundayFirstVespers`. The season sections print the Sunday EP I
  // proper (Advent p.548-550, Lent p.618-620, Easter p.700-702); the
  // Phase-2 `firstVespers` cells are psalter Sunday EP I copies
  // (p.55/171/291/402) and only stand where the season prints nothing
  // (Ordinary Time, Christmas-season Sundays).
  // @fr FR-156
  it.each([
    ['2026-11-29', '1st Sunday of Advent', '1 Thess 5:19-24', 548, 549, 550],
    ['2026-02-22', '1st Sunday of Lent', '2 Cor 6:1-4a', 618, 619, 620],
    ['2026-04-12', 'Divine Mercy Sunday', '1 Pet 2:9-10', 700, 701, 702],
  ])('%s (%s) /firstVespers: reading %s p.%i, responsory/intercessions p.%i, prayer p.%i — plain and rich agree', async (date, name, ref, srPage, midPage, cpPage) => {
    expect(getLiturgicalDay(date)?.name).toBe(name)
    const route = await assembleHour(date, 'firstVespers')
    const sr = section(route, 'shortReading')!
    expect(sr.ref).toBe(ref)
    expect(sr.page).toBe(srPage)
    expect(sr.textRich?.page).toBe(srPage)
    const rs = section(route, 'responsory')!
    expect(rs.page).toBe(midPage)
    expect(rs.rich?.page).toBe(midPage)
    const ic = section(route, 'intercessions')!
    expect(ic.page).toBe(midPage)
    expect(ic.rich?.page).toBe(midPage)
    const c = cp(route)
    expect(c.page).toBe(cpPage)
    expect(c.textRich?.page).toBe(cpPage)
    // Saturday eve `/vespers` carries the same plain text.
    const eveDate = new Date(date + 'T00:00:00Z')
    eveDate.setUTCDate(eveDate.getUTCDate() - 1)
    const eve = await assembleHour(eveDate.toISOString().slice(0, 10), 'vespers')
    expect(section(eve, 'shortReading')?.ref).toBe(ref)
    expect(section(eve, 'shortReading')?.page).toBe(srPage)
    expect(section(eve, 'intercessions')?.page).toBe(midPage)
    expect(cp(eve).text).toBe(c.text)
    expect(cp(eve).page).toBe(cpPage)
  })

  // @fr FR-156
  it('2026-09-13 (24th Sunday of OT) /firstVespers is unchanged: psalter reading 2 Peter 1:19-21 p.402, OT Sunday prayer p.797', async () => {
    const route = await assembleHour('2026-09-13', 'firstVespers')
    const sr = section(route, 'shortReading')!
    expect(sr.ref).toBe('2 Peter 1:19-21')
    expect(sr.page).toBe(402)
    expect(section(route, 'intercessions')?.page).toBe(403)
    expect(cp(route).page).toBe(797)
    expect(cp(route).textRich?.page).toBe(797)
    const eve = await assembleHour('2026-09-12', 'vespers')
    expect(section(eve, 'shortReading')?.ref).toBe('2 Peter 1:19-21')
    expect(cp(eve).text).toBe(cp(route).text)
  })
})

describe('§6-4 (GOAL #128 B3 fidelity restore) — Christmas First Vespers Magnificat antiphon: christmas.json dec25 agrees with the printed page and the sanctoral copy', () => {
  // §6-4: `christmas.json weeks.dec25.SUN.vespers.gospelCanticleAntiphon`
  // read `өргөнөөсөө` (three ө) while the printed page (book p.587,
  // physical p.294 @200dpi; `parsed_data/full_pdf.txt:20293`) and the
  // sanctoral 12-25 firstVespers copy read `өргөөнөөсөө` (өргөө-нөөс-өө).
  // The one-letter drift made `applyRichSourceParity` treat the seasonal
  // cell and the rendered (sanctoral) plain as two different antiphons.
  const PRINTED = 'өргөөнөөсөө'
  const TYPO = 'өргөнөөсөө'

  // @fr FR-156
  it('seasonal dec25 vespers cell and sanctoral 12-25 firstVespers carry the same printed antiphon', () => {
    const seasonalCell = getSeasonHourPropers('CHRISTMAS', 1, 'SUN', 'vespers', '2026-12-25', 'Christmas')
    const sanctoralFv = getSanctoralPropers('12-25')?.firstVespers
    expect(seasonalCell?.gospelCanticleAntiphon).toContain(PRINTED)
    expect(seasonalCell?.gospelCanticleAntiphon).not.toContain(TYPO)
    expect(sanctoralFv?.gospelCanticleAntiphon).toContain(PRINTED)
    // Letter-for-letter identity (the parity key ignores punctuation only).
    const identity = (s?: string) => (s ?? '').replace(/[^\p{L}\p{N}]+/gu, '')
    expect(identity(seasonalCell?.gospelCanticleAntiphon)).toBe(identity(sanctoralFv?.gospelCanticleAntiphon))
  })

  // @fr FR-156
  it('a seasonal gospelCanticleAntiphonRich for the dec25 cell now passes parity under the sanctoral firstVespers plain (was dropped by the drift)', () => {
    const seasonalCell = getSeasonHourPropers('CHRISTMAS', 1, 'SUN', 'vespers', '2026-12-25', 'Christmas')!
    const sanctoralFv = getSanctoralPropers('12-25')!.firstVespers!
    // No `gospelCanticleAntiphonRich` is authored for wdec25-SUN-vespers on
    // disk (only concludingPrayer / intercessions / responsory /
    // shortReading rich) — exercise the guard with a synthetic candidate
    // generated "from" the seasonal cell so the render path would attach it.
    const candidate: PrayerText = {
      blocks: [{ kind: 'para', spans: [{ kind: 'text', text: seasonalCell.gospelCanticleAntiphon! }] }],
      page: 586,
    }
    const kept = applyRichSourceParity(
      { complineCommons: null, psalterCommons: null, seasonal: { gospelCanticleAntiphonRich: candidate }, sanctoral: null },
      { seasonal: seasonalCell, sanctoral: sanctoralFv },
      { ...seasonalCell, ...sanctoralFv },
    )
    expect(kept.gospelCanticleAntiphonRich).toBe(candidate)
    // Counter-check: re-introducing the drift drops it again.
    const drifted = { ...seasonalCell, gospelCanticleAntiphon: seasonalCell.gospelCanticleAntiphon!.replace(PRINTED, TYPO) }
    const dropped = applyRichSourceParity(
      { complineCommons: null, psalterCommons: null, seasonal: { gospelCanticleAntiphonRich: candidate }, sanctoral: null },
      { seasonal: drifted, sanctoral: sanctoralFv },
      { ...drifted, ...sanctoralFv },
    )
    expect(dropped.gospelCanticleAntiphonRich).toBeUndefined()
  })

  // @fr FR-156
  it.each([
    ['2026-12-24', 'vespers'],
    ['2026-12-25', 'firstVespers'],
  ])('%s %s renders the printed antiphon (p.586) with every attached rich page equal to its plain', async (date, hour) => {
    const h = await assembleHour(date, hour as 'vespers' | 'firstVespers')
    const gc = section(h, 'gospelCanticle')!
    expect(gc.antiphon).toContain(PRINTED)
    expect(gc.antiphon).not.toContain(TYPO)
    expect(gc.page).toBe(586)
    if (gc.antiphonRich?.page != null) expect(gc.antiphonRich.page).toBe(586)
    const c = cp(h)
    expect(c.textRich?.page).toBe(c.page)
    expect(section(h, 'shortReading')?.textRich?.page).toBe(586)
  })

  // @fr FR-156
  it('the three-ө spelling no longer occurs anywhere under src/data (propers / sanctoral / rich)', () => {
    const root = path.join(process.cwd(), 'src/data')
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(p)
        else if (entry.name.endsWith('.json') && fs.readFileSync(p, 'utf-8').includes(TYPO)) hits.push(path.relative(root, p))
      }
    }
    walk(root)
    expect(hits).toEqual([])
  })
})
