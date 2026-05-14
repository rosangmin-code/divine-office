import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-162
test.describe('Footer click-to-toggle visibility (FR-162)', () => {
  // The Footer is rendered on every public route — we exercise the homepage
  // because it is the cheapest mount path (no /pray data fetch required).
  // Behavioral contract is identical wherever <Footer /> is imported.
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
  })

  test('default state — toggle visible, credit lines hidden', async ({ page }) => {
    const toggle = page.locator('[data-role="footer-toggle"]')
    const content = page.locator('[data-role="footer-content"]')

    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Credit text is conditionally rendered — should NOT be in the DOM
    // when collapsed (not merely visually hidden).
    await expect(content).toHaveCount(0)
    await expect(page.getByText('Цагийн Залбирал — Монгол Католик Сүм')).toHaveCount(0)
  })

  test('first click reveals the footer content', async ({ page }) => {
    const toggle = page.locator('[data-role="footer-toggle"]')
    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const content = page.locator('[data-role="footer-content"]')
    await expect(content).toBeVisible()
    await expect(content).toContainText('Цагийн Залбирал — Монгол Католик Сүм')
    await expect(content).toContainText('Зарим орчуулга хийгдэж байна')
  })

  test('second click hides the footer content again', async ({ page }) => {
    const toggle = page.locator('[data-role="footer-toggle"]')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('[data-role="footer-content"]')).toHaveCount(0)
  })

  test('keyboard — Tab → Space toggles the footer', async ({ page }) => {
    const toggle = page.locator('[data-role="footer-toggle"]')

    // Move keyboard focus to the toggle (it is the last focusable element
    // before page end on most routes; assertion below tolerates any focus
    // path by jumping with locator.focus()).
    await toggle.focus()
    await expect(toggle).toBeFocused()

    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('aria-label swaps between Mongolian "show" / "hide" verbs', async ({ page }) => {
    const toggle = page.locator('[data-role="footer-toggle"]')

    await expect(toggle).toHaveAttribute('aria-label', 'Доод бичвэр харуулах')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-label', 'Доод бичвэр нуух')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-label', 'Доод бичвэр харуулах')
  })
})
