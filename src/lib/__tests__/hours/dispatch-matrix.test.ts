import { describe, it, expect } from 'vitest'
import {
  applyConditionalRubrics,
  matchesWhen,
  type ConditionalRubricContext,
} from '../../hours/conditional-rubric-resolver'
import type {
  ConditionalRubric,
  DayOfWeek,
  HourPropers,
  LiturgicalSeason,
} from '../../types'

// FR-160-B PR-9b — dispatch matrix: 5 seasons × 7 days = 35 cells covering
// every (season, dayOfWeek) combination the runtime can produce. Each cell
// runs both the matching positive context (rubric fires) and a negative
// permutation (rubric noop) so dispatch correctness is gated on both the
// match and the miss path.
//
// The vitest `describe.each` table seeds 35 cells; each cell:
//   1. constructs a `ConditionalRubric` whose `when` requires that exact
//      (season, dayOfWeek) pair
//   2. asserts `matchesWhen` returns true for the matching context
//   3. asserts `applyConditionalRubrics` records the rubric in
//      `rubricsApplied` and writes the matching `sectionOverride`
//   4. asserts the rubric does NOT fire when EITHER axis flips (negative
//      coverage — guards against single-axis match leaks)
//
// Cardinality: 35 cells × {match + 2 mismatch} = 105 assertion sites. The
// AC requires ≥35 cases; this layout exceeds the minimum while keeping
// each test self-contained.

const SEASONS: readonly LiturgicalSeason[] = [
  'ADVENT',
  'CHRISTMAS',
  'LENT',
  'EASTER',
  'ORDINARY_TIME',
] as const

const DAYS: readonly DayOfWeek[] = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
] as const

interface MatrixCell {
  season: LiturgicalSeason
  day: DayOfWeek
}

const cells: MatrixCell[] = []
for (const season of SEASONS) {
  for (const day of DAYS) {
    cells.push({ season, day })
  }
}

function pickOtherSeason(s: LiturgicalSeason): LiturgicalSeason {
  return SEASONS.find((x) => x !== s)!
}

function pickOtherDay(d: DayOfWeek): DayOfWeek {
  return DAYS.find((x) => x !== d)!
}

function makeRubric(season: LiturgicalSeason, day: DayOfWeek): ConditionalRubric {
  return {
    rubricId: `matrix-${season}-${day}-substitute-psalmody`,
    when: { season: [season], dayOfWeek: [day] },
    action: 'substitute',
    target: { text: `dispatch-matrix probe ${season}/${day}` },
    appliesTo: { section: 'psalmody' },
    evidencePdf: { page: 1, text: 'matrix probe' },
  }
}

function makeContext(season: LiturgicalSeason, day: DayOfWeek): ConditionalRubricContext {
  return {
    season,
    dayOfWeek: day,
    dateStr: '2026-04-05', // arbitrary — not consulted unless when.dateRange present
    hour: 'lauds',
    isFirstHourOfDay: true,
  }
}

// @fr FR-160-B-5b
describe('FR-160-B PR-9b dispatch matrix — 5 seasons × 7 days × 1 hour = 35 cells', () => {
  it('cell count matches the cross-product cardinality (35)', () => {
    expect(cells).toHaveLength(35)
    expect(SEASONS.length * DAYS.length).toBe(35)
  })

  describe.each(cells)(
    'cell ($season, $day)',
    ({ season, day }) => {
      const otherSeason = pickOtherSeason(season)
      const otherDay = pickOtherDay(day)
      const rubric = makeRubric(season, day)

      // @fr FR-160-B-5b
      it(`fires for matching (${season}, ${day}) context — substitute psalmody`, () => {
        const ctx = makeContext(season, day)
        // matchesWhen: positive
        expect(matchesWhen(rubric.when, ctx)).toBe(true)

        // applyConditionalRubrics: rubric appears in rubricsApplied
        const propers: HourPropers = { conditionalRubrics: [rubric] }
        const out = applyConditionalRubrics(propers, ctx)
        expect(out.rubricsApplied).toHaveLength(1)
        expect(out.rubricsApplied[0].rubricId).toBe(rubric.rubricId)

        // sectionOverride: psalmody substitute carries the rubric's text
        const psalmodyOverrides = out.propers.sectionOverrides?.psalmody
        expect(psalmodyOverrides).toBeDefined()
        expect(psalmodyOverrides).toHaveLength(1)
        expect(psalmodyOverrides![0].rubricId).toBe(rubric.rubricId)
        expect(psalmodyOverrides![0].mode).toBe('substitute')
        expect(psalmodyOverrides![0].text).toBe(
          `dispatch-matrix probe ${season}/${day}`,
        )
      })

      // @fr FR-160-B-5b
      it(`does NOT fire when season axis flips to ${otherSeason}`, () => {
        const ctx = makeContext(otherSeason, day)
        expect(matchesWhen(rubric.when, ctx)).toBe(false)

        const propers: HourPropers = { conditionalRubrics: [rubric] }
        const out = applyConditionalRubrics(propers, ctx)
        expect(out.rubricsApplied).toHaveLength(0)
        expect(out.propers.sectionOverrides).toBeUndefined()
      })

      // @fr FR-160-B-5b
      it(`does NOT fire when dayOfWeek axis flips to ${otherDay}`, () => {
        const ctx = makeContext(season, otherDay)
        expect(matchesWhen(rubric.when, ctx)).toBe(false)

        const propers: HourPropers = { conditionalRubrics: [rubric] }
        const out = applyConditionalRubrics(propers, ctx)
        expect(out.rubricsApplied).toHaveLength(0)
        expect(out.propers.sectionOverrides).toBeUndefined()
      })
    },
  )
})

// @fr FR-160-B-5b
describe('FR-160-B PR-9b dispatch matrix — action enum coverage', () => {
  // Verifies all 4 action variants dispatch correctly within the same
  // matrix harness. AC-3 negative-path coverage at the action axis.
  const cellEaster: MatrixCell = { season: 'EASTER', day: 'SUN' }

  it('skip action — psalmody section override is recorded with mode=skip', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'matrix-easter-sun-skip-psalmody',
      when: { season: ['EASTER'], dayOfWeek: ['SUN'] },
      action: 'skip',
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: 'skip probe' },
    }
    const ctx = makeContext(cellEaster.season, cellEaster.day)
    const out = applyConditionalRubrics(
      { conditionalRubrics: [rubric] },
      ctx,
    )
    expect(out.rubricsApplied).toHaveLength(1)
    const overrides = out.propers.sectionOverrides?.psalmody
    expect(overrides).toBeDefined()
    expect(overrides![0].mode).toBe('skip')
    expect(overrides![0].text).toBeUndefined() // skip carries no inline text
  })

  it('prepend action — psalmody section override carries the prepend text', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'matrix-easter-sun-prepend-psalmody',
      when: { season: ['EASTER'], dayOfWeek: ['SUN'] },
      action: 'prepend',
      target: { text: 'prepend probe text' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: 'prepend probe' },
    }
    const ctx = makeContext(cellEaster.season, cellEaster.day)
    const out = applyConditionalRubrics(
      { conditionalRubrics: [rubric] },
      ctx,
    )
    expect(out.rubricsApplied).toHaveLength(1)
    const overrides = out.propers.sectionOverrides?.psalmody
    expect(overrides).toBeDefined()
    expect(overrides![0].mode).toBe('prepend')
    expect(overrides![0].text).toBe('prepend probe text')
  })

  it('append action — psalmody section override carries the append text', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'matrix-easter-sun-append-psalmody',
      when: { season: ['EASTER'], dayOfWeek: ['SUN'] },
      action: 'append',
      target: { text: 'append probe text' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: 'append probe' },
    }
    const ctx = makeContext(cellEaster.season, cellEaster.day)
    const out = applyConditionalRubrics(
      { conditionalRubrics: [rubric] },
      ctx,
    )
    expect(out.rubricsApplied).toHaveLength(1)
    const overrides = out.propers.sectionOverrides?.psalmody
    expect(overrides).toBeDefined()
    expect(overrides![0].mode).toBe('append')
    expect(overrides![0].text).toBe('append probe text')
  })
})

// @fr FR-160-B-5b
describe('FR-160-B PR-9b dispatch matrix — predicate axis coverage', () => {
  // The `when.predicate` axis is independent of season/day. These
  // cases exercise isFirstHourOfDay on the matrix harness — relevant
  // because the live data (Easter Sunday + Pentecost rubrics) fire only
  // on lauds (isFirstHourOfDay=true), so dispatch must respect the
  // predicate even when season+day match.

  it('predicate isFirstHourOfDay=true matches lauds context', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'matrix-easter-firsthour-substitute',
      when: { season: ['EASTER'], predicate: 'isFirstHourOfDay' },
      action: 'substitute',
      target: { text: 'first hour substitute' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: 'predicate probe' },
    }
    const lauds = makeContext('EASTER', 'SUN')
    expect(matchesWhen(rubric.when, lauds)).toBe(true)
  })

  it('predicate isFirstHourOfDay=true does NOT match vespers context', () => {
    const rubric: ConditionalRubric = {
      rubricId: 'matrix-easter-firsthour-substitute',
      when: { season: ['EASTER'], predicate: 'isFirstHourOfDay' },
      action: 'substitute',
      target: { text: 'first hour substitute' },
      appliesTo: { section: 'psalmody' },
      evidencePdf: { page: 1, text: 'predicate probe' },
    }
    const vespers: ConditionalRubricContext = {
      ...makeContext('EASTER', 'SUN'),
      hour: 'vespers',
      isFirstHourOfDay: false,
    }
    expect(matchesWhen(rubric.when, vespers)).toBe(false)
    const out = applyConditionalRubrics(
      { conditionalRubrics: [rubric] },
      vespers,
    )
    expect(out.rubricsApplied).toHaveLength(0)
  })
})
