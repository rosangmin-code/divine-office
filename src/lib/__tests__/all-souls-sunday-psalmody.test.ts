import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection, SectionOverride } from '../types'

// GOAL #27 (#27-sub-2 / FR-160-B-7) — All Souls' (11-02) Sunday-collision
// dynamic psalmody resolve. L2 integration against the REAL assembler
// (assembleHour) + REAL propers/psalter JSON — no mocks. Proves the
// user-perceptible outcome: when 11-02 falls on a Sunday, Lauds + Vespers
// render the actual 4-week-psalter Sunday psalm BODY (the running cycle's
// week, resolved dynamically) instead of a pointer-only "see the Four
// Weeks Sunday" directive note. The directive is preserved as a small
// affordance (`bodyInlined: true`).
//
// Regression guards: a Saturday-eve 11-02 (vespers = First Vespers of the
// following Sunday) and a plain-weekday 11-02 keep their pre-fix behavior.

function psalmodySection(hour: AssembledHour): Extract<HourSection, { type: 'psalmody' }> {
  const s = hour.sections.find((x) => x.type === 'psalmody')
  if (!s) throw new Error('psalmody section not found')
  return s as Extract<HourSection, { type: 'psalmody' }>
}

function substituteDirective(hour: AssembledHour): SectionOverride | undefined {
  return (psalmodySection(hour).directives ?? []).find((d) => d.mode === 'substitute')
}

// A psalm renders its BODY as poetic `stanzas` (PDF source) or fallback
// `verses`. Non-empty either way means the body is inlined.
function hasBody(hour: AssembledHour, idx: number): boolean {
  const p = psalmodySection(hour).psalms[idx]
  return (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0
}

// 2025-11-02 and 2031-11-02 are both Sundays. Romcal maps them to the 31st
// Sunday of Ordinary Time → psalterWeek 3, whose Sunday psalms are
// Psalm 93 (Lauds) / Psalm 110 (Vespers).
const WEEK3_SUN_LAUDS_FIRST = 'Psalm 93:1-5'
const WEEK3_SUN_VESPERS_FIRST = 'Psalm 110:1-5, 7'

describe('All Souls 11-02 on Sunday — dynamic psalmody inline (FR-160-B-7)', () => {
  for (const dateStr of ['2025-11-02', '2031-11-02']) {
    // @fr FR-160-B-7
    it(`${dateStr} Lauds renders the running-cycle Sunday psalm body + bodyInlined`, async () => {
      const hour = await assembleHour(dateStr, 'lauds')
      expect(hour).not.toBeNull()
      const ps = psalmodySection(hour!)
      expect(ps.psalms.length).toBeGreaterThan(0)
      expect(ps.psalms[0].reference).toBe(WEEK3_SUN_LAUDS_FIRST)
      expect(hasBody(hour!, 0)).toBe(true)
      // The substitute directive is preserved as an affordance, flagged
      // bodyInlined so the UI shows the body (not the note alone).
      expect(substituteDirective(hour!)?.bodyInlined).toBe(true)
    })

    // @fr FR-160-B-7
    it(`${dateStr} Vespers renders the running-cycle Sunday psalm body + bodyInlined`, async () => {
      const hour = await assembleHour(dateStr, 'vespers')
      expect(hour).not.toBeNull()
      const ps = psalmodySection(hour!)
      expect(ps.psalms.length).toBeGreaterThan(0)
      expect(ps.psalms[0].reference).toBe(WEEK3_SUN_VESPERS_FIRST)
      expect(hasBody(hour!, 0)).toBe(true)
      expect(substituteDirective(hour!)?.bodyInlined).toBe(true)
    })
  }
})

describe('All Souls 11-02 regression guards (FR-160-B-7)', () => {
  // 2024-11-02 and 2030-11-02 are Saturdays — vespers is the First Vespers
  // of the following Sunday, so the SUN-gated substitute matches only via
  // the promotion. The dynamic borrow MUST be suppressed there (note-only).
  for (const dateStr of ['2024-11-02', '2030-11-02']) {
    // @fr FR-160-B-7
    it(`${dateStr} (Saturday eve) Vespers keeps the note-only surface (no bodyInlined)`, async () => {
      const hour = await assembleHour(dateStr, 'vespers')
      expect(hour).not.toBeNull()
      const directive = substituteDirective(hour!)
      // The substitute directive still fires (First Vespers promotion) ...
      expect(directive).toBeDefined()
      // ... but is NOT inlined → UI hides the body, shows the note (legacy).
      expect(directive?.bodyInlined).toBeUndefined()
    })

    // @fr FR-160-B-7 — Saturday-eve Lauds is All Souls' own (no SUN match).
    it(`${dateStr} (Saturday) Lauds has no Sunday substitute directive`, async () => {
      const hour = await assembleHour(dateStr, 'lauds')
      expect(hour).not.toBeNull()
      expect(substituteDirective(hour!)).toBeUndefined()
    })
  }

  // 2026-11-02 (Mon) and 2027-11-02 (Tue) — plain weekdays. The SUN-gated
  // substitute never fires; both hours render unchanged.
  for (const dateStr of ['2026-11-02', '2027-11-02']) {
    // @fr FR-160-B-7
    it(`${dateStr} (weekday) has no Sunday substitute directive at Lauds or Vespers`, async () => {
      const lauds = await assembleHour(dateStr, 'lauds')
      const vespers = await assembleHour(dateStr, 'vespers')
      expect(substituteDirective(lauds!)).toBeUndefined()
      expect(substituteDirective(vespers!)).toBeUndefined()
    })
  }
})
