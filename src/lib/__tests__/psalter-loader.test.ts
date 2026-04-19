import { describe, it, expect } from 'vitest'
import { getPsalterCommons } from '../psalter-loader'

describe('getPsalterCommons — page propagation', () => {
  it('exposes shortReading.page when set in psalter JSON', () => {
    // Week 1 SUN lauds: shortReading.page is 65 (verified hand-annotation)
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(commons?.shortReading?.page).toBe(65)
  })

  it('exposes responsory.page when set', () => {
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(commons?.responsory?.page).toBe(66)
  })

  it('exposes intercessionsPage parallel key when present', () => {
    // Week 1 SUN lauds: intercessionsPage was injected by extract-psalter-pages.js
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(typeof commons?.intercessionsPage).toBe('number')
  })

  it('returns null for compline (separate cycle)', () => {
    expect(getPsalterCommons(1, 'SUN', 'compline')).toBeNull()
  })

  it('week 3 SUN lauds matches page-mapping.json reference', () => {
    // Cross-check that hand-annotated values still match (regression guard).
    const commons = getPsalterCommons(3, 'SUN', 'lauds')
    expect(commons?.shortReading?.page).toBe(302)
    expect(commons?.responsory?.page).toBe(303)
  })
})

// FR-017h: AssembledPsalm carries psalmPrayerPage from psalter-texts.json.
import { resolvePsalm } from '../hours/shared'
import type { PsalmEntry } from '../types'

describe('resolvePsalm — psalmPrayerPage propagation', () => {
  it('exposes psalmPrayerPage when present in psalter-texts.json', async () => {
    // Psalm 63:2-9 (Sunday Lauds psalm 1) has psalmPrayer + psalmPrayerPage
    // populated by scripts/extract-psalm-prayer-pages.js.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 63:2-9',
      antiphon_key: 'w1-sun-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
      page: 58,
    }
    const result = await resolvePsalm(entry, {})
    expect(result.psalmPrayer).toBeTruthy()
    expect(typeof result.psalmPrayerPage).toBe('number')
  })
})
