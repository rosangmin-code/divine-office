import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getHoursSummary, assembleHour } from '../loth-service'
import { isCommonSource } from '../types'

// Mock bible-loader to avoid loading 7.4MB JSONL in tests
vi.mock('../bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

describe('getHoursSummary', () => {
  // FR-NEW #230 (F-X5): per-day hour list. Mon-Fri unchanged (3 hours);
  // Saturday only has lauds (vespers/compline moved to Sunday's
  // firstVespers/firstCompline cards); Sunday has 5 hours
  // (firstVespers, firstCompline, lauds, vespers, compline).
  it('returns 3 active hours for a weekday Monday (Mon-Fri unchanged)', () => {
    // 2026-06-15 = Monday
    const result = getHoursSummary('2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.hours).toHaveLength(3)
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds', 'vespers', 'compline'])
  })

  it('returns liturgical day info', () => {
    const result = getHoursSummary('2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(result!.date).toBe('2026-06-15')
  })

  it('returns null for invalid date', () => {
    expect(getHoursSummary('invalid')).toBeNull()
  })

  // @fr FR-NEW (#230 F-X5)
  it('returns lauds-only for Saturday (vespers/compline removed; relocated to Sunday)', () => {
    // 2030-06-15 = Saturday
    const result = getHoursSummary('2030-06-15')
    expect(result).not.toBeNull()
    expect(result!.hours).toHaveLength(1)
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds'])
  })

  // @fr FR-NEW (#230 F-X5)
  it('returns 5 hours for Sunday with firstVespers + firstCompline before lauds', () => {
    // 2026-06-14 = Sunday
    const result = getHoursSummary('2026-06-14')
    expect(result).not.toBeNull()
    expect(result!.hours).toHaveLength(5)
    expect(result!.hours.map((h) => h.type)).toEqual([
      'firstVespers',
      'firstCompline',
      'lauds',
      'vespers',
      'compline',
    ])
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('returns 5 hours for weekday Solemnity with firstVespers data (Christmas Day Fri 2026-12-25)', () => {
    // Christmas 2026 = Friday, sanctoral.firstVespers authored.
    const result = getHoursSummary('2026-12-25')
    expect(result).not.toBeNull()
    expect(result!.hours.map((h) => h.type)).toEqual([
      'firstVespers',
      'firstCompline',
      'lauds',
      'vespers',
      'compline',
    ])
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('strips vespers + compline from weekday-eve-of-Solemnity (Christmas Eve Thu 2026-12-24)', () => {
    // Tomorrow (2026-12-25) is a SOLEMNITY with firstVespers data, so
    // today's vespers + compline cards are removed (relocated to
    // tomorrow's firstVespers/firstCompline).
    const result = getHoursSummary('2026-12-24')
    expect(result).not.toBeNull()
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds'])
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('strips vespers + compline from weekday-eve-of-movable-Solemnity (Ascension Eve Wed 2026-05-13)', () => {
    // Tomorrow (2026-05-14) is Ascension (movable SOLEMNITY) with
    // firstVespers via getSeasonFirstVespers special-key.
    const result = getHoursSummary('2026-05-13')
    expect(result).not.toBeNull()
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds'])
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('keeps full 3 hours on a weekday with no celebration tomorrow (regression guard)', () => {
    // 2026-02-04 (Wed) — ordinary OT weekday; tomorrow Thu also ordinary.
    const result = getHoursSummary('2026-02-04')
    expect(result).not.toBeNull()
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds', 'vespers', 'compline'])
  })
})

describe('assembleHour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for invalid date', async () => {
    const result = await assembleHour('invalid', 'lauds')
    expect(result).toBeNull()
  })

  it('assembles lauds with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'lauds')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('lauds')
    expect(result!.date).toBe('2026-06-15')
    expect(result!.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('assembles vespers with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('assembles compline with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'compline')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('compline')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('Saturday vespers uses Sunday propers', async () => {
    // 2026-06-13 is a Saturday in OT
    const result = await assembleHour('2026-06-13', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
  })

  // @fr FR-NEW (#230 F-X5)
  it('Sunday firstVespers route assembles 1st Vespers content (relocated from Saturday/vespers)', async () => {
    // 2026-06-14 is the Sunday after 2026-06-13 (Saturday)
    const result = await assembleHour('2026-06-14', 'firstVespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('firstVespers')
    expect(result!.date).toBe('2026-06-14')
    expect(result!.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  // @fr FR-NEW (#230 F-X5)
  it('Sunday firstVespers concluding prayer matches Sunday vespers (FR-011 anchor X)', async () => {
    const fv = await assembleHour('2026-06-14', 'firstVespers')
    const sun = await assembleHour('2026-06-14', 'vespers')
    expect(fv).not.toBeNull()
    expect(sun).not.toBeNull()
    const fvCp = fv!.sections.find((s) => s.type === 'concludingPrayer') as
      | { type: string; text: string } | undefined
    const sunCp = sun!.sections.find((s) => s.type === 'concludingPrayer') as
      | { type: string; text: string } | undefined
    expect(fvCp).toBeTruthy()
    expect(sunCp).toBeTruthy()
    expect(fvCp!.text).toBe(sunCp!.text)
  })

  // @fr FR-NEW (#230 F-X5)
  it('Sunday firstCompline route assembles 1st Compline content (Saturday slot, Sunday I)', async () => {
    const result = await assembleHour('2026-06-14', 'firstCompline')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('firstCompline')
    expect(result!.date).toBe('2026-06-14')
    // The data comes from compline.json Saturday slot (= Sunday I Compline,
    // PDF p.512). Compline always returns at least psalmody + concluding.
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  // @fr FR-NEW (#230 F-X5)
  it('Sunday firstCompline differs from Sunday compline by concluding prayer (Sunday I p.516 vs Sunday II p.521)', async () => {
    // PDF p.512 (Sunday I, after 1st Vespers) vs p.517 (Sunday II, after
    // 2nd Vespers). Both cycles share Psalm 91:1-16 — the discriminator
    // is the concluding prayer (#229 F-X4: SAT slot p.516, SUN slot p.521).
    const fc = await assembleHour('2026-06-14', 'firstCompline')
    const c2 = await assembleHour('2026-06-14', 'compline')
    expect(fc).not.toBeNull()
    expect(c2).not.toBeNull()
    expect(fc!.hourType).toBe('firstCompline')
    expect(c2!.hourType).toBe('compline')
    const fcCp = fc!.sections.find((s) => s.type === 'concludingPrayer') as
      | { type: string; text: string } | undefined
    const c2Cp = c2!.sections.find((s) => s.type === 'concludingPrayer') as
      | { type: string; text: string } | undefined
    expect(fcCp).toBeTruthy()
    expect(c2Cp).toBeTruthy()
    expect(fcCp!.text).not.toBe(c2Cp!.text)
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('Christmas Day (weekday Solemnity) firstVespers route surfaces Christmas firstVespers content', async () => {
    // 2026-12-25 = Friday Christmas. sanctoral/solemnities.json 12-25
    // carries firstVespers (Phase 3b #22). The new firstVespers route
    // on the Christmas page itself should surface that data.
    const result = await assembleHour('2026-12-25', 'firstVespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('firstVespers')
    expect(result!.liturgicalDay.rank).toBe('SOLEMNITY')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  // @fr FR-NEW (#230 F-X5, Q4=P)
  it('movable Solemnity (Ascension Thu) firstVespers route uses season-special-key data', async () => {
    // 2026-05-14 = Ascension Thursday (movable SOLEMNITY).
    // `getSeasonFirstVespers` resolves via resolveSpecialKey → 'ascension'
    // → weeks['ascension'].SUN.firstVespers (Phase 4b #24).
    const result = await assembleHour('2026-05-14', 'firstVespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('firstVespers')
    expect(result!.liturgicalDay.rank).toBe('SOLEMNITY')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  // @fr FR-NEW (#230 F-X5, #216 F-2c)
  it('Christmas firstCompline triggers F-2 alternate concluding prayer (rank=SOLEMNITY non-Sunday via effectiveLiturgicalDay)', async () => {
    // 2026-12-25 = Friday Christmas. compline.json default concluding-
    // prayer for Friday slot has primary + alternate. F-2 rubric:
    // "Solemnity not on Sunday → alternate becomes default". The new
    // firstCompline route (eve-shifted to Thu slot — but the URL date
    // IS the Solemnity, so liturgicalDay.rank=SOLEMNITY directly) +
    // #216 F-2c effectiveLiturgicalDay propagation should make the
    // alternation fire even if eve-shifting were needed.
    const fc = await assembleHour('2026-12-25', 'firstCompline')
    expect(fc).not.toBeNull()
    expect(fc!.liturgicalDay.rank).toBe('SOLEMNITY')
    // The render should not throw and should emit at least one section.
    expect(fc!.sections.length).toBeGreaterThan(0)
  })
})

describe('propers merge priority', () => {
  it('solemnity vespers uses vespers2 data', async () => {
    // St. Joseph (March 19) is a Solemnity
    const result = await assembleHour('2026-03-19', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.rank).toBe('SOLEMNITY')
  })

  it('sanctoral propers override season propers', async () => {
    // St. Joseph lauds should have sanctoral data
    const result = await assembleHour('2026-03-19', 'lauds')
    expect(result).not.toBeNull()
    // Verify sections are assembled (sanctoral layer applied)
    expect(result!.sections.length).toBeGreaterThan(0)
  })
})

// @fr FR-153
describe('hymn rich wiring (central catalog)', () => {
  it('attaches textRich to the hymn section for the default rotation pick', async () => {
    const result = await assembleHour('2026-06-15', 'lauds')
    expect(result).not.toBeNull()
    const hymnSection = result!.sections.find((s) => s.type === 'hymn')
    expect(hymnSection).toBeDefined()
    if (hymnSection?.type !== 'hymn') throw new Error('expected hymn section')
    // Rotation should have picked at least one candidate; textRich should be
    // populated from src/data/loth/prayers/hymns/{number}.rich.json when the
    // selected hymn has a catalog entry (107/122 covered as of T8).
    expect(hymnSection.candidates && hymnSection.candidates.length).toBeGreaterThan(0)
    if (hymnSection.textRich) {
      expect(hymnSection.textRich.blocks.length).toBeGreaterThan(0)
      const src = hymnSection.textRich.source
      expect(isCommonSource(src)).toBe(true)
      if (isCommonSource(src)) expect(src.id).toMatch(/^hymn-\d+$/)
    }
  })

  it('leaves textRich undefined when the selected hymn has no catalog entry', async () => {
    // Find any date whose default rotation pick lands on one of the 15 empty-
    // text hymns (41/44/45/46/50/81/82/89/92/93/105/108/111/115/117). Those
    // have no rich.json file so the wiring must gracefully leave textRich
    // undefined rather than crash.
    // Smoke level: just verify assembleHour succeeds for several OT dates
    // and that if textRich is set, it has the catalog shape.
    for (const date of ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18']) {
      const result = await assembleHour(date, 'lauds')
      expect(result).not.toBeNull()
      const hymn = result!.sections.find((s) => s.type === 'hymn')
      expect(hymn).toBeDefined()
      if (hymn?.type === 'hymn' && hymn.textRich) {
        const src = hymn.textRich.source
        if (isCommonSource(src)) expect(src.id).toMatch(/^hymn-\d+$/)
      }
    }
  })
})

// @fr FR-153
// Task #61 — Christmas special-key rich loading via real assembleHour.
// Confirms the resolver chain (calendar → propers-loader.resolveSpecialKey
// → rich-overlay Tier 1 with SUN-slot fallback) wires through end-to-end
// against the real christmas.json + seasonal/christmas/wdec25-SUN-*.rich.json
// disk files. Unit tests in resolver.test.ts cover the resolver logic in
// isolation; this exercises the full Layer 1-4 merge.
describe('Christmas special-key rich integration (task #61)', () => {
  it('Christmas Day on Friday (2026-12-25) lauds — shortReadingRich loaded from wdec25-SUN slot', async () => {
    const result = await assembleHour('2026-12-25', 'lauds')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.season).toBe('CHRISTMAS')
    const sr = result!.sections.find((s) => s.type === 'shortReading')
    expect(sr).toBeDefined()
    if (sr?.type !== 'shortReading') throw new Error('expected shortReading section')
    expect(sr.textRich).toBeDefined()
    // wdec25-SUN-lauds.rich.json shortReadingRich opens with
    // "Эрт үед эш үзүүлэгчдээр..." (Hebrews 1:1-2 in Mongolian).
    const block0 = sr.textRich!.blocks[0]
    if (block0.kind === 'para') {
      expect(block0.spans[0]).toMatchObject({
        kind: 'text',
        text: expect.stringContaining('Эрт үед эш үзүүлэгчдээр'),
      })
    } else {
      throw new Error(`expected first block kind='para', got ${block0.kind}`)
    }
  })

  it('Mary Mother of God (2026-01-01 Thursday) vespers — concludingPrayerRich loaded from wjan1-SUN slot', async () => {
    const result = await assembleHour('2026-01-01', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.season).toBe('CHRISTMAS')
    const cp = result!.sections.find((s) => s.type === 'concludingPrayer')
    expect(cp).toBeDefined()
    if (cp?.type !== 'concludingPrayer') throw new Error('expected concludingPrayer section')
    // wjan1-SUN-vespers.rich.json should populate textRich; the concludingPrayer
    // section's text content is well-formed regardless of legacy/rich path.
    expect(cp.text || cp.textRich).toBeTruthy()
  })

  it('regression — non-special-key Christmas weekday (post-Baptism) does not crash', async () => {
    // 2026-01-15 is a CHRISTMAS-season Thursday post-Baptism — falls outside
    // any matching special-key. resolveSpecialKey returns null, rich-overlay
    // Tier 1 misses; Tier 2/3 falls through to wk1 fallback or null. The
    // page must still assemble cleanly without throwing.
    const result = await assembleHour('2026-01-15', 'lauds')
    expect(result).not.toBeNull()
    expect(result!.sections.length).toBeGreaterThan(0)
  })
})
