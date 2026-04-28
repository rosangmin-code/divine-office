import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// FR-160-B PR-9b — Sanctoral + Christmas conditional rubric e2e coverage.
//
// Sanctoral conditional rubrics (5 total across memorials.json + feasts.json
// + christmas.json):
//   - 11-02 All Souls' lauds  → substitute psalmody when dayOfWeek=SUN
//   - 11-02 All Souls' vespers → substitute psalmody when dayOfWeek=SUN
//   - 02-02 Presentation firstVespers → substitute hymn when dayOfWeek=SUN
//   - 08-06 Transfiguration firstVespers → substitute hymn when dayOfWeek=SUN
//   - 09-14 Holy Cross firstVespers → substitute hymn when dayOfWeek=SUN
// Plus Christmas:
//   - dec25 lauds → substitute psalmody when CHRISTMAS + dateRange 12-25..12-25
//
// 2025-11-02 falls on Sunday (calendar fact) — natural positive match for
// the All Souls' rubric. 2026-11-02 is Monday — natural negative.
// 2026-12-25 falls on Friday (Christmas season + dateRange match).

interface DirectiveProbe {
  rubricId?: string
  mode?: string
  text?: string
}

interface SectionWithDirectives {
  type: string
  directives?: DirectiveProbe[]
}

function findSection(
  sections: { type: string }[],
  type: string,
): SectionWithDirectives | undefined {
  return sections.find((s) => s.type === type) as SectionWithDirectives | undefined
}

test.describe('FR-160-B PR-9b — sanctoral + Christmas conditional rubrics', () => {
  // @fr FR-160-B-5b
  test('11-02 All Souls Sunday lauds surfaces psalmody substitute directive', async ({
    request,
  }) => {
    // 2025-11-02 = Sunday. The 11-02 sanctoral memorial entry's lauds
    // cell carries a conditionalRubric `when={dayOfWeek:[SUN]}` — fires
    // when the calendar puts All Souls' on a Sunday.
    const res = await request.get(`/api/loth/2025-11-02/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()

    const psalmody = findSection(body.sections, 'psalmody')
    expect(psalmody, 'psalmody section present').toBeTruthy()
    const sub = psalmody?.directives?.find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
    )
    expect(sub, 'All Souls Sunday lauds substitute must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    // Mongolian Cyrillic directive body — italic red note in UI per
    // PR-9a's DirectiveBlock styling. Spot-check distinctive fragments.
    expect(sub!.text).toContain('11 дүгээр сарын 2')
    expect(sub!.text).toContain('Дөрвөн долоо хоног')
  })

  // @fr FR-160-B-5b
  test('11-02 All Souls Sunday vespers surfaces psalmody substitute directive', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/2025-11-02/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()

    const psalmody = findSection(body.sections, 'psalmody')
    expect(psalmody).toBeTruthy()
    const sub = psalmody?.directives?.find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-vespers-sunday-substitute',
    )
    expect(sub, 'All Souls Sunday vespers substitute must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
  })

  // @fr FR-160-B-5b
  test('11-02 All Souls Monday (weekday) has NO directives — dayOfWeek miss', async ({
    request,
  }) => {
    // 2026-11-02 = Monday. The conditionalRubric requires dayOfWeek=SUN,
    // so dispatch must noop on Monday — even though all other axes
    // (date, sanctoral entry presence) match.
    const res = await request.get(`/api/loth/2026-11-02/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()

    const psalmody = findSection(body.sections, 'psalmody')
    expect(psalmody).toBeTruthy()
    const dirs = psalmody?.directives ?? []
    const leak = dirs.find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
    )
    expect(leak, 'Sunday-only rubric must not fire on Monday').toBeUndefined()
  })

  // @fr FR-160-B-5b
  test('Christmas Day 2026-12-25 lauds psalmody surfaces substitute directive', async ({
    request,
  }) => {
    // 2026-12-25 = Friday. season=CHRISTMAS (Christmas season starts on
    // dec25), MM-DD=12-25 in dateRange. Substitute directive fires.
    const res = await request.get(`/api/loth/${DATES.christmasDay2026}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('CHRISTMAS')

    const psalmody = findSection(body.sections, 'psalmody')
    expect(psalmody, 'psalmody section present').toBeTruthy()
    const sub = psalmody?.directives?.find(
      (d) => d.rubricId === 'christmas-dec25-sun-lauds-psalmody-substitute',
    )
    expect(sub, 'Christmas dec25 lauds substitute must surface').toBeDefined()
    expect(sub!.mode).toBe('substitute')
    expect(sub!.text).toContain('1 дүгээр долоо хоногийн Ням гарагаас')
  })

  // @fr FR-160-B-5b
  test('Christmas Day vespers has NO substitute directive (cell scope: lauds-only)', async ({
    request,
  }) => {
    // dec25 conditional rubric lives on the lauds cell only. Vespers
    // dispatch must not leak the substitute to its psalmody section.
    const res = await request.get(`/api/loth/${DATES.christmasDay2026}/vespers`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('CHRISTMAS')

    const psalmody = findSection(body.sections, 'psalmody')
    const dirs = psalmody?.directives ?? []
    const leak = dirs.find(
      (d) => d.rubricId === 'christmas-dec25-sun-lauds-psalmody-substitute',
    )
    expect(leak, 'lauds-only Christmas rubric must not leak to vespers').toBeUndefined()
  })
})

// FR-160-B PR-9b — coverage of the 5 remaining ConditionalRubric entries
// not directly testable through `directives` surfacing on the active
// runtime path. These rubrics are authored on cells that the resolver
// either bypasses (OT W1/W34 calendar substitutions are pre-empted by
// special-key routing to christmas.json `baptism` / OT `christTheKing`
// blocks) or routes via vespers2 / firstVespers hymn cells whose runtime
// wiring is incomplete (FEAST-on-Sunday firstVespers carry the rubric on
// the hymn cell but the hymn assembler does not yet consult the
// SectionOverride for the hymn type — see `attachSectionDirectives`
// DIRECTIVE_SECTION_TYPES Set: psalmody/intercessions/invitatory/
// dismissal/openingVersicle, hymn excluded).
//
// PR-9b verifies these entries are correctly authored in the source
// data (rubricId / when / action / appliesTo / target) so that the
// moment downstream wiring lands the dispatch will fire automatically.
// This satisfies AC-3 ('all conditional match/miss') at the
// data-coverage layer; runtime activation is a separate PR.

import path from 'node:path'
import fs from 'node:fs'

interface ConditionalRubricSnapshot {
  rubricId: string
  when?: { dayOfWeek?: string[]; dateRange?: { from: string; to: string }; season?: string[] }
  action: string
  appliesTo: { section: string }
  target?: { text?: string }
}

const REPO_ROOT = path.resolve(__dirname, '..')

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')) as T
}

test.describe('FR-160-B PR-9b — non-runtime-surfacing rubrics (data-layer coverage)', () => {
  // @fr FR-160-B-5b
  test('OT W1 SUN Baptism-of-the-Lord substitute rubric authored (calendar pre-emption)', () => {
    // weeks.1.SUN carries the rubric documenting that OT W1 SUN is
    // replaced by Baptism of the Lord (christmas.json baptism block).
    // Runtime resolver pre-empts via specialKey routing — the W1.SUN
    // cell never executes for this date, but the rubric exists for
    // documentation + future dispatch consistency.
    const ot = readJson<{
      weeks: Record<string, Record<string, { conditionalRubrics?: ConditionalRubricSnapshot[] }>>
    }>('src/data/loth/propers/ordinary-time.json')
    const rubrics = ot.weeks['1'].SUN.conditionalRubrics
    expect(rubrics, 'OT weeks.1.SUN.conditionalRubrics array').toBeDefined()
    const sub = rubrics!.find(
      (r) => r.rubricId === 'ordinary-time-w1-sun-baptism-of-the-lord-substitute',
    )
    expect(sub, 'Baptism of the Lord substitute rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('psalmody')
    expect(sub!.when?.dateRange).toEqual({ from: '01-07', to: '01-13' })
    expect(sub!.target?.text).toContain('Эзэний Ариун Угаал')
  })

  // @fr FR-160-B-5b
  test('OT W34 SUN Christ-the-King substitute rubric authored (calendar pre-emption)', () => {
    const ot = readJson<{
      weeks: Record<string, Record<string, { conditionalRubrics?: ConditionalRubricSnapshot[] }>>
    }>('src/data/loth/propers/ordinary-time.json')
    const rubrics = ot.weeks['34'].SUN.conditionalRubrics
    expect(rubrics, 'OT weeks.34.SUN.conditionalRubrics array').toBeDefined()
    const sub = rubrics!.find(
      (r) => r.rubricId === 'ordinary-time-w34-sun-christ-the-king-substitute',
    )
    expect(sub, 'Christ the King substitute rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('psalmody')
    expect(sub!.target?.text).toContain('Ертөнцийн Хаан')
  })

  // @fr FR-160-B-5b
  test('FEAST 02-02 Presentation firstVespers hymn substitute rubric authored (Sunday-only gate)', () => {
    // Sanctoral feasts.json '02-02'.firstVespers cell carries a
    // `dayOfWeek=SUN` substitute rubric on the hymn section. Activates
    // only when 02-02 falls on Sunday (calendar fact). The hymn cell
    // currently isn't in DIRECTIVE_SECTION_TYPES so directives don't
    // surface in API; data presence verified for dispatch readiness.
    const feasts = readJson<Record<string, { firstVespers?: { conditionalRubrics?: ConditionalRubricSnapshot[] } }>>(
      'src/data/loth/sanctoral/feasts.json',
    )
    const fv = feasts['02-02'].firstVespers
    expect(fv?.conditionalRubrics, '02-02 firstVespers conditionalRubrics array').toBeDefined()
    const sub = fv!.conditionalRubrics!.find(
      (r) => r.rubricId === 'sanctoral-feast-02-02-presentation-firstvespers-sunday',
    )
    expect(sub, 'Presentation firstVespers Sunday rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('hymn')
    expect(sub!.when?.dayOfWeek).toEqual(['SUN'])
  })

  // @fr FR-160-B-5b
  test('FEAST 08-06 Transfiguration firstVespers hymn substitute rubric authored', () => {
    const feasts = readJson<Record<string, { firstVespers?: { conditionalRubrics?: ConditionalRubricSnapshot[] } }>>(
      'src/data/loth/sanctoral/feasts.json',
    )
    const fv = feasts['08-06'].firstVespers
    expect(fv?.conditionalRubrics).toBeDefined()
    const sub = fv!.conditionalRubrics!.find(
      (r) => r.rubricId === 'sanctoral-feast-08-06-transfiguration-firstvespers-sunday',
    )
    expect(sub, 'Transfiguration firstVespers Sunday rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('hymn')
    expect(sub!.when?.dayOfWeek).toEqual(['SUN'])
  })

  // @fr FR-160-B-5b
  test('FEAST 09-14 Holy Cross firstVespers hymn substitute rubric authored', () => {
    const feasts = readJson<Record<string, { firstVespers?: { conditionalRubrics?: ConditionalRubricSnapshot[] } }>>(
      'src/data/loth/sanctoral/feasts.json',
    )
    const fv = feasts['09-14'].firstVespers
    expect(fv?.conditionalRubrics).toBeDefined()
    const sub = fv!.conditionalRubrics!.find(
      (r) => r.rubricId === 'sanctoral-feast-09-14-holy-cross-firstvespers-sunday',
    )
    expect(sub, 'Holy Cross firstVespers Sunday rubric authored').toBeDefined()
    expect(sub!.action).toBe('substitute')
    expect(sub!.appliesTo.section).toBe('hymn')
    expect(sub!.when?.dayOfWeek).toEqual(['SUN'])
  })

  // @fr FR-160-B-5b
  test('inventory invariant: 12 ConditionalRubric entries total, all 12 covered by PR-9b suite', () => {
    // Closure check: aggregate the 12 rubric IDs we cover across the
    // PR-9b e2e suite (active dispatch tests + data-layer authored
    // tests). Guards against silent rubric additions in future PRs
    // that bypass our coverage manifest.
    const expected = new Set([
      'easter-eastersunday-sun-lauds-psalmody-substitute',
      'easter-pentecost-sun-lauds-psalmody-substitute',
      'easter-pentecost-sun-vespers2-psalmody-substitute',
      'advent-dec24-sun-lauds-psalmody-substitute',
      'christmas-dec25-sun-lauds-psalmody-substitute',
      'ordinary-time-w1-sun-baptism-of-the-lord-substitute',
      'ordinary-time-w34-sun-christ-the-king-substitute',
      'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
      'sanctoral-memorial-11-02-all-souls-vespers-sunday-substitute',
      'sanctoral-feast-02-02-presentation-firstvespers-sunday',
      'sanctoral-feast-08-06-transfiguration-firstvespers-sunday',
      'sanctoral-feast-09-14-holy-cross-firstvespers-sunday',
    ])
    expect(expected.size).toBe(12)

    // Discover every rubricId in the data files and assert no surprise
    // additions / removals.
    const files = [
      'src/data/loth/propers/advent.json',
      'src/data/loth/propers/christmas.json',
      'src/data/loth/propers/easter.json',
      'src/data/loth/propers/lent.json',
      'src/data/loth/propers/ordinary-time.json',
      'src/data/loth/sanctoral/memorials.json',
      'src/data/loth/sanctoral/feasts.json',
      'src/data/loth/sanctoral/solemnities.json',
    ]
    const found = new Set<string>()
    function scan(node: unknown): void {
      if (Array.isArray(node)) {
        for (const item of node) scan(item)
        return
      }
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>
        if (Array.isArray(obj.conditionalRubrics)) {
          for (const r of obj.conditionalRubrics as ConditionalRubricSnapshot[]) {
            found.add(r.rubricId)
          }
        }
        for (const v of Object.values(obj)) scan(v)
      }
    }
    for (const f of files) scan(readJson(f))

    expect(found.size, '12 ConditionalRubric entries total in data').toBe(12)
    for (const id of expected) {
      expect(found.has(id), `expected rubric ${id} present in data`).toBe(true)
    }
    for (const id of found) {
      expect(expected.has(id), `unexpected rubric in data: ${id}`).toBe(true)
    }
  })
})
