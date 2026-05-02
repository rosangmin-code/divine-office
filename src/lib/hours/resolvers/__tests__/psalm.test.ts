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
  }),
}))

vi.mock('../../../prayers/rich-overlay', () => ({
  loadPsalterTextRich: () => null,
  loadPsalterTextPsalmPrayerRich: () => null,
  loadPsalterHeaderRich: () => null,
}))

vi.mock('../../../bible-loader', () => ({
  lookupRef: () => null,
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
