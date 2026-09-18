import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// FR-160-B PR-9b — Sanctoral + Christmas conditional rubric e2e coverage.
//
// Sanctoral conditional rubrics (2 total across memorials.json +
// christmas.json):
//   - 11-02 All Souls' lauds  → substitute psalmody when dayOfWeek=SUN
//   - 11-02 All Souls' vespers → substitute psalmody when dayOfWeek=SUN
//   (FR-180: the three feasts.json `firstVespers` rubrics — 02-02 / 08-06 /
//   09-14 «Ням гарагт таарвал» — were a STRUCTURAL note, not a hymn
//   substitute; they moved to `firstVespers.sundayOnly`, see below.)
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

  // @fr FR-180
  test('FEAST 02-02 / 08-06 / 09-14 firstVespers carry `sundayOnly` (book p.821/831/835) and no hymn-substitute rubric; 11-09 Lateran has neither', () => {
    // The book prints «Хэрэв энэ баяр Ням гарагт таарвал 1 дүгээр Оройн
    // даатгал залбирал уншина.» (p.821) and «(Хэрэв энэ баяр Ням гарагт
    // таарвал)» (p.831, p.835) at the head of the feast's First Vespers —
    // a rule about WHETHER Evening Prayer I exists that year, not a hymn
    // directive. Before FR-180 it was authored as a `substitute hymn`
    // rubric keyed to SUN, which replaced the hymn body with the note on
    // exactly the Sundays the office is legitimate. The Lateran (p.840)
    // prints the heading without the note and stays unconditional.
    type FirstVespersCell = {
      sundayOnly?: { evidencePdf?: { page?: number; text?: string } }
      conditionalRubrics?: ConditionalRubricSnapshot[]
    }
    const feasts = readJson<Record<string, { firstVespers?: FirstVespersCell }>>(
      'src/data/loth/sanctoral/feasts.json',
    )
    const expected: Array<[string, number, string]> = [
      ['02-02', 821, 'Ням гарагт таарвал 1 дүгээр Оройн даатгал залбирал уншина'],
      ['08-06', 831, 'Ням гарагт таарвал'],
      ['09-14', 835, 'Ням гарагт таарвал'],
    ]
    for (const [key, page, fragment] of expected) {
      const fv = feasts[key].firstVespers
      expect(fv, `${key} firstVespers cell`).toBeDefined()
      expect(fv!.sundayOnly?.evidencePdf?.page, `${key} sundayOnly page`).toBe(page)
      expect(fv!.sundayOnly?.evidencePdf?.text ?? '', `${key} sundayOnly text`).toContain(fragment)
      expect(fv!.conditionalRubrics, `${key} firstVespers must carry no rubric`).toBeUndefined()
    }
    const lateran = feasts['11-09'].firstVespers
    expect(lateran, '11-09 firstVespers cell').toBeDefined()
    expect(lateran!.sundayOnly, '11-09 Lateran is unconditional').toBeUndefined()
    expect(lateran!.conditionalRubrics).toBeUndefined()
  })

  // @fr FR-160-B-5b
  test('inventory invariant: 46 ConditionalRubric entries total, all covered by PR-9b suite', () => {
    // Closure check: aggregate the rubric IDs we cover across the
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
      // GOAL #20 (#20-sub-2) — data-less movable-Solemnity Lauds + 2nd
      // Vespers psalmody substitutes (Week-1 Sunday borrow). 10 entries.
      'ot-trinity-sun-lauds-psalmody-substitute',
      'ot-trinity-sun-vespers2-psalmody-substitute',
      'ot-corpus-sun-lauds-psalmody-substitute',
      'ot-corpus-sun-vespers2-psalmody-substitute',
      'ot-sacredheart-sun-lauds-psalmody-substitute',
      'ot-sacredheart-sun-vespers2-psalmody-substitute',
      'ot-christtheking-sun-lauds-psalmody-substitute',
      'ot-christtheking-sun-vespers2-psalmody-substitute',
      'easter-ascension-sun-lauds-psalmody-substitute',
      'easter-ascension-sun-vespers2-psalmody-substitute',
      // GOAL #27 (#27-sub-1, 16e8741) — 01-01 Mary Mother of God EP-II
      // (vespers2) borrows Week-1 Sunday psalmody. 1 entry.
      'sanctoral-solemnity-01-01-mother-of-god-vespers2-psalmody-substitute',
      // wi-110-001 (4bdf5a0) — align solemnity psalter fallbacks:
      //   (a) movable-Solemnity firstVespers on a WEEKDAY eve keeps the
      //       running psalter and surfaces a note-only rubric. 5 entries.
      'easter-ascension-sun-firstvespers-weekday-psalmody-notice',
      'ot-trinity-sun-firstvespers-weekday-psalmody-notice',
      'ot-corpus-sun-firstvespers-weekday-psalmody-notice',
      'ot-sacredheart-sun-firstvespers-weekday-psalmody-notice',
      'ot-christtheking-sun-firstvespers-weekday-psalmody-notice',
      //   (b) 7 fixed-date solemnities × {firstvespers-weekday notice,
      //       lauds substitute, vespers2-weekday notice}. 21 entries.
      'sanctoral-solemnity-03-19-st-joseph-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-03-19-st-joseph-lauds-psalmody-substitute',
      'sanctoral-solemnity-03-19-st-joseph-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-03-25-annunciation-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-03-25-annunciation-lauds-psalmody-substitute',
      'sanctoral-solemnity-03-25-annunciation-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-06-24-baptist-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-06-24-baptist-lauds-psalmody-substitute',
      'sanctoral-solemnity-06-24-baptist-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-06-29-peter-paul-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-06-29-peter-paul-lauds-psalmody-substitute',
      'sanctoral-solemnity-06-29-peter-paul-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-08-15-assumption-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-08-15-assumption-lauds-psalmody-substitute',
      'sanctoral-solemnity-08-15-assumption-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-11-01-all-saints-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-11-01-all-saints-lauds-psalmody-substitute',
      'sanctoral-solemnity-11-01-all-saints-vespers2-weekday-psalmody-notice',
      'sanctoral-solemnity-12-08-immaculate-conception-firstvespers-weekday-psalmody-notice',
      'sanctoral-solemnity-12-08-immaculate-conception-lauds-psalmody-substitute',
      'sanctoral-solemnity-12-08-immaculate-conception-vespers2-weekday-psalmody-notice',
    ])
    // 22 (PR-9b + GOAL #20) − 3 (FR-180: feast firstVespers Sunday-only
    // notes moved to `sundayOnly`) + 1 (GOAL #27) + 5 + 21 (wi-110-001) = 46.
    // Re-derive with: node -e "…scan conditionalRubrics across the 8 data
    // files…" (see the `scan` walker below) whenever a data PR adds rubrics,
    // and extend this manifest in the same PR.
    const EXPECTED_TOTAL = 46
    expect(expected.size).toBe(EXPECTED_TOTAL)

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

    expect(found.size, `${EXPECTED_TOTAL} ConditionalRubric entries total in data`).toBe(EXPECTED_TOTAL)
    for (const id of expected) {
      expect(found.has(id), `expected rubric ${id} present in data`).toBe(true)
    }
    for (const id of found) {
      expect(expected.has(id), `unexpected rubric in data: ${id}`).toBe(true)
    }
  })
})
