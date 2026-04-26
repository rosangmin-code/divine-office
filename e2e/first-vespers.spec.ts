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
    // Ps 119:105-112 + Ps 16:1-6 + Philippians 2:6-11), NOT the 4-week
    // psalter Saturday vespers (which would be Ps 113 + 116 + Phil).
    // Note: "Psalm 16" rewritten to versed form "Psalm 16:1-6" by
    // FR-156 Phase 5 WI-A2/WI-B2 (task #87/#90).
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const refs = (psalmody.psalms as Array<{ reference: string }>).map((p) => p.reference)
    expect(refs).toContain('Psalm 119:105-112')
    expect(refs).toContain('Psalm 16:1-6')
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

// @fr FR-156
// @phase 5
// WI-B2 (task #90) — lent 시즌 firstVespers bare-ref → versed 적용 후
// psalm 본문이 실제로 채워지는지 (parser regex 가 versed-form 만 받으므로
// bare-form 일 때는 verses 가 비어 있었음) 확인.
test.describe('First Vespers of Lent Sunday — versed-ref body resolution (FR-156 Phase 5 WI-B2)', () => {
  test('Saturday 2026-02-21 vespers (eve of Lent W1 SUN) psalm bodies are non-empty after rewrite', async ({
    request,
  }) => {
    // Lent W1 SUN firstVespers (psalms[1] = Psalm 142:1-7, 이전 bare
    // "Psalm 142" 였던 것이 #90 rewrite 로 versed-form 으로 변환).
    const res = await request.get('/api/loth/2026-02-21/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('LENT')
    // 2026-02-21 = Saturday of Lent W1 (eve of W1 SUN).
    expect(body.liturgicalDay?.weekOfSeason).toBe(1)

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()

    const psalms = psalmody.psalms as Array<{
      reference: string
      verses: Array<{ verse: number; text: string }>
    }>
    // After WI-B2 rewrite, versed-form refs allow Bible JSONL lookup
    // populating verses[]. ps[1] specifically (Psalm 142:1-7) was bare
    // before; assert its verses are non-empty.
    const ps2 = psalms.find((p) => p.reference === 'Psalm 142:1-7')
    expect(ps2, 'Psalm 142:1-7 must appear after WI-B2 rewrite').toBeTruthy()
    expect(ps2!.verses.length).toBeGreaterThan(0)
    expect(ps2!.verses.some((v) => v.text && v.text.trim().length > 0)).toBe(true)

    // ps[0] (Psalm 119:105-112) was already versed pre-#90 — sanity check
    // that rewrite didn't disturb it.
    const ps1 = psalms.find((p) => p.reference === 'Psalm 119:105-112')
    expect(ps1).toBeTruthy()
    expect(ps1!.verses.length).toBeGreaterThan(0)
  })

  test('Saturday 2026-03-28 vespers (eve of Palm Sunday) psalm bodies + lentPassionSunday variant after rewrite', async ({
    request,
  }) => {
    // Palm Sunday eve. firstVespers psalms[1] (Psalm 16:1-6, ex bare
    // "Psalm 16") rewritten by #90. ps1 (Psalm 119:105-112) carries
    // seasonal_antiphons.lentPassionSunday — promoted Saturday→Sunday
    // identity (W5 SAT → W6 SUN) makes pickSeasonalVariant fire it.
    const res = await request.get('/api/loth/2026-03-28/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('LENT')
    expect(body.liturgicalDay?.weekOfSeason).toBe(5)

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()

    type Psalm = {
      reference: string
      antiphon?: string
      verses: Array<{ verse: number; text: string }>
    }
    const psalms = psalmody.psalms as Psalm[]

    // ps[1] versed-form refs body resolves.
    const ps2 = psalms.find((p) => p.reference === 'Psalm 16:1-6')
    expect(ps2, 'Psalm 16:1-6 must appear after WI-B2 rewrite').toBeTruthy()
    expect(ps2!.verses.length).toBeGreaterThan(0)
    expect(ps2!.verses.some((v) => v.text && v.text.trim().length > 0)).toBe(true)

    // ps[0] lentPassionSunday seasonal variant fires (Phase 4c task #25
    // regression guard — Saturday→Sunday identity promotion makes
    // pickSeasonalVariant return the lentPassionSunday text for W6).
    const ps1 = psalms.find((p) => p.reference === 'Psalm 119:105-112')
    expect(ps1).toBeTruthy()
    expect(ps1!.antiphon).toContain('Сүмд өдөр бүр та нартай хамт байж')
  })
})

// @fr FR-156
// @phase 5
// WI-B3 (task #91) — advent 시즌 firstVespers bare-ref → versed 적용 후
// psalm 본문이 실제로 채워지는지 (parser regex 가 versed-form 만 받으므로
// bare-form 일 때는 verses 가 비어 있었음) + advent seasonal antiphon
// variant 가 올바르게 표면화되는지 확인.
test.describe('First Vespers of Advent Sunday — versed-ref body resolution (FR-156 Phase 5 WI-B3)', () => {
  test('Saturday 2025-11-29 vespers (eve of Advent W1 SUN) psalm bodies are non-empty + advent variant fires', async ({
    request,
  }) => {
    // 2025-11-29 = Saturday between OT W34 and Advent W1 (firstAdventSunday
    // = 2025-11-30). Saturday vespers liturgically renders Advent W1 SUN
    // 1st Vespers. PDF authors firstVespers.psalms[1] as bare "Psalm 142"
    // — WI-B3 (#91) rewrites it to "Psalm 142:1-7" so scripture-ref-parser
    // matches and Bible JSONL lookup populates verses[].
    const res = await request.get(`/api/loth/${DATES.lastOTSaturday}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT')
    expect(body.liturgicalDay?.weekOfSeason).toBe(1)

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()

    type Psalm = {
      reference: string
      antiphon?: string
      verses: Array<{ verse: number; text: string }>
    }
    const psalms = psalmody.psalms as Psalm[]

    // Advent W1 SUN firstVespers psalms (post-rewrite):
    //   ps[0]: Psalm 141:1-9   (already versed pre-#91 — sanity)
    //   ps[1]: Psalm 142:1-7   (rewritten from "Psalm 142" by #91)
    //   ps[2]: Philippians 2:6-11 (canticle, already versed)
    const ps2 = psalms.find((p) => p.reference === 'Psalm 142:1-7')
    expect(ps2, 'Psalm 142:1-7 must appear after WI-B3 rewrite').toBeTruthy()
    expect(ps2!.verses.length).toBeGreaterThan(0)
    expect(ps2!.verses.some((v) => v.text && v.text.trim().length > 0)).toBe(true)

    // ps[0] (Psalm 141:1-9) was already versed pre-#91 — sanity guard
    // that rewrite didn't disturb it.
    const ps1 = psalms.find((p) => p.reference === 'Psalm 141:1-9')
    expect(ps1).toBeTruthy()
    expect(ps1!.verses.length).toBeGreaterThan(0)

    // ps[0] carries seasonal_antiphons.advent — pickSeasonalVariant must
    // surface the advent string (not the default "Аяа Эзэн минь, залбирал
    // минь таны өмнө утлага адил тавигдаг."). The advent antiphon begins
    // "Сайнмэдээний айлдлыг бүх үндэстнүүдэд тунхаглагтун."
    expect(ps1!.antiphon).toContain('Сайнмэдээний айлдлыг')
  })
})

// @fr FR-156
// @phase 5
// WI-B1 — easter season firstVespers bare→versed rewrite. Before the
// rewrite the propers cell stored bare "Psalm 122" which both the
// catalog lookup (psalter-texts.json keys versed-only) and the
// scripture-ref-parser (colon required) missed, so the UI rendered an
// empty psalm card. After rewrite the cell is "Psalm 122:1-9" — direct
// catalog hit, stanzas + psalmPrayer load from PDF source.
test.describe('FR-156 Phase 5 WI-B1 — easter SAT vespers psalm bodies non-empty', () => {
  test('Easter wk3 SAT vespers (2026-04-25) ps1 reference is versed and stanzas + Magnificat render', async ({
    request,
  }) => {
    // Saturday vespers promotes to upcoming Sunday's firstVespers
    // (Easter Wk 4 SUN = 2026-04-26). After Phase 5 rewrite, ps1's
    // ref is "Psalm 122:1-9" rather than the bare "Psalm 122".
    const res = await request.get('/api/loth/2026-04-25/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    type Psalm = {
      reference: string
      antiphon?: string
      stanzas?: string[][]
    }
    const psalms = psalmody.psalms as Psalm[]
    expect(psalms.length).toBeGreaterThanOrEqual(1)

    // ps1 — versed ref + non-empty stanzas + opening line fingerprint.
    const ps1 = psalms[0]
    expect(ps1.reference).toBe('Psalm 122:1-9')
    expect(ps1.antiphon ?? '').not.toBe('')
    expect(ps1.stanzas).toBeTruthy()
    expect(ps1.stanzas!.length).toBeGreaterThan(0)
    expect(ps1.stanzas![0].length).toBeGreaterThan(0)
    const stanza0 = ps1.stanzas![0].join(' ')
    expect(stanza0).toContain('ЭЗЭНий өргөө рүү явцгаая')

    // ps2 — also a Phase 5 rewrite target (Psalm 130 → Psalm 130:1-8).
    const ps2 = psalms[1]
    expect(ps2.reference).toBe('Psalm 130:1-8')
    expect(ps2.stanzas).toBeTruthy()
    expect(ps2.stanzas!.length).toBeGreaterThan(0)

    // Magnificat (gospelCanticle) must render — empty Magnificat was a
    // visible symptom of the firstVespers fallback path failing prior
    // to Phase 5.
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    expect(gc.antiphon ?? '').not.toBe('')
  })
})
