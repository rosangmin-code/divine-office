import { describe, it, expect, vi } from 'vitest'
import type { PsalmEntry } from '../../../types'

// Mock external dependencies so the resolver runs in isolation with
// predictable inputs. The resolver pulls stanza text from loadPsalterTexts;
// we return a minimal stub so the fulfilled path is exercised. bible-loader
// is a backup fallback that should not fire when stanzas are present.
vi.mock('../../loaders', () => ({
  loadPsalterTexts: () => ({
    'Psalm 63:2-9': {
      stanzas: [['Эзэн, Та бол миний Бурхан.']],
      psalmPrayer: undefined,
      psalmPrayerPage: undefined,
    },
    // F-X2 Phase 1 (#219) anchor — Psalm 92:2-9 catalog default = 280
    // (W2-SAT-Lauds, the first occurrence). The W4 occurrence carries
    // its own `psalmPrayerPage: 506` on the week-4.json entry which the
    // resolver's nullish-coalesce should prefer.
    'Psalm 92:2-9': {
      stanzas: [['ЭЗЭНд талархлыг өргөх нь сайн.']],
      psalmPrayer: 'Эзэн минь, Та ичгүүрийг минь биднээс…',
      psalmPrayerPage: 280,
    },
    // F-X2 Phase 2 (#224) anchor — Psalm 51:3-19 catalog default = 144
    // (W1-FRI-Lauds). W2/W3/W4 occurrences carry per-occurrence overrides
    // (265/377/490) on their week-N.json entries.
    'Psalm 51:3-19': {
      stanzas: [['Тэнгэрбурхан минь, намайг нигүүлсээч.']],
      psalmPrayer: 'Эцэг минь, биднийг аварч…',
      psalmPrayerPage: 144,
    },
    // F-X2 Phase 2 (#224) anchor — Psalm 110:1-5, 7 catalog default = 69
    // (W1-SUN-Vespers). W3/W4 occurrences carry overrides (305/416).
    'Psalm 110:1-5, 7': {
      stanzas: [['ЭЗЭН миний Эзэнд "Миний баруун гарт залрагтун" гэв.']],
      psalmPrayer: '"Эцэг минь, амар амгалан ба ялалтыг бидэнд хайрлаж…',
      psalmPrayerPage: 69,
    },
    // F-X2 Phase 2 (#224) — Bible-fallback path anchor (review I-1).
    // `stanzas` is empty so resolvePsalm enters the Bible-fallback branch
    // (line 109-125) where the same nullish-coalesce semantics must hold.
    'Psalm 200:1-3': {
      stanzas: [],
      psalmPrayer: 'Synthetic prayer for fallback path test.',
      psalmPrayerPage: 999, // catalog default
    },
  }),
}))

vi.mock('../../../prayers/rich-overlay', () => ({
  loadPsalterTextRich: () => null,
  loadPsalterTextPsalmPrayerRich: () => null,
  loadPsalterHeaderRich: () => null,
}))

vi.mock('../../../bible-loader', () => ({
  // Bible-fallback path returns a single synthetic verse so allVerses.length > 0
  // and the resolver reaches the second return site (line 109).
  // parseScriptureRef normalizes the book name to lowercase ('Psalm' → 'psalm').
  lookupRef: (ref: { book: string; chapter: number }) =>
    ref.book === 'psalm' && ref.chapter === 200
      ? { texts: [{ verse: 1, text: 'Synthetic verse for fallback test.' }] }
      : null,
}))

import { resolvePsalm } from '../psalm'

const baseEntry: PsalmEntry = {
  type: 'psalm',
  ref: 'Psalm 63:2-9',
  antiphon_key: 'w3-thu-vespers-ps2',
  default_antiphon: 'Эзэн бол миний хүч бөгөөд миний аврал.',
  gloria_patri: true,
}

describe('resolvePsalm — seasonal antiphon selection chain', () => {
  it('falls back to default_antiphon + append-Alleluia during Easter when no variant/override', async () => {
    const result = await resolvePsalm(
      baseEntry,
      undefined,
      'EASTER',
      '2026-04-23',
      'THU',
      3,
    )
    expect(result.antiphon).toBe(
      'Эзэн бол миний хүч бөгөөд миний аврал. Аллэлуяа!',
    )
  })

  it('prefers PDF seasonal_antiphons.easter over default and SKIPS append-Alleluia', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан Эзэн бидний хүч. Аллэлуяа!' },
    }
    const result = await resolvePsalm(entry, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(result.antiphon).toBe('Амилсан Эзэн бидний хүч. Аллэлуяа!')
  })

  it('per-Sunday easterSunday[week] wins over easter season-general on matching SUN+week', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн. Аллэлуяа!',
        easterSunday: { 3: '3 дахь Ням гарагийн Pascha. Аллэлуяа!' },
      },
    }
    const result = await resolvePsalm(entry, undefined, 'EASTER', '2026-04-19', 'SUN', 3)
    expect(result.antiphon).toBe('3 дахь Ням гарагийн Pascha. Аллэлуяа!')
  })

  it('overrides outrank seasonal_antiphons (sanctoral/seasonal propers win)', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'PDF variant. Аллэлуяа!',
        easterSunday: { 3: 'Per-Sunday. Аллэлуяа!' },
      },
    }
    const overrides = { 'w3-thu-vespers-ps2': 'Sanctoral override antiphon' }
    const result = await resolvePsalm(entry, overrides, 'EASTER', '2026-04-19', 'SUN', 3)
    expect(result.antiphon).toBe('Sanctoral override antiphon. Аллэлуяа!')
  })

  it('applies adventDec17_23 variant only within the date window', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        advent: 'Жирийн Ирэлтийн variant.',
        adventDec17_23: 'О Мэргэн ухаан, биднийг удирд.',
      },
    }
    // Inside 12/17-23 → date-specific wins over season general
    const inside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-20', 'SAT', 3)
    expect(inside.antiphon).toBe('О Мэргэн ухаан, биднийг удирд.')
    // Outside window → season general 'advent' fires
    const outside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-10', 'WED', 2)
    expect(outside.antiphon).toBe('Жирийн Ирэлтийн variant.')
  })

  it('adventDec24 triggers on 12/24 only', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        adventDec17_23: 'О Мэргэн ухаан.',
        adventDec24: 'Өнөөдөр Эзэний ирэлтийн босгон дээр.',
      },
    }
    const dec24 = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-24', 'WED', 4)
    expect(dec24.antiphon).toBe('Өнөөдөр Эзэний ирэлтийн босгон дээр.')
    const dec23 = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-23', 'TUE', 4)
    expect(dec23.antiphon).toBe('О Мэргэн ухаан.')
  })

  it('per-Sunday lentSunday[week] picked on LENT Sunday; weekday falls through to default', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        lentSunday: { 1: '1 дэх Ням гарагийн Lent онцгой.' },
      },
    }
    const sun = await resolvePsalm(entry, undefined, 'LENT', '2026-02-22', 'SUN', 1)
    expect(sun.antiphon).toBe('1 дэх Ням гарагийн Lent онцгой.')
    // Weekday in LENT — no season-wide marker → default passes through (no append, LENT doesn't add Alleluia)
    const wed = await resolvePsalm(entry, undefined, 'LENT', '2026-03-04', 'WED', 1)
    expect(wed.antiphon).toBe(baseEntry.default_antiphon)
  })

  it('does not consult seasonal_antiphons for ORDINARY_TIME even when present', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан... Аллэлуяа!' },
    }
    const result = await resolvePsalm(entry, undefined, 'ORDINARY_TIME', '2026-06-15', 'MON', 11)
    expect(result.antiphon).toBe(baseEntry.default_antiphon)
  })

  // @fr FR-155 Phase 3
  it('Passion Sunday (LENT SUN week 5) picks lentPassionSunday over lentSunday[5]', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        lentSunday: { 5: 'Lent 5th generic.' },
        lentPassionSunday: 'Христ жанчигдаж, гутаан доромжлогдсон.',
      },
    }
    // Passion Sunday 2026-03-29 (Lent week 5)
    const passion = await resolvePsalm(entry, undefined, 'LENT', '2026-03-29', 'SUN', 5)
    expect(passion.antiphon).toBe('Христ жанчигдаж, гутаан доромжлогдсон.')
  })

  // @fr FR-155 Phase 3
  it('easterAlt fallback fires only when easter is absent/empty', async () => {
    // easter absent → easterAlt chosen, append-Alleluia SKIPPED (PDF variant)
    const altOnly: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easterAlt: 'Үхлээс амилсан Христ. Аллэлуяа!' },
    }
    const r1 = await resolvePsalm(altOnly, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(r1.antiphon).toBe('Үхлээс амилсан Христ. Аллэлуяа!')
    // easter present → easterAlt ignored
    const bothPresent: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Primary. Аллэлуяа!',
        easterAlt: 'Alternate.',
      },
    }
    const r2 = await resolvePsalm(bothPresent, undefined, 'EASTER', '2026-04-23', 'THU', 3)
    expect(r2.antiphon).toBe('Primary. Аллэлуяа!')
  })
})

// @fr FR-NEW (F-X2 Phase 1) — task #219
// Lean Option A: occurrence-specific psalmPrayerPage override on the
// PsalmEntry (week-N.json) wins over the catalog default
// (psalter-texts.json). Backward-compat: entries without override use
// the catalog page unchanged.
describe('resolvePsalm — F-X2 Phase 1 psalmPrayerPage occurrence override', () => {
  // @fr FR-NEW (F-X2 Phase 1)
  it('W4-SAT-Lauds Psalm 92:2-9 override picks page 506 over catalog default 280', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'w4-sat-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 505,
      psalmPrayerPage: 506, // ← week-4.json occurrence override
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(506)
  })

  // @fr FR-NEW (F-X2 Phase 1)
  it('W2-SAT-Lauds Psalm 92:2-9 (no override) keeps catalog default 280 — regression guard', async () => {
    // W2 entry has no `psalmPrayerPage` — resolver must fall back to
    // psalter-texts.json default. Guards against accidentally
    // promoting the W4 override to a global default.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'w2-sat-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 279,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(280)
  })

  // @fr FR-NEW (F-X2 Phase 1)
  it('PsalmEntry without override leaves resolver using catalog default (backward-compat)', async () => {
    // Generic backward-compat anchor — any pre-pilot PsalmEntry that
    // does not declare psalmPrayerPage continues to surface the
    // psalter-texts catalog page exactly as before.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 92:2-9',
      antiphon_key: 'any-other-key',
      default_antiphon: '',
      gloria_patri: true,
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(280)
  })
})

// @fr FR-NEW (F-X2 Phase 2) — task #224
// Phase 2 batch lands per-occurrence `psalmPrayerPage` overrides on 12 PsalmEntry
// across 9 multi-occurrence keys (week-{2,3,4}.json). Anchors below pin a sample
// of the new occurrences so a future regression that drops the override or wires
// the resolver to ignore it surfaces immediately. They also extend the Phase 1
// review I-1 follow-up by adding a Bible-fallback-path anchor (resolver line 109).
describe('resolvePsalm — F-X2 Phase 2 multi-occurrence overrides', () => {
  // @fr FR-NEW (F-X2 Phase 2)
  it('W4-FRI-Lauds Psalm 51:3-19 override picks page 490 over catalog default 144', async () => {
    // Audit estimate was 489 (psalm body 488 +1); PDF-verified 490 (+2).
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 51:3-19',
      antiphon_key: 'w4-fri-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 488,
      psalmPrayerPage: 490, // ← week-4.json occurrence override (PDF-verified)
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(490)
  })

  // @fr FR-NEW (F-X2 Phase 2)
  it('W3-SUN-Vespers Psalm 110:1-5, 7 override picks page 305 over catalog default 69', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w3-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 304,
      psalmPrayerPage: 305, // ← week-3.json occurrence override
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(305)
  })

  // @fr FR-NEW (F-X2 Phase 2)
  it('W1-SUN-Vespers Psalm 110:1-5, 7 (no override) keeps catalog default 69', async () => {
    // The catalog ref's "first occurrence" (W1) intentionally keeps no override —
    // both the W1 entry and the catalog default agree on 69. Guards against a
    // future migration accidentally promoting a later-week override into W1.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 110:1-5, 7',
      antiphon_key: 'w1-sun-vesp-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 68,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.psalmPrayerPage).toBe(69)
  })

  // @fr FR-NEW (F-X2 Phase 2) — review I-1 follow-up
  it('Bible-fallback path also honors per-occurrence psalmPrayerPage override', async () => {
    // When psalter-texts.json has the ref but stanzas[] is empty, resolvePsalm
    // skips the PDF-stanza branch and falls through to the Bible-fallback
    // return site (psalm.ts:109-125). The same nullish-coalesce on
    // `entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage` must hold there.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-anchor-key',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      psalmPrayerPage: 1234, // override should win
    }
    const result = await resolvePsalm(entry, undefined)
    // verses[] populated from bible-loader mock → confirms fallback branch ran
    expect(result.verses?.length).toBeGreaterThan(0)
    expect(result.psalmPrayerPage).toBe(1234)
  })

  // @fr FR-NEW (F-X2 Phase 2) — review I-1 follow-up
  it('Bible-fallback path without override falls back to catalog page', async () => {
    // No `psalmPrayerPage` on the entry → resolver must surface the catalog
    // default (999) via the fallback site too. Pairs with the previous test
    // to confirm both branches of the ?? operator at psalm.ts:122.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 200:1-3',
      antiphon_key: 'fallback-anchor-key',
      default_antiphon: '',
      gloria_patri: true,
      page: 9999,
      // intentionally no psalmPrayerPage
    }
    const result = await resolvePsalm(entry, undefined)
    expect(result.verses?.length).toBeGreaterThan(0)
    expect(result.psalmPrayerPage).toBe(999)
  })
})
