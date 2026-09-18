import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// FR-182 — Evening Prayer II (`vespers2`) rich overlay coverage.
//
// The five rich builders author `w{key}-{DAY}-{hour}.rich.json`; only
// `build-short-readings-rich.mjs` listed `vespers2` in its HOURS, so the six
// Sunday/solemnity `vespers2` cells that carry their own intercessions /
// responsory / concluding prayers (advent w1, christmas dec25, lent w1 + w6,
// easter w1 + pentecost) shipped with `shortReadingRich` alone. The plain
// text was correct — the UI simply fell back to the legacy list render for
// those sections. FR-182 adds `vespers2` to the other four builders and
// regenerates the six files. Partial `vespers2` cells (Ordinary-Time
// Sundays, holyFamily / epiphany / baptism, ascension — antiphon + prayers
// only) deliberately get NO `-vespers2.rich.json`: their prayers keep the
// `-vespers` rich fallback, see the control case below.
//
// Dates → cells (all resolve through `getSeasonVespers2`):
//   2026-11-29  1st Sunday of Advent      advent.json    weeks['1'].SUN.vespers2
//   2025-12-25  Christmas (Thursday)      christmas.json weeks['dec25'].SUN.vespers2
//   2026-02-22  1st Sunday of Lent        lent.json      weeks['1'].SUN.vespers2
//   2026-03-29  Palm Sunday               lent.json      weeks['6'].SUN.vespers2
//   2026-04-12  2nd Sunday of Easter      easter.json    weeks['1'].SUN.vespers2
//               (Easter Sunday itself resolves to the `easterSunday` special
//               key, whose cell has no `vespers2`; the numeric week-1 cell is
//               reached by the 2nd Sunday through the wk1 fallback)
//   2026-05-24  Pentecost                 easter.json    weeks['pentecost'].SUN.vespers2
//
// 2025-12-25 is a Thursday, so the F-2 primary↔alternate concluding-prayer
// swap applies (Solemnity not on a Sunday → alternate prayer is primary).
// The concluding-prayer assertion is therefore order-agnostic.

interface RichText {
  blocks?: unknown[]
  page?: number
}

interface Section {
  type: string
  page?: number
  items?: string[]
  petitions?: unknown[]
  rich?: RichText
  textRich?: RichText
  alternateTextRich?: RichText
  text?: string
  alternateText?: string
  fullResponse?: string
  versicle?: string
  shortResponse?: string
}

interface HourPayload {
  liturgicalDay: { name: string; date: string }
  effectiveLiturgicalDay?: { date: string }
  sections: Section[]
}

interface Vespers2Cell {
  intercessions: string[]
  intercessionsPage: number
  responsory: { fullResponse: string; versicle: string; shortResponse: string }
  concludingPrayer: string
  alternativeConcludingPrayer?: string
  concludingPrayerPage: number
}

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), 'utf-8')) as T
}

function vespers2Cell(season: string, weekKey: string): Vespers2Cell {
  const propers = readJson<{ weeks: Record<string, Record<string, { vespers2?: Vespers2Cell }>> }>(
    `src/data/loth/propers/${season}.json`,
  )
  const cell = propers.weeks[weekKey]?.SUN?.vespers2
  if (!cell) throw new Error(`no vespers2 cell at ${season}/weeks[${weekKey}].SUN`)
  return cell
}

function section(body: HourPayload, type: string): Section {
  const s = body.sections.find((x) => x.type === type)
  expect(s, `${type} section present`).toBeTruthy()
  return s as Section
}

function hasRich(rich: RichText | undefined): boolean {
  return !!rich && Array.isArray(rich.blocks) && rich.blocks.length > 0
}

const CASES: Array<{
  date: string
  label: string
  season: string
  weekKey: string
  richFile: string
}> = [
  { date: '2026-11-29', label: '1st Sunday of Advent', season: 'advent', weekKey: '1', richFile: 'advent/w1-SUN-vespers2' },
  { date: '2025-12-25', label: 'Christmas (Thu)', season: 'christmas', weekKey: 'dec25', richFile: 'christmas/wdec25-SUN-vespers2' },
  { date: '2026-02-22', label: '1st Sunday of Lent', season: 'lent', weekKey: '1', richFile: 'lent/w1-SUN-vespers2' },
  { date: '2026-03-29', label: 'Palm Sunday', season: 'lent', weekKey: '6', richFile: 'lent/w6-SUN-vespers2' },
  { date: '2026-04-12', label: '2nd Sunday of Easter', season: 'easter', weekKey: '1', richFile: 'easter/w1-SUN-vespers2' },
  { date: '2026-05-24', label: 'Pentecost', season: 'easter', weekKey: 'pentecost', richFile: 'easter/wpentecost-SUN-vespers2' },
]

test.describe('FR-182 — Evening Prayer II rich overlay (intercessions / responsory / concluding prayers)', () => {
  // @fr FR-182
  test('data contract: the six vespers2 rich files carry all five rich fields with the cell pages', () => {
    for (const c of CASES) {
      const rich = readJson<Record<string, RichText | undefined>>(
        `src/data/loth/prayers/seasonal/${c.richFile}.rich.json`,
      )
      const cell = vespers2Cell(c.season, c.weekKey)
      for (const field of [
        'shortReadingRich',
        'intercessionsRich',
        'responsoryRich',
        'concludingPrayerRich',
        'alternativeConcludingPrayerRich',
      ]) {
        expect(hasRich(rich[field]), `${c.richFile}.${field}`).toBe(true)
      }
      expect(rich.intercessionsRich?.page, `${c.richFile} intercessions page`).toBe(cell.intercessionsPage)
      expect(rich.concludingPrayerRich?.page, `${c.richFile} concluding prayer page`).toBe(
        cell.concludingPrayerPage,
      )
    }
  })

  for (const c of CASES) {
    // @fr FR-182
    test(`${c.date} ${c.label} vespers — intercessions / responsory / concluding prayer render rich, plain text unchanged`, async ({
      request,
    }) => {
      const res = await request.get(`/api/loth/${c.date}/vespers`)
      expect(res.ok()).toBe(true)
      const body = (await res.json()) as HourPayload
      expect(body.effectiveLiturgicalDay, 'no eve promotion on the day itself').toBeUndefined()
      const cell = vespers2Cell(c.season, c.weekKey)

      // Intercessions: rich AST present, plain items byte-equal to the cell.
      const inter = section(body, 'intercessions')
      expect(hasRich(inter.rich), 'intercessions.rich').toBe(true)
      expect(inter.rich?.page).toBe(cell.intercessionsPage)
      expect(inter.items).toEqual(cell.intercessions)

      // Responsory: rich AST present, the three plain fields unchanged.
      const resp = section(body, 'responsory')
      expect(hasRich(resp.rich), 'responsory.rich').toBe(true)
      expect(resp.fullResponse).toBe(cell.responsory.fullResponse)
      expect(resp.versicle).toBe(cell.responsory.versicle)
      expect(resp.shortResponse).toBe(cell.responsory.shortResponse)

      // Concluding prayer: primary + alternate both rich; the pair equals the
      // cell's pair (order-agnostic — F-2 swaps them on a weekday Solemnity).
      const cp = section(body, 'concludingPrayer')
      expect(hasRich(cp.textRich), 'concludingPrayer.textRich').toBe(true)
      expect(hasRich(cp.alternateTextRich), 'concludingPrayer.alternateTextRich').toBe(true)
      expect(new Set([cp.text, cp.alternateText])).toEqual(
        new Set([cell.concludingPrayer, cell.alternativeConcludingPrayer]),
      )

      // Short reading rich was already authored before FR-182 — must stay.
      const sr = section(body, 'shortReading')
      expect(hasRich(sr.textRich), 'shortReading.textRich').toBe(true)
    })
  }

  // @fr FR-182
  test('control: the same days’ lauds keep their (pre-existing) rich intercessions', async ({
    request,
  }) => {
    for (const c of CASES) {
      const res = await request.get(`/api/loth/${c.date}/lauds`)
      expect(res.ok(), `${c.date} lauds`).toBe(true)
      const body = (await res.json()) as HourPayload
      const inter = section(body, 'intercessions')
      expect(hasRich(inter.rich), `${c.date} lauds intercessions.rich`).toBe(true)
    }
  })

  // @fr FR-182
  test('control: an Ordinary-Time Sunday vespers (partial vespers2 cell, no -vespers2 rich file) keeps its psalter intercessions and the -vespers concluding-prayer rich', async ({
    request,
  }) => {
    // 2026-06-14 = 11th Sunday of Ordinary Time. Its `vespers2` cell carries
    // antiphon + prayers only, so FR-182 authors no `-vespers2.rich.json` for
    // it: intercessions come from the psalter commons (untouched), and the
    // primary + alternate concluding prayers keep the `w11-SUN-vespers` rich
    // fallback that was already in place.
    const res = await request.get('/api/loth/2026-06-14/vespers')
    expect(res.ok()).toBe(true)
    const body = (await res.json()) as HourPayload
    expect(body.liturgicalDay.name).toContain('11th Sunday of Ordinary Time')

    const inter = section(body, 'intercessions')
    const hasBody = hasRich(inter.rich) || (inter.items?.length ?? 0) > 0
    expect(hasBody, 'intercessions body present').toBe(true)
    if (!hasRich(inter.rich)) {
      expect(inter.items!.join(' ').trim().length).toBeGreaterThan(0)
    }

    const cp = section(body, 'concludingPrayer')
    expect(hasRich(cp.textRich), 'concludingPrayer.textRich via -vespers fallback').toBe(true)
    expect(hasRich(cp.alternateTextRich), 'concludingPrayer.alternateTextRich via -vespers fallback').toBe(true)
  })

  // @fr FR-182
  test('/pray/2026-11-29/vespers renders the intercessions through the rich path', async ({ page }) => {
    await page.goto('/pray/2026-11-29/vespers')
    const sec = page.locator('section[aria-label="Гуйлтын залбирал"]')
    await expect(sec).toBeVisible()

    // Rich path = single RichContent wrapper, no legacy per-petition data-roles
    // (mirror of the FR-153 Stage 6 assertion in prayer-intercessions.spec.ts).
    await expect(sec.locator('[data-role="intercessions-petition"]')).toHaveCount(0)
    await expect(sec.locator('[data-role="intercessions-refrain"]')).toHaveCount(0)
    await expect(sec.locator('div.space-y-2')).toHaveCount(1)

    // First petition sentence of advent weeks['1'].SUN.vespers2 is visible.
    const cell = vespers2Cell('advent', '1')
    const lead = cell.intercessions[0].split(' ').slice(0, 5).join(' ')
    await expect(sec).toContainText(lead)
    await expect(sec).toContainText('залбирцгаая:')
  })
})
