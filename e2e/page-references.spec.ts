import { test, expect, type Page } from '@playwright/test'

// ordinarySunday (2026-02-08) maps to psalter week 1 Sunday,
// which has page annotations in the sample data.
const TEST_DATE = '2026-02-08'
const LAUDS_URL = `/pray/${TEST_DATE}/lauds`
const SETTINGS_URL = '/settings'

async function presetPageRefs(page: Page, enabled: boolean) {
  // Only seed when storage is empty — so later in-app writes (e.g. switch click) are preserved
  // across subsequent navigations that re-run this init script.
  await page.addInitScript((value) => {
    if (!localStorage.getItem('loth-settings')) {
      localStorage.setItem('loth-settings', JSON.stringify({ showPageRefs: value }))
    }
  }, enabled)
}

test.describe('PDF page references', () => {
  test('page references are hidden by default', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    const pageRefs = page.getByText(/\(х\.\s*\d+\)/)
    await expect(pageRefs.first()).not.toBeVisible()
  })

  test('enabling via /settings shows page references on pray page', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await page.getByRole('switch', { name: /Хуудасны лавлагаа/ }).click()
    // Verify localStorage persisted before navigating away
    await expect
      .poll(async () => await page.evaluate(() => localStorage.getItem('loth-settings')))
      .toMatch(/"showPageRefs":true/)

    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()
  })

  test('disabling via /settings hides page references on pray page', async ({ page }) => {
    await presetPageRefs(page, true)
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()

    await page.goto(SETTINGS_URL)
    await page.getByRole('switch', { name: /Хуудасны лавлагаа/ }).click()
    await expect
      .poll(async () => await page.evaluate(() => localStorage.getItem('loth-settings')))
      .toMatch(/"showPageRefs":false/)

    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).not.toBeVisible()
  })

  test('setting persists across page reload', async ({ page }) => {
    await presetPageRefs(page, true)
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()

    await page.reload()
    await page.waitForSelector('article')
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()
  })

  test('page references appear on psalm blocks', async ({ page }) => {
    await presetPageRefs(page, true)
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    const psalmSection = page.locator('section', { has: page.getByText('Psalm 63:2-9') })
    await expect(psalmSection.getByText(/\(х\.\s*58\)/)).toBeVisible()
  })

  test('page references appear on multiple section types', async ({ page }) => {
    await presetPageRefs(page, true)
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    const allPageRefs = page.getByText(/\(х\.\s*\d+\)/)
    const count = await allPageRefs.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('pray page header no longer renders a page-refs toggle button', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    await expect(page.getByRole('button', { name: /Хуудасны лавлагаа/ })).toHaveCount(0)
  })
})
