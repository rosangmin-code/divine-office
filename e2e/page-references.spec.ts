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
      const interSection = page.locator('section[aria-label="Гуйлтын залбирал"]').first()
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

  // FR-017h: psalm-concluding prayer (Дууллыг төгсгөх залбирал) page marker.
  test('psalm-concluding prayer heading shows page reference', async ({ page }) => {
    await presetPageRefs(page, true)
    await page.goto(LAUDS_URL)
    await page.waitForSelector('article')
    const prayerBlock = page.locator('[data-role="psalm-prayer"]').first()
    await expect(prayerBlock).toBeVisible()
    await expect(prayerBlock.getByText(/\(х\.\s*\d+\)/)).toBeVisible()
  })

  // FR-017i: PageRef links into the in-app PDF viewer at /pdf/{bookPage}.
  test.describe('PDF viewer link', () => {
    test('page reference is an internal link pointing at /pdf/{bookPage}', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')

      const firstLink = page.locator('[data-role="page-ref-link"]').first()
      await expect(firstLink).toBeVisible()
      // Internal navigation — no new tab.
      await expect(firstLink).not.toHaveAttribute('target', '_blank')
      const href = await firstLink.getAttribute('href')
      expect(href).toMatch(/^\/pdf\/\d+$/)
    })

    test('Psalm 63:2-9 link points at /pdf/58', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')

      const link = page.locator('[data-role="page-ref-link"]', { hasText: /\(х\.\s*58\)/ }).first()
      await expect(link).toHaveAttribute('href', '/pdf/58')
    })

    test('no page-ref link rendered when showPageRefs is disabled', async ({ page }) => {
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')
      await expect(page.locator('[data-role="page-ref-link"]')).toHaveCount(0)
    })

    test('clicking a page reference opens the in-app viewer and renders the PDF canvas', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')

      const link = page.locator('[data-role="page-ref-link"]', { hasText: /\(х\.\s*58\)/ }).first()
      await link.click()

      await expect(page).toHaveURL(/\/pdf\/58$/)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await expect(canvas).toBeVisible({ timeout: 15_000 })
      await expect(canvas).toHaveAttribute('data-book-page', '58')
      await expect(page.getByRole('button', { name: /Буцах/ })).toBeVisible()
    })

    test('Буцах button returns to the prayer page', async ({ page }) => {
      await presetPageRefs(page, true)
      await page.goto(LAUDS_URL)
      await page.waitForSelector('article')

      const link = page.locator('[data-role="page-ref-link"]', { hasText: /\(х\.\s*58\)/ }).first()
      await link.click()
      await expect(page).toHaveURL(/\/pdf\/58$/)

      await page.getByRole('button', { name: /Буцах/ }).click()
      await expect(page).toHaveURL(new RegExp(LAUDS_URL.replace(/\//g, '\\/') + '$'))
    })
  })

  // FR-017j: PDF viewer UX rewrite — fit-to-width canvas, swipe + keyboard
  // navigation, floating Буцах, page indicator with aria-live.
  // @fr FR-017j
  test.describe('PDF viewer UX (FR-017j)', () => {
    async function gotoViewer(page: Page, bookPage: number): Promise<void> {
      await page.goto(`/pdf/${bookPage}`)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      // Canvas takes a few hundred ms to render; allow generous timeout for CI.
      await expect(canvas).toBeVisible({ timeout: 15_000 })
      await expect(canvas).toHaveAttribute('data-book-page', String(bookPage))
    }

    async function dispatchSwipe(
      page: Page,
      fromX: number,
      toX: number,
      y: number = 400,
    ): Promise<void> {
      const target = '[data-role="pdf-viewer-container"]'
      await page.dispatchEvent(target, 'pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: fromX,
        clientY: y,
      })
      await page.dispatchEvent(target, 'pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: toX,
        clientY: y,
      })
    }

    // @fr FR-017j
    test('swipe left advances bookPage by 1', async ({ page }) => {
      await gotoViewer(page, 58)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      // 300 → 100 = dx -200 (well past 60px threshold), starts past 16px deadzone.
      await dispatchSwipe(page, 300, 100)
      await expect(canvas).toHaveAttribute('data-book-page', '59')
    })

    // @fr FR-017j
    test('swipe right retreats bookPage by 1', async ({ page }) => {
      await gotoViewer(page, 58)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await dispatchSwipe(page, 100, 300)
      await expect(canvas).toHaveAttribute('data-book-page', '57')
    })

    // @fr FR-017j
    test('swipe left at MAX (969) is a no-op', async ({ page }) => {
      await gotoViewer(page, 969)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await dispatchSwipe(page, 300, 100)
      // 200ms wait > 100ms swipe debounce window, ensures any state update would
      // have settled by the time we assert no change.
      await page.waitForTimeout(200)
      await expect(canvas).toHaveAttribute('data-book-page', '969')
    })

    // @fr FR-017j
    test('swipe right at MIN (1) is a no-op', async ({ page }) => {
      await gotoViewer(page, 1)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await dispatchSwipe(page, 100, 300)
      await page.waitForTimeout(200)
      await expect(canvas).toHaveAttribute('data-book-page', '1')
    })

    // @fr FR-017j
    test('keyboard ArrowRight advances bookPage', async ({ page }) => {
      await gotoViewer(page, 58)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await page.keyboard.press('ArrowRight')
      await expect(canvas).toHaveAttribute('data-book-page', '59')
    })

    // @fr FR-017j
    test('keyboard ArrowLeft retreats bookPage', async ({ page }) => {
      await gotoViewer(page, 58)
      const canvas = page.locator('[data-role="pdf-canvas"]')
      await page.keyboard.press('ArrowLeft')
      await expect(canvas).toHaveAttribute('data-book-page', '57')
    })

    // @fr FR-017j
    test('canvas occupies the full frame width (fit-to-width)', async ({
      page,
    }) => {
      await gotoViewer(page, 58)
      // The canvas frame is constrained by `max-w-[480px]` so the canvas never
      // grows beyond a comfortable reading width on desktop. Fit-to-width
      // should match the frame's clientWidth within rounding tolerance.
      const frame = page.locator('[data-role="pdf-canvas-frame"]')
      const canvas = page.locator('[data-role="pdf-canvas"]')
      const frameBox = await frame.boundingBox()
      const canvasBox = await canvas.boundingBox()
      expect(frameBox).not.toBeNull()
      expect(canvasBox).not.toBeNull()
      expect(canvasBox!.width).toBeGreaterThanOrEqual(frameBox!.width - 4)
      expect(canvasBox!.width).toBeLessThanOrEqual(frameBox!.width + 1)
    })

    // @fr FR-017j
    test('aria-live page indicator updates when page changes', async ({
      page,
    }) => {
      await gotoViewer(page, 58)
      const indicator = page.locator('[data-role="pdf-page-indicator"]')
      await expect(indicator).toHaveAttribute('role', 'status')
      await expect(indicator).toHaveAttribute('aria-live', 'polite')
      await expect(indicator).toContainText('х. 58')
      await page.keyboard.press('ArrowRight')
      await expect(indicator).toContainText('х. 59')
    })
  })
})
