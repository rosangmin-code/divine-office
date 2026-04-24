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
