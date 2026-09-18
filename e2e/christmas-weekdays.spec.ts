import { test, expect, type APIRequestContext } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { DATES } from './fixtures/dates'

// FR-181 — Christmas weekday formularies reached by date range.
//
// The book prints two weekday formularies for the Christmas season:
//   - p.601 «Эзэний мэндэлтийн дараах долоо хоногууд» (the weeks after the
//     Nativity — plural). christmas.json key `octave`. Before FR-181 the
//     resolver matched it to Dec 26–31 only; Jan 2 … the day before the
//     Epiphany fell through to the bare psalter (no seasonal reading,
//     antiphon or collect at all). The book prints no other formulary for
//     those days, and its plural title covers both stretches.
//   - p.611 «Эзэний илрэхүйн дараах долоо хоног» (the week after the
//     Epiphany). christmas.json key `epiphanyWeek`. Before FR-181 nothing
//     resolved to it — the data (and the wepiphanyWeek-SUN-* rich files)
//     were unreachable every year.
//
// `resolveSpecialKey` now derives the Epiphany (the Sunday in Jan 2–8)
// and the Baptism (the following Sunday, or the Monday when the Epiphany
// is Jan 7/8) from the date alone: Jan 2 ≤ d < Epiphany → `octave`,
// Epiphany < d < Baptism → `epiphanyWeek`. The Sundays themselves keep
// resolving by romcalKey (holyFamily / epiphany / baptism / jan1).
//
// Assertions compare the API output against the data cells themselves
// (not hard-coded strings) so a data correction cannot silently drift the
// suite.

const REPO_ROOT = path.resolve(__dirname, '..')

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')) as T
}

interface HourCell {
  gospelCanticleAntiphon: string
  concludingPrayer: string
  shortReading?: { ref: string }
}

interface ChristmasPropers {
  weeks: Record<string, Record<string, { lauds?: HourCell; vespers?: HourCell }>>
}

const christmas = readJson<ChristmasPropers>('src/data/loth/propers/christmas.json')
const EPIPHANY_WEEK = christmas.weeks.epiphanyWeek.SUN
const OCTAVE = christmas.weeks.octave.SUN

type Section = {
  type: string
  antiphon?: string
  text?: string
  ref?: string
  textRich?: unknown
}

interface HourBody {
  sections: Section[]
  liturgicalDay: { date: string; name: string; season: string }
  effectiveLiturgicalDay?: { date: string }
}

async function fetchHour(
  request: APIRequestContext,
  date: string,
  hour: string,
): Promise<{ status: number; body: HourBody }> {
  const res = await request.get(`/api/loth/${date}/${hour}`)
  const status = res.status()
  const body = status === 200 ? ((await res.json()) as HourBody) : { sections: [], liturgicalDay: { date, name: '', season: '' } }
  return { status, body }
}

function section(body: HourBody, type: string): Section | undefined {
  return body.sections.find((s) => s.type === type)
}

async function expectFormulary(
  request: APIRequestContext,
  date: string,
  hour: 'lauds' | 'vespers',
  cell: HourCell,
  label: string,
): Promise<HourBody> {
  const { status, body } = await fetchHour(request, date, hour)
  expect(status, `${date} ${hour} → 200`).toBe(200)
  expect(body.liturgicalDay.season, `${date} is in the Christmas season`).toBe('CHRISTMAS')
  // The hour is the day's OWN office — no eve promotion.
  expect(body.effectiveLiturgicalDay, `${date} ${hour} is not promoted`).toBeUndefined()
  const gc = section(body, 'gospelCanticle')
  expect(gc?.antiphon, `${date} ${hour} gospel-canticle antiphon = ${label}`).toBe(cell.gospelCanticleAntiphon)
  const cp = section(body, 'concludingPrayer')
  expect(cp?.text, `${date} ${hour} concluding prayer = ${label}`).toBe(cell.concludingPrayer)
  return body
}

test.describe('FR-181 — Christmas weekday formularies (octave / epiphanyWeek) by date', () => {
  // @fr FR-181
  test('Monday after Epiphany 2026 — lauds AND vespers come from the p.611 «week after Epiphany» formulary', async ({
    request,
  }) => {
    const lauds = await expectFormulary(request, DATES.epiphanyWeekMon2026, 'lauds', EPIPHANY_WEEK.lauds!, 'epiphanyWeek.lauds')
    expect(lauds.liturgicalDay.name).toBe('Monday after Epiphany')
    const sr = section(lauds, 'shortReading')
    expect(sr?.ref, 'lauds short reading is the formulary reading (Isa 4:2-3)').toBe(EPIPHANY_WEEK.lauds!.shortReading!.ref)
    // The wepiphanyWeek-SUN-lauds.rich.json overlay is reachable too.
    expect(sr?.textRich, 'lauds short reading carries the rich overlay').toBeTruthy()

    const vespers = await expectFormulary(request, DATES.epiphanyWeekMon2026, 'vespers', EPIPHANY_WEEK.vespers!, 'epiphanyWeek.vespers')
    const vsr = section(vespers, 'shortReading')
    expect(vsr?.ref, 'vespers short reading is the formulary reading (Eph 2:3b-5)').toBe(EPIPHANY_WEEK.vespers!.shortReading!.ref)
    expect(vsr?.textRich).toBeTruthy()
  })

  // @fr FR-181
  test('Wednesday after Epiphany 2026 (optional memorial of St Raymond) still sits on the epiphanyWeek base', async ({
    request,
  }) => {
    // romcal names the day after the optional memorial (romcalKey is the
    // saint's), so only the date range can place it in the week after the
    // Epiphany. The memorial authors no propers of its own here, so the
    // whole hour is the seasonal formulary.
    const lauds = await expectFormulary(request, DATES.epiphanyWeekWed2026, 'lauds', EPIPHANY_WEEK.lauds!, 'epiphanyWeek.lauds')
    expect(lauds.liturgicalDay.name).toContain('Raymond')
    await expectFormulary(request, DATES.epiphanyWeekWed2026, 'vespers', EPIPHANY_WEEK.vespers!, 'epiphanyWeek.vespers')
  })

  // @fr FR-181
  test('Saturday after Epiphany 2026 — lauds is epiphanyWeek, the evening is still the Baptism EP I (no regression)', async ({
    request,
  }) => {
    await expectFormulary(request, DATES.epiphanyWeekSat2026, 'lauds', EPIPHANY_WEEK.lauds!, 'epiphanyWeek.lauds')

    const { status, body } = await fetchHour(request, DATES.epiphanyWeekSat2026, 'vespers')
    expect(status).toBe(200)
    expect(body.effectiveLiturgicalDay?.date, 'Saturday evening is promoted to the Baptism').toBe(DATES.baptismOfTheLord2026)
    const gc = section(body, 'gospelCanticle')
    expect(gc?.antiphon).not.toBe(EPIPHANY_WEEK.vespers!.gospelCanticleAntiphon)
    expect(gc?.antiphon).toContain('Ариун угаал')
  })

  // @fr FR-181
  test('Jan 2 and Jan 3 2026 (weekdays before the Epiphany) — lauds comes from the p.601 «weeks after the Nativity» formulary', async ({
    request,
  }) => {
    // Jan 2 is the memorial of Sts Basil & Gregory, Jan 3 the optional
    // memorial of the Holy Name — neither authors propers in the app, so
    // both render the seasonal formulary that was previously unreachable
    // on these dates (they fell through to the bare psalter).
    const fri = await expectFormulary(request, DATES.christmasWeekdayFri2026, 'lauds', OCTAVE.lauds!, 'octave.lauds')
    expect(fri.liturgicalDay.name).toContain('Basil')
    expect(section(fri, 'shortReading')?.ref, 'reading is the formulary reading (Isa 9:6-7)').toBe(OCTAVE.lauds!.shortReading!.ref)
    await expectFormulary(request, DATES.christmasWeekdayFri2026, 'vespers', OCTAVE.vespers!, 'octave.vespers')

    const sat = await expectFormulary(request, DATES.christmasWeekdaySat2026, 'lauds', OCTAVE.lauds!, 'octave.lauds')
    expect(sat.liturgicalDay.name).toContain('Holy Name')
  })

  // @fr FR-181
  test('Saturday before the Epiphany 2026 — the evening is still the Epiphany EP I (no regression)', async ({
    request,
  }) => {
    const { status, body } = await fetchHour(request, DATES.christmasWeekdaySat2026, 'vespers')
    expect(status).toBe(200)
    expect(body.effectiveLiturgicalDay?.date, 'Saturday evening is promoted to the Epiphany').toBe(DATES.epiphany2026)
    const gc = section(body, 'gospelCanticle')
    expect(gc?.antiphon).not.toBe(OCTAVE.vespers!.gospelCanticleAntiphon)
    expect(gc?.antiphon, 'Epiphany EP I Magnificat antiphon (p.609)').toContain('Одыг хараад мэргэд')
  })

  // @fr FR-181
  test('2029 — Epiphany on Jan 7 and the Baptism on Monday Jan 8: Jan 2–6 are octave, no epiphanyWeek day exists', async ({
    request,
  }) => {
    await expectFormulary(request, DATES.christmasWeekdayWed2029, 'lauds', OCTAVE.lauds!, 'octave.lauds')
    const sat = await expectFormulary(request, DATES.saturdayBeforeEpiphany2029, 'lauds', OCTAVE.lauds!, 'octave.lauds')
    expect(sat.liturgicalDay.name).toBe('Saturday before Epiphany')

    // The Baptism itself resolves by romcalKey even on a Monday.
    const { status, body } = await fetchHour(request, DATES.baptismOfTheLordMon2029, 'lauds')
    expect(status).toBe(200)
    expect(body.liturgicalDay.name).toBe('Baptism of the Lord')
    const gc = section(body, 'gospelCanticle')
    expect(gc?.antiphon).toContain('Христ Ариун угаалыг хүртсэн')
    expect(gc?.antiphon).not.toBe(EPIPHANY_WEEK.lauds!.gospelCanticleAntiphon)
    expect(gc?.antiphon).not.toBe(OCTAVE.lauds!.gospelCanticleAntiphon)
  })

  // @fr FR-181
  test('2030 — Epiphany on Jan 6: Jan 7 … Jan 12 are epiphanyWeek', async ({ request }) => {
    const mon = await expectFormulary(request, DATES.epiphanyWeekMon2030, 'lauds', EPIPHANY_WEEK.lauds!, 'epiphanyWeek.lauds')
    expect(mon.liturgicalDay.name).toContain('Raymond') // Jan 7 optional memorial, seasonal base
    const sat = await expectFormulary(request, DATES.epiphanyWeekSat2030, 'lauds', EPIPHANY_WEEK.lauds!, 'epiphanyWeek.lauds')
    expect(sat.liturgicalDay.name).toBe('Saturday after Epiphany')
  })

  // @fr FR-181
  test('no regression on the named days around the range — Jan 1, Epiphany, Baptism, first OT Monday', async ({
    request,
  }) => {
    const jan1 = await fetchHour(request, DATES.maryMotherOfGod2026, 'lauds')
    expect(jan1.status).toBe(200)
    expect(jan1.body.liturgicalDay.name).toContain('Mary')
    const jan1Ant = section(jan1.body, 'gospelCanticle')?.antiphon ?? ''
    expect(jan1Ant).not.toBe(OCTAVE.lauds!.gospelCanticleAntiphon)
    expect(jan1Ant).not.toBe(EPIPHANY_WEEK.lauds!.gospelCanticleAntiphon)

    const epiphany = await fetchHour(request, DATES.epiphany2026, 'lauds')
    expect(epiphany.status).toBe(200)
    expect(epiphany.body.liturgicalDay.name).toBe('Epiphany')
    expect(section(epiphany.body, 'gospelCanticle')?.antiphon, 'Epiphany Lauds antiphon (p.609)').toContain('Өнөөдөр хүргэн Шашин болсон')

    const baptism = await fetchHour(request, DATES.baptismOfTheLord2026, 'lauds')
    expect(baptism.status).toBe(200)
    expect(baptism.body.liturgicalDay.name).toBe('Baptism of the Lord')
    expect(section(baptism.body, 'gospelCanticle')?.antiphon).toContain('Христ Ариун угаалыг хүртсэн')

    const ot = await fetchHour(request, DATES.psalterW1Monday, 'lauds')
    expect(ot.status).toBe(200)
    expect(ot.body.liturgicalDay.season).toBe('ORDINARY_TIME')
    const otAnt = section(ot.body, 'gospelCanticle')?.antiphon ?? ''
    expect(otAnt).not.toBe(EPIPHANY_WEEK.lauds!.gospelCanticleAntiphon)
    expect(otAnt).not.toBe(OCTAVE.lauds!.gospelCanticleAntiphon)
  })

  // @fr FR-181
  test('/pray/2026-01-05/lauds renders the «Гурван мэргэд» Benedictus antiphon (SSR)', async ({ page }) => {
    await page.goto(`/pray/${DATES.epiphanyWeekMon2026}/lauds`)
    await expect(page.locator('article')).toBeVisible()
    const dom = (await page.locator('body').textContent()) ?? ''
    expect(dom).toContain('Гурван мэргэд')
  })
})
