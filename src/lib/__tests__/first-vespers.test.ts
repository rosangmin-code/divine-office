import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FirstVespersPropers } from '../types'

// @fr FR-156 Phase 1 — resolver wiring for First Vespers of Sunday.

// Cache module state is owned by propers-loader; reset per test so a
// mock from one test doesn't leak. We use vi.doMock so each test gets a
// fresh module with our spy applied.
describe('FR-156 Phase 1 — getSeasonFirstVespers default behaviour', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null when no propers JSON carries a firstVespers slot (current production state)', async () => {
    const { getSeasonFirstVespers } = await import('../propers-loader')
    // Every season file currently has no `firstVespers` — Phase 2 (task
    // #20) will inject data. Until then every lookup must resolve null,
    // so the Saturday-vespers fallback keeps running.
    for (const season of [
      'ADVENT',
      'CHRISTMAS',
      'LENT',
      'EASTER',
      'ORDINARY_TIME',
    ] as const) {
      for (const week of [1, 2, 3, 4, 5, 6]) {
        expect(
          getSeasonFirstVespers(season, week),
          `${season} week ${week} should have no firstVespers yet`,
        ).toBeNull()
      }
    }
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
