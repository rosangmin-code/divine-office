import { test, expect } from '@playwright/test'

// @fr FR-156
// Sanctoral First Vespers parsing-pollution removal (GOAL #24 / WI-25,
// source audit #23). Twelve fixed-date firstVespers concluding prayers
// carried OCR "runaway" pollution — the genuine Evening-Prayer-I collect
// concatenated with the full Second-Vespers (EP-II) bleed and the next
// feast's ALL-CAPS header (12-08 Immaculate Conception was a 92,803-char
// blob). This spec renders each feast's First Vespers via the real route
// and asserts the user-facing concluding prayer is the clean collect only.
//
// First Vespers (Evening Prayer I) of a fixed-date solemnity/feast renders
// on the feast's own `firstVespers` card: GET /api/loth/{feastDate}/firstVespers
// (the route returns 200 for fixed-date solemnities/feasts — cf. the
// route-handler eligibility gate test).

const EP_II_MARKER = '2 дугаар Оройн даатгал залбирал' // Second Vespers bleed
const PAGE_HEADER_SPLICE = 'Гэгээнтнүүдийн Онцлог шинж' // Sanctoral running-header
const BENEDICTUS_BLEED = 'Захариагийн магтаал' // Lauds gospel-canticle label
const INVITATORY_BLEED = 'Урих дуудлага' // Invitatory header

// [feastDate (2026), label, EP-I collect head fragment that MUST survive]
const CASES: Array<[string, string, string]> = [
  ['2026-12-08', '무염시태 Immaculate Conception (P0, was 92,803 chars)', 'Язгуурын гэм нүгэлгүй бүрэлдсэн Цэвэр охин Мариагаар'],
  ['2026-08-15', '성모승천 Assumption (Pattern B, Lauds bleed)', 'Та Өөрийн Хүүгийн эх байх дархан эрхийг цэвэр ариун'],
  ['2026-11-01', '모든성인 All Saints', 'бид бүх цаг үе болон газар газрын гэгээн'],
  ['2026-06-29', '베드로바오로 Sts Peter & Paul (Pattern B)', 'Гэгээн Петр, Паулын залбирлаар дамжуулан Та биднийг'],
  ['2026-06-24', '세례자요한 Birth of John the Baptist (Pattern B)', 'Өөрийн ард түмнийг авралын замаар замнахад тусална'],
  ['2026-03-25', '주님탄생예고 Annunciation', 'Таны Үг бие махбод болж, Цэвэр Охин Мариагаас мэндэлсэн'],
  ['2026-03-19', '성요셉 St Joseph', 'Та бидний Аврагчийг Гэгээн Иосефийн халамжид даатгасан'],
  ['2026-02-02', '주님봉헌 Presentation', 'Аяа, төгс хүчит Эцэг минь'],
  ['2026-08-06', '주님거룩한변모 Transfiguration', 'Та амин ганц Хүүгийнхээ жавхлант'],
  ['2026-09-14', '십자가현양 Exaltation of the Cross', 'Амин ганц Хүүгээ загалмайн'],
  ['2026-11-09', '라테란대성전봉헌 Lateran Basilica', 'эрх сүрийнхээ мөнхийн өргөөг бэлтгэхээр амьд суурь чулууг'],
  // 01-01 Mother of God: runaway was in alternativeConcludingPrayer (which the
  // firstVespers render surfaces as the concludingPrayer section's primary
  // `text`), so it WAS user-visible. EP-II antiphon salvaged to audit §10 first.
  ['2026-01-01', '천주의성모 Mother of God (was 6,826-char altPrayer runaway)', 'бүх үе дэх гэрлийн эх үүсвэр болсон Эцэг минь'],
]

test.describe('Sanctoral First Vespers parsing-pollution removal (FR-156 / GOAL #24)', () => {
  for (const [date, label, headFragment] of CASES) {
    test(`${date} ${label} — concluding prayer is the clean EP-I collect`, async ({ request }) => {
      const res = await request.get(`/api/loth/${date}/firstVespers`)
      expect(res.ok(), `firstVespers must be eligible for ${date}`).toBe(true)
      const body = await res.json()
      const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
      expect(cp, 'concludingPrayer section present').toBeTruthy()
      const text: string = cp.text ?? ''

      // Pollution must be gone — scan the ENTIRE section (text + alternateText +
      // rich variants), not just `text`, so a marker hiding in any field fails.
      const section = JSON.stringify(cp)
      expect(section).not.toContain(EP_II_MARKER)
      expect(section).not.toContain(PAGE_HEADER_SPLICE)
      expect(section).not.toContain(BENEDICTUS_BLEED)
      expect(section).not.toContain(INVITATORY_BLEED)

      // Correct collect survives and is bounded (worst pre-fix blob was 92,803).
      expect(text).toContain(headFragment)
      expect(text.length).toBeLessThan(1500)
      expect(text.trimEnd()).toMatch(/(болтугай|билээ)\.$/)
    })
  }

  test('2026-12-08 Immaculate Conception First Vespers renders the clean collect in the browser (/pray render capture)', async ({
    page,
  }) => {
    await page.goto('/pray/2026-12-08/firstVespers')
    await page.waitForLoadState('networkidle')
    // The /pray page renders prayer bodies inside collapsible sections, so
    // `innerText` (visible-only) omits the collapsed collect. `textContent`
    // captures the full rendered DOM — a STRONGER pollution guard (it sees
    // hidden/collapsed content too) and lets us assert the collect is present.
    const dom = (await page.locator('body').textContent()) ?? ''
    // The runaway pollution must be absent anywhere in the rendered DOM.
    expect(dom).not.toContain(EP_II_MARKER)
    expect(dom).not.toContain(PAGE_HEADER_SPLICE)
    expect(dom).not.toContain(BENEDICTUS_BLEED)
    expect(dom).not.toContain(INVITATORY_BLEED)
    // The genuine Immaculate Conception collect must render. "ариусгагдсан" is
    // unique to the concluding prayer ("...зуучлалын залбирлаар уламжлан
    // ариусгагдсан бид...") and absent from the feast-name heading, which shares
    // the "Язгуурын гэм нүгэлгүй" prefix.
    expect(dom).toContain('ариусгагдсан')
    // The de-spliced adjacency confirms the page-header splice was removed at
    // the render layer (pre-fix this read "Мариагийн Гэгээнтнүүдийн Онцлог шинж
    // зуучлалын").
    expect(dom).toContain('Цэвэр Охин Мариагийн зуучлалын залбирлаар')
  })
})
