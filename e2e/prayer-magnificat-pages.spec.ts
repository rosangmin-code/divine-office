import { test, expect, type Page } from '@playwright/test'
import { DATES } from './fixtures/dates'

// Task #11 regression guard.
//
// The Magnificat (Мариагийн магтаал) body is fixed content printed at
// book page 40 (src/data/loth/ordinarium/canticles.json → magnificat.page).
// The seasonal antiphon that precedes it varies per day — for Easter
// Week 2 Thursday Vespers the antiphon is printed at book page 722
// (easter.json → weeks.2.THU.vespers.gospelCanticleAntiphonPage).
//
// Before this fix the UI attached page 722 to the canticle heading,
// making it look as though the Magnificat body was at p722 (it isn't —
// p722 has only the reading, responsory, and the Easter antiphon).
// The correct rendering is:
//   Heading  "Мариагийн магтаал (х. 40)"   ← fixed body page
//   Antiphon "... (х. 722)"                ← daily seasonal antiphon page
//
// This test enables the page-ref setting, navigates to Easter W2 THU
// vespers, and asserts both pages are visible inside the canticle section
// and attached to the right sub-elements.

async function enablePageRefs(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('loth-settings', JSON.stringify({ showPageRefs: true }))
  })
}

// @fr FR-011 (propers/ordinarium split); task #11 regression guard.
test.describe('Magnificat page references (Easter W2 THU vespers)', () => {
  test.beforeEach(async ({ page }) => {
    await enablePageRefs(page)
    await page.goto(`/pray/${DATES.easterW2Thursday}/vespers`)
    await page.waitForSelector('article')
  })

  test('canticle section renders', async ({ page }) => {
    await expect(page.locator('[aria-label="Мариагийн магтаал"]')).toBeVisible()
  })

  test('heading links to fixed body page (х. 40), not antiphon page (х. 722)', async ({ page }) => {
    const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
    // Heading is the first <p> inside the section — pick the page-ref link
    // adjacent to the "Мариагийн магтаал" text specifically.
    const headingPageRef = canticle.locator('p').first().locator('[data-role="page-ref-link"]')
    await expect(headingPageRef).toBeVisible()
    await expect(headingPageRef).toHaveText(/х\.\s*40/)
    await expect(headingPageRef).not.toHaveText(/х\.\s*722/)
  })

  test('antiphon inside canticle section carries the daily propers page (х. 722)', async ({ page }) => {
    const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
    // AntiphonBox renders its own page-ref — find at least one with х. 722.
    const antiphonRefs = canticle
      .locator('[data-role="antiphon"]')
      .locator('[data-role="page-ref-link"]')
    await expect(antiphonRefs.first()).toBeVisible()
    // At least one antiphon page-ref must point to 722 (the seasonal page).
    await expect(
      canticle.locator('[data-role="antiphon"]').getByText(/х\.\s*722/).first(),
    ).toBeVisible()
  })
})
