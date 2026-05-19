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
    await expect(page.getByRole('heading', { name: 'Дууллыг төгсгөх залбирал' })).toBeVisible()
  })

  test('has 5 font-size radios, 2 font-family radios, 3 theme radios, 2 switches', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await expect(page.getByRole('radio')).toHaveCount(10)
    await expect(page.getByRole('switch')).toHaveCount(2)
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

  test('theme system option uses short label "Систем"', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await expect(page.getByRole('radio', { name: 'Систем' })).toBeVisible()
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

  test('psalm-prayer switch persists to localStorage and survives reload (FR-032)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const switchBtn = page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ })
    await expect(switchBtn).toHaveAttribute('aria-checked', 'false')

    await switchBtn.click()
    await expect(switchBtn).toHaveAttribute('aria-checked', 'true')

    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"psalmPrayerCollapsed":true')

    await page.reload()
    await expect(page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ })).toHaveAttribute('aria-checked', 'true')
  })

  test('psalm-prayer switch uses gold when enabled (FR-032)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const switchBtn = page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ })
    await switchBtn.click()
    await expect(switchBtn).toHaveClass(/liturgical-gold/)
  })

  // wi-004 (#16) moved Settings off the home header; wi-006 (#18)
  // reintroduced it as a footer control on the sticky home variant.
  // Rewritten to exercise the new footer entry point — scoped to
  // `[data-role="footer"][data-variant="home"]` so the SettingsLink
  // lookup is unambiguous after wi-004's header removal.
  test('footer settings link on home navigates to /settings (wi-006 / FR-163)', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('[data-role="footer"][data-variant="home"]')
    await expect(footer).toBeVisible()
    await footer.locator('[data-role="settings-link"]').click()
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

  test('back link navigates from /settings to home (FR-029)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const backLink = page.getByRole('link', { name: 'Нүүр хуудас' })
    await expect(backLink).toBeVisible()
    await backLink.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('active radio uses brass gold accent, not liturgical green (NFR-016)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    // Default fontSize is "md" → M button is active on load
    const mBtn = page.getByRole('radio', { name: 'Үсгийн хэмжээ M' })
    await expect(mBtn).toHaveAttribute('aria-checked', 'true')
    await expect(mBtn).toHaveClass(/liturgical-gold/)
    await expect(mBtn).not.toHaveClass(/liturgical-green/)
  })

  test('page-refs switch uses gold when enabled', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const switchBtn = page.getByRole('switch', { name: /Хуудасны лавлагаа/ })
    await switchBtn.click()
    await expect(switchBtn).toHaveClass(/liturgical-gold/)
  })

  test('font preview box is visible and replaces old Ave Maria text (FR-030)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const preview = page.getByTestId('font-preview')
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('Жишээ')
    await expect(preview).toContainText('Dominus tecum')
    // Old Latin-only preview sentence should be gone
    await expect(page.getByText(/Ave Maria, gratia plena/)).toHaveCount(0)
  })

  test('home header no longer renders a theme toggle (FR-028)', async ({ page }) => {
    await page.goto('/')
    // wi-004 (#16) removed SettingsLink from the home header; the
    // gear icon now lives in the footer (wi-006 / FR-163). We keep
    // the FR-028 ThemeToggle-absent assertion which is the original
    // intent of this test, and add a positive guard that SettingsLink
    // IS reachable via the footer to preserve the discoverability
    // invariant the original test was protecting.
    const footer = page.locator('[data-role="footer"][data-variant="home"]')
    await expect(footer.locator('[data-role="settings-link"]')).toBeVisible()
    // ThemeToggle (aria-label Харанхуй горим / Гэрэлтэй горим) should be removed
    await expect(page.getByRole('button', { name: /Харанхуй горим|Гэрэлтэй горим/ })).toHaveCount(0)
  })

  test('guide header no longer renders a theme toggle (FR-028)', async ({ page }) => {
    await page.goto('/guide')
    await expect(page.getByRole('button', { name: /Харанхуй горим|Гэрэлтэй горим/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Тохиргоо' })).toBeVisible()
  })
})
