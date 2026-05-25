import { describe, it, expect } from 'vitest'
import { assembleHour } from '../loth-service'
import type { AssembledHour, HourSection } from '../types'

// GOAL #20 (#20-sub-2) — movable-Solemnity psalmody + gospel-canticle
// antiphon injection + Pentecost EP-II (vespers2) routing (option B).
//
// These are L2 integration assertions against the REAL assembler
// (assembleHour) + REAL propers/psalter JSON — no mocks. They prove the
// user-perceptible outcome: the four data-less Solemnities now render the
// borrowed Week-1 Sunday psalmody (psalm BODY, not a pointer note) under
// their proper Magnificat/Benedictus antiphon, and Pentecost Sunday
// /vespers renders the correct Second Vespers (EP-II) instead of the
// First-Vespers duplicate + running psalter week.

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

// A psalm renders its BODY either as poetic `stanzas` (PDF source) or as
// fallback `verses`. Either non-empty means the body is inlined (not a
// directive-only pointer note).
function hasBody(hour: AssembledHour, idx: number): boolean {
  const p = section(hour, 'psalmody').psalms[idx]
  return (p.stanzas?.length ?? 0) > 0 || p.verses.length > 0
}

describe('Trinity Sunday (2026-05-31) — data-less Solemnity psalmody borrow', () => {
  it('Lauds: proper Benedictus antiphon + Week-1 Sunday lauds psalm BODY', async () => {
    const h = await assembleHour('2026-05-31', 'lauds')
    expect(h).not.toBeNull()
    // Resolves to the Trinity Solemnity (not a plain OT Sunday).
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('trinity')
    expect(h!.liturgicalDay.rank).toBe('SOLEMNITY')

    // Proper Benedictus antiphon (four-week psalter p.747).
    const gc = section(h!, 'gospelCanticle')
    expect(gc.canticle).toBe('benedictus')
    expect(gc.antiphon).toContain('хуваагдашгүй Ариун Гурвал')

    // Borrowed Week-1 SUN lauds psalmody, rendered as actual psalm bodies.
    expect(psalmRefs(h!)).toEqual([
      'Psalm 63:2-9',
      'Daniel 3:57-88, 56',
      'Psalm 149:1-9',
    ])
    // First psalm carries real body text (inlined, not a directive stub).
    expect(hasBody(h!, 0)).toBe(true)
  })

  it('Second Vespers (/vespers): proper Magnificat antiphon + Week-1 Sunday vespers psalm BODY', async () => {
    const h = await assembleHour('2026-05-31', 'vespers')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('trinity')

    const gc = section(h!, 'gospelCanticle')
    expect(gc.canticle).toBe('magnificat')
    expect(gc.antiphon).toContain('бүх зүрх сэтгэл, дуу хоолойгоороо Таныг магтан')

    expect(psalmRefs(h!)).toEqual([
      'Psalm 110:1-5, 7',
      'Psalm 114:1-8',
      'Revelation 19:1-7',
    ])
    expect(hasBody(h!, 0)).toBe(true)
  })

  it('First Vespers altPrayer no longer carries runaway-parse contamination', async () => {
    const h = await assembleHour('2026-05-31', 'firstVespers')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('trinity')
    const cp = section(h!, 'concludingPrayer')
    // On the firstVespers route the alternate slot carries the
    // Сонголтот залбирал (alternativeConcludingPrayer).
    const alt = cp.alternateText ?? ''
    // Clean ending is preserved …
    expect(alt).toContain('Ариун Сүнсээр уламжлан гуйж байна')
    // … and the swallowed Second-Vespers office / next-Solemnity header is gone.
    expect(alt).not.toContain('2 дугаар Оройн даатгал залбирал')
    expect(alt).not.toContain('ХРИСТИЙН ТУЙЛЫН АРИУН НАНДИН')
  })
})

describe('Pentecost Sunday (2026-05-24) — EP-II vespers2 routing (option B)', () => {
  it('/vespers renders Second Vespers (EP-II): Eph 4:3-6 reading + EP-II Magnificat + Week-1 psalms', async () => {
    const h = await assembleHour('2026-05-24', 'vespers')
    expect(h).not.toBeNull()
    expect(h!.liturgicalDay.name.toLowerCase()).toContain('pentecost')

    // EP-II Magnificat antiphon — NOT the EP-I "Ариун Сүнс бууж…" duplicate.
    const gc = section(h!, 'gospelCanticle')
    expect(gc.canticle).toBe('magnificat')
    expect(gc.antiphon).toContain('Өнөөдөр бид Ариун Сүнсний буултын баярын')
    expect(gc.antiphon).not.toContain('Ариун Сүнс бууж, бүх итгэгчдийн')

    // EP-II short reading is Eph 4:3-6 (EP-I was Rom 8:9-11).
    const sr = section(h!, 'shortReading')
    expect(sr.ref).toBe('Eph 4:3-6')

    // Week-1 SUN vespers psalmody (Ps110/Ps114/Rev19) — NOT the running
    // psalter week (week-4 = Ps110/Ps112/Rev19). The Ps114 vs Ps112
    // distinction is the single-psalm tell from WI-21 §2.4.
    expect(psalmRefs(h!)).toEqual([
      'Psalm 110:1-5, 7',
      'Psalm 114:1-8',
      'Revelation 19:1-7',
    ])
  })
})
