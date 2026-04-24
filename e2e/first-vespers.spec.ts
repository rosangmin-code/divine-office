import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-156 Phase 2 (task #20) — Sunday 1st Vespers injection.
//
// Saturday vespers liturgically renders the upcoming Sunday's First
// Vespers. Before Phase 2 the app fell back to Sunday's regular vespers
// propers; Phase 2 injects dedicated First Vespers psalms + seasonal
// antiphon variants (extracted from "1 дүгээр Оройн даатгал залбирал"
// blocks in the PDF) into each Sunday's propers entry.
//
// This spec exercises Palm Sunday Eve (2026-03-28 Saturday). The
// injected propers/lent.json weeks['6'].SUN.firstVespers = PDF_W2
// block, whose ps1 seasonal_antiphons.lentPassionSunday = "Сүмд өдөр
// бүр та нартай хамт байж, зааж байхад минь та нар Намайг бариагүй.
// Одоо Та нар намайг цээрлүүлэхээр загалмай руу дагуулж ирлээ." The
// render pipeline promotes Saturday-to-Sunday so pickSeasonalVariant
// returns this text for weekOfSeason=6 (extended from W5-only).
test.describe('First Vespers of Palm Sunday (FR-156)', () => {
  test('Saturday 2026-03-28 vespers API returns PDF_W2 First Vespers propers', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.palmSundayEve}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('LENT')
    expect(body.liturgicalDay?.weekOfSeason).toBe(5) // Saturday of Lent W5

    // Psalmody must reflect the First Vespers of Palm Sunday (PDF_W2:
    // Ps 119:105-112 + Ps 16 + Philippians 2:6-11), NOT the 4-week
    // psalter Saturday vespers (which would be Ps 113 + 116 + Phil).
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const refs = (psalmody.psalms as Array<{ reference: string }>).map((p) => p.reference)
    expect(refs).toContain('Psalm 119:105-112')
    expect(refs).toContain('Psalm 16')
    expect(refs).toContain('Philippians 2:6-11')
  })

  test('ps1 antiphon picks lentPassionSunday variant (PDF line 5554)', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.palmSundayEve}/vespers`)
    const body = await res.json()
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    const ps1 = (psalmody.psalms as Array<{ reference: string; antiphon?: string }>).find(
      (p) => p.reference === 'Psalm 119:105-112',
    )
    expect(ps1).toBeTruthy()
    // Byte-equal check against the exact PDF text (NFR-009c pattern).
    expect(ps1!.antiphon).toBe(
      'Сүмд өдөр бүр та нартай хамт байж, зааж байхад минь та нар Намайг бариагүй. Одоо Та нар намайг цээрлүүлэхээр загалмай руу дагуулж ирлээ.',
    )
  })

  test('ordinary Sunday (2026-02-08) vespers still renders regular 2nd Vespers (regression)', async ({
    request,
  }) => {
    // Sanity: Phase 2 must not break actual Sunday (not Saturday evening)
    // vespers. Ordinary Sunday's /vespers endpoint hits the regular
    // Sunday-vespers branch, bypassing firstVespers entirely.
    const res = await request.get(`/api/loth/${DATES.ordinarySunday}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ORDINARY_TIME')
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    // Existence check — any valid Sunday vespers render is acceptable.
    expect((psalmody.psalms as unknown[]).length).toBeGreaterThan(0)
  })
})
