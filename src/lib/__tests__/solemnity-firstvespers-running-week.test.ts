import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import { getLiturgicalDay } from '../calendar'
import type { AssembledHour, HourSection } from '../types'

// @fr NFR-009 (liturgical-accuracy / data-fidelity guard)
//
// GOAL #177 (#177-sub-2) — Bug reproduction (RED).
//
// DEFECT: the four movable Ordinary-Time Solemnities — Trinity Sunday,
// Corpus Christi, Sacred Heart, Christ the King — declare NO
// `firstVespers.psalms` array under their special-key blocks
// (`weeks.{trinitySunday,corpusChristi,sacredHeart,christTheKing}` in
// `src/data/loth/propers/ordinary-time.json`). When `/pray/<date>/firstVespers`
// is rendered, `loth-service.ts` therefore falls through to the BASE psalmody
// `getPsalterPsalmody(day.psalterWeek, 'SUN', 'vespers')`, which is the
// running psalter-week Sunday SECOND Vespers (e.g. week-1 = Ps 110 / Ps 114 /
// Rev 19). The First Vespers of these Solemnities ends up showing the wrong
// (Second-Vespers) psalmody.
//
// TARGET (what the fix in #182 must achieve): First Vespers should adopt the
// running psalter-week Sunday FIRST Vespers set
// (`weeks[N].SUN.firstVespers` → fv-wN-sun-*):
//   pw1 = Ps 141:1-9 / Ps 142:1-7 / Phil 2:6-11
//   pw2 = Ps 119:105-112 / Ps 16:1-6 / Phil 2:6-11
//   pw3 = Ps 113:1-9 / Ps 116:10-19 / Phil 2:6-11
//   pw4 = Ps 122:1-9 / Ps 130:1-8 / Phil 2:6-11
//
// These assertions run against the REAL assembler (`assembleHour`) + REAL
// propers/psalter JSON — no mocking of the psalmody. They are RED against the
// current data (the rendered psalmody is the Second-Vespers set), and will go
// GREEN once #182 wires First Vespers to the running-week Sunday First Vespers.

function section<T extends HourSection['type']>(
  hour: AssembledHour,
  type: T,
): Extract<HourSection, { type: T }> | undefined {
  return hour.sections.find((x) => x.type === type) as
    | Extract<HourSection, { type: T }>
    | undefined
}

function psalmRefs(hour: AssembledHour): string[] {
  const ps = section(hour, 'psalmody')
  if (!ps) throw new Error('psalmody section not found')
  return ps.psalms.map((p) => p.reference)
}

// Running psalter-week Sunday FIRST Vespers (TARGET) — keyed by psalterWeek.
// SoT: src/data/loth/propers/ordinary-time.json weeks[*].SUN.firstVespers.
const FIRST_VESPERS_BY_WEEK: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['Psalm 141:1-9', 'Psalm 142:1-7', 'Philippians 2:6-11'],
  2: ['Psalm 119:105-112', 'Psalm 16:1-6', 'Philippians 2:6-11'],
  3: ['Psalm 113:1-9', 'Psalm 116:10-19', 'Philippians 2:6-11'],
  4: ['Psalm 122:1-9', 'Psalm 130:1-8', 'Philippians 2:6-11'],
}

// Running psalter-week Sunday SECOND Vespers (the WRONG set that currently
// renders) — keyed by psalterWeek.
// SoT: src/data/loth/psalter/week-N.json days.SUN.vespers.
const SECOND_VESPERS_BY_WEEK: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['Psalm 110:1-5, 7', 'Psalm 114:1-8', 'Revelation 19:1-7'],
  2: ['Psalm 110:1-5, 7', 'Psalm 115:1-13', 'Revelation 19:1-7'],
  3: ['Psalm 110:1-5, 7', 'Psalm 111:1-10', 'Revelation 19:1-7'],
  4: ['Psalm 110:1-5, 7', 'Psalm 112:1-10', 'Revelation 19:1-7'],
}

interface SolemnityCase {
  date: string // the Solemnity's own day (firstVespers URL anchor, FR-NEW #230)
  label: string
  nameFrag: string // lowercase fragment expected in liturgicalDay.name
  expectedPsalterWeek: 1 | 2 | 3 | 4
}

// Multi-year cases — psalter weeks verified via getLiturgicalDay against this
// project's romcal calendar. The spread of psalterWeek (1,2,3,4) across years
// proves the target behaviour is "running psalter-week", NOT a "week-1-fixed"
// borrow; the spread of solemnities proves it is not Trinity-only.
const CASES: SolemnityCase[] = [
  // Primary case (dispatch-specified): Trinity Sunday eve 2026, psalterWeek 1.
  { date: '2026-05-31', label: 'Trinity Sunday 2026', nameFrag: 'trinity', expectedPsalterWeek: 1 },
  // Multi-year Trinity at psalterWeek != 1 (proves running-week, not week-1).
  { date: '2024-05-26', label: 'Trinity Sunday 2024', nameFrag: 'trinity', expectedPsalterWeek: 4 },
  { date: '2025-06-15', label: 'Trinity Sunday 2025', nameFrag: 'trinity', expectedPsalterWeek: 3 },
  // Second / third / fourth solemnities at psalterWeek != 1 (proves not Trinity-only).
  { date: '2028-06-18', label: 'Corpus Christi 2028', nameFrag: 'corpus', expectedPsalterWeek: 3 },
  { date: '2025-06-27', label: 'Sacred Heart 2025', nameFrag: 'sacred heart', expectedPsalterWeek: 4 },
  { date: '2026-11-22', label: 'Christ the King 2026', nameFrag: 'king', expectedPsalterWeek: 2 },
]

describe('GOAL #177 — movable-Solemnity First Vespers follows the running psalter-week Sunday FIRST Vespers (NFR-009)', () => {
  // Sanity: confirm each case's date/psalterWeek/name against the calendar so a
  // future romcal shift surfaces here rather than silently invalidating the
  // psalmody assertions below.
  it.each(CASES)('calendar fixture holds for $label (pw $expectedPsalterWeek)', ({ date, nameFrag, expectedPsalterWeek }) => {
    const day = getLiturgicalDay(date)
    expect(day, `${date} should resolve a liturgical day`).not.toBeNull()
    expect(day!.rank).toBe('SOLEMNITY')
    expect(day!.name.toLowerCase()).toContain(nameFrag)
    expect(day!.psalterWeek).toBe(expectedPsalterWeek)
  })

  it.each(CASES)(
    'First Vespers psalmody == running-week Sunday FIRST Vespers for $label (pw $expectedPsalterWeek)',
    async ({ date, expectedPsalterWeek }) => {
      const hour = await assembleHour(date, 'firstVespers')
      expect(hour, `${date} firstVespers should assemble`).not.toBeNull()
      expect(hour!.psalterWeek).toBe(expectedPsalterWeek)

      const refs = psalmRefs(hour!)
      const expectedFirst = FIRST_VESPERS_BY_WEEK[expectedPsalterWeek]
      const wrongSecond = SECOND_VESPERS_BY_WEEK[expectedPsalterWeek]

      // (a) MUST render the running-week Sunday FIRST Vespers set.
      expect(refs, `${date}: First Vespers psalmody (psalterWeek ${expectedPsalterWeek})`).toEqual(expectedFirst)

      // (b) MUST NOT render the Sunday SECOND Vespers set.
      expect(refs, `${date}: must not be Second Vespers`).not.toEqual(wrongSecond)
      // Crisp dual-sided signature: the FV NT canticle is present, the SV
      // canticle (Revelation 19) and the SV opening psalm (Ps 110) are not.
      expect(refs, `${date}: First Vespers NT canticle present`).toContain('Philippians 2:6-11')
      expect(refs, `${date}: Second Vespers canticle absent`).not.toContain('Revelation 19:1-7')
      expect(refs, `${date}: Second Vespers opening psalm absent`).not.toContain('Psalm 110:1-5, 7')
    },
  )

  it.each(CASES)(
    'proper parts remain intact for $label (gospel canticle antiphon + concluding prayer)',
    async ({ date }) => {
      const hour = await assembleHour(date, 'firstVespers')
      expect(hour, `${date} firstVespers should assemble`).not.toBeNull()

      // The Solemnity's proper Magnificat antiphon must survive the psalmody
      // swap (#182 must change ONLY the psalmody, not strip the propers).
      const gc = section(hour!, 'gospelCanticle')
      expect(gc, `${date}: gospelCanticle section present`).toBeDefined()
      expect((gc!.antiphon ?? '').trim().length, `${date}: gospelCanticleAntiphon non-empty`).toBeGreaterThan(0)

      const cp = section(hour!, 'concludingPrayer')
      expect(cp, `${date}: concludingPrayer section present`).toBeDefined()
      expect((cp!.text ?? '').trim().length, `${date}: concludingPrayer non-empty`).toBeGreaterThan(0)
    },
  )
})
