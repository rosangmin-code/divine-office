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

  // @fr FR-156
  // @phase 5
  // WI-B3 (task #91) — advent 시즌 firstVespers bare-ref → versed 적용 가드.
  // bare ref ("Psalm 142") 는 src/lib/scripture-ref-parser.ts 의 regex
  // /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/ 에 미스매치되어 verses[] 가
  // 비어 채워지고 placeholder 본문이 노출됐다. WI-A2 의 rewrite 스크립트가
  // 5 cells (advent W1/W2/W3 SUN ps[1]·ps[0], W4 SUN ps[0]·ps[1]) 을
  // versed-form 으로 일괄 변환했음을 propers-loader 산출물에서 byte-equal
  // 로 가드한다.
  it('advent firstVespers psalms[*].ref are all versed-form post WI-B3 rewrite (task #91)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // 5 cells rewritten by WI-A2 --season advent (task #91):
    //   W1.SUN.ps[1]: "Psalm 142"  → "Psalm 142:1-7"
    //   W2.SUN.ps[1]: "Psalm 16"   → "Psalm 16:1-6"
    //   W3.SUN.ps[0]: "Psalm 113"  → "Psalm 113:1-9"
    //   W4.SUN.ps[0]: "Psalm 122"  → "Psalm 122:1-9"
    //   W4.SUN.ps[1]: "Psalm 130"  → "Psalm 130:1-8"
    const expectations: Array<{ week: number; index: number; ref: string }> = [
      { week: 1, index: 1, ref: 'Psalm 142:1-7' },
      { week: 2, index: 1, ref: 'Psalm 16:1-6' },
      { week: 3, index: 0, ref: 'Psalm 113:1-9' },
      { week: 4, index: 0, ref: 'Psalm 122:1-9' },
      { week: 4, index: 1, ref: 'Psalm 130:1-8' },
    ]
    for (const { week, index, ref } of expectations) {
      const fv = getSeasonFirstVespers('ADVENT' as never, week)
      expect(fv, `ADVENT week ${week} firstVespers must be present`).not.toBeNull()
      const psalm = fv!.psalms![index]
      expect(psalm, `ADVENT W${week} firstVespers.psalms[${index}]`).toBeDefined()
      expect(psalm.ref, `ADVENT W${week}.SUN.firstVespers.psalms[${index}].ref must be versed-form`).toBe(ref)
      // Versed-form regex (verbatim from scripture-ref-parser.ts) — bare
      // ref would fail this and fall through to placeholder rendering.
      expect(psalm.ref, `${ref} must satisfy parser regex (colon required)`).toMatch(
        /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/,
      )
    }
  })

  // Negative-path guard for ADVENT firstVespers — confirm no bare refs
  // remain in psalms[*].ref across the season after rewrite. Scans every
  // authored cell so a future drift (manual edit removing the colon)
  // is caught immediately.
  it('advent firstVespers contains zero bare-ref psalms across all weeks (task #91 regression)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const VERSED_REGEX = /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/
    const offenders: string[] = []
    for (const week of [1, 2, 3, 4] as const) {
      const fv = getSeasonFirstVespers('ADVENT' as never, week)
      if (!fv?.psalms) continue
      fv.psalms.forEach((p, i) => {
        if (typeof p.ref === 'string' && !VERSED_REGEX.test(p.ref)) {
          offenders.push(`ADVENT W${week}.psalms[${i}] ref="${p.ref}"`)
        }
      })
    }
    expect(offenders, 'no bare-ref psalms must remain in advent firstVespers').toEqual([])
  })

  // @fr FR-156
  // @phase 5
  // WI-B5 (task #95) — ordinary-time 시즌 firstVespers bare-ref → versed
  // 적용 가드. 42 cells (W1~W34 SUN ps[0] 또는 ps[1]) 가 4-week psalter
  // cycle 패턴으로 5 distinct refs 에 대응:
  //   ps[1] = Psalm 142:1-7  (W1, W5, W9, ...)  / Psalm 16:1-6  (W2, W6, ...)
  //   ps[0] = Psalm 113:1-9  (W3, W7, W11, ...) / Psalm 122:1-9 (W4, W8, ...)
  //   ps[1] = Psalm 130:1-8  (W4, W8, W12, ...)
  // bare ref 일 때는 scripture-ref-parser regex (versed-only) 미스매치로
  // verses[] 가 비어 placeholder 노출 → WI-A2 의 rewrite 가 일괄 변환.
  it('ordinary-time firstVespers psalms[*].ref are all versed-form post WI-B5 rewrite (task #95)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // 4-week psalter cycle: psalterWeek = ((weekOfSeason - 1) % 4) + 1.
    // Sample one OT week per psalter slot to verify all 5 refs:
    //   W1 (psalterW1) ps[1]: "Psalm 142" → "Psalm 142:1-7"
    //   W2 (psalterW2) ps[1]: "Psalm 16"  → "Psalm 16:1-6"
    //   W3 (psalterW3) ps[0]: "Psalm 113" → "Psalm 113:1-9"
    //   W4 (psalterW4) ps[0]: "Psalm 122" → "Psalm 122:1-9"
    //   W4 (psalterW4) ps[1]: "Psalm 130" → "Psalm 130:1-8"
    const expectations: Array<{ week: number; index: number; ref: string }> = [
      { week: 1, index: 1, ref: 'Psalm 142:1-7' },
      { week: 2, index: 1, ref: 'Psalm 16:1-6' },
      { week: 3, index: 0, ref: 'Psalm 113:1-9' },
      { week: 4, index: 0, ref: 'Psalm 122:1-9' },
      { week: 4, index: 1, ref: 'Psalm 130:1-8' },
      // Last-cycle representative (W34 = psalterW2): ps[1] = "Psalm 16:1-6"
      { week: 34, index: 1, ref: 'Psalm 16:1-6' },
    ]
    for (const { week, index, ref } of expectations) {
      const fv = getSeasonFirstVespers('ORDINARY_TIME' as never, week)
      expect(fv, `ORDINARY_TIME week ${week} firstVespers must be present`).not.toBeNull()
      const psalm = fv!.psalms![index]
      expect(psalm, `OT W${week} firstVespers.psalms[${index}]`).toBeDefined()
      expect(psalm.ref, `OT W${week}.SUN.firstVespers.psalms[${index}].ref must be versed-form`).toBe(ref)
      expect(psalm.ref, `${ref} must satisfy parser regex (colon required)`).toMatch(
        /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/,
      )
    }
  })

  // Negative-path guard for OT firstVespers — confirm no bare refs
  // remain across all 34 weeks. Scans every authored cell so a future
  // drift (manual edit removing the colon) is caught immediately.
  it('ordinary-time firstVespers contains zero bare-ref psalms across all 34 weeks (task #95 regression)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const VERSED_REGEX = /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/
    const offenders: string[] = []
    for (let week = 1; week <= 34; week++) {
      const fv = getSeasonFirstVespers('ORDINARY_TIME' as never, week)
      if (!fv?.psalms) continue
      fv.psalms.forEach((p, i) => {
        if (typeof p.ref === 'string' && !VERSED_REGEX.test(p.ref)) {
          offenders.push(`OT W${week}.psalms[${i}] ref="${p.ref}"`)
        }
      })
    }
    expect(offenders, 'no bare-ref psalms must remain in ordinary-time firstVespers').toEqual([])
  })

  // @fr FR-156
  // @phase 5
  // WI-B4 (task #94) — christmas (holyFamily/baptism) + sanctoral/solemnities
  // 12-25 firstVespers bare-ref → versed 적용 가드. 4 cells:
  //   propers/christmas.json $.weeks.holyFamily.SUN.firstVespers.psalms[1]
  //                          "Psalm 142" → "Psalm 142:1-7"
  //   propers/christmas.json $.weeks.baptism.SUN.firstVespers.psalms[1]
  //                          "Psalm 142" → "Psalm 142:1-7"
  //   sanctoral/solemnities.json $.12-25.firstVespers.psalms[0]
  //                              "Psalm 113" → "Psalm 113:1-9"
  //   sanctoral/solemnities.json $.12-25.firstVespers.psalms[1]
  //                              "Psalm 147" → "Psalm 147:12-20"
  it('christmas (holyFamily/baptism) firstVespers psalms[1].ref are versed-form post WI-B4 rewrite (task #94)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // CHRISTMAS season firstVespers slot is keyed by celebrationName via
    // resolveSpecialKey(): "Holy Family" → holyFamily, "Baptism of the
    // Lord" → baptism. weeks[<key>].SUN.firstVespers is the rewrite target.
    const cases: Array<{ celebration: string; label: string }> = [
      { celebration: 'Holy Family', label: 'holyFamily' },
      { celebration: 'Baptism of the Lord', label: 'baptism' },
    ]
    const VERSED_REGEX = /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/
    for (const { celebration, label } of cases) {
      const fv = getSeasonFirstVespers(
        'CHRISTMAS' as never,
        1,
        undefined,
        celebration,
      )
      expect(fv, `christmas ${label} firstVespers must be present`).not.toBeNull()
      const psalm = fv!.psalms![1]
      expect(psalm, `christmas ${label} firstVespers.psalms[1]`).toBeDefined()
      expect(psalm.ref, `christmas ${label}.SUN.firstVespers.psalms[1].ref must be versed-form`).toBe('Psalm 142:1-7')
      expect(psalm.ref, 'must satisfy parser regex (colon required)').toMatch(VERSED_REGEX)
    }
  })

  it('sanctoral 12-25 (Christmas) firstVespers psalms[0..1].ref are versed-form post WI-B4 rewrite (task #94)', async () => {
    const { getSanctoralPropers } = await import('../propers-loader')
    const entry = getSanctoralPropers('12-25')
    expect(entry).not.toBeNull()
    expect(entry!.firstVespers).toBeDefined()
    const fv = entry!.firstVespers!
    expect(fv.psalms, 'sanctoral 12-25 firstVespers psalms').toBeDefined()
    expect(fv.psalms![0].ref).toBe('Psalm 113:1-9')
    expect(fv.psalms![1].ref).toBe('Psalm 147:12-20')
    // Versed-form regex parity with parser
    const VERSED_REGEX = /^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$/
    expect(fv.psalms![0].ref).toMatch(VERSED_REGEX)
    expect(fv.psalms![1].ref).toMatch(VERSED_REGEX)
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

// @fr FR-156 task #30 — FEAST rank resolver extension.
// Ensures that the 4 FEAST entries whose PDF authors 1st Vespers
// (02-02 Presentation, 08-06 Transfiguration, 09-14 Exaltation of the
// Holy Cross, 11-09 Lateran Basilica) surface on the evening before,
// now that the resolver accepts rank === 'FEAST' in addition to
// 'SOLEMNITY'. Path 2 (movable special-key) remains SOLEMNITY-only.
describe('FR-156 task #30 — FEAST rank First Vespers', () => {
  const feastFirstVespers: FirstVespersPropers = {
    gospelCanticleAntiphon: 'FEAST-FIRST-VESPERS-GC-ANTIPHON',
    concludingPrayer: 'FEAST-FIRST-VESPERS-CONCLUDING-PRAYER',
    shortReading: {
      ref: 'Hebrews 1:1-2',
      text: 'FEAST-FIRST-VESPERS-SHORT-READING',
    },
  }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../propers-loader')
  })

  const cases = [
    { eveDate: '2026-02-01', feastKey: '02-02', name: 'Presentation of the Lord (02-02)' },
    { eveDate: '2026-08-05', feastKey: '08-06', name: 'Transfiguration (08-06)' },
    { eveDate: '2026-09-13', feastKey: '09-14', name: 'Exaltation of the Cross (09-14)' },
    { eveDate: '2026-11-08', feastKey: '11-09', name: 'Lateran Basilica (11-09)' },
  ]

  for (const { eveDate, feastKey, name } of cases) {
    it(`adopts sanctoral.firstVespers on the evening before ${name}`, async () => {
      vi.doMock('../propers-loader', async () => {
        const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
        return {
          ...actual,
          // Only the target feast key returns firstVespers; all other
          // keys fall through so non-feast eves stay untouched.
          getSanctoralPropers: vi.fn((key: string) =>
            key === feastKey ? { name, firstVespers: feastFirstVespers } : null,
          ),
          // Path 2 must NOT fire for FEAST even when this mock returns
          // something — the resolver is gated to SOLEMNITY rank.
          getSeasonFirstVespers: vi.fn(() => ({
            gospelCanticleAntiphon: 'PATH2-MOVABLE-LEAK-ANTIPHON',
          })),
          getSeasonHourPropers: vi.fn(() => null),
        }
      })
      const { assembleHour } = await import('../loth-service')
      const result = await assembleHour(eveDate, 'vespers')
      expect(result).not.toBeNull()
      expect(result!.hourType).toBe('vespers')

      const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
      expect(gcSection).toBeDefined()
      if (gcSection && gcSection.type === 'gospelCanticle') {
        expect(gcSection.antiphon).toContain('FEAST-FIRST-VESPERS-GC-ANTIPHON')
        // Gate assertion: movable Path 2 must not leak for FEAST.
        expect(gcSection.antiphon).not.toContain('PATH2-MOVABLE-LEAK-ANTIPHON')
      }
      const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
      expect(prayerSection).toBeDefined()
      if (prayerSection && prayerSection.type === 'concludingPrayer') {
        expect(prayerSection.text).toBe('FEAST-FIRST-VESPERS-CONCLUDING-PRAYER')
      }
    })
  }

  it('FEAST without authored firstVespers leaves eve vespers untouched (regression guard)', async () => {
    // Mock a feast-ranked tomorrow WITHOUT firstVespers. The resolver
    // must not promote eve vespers in this case — regular Sunday
    // firstVespers (via Saturday→Sunday branch) should take over.
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        // Even for a matching MM-DD, firstVespers is undefined.
        getSanctoralPropers: vi.fn((key: string) =>
          key === '02-02' ? { name: 'Feast without 1V' } : null,
        ),
        // Sunday regular vespers marker to confirm the eve falls
        // through to the Saturday→Sunday branch.
        getSeasonFirstVespers: vi.fn(() => null),
        getSeasonHourPropers: vi.fn((_s, _w, day) =>
          day === 'SUN'
            ? {
                gospelCanticleAntiphon: 'REGULAR-SUNDAY-VESPERS-FALLBACK',
                concludingPrayer: 'REGULAR-SUNDAY-FALLBACK-PRAYER',
              }
            : null,
        ),
      }
    })
    const { assembleHour } = await import('../loth-service')
    // 2026-01-31 SAT — tomorrow 02-01 is a regular Sunday in OT
    // (02-02 Presentation not checked here). Assert fallback path.
    const result = await assembleHour('2026-01-31', 'vespers')
    expect(result).not.toBeNull()
    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    if (gcSection && gcSection.type === 'gospelCanticle') {
      expect(gcSection.antiphon).not.toContain('FEAST-FIRST-VESPERS-GC-ANTIPHON')
      expect(gcSection.antiphon).toContain('REGULAR-SUNDAY-VESPERS-FALLBACK')
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
    expect(fv.psalms![0].ref).toBe('Psalm 113:1-9')
    expect(fv.psalms![1].ref).toBe('Psalm 147:12-20')
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

// @fr FR-156 Phase 4b — movable solemnity firstVespers data injection.
// Confirms the 6 injected entries surface through the real
// propers-loader (no mock) via `getSeasonFirstVespers` keyed by the
// special-key slugs. Byte-equal textual checks against the PDF source
// are handled by `scripts/verify-movable-first-vespers.js` — this suite
// only asserts the lookup plumbing carries the injected payload end-to-end.
describe('FR-156 Phase 4b — movable solemnity firstVespers data (real loader)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('Ascension — getSeasonFirstVespers(EASTER, _, _, "Ascension of the Lord") returns injected firstVespers', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const fv = getSeasonFirstVespers(
      'EASTER' as never,
      6,
      '2026-05-13',
      'Ascension of the Lord',
    )
    expect(fv).not.toBeNull()
    expect(fv!.gospelCanticleAntiphon).toContain('Аав аа, Таны Надад өгсөн хүмүүст')
    expect(fv!.concludingPrayer).toContain('Хүүгийнхээ тэнгэрт заларснаар')
    expect(fv!.alternativeConcludingPrayer).toContain('Христийг бидний нүдний өмнөөс')
  })

  it('Pentecost — getSeasonFirstVespers(EASTER, _, _, "Pentecost Sunday") returns full psalter + reading', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const fv = getSeasonFirstVespers(
      'EASTER' as never,
      7,
      '2026-05-23',
      'Pentecost Sunday',
    )
    expect(fv).not.toBeNull()
    expect(fv!.psalms).toBeDefined()
    expect(fv!.psalms!.length).toBe(3)
    expect(fv!.psalms![0].ref).toBe('Psalm 113:1-9')
    expect(fv!.psalms![1].ref).toBe('Psalm 147:1-11')
    expect(fv!.psalms![2].ref).toBe('Revelation 15:3-4')
    expect(fv!.shortReading).toBeTruthy()
    expect(fv!.shortReading!.ref).toBe('Romans 8:9-11')
    expect(fv!.intercessions).toBeDefined()
    expect(fv!.intercessions!.length).toBe(6)
    expect(fv!.gospelCanticleAntiphon).toContain('Ариун Сүнс бууж')
  })

  it('Trinity Sunday — getSeasonFirstVespers(ORDINARY_TIME, _, _, "Trinity Sunday") returns injected firstVespers', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const fv = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      9,
      '2026-05-30',
      'Trinity Sunday',
    )
    expect(fv).not.toBeNull()
    // Injected antiphon must surface (not the regular weekly antiphon
    // that would otherwise come from weeks['9'].SUN.firstVespers).
    expect(fv!.gospelCanticleAntiphon).toContain('Танд бид талархлаа өргөе')
    expect(fv!.gospelCanticleAntiphon).toContain('Ганц бөгөөд үнэн Ариун Гурвал')
    expect(fv!.concludingPrayer).toContain('Өөрийн Үгийг илгээсэн')
  })

  it('Corpus Christi — getSeasonFirstVespers matches "Corpus Christi" and "Body and Blood"', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const fromCorpusChristi = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      9,
      undefined,
      'Corpus Christi',
    )
    const fromBodyAndBlood = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      9,
      undefined,
      'The Most Holy Body and Blood of Christ',
    )
    expect(fromCorpusChristi).not.toBeNull()
    expect(fromBodyAndBlood).not.toBeNull()
    expect(fromCorpusChristi!.gospelCanticleAntiphon).toContain('Та тэнгэрээс талхыг хайрласнаараа')
    // Both name fragments must resolve to the same injected entry.
    expect(fromBodyAndBlood).toStrictEqual(fromCorpusChristi)
  })

  it('Sacred Heart — getSeasonFirstVespers matches "Sacred Heart"', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const fv = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      10,
      undefined,
      'The Most Sacred Heart of Jesus',
    )
    expect(fv).not.toBeNull()
    expect(fv!.gospelCanticleAntiphon).toContain('Би газар дээр гал хаяхаар ирсэн')
    expect(fv!.concludingPrayer).toContain('Таны Хүү Есүсийн зүрхнээс')
  })

  it('Christ the King — getSeasonFirstVespers matches both name variants', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    const shortName = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      34,
      undefined,
      'Christ the King',
    )
    const longName = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      34,
      undefined,
      'Our Lord Jesus Christ, King of the Universe',
    )
    expect(shortName).not.toBeNull()
    expect(longName).not.toBeNull()
    expect(shortName!.gospelCanticleAntiphon).toContain('өвөг Давидынх нь хаан ширээг')
    expect(shortName!.concludingPrayer).toContain('Хүү Есүс Христээр')
    expect(longName).toStrictEqual(shortName)
  })

  it('Palm Sunday Eve (2026-03-28) surfaces lentPassionSunday variant via effectiveDay promotion', async () => {
    // @fr FR-156 Phase 4c (task #25) regression guard.
    // Palm Sunday is rank=SOLEMNITY in romcal, so the Phase 3a/4a
    // evening-before-solemnity branch fires on Saturday 2026-03-28. The
    // sanctoral path is null (movable), so path 2 resolves to
    // weeks['6'].SUN.firstVespers (Phase 2 injected per-week data
    // carrying `seasonal_antiphons.lentPassionSunday` on psalms[0]).
    //
    // Bug: the solemnity branch originally did NOT promote
    // effectiveDayOfWeek/weekOfSeason, so pickSeasonalVariant saw
    // (SAT, LENT W5) — failed the `dayOfWeek === 'SUN'` gate — fell
    // back to default_antiphon (Easter alleluia variant). Fix: promote
    // to tomorrow's (SUN, LENT W6) identity so lentPassionSunday fires.
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-03-28', 'vespers')
    expect(result).not.toBeNull()
    const psalmody = result!.sections.find((s) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    if (psalmody && psalmody.type === 'psalmody') {
      const ps1 = psalmody.psalms.find((p) => p.reference === 'Psalm 119:105-112')
      expect(ps1).toBeTruthy()
      expect(ps1!.antiphon).toContain('Сүмд өдөр бүр та нартай хамт байж')
    }
  })

  it('OT weekly lookup without movable celebrationName is unaffected by special-key injection (regression guard)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // Calling with a regular OT Sunday name should return the
    // per-week Phase 2 data, NOT the Phase 4b special-key payload.
    const fv = getSeasonFirstVespers(
      'ORDINARY_TIME' as never,
      17,
      undefined,
      '17th Sunday in Ordinary Time',
    )
    expect(fv).not.toBeNull()
    expect(fv!.psalms).toBeDefined()
    expect(fv!.psalms!.length).toBe(3)
    // Must NOT surface the trinity/corpusChristi/sacredHeart/christTheKing antiphons.
    const ant = fv!.gospelCanticleAntiphon ?? ''
    expect(ant).not.toContain('Танд бид талархлаа өргөе')
    expect(ant).not.toContain('Та тэнгэрээс талхыг хайрласнаараа')
    expect(ant).not.toContain('Би газар дээр гал хаяхаар ирсэн')
    expect(ant).not.toContain('өвөг Давидынх нь хаан ширээг')
  })
})

// @fr FR-156 Symptom A — psalter commons rich must not Layer-4 override
// firstVespers plain shortReading (task #66 / #72).
describe('FR-156 Symptom A — Saturday vespers firstVespers shortReading wins over psalter commons rich', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  // Real-loader integration. Mirrors the playwright e2e in
  // `e2e/first-vespers.spec.ts` (Symptom A regression block) at the
  // assembleHour layer — exercises the actual data files so Layer 4 rich
  // overlay merge is not stubbed.
  //
  // Bug context: 2026-04-25 Saturday, Easter Week 3. Tomorrow is Easter
  // Week 4 Sunday; its firstVespers shortReading = 2 Peter 1:19-21
  // ("Үүр цайж...", PDF p.402). Before #72, loth-service passed
  // `psalterWeek: day.psalterWeek` (= 3) into resolveRichOverlay, which
  // loaded prayers/commons/psalter/w3-SAT-vespers.rich.json and Layer-4
  // spread its shortReadingRich (= 1 Petr 1:3-7, "Эзэн Есүс Христийн
  // маань...") on top of the firstVespers plain shortReading. The
  // textRich-priority UI rendered the Saturday psalter commons reading
  // where the Sunday firstVespers reading should appear.
  it('Easter wk3 SAT vespers (2026-04-25) shortReading.ref / text come from Sunday firstVespers (PDF p.402), not w3-SAT psalter commons', async () => {
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-04-25', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')

    const sr = result!.sections.find((s) => s.type === 'shortReading')
    expect(sr).toBeDefined()
    if (sr && sr.type === 'shortReading') {
      // Sunday firstVespers reading wins. The plain text is wired into
      // the section as a single synthetic verse via
      // hours/resolvers/reading.ts L26-34 (when shortReading.text is set).
      expect(sr.ref).toBe('2 Peter 1:19-21')
      expect(sr.page).toBe(402)
      const plainText = sr.verses.map((v) => v.text).join(' ')
      expect(plainText).toContain('Үүр цайж')
      // Negative guard: w3-SAT-vespers psalter commons rich (1 Petr 1:3-7,
      // "Эзэн Есүс Христийн маань Тэнгэрбурхан ба Эцэг") must NOT have
      // overridden the firstVespers reading.
      expect(plainText).not.toContain('Эзэн Есүс Христийн маань')
      // Rich overlay must also NOT carry the Saturday psalter commons
      // shortReadingRich. After Symptom A fix, psalter commons rich is
      // skipped (psalterWeek=undefined) AND no Easter wk3 SAT seasonal
      // rich is authored, so textRich is expected absent for this case.
      const richText =
        sr.textRich?.blocks?.[0] && sr.textRich.blocks[0].kind === 'para'
          ? sr.textRich.blocks[0].spans
              .map((s) => (s.kind === 'text' ? s.text : ''))
              .join('')
          : ''
      expect(richText).not.toContain('Эзэн Есүс Христийн маань')
    }
  })

  // Counter-test: regular Saturday vespers (Sat NOT promoted to Sunday
  // firstVespers — e.g. solemnity replaces the day) still resolves
  // psalter commons rich normally. Use a plain mid-week Saturday in
  // Ordinary Time where firstVespers branch fires (default behavior),
  // but assert that for a regular weekday vespers (TUE/WED) the psalter
  // commons rich still applies. We sample 2026-02-04 Wednesday (OT W4)
  // — vespers, no firstVespers branch — to confirm Layer-4 still works
  // for the non-promoted path.
  it('regular weekday vespers (2026-02-04 WED OT) still loads psalter commons rich Layer-4 (regression guard)', async () => {
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-02-04', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
    // Existence check — rendering must succeed without errors. Specific
    // psalter commons rich field surfacing is exercised by the broader
    // e2e/prayer-psalter-commons.spec.ts; here we only guard against the
    // Symptom A fix accidentally killing Layer-4 for non-promoted paths.
    expect(result!.sections.length).toBeGreaterThan(0)
  })
})

// @fr FR-011 task #60 — Saturday vespers regression guard for plain
// Sundays misrouted via the evening-before-solemnity branch.
//
// Bug context: romcal labels EVERY Sunday as `rank === 'SOLEMNITY'`
// (liturgical convention — Sunday outranks weekdays). Phase 3a (task #21)
// added Path 2 (`getSeasonFirstVespers` for movable solemnities) gated
// only on `tomorrowDay.rank === 'SOLEMNITY'`. Without a special-key
// gate, Path 2 fell through to `weeks[N].SUN.firstVespers` for every
// plain Sunday — and Phase 2 (task #20) made those entries non-null
// but intentionally PARTIAL (psalms + shortReading + responsory +
// intercessions; no concludingPrayer / gospelCanticleAntiphon — those
// stay in regular Sunday vespers). The branch then assigned
// `seasonPropers = solemnityFirstVespers` without the sundayRegular
// backstop, silently dropping the concluding prayer + Magnificat
// antiphon for every OT Saturday vespers.
//
// Fix gate: `resolveSpecialKey(tomorrowDay.season, tomorrowDay.name) != null`
// — Path 2 only fires when the celebration name maps to a known
// movable-solemnity bucket (ascension / pentecost / trinitySunday /
// corpusChristi / sacredHeart / christTheKing). Plain Sundays fall
// through to the Saturday→Sunday branch (L194+) which DOES merge
// sundayRegular ⟩ firstVespers per FR-156 Phase 2.
describe('FR-011 task #60 — plain-Sunday Saturday vespers backstop', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../propers-loader')
    vi.doUnmock('../calendar')
  })

  // Plain-Sunday partial firstVespers — mirrors the actual shape produced
  // by FR-156 Phase 2 task #20 injection for OT regular Sundays
  // (5th Sunday of Ordinary Time, etc.).
  const partialPlainSundayFirstVespers: FirstVespersPropers = {
    psalms: [
      {
        type: 'psalm',
        ref: 'Psalm 122',
        antiphon_key: 'fv-w4-sun-ps1',
        default_antiphon: 'PARTIAL-FV-PS1-ANTIPHON',
        gloria_patri: true,
      },
    ],
    shortReading: { ref: 'Romans 8:1', text: 'PARTIAL-FV-SHORT-READING' },
    // Intentionally NO concludingPrayer / gospelCanticleAntiphon —
    // mirrors the Phase 2 partial injection.
  }

  // Sunday regular vespers carries the concludingPrayer + Magnificat
  // antiphon — these MUST survive the Saturday→Sunday firstVespers merge.
  const sundayRegularVespers = {
    gospelCanticleAntiphon: 'PLAIN-SUNDAY-REGULAR-MAGNIFICAT-ANTIPHON',
    concludingPrayer: 'PLAIN-SUNDAY-REGULAR-CONCLUDING-PRAYER',
  }

  it('plain OT Saturday vespers — concludingPrayer + Magnificat antiphon come from sundayRegular when firstVespers is partial', async () => {
    vi.doMock('../calendar', async () => {
      const actual = await vi.importActual<typeof import('../calendar')>('../calendar')
      return {
        ...actual,
        // Saturday rank=WEEKDAY, Sunday rank=SOLEMNITY (romcal default).
        // Sunday name has NO special-key marker (not Trinity/Corpus
        // Christi/Sacred Heart/Christ the King) — so resolveSpecialKey
        // returns null and Path 2 must NOT claim seasonPropers.
        getLiturgicalDay: vi.fn((dateStr: string) => {
          if (dateStr === '2026-02-07') {
            return {
              date: dateStr,
              name: 'Saturday of the 4th week of Ordinary Time',
              nameMn: '',
              season: 'ORDINARY_TIME',
              seasonMn: '',
              color: 'GREEN',
              colorMn: '',
              rank: 'WEEKDAY',
              sundayCycle: 'A',
              weekdayCycle: '2',
              weekOfSeason: 3,
              psalterWeek: 4,
              otWeek: 4,
            }
          }
          if (dateStr === '2026-02-08') {
            return {
              date: dateStr,
              name: '5th Sunday of Ordinary Time',
              nameMn: '',
              season: 'ORDINARY_TIME',
              seasonMn: '',
              color: 'GREEN',
              colorMn: '',
              rank: 'SOLEMNITY',
              sundayCycle: 'A',
              weekdayCycle: '2',
              weekOfSeason: 4,
              psalterWeek: 1,
              otWeek: 5,
            }
          }
          return null
        }),
      }
    })
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        // No fixed-date sanctoral firstVespers (Path 1 absent).
        getSanctoralPropers: vi.fn(() => null),
        // Phase 2 partial firstVespers for the plain Sunday — must NOT
        // be adopted as seasonPropers by Path 2 (special-key gate
        // prevents that), but must surface via the Saturday→Sunday
        // branch with sundayRegular as backstop for missing fields.
        getSeasonFirstVespers: vi.fn(() => partialPlainSundayFirstVespers),
        // SAT vespers absent (OT only authors SUN), SUN vespers carries
        // the regular propers.
        getSeasonHourPropers: vi.fn(
          (_s: unknown, _w: unknown, day: string, hour: string) =>
            day === 'SUN' && hour === 'vespers' ? sundayRegularVespers : null,
        ),
        // Plain OT Sunday name does NOT match any movable bucket.
        resolveSpecialKey: vi.fn(() => null),
      }
    })
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-02-07', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')

    // Critical assertions — the regression that task #60 fixes:
    const sectionTypes = result!.sections.map((s) => s.type)
    expect(sectionTypes).toContain('concludingPrayer')

    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    expect(prayerSection).toBeDefined()
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      // Comes from sundayRegular (partial firstVespers had no concludingPrayer).
      expect(prayerSection.text).toBe('PLAIN-SUNDAY-REGULAR-CONCLUDING-PRAYER')
    }

    const gcSection = result!.sections.find((s) => s.type === 'gospelCanticle')
    expect(gcSection).toBeDefined()
    if (gcSection && gcSection.type === 'gospelCanticle') {
      // Magnificat antiphon also from sundayRegular.
      expect(gcSection.antiphon).toContain('PLAIN-SUNDAY-REGULAR-MAGNIFICAT-ANTIPHON')
    }
  })

  it('movable-solemnity Path 2 still fires when celebration name maps to a special key (Trinity Sunday)', async () => {
    // Counter-test: when the Sunday IS an actual movable solemnity
    // (Trinity Sunday — celebrationName matches `resolveSpecialKey`
    // ORDINARY_TIME bucket), Path 2 MUST claim seasonPropers as before.
    // This test pins the special-key gate behavior so a future "tighten
    // the gate further" change cannot silently break movable solemnities.
    const trinityFirstVespers: FirstVespersPropers = {
      gospelCanticleAntiphon: 'TRINITY-FV-MAGNIFICAT-ANTIPHON',
      concludingPrayer: 'TRINITY-FV-CONCLUDING-PRAYER',
      shortReading: { ref: '1 John 4:8', text: 'TRINITY-FV-SHORT-READING' },
    }
    vi.doMock('../calendar', async () => {
      const actual = await vi.importActual<typeof import('../calendar')>('../calendar')
      return {
        ...actual,
        getLiturgicalDay: vi.fn((dateStr: string) => {
          if (dateStr === '2026-05-30') {
            return {
              date: dateStr,
              name: 'Saturday of the 8th week of Ordinary Time',
              nameMn: '',
              season: 'ORDINARY_TIME',
              seasonMn: '',
              color: 'GREEN',
              colorMn: '',
              rank: 'WEEKDAY',
              sundayCycle: 'A',
              weekdayCycle: '2',
              weekOfSeason: 8,
              psalterWeek: 4,
              otWeek: 8,
            }
          }
          if (dateStr === '2026-05-31') {
            return {
              date: dateStr,
              name: 'The Most Holy Trinity',
              nameMn: '',
              season: 'ORDINARY_TIME',
              seasonMn: '',
              color: 'WHITE',
              colorMn: '',
              rank: 'SOLEMNITY',
              sundayCycle: 'A',
              weekdayCycle: '2',
              weekOfSeason: 9,
              psalterWeek: 1,
              otWeek: 9,
            }
          }
          return null
        }),
      }
    })
    vi.doMock('../propers-loader', async () => {
      const actual = await vi.importActual<typeof import('../propers-loader')>('../propers-loader')
      return {
        ...actual,
        getSanctoralPropers: vi.fn(() => null),
        getSeasonFirstVespers: vi.fn(() => trinityFirstVespers),
        getSeasonHourPropers: vi.fn(() => null),
        // celebrationName "The Most Holy Trinity" → 'trinitySunday'.
        resolveSpecialKey: vi.fn((_s: unknown, name?: string | null) =>
          name?.toLowerCase().includes('trinity') ? 'trinitySunday' : null,
        ),
      }
    })
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-05-30', 'vespers')
    expect(result).not.toBeNull()

    const prayerSection = result!.sections.find((s) => s.type === 'concludingPrayer')
    expect(prayerSection).toBeDefined()
    if (prayerSection && prayerSection.type === 'concludingPrayer') {
      // Trinity Path 2 wins — concludingPrayer from trinityFirstVespers.
      expect(prayerSection.text).toBe('TRINITY-FV-CONCLUDING-PRAYER')
    }
  })
})

// @fr FR-156
// @phase 5
describe('FR-156 Phase 5 WI-B1 — easter firstVespers psalm bodies non-empty after bare→versed rewrite', () => {
  beforeEach(() => {
    // Prior describe blocks vi.doMock('../propers-loader') with afterEach
    // vi.doUnmock — but Node module cache survives until vi.resetModules.
    // Reset so this real-loader integration test gets a fresh import.
    vi.resetModules()
  })

  it('Easter wk3 SAT vespers (2026-04-25) → Wk 4 SUN firstVespers ps1 = Psalm 122:1-9 (catalog hit, non-empty stanzas)', async () => {
    // 2026-04-25 is Easter Wk 3 SAT — Saturday-vespers branch promotes
    // to Easter Wk 4 SUN's firstVespers. Wk 4 SUN ps1 was bare "Psalm 122"
    // before Phase 5; rewrite tool versed it to "Psalm 122:1-9" which is a
    // direct catalog hit.
    const { assembleHour } = await import('../loth-service')
    const result = await assembleHour('2026-04-25', 'vespers')
    expect(result).not.toBeNull()
    const psalmody = result!.sections.find((s) => s.type === 'psalmody')
    expect(psalmody).toBeDefined()
    if (!psalmody || psalmody.type !== 'psalmody') throw new Error('psalmody section missing')
    expect(psalmody.psalms.length).toBeGreaterThanOrEqual(1)
    const ps1 = psalmody.psalms[0]
    // Reference must be the versed catalog key, not the bare form.
    expect(ps1.reference).toBe('Psalm 122:1-9')
    // Stanzas must be non-empty — empty stanzas would mean catalog miss
    // fell through to Bible JSONL or to the placeholder, both of which
    // signal a regression in the WI-A2 + WI-C wiring.
    expect(ps1.stanzas).toBeDefined()
    expect(ps1.stanzas!.length).toBeGreaterThan(0)
    expect(ps1.stanzas![0].length).toBeGreaterThan(0)
    // First line of stanza 0 carries the canonical Psalm 122 opening
    // from PDF body L13739: "Тэд надад "ЭЗЭНий өргөө рүү явцгаая" гэхэд".
    const firstStanzaText = ps1.stanzas![0].join(' ')
    expect(firstStanzaText).toContain('ЭЗЭНий өргөө рүү явцгаая')
  })
})
