import { test, expect } from '@playwright/test'

/**
 * NFR-009k — hymn (магтуу) contamination render guard (GOAL #32 / WI #34).
 *
 * The 2026-05-25 lauds bug: the Ordinary-Time rotation selected catalog hymn
 * #3, whose body was contaminated (Adeste-fideles #82 page-938 tail + #83
 * page-939 "Бүх Монгол" Mongolia tail) instead of its real lyric
 * "Ааваа миний Ааваа". WI #34 re-extracted bodies from full_pdf.txt.
 *
 * Date anchor: the OT hymn rotation is `((weekOfSeason - 1) * 7 + dayIndex)
 * mod candidates` (propers-loader `computeRotationIndex`, 26 lauds
 * candidates; #3 sits at index 1). Before P0-1 the OT `weekOfSeason` was a
 * season counter that restarted at 1 after Pentecost, so 2026-05-25 (Mon)
 * hit index (1-1)*7+1 = 1. P0-1 made OT `weekOfSeason` the liturgical week
 * (2026-05-25 = OT week 8 → index 50 mod 26 = 24, hymn #110). 2026-05-28
 * (Thu, OT week 8) now lands on index (8-1)*7+4 = 53 mod 26 = 1 → hymn #3,
 * so it is the equivalent anchor; the contamination guard is unchanged.
 *
 * This spec renders the actual user-facing page and asserts the магтуу
 * section shows the correct hymn with no foreign content mixed in.
 */
test.describe('Hymn (магтуу) contamination — render', () => {
  // @fr NFR-009k
  test('2026-05-28 lauds магтуу = real hymn #3 "Ааваа миний Ааваа", no foreign content', async ({ page }) => {
    await page.goto('/pray/2026-05-28/lauds')
    const hymn = page.locator('[aria-label="Магтуу"]')
    await expect(hymn).toBeVisible()
    const text = (await hymn.innerText()).replace(/\s+/g, ' ')
    // correct hymn #3 lyric present
    expect(text).toContain('Ааваа миний Ааваа')
    expect(text).toContain('Би Танд хайртай Би талархана')
    // foreign content that used to bleed in must be ABSENT
    expect(text).not.toContain('Махбод дотор')                 // #82 Adeste-fideles tail
    expect(text).not.toContain('Бүх Монгол зөвхөн Таныг')      // #83 Mongolia tail
    expect(text).not.toContain('Туйлын ядуугаар')              // #82 stanza 4
  })

  // @fr NFR-009k
  test('lauds магтуу API body for 2026-05-28 carries the corrected hymn', async ({ request }) => {
    const res = await request.get('/api/loth/2026-05-28/lauds')
    expect(res.ok()).toBeTruthy()
    const body = JSON.stringify(await res.json())
    expect(body).toContain('Ааваа миний Ааваа')
    expect(body).not.toContain('Бүх Монгол зөвхөн Таныг')
  })
})
