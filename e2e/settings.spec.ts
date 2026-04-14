import { test, expect } from '@playwright/test'

const SETTINGS_URL = '/settings'

test.describe('Settings page', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('page renders with heading and all control groups', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await expect(page.getByRole('heading', { name: 'Тохиргоо' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Үсгийн хэмжээ' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Үсгийн хэлбэр' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Горим' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Хуудасны лавлагаа' })).toBeVisible()
  })

  test('has 5 font-size radios, 2 font-family radios, 3 theme radios, 1 switch', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await expect(page.getByRole('radio')).toHaveCount(10)
    await expect(page.getByRole('switch')).toHaveCount(1)
  })

  test('selecting font size updates <html> data-font-size and persists', async ({ page }) => {
    await page.goto(SETTINGS_URL)

    await page.getByRole('radio', { name: /Үсгийн хэмжээ XL/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')

    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"fontSize":"xl"')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')
    await expect(page.getByRole('radio', { name: /Үсгийн хэмжээ XL/ })).toHaveAttribute('aria-checked', 'true')
  })

  test('all 5 font sizes round-trip through data attribute', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const sizes: Array<{ label: string; value: string }> = [
      { label: 'XS', value: 'xs' },
      { label: 'S', value: 'sm' },
      { label: 'M', value: 'md' },
      { label: 'L', value: 'lg' },
      { label: 'XL', value: 'xl' },
    ]
    for (const { label, value } of sizes) {
      await page.getByRole('radio', { name: new RegExp(`Үсгийн хэмжээ ${label}`) }).click()
      await expect(page.locator('html')).toHaveAttribute('data-font-size', value)
    }
  })

  test('selecting Serif updates <html> data-font-family', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await page.getByRole('radio', { name: /Serif/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-font-family', 'serif')

    await page.getByRole('radio', { name: /Sans/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-font-family', 'sans')
  })

  test('theme switch: light removes dark class, dark adds it', async ({ page }) => {
    await page.goto(SETTINGS_URL)

    await page.getByRole('radio', { name: 'Харанхуй' }).click()
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

    await page.getByRole('radio', { name: 'Гэрэлтэй' }).click()
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)
  })

  test('page-refs switch syncs with pray page toggle', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const switchBtn = page.getByRole('switch', { name: /Хуудасны лавлагаа/ })
    await expect(switchBtn).toHaveAttribute('aria-checked', 'false')

    await switchBtn.click()
    await expect(switchBtn).toHaveAttribute('aria-checked', 'true')

    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"showPageRefs":true')
  })

  test('gear icon on home navigates to /settings', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Тохиргоо' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: 'Тохиргоо' })).toBeVisible()
  })

  test('font size change persists to pray page', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await page.getByRole('radio', { name: /Үсгийн хэмжээ XL/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')

    await page.goto('/pray/2026-02-08/lauds')
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')
  })
})
