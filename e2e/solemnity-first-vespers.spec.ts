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
//
// 2026-09-14 — psalm refs are now the versed form (FR-156 Phase 5 WI-B4:
// "Psalm 113:1-9" / "Psalm 147:12-20"), so ref assertions use a prefix
// match. The concluding-prayer assertion follows the F-2 rubric (book
// p.516): Christmas on a weekday → alternate is the default.
function hasRefPrefix(refs: string[], prefix: string): boolean {
  return refs.some((r) => r === prefix || r.startsWith(`${prefix}:`))
}

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
    // Refs are versed post-Phase-5 ("Psalm 113:1-9" / "Psalm 147:12-20").
    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const refs = (psalmody.psalms as Array<{ reference: string }>).map((p) => p.reference)
    expect(hasRefPrefix(refs, 'Psalm 113'), `Psalm 113 in ${refs.join(', ')}`).toBe(true)
    expect(hasRefPrefix(refs, 'Psalm 147'), `Psalm 147 in ${refs.join(', ')}`).toBe(true)
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

  // F-2 (#214, book p.516 "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр"):
  // Christmas 2026 falls on a FRIDAY, so the alternate concluding prayer
  // ("Аяа, хамаг сайн сайхны Эцэг…") is the default and the primary ("Аяа,
  // Тэнгэрбурхан бидний Эцэг минь, жил бүр…") is offered as `alternateText`.
  // The rich markup must come from the same Christmas block (p.588) — the
  // eve used to carry the Advent week-1 Thursday prayer's rich (p.571) as
  // `alternateTextRich` (2026-09-14, §8 건 2/건 4 —
  // docs/bug-reports/2026-09-14-eve-vespers-alternate-and-rich.md).
  test('2026-12-24 Christmas Eve concluding prayer is the Christmas ALTERNATE (weekday Solemnity, F-2 p.516) with same-source rich', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christmasEve2026}/vespers`)
    const body = await res.json()
    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp).toBeTruthy()
    expect(cp.text).toContain('Аяа, хамаг сайн сайхны Эцэг')
    expect(cp.alternateText).toContain('жил бүр Та энэхүү авралын баяраар')
    expect(cp.page).toBe(588)
    expect(cp.alternatePage).toBe(588)
    // Rich follows the plain source (Christmas First Vespers, p.588).
    expect(cp.textRich?.page).toBe(588)
    expect(cp.alternateTextRich?.page).toBe(588)

    const route = await (await request.get('/api/loth/2026-12-25/firstVespers')).json()
    const routeCp = route.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(routeCp.text).toBe(cp.text)
    expect(routeCp.alternateText).toBe(cp.alternateText)
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
