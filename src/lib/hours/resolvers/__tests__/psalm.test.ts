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
  }),
}))

vi.mock('../../../prayers/rich-overlay', () => ({
  loadPsalterTextRich: () => null,
  loadPsalterTextPsalmPrayerRich: () => null,
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
})
