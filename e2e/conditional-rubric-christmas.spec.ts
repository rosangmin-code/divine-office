import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// GOAL #13 (FR-160-B-6) — Christmas Day Lauds is a Type-A psalmody-substitute
// cell: the missal draws the psalm BODY from psalter Week 1 Sunday (p.58) but
// prints its OWN proper antiphons. This spec locks the proper-antiphon
// invariant (NOT the Week-1 psalter defaults) so a future proper→default
// regression is caught — the same class of bug the Easter spec guards for
// Easter Sunday / Pentecost.

interface PsalmProbe {
  reference?: string
  antiphon?: string
}
interface DirectiveProbe {
  rubricId?: string
  mode?: string
  bodyInlined?: boolean
}
interface PsalmodySection {
  type: 'psalmody'
  psalms?: PsalmProbe[]
  directives?: DirectiveProbe[]
}

function findPsalmody(sections: { type: string }[]): PsalmodySection | undefined {
  return sections.find((s) => s.type === 'psalmody') as PsalmodySection | undefined
}

test.describe('FR-160-B-6 — Christmas Day Lauds substitute psalmody', () => {
  // @fr FR-160-B-6
  test('Christmas Day lauds inlines the borrowed Week-1 psalmody with PROPER Christmas antiphons', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.christmasDay2026}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('CHRISTMAS')

    const psalmody = findPsalmody(body.sections)
    expect(psalmody, 'psalmody section must be present').toBeTruthy()
    // Borrowed Week-1 Sunday Lauds psalm BODY (NOT a pointer-only note).
    const refs = (psalmody!.psalms ?? []).map((p) => p.reference)
    expect(refs, 'Week-1 Sunday Lauds psalms inlined').toEqual([
      'Psalm 63:2-9',
      'Daniel 3:57-88, 56',
      'Psalm 149:1-9',
    ])
    // D3: PROPER Christmas antiphons, NOT the Week-1 psalter defaults.
    const antiphons = (psalmody!.psalms ?? []).map((p) => p.antiphon ?? '')
    expect(antiphons.every((a) => a.length > 0), 'every psalm carries an antiphon').toBe(true)
    // Proper Christmas Ant 1 (shepherds) — distinctive token "Хоньчид".
    expect(antiphons[0]).toContain('Хоньчид')
    expect(antiphons[0]).not.toContain('Аяа Тэнгэрбурхан минь')
    // The substitute affordance survives and is marked bodyInlined.
    const sub = (psalmody!.directives ?? []).find(
      (d) => d.rubricId === 'christmas-dec25-sun-lauds-psalmody-substitute',
    )
    expect(sub, 'christmas substitute directive surfaces as affordance').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    expect(sub!.bodyInlined).toBe(true)
  })
})
