import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-156 Phase 4b (task #24) — movable solemnity First Vespers
// (evening-before). Phase 4a (task #23) extended `resolveSpecialKey` to
// cover Easter movables (ascension / pentecost) and OT movables
// (trinitySunday / corpusChristi / sacredHeart / christTheKing). Phase
// 4b injects the `firstVespers` payload into
//   propers/easter.json weeks['ascension'|'pentecost'].SUN.firstVespers
//   propers/ordinary-time.json weeks[specialKey].SUN.firstVespers
//
// When tomorrow is a movable SOLEMNITY, the `assembleHour` resolver's
// tomorrow-check (loth-service.ts L140-154) falls from
// `getSanctoralPropers(MM-DD)` (null for movables) to
// `getSeasonFirstVespers(tomorrow.season, tomorrow.weekOfSeason,
// tomorrow.dateStr, tomorrow.name)`, which via `resolveSpecialKey`
// returns the injected firstVespers. That payload is adopted as
// `seasonPropers` (self-contained — no per-field backstop).
//
// Each test exercises one of the 4 dispatch-specified dates and asserts
// the Magnificat antiphon and/or concluding prayer fragments from the
// PDF-extracted text.
test.describe('Movable Solemnity First Vespers (FR-156 Phase 4b)', () => {
  test('2026-05-13 Wednesday eve of Ascension surfaces the Ascension Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.ascensionEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // Ascension 1st Vespers Magnificat antiphon (John 17:6-9, 11-13 paraphrase).
    expect(gc.antiphon).toContain('Аав аа, Таны Надад өгсөн хүмүүст')
    expect(gc.antiphon).toContain('Аллэлуяа!')
  })

  test('2026-05-13 Ascension eve concluding prayer comes from the Ascension firstVespers', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.ascensionEve2026}/vespers`)
    const body = await res.json()
    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    expect(cp.text).toContain('Хүүгийнхээ тэнгэрт заларснаар биднийг баясган цэнгүүлнэ')
  })

  test('2026-05-23 Saturday eve of Pentecost adopts Pentecost firstVespers psalmody', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.pentecostEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    // Pentecost firstVespers carries its own 3-psalm set (Ps 113 + Ps
    // 147:1-11 + Revelation 15:3-4), distinct from the regular Easter
    // Saturday / Sunday psalter.
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const refs = (psalmody.psalms as Array<{ reference: string }>).map((p) => p.reference)
    expect(refs).toContain('Psalm 113')
    expect(refs).toContain('Psalm 147:1-11')
    expect(refs).toContain('Revelation 15:3-4')

    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc.antiphon).toContain('Ариун Сүнс бууж')
  })

  test('2026-05-30 Saturday eve of Trinity Sunday surfaces the Trinity Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.trinitySundayEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // Trinity Sunday 1st Vespers Magnificat antiphon (doxology).
    expect(gc.antiphon).toContain('Танд бид талархлаа өргөе')
    expect(gc.antiphon).toContain('Ганц бөгөөд үнэн Ариун Гурвал')

    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    expect(cp.text).toContain('Өөрийн Үгийг илгээсэн')
  })

  test('2026-11-21 Saturday eve of Christ the King surfaces the Christ the King Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christTheKingEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // Christ the King 1st Vespers Magnificat antiphon (Luke 1:32-33 paraphrase).
    expect(gc.antiphon).toContain('өвөг Давидынх нь хаан ширээг')
    expect(gc.antiphon).toContain('Иаковын гэрийг үүрд хаанчлах')

    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    expect(cp.text).toContain('Өөрийн Хүү Есүс Христээр')
  })
})
