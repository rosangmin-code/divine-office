import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-156 task #30 — FEAST rank First Vespers (evening-before).
//
// Phase 3a/4a shipped the evening-before resolver gated on
// `tomorrowDay.rank === 'SOLEMNITY'`. Task #30 relaxes the gate to
// `SOLEMNITY || FEAST` so the 4 fixed-date feasts whose PDF authors a
// 1st Vespers block (already injected into sanctoral/feasts.json by
// Phase 3b) now surface on the evening before.
//
// The 4 entries (all present in feasts.json, firstVespers populated):
//   - 02-02 Эзэний угтлагын ёслол (Presentation of the Lord)
//   - 08-06 Эзэний хувиргалт (Transfiguration)
//   - 09-14 Ариун Нандин Загалмайн алдаршуулал (Exaltation of the Cross)
//   - 11-09 Латраны нэрэмжит дээд сүмийн Аравнай (Lateran Basilica)
//
// Each feast firstVespers has gospelCanticleAntiphon + concludingPrayer
// but no own psalms — so the assertions focus on Magnificat antiphon +
// concluding prayer distinctive strings.
test.describe('FEAST rank First Vespers (FR-156 task #30)', () => {
  test('2026-02-01 Sun eve surfaces Presentation firstVespers Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.presentationEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // 02-02 firstVespers GC antiphon: "Хөгшин хүн бяцхан хүүг тэвэрч авсан…"
    expect(gc.antiphon).toContain('Хөгшин хүн бяцхан хүүг тэвэрч авсан')
  })

  test('2026-02-01 eve concluding prayer comes from Presentation firstVespers', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.presentationEve2026}/vespers`)
    const body = await res.json()
    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    expect(cp.text).toContain('хүмүүн бидний төлөө бие махбодыг олсон')
  })

  test('2026-08-05 Wed eve surfaces Transfiguration firstVespers Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.transfigurationEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc.antiphon).toContain('Христ Есүс, Та бол Эцэгийн цог жавхаа')
  })

  test('2026-09-13 Sun eve surfaces Exaltation of the Cross firstVespers Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.holyCrossEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc.antiphon).toContain('Христ зовлонг эдлэн')
  })

  test('2026-11-08 Sun eve surfaces Lateran Basilica firstVespers Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.lateranBasilicaEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc.antiphon).toContain('Йерусалимыг хайрлагчид')
  })

  test('Regression: regular weekday FEAST with no firstVespers leaves eve untouched', async ({
    request,
  }) => {
    // 2026-04-25 Sat → Apr 26 is a regular Sunday (Easter 3rd Sun).
    // No feast/solemnity tomorrow, so the resolver must not accidentally
    // claim the eve. The Saturday→Sunday branch should render the
    // upcoming Sunday's vespers, not any FEAST-leaked antiphon.
    const res = await request.get(`/api/loth/2026-04-25/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // Sanity: tomorrow-day identity for Saturday eve is the upcoming
    // Sunday's firstVespers / regular vespers — no FEAST-specific
    // strings should leak.
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    const antiphon = gc.antiphon as string
    expect(antiphon).not.toContain('Хөгшин хүн бяцхан хүүг тэвэрч авсан')
    expect(antiphon).not.toContain('Христ Есүс, Та бол Эцэгийн цог жавхаа')
    expect(antiphon).not.toContain('Христ зовлонг эдлэн')
    expect(antiphon).not.toContain('Йерусалимыг хайрлагчид')
  })
})
