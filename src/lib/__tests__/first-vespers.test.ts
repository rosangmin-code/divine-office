import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FirstVespersPropers } from '../types'

// @fr FR-156 Phase 1 — resolver wiring for First Vespers of Sunday.

// Cache module state is owned by propers-loader; reset per test so a
// mock from one test doesn't leak. We use vi.doMock so each test gets a
// fresh module with our spy applied.
describe('FR-156 Phase 2 — getSeasonFirstVespers returns injected data', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns a firstVespers object for every regular Sunday week in Advent/Lent/Easter/OT (task #20 injection)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // After Phase 2 injection, each season has per-week firstVespers
    // data. Only CHRISTMAS is allowed to leave most week slots null
    // (sanctoral-dominant season; only holyFamily/baptism Sundays get
    // Phase 2 injection via name-based lookup, which this test does
    // not exercise).
    const cases: Array<[string, number]> = [
      ['ADVENT', 1], ['ADVENT', 2], ['ADVENT', 3], ['ADVENT', 4],
      ['LENT', 1], ['LENT', 2], ['LENT', 3], ['LENT', 4], ['LENT', 5], ['LENT', 6],
      ['EASTER', 2], ['EASTER', 3], ['EASTER', 4], ['EASTER', 5], ['EASTER', 6], ['EASTER', 7],
      ['ORDINARY_TIME', 1], ['ORDINARY_TIME', 5], ['ORDINARY_TIME', 17], ['ORDINARY_TIME', 34],
    ]
    for (const [season, week] of cases) {
      const fv = getSeasonFirstVespers(season as never, week)
      expect(fv, `${season} week ${week} should have firstVespers after Phase 2`).not.toBeNull()
      expect(fv!.psalms, `${season} week ${week} firstVespers.psalms`).toBeDefined()
      expect(fv!.psalms!.length, `${season} week ${week} firstVespers.psalms length`).toBe(3)
    }
  })

  it('firstVespers psalms carry seasonal_antiphons for their psalter week (regression guard)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // Lent week 5 → psalter W1 (lentSunday[5] lives there).
    const fvLent5 = getSeasonFirstVespers('LENT' as never, 5)
    expect(fvLent5).not.toBeNull()
    const ps1 = fvLent5!.psalms![0]
    const lentSunday = (ps1.seasonal_antiphons as Record<string, Record<number, string>> | undefined)?.lentSunday
    expect(lentSunday, 'Lent W5 ps1 must carry lentSunday variants from PDF_W1').toBeDefined()
    expect(lentSunday![5], 'lentSunday[5] variant for Lent W5 Sunday').toBeTruthy()

    // Lent week 6 (Passion/Palm Sunday) → psalter W2 (lentPassionSunday lives there).
    const fvLent6 = getSeasonFirstVespers('LENT' as never, 6)
    expect(fvLent6).not.toBeNull()
    const ps1W6 = fvLent6!.psalms![0]
    const sa = ps1W6.seasonal_antiphons as Record<string, unknown> | undefined
    expect(sa?.lentPassionSunday, 'Palm Sunday ps1 must carry lentPassionSunday variant from PDF_W2').toBeTruthy()
  })
})

describe('FR-156 Phase 1 — Saturday vespers uses firstVespers when authored', () => {
  const fakeFirstVespers: FirstVespersPropers = {
    gospelCanticleAntiphon: 'FIRST-VESPERS-GC-ANTIPHON',
    concludingPrayer: 'FIRST-VESPERS-CONCLUDING-PRAYER',
    shortReading: {
      ref: '1 Peter 1:3-4',
      text: 'FIRST-VESPERS-SHORT-READING',
    },
    psalms: [
      {
        type: 'psalm',
        ref: 'Psalm 119:105-112',
        antiphon_key: 'fv-w2-sun-ps1',
        default_antiphon: 'FIRST-VESPERS-PSALM-1-ANTIPHON',
        gloria_patri: true,
      },
    ],
  }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../propers-loader')
  })

  it('prefers firstVespers over regular Sunday vespers on Saturday evening', async () => {
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        getSeasonFirstVespers: vi.fn((_season: string, _week: number) => fakeFirstVespers),
        // Saturday's own lookup (day='SAT', hour='vespers') must return
        // null so loth-service enters the Saturday→Sunday branch. The
        // Sunday regular-vespers fallback (day='SUN') returns a distinct
        // marker so we can assert firstVespers wins.
        getSeasonHourPropers: vi.fn((_season, _week, day, _hour) =>
          day === 'SUN'
            ? {
                gospelCanticleAntiphon: 'REGULAR-SUNDAY-VESPERS-GC-ANTIPHON',
                concludingPrayer: 'REGULAR-SUNDAY-CONCLUDING-PRAYER',
              }
            : null,
        ),
      }
    })
    const { assembleHour } = await import('../loth-service')
    // 2026-06-13 is a Saturday in Ordinary Time.
    const result = await assembleHour('2026-06-13', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')

    // Gospel canticle antiphon must come from firstVespers, not regular
    // Sunday vespers. Search across sections because the canticle may
    // sit behind seasonal antiphon augmentation — we only need to
    // confirm the firstVespers text is on the assembled output.
    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    expect(gcSection).toBeDefined()
    if (gcSection && gcSection.type === 'gospelCanticle') {
      expect(gcSection.antiphon).toContain('FIRST-VESPERS-GC-ANTIPHON')
    }

    // Concluding prayer should also come from firstVespers.
    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    expect(prayerSection).toBeDefined()
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      expect(prayerSection.text).toBe('FIRST-VESPERS-CONCLUDING-PRAYER')
    }
  })

  it('falls back to regular Sunday vespers propers when firstVespers is absent (regression guard)', async () => {
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        getSeasonFirstVespers: vi.fn(() => null),
        getSeasonHourPropers: vi.fn((_season, _week, day, _hour) =>
          day === 'SUN'
            ? {
                gospelCanticleAntiphon: 'REGULAR-SUNDAY-VESPERS-GC-ANTIPHON',
                concludingPrayer: 'REGULAR-SUNDAY-CONCLUDING-PRAYER',
              }
            : null,
        ),
      }
    })
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-06-13', 'vespers')
    expect(result).not.toBeNull()

    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gcSection && gcSection.type === 'gospelCanticle') {
      // Regular Sunday vespers GC antiphon wins — NOT the firstVespers
      // fake. Seasonal augmentation may append text, so use contains.
      expect(gcSection.antiphon).toContain('REGULAR-SUNDAY-VESPERS-GC-ANTIPHON')
      expect(gcSection.antiphon).not.toContain('FIRST-VESPERS-GC-ANTIPHON')
    }
    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      expect(prayerSection.text).toBe('REGULAR-SUNDAY-CONCLUDING-PRAYER')
    }
  })
})

// @fr FR-156 Phase 3a — Solemnity First Vespers (evening-before-solemnity).
describe('FR-156 Phase 3a — Solemnity First Vespers', () => {
  const solemnityFirstVespers: FirstVespersPropers = {
    gospelCanticleAntiphon: 'SOLEMNITY-FIRST-VESPERS-GC-ANTIPHON',
    concludingPrayer: 'SOLEMNITY-FIRST-VESPERS-CONCLUDING-PRAYER',
    shortReading: {
      ref: 'Isaiah 9:6',
      text: 'SOLEMNITY-FIRST-VESPERS-SHORT-READING',
    },
    psalms: [
      {
        type: 'psalm',
        ref: 'Psalm 113',
        antiphon_key: 'christmas-fv-ps1',
        default_antiphon: 'SOLEMNITY-FIRST-VESPERS-PSALM-1-ANTIPHON',
        gloria_patri: true,
      },
    ],
  }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../propers-loader')
  })

  it('adopts sanctoral.firstVespers on the evening before a Solemnity (Christmas Eve)', async () => {
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        // Dec 25 carries the solemnity firstVespers fake; all other keys
        // return null so the solemnity branch fires for 12-25 only.
        getSanctoralPropers: vi.fn((key: string) =>
          key === '12-25' ? { name: 'Christmas', firstVespers: solemnityFirstVespers } : null,
        ),
        getSeasonFirstVespers: vi.fn(() => null),
        getSeasonHourPropers: vi.fn(() => null),
      }
    })
    const { assembleHour } = await import('../loth-service')
    // 2026-12-24 Thursday evening → tomorrow (12-25) is Christmas SOLEMNITY.
    const result = await assembleHour('2026-12-24', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')

    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    expect(gcSection).toBeDefined()
    if (gcSection && gcSection.type === 'gospelCanticle') {
      // Solemnity firstVespers antiphon wins over any ADVENT date-key
      // vigil propers (which 12-24 normally carries).
      expect(gcSection.antiphon).toContain('SOLEMNITY-FIRST-VESPERS-GC-ANTIPHON')
    }
    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    expect(prayerSection).toBeDefined()
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      expect(prayerSection.text).toBe('SOLEMNITY-FIRST-VESPERS-CONCLUDING-PRAYER')
    }
  })

  it('leaves the evening alone when tomorrow is NOT a Solemnity (regression guard)', async () => {
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        // No sanctoral returns firstVespers — even if a key matches,
        // firstVespers is absent.
        getSanctoralPropers: vi.fn(() => null),
        getSeasonFirstVespers: vi.fn(() => null),
        // Sunday regular vespers marker so we can assert the solemnity
        // branch did NOT claim seasonPropers; Saturday→Sunday fallback did.
        getSeasonHourPropers: vi.fn((_s, _w, day) =>
          day === 'SUN'
            ? {
                gospelCanticleAntiphon: 'REGULAR-SUNDAY-VESPERS-GC-ANTIPHON',
                concludingPrayer: 'REGULAR-SUNDAY-CONCLUDING-PRAYER',
              }
            : null,
        ),
      }
    })
    const { assembleHour } = await import('../loth-service')
    // 2026-06-13 Saturday in OT — tomorrow (6-14) is a regular Sunday, not SOLEMNITY.
    const result = await assembleHour('2026-06-13', 'vespers')
    expect(result).not.toBeNull()
    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gcSection && gcSection.type === 'gospelCanticle') {
      expect(gcSection.antiphon).not.toContain('SOLEMNITY-FIRST-VESPERS-GC-ANTIPHON')
      expect(gcSection.antiphon).toContain('REGULAR-SUNDAY-VESPERS-GC-ANTIPHON')
    }
  })

  it('Solemnity First Vespers precedence: wins over Sunday First Vespers when both apply', async () => {
    // Simulate Sunday that is ALSO a Solemnity (e.g. Christ the King).
    // The solemnity firstVespers must win over the Sunday firstVespers.
    const sundayFirstVespers: FirstVespersPropers = {
      gospelCanticleAntiphon: 'SUNDAY-FIRST-VESPERS-GC-ANTIPHON',
      concludingPrayer: 'SUNDAY-FIRST-VESPERS-CONCLUDING-PRAYER',
    }
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        // 12-25 returns solemnity firstVespers (takes precedence)
        getSanctoralPropers: vi.fn((key: string) =>
          key === '12-25' ? { name: 'Christmas', firstVespers: solemnityFirstVespers } : null,
        ),
        // Sunday firstVespers would also match but must be ignored when
        // solemnity branch has already claimed seasonPropers.
        getSeasonFirstVespers: vi.fn(() => sundayFirstVespers),
        getSeasonHourPropers: vi.fn(() => null),
      }
    })
    const { assembleHour } = await import('../loth-service')
    // 2026-12-24 evening — tomorrow is Christmas SOLEMNITY.
    const result = await assembleHour('2026-12-24', 'vespers')
    expect(result).not.toBeNull()
    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gcSection && gcSection.type === 'gospelCanticle') {
      expect(gcSection.antiphon).toContain('SOLEMNITY-FIRST-VESPERS-GC-ANTIPHON')
      expect(gcSection.antiphon).not.toContain('SUNDAY-FIRST-VESPERS-GC-ANTIPHON')
    }
    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      expect(prayerSection.text).toBe('SOLEMNITY-FIRST-VESPERS-CONCLUDING-PRAYER')
    }
  })
})

// @fr FR-156 Phase 3b (task #22) — Solemnity data injection (integration).
// Verifies that the PDF-extracted solemnity firstVespers entries land in
// sanctoral/solemnities.json + feasts.json at the expected MM-DD keys and
// that key fields are populated. Byte-equal diffing is owned by
// scripts/verify-solemnity-first-vespers.js; this test is a quick check
// that the injection actually happened.
describe('FR-156 Phase 3b — Solemnity firstVespers data injection', () => {
  it('Christmas (12-25) carries full firstVespers psalter + readings + intercessions', async () => {
    const { getSanctoralPropers } = await import('../propers-loader')
    const entry = getSanctoralPropers('12-25')
    expect(entry).not.toBeNull()
    expect(entry!.firstVespers).toBeDefined()
    const fv = entry!.firstVespers!
    expect(fv.psalms, 'Christmas firstVespers psalms').toBeDefined()
    expect(fv.psalms!.length).toBe(3)
    expect(fv.psalms![0].ref).toBe('Psalm 113')
    expect(fv.psalms![1].ref).toBe('Psalm 147')
    expect(fv.psalms![2].ref).toBe('Philippians 2:6-11')
    expect(fv.shortReading?.ref).toBe('Galatians 4:3-7')
    expect(fv.gospelCanticleAntiphon).toContain('Нар өглөө тэнгэрт мандахад')
    expect(fv.intercessions?.length ?? 0).toBeGreaterThan(0)
    expect(fv.concludingPrayer).toContain('жил бүр Та энэхүү авралын баяраар')
  })

  it('Motherhood of Mary (01-01) carries Magnificat antiphon + concluding prayer (no own psalms)', async () => {
    const { getSanctoralPropers } = await import('../propers-loader')
    const entry = getSanctoralPropers('01-01')
    expect(entry).not.toBeNull()
    expect(entry!.firstVespers).toBeDefined()
    const fv = entry!.firstVespers!
    // Short solemnity: antiphon + prayer, no own psalms
    expect(fv.gospelCanticleAntiphon).toContain('Бидний төлөө гэсэн агуу хайраар')
    expect(fv.concludingPrayer).toBeTruthy()
    expect(fv.alternativeConcludingPrayer).toBeTruthy()
  })

  it('Assumption (08-15) firstVespers data present in sanctoral file', async () => {
    const { getSanctoralPropers } = await import('../propers-loader')
    const entry = getSanctoralPropers('08-15')
    expect(entry).not.toBeNull()
    expect(entry!.firstVespers).toBeDefined()
    expect(entry!.firstVespers!.gospelCanticleAntiphon).toContain('Харагтун, энэ цагаас хойш')
  })
})

// @fr FR-156 Phase 4a — movable solemnity resolver (Easter ascension/pentecost + OT trinity/corpusChristi/sacredHeart/christTheKing).
describe('FR-156 Phase 4a — movable solemnity First Vespers', () => {
  const ascensionFake: FirstVespersPropers = {
    gospelCanticleAntiphon: 'ASCENSION-FV-GC-ANTIPHON',
    concludingPrayer: 'ASCENSION-FV-CONCLUDING-PRAYER',
  }
  const pentecostFake: FirstVespersPropers = {
    gospelCanticleAntiphon: 'PENTECOST-FV-GC-ANTIPHON',
    concludingPrayer: 'PENTECOST-FV-CONCLUDING-PRAYER',
  }
  const trinityFake: FirstVespersPropers = {
    gospelCanticleAntiphon: 'TRINITY-FV-GC-ANTIPHON',
    concludingPrayer: 'TRINITY-FV-CONCLUDING-PRAYER',
  }
  const christTheKingFake: FirstVespersPropers = {
    gospelCanticleAntiphon: 'CHRIST-THE-KING-FV-GC-ANTIPHON',
    concludingPrayer: 'CHRIST-THE-KING-FV-CONCLUDING-PRAYER',
  }

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.doUnmock('../propers-loader')
  })

  // Helper: build a propers-loader mock that returns the right fake
  // firstVespers based on the celebrationName passed in by the resolver
  // wiring. Movable solemnities live on season JSON (weeks['<specialKey>'])
  // rather than sanctoral MM-DD, so getSanctoralPropers returns null.
  function mockMovableSolemnityLoader() {
    return async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        getSanctoralPropers: vi.fn(() => null),
        getSeasonHourPropers: vi.fn(() => null),
        getSeasonFirstVespers: vi.fn(
          (season: string, _week: number, _date?: string, name?: string) => {
            const n = name?.toLowerCase() ?? ''
            if (season === 'EASTER' && n.includes('ascension')) return ascensionFake
            if (season === 'EASTER' && n.includes('pentecost')) return pentecostFake
            if (season === 'ORDINARY_TIME' && n.includes('trinity')) return trinityFake
            if (season === 'ORDINARY_TIME' && n.includes('christ the king')) return christTheKingFake
            return null
          },
        ),
      }
    }
  }

  it('Wednesday evening before Ascension Thursday adopts Easter ascension firstVespers (2026-05-13)', async () => {
    vi.doMock('../propers-loader', mockMovableSolemnityLoader())
    const { assembleHour } = await import('../loth-service')
    // Ascension 2026 = Thu May 14. Wed May 13 evening is the First
    // Vespers. Weekday (not Saturday) evening eve.
    const result = await assembleHour('2026-05-13', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
    const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gc && gc.type === 'gospelCanticle') {
      expect(gc.antiphon).toContain('ASCENSION-FV-GC-ANTIPHON')
    }
    const prayer = result!.sections.find((s) => s.type === 'concludingPrayer')
    if (prayer && prayer.type === 'concludingPrayer') {
      expect(prayer.text).toBe('ASCENSION-FV-CONCLUDING-PRAYER')
    }
  })

  it('Saturday evening before Pentecost Sunday adopts Easter pentecost firstVespers (2026-05-23)', async () => {
    vi.doMock('../propers-loader', mockMovableSolemnityLoader())
    const { assembleHour } = await import('../loth-service')
    // Pentecost 2026 = Sun May 24. Sat May 23 evening.
    const result = await assembleHour('2026-05-23', 'vespers')
    expect(result).not.toBeNull()
    const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gc && gc.type === 'gospelCanticle') {
      expect(gc.antiphon).toContain('PENTECOST-FV-GC-ANTIPHON')
      expect(gc.antiphon).not.toContain('ASCENSION-FV-GC-ANTIPHON')
    }
  })

  it('Saturday evening before Trinity Sunday adopts OT trinitySunday firstVespers (2026-05-30)', async () => {
    vi.doMock('../propers-loader', mockMovableSolemnityLoader())
    const { assembleHour } = await import('../loth-service')
    // Trinity Sunday 2026 = Sun May 31. Sat May 30 evening. This is
    // the first OT special-key exercise (new in Phase 4a).
    const result = await assembleHour('2026-05-30', 'vespers')
    expect(result).not.toBeNull()
    const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gc && gc.type === 'gospelCanticle') {
      expect(gc.antiphon).toContain('TRINITY-FV-GC-ANTIPHON')
    }
    const prayer = result!.sections.find((s) => s.type === 'concludingPrayer')
    if (prayer && prayer.type === 'concludingPrayer') {
      expect(prayer.text).toBe('TRINITY-FV-CONCLUDING-PRAYER')
    }
  })

  it('Saturday evening before Christ the King adopts OT christTheKing firstVespers (2026-11-21)', async () => {
    vi.doMock('../propers-loader', mockMovableSolemnityLoader())
    const { assembleHour } = await import('../loth-service')
    // Christ the King 2026 = Sun Nov 22. Sat Nov 21 evening.
    const result = await assembleHour('2026-11-21', 'vespers')
    expect(result).not.toBeNull()
    const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gc && gc.type === 'gospelCanticle') {
      expect(gc.antiphon).toContain('CHRIST-THE-KING-FV-GC-ANTIPHON')
    }
  })
})

// @fr FR-156 Phase 4a — `resolveSpecialKey` flow coverage via the real
// propers-loader (no mock). Purpose: verify the OT-movable names reach
// the special-key lookup without throwing and don't mutate the regular
// weekly-fallback output until Phase 4b data lands.
describe('FR-156 Phase 4a — OT special-key lookup flow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('getSeasonFirstVespers handles every OT movable celebrationName without throwing (Phase 4b data pending)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // Phase 4a wires the lookup path; Phase 4b (task #24) populates
    // `weeks['<specialKey>'].SUN.firstVespers` in `ordinary-time.json`.
    // Until then every call falls through to the regular per-week
    // firstVespers (which exists for OT weeks via Phase 2 injection),
    // so the result is either the special-key value (future) or the
    // weekly value (now) — both non-null, neither throw.
    for (const name of [
      'Trinity Sunday',
      'Corpus Christi',
      'The Most Holy Body and Blood of Christ',
      'Sacred Heart of Jesus',
      'Christ the King',
      'Our Lord Jesus Christ, King of the Universe',
    ]) {
      expect(() =>
        getSeasonFirstVespers('ORDINARY_TIME' as never, 17, undefined, name),
      ).not.toThrow()
    }
  })

  it('non-movable OT celebration names fall through to the regular per-week lookup (regression guard)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // A celebration name that does not match any OT movable fragment
    // must behave identically to calling without celebrationName — i.e.
    // the regular `weeks[weekKey].SUN.firstVespers` path (or its
    // weeks['1'] fallback) runs unchanged.
    const baseline = getSeasonFirstVespers('ORDINARY_TIME' as never, 17)
    const withUnrelatedName = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      17,
      undefined,
      'Some Unrelated Weekday',
    )
    // Regardless of whether the week has data or not, the outcome must
    // be equivalent between the two calls — special-key path does not
    // divert non-matching names.
    expect(withUnrelatedName).toStrictEqual(baseline)
  })
})
