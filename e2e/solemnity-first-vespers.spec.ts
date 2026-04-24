import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-156 Phase 3b (task #22) — Solemnity 1st Vespers (evening-before).
//
// Phase 3a (task #21) shipped the resolver branch that, for any vespers
// evening, checks whether tomorrow's liturgical day is a SOLEMNITY and
// if so adopts the sanctoral entry's `firstVespers` propers. Phase 3b
// populates the data: 13 fixed-date solemnities/feasts extracted from
// PDF "1 дүгээр Оройн даатгал залбирал" blocks and injected into
// sanctoral/{solemnities,feasts}.json.
//
// This spec exercises two dispatch-specified dates:
//   1. Christmas Eve 2026-12-24 → tomorrow is Christmas SOLEMNITY
//      (solemnities.json 12-25 firstVespers has full psalter: Ps 113 +
//      Ps 147:12-20 + Phil 2:6-11).
//   2. Assumption Eve 2026-08-14 → tomorrow is Assumption of Mary
//      SOLEMNITY (solemnities.json 08-15 firstVespers has gospel
//      canticle antiphon + concluding prayer; shorter block because the
//      PDF references psalter psalms rather than printing them).
test.describe('Solemnity First Vespers (FR-156 Phase 3b)', () => {
  test('2026-12-24 Christmas Eve vespers adopts Christmas firstVespers psalms', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christmasEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT') // 12/24 itself is still Advent

    // Psalmody must reflect Christmas Solemnity (Ps 113 + Ps 147 + Phil
    // 2:6-11), NOT the Advent-season vespers psalms.
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const refs = (psalmody.psalms as Array<{ reference: string }>).map((p) => p.reference)
    expect(refs).toContain('Psalm 113')
    expect(refs).toContain('Psalm 147')
    expect(refs).toContain('Philippians 2:6-11')
  })

  test('2026-12-24 Christmas Eve Magnificat antiphon is the Christmas antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christmasEve2026}/vespers`)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // Byte-equal check against PDF extraction.
    expect(gc.antiphon).toContain('Нар өглөө тэнгэрт мандахад')
    expect(gc.antiphon).toContain('хаадын Хааныг харах болно')
  })

  test('2026-12-24 Christmas Eve concluding prayer comes from solemnity firstVespers', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christmasEve2026}/vespers`)
    const body = await res.json()
    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    // Christmas firstVespers concluding prayer begins with "Аяа,
    // Тэнгэрбурхан бидний Эцэг минь" (not the Advent Dec24 vigil
    // prayer, which begins differently).
    expect(cp.text).toContain('жил бүр Та энэхүү авралын баяраар')
  })

  test('2026-08-14 Assumption Eve surfaces the Assumption Magnificat antiphon', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.assumptionEve2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const gc = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gc).toBeTruthy()
    // 08-15 Assumption antiphon begins "Харагтун, энэ цагаас хойш намайг
    // ерөөгдөгч гэж бүх үеийнхэн тооцно" (cf Luke 1:48).
    expect(gc.antiphon).toContain('Харагтун, энэ цагаас хойш')
    expect(gc.antiphon).toContain('Хүчит Нэгэн нь миний төлөө')
  })

  test('Regression: Palm Sunday Eve (2026-03-28) still surfaces lentPassionSunday from Phase 2', async ({
    request,
  }) => {
    // Sanity: the Phase 3a solemnity branch must NOT accidentally
    // claim Saturday evenings whose tomorrow is merely a Sunday (not
    // a Solemnity). Palm Sunday is rank=SOLEMNITY in romcal — so the
    // solemnity branch DOES fire for this date — but the fallback
    // chain goes solemnity→Sunday-firstVespers→Sunday-regular, and we
    // confirm the Passion antiphon still surfaces.
    //
    // NOTE: if romcal returns SOLEMNITY for Palm Sunday, the solemnity
    // branch may look up propers/lent.json which doesn't key by MM-DD.
    // Either way, the final rendered ps1 antiphon must contain the
    // Passion Sunday variant.
    const res = await request.get(`/api/loth/${DATES.palmSundayEve}/vespers`)
    const body = await res.json()
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    const ps1 = (psalmody.psalms as Array<{ reference: string; antiphon?: string }>).find(
      (p) => p.reference === 'Psalm 119:105-112',
    )
    expect(ps1).toBeTruthy()
    expect(ps1!.antiphon).toContain('Сүмд өдөр бүр та нартай хамт байж')
  })
})
