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

    // Psalm 63:2-9 section has multiple (х. 58) markers now — one on the
    // psalm reference header plus one on each surrounding antiphon (FR-017g).
    // Assert visibility of at least the first.
    const psalmSection = page.locator('section', { has: page.getByText('Psalm 63:2-9') })
    await expect(psalmSection.getByText(/\(х\.\s*58\)/).first()).toBeVisible()
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

  // FR-017a/b/c/d coverage: each new annotation source surfaces in UI.
  test.describe('expanded coverage', () => {
    test('hymn section shows page reference', async ({ page }) => {
      // Sunday Lauds hymn — populated from hymns.json after FR-017d.
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')
      const hymnSection = page.locator('section[aria-label="Магтуу"]').first()
      await expect(hymnSection.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })

    test('weekday lauds intercessions show page (psalter parallel-key path)', async ({ page }) => {
      // 2026-02-09 = Monday week 1 OT — psalter cycle (no season override).
      await presetPageRefs(page, true)
      await page.goto('/pray/2026-02-09/lauds')
      await page.waitForSelector('article')
      const interSection = page.locator('section[aria-label="Гүйлтын залбирал"]').first()
      await expect(interSection.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })

    test('Advent Sunday responsory shows page (season propers path)', async ({ page }) => {
      // 2026-11-29 = First Sunday of Advent 2026.
      await presetPageRefs(page, true)
      await page.goto('/pray/2026-11-29/lauds')
      await page.waitForSelector('article')
      const respSection = page.locator('section[aria-label="Хариу залбирал"]').first()
      await expect(respSection.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })

    test('vespers concluding prayer shows page', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(`/pray/${TEST_DATE}/vespers`)
      await page.waitForSelector('article')
      const prayerSection = page.locator('section[aria-label="Төгсгөлийн даатгал залбирал"]').first()
      await expect(prayerSection.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })

    test('compline hymn shows page', async ({ page }) => {
      // Daytime hours (terce/sext/none) are disabled in routing; use compline
      // as the second non-Lauds hour to verify the hymn page path.
      await presetPageRefs(page, true)
      await page.goto(`/pray/${TEST_DATE}/compline`)
      await page.waitForSelector('article')
      const hymnSection = page.locator('section[aria-label="Магтуу"]').first()
      await expect(hymnSection.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })
  })

  // FR-017g: antiphon page markers at end of antiphon text.
  test.describe('antiphon page references', () => {
    test('psalm antiphon shows page at end of text', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')
      // AntiphonBox sets data-role="antiphon"; first one is the opening antiphon
      // for the first psalm of Lauds (Psalm 63:2-9, page 58).
      const antiphon = page.locator('[data-role="antiphon"]').first()
      await expect(antiphon).toBeVisible()
      await expect(antiphon.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
    })

    test('gospel canticle antiphon shows page', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')
      const canticleSection = page.locator('section[aria-label="Захариагийн магтаал"]').first()
      // Both the section header and the antiphon carry a page; assert at least
      // one antiphon-role element inside shows the marker.
      await expect(canticleSection.locator('[data-role="antiphon"]').first()).toContainText(/\(х\.\s*\d+\)/)
    })

    test('invitatory antiphon shows page', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')
      // Expand invitatory if collapsed so antiphon is visible in DOM layout.
      const toggle = page.getByRole('button', { name: /Урих дуудлага дэлгэх/ })
      if (await toggle.isVisible()) await toggle.click()
      const invSection = page.locator('section[aria-label="Урих дуудлага"]').first()
      await expect(invSection.locator('[data-role="antiphon"]').first()).toContainText(/\(х\.\s*\d+\)/)
    })
  })
})
