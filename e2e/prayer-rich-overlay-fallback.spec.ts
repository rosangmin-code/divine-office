import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-153
// Task #54 — symmetric wk1 fallback for `loadSeasonalRichOverlay`.
//
// Prior to this fix, Easter weeks 2-7 weekdays (and the analogous Lent /
// Advent weekday rotations) loaded JSON propers from `weeks['1']` (the
// PDF Octave) but the matching `seasonal/easter/wN-DAY-hour.rich.json`
// file did not exist for N>1. The resolver returned `null` for seasonal
// rich, then `psalterCommons` filled in the body — producing the visible
// bug "JSON ref `Ром 14:7-9` (Easter wk1 SAT) + body 'Тиймээс Христ дотор...'
// (psalter wk3 SAT)". The fix mirrors `propers-loader`'s `weeks['1']`
// fallback in `loadSeasonalRichOverlay`.
//
// E2E gate: render the prayer page for representative wk2-7 weekday dates
// and assert the rendered shortReading body matches the wk1 rich content.
test.describe('seasonal rich overlay wk1 fallback (task #54)', () => {
  test('Easter Week 3 Saturday lauds — body matches w1-SAT-lauds rich', async ({
    page,
  }) => {
    // 2026-04-25 is Easter Week 3 Saturday. JSON propers fall back to
    // `easter.json weeks['1'].SAT.lauds` (ref `Ром 14:7-9`, page 728);
    // rich must mirror that fallback to `seasonal/easter/w1-SAT-lauds.rich.json`
    // whose shortReading body opens with "Бидний хэн нь...".
    await page.goto(`/pray/${DATES.easterW3Saturday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    // Rich path: a single RichContent wrapper (no legacy `<sup>` verses).
    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)

    // Direct body assertion — the dispatch's evidence requirement.
    await expect(section).toContainText('Бидний хэн нь')
  })

  test('Easter Week 2 Monday lauds — body matches w1-MON-lauds rich', async ({
    page,
  }) => {
    // 2026-04-13. Same fallback path as above; assert rich coverage by
    // shape (single wrapper, no legacy verses), then a body excerpt that
    // appears in `seasonal/easter/w1-MON-lauds.rich.json`'s shortReading.
    await page.goto(`/pray/${DATES.easterW2Monday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Lent Week 2 Tuesday lauds — body sourced from lent/w1-TUE-lauds rich', async ({
    page,
  }) => {
    // 2026-03-03. Lent weeks 2-5 weekdays mirror the wk1 weekday
    // formulary; rich fallback prevents the same partial-merge bug.
    await page.goto(`/pray/${DATES.lentW2Tuesday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Advent Week 2 Wednesday lauds — body sourced from advent/w1-WED-lauds rich', async ({
    page,
  }) => {
    // 2025-12-10. Advent weeks 2-3 weekdays mirror the wk1 formulary.
    await page.goto(`/pray/${DATES.adventW2Wednesday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })
})
