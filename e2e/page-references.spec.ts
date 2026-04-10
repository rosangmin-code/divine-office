import { test, expect } from '@playwright/test'

// ordinarySunday (2026-02-08) maps to psalter week 1 Sunday,
// which has page annotations in the sample data.
const TEST_DATE = '2026-02-08'
const LAUDS_URL = `/pray/${TEST_DATE}/lauds`
const COMPLINE_URL = `/pray/${TEST_DATE}/compline`

test.describe('PDF page references', () => {
  test('page references are hidden by default', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    const pageRefs = page.getByText(/\(х\.\s*\d+\)/)
    await expect(pageRefs.first()).not.toBeVisible()
  })

  test('settings toggle button exists with correct accessibility', async ({ page }) => {
    await page.goto(LAUDS_URL)
    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('toggling ON shows page references', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    // Click settings toggle
    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await toggle.click()

    // Page references should appear
    const pageRef = page.getByText(/\(х\.\s*\d+\)/).first()
    await expect(pageRef).toBeVisible()
  })

  test('toggling OFF hides page references', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    // Toggle ON
    await toggle.click()
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()

    // Toggle OFF
    await toggle.click()
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).not.toBeVisible()
  })

  test('setting persists across page reload', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    // Toggle ON
    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await toggle.click()
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()

    // Reload page
    await page.reload()
    await page.waitForSelector('article')

    // Page refs should still be visible
    await expect(page.getByText(/\(х\.\s*\d+\)/).first()).toBeVisible()
  })

  test('page references appear on psalm blocks', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    // Toggle ON
    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await toggle.click()

    // Check that psalm reference "Psalm 63:2-9" has a page ref nearby
    const psalmSection = page.locator('section', { has: page.getByText('Psalm 63:2-9') })
    await expect(psalmSection.getByText(/\(х\.\s*58\)/)).toBeVisible()
  })

  test('page references appear on multiple section types', async ({ page }) => {
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')

    // Toggle ON
    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await toggle.click()

    // Multiple page refs should be visible
    const allPageRefs = page.getByText(/\(х\.\s*\d+\)/)
    const count = await allPageRefs.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('toggle button shows active state when ON', async ({ page }) => {
    await page.goto(LAUDS_URL)

    const toggle = page.getByRole('button', { name: /Хуудасны лавлагаа/ })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
