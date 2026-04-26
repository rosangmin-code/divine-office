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

// @fr FR-156 Symptom A — psalter commons rich must not Layer-4 override
// firstVespers plain shortReading (task #66 / #72).
//
// Bug context: Saturday vespers in Easter Week 3 (2026-04-25) is the
// 1st Vespers of Easter Week 4 Sunday (2026-04-26). The Sunday firstVespers
// carries shortReading = 2 Peter 1:19-21 ("Үүр цайж...", PDF p.402).
// Before #72, loth-service passed `psalterWeek: day.psalterWeek` (= 3 in
// this case) into resolveRichOverlay, which then loaded
// prayers/commons/psalter/w3-SAT-vespers.rich.json and Layer-4 spread its
// shortReadingRich (= 1 Petr 1:3-7, "Эзэн Есүс Христийн маань...") on
// top of the firstVespers plain shortReading. Because the textRich-priority
// UI prefers the rich overlay, the Saturday psalter commons reading
// surfaced where the Sunday firstVespers reading should have rendered.
//
// Fix: when the firstVespers branch promoted effectiveDayOfWeek (SAT→SUN),
// loth-service passes `psalterWeek: undefined` so resolveRichOverlay
// skips loadPsalterCommonsRichOverlay entirely (psalterWeek != null
// guard in resolver.ts L58). seasonal/sanctoral rich are unaffected.
test.describe('Symptom A regression — Saturday vespers firstVespers shortReading', () => {
  test('Easter wk3 SAT vespers (2026-04-25) shortReading.ref / text come from Sunday firstVespers (PDF p.402), not w3-SAT psalter commons', async ({
    request,
  }) => {
    const res = await request.get('/api/loth/2026-04-25/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const shortReading = body.sections.find(
      (s: { type: string }) => s.type === 'shortReading',
    )
    expect(shortReading).toBeTruthy()

    // Sunday firstVespers reading wins (2 Peter 1:19-21, PDF p.402).
    expect(shortReading.ref).toBe('2 Peter 1:19-21')
    expect(shortReading.page).toBe(402)

    // Body 첫 단어 "Үүр цайж" is the firstVespers plain shortReading.
    // hours/resolvers/reading.ts wires shortReading.text into a single
    // synthetic verse when present; otherwise it splits per-verse.
    const verses = shortReading.verses as Array<{ verse: number; text: string }>
    const plainText = verses.map((v) => v.text).join(' ')
    expect(plainText).toContain('Үүр цайж')

    // Negative guard: w3-SAT-vespers psalter commons rich (1 Petr 1:3-7,
    // "Эзэн Есүс Христийн маань Тэнгэрбурхан ба Эцэг") must NOT have
    // overridden the firstVespers reading.
    expect(plainText).not.toContain('Эзэн Есүс Христийн маань')

    // textRich must also NOT carry the Saturday psalter commons rich.
    type RichSpan = { kind: string; text?: string }
    type RichBlock = { kind: string; spans?: RichSpan[] }
    const tr = shortReading.textRich as { blocks?: RichBlock[] } | undefined
    const richText = (tr?.blocks?.[0]?.spans ?? [])
      .map((s) => (s.kind === 'text' ? s.text ?? '' : ''))
      .join('')
    expect(richText).not.toContain('Эзэн Есүс Христийн маань')
  })
})
