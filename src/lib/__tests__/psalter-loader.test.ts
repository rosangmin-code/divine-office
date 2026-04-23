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
    // Book page 302 contains both the Reading (Езекиел 37:12б-14) and the
    // Responsory (Хариу залбирал — "Амьд Тэнгэрбурханы Хүү Христ минь..."),
    // verified against public/psalter.pdf via pdftotext (parsed_data/full_pdf.txt
    // lines 10303 "Уншлага" and 10316 "Хариу залбирал", both preceding the
    // book-page-303 marker on line 10331). The Intercessions ("Гуйлтын залбирал")
    // begin on the following book page 303 — exposed separately as
    // `intercessionsPage`, not via `responsory.page`.
    const commons = getPsalterCommons(3, 'SUN', 'lauds')
    expect(commons?.shortReading?.page).toBe(302)
    expect(commons?.responsory?.page).toBe(302)
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

describe('resolvePsalm — missing-text failure', () => {
  it('throws when neither stanzas nor Bible lookup yield any verses', async () => {
    // Reference an out-of-range psalm that exists in neither psalter-texts.json
    // nor the Bible JSONL. Previously this returned { verses: [] } silently and
    // the UI rendered a blank psalm; now we surface it so loth-service can
    // log it and emit a placeholder via Promise.allSettled.
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 999:1-5',
      antiphon_key: 'nonexistent',
      default_antiphon: 'test',
      gloria_patri: true,
    }
    await expect(resolvePsalm(entry, {})).rejects.toThrow(/no text resolved/)
  })

  it('still resolves normally for a valid reference', async () => {
    const entry: PsalmEntry = {
      type: 'psalm',
      ref: 'Psalm 63:2-9',
      antiphon_key: 'w1-sun-lauds-ps1',
      default_antiphon: '',
      gloria_patri: true,
    }
    const result = await resolvePsalm(entry, {})
    // Either stanzas (preferred) or verses must be non-empty.
    const hasContent = (result.stanzas?.length ?? 0) > 0 || result.verses.length > 0
    expect(hasContent).toBe(true)
  })
})
