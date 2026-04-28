import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { DATES } from './fixtures/dates'

// FR-160-B PR-9b — Easter season conditional rubric e2e coverage.
//
// PR-2~7 marked 12 ConditionalRubric entries across 5 seasons + sanctoral.
// Easter carries 3 of them (easterSunday lauds + pentecost lauds +
// pentecost vespers2 — all psalmody substitute). Each rubric's `when`
// requires `season:[EASTER] + predicate:isFirstHourOfDay` (lauds-only) or
// applies to the dedicated vespers2 cell so the runtime dispatch must:
//
//   1. fire the substitute on Easter Sunday lauds (positive)
//   2. fire on Pentecost lauds (positive)
//   3. fire on Pentecost vespers (positive — vespers2 cell)
//   4. NOT fire on Easter weekday (negative — first-hour-of-day still true
//      but the rubric only lives in easterSunday/pentecost cells, not
//      weekdays — verified via absence of section.directives)
//   5. NOT fire on Easter Sunday vespers (negative — different cell)
//
// Surface contract from PR-9a: each fired rubric appears in
// `section.directives[*]` with `data-role=conditional-rubric-directive`,
// `data-mode=substitute`, `data-rubric-id=<id>`. The API surface exposes
// the directives array directly on each `HourSection`.

interface DirectiveProbe {
  rubricId?: string
  mode?: string
  text?: string
  ref?: string
  ordinariumKey?: string
  index?: number
}

interface PsalmodySection {
  type: 'psalmody'
  directives?: DirectiveProbe[]
}

function findPsalmody(sections: { type: string }[]): PsalmodySection | undefined {
  return sections.find((s) => s.type === 'psalmody') as PsalmodySection | undefined
}

test.describe('FR-160-B PR-9b — Easter conditional rubrics', () => {
  // @fr FR-160-B-5b
  test('Easter Sunday lauds psalmody surfaces substitute directive', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.easterSunday}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody, 'psalmody section must be present').toBeTruthy()
    expect(psalmody?.directives, 'Easter Sunday lauds directives present').toBeDefined()
    expect(psalmody!.directives!.length).toBeGreaterThanOrEqual(1)
    const sub = psalmody!.directives!.find(
      (d) => d.rubricId === 'easter-eastersunday-sun-lauds-psalmody-substitute',
    )
    expect(sub, 'easter Sunday substitute rubric must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    expect(sub!.text).toContain('1 дүгээр долоо хоногийн Ням гарагаас татаж авна')
  })

  // @fr FR-160-B-5b
  test('Pentecost Sunday lauds psalmody surfaces substitute directive', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.pentecostDay2026}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody?.directives, 'Pentecost lauds directives present').toBeDefined()
    const sub = psalmody!.directives!.find(
      (d) => d.rubricId === 'easter-pentecost-sun-lauds-psalmody-substitute',
    )
    expect(sub, 'pentecost lauds substitute rubric must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    expect(sub!.text).toContain('1 дүгээр долоо хоногийн Ням гарагаас')
  })

  // @fr FR-160-B-5b
  test('Pentecost SUN vespers2 cell carries the substitute rubric in source data (structural)', async () => {
    // The vespers2 cell of weeks.pentecost.SUN holds the 2nd Vespers
    // psalmody substitute rubric. Current loth-service.ts routes
    // `hour === 'vespers'` to either sanctoral.vespers2 (when
    // SOLEMNITY-from-sanctoral) or season propers .vespers — the
    // seasonal vespers2 cell is reachable only when an upstream
    // resolver promotes (future PR). PR-9b verifies the rubric is
    // authored in the right cell with the substitute action so the
    // moment routing lands, dispatch fires automatically.
    const easterPath = path.resolve(
      __dirname,
      '..',
      'src',
      'data',
      'loth',
      'propers',
      'easter.json',
    )
    const easter = JSON.parse(fs.readFileSync(easterPath, 'utf-8')) as {
      weeks: Record<string, Record<string, Record<string, unknown>>>
    }
    const v2 = easter.weeks.pentecost.SUN.vespers2 as { conditionalRubrics?: Array<{ rubricId: string; action: string; appliesTo: { section: string } }> }
    expect(v2, 'pentecost.SUN.vespers2 cell exists').toBeDefined()
    expect(v2.conditionalRubrics, 'vespers2 carries conditionalRubrics array').toBeDefined()
    const sub = v2.conditionalRubrics!.find(
      (r) => r.rubricId === 'easter-pentecost-sun-vespers2-psalmody-substitute',
    )
    expect(sub, 'pentecost vespers2 psalmody substitute rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('psalmody')
  })

  // @fr FR-160-B-5b
  test('Easter weekday lauds has NO conditional-rubric directives (negative)', async ({
    request,
  }) => {
    // 2026-04-23 = Easter W3 Thursday — season=EASTER, isFirstHourOfDay=true
    // (lauds), but no rubric attached to this cell. The dispatch must NOT
    // surface any directive even though the season/predicate axes match
    // the easterSunday rubric — the rubric simply doesn't live on this
    // cell's HourPropers.
    const res = await request.get(`/api/loth/${DATES.easterWeekday}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody).toBeTruthy()
    // Either undefined or empty — both are valid noop signals.
    expect(psalmody?.directives ?? []).toEqual([])
  })

  // @fr FR-160-B-5b
  test('Easter Sunday vespers has NO substitute directive on psalmody (negative — different cell)', async ({
    request,
  }) => {
    // Easter Sunday vespers cell carries no conditionalRubrics in
    // easter.json (the substitute lives only on easterSunday.SUN.lauds).
    // Dispatch must respect the cell-level scoping.
    const res = await request.get(`/api/loth/${DATES.easterSunday}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody).toBeTruthy()
    const dirs = psalmody?.directives ?? []
    const easterSundayLaudsRubricLeak = dirs.find(
      (d) => d.rubricId === 'easter-eastersunday-sun-lauds-psalmody-substitute',
    )
    expect(easterSundayLaudsRubricLeak, 'lauds-only rubric must not leak to vespers').toBeUndefined()
  })
})
