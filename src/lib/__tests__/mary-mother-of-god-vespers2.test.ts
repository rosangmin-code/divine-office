import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection } from '../types'

// GOAL #27 (#27-sub-1) — 01-01 천주의성모 (Mary, Mother of God) Second
// Vespers (EP-II / vespers2) render restoration.
//
// Before: 01-01 carried only `firstVespers`, so `/pray/<Jan1>/vespers`
// rendered the WRONG content — the running-week WEEKDAY psalmody (e.g.
// 2026-01-01 Thu → Ps 30/32) under the EP-I (First Vespers) Magnificat
// antiphon ("Бидний төлөө гэсэн агуу хайраар…"). The proper EP-II
// Magnificat antiphon ("Аяа Христ минь…", salvaged in WI-25 audit §10
// from full_pdf.txt L21046-21048, p.609) was nowhere shown.
//
// Fix (data-only): a `vespers2` block in solemnities.json 01-01 carrying
//   (1) the salvaged EP-II Magnificat antiphon,
//   (2) a psalmody `substitute` conditionalRubric → Week-1 Sunday Vespers
//       (Octave-of-Christmas norm; the EP-II section prints only the
//        antiphon, identical borrowing to Christmas Day p.589 / FR-160-B),
//   (3) the day's collect reused (primary + alternate concluding prayer,
//       byte-identical to firstVespers).
// The fixed-date Solemnity `sanctoral.vespers2` swap (loth-service.ts
// step 5: hour==='vespers' && rank==='SOLEMNITY' && sanctoral.vespers2)
// already fires for 01-01 → no code change needed.
//
// L2 integration against the REAL assembler + REAL propers/psalter JSON —
// no mocks. Proves the user-perceptible outcome.

const JAN1 = '2026-01-01' // Solemnity of Mary, Mother of God (Thursday)
const WEEK1_SUN_VESPERS = ['Psalm 110:1-5, 7', 'Psalm 114:1-8', 'Revelation 19:1-7']

// EP-II (Second Vespers) Magnificat antiphon — salvaged WI-25 audit §10.
const EP2_MAGNIFICAT = 'Аяа Христ минь, дэлхий ертөнцийн Аврагч ба Эзэн минь'
// EP-I (First Vespers) Magnificat antiphon — must NOT leak into EP-II.
const EP1_MAGNIFICAT = 'Бидний төлөө гэсэн агуу хайраар'
// The day's proper collect (Төгсгөлийн даатгал залбирал, 264 chars).
const MARIAN_COLLECT = 'Аяа, Тэнгэрбурхан Эцэг минь, бид Цэвэр Ариун Эх Мариад'

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

function hasBody(hour: AssembledHour, idx: number): boolean {
  const p = section(hour, 'psalmody').psalms[idx]
  return (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0
}

describe('01-01 Mary, Mother of God — Second Vespers (vespers2 / EP-II)', () => {
  it('/vespers renders EP-II: salvaged Magnificat antiphon + Week-1 Sunday vespers psalm BODY', async () => {
    const h = await assembleHour(JAN1, 'vespers')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.rank).toBe('SOLEMNITY')
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('mary, mother of god')

    // EP-II Magnificat antiphon — NOT the EP-I "Бидний төлөө…" antiphon.
    const gc = section(h!, 'gospelCanticle')
    expect(gc.canticle).toBe('magnificat')
    expect(gc.antiphon).toContain(EP2_MAGNIFICAT)
    expect(gc.antiphon).not.toContain(EP1_MAGNIFICAT)

    // Week-1 Sunday vespers psalmody (Ps110/Ps114/Rev19) — NOT the running
    // weekday psalter (pre-fix 2026-01-01 Thu rendered Ps 30/32). Borrowed
    // via the vespers2 psalmody-substitute (Octave-of-Christmas norm).
    expect(psalmRefs(h!)).toEqual(WEEK1_SUN_VESPERS)
    expect(hasBody(h!, 0)).toBe(true)
  })

  it('/vespers concluding prayer reuses the day collect (primary + alternate present)', async () => {
    const h = await assembleHour(JAN1, 'vespers')
    const cp = section(h!, 'concludingPrayer')
    // The day's Marian collect is present. Per the F-2 rubric (PDF p.516 —
    // "Solemnity not on Sunday → alternate becomes default"), 2026-01-01
    // (Thu) shows the Сонголтот залбирал as `text` and the collect as
    // `alternateText`; the collect must appear in one of the two slots.
    const blob = `${cp.text ?? ''}\n${cp.alternateText ?? ''}`
    expect(blob).toContain(MARIAN_COLLECT)
  })

  it('EP-II (vespers) is distinct from EP-I (firstVespers): different Magnificat antiphon, same Week-1 psalmody', async () => {
    const ep2 = await assembleHour(JAN1, 'vespers')
    const ep1 = await assembleHour(JAN1, 'firstVespers')
    expect(ep1).not.toBeNull()

    const a2 = section(ep2!, 'gospelCanticle').antiphon
    const a1 = section(ep1!, 'gospelCanticle').antiphon
    // The whole point of the fix: EP-II no longer borrows the EP-I antiphon.
    expect(a2).not.toBe(a1)
    expect(a2).toContain(EP2_MAGNIFICAT)
    expect(a1).toContain(EP1_MAGNIFICAT)

    // Both First and Second Vespers share the Octave's Week-1 Sunday psalmody.
    expect(psalmRefs(ep2!)).toEqual(WEEK1_SUN_VESPERS)
    expect(psalmRefs(ep1!)).toEqual(WEEK1_SUN_VESPERS)
  })
})
