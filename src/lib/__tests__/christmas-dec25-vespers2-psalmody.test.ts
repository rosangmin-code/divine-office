import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection } from '../types'

// GOAL #87 (#88) — Christmas Day (12-25) Second Vespers proper psalmody.
//
// Before: `/pray/<dec25>/vespers` (= Second Vespers / EP-II of the Nativity)
// rendered the running-week WEEKDAY psalter (e.g. 2025-12-25 Thu → Ps
// 144:1-10 / 144:11-15 / Rev 11; 2026-12-25 Fri → Ps 145 / 145 / Rev 15)
// under the REGULAR vespers Magnificat antiphon ("Нар өглөө…"). The book
// (full_pdf p.592-596) prints the Nativity's OWN proper EP-II psalmody —
// Дуулал 110:1-5,7 / Дуулал 130 / Колоссай 1:12-20 — which was authored
// nowhere in the render path: christmas.json `weeks.dec25.SUN.vespers2`
// carried no `psalms`, AND the Second-Vespers swap never even fired for a
// fixed-date season-proper Solemnity (the gate resolved the special key
// without `dateStr`, so date-matched Christmas returned null).
//
// Fix (root cause, two parts):
//   1. loth-service GOAL #20 swap gate now passes `dateStr` to
//      resolveSpecialKey → the swap fires for Christmas Day and adopts
//      `weeks.dec25.SUN.vespers2` (proper EP-II Magnificat antiphon +
//      1 John reading), AND reads its inline `psalms`.
//   2. christmas.json `vespers2.psalms` carries the 3 proper psalms with
//      byte-verbatim antiphons salvaged from full_pdf.txt L20498-20564.
//
// L2 integration against the REAL assembler + REAL propers/psalter JSON —
// no mocks. Proves the user-perceptible outcome. Tested on BOTH a Thursday
// (2025) and a Friday (2026) Christmas to prove the psalmody is now
// weekday-INDEPENDENT (proper), not the running psalter.

// Proper EP-II psalmody refs (full_pdf p.592-596). Ps 130 is NOT a Week-1
// Sunday psalm → this is genuine proper psalmody, not a Week-1 borrow
// (contrast 01-01 Mary EP-II, which DOES borrow Week-1 Sunday).
const CHRISTMAS_V2_PSALMS = ['Psalm 110:1-5, 7', 'Psalm 130:1-8', 'Colossians 1:12-20']

// Byte-verbatim antiphons (full_pdf.txt L20498-20501 / L20532-20533 /
// L20562-20564), wrapped book lines joined with single spaces.
const ANT_PS1 =
  'Танд мэндэлсэн цагаас тань эхлэн ноёдын хишиг оногдсон билээ. Мөнхийн сүр жавхлангаар, дэлхий дээр үүр цайхаас өмнө Би чамайг төрүүлсэн билээ.'
const ANT_PS2 =
  'Эзэнтэй хамт мөнхийн хайр энэрэл байдаг, Түүний авралын хүч агуу юм.'
const ANT_CANT =
  'Эхэд, цаг хугацаа эхлэхээс өмнө Үг нь Тэнгэрбурхан байдаг байсан. Өнөөдөр дэлхий ертөнцийн Аврагч Тэрээр мэндэлсэн.'

// EP-II (Second Vespers) Magnificat antiphon — christmas.json vespers2.
const EP2_MAGNIFICAT = 'Өнөөдөр, Эзэн Христ мэндэллээ'
// REGULAR vespers Magnificat antiphon — must NOT leak into EP-II.
const REGULAR_VESPERS_MAGNIFICAT = 'Нар өглөө тэнгэрт мандахад'

function section<T extends HourSection['type']>(
  hour: AssembledHour,
  type: T,
): Extract<HourSection, { type: T }> {
  const s = hour.sections.find((x) => x.type === type)
  if (!s) throw new Error(`section ${type} not found`)
  return s as Extract<HourSection, { type: T }>
}

function psalmRefs(hour: AssembledHour): string[] {
  return section(hour, 'psalmody').psalms.map((p) => p.reference)
}

function psalmAntiphons(hour: AssembledHour): string[] {
  return section(hour, 'psalmody').psalms.map((p) => p.antiphon ?? '')
}

function hasBody(hour: AssembledHour, idx: number): boolean {
  const p = section(hour, 'psalmody').psalms[idx]
  return (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0
}

describe('12-25 Christmas Day — Second Vespers (vespers2 / EP-II) proper psalmody', () => {
  // 2025-12-25 = Thursday, 2026-12-25 = Friday: two different weekday
  // psalter slots pre-fix, both must now show the SAME proper psalmody.
  for (const date of ['2025-12-25', '2026-12-25']) {
    it(`${date} /vespers renders the proper EP-II psalmody (Ps110/130/Col1), not the weekday psalter`, async () => {
      const h = await assembleHour(date, 'vespers')
      expect(h).not.toBeNull()
      expect(h!.liturgicalDay.rank).toBe('SOLEMNITY')
      expect(h!.liturgicalDay.season).toBe('CHRISTMAS')

      // Proper EP-II psalmody — exact refs, in book order.
      expect(psalmRefs(h!)).toEqual(CHRISTMAS_V2_PSALMS)

      // Negative guard: the running-week weekday psalter must be gone.
      const refs = psalmRefs(h!)
      expect(refs.some((r) => r.startsWith('Psalm 144'))).toBe(false)
      expect(refs.some((r) => r.startsWith('Psalm 145'))).toBe(false)

      // Each psalm body actually resolved to text (not a blank placeholder).
      expect(hasBody(h!, 0)).toBe(true)
      expect(hasBody(h!, 1)).toBe(true)
      expect(hasBody(h!, 2)).toBe(true)
    })

    it(`${date} /vespers psalm antiphons are byte-verbatim from the book (p.592-596)`, async () => {
      const h = await assembleHour(date, 'vespers')
      expect(psalmAntiphons(h!)).toEqual([ANT_PS1, ANT_PS2, ANT_CANT])
    })

    it(`${date} /vespers shows the EP-II Magnificat antiphon, not the regular vespers antiphon`, async () => {
      const h = await assembleHour(date, 'vespers')
      const gc = section(h!, 'gospelCanticle')
      expect(gc.canticle).toBe('magnificat')
      expect(gc.antiphon).toContain(EP2_MAGNIFICAT)
      expect(gc.antiphon).not.toContain(REGULAR_VESPERS_MAGNIFICAT)
    })
  }

  it('First Vespers (firstVespers / EP-I) keeps its OWN distinct proper psalmody (Ps113/147/Phil2) — no cross-contamination', async () => {
    // Guard against the replacesPsalter foot-gun: the EP-II psalms must NOT
    // bleed into EP-I. Christmas firstVespers prints Ps 113 / 147 / Phil2.
    const ep1 = await assembleHour('2026-12-25', 'firstVespers')
    expect(ep1).not.toBeNull()
    expect(psalmRefs(ep1!)).toEqual([
      'Psalm 113:1-9',
      'Psalm 147:12-20',
      'Philippians 2:6-11',
    ])
  })
})
