// @fr FR-181
//
// FR-181 — the January weekdays of the Christmas season reach the two
// formularies the book prints for them:
//   p.601 «Эзэний мэндэлтийн дараах долоо хоногууд» (`weeks.octave`) —
//         Dec 26–31 and Jan 2 up to the Epiphany eve,
//   p.611 «Эзэний илрэхүйн дараах долоо хоног» (`weeks.epiphanyWeek`) —
//         the day after the Epiphany up to the Baptism eve.
// Before FR-181 `resolveSpecialKey` returned null for every January
// weekday, so Jan 2 – Baptism eve rendered the bare four-week psalter with
// no seasonal reading, antiphon or prayer, and the authored
// `wepiphanyWeek-SUN-*` rich overlays were never loaded.
//
// The Epiphany / Baptism dates are computed arithmetically
// (`christmasMovableDates`) so the loader stays free of romcal; the first
// block below locks that arithmetic against romcal for 2025–2040.

import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import { getCalendarForYear, getLiturgicalDay } from '../calendar'
import { christmasMovableDates, resolveSpecialKey } from '../propers-loader'
import christmas from '../../data/loth/propers/christmas.json'
import type { AssembledHour, HourSection, HourPropers } from '../types'

const weeks = christmas.weeks as Record<string, Record<string, Record<string, HourPropers>>>
const octaveLauds = weeks.octave.SUN.lauds
const octaveVespers = weeks.octave.SUN.vespers
const epwLauds = weeks.epiphanyWeek.SUN.lauds
const epwVespers = weeks.epiphanyWeek.SUN.vespers

function section<T extends HourSection['type']>(
  hour: AssembledHour | null,
  type: T,
): Extract<HourSection, { type: T }> {
  const s = hour?.sections.find((x) => x.type === type)
  if (!s) throw new Error(`${type} section missing`)
  return s as Extract<HourSection, { type: T }>
}

/** Resolve the key the way `assembleHour` does — from the calendar's own day. */
function keyFor(dateStr: string): string | null {
  const day = getLiturgicalDay(dateStr)
  if (!day) throw new Error(`no liturgical day for ${dateStr}`)
  return resolveSpecialKey(day.season, day.name, dateStr, day.romcalKey)
}

describe('FR-181 — christmasMovableDates matches romcal', () => {
  // @fr FR-181
  it('Epiphany / Baptism dates agree with getCalendarForYear for 2025–2040', () => {
    for (let year = 2025; year <= 2040; year++) {
      const days = getCalendarForYear(year)
      const epiphany = days.find((d) => d.romcalKey === 'epiphany')?.date
      const baptism = days.find((d) => d.romcalKey === 'baptismOfTheLord')?.date
      expect(epiphany, `romcal epiphany ${year}`).toBeDefined()
      expect(baptism, `romcal baptism ${year}`).toBeDefined()
      expect(christmasMovableDates(year), `year ${year}`).toEqual({ epiphany, baptism })
    }
  })

  // @fr FR-181
  it('Baptism is the Monday after an Epiphany on Jan 7 / Jan 8 (2029, 2034, 2035)', () => {
    expect(christmasMovableDates(2029)).toEqual({ epiphany: '2029-01-07', baptism: '2029-01-08' })
    expect(christmasMovableDates(2034)).toEqual({ epiphany: '2034-01-08', baptism: '2034-01-09' })
    expect(christmasMovableDates(2035)).toEqual({ epiphany: '2035-01-07', baptism: '2035-01-08' })
    expect(christmasMovableDates(2026)).toEqual({ epiphany: '2026-01-04', baptism: '2026-01-11' })
    expect(christmasMovableDates(2030)).toEqual({ epiphany: '2030-01-06', baptism: '2030-01-13' })
  })
})

describe('FR-181 — resolveSpecialKey for the Christmas-season January weekdays', () => {
  // @fr FR-181
  it('2026: Jan 2–3 → octave, Jan 4 → epiphany, Jan 5–10 → epiphanyWeek, Jan 11 → baptism', () => {
    expect(getLiturgicalDay('2026-01-02')?.romcalKey).toBe('saintsBasilTheGreatAndGregoryNazianzenBishopsAndDoctors')
    expect(keyFor('2026-01-02')).toBe('octave')
    expect(keyFor('2026-01-03')).toBe('octave')
    expect(getLiturgicalDay('2026-01-04')?.romcalKey).toBe('epiphany')
    expect(keyFor('2026-01-04')).toBe('epiphany')
    for (const d of ['2026-01-05', '2026-01-06', '2026-01-08', '2026-01-09', '2026-01-10']) {
      expect(keyFor(d), d).toBe('epiphanyWeek')
    }
    // An optional memorial inside the week carries the saint's romcalKey,
    // not "…AfterEpiphany" — the date branch must not depend on the key.
    expect(getLiturgicalDay('2026-01-07')?.romcalKey).toBe('saintRaymondOfPenyafortPriest')
    expect(keyFor('2026-01-07')).toBe('epiphanyWeek')
    expect(getLiturgicalDay('2026-01-11')?.romcalKey).toBe('baptismOfTheLord')
    expect(keyFor('2026-01-11')).toBe('baptism')
    // First OT weekday — a different season, never touched.
    expect(getLiturgicalDay('2026-01-12')?.season).toBe('ORDINARY_TIME')
    expect(keyFor('2026-01-12')).toBeNull()
  })

  // @fr FR-181
  it('2029 (Epiphany Jan 7, Baptism Mon Jan 8): Jan 2–6 → octave and no epiphanyWeek day at all', () => {
    for (const d of ['2029-01-02', '2029-01-03', '2029-01-04', '2029-01-05', '2029-01-06']) {
      expect(keyFor(d), d).toBe('octave')
    }
    expect(keyFor('2029-01-07')).toBe('epiphany')
    expect(keyFor('2029-01-08')).toBe('baptism')
    expect(getLiturgicalDay('2029-01-09')?.season).toBe('ORDINARY_TIME')
    expect(keyFor('2029-01-09')).toBeNull()
  })

  // @fr FR-181
  it('2030 (Epiphany Jan 6): Jan 7–12 → epiphanyWeek', () => {
    for (const d of ['2030-01-07', '2030-01-08', '2030-01-09', '2030-01-10', '2030-01-11', '2030-01-12']) {
      expect(keyFor(d), d).toBe('epiphanyWeek')
    }
    expect(keyFor('2030-01-13')).toBe('baptism')
  })

  // @fr FR-181
  it('fixed-date keys are unchanged: Dec 25 → dec25, Dec 26–31 → octave, Jan 1 → jan1', () => {
    expect(keyFor('2026-12-25')).toBe('dec25')
    for (const d of ['2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31']) {
      // Dec 27 2026 is Holy Family (Sunday) — resolved by romcalKey first.
      const expected = getLiturgicalDay(d)?.romcalKey === 'holyFamily' ? 'holyFamily' : 'octave'
      expect(keyFor(d), d).toBe(expected)
    }
    expect(keyFor('2027-01-01')).toBe('jan1')
  })

  // @fr FR-181
  it('a caller with neither romcalKey nor name still gets null ON the Epiphany / Baptism dates', () => {
    expect(resolveSpecialKey('CHRISTMAS', null, '2026-01-04', null)).toBeNull()
    expect(resolveSpecialKey('CHRISTMAS', null, '2026-01-11', null)).toBeNull()
    expect(resolveSpecialKey('CHRISTMAS', null, '2026-01-05', null)).toBe('epiphanyWeek')
    expect(resolveSpecialKey('CHRISTMAS', null, '2026-01-02', null)).toBe('octave')
  })
})

describe('FR-181 — assembled hours on the week after the Epiphany (p.611–615)', () => {
  // @fr FR-181
  it('2026-01-05 (Mon after Epiphany) lauds renders the epiphanyWeek formulary with its rich overlay', async () => {
    const hour = await assembleHour('2026-01-05', 'lauds')
    expect(hour?.effectiveLiturgicalDay).toBeUndefined()
    const gc = section(hour, 'gospelCanticle')
    expect(gc.antiphon).toBe(epwLauds.gospelCanticleAntiphon)
    expect(gc.antiphon).toMatch(/^Гурван мэргэд/)
    const sr = section(hour, 'shortReading')
    expect(sr.ref).toBe('Isa 4:2-3')
    expect(sr.page).toBe(611)
    expect(sr.textRich?.page).toBe(611)
    const cp = section(hour, 'concludingPrayer')
    expect(cp.text).toBe(epwLauds.concludingPrayer)
    expect(cp.page).toBe(613)
    expect(cp.textRich?.page).toBe(613)
    expect(cp.alternateText).toBe(epwLauds.alternativeConcludingPrayer)
    expect(cp.alternatePage).toBe(610)
    expect(cp.alternateTextRich?.page).toBe(610)
    const ic = section(hour, 'intercessions')
    expect(ic.page).toBe(612)
  })

  // @fr FR-181
  it('2026-01-05 vespers renders the epiphanyWeek Evening Prayer (Eph 2:3b-5, «Христ, Та бол Гэрлийн Гэрэл»)', async () => {
    const hour = await assembleHour('2026-01-05', 'vespers')
    expect(hour?.effectiveLiturgicalDay).toBeUndefined()
    const gc = section(hour, 'gospelCanticle')
    expect(gc.antiphon).toBe(epwVespers.gospelCanticleAntiphon)
    expect(gc.antiphon).toMatch(/^Христ, Та бол Гэрлийн Гэрэл/)
    const sr = section(hour, 'shortReading')
    expect(sr.ref).toBe('Eph 2:3b-5')
    expect(sr.page).toBe(613)
    expect(sr.textRich?.page).toBe(613)
    const cp = section(hour, 'concludingPrayer')
    expect(cp.text).toBe(epwVespers.concludingPrayer)
    expect(cp.textRich?.page).toBe(613)
    expect(section(hour, 'intercessions').page).toBe(614)
  })

  // @fr FR-181
  it('2026-01-07 (optional memorial of St Raymond, no sanctoral data) keeps the epiphanyWeek base', async () => {
    const lauds = await assembleHour('2026-01-07', 'lauds')
    expect(section(lauds, 'gospelCanticle').antiphon).toBe(epwLauds.gospelCanticleAntiphon)
    expect(section(lauds, 'shortReading').ref).toBe('Isa 4:2-3')
    const vespers = await assembleHour('2026-01-07', 'vespers')
    expect(section(vespers, 'gospelCanticle').antiphon).toBe(epwVespers.gospelCanticleAntiphon)
  })

  // @fr FR-181
  it('2026-01-10 (Sat after Epiphany): lauds = epiphanyWeek, vespers is still the Baptism First Vespers', async () => {
    const lauds = await assembleHour('2026-01-10', 'lauds')
    expect(section(lauds, 'gospelCanticle').antiphon).toBe(epwLauds.gospelCanticleAntiphon)
    const vespers = await assembleHour('2026-01-10', 'vespers')
    expect(vespers?.effectiveLiturgicalDay?.date).toBe('2026-01-11')
    expect(section(vespers, 'gospelCanticle').antiphon).toMatch(/^Бидний Аврагч Ариун угаалыг/)
    expect(section(vespers, 'concludingPrayer').page).toBe(616)
  })

  // @fr FR-181
  it('compline on the week after the Epiphany is untouched (ordinarium compline.json slot)', async () => {
    const hour = await assembleHour('2026-01-05', 'compline')
    expect(section(hour, 'shortReading').ref).toBe('1 Thessalonians 5:9-10')
    expect(section(hour, 'concludingPrayer').page).toBe(526)
  })
})

describe('FR-181 — assembled hours on Jan 2 … Epiphany eve (p.601–605 «долоо хоногууд»)', () => {
  // @fr FR-181
  it('2026-01-03 (Sat) lauds renders the Christmas-weekdays formulary; vespers is still the Epiphany First Vespers', async () => {
    const lauds = await assembleHour('2026-01-03', 'lauds')
    expect(lauds?.effectiveLiturgicalDay).toBeUndefined()
    const gc = section(lauds, 'gospelCanticle')
    expect(gc.antiphon).toBe(octaveLauds.gospelCanticleAntiphon)
    expect(gc.antiphon).toMatch(/^Эзэний мэндэлсэн өдөр тэнгэрэлчийн найрал дуу/)
    expect(section(lauds, 'shortReading').ref).toBe('Isa 9:6-7')
    expect(section(lauds, 'shortReading').page).toBe(601)
    expect(section(lauds, 'concludingPrayer').page).toBe(603)

    const vespers = await assembleHour('2026-01-03', 'vespers')
    expect(vespers?.effectiveLiturgicalDay?.date).toBe('2026-01-04')
    expect(section(vespers, 'gospelCanticle').antiphon).toMatch(/^Одыг хараад мэргэд/)
    expect(section(vespers, 'concludingPrayer').page).toBe(609)
  })

  // @fr FR-181
  it('2026-01-02 (Fri, memorial of Sts Basil & Gregory — no sanctoral propers authored) renders the Christmas-weekdays formulary', async () => {
    // The app holds propers for ~14 saints only; 01-02 is not among them, so
    // the seasonal weekday cell is what the user sees for every field.
    // Before FR-181 this day rendered the bare psalter (Week-1 Friday).
    const lauds = await assembleHour('2026-01-02', 'lauds')
    expect(section(lauds, 'gospelCanticle').antiphon).toBe(octaveLauds.gospelCanticleAntiphon)
    expect(section(lauds, 'shortReading').ref).toBe('Isa 9:6-7')
    expect(section(lauds, 'concludingPrayer').text).toBe(octaveLauds.concludingPrayer)
    expect(section(lauds, 'intercessions').page).toBe(602)
    const vespers = await assembleHour('2026-01-02', 'vespers')
    expect(section(vespers, 'gospelCanticle').antiphon).toBe(octaveVespers.gospelCanticleAntiphon)
    expect(section(vespers, 'gospelCanticle').antiphon).toMatch(/^Тэнгэрбурханы ариун эх/)
    expect(section(vespers, 'shortReading').ref).toBe('2 Pet 1:3-4')
    expect(section(vespers, 'shortReading').page).toBe(604)
  })

  // @fr FR-181
  it('2026-12-29 (Tue in the Octave) still renders the same formulary — Dec 26–31 unchanged', async () => {
    const lauds = await assembleHour('2026-12-29', 'lauds')
    expect(section(lauds, 'gospelCanticle').antiphon).toBe(octaveLauds.gospelCanticleAntiphon)
    expect(section(lauds, 'shortReading').ref).toBe('Isa 9:6-7')
  })
})

describe('FR-181 — Ordinary Time is untouched', () => {
  // @fr FR-181
  it('2026-01-12 (Mon, OT week 1) renders the Ordinary-Time weekday', async () => {
    const lauds = await assembleHour('2026-01-12', 'lauds')
    expect(lauds?.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(section(lauds, 'gospelCanticle').antiphon).toMatch(/^Эзэн бидний Тэнгэрбурхан магтагдах болтугай/)
    expect(section(lauds, 'shortReading').page).toBe(81)
  })
})
