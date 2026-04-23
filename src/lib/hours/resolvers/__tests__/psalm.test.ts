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
    const result = await resolvePsalm(baseEntry, undefined, 'EASTER', '2026-04-23')
    expect(result.antiphon).toBe(
      'Эзэн бол миний хүч бөгөөд миний аврал. Аллэлуяа!',
    )
  })

  it('prefers PDF seasonal_antiphons.easter over default during Easter and SKIPS append-Alleluia', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'Амилсан Эзэн бидний хүч. Аллэлуяа!',
      },
    }
    const result = await resolvePsalm(entry, undefined, 'EASTER', '2026-04-23')
    // PDF variant used verbatim — no double-Alleluia, no modification.
    expect(result.antiphon).toBe('Амилсан Эзэн бидний хүч. Аллэлуяа!')
  })

  it('overrides outrank seasonal_antiphons (sanctoral/seasonal propers win)', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        easter: 'PDF variant. Аллэлуяа!',
      },
    }
    const overrides = { 'w3-thu-vespers-ps2': 'Sanctoral override antiphon' }
    const result = await resolvePsalm(entry, overrides, 'EASTER', '2026-04-23')
    // Override wins; append-Alleluia still fires on the override (legacy behavior).
    expect(result.antiphon).toBe('Sanctoral override antiphon. Аллэлуяа!')
  })

  it('applies adventDec17_23 variant only within the date window', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: {
        adventDec17_23: 'О Мэргэн ухаан, биднийг удирд.',
      },
    }
    // Inside the Dec 17-23 window — variant used verbatim, no append.
    const inside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-20')
    expect(inside.antiphon).toBe('О Мэргэн ухаан, биднийг удирд.')

    // Outside the window — falls back to default_antiphon. ADVENT does not
    // trigger append-Alleluia (only EASTER does), so default passes through.
    const outside = await resolvePsalm(entry, undefined, 'ADVENT', '2025-12-10')
    expect(outside.antiphon).toBe(baseEntry.default_antiphon)
  })

  it('does not consult seasonal_antiphons for ORDINARY_TIME even when present', async () => {
    const entry: PsalmEntry = {
      ...baseEntry,
      seasonal_antiphons: { easter: 'Амилсан... Аллэлуяа!' },
    }
    const result = await resolvePsalm(entry, undefined, 'ORDINARY_TIME', '2026-06-15')
    expect(result.antiphon).toBe(baseEntry.default_antiphon)
  })
})
