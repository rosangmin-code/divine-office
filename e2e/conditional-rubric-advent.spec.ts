import { test, expect } from '@playwright/test'

// FR-160-B PR-9b — Advent conditional rubric e2e coverage.
//
// Advent ships 1 conditional rubric (advent-dec24-sun-lauds-psalmody-
// substitute) with `when={season:[ADVENT], dateRange:{from:'12-24',
// to:'12-24'}}, action:substitute, appliesTo:psalmody`. The dateRange
// axis is the unique coverage requirement here — none of the other 11
// rubrics use a date-range. The dispatch must:
//
//   1. fire on 2025-12-24 lauds (matching dateRange + season)
//   2. NOT fire on 2025-12-23 lauds (dateRange miss, MM-DD < from)
//   3. NOT fire on 2025-12-04 lauds (Advent W1 weekday — wide miss)
//   4. NOT fire on 2025-12-24 vespers (cell scope: rubric on lauds cell only)

interface DirectiveProbe {
  rubricId?: string
  mode?: string
  text?: string
}

interface PsalmodySection {
  type: 'psalmody'
  directives?: DirectiveProbe[]
}

function findPsalmody(sections: { type: string }[]): PsalmodySection | undefined {
  return sections.find((s) => s.type === 'psalmody') as PsalmodySection | undefined
}

const ADVENT_DEC24_RUBRIC_ID = 'advent-dec24-sun-lauds-psalmody-substitute'

test.describe('FR-160-B PR-9b — Advent conditional rubrics (dateRange axis)', () => {
  // @fr FR-160-B-5b
  test('Advent dec24 lauds psalmody surfaces substitute directive (dateRange match)', async ({
    request,
  }) => {
    // 2025-12-24 = Wednesday, late Advent. season=ADVENT, MM-DD=12-24.
    const res = await request.get(`/api/loth/2025-12-24/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody, 'psalmody section present').toBeTruthy()
    const sub = psalmody?.directives?.find((d) => d.rubricId === ADVENT_DEC24_RUBRIC_ID)
    expect(sub, 'dec24 substitute directive must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    expect(sub!.text).toContain('явагдаж буй долоо хоногоос татаж авна')
  })

  // @fr FR-160-B-5b
  test('Advent dec23 lauds has NO directive (dateRange miss — before from)', async ({
    request,
  }) => {
    // 2025-12-23 = Tuesday, late Advent (12-17~24 dateKey block). season=ADVENT,
    // MM-DD=12-23 < dateRange.from=12-24, so dispatch must noop.
    const res = await request.get(`/api/loth/2025-12-23/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT')

    const psalmody = findPsalmody(body.sections)
    const dirs = psalmody?.directives ?? []
    const leak = dirs.find((d) => d.rubricId === ADVENT_DEC24_RUBRIC_ID)
    expect(leak, 'dec24 rubric must not leak to dec23').toBeUndefined()
  })

  // @fr FR-160-B-5b
  test('Advent W1 weekday (2025-12-04) lauds has NO directives (wide miss)', async ({ request }) => {
    // 2025-12-04 = Advent Week 1 Thursday. season=ADVENT, MM-DD=12-04 way
    // outside dateRange. Plus the propers cell for W1 THU doesn't carry
    // any conditionalRubrics — wide noop case.
    const res = await request.get(`/api/loth/2025-12-04/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT')

    const psalmody = findPsalmody(body.sections)
    const dirs = psalmody?.directives ?? []
    expect(dirs).toEqual([])
  })

  // @fr FR-160-B-5b
  test('Advent dec24 vespers has NO psalmody directive (cell-scope: lauds-only rubric)', async ({
    request,
  }) => {
    // The advent-dec24 rubric lives on weeks.dec24.SUN.lauds. The vespers
    // cell on the same date carries no conditionalRubrics — dispatch
    // must respect the per-cell scoping.
    const res = await request.get(`/api/loth/2025-12-24/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ADVENT')

    const psalmody = findPsalmody(body.sections)
    const dirs = psalmody?.directives ?? []
    const leak = dirs.find((d) => d.rubricId === ADVENT_DEC24_RUBRIC_ID)
    expect(leak, 'lauds-only rubric must not leak to vespers').toBeUndefined()
  })
})
