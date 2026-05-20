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

  // WI-B (#46) replaced the fontSize 5-radio grid with a 3-button stepper
  // (Aa− / current indicator / Aa+), so font-size is no longer a 'radio'
  // role. Remaining radio surface = fontFamily (2) + theme (3) = 5.
  test('has 5 radios (font-family + theme), 1 font-size stepper, 2 switches (FR-165)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await expect(page.getByRole('radio')).toHaveCount(5)
    await expect(page.getByRole('switch')).toHaveCount(2)
    // Stepper presence — functional check via data-role (locale-independent
    // per CLAUDE.md "테스트 selector 원칙" — 기능 검증은 data-role).
    await expect(page.locator('[data-role="font-size-stepper"]')).toHaveCount(1)
    await expect(page.locator('[data-role="font-size-decrease"]')).toHaveCount(1)
    await expect(page.locator('[data-role="font-size-increase"]')).toHaveCount(1)
  })

  test('stepper Aa+ raises font size and persists (md → lg → xl) (FR-165)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    // Default is md; +1 = lg, +1 = xl.
    const increase = page.locator('[data-role="font-size-increase"]')
    await increase.click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'lg')
    await increase.click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')

    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"fontSize":"xl"')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl')
    await expect(page.getByTestId('font-size-current')).toHaveAttribute('data-font-size-value', 'xl')
  })

  test('all 6 font sizes round-trip via stepper (xs → xxl) (FR-165)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const decrease = page.locator('[data-role="font-size-decrease"]')
    const increase = page.locator('[data-role="font-size-increase"]')

    // From default md, ramp down 2 clicks to xs.
    await decrease.click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'sm')
    await decrease.click()
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xs')

    // Aa− is now disabled at the min clamp.
    await expect(decrease).toBeDisabled()

    // Ramp up 5 clicks: xs → sm → md → lg → xl → xxl.
    const expected = ['sm', 'md', 'lg', 'xl', 'xxl'] as const
    for (const value of expected) {
      await increase.click()
      await expect(page.locator('html')).toHaveAttribute('data-font-size', value)
    }

    // Aa+ is now disabled at the max clamp (xxl).
    await expect(increase).toBeDisabled()
  })

  test('stepper indicator shows current label + percentage (FR-165)', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    const indicator = page.getByTestId('font-size-current')
    // Default md = 100%.
    await expect(indicator).toContainText('100%')
    await expect(indicator).toHaveAttribute('data-font-size-value', 'md')

    // Step up to xxl → label XXL, 138% (round of 137.5).
    // Default md is index 2; xxl is index 5 → exactly 3 increments.
    const increase = page.locator('[data-role="font-size-increase"]')
    for (let i = 0; i < 3; i++) await increase.click()
    await expect(indicator).toContainText('XXL')
    await expect(indicator).toContainText('138%')
    await expect(indicator).toHaveAttribute('data-font-size-value', 'xxl')
    // At max clamp, Aa+ is now disabled.
    await expect(increase).toBeDisabled()
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
    // Use /?month=2026-08 (non-today) to skip the LiturgicalCalendarList
    // mount-once scrollIntoView({block:'center'}) — reviewer iter-1
    // flagged a ~25% click race on this shape, root cause identified as
    // hydration / auto-scroll interaction. Non-today month removes the
    // auto-scroll entirely; the explicit href + aria-label expects
    // below absorb any remaining hydration timing.
    await page.goto('/?month=2026-08')
    const footer = page.locator('[data-role="footer"][data-variant="home"]')
    await expect(footer).toBeVisible()
    const settingsLink = footer.locator('[data-role="settings-link"]')
    await expect(settingsLink).toBeVisible()
    await expect(settingsLink).toHaveAttribute('href', '/settings')
    await expect(settingsLink).toHaveAttribute('aria-label', 'Тохиргоо')
    await settingsLink.click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: 'Тохиргоо' })).toBeVisible()
  })

  test('font size change persists to pray page', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    // Stepper Aa+ from default md → lg → xl (2 clicks).
    const increase = page.locator('[data-role="font-size-increase"]')
    await increase.click()
    await increase.click()
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
    // FontSize is now a stepper indicator (WI-B #46) — the "active" surface
    // is the central indicator, which always carries ACTIVE_ACCENT. Verify
    // that surface uses the brass-gold accent (NFR-016 invariant).
    const indicator = page.getByTestId('font-size-current')
    await expect(indicator).toHaveClass(/liturgical-gold/)
    await expect(indicator).not.toHaveClass(/liturgical-green/)
    // Other control groups (font-family / theme) still use radios — keep
    // the original NFR-016 guard on at least one active radio surface.
    const sansRadio = page.getByRole('radio', { name: /Sans/ })
    await expect(sansRadio).toHaveAttribute('aria-checked', 'true')
    await expect(sansRadio).toHaveClass(/liturgical-gold/)
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
