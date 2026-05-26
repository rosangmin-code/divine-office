import { test, expect } from '@playwright/test'

/**
 * NFR-009k — hymn (магтуу) contamination render guard (GOAL #32 / WI #34).
 *
 * The 2026-05-25 lauds bug: the Ordinary-Time week-1 Monday rotation selects
 * catalog hymn #3, whose body was contaminated (Adeste-fideles #82 page-938
 * tail + #83 page-939 "Бүх Монгол" Mongolia tail) instead of its real lyric
 * "Ааваа миний Ааваа". WI #34 re-extracted bodies from full_pdf.txt.
 *
 * This spec renders the actual user-facing page and asserts the магтуу
 * section shows the correct hymn with no foreign content mixed in.
 */
test.describe('Hymn (магтуу) contamination — render', () => {
  // @fr NFR-009k
  test('2026-05-25 lauds магтуу = real hymn #3 "Ааваа миний Ааваа", no foreign content', async ({ page }) => {
    await page.goto('/pray/2026-05-25/lauds')
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
  test('lauds магтуу API body for 2026-05-25 carries the corrected hymn', async ({ request }) => {
    const res = await request.get('/api/loth/2026-05-25/lauds')
    expect(res.ok()).toBeTruthy()
    const body = JSON.stringify(await res.json())
    expect(body).toContain('Ааваа миний Ааваа')
    expect(body).not.toContain('Бүх Монгол зөвхөн Таныг')
  })
})
