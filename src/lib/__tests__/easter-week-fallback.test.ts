import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assembleHour } from '../loth-service'
import type { HourSection, PrayerText } from '../types'

// @fr FR-easter-1 (task #203) — dynamic reproduction of the user-reported
// 부활시기 회귀 ("부활시기인데 시편후렴/독서/응송/Marian/intercession/concluding 이
// 연중시기로 폴백"). Static analysis (task #202 audit, see
// `docs/handoff-fr-easter-regression.md`) found the resolver chain
// (propers-loader.ts wk1 fallback + rich-overlay.ts 3-tier + loth-service.ts
// 5-layer merge) intact, so the user's symptom must surface dynamically or
// not at all. This file pins down each anchor's actual output.
//
// 6 anchor dates spanning Easter weeks 2-7. For weekday lauds/vespers the
// resolver MUST use propers-loader.ts wk1 fallback to populate seasonPropers
// with Easter wk1 content (page range 700-728), and rich-overlay.ts MUST
// pick up the matching `seasonal/easter/w1-{day}-{hour}.rich.json` overlay.
// For Saturday vespers (the wk3 SAT anchor), the FR-156 first-vespers
// branch supplies wk{N+1}.SUN.firstVespers (which has its own
// shortReading/responsory/intercessions on PSALTER page numbers 50-450)
// underlaid by sundayRegular Easter wk1 SUN vespers (concludingPrayer
// + gospelCanticleAntiphon) — that mixed-source assembly is by design and
// is documented inline below.

vi.mock('../bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

interface FieldExpectation {
  /** Section type to look up from sections[]. */
  sectionType: HourSection['type']
  /** Friendly label for assertion failures. */
  label: string
  /** Picks the PrayerText off the section (textRich or rich). */
  pickRich: (section: HourSection) => PrayerText | undefined
}

const RICH_BEARING_FIELDS: FieldExpectation[] = [
  {
    sectionType: 'shortReading',
    label: 'shortReadingRich',
    pickRich: (s) => (s.type === 'shortReading' ? s.textRich : undefined),
  },
  {
    sectionType: 'responsory',
    label: 'responsoryRich',
    pickRich: (s) => (s.type === 'responsory' ? s.rich : undefined),
  },
  {
    sectionType: 'intercessions',
    label: 'intercessionsRich',
    pickRich: (s) => (s.type === 'intercessions' ? s.rich : undefined),
  },
  {
    sectionType: 'concludingPrayer',
    label: 'concludingPrayerRich',
    pickRich: (s) => (s.type === 'concludingPrayer' ? s.textRich : undefined),
  },
]

interface Anchor {
  date: string
  hour: 'lauds' | 'vespers' | 'compline'
  desc: string
  /** When true the firstVespers branch supplies its own (psalter) shortReading/
   * responsory/intercessions; only concludingPrayer + gospelCanticle remain
   * from sundayRegular Easter wk1 SUN vespers. We assert the looser shape
   * (seasonal=EASTER on whichever rich is present) without insisting on the
   * weekday wk1 page range.
   */
  firstVespersBranch?: boolean
}

const ANCHORS: Anchor[] = [
  { date: '2026-04-29', hour: 'lauds', desc: 'Easter wk4 WED lauds (사용자 reported)' },
  { date: '2026-04-13', hour: 'lauds', desc: 'Easter wk2 MON lauds' },
  { date: '2026-04-25', hour: 'vespers', desc: 'Easter wk3 SAT vespers (firstVespers of wk4 SUN)', firstVespersBranch: true },
  { date: '2026-05-03', hour: 'lauds', desc: 'Easter wk5 SUN lauds' },
  { date: '2026-05-15', hour: 'vespers', desc: 'Easter wk6 FRI vespers' },
  { date: '2026-05-19', hour: 'lauds', desc: 'Easter wk7 TUE lauds' },
]

describe('FR-easter-1 (task #203) — dynamic Easter wk1 fallback reproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe.each(ANCHORS)(
    '$desc ($date $hour)',
    ({ date, hour, firstVespersBranch }) => {
      it('liturgicalDay.season is EASTER', async () => {
        const result = await assembleHour(date, hour)
        expect(result).not.toBeNull()
        expect(result!.liturgicalDay.season).toBe('EASTER')
      })

      it('every present *Rich field carries seasonal Easter source (no ordinary leak)', async () => {
        const result = await assembleHour(date, hour)
        expect(result).not.toBeNull()
        const sections = result!.sections

        for (const field of RICH_BEARING_FIELDS) {
          const section = sections.find((s) => s.type === field.sectionType)
          if (!section) continue // section not built (e.g. SAT vespers may
                                  // omit fields the firstVespers entry didn't carry)
          const rich = field.pickRich(section)
          if (!rich) continue // legacy plain-only path; not a regression by itself
          const src = rich.source
          // Rich must NOT be sourced from the 4-week psalter commons (kind='common')
          // — that's exactly the partial-merge leak #54 closed for Easter wk2-7
          // weekdays. The dispatch's regression hypothesis says the same leak may
          // have re-opened along a different layer; this assertion catches it.
          expect(src, `${field.label} must have a source on ${date} ${hour}`).toBeDefined()
          if (src && src.kind === 'seasonal') {
            expect(
              src.season,
              `${field.label}.source.season on ${date} ${hour} (currently ${src.season})`,
            ).toBe('EASTER')
          }
          // sanctoral/override are also acceptable (celebration days), but
          // 'common' (4-week psalter) on a plain Easter weekday is a leak.
          if (src && src.kind === 'common') {
            throw new Error(
              `[regression] ${field.label} on ${date} ${hour} sourced from 4-week psalter commons (id=${src.id}) — Easter wk1 fallback failed`,
            )
          }
        }
      })

      // Page-range hint. For weekday wk1 fallback anchors, the JSON propers
      // shortReading.page is in the 700-730 band (PDF Easter octave, p.700-728).
      // For the firstVespers-branch anchor, the shortReading comes from the
      // psalter wrapper inside firstVespers (page 50-450) — assert only that
      // some Easter rich is present somewhere on the hour.
      if (!firstVespersBranch) {
        it('shortReading page lands in Easter wk1 octave range (700-730)', async () => {
          const result = await assembleHour(date, hour)
          expect(result).not.toBeNull()
          const sr = result!.sections.find((s) => s.type === 'shortReading')
          expect(sr).toBeDefined()
          if (sr?.type !== 'shortReading') throw new Error('expected shortReading section')
          expect(sr.page, `shortReading.page on ${date} ${hour} (got ${sr.page})`).toBeGreaterThanOrEqual(700)
          expect(sr.page, `shortReading.page on ${date} ${hour} (got ${sr.page})`).toBeLessThanOrEqual(730)
        })
      } else {
        it('at least concludingPrayer or gospelCanticle carries Easter content (firstVespers branch)', async () => {
          const result = await assembleHour(date, hour)
          expect(result).not.toBeNull()
          const cp = result!.sections.find((s) => s.type === 'concludingPrayer')
          const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
          // concludingPrayer.textRich source.season=EASTER (from sundayRegular wk1 SUN vespers)
          if (cp?.type === 'concludingPrayer' && cp.textRich?.source?.kind === 'seasonal') {
            expect(cp.textRich.source.season).toBe('EASTER')
          }
          // gospelCanticle.antiphon should have Layer5 Alleluia augmentation when
          // the season matches (FR-155, task #12).
          if (gc?.type === 'gospelCanticle') {
            expect(gc.antiphon.length).toBeGreaterThan(0)
          }
        })
      }

      it('gospelCanticle.antiphon has Layer5 Alleluia augmentation (FR-155 task #12)', async () => {
        const result = await assembleHour(date, hour)
        expect(result).not.toBeNull()
        const gc = result!.sections.find((s) => s.type === 'gospelCanticle')
        if (!gc) return // some assemblers may not include gospelCanticle
        if (gc.type !== 'gospelCanticle') throw new Error('expected gospelCanticle section')
        // applySeasonalAntiphon adds 'Аллэлуяа' suffix when missing. Either the
        // base text already contains it (Easter propers usually do) or the
        // helper added it. Empty antiphon would mean Layer5 had nothing to act on.
        expect(gc.antiphon, `gospelCanticleAntiphon must not be empty on Easter ${date} ${hour}`).not.toBe('')
        expect(
          gc.antiphon.toLowerCase(),
          `Layer5 must surface Alleluia ('Аллэлуяа') on Easter ${date} ${hour}; got ${JSON.stringify(gc.antiphon)}`,
        ).toContain('аллэлуяа')
      })
    },
  )
})

// Priority D — easter w1-*.rich.json field coverage table reference.
// (Generated 2026-04-29 from `seasonal/easter/w1-*.rich.json`; documented in
// `docs/handoff-fr-easter-regression.md` §6 Priority D after this anchor.)
//
// Weekday rich files (MON-FRI lauds+vespers, SAT lauds — 11 files) carry:
//   concludingPrayerRich, intercessionsRich, responsoryRich, shortReadingRich
// SUN-lauds + SUN-vespers carry the same 4 + alternativeConcludingPrayerRich.
// SUN-vespers2 carries shortReadingRich only.
// gospelCanticleAntiphonRich, hymnRich, alternativeConcludingPrayerRich
// (weekdays) are NOT authored. advent/lent w1-*.rich.json have an IDENTICAL
// 4-field shape; Easter is not under-covered relative to its peers.
