import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { DATES } from './fixtures/dates'

// FR-156 task #30 — FEAST rank First Vespers (evening-before), and
// FR-180 — the book's Sunday-only restriction on three of them.
//
// The 4 fixed-date feasts whose PDF authors a «1 дүгээр Оройн даатгал
// залбирал» block (sanctoral/feasts.json `firstVespers`):
//   - 02-02 Эзэний угтлагын ёслол (Presentation of the Lord) — p.821
//   - 08-06 Эзэний хувиргалт (Transfiguration) — p.831
//   - 09-14 Ариун Нандин Загалмайн алдаршуулал (Exaltation of the Cross) — p.835
//   - 11-09 Латраны нэрэмжит дээд сүмийн Аравнай (Lateran Basilica) — p.840
//
// Printed evidence (FR-180): p.821 opens with «Хэрэв энэ баяр Ням гарагт
// таарвал 1 дүгээр Оройн даатгал залбирал уншина.» and p.831 / p.835 put
// «(Хэрэв энэ баяр Ням гарагт таарвал)» under the EP I heading — First
// Vespers exists ONLY in the years the feast falls on a Sunday. p.840
// prints the Lateran heading with no such note, so it keeps EP I on any
// weekday. The data mirrors this per feast with
// `firstVespers.sundayOnly` (02-02 / 08-06 / 09-14 only).
//
// Consequences the suite pins down:
//   - Sunday occurrence: Saturday eve adopts the feast's EP I (Magnificat
//     antiphon + concluding prayer), and the hymn is a real hymn — before
//     FR-180 the Sunday-only note was mis-encoded as a `substitute hymn`
//     rubric, so the hymn body READ the note on exactly those days.
//   - Weekday occurrence: no firstVespers / firstCompline cards, the
//     `/firstVespers` route and API answer 404, and the evening before
//     keeps its own office (a Sunday keeps its Evening Prayer II).
//   - Lateran: unchanged — Sunday 2026-11-08 still yields to Monday's EP I.

const SUNDAY_ONLY_NOTE = 'Ням гарагт таарвал'

const FEAST_GC_ANTIPHONS = [
  'Хөгшин хүн бяцхан хүүг тэвэрч авсан', // 02-02
  'Христ Есүс, Та бол Эцэгийн цог жавхаа', // 08-06
  'Христ зовлонг эдлэн', // 09-14
  'Йерусалимыг хайрлагчид', // 11-09
]

type Section = { type: string; antiphon?: string; text?: string }

async function fetchSections(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; body: { sections: Section[]; liturgicalDay?: { date: string }; effectiveLiturgicalDay?: { date: string } } }> {
  const res = await request.get(path)
  const status = res.status()
  const body = status === 200 ? await res.json() : { sections: [] }
  return { status, body }
}

function section(sections: Section[], type: string): Section | undefined {
  return sections.find((s) => s.type === type)
}

async function cardHours(page: Page, date: string): Promise<string[]> {
  // `/?date=` opens the month view with that date's row expanded; the
  // hour cards are SSR anchors `/pray/<date>/<hour>` (mobile.spec relies
  // on the same surface).
  await page.goto(`/?date=${date}`)
  const hrefs = await page.locator(`a[href^="/pray/${date}/"]`).evaluateAll((els) =>
    els.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
  )
  return hrefs.map((h) => h.split('/')[3]?.split('?')[0] ?? '').filter(Boolean)
}

test.describe('FEAST rank First Vespers (FR-156 task #30 / FR-180)', () => {
  // ---------------------------------------------------------------
  // Sunday occurrences — EP I exists, Saturday eve adopts it.
  // ---------------------------------------------------------------
  const SUNDAY_CASES = [
    {
      label: 'Presentation',
      eve: DATES.presentationEve2025,
      feast: '2025-02-02',
      antiphon: 'Хөгшин хүн бяцхан хүүг тэвэрч авсан',
      prayer: 'хүмүүн бидний төлөө бие махбодыг олсон',
    },
    {
      label: 'Transfiguration',
      eve: DATES.transfigurationEve2028,
      feast: '2028-08-06',
      antiphon: 'Христ Есүс, Та бол Эцэгийн цог жавхаа',
      prayer: 'Та амин ганц Хүүгийнхээ жавхлант',
    },
    {
      label: 'Exaltation of the Cross',
      eve: DATES.holyCrossEve2025,
      feast: '2025-09-14',
      antiphon: 'Христ зовлонг эдлэн',
      prayer: 'Амин ганц Хүүгээ загалмайн',
    },
  ]

  for (const c of SUNDAY_CASES) {
    // @fr FR-156
    test(`${c.eve} Sat eve surfaces ${c.label} firstVespers Magnificat antiphon + concluding prayer (Sunday occurrence)`, async ({
      request,
    }) => {
      const { status, body } = await fetchSections(request, `/api/loth/${c.eve}/vespers`)
      expect(status).toBe(200)
      const gc = section(body.sections, 'gospelCanticle')
      expect(gc).toBeTruthy()
      expect(gc!.antiphon).toContain(c.antiphon)
      const cp = section(body.sections, 'concludingPrayer')
      expect(cp).toBeTruthy()
      expect(cp!.text).toContain(c.prayer)
      // The eve is promoted to the feast's identity.
      expect(body.effectiveLiturgicalDay?.date).toBe(c.feast)
    })

    // @fr FR-180
    test(`${c.feast} ${c.label} (Sunday): hymn is a real hymn, not the Sunday-only note — eve vespers and /firstVespers`, async ({
      request,
    }) => {
      for (const path of [`/api/loth/${c.eve}/vespers`, `/api/loth/${c.feast}/firstVespers`]) {
        const { status, body } = await fetchSections(request, path)
        expect(status, path).toBe(200)
        const hymn = section(body.sections, 'hymn')
        expect(hymn, `${path} hymn section`).toBeTruthy()
        expect(hymn!.text ?? '', `${path} hymn must not be the rubric note`).not.toContain(SUNDAY_ONLY_NOTE)
        expect((hymn!.text ?? '').length, `${path} hymn body`).toBeGreaterThan(40)
        // Whole payload: the note must not surface anywhere (rubric was
        // a `substitute hymn` directive before FR-180).
        expect(JSON.stringify(body)).not.toContain(SUNDAY_ONLY_NOTE)
      }
    })

    // @fr FR-180
    test(`${c.feast} ${c.label} (Sunday): firstVespers card present, Saturday eve cards stripped`, async ({
      page,
    }) => {
      expect(await cardHours(page, c.feast)).toEqual([
        'firstVespers',
        'firstCompline',
        'lauds',
        'vespers',
        'compline',
      ])
      expect(await cardHours(page, c.eve)).toEqual(['lauds'])
    })
  }

  // ---------------------------------------------------------------
  // Weekday occurrences — NO EP I (book: Sunday only).
  // ---------------------------------------------------------------
  const WEEKDAY_CASES = [
    {
      label: 'Presentation (Mon)',
      eve: DATES.presentationWeekdayEve2026, // 2026-02-01, 4th Sunday of OT
      feast: '2026-02-02',
      eveIsSunday: true,
      antiphon: 'Хөгшин хүн бяцхан хүүг тэвэрч авсан',
    },
    {
      label: 'Transfiguration (Thu)',
      eve: DATES.transfigurationWeekdayEve2026, // 2026-08-05, Wed
      feast: '2026-08-06',
      eveIsSunday: false,
      antiphon: 'Христ Есүс, Та бол Эцэгийн цог жавхаа',
    },
    {
      label: 'Exaltation of the Cross (Mon)',
      eve: DATES.holyCrossWeekdayEve2026, // 2026-09-13, 24th Sunday of OT
      feast: '2026-09-14',
      eveIsSunday: true,
      antiphon: 'Христ зовлонг эдлэн',
    },
  ]

  for (const c of WEEKDAY_CASES) {
    // @fr FR-180
    test(`${c.feast} ${c.label}: /firstVespers API and page answer 404 (no EP I on a weekday)`, async ({
      request,
      page,
    }) => {
      const api = await request.get(`/api/loth/${c.feast}/firstVespers`)
      expect(api.status()).toBe(404)
      const apiCompline = await request.get(`/api/loth/${c.feast}/firstCompline`)
      expect(apiCompline.status()).toBe(404)

      const response = await page.goto(`/pray/${c.feast}/firstVespers`)
      expect(response?.status()).toBe(404)
      await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
      await expect(page.locator('article')).toHaveCount(0)
    })

    // @fr FR-180
    test(`${c.eve} eve of ${c.label}: keeps its own Evening Prayer (no promotion to the feast)`, async ({
      request,
    }) => {
      const { status, body } = await fetchSections(request, `/api/loth/${c.eve}/vespers`)
      expect(status).toBe(200)
      expect(body.liturgicalDay?.date).toBe(c.eve)
      // Not promoted: either no effectiveLiturgicalDay, or it is the eve itself.
      if (body.effectiveLiturgicalDay) {
        expect(body.effectiveLiturgicalDay.date).toBe(c.eve)
      }
      const gc = section(body.sections, 'gospelCanticle')
      expect(gc).toBeTruthy()
      expect(gc!.antiphon).not.toContain(c.antiphon)
      for (const leak of FEAST_GC_ANTIPHONS) expect(gc!.antiphon).not.toContain(leak)
      expect(JSON.stringify(body)).not.toContain(SUNDAY_ONLY_NOTE)
    })

    // @fr FR-180
    test(`${c.feast} ${c.label}: no firstVespers card; eve keeps vespers + compline cards`, async ({
      page,
    }) => {
      expect(await cardHours(page, c.feast)).toEqual(['lauds', 'vespers', 'compline'])
      const eveCards = await cardHours(page, c.eve)
      expect(eveCards).toContain('vespers')
      expect(eveCards).toContain('compline')
      if (c.eveIsSunday) {
        // A Sunday carries its OWN First Vespers cards (FR-011) and — now
        // that Monday's feast has no EP I — its Evening Prayer II too.
        expect(eveCards).toEqual(['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'])
      } else {
        expect(eveCards).toEqual(['lauds', 'vespers', 'compline'])
      }
    })
  }

  // ---------------------------------------------------------------
  // Lateran Basilica — no Sunday-only note (p.840): unchanged by FR-180.
  // ---------------------------------------------------------------
  // @fr FR-156
  test('2026-11-08 Sun eve surfaces Lateran Basilica firstVespers Magnificat antiphon', async ({
    request,
  }) => {
    const { status, body } = await fetchSections(request, `/api/loth/${DATES.lateranBasilicaEve2026}/vespers`)
    expect(status).toBe(200)
    const gc = section(body.sections, 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc!.antiphon).toContain('Йерусалимыг хайрлагчид')
    expect(body.effectiveLiturgicalDay?.date).toBe('2026-11-09')
  })

  // @fr FR-180
  test('2026-11-09 Lateran Basilica (Mon): /firstVespers still 200 and the Sunday eve cards are stripped (regression guard)', async ({
    request,
    page,
  }) => {
    const api = await request.get('/api/loth/2026-11-09/firstVespers')
    expect(api.status()).toBe(200)
    expect(await cardHours(page, '2026-11-09')).toEqual([
      'firstVespers',
      'firstCompline',
      'lauds',
      'vespers',
      'compline',
    ])
    expect(await cardHours(page, DATES.lateranBasilicaEve2026)).toEqual([
      'firstVespers',
      'firstCompline',
      'lauds',
    ])
  })

  // @fr FR-156
  test('Regression: regular Saturday eve of a plain Sunday leaves the eve untouched', async ({
    request,
  }) => {
    // 2026-04-25 Sat → Apr 26 is a regular Sunday (Easter 3rd Sun).
    // No feast/solemnity tomorrow, so the resolver must not accidentally
    // claim the eve. The Saturday→Sunday branch should render the
    // upcoming Sunday's vespers, not any FEAST-leaked antiphon.
    const { status, body } = await fetchSections(request, '/api/loth/2026-04-25/vespers')
    expect(status).toBe(200)
    const gc = section(body.sections, 'gospelCanticle')
    expect(gc).toBeTruthy()
    for (const leak of FEAST_GC_ANTIPHONS) expect(gc!.antiphon).not.toContain(leak)
  })
})
