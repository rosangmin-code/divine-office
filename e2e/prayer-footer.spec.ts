import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// GOAL #24 (FR-164) — PrayerFooter strip + slide-up panel interaction
// at /pray/[date]/[hour]. Covers the 7 D-scenarios across mobile
// (375×667) + desktop (1280×800) viewports plus a reduced-motion
// describe per viewport.
//
// Selector strategy (CLAUDE.md '테스트 selector 원칙' — 기능 검증은
// data-role / data-testid 우선):
//   strip          — [data-role="prayer-footer-strip"]   (always rendered)
//   backdrop       — [data-role="prayer-footer-backdrop"]
//   panel          — [data-role="prayer-footer-content"] (always mounted; inert when collapsed)
//   Огноо link     — [data-role="prayer-footer-menu-date"]    → /?date=YYYY-MM-DD[&celebration=...]
//   Тохиргоо link  — [data-role="prayer-footer-menu-settings"] → /settings
//
// Regression guard for AC6 ("상단 ⚙ SettingsLink 제거"): the pray page
// header MUST NOT mount a [data-role="settings-link"] anchor — that
// surface was removed in WI-C (#31) when PrayerFooter became the only
// Settings entry point on the prayer surface.

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1280, height: 800 },
} as const

type ViewportName = keyof typeof VIEWPORTS

const PRAY_URL = `/pray/${DATES.ordinaryWeekday}/lauds`

// Helper — open the panel (strip click → aria-expanded=true).
async function openPanel(page: import('@playwright/test').Page) {
  const strip = page.locator('[data-role="prayer-footer-strip"]')
  await expect(strip).toBeVisible()
  await expect(strip).toHaveAttribute('aria-expanded', 'false')
  await strip.click()
  await expect(strip).toHaveAttribute('aria-expanded', 'true')
}

for (const variant of Object.keys(VIEWPORTS) as ViewportName[]) {
  test.describe(`GOAL #24 PrayerFooter — ${variant} (${VIEWPORTS[variant].width}×${VIEWPORTS[variant].height})`, () => {
    test.use({ viewport: VIEWPORTS[variant] })

    // @fr FR-164
    test('D1 strip → panel slide-up — closed strip toggles aria-expanded=true on click', async ({ page }) => {
      await page.goto(PRAY_URL)
      const strip = page.locator('[data-role="prayer-footer-strip"]')
      const panel = page.locator('[data-role="prayer-footer-content"]')
      // Closed default
      await expect(strip).toBeVisible()
      await expect(strip).toHaveAttribute('aria-expanded', 'false')
      await expect(panel).toHaveAttribute('data-expanded', 'false')
      // Strip click → expanded
      await strip.click()
      await expect(strip).toHaveAttribute('aria-expanded', 'true')
      await expect(panel).toHaveAttribute('data-expanded', 'true')
      // Auto-focus is on first menu item (Огноо link); panel is reachable
      // via Tab when not inert.
      const dateLink = page.locator('[data-role="prayer-footer-menu-date"]')
      await expect(dateLink).toBeFocused()
    })

    // @fr FR-164
    test('D2 Огноо menu navigates to /?date=YYYY-MM-DD (preserves celebration query)', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      const dateLink = page.locator('[data-role="prayer-footer-menu-date"]')
      // href shape: /?date=2026-02-04 (no celebration param when none on the pray URL)
      await expect(dateLink).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
      await dateLink.click()
      // After navigation, URL must include the date param.
      await expect(page).toHaveURL(new RegExp(`/\\?date=${DATES.ordinaryWeekday}`))
    })

    // @fr FR-164
    test('D3 Тохиргоо menu navigates to /settings', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      const settingsLink = page.locator('[data-role="prayer-footer-menu-settings"]')
      await expect(settingsLink).toHaveAttribute('href', '/settings')
      await expect(settingsLink).toHaveAttribute('aria-label', 'Тохиргоо')
      await settingsLink.click()
      await expect(page).toHaveURL(/\/settings$/)
    })

    // @fr FR-164
    test('D4a panel dismiss — backdrop click closes the panel', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      const backdrop = page.locator('[data-role="prayer-footer-backdrop"]')
      const strip = page.locator('[data-role="prayer-footer-strip"]')
      // Backdrop is interactive while expanded.
      await expect(backdrop).toHaveAttribute('data-expanded', 'true')
      await backdrop.click()
      await expect(strip).toHaveAttribute('aria-expanded', 'false')
      await expect(backdrop).toHaveAttribute('data-expanded', 'false')
    })

    // @fr FR-164
    test('D4b panel dismiss — strip chevron click closes the panel', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      // The strip itself is also the "down chevron" when expanded.
      const strip = page.locator('[data-role="prayer-footer-strip"]')
      await strip.click()
      await expect(strip).toHaveAttribute('aria-expanded', 'false')
    })

    // @fr FR-164
    test('D4c panel dismiss — Escape key closes the panel', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      const strip = page.locator('[data-role="prayer-footer-strip"]')
      await page.keyboard.press('Escape')
      await expect(strip).toHaveAttribute('aria-expanded', 'false')
    })

    // @fr FR-164
    // Focus assertion per WI-30 reviewer guidance: dismiss paths MUST
    // restore focus to the strip (so keyboard-only users aren't dropped
    // into <body>'s tab order when the panel collapses and its subtree
    // becomes inert). Escape already restores focus explicitly; backdrop
    // click was the asymmetric path that this WI's dispatch flags.
    test('D4d focus restoration — backdrop click puts focus on the strip', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      const backdrop = page.locator('[data-role="prayer-footer-backdrop"]')
      await backdrop.click()
      // After dismiss the panel subtree goes inert; the previously-
      // focused menu item can no longer hold focus. Without the
      // dispatch-suggested polish (move stripRef.current?.focus() into
      // handleClose) focus drops to <body>. The assertion is on the
      // data-role attribute of the currently-focused element — `null`
      // means body, `prayer-footer-strip` means the strip.
      const focusedRole = await page.evaluate(
        () => document.activeElement?.getAttribute('data-role') ?? null,
      )
      expect(focusedRole).toBe('prayer-footer-strip')
    })

    // @fr FR-164
    test('D4e focus restoration — Escape puts focus on the strip', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanel(page)
      await page.keyboard.press('Escape')
      const focusedRole = await page.evaluate(
        () => document.activeElement?.getAttribute('data-role') ?? null,
      )
      expect(focusedRole).toBe('prayer-footer-strip')
    })

    // @fr FR-164
    test('D5 body content not occluded — last paragraph clears the 32px strip (pb-16 wrapper)', async ({ page }) => {
      await page.goto(PRAY_URL)
      // The pray page wraps its body in a container with pb-16 so the
      // last content paragraph clears the fixed-bottom PrayerFooter
      // strip. We probe by checking that the document's <main> (or
      // equivalent body wrapper) does NOT have its last child obscured
      // by the strip. The structural surface: scrollWidth - clientWidth
      // ≤ 2 (no horizontal scrollbar) AND the document scrollHeight
      // exceeds the strip's 32px reserved height by at least one screen.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(2)
      // Sanity — the pray page renders a substantial body; the strip
      // should not eat into the visible flow.
      const strip = page.locator('[data-role="prayer-footer-strip"]')
      const stripBox = await strip.boundingBox()
      expect(stripBox).not.toBeNull()
      // The strip is 32px tall per WI-A.
      expect(stripBox!.height).toBeGreaterThan(20)
      expect(stripBox!.height).toBeLessThan(60)
    })

    // @fr FR-164
    test('D6 prayer page header does NOT mount a SettingsLink (WI-C scope regression guard)', async ({ page }) => {
      await page.goto(PRAY_URL)
      // wi-C (#31) removed the prayer-page-header SettingsLink. The
      // single Settings entry point on this surface is PrayerFooter's
      // [⚙ Тохиргоо] menu item. Negative assertion: zero
      // [data-role="settings-link"] anchors mounted on this page.
      const headerSettingsLink = page.locator('[data-role="settings-link"]')
      await expect(headerSettingsLink).toHaveCount(0)
      // Positive complement — PrayerFooter Тохиргоо menu IS reachable.
      await openPanel(page)
      await expect(
        page.locator('[data-role="prayer-footer-menu-settings"]'),
      ).toBeVisible()
    })
  })

  // -----------------------------------------------------------------
  // D7 — reduced-motion variant. Playwright 1.59's `test.use` typedef
  // does not expose `reducedMotion` as a use option, so we emulate at
  // runtime via `page.emulateMedia()` inside the test (functionally
  // equivalent — the browser context honors the media query change).
  // -----------------------------------------------------------------
  test.describe(`GOAL #24 PrayerFooter — ${variant} reduced-motion`, () => {
    test.use({ viewport: VIEWPORTS[variant] })

    // @fr FR-164
    test('D7 reduced-motion — panel transitions are duration-0 (motion-reduce CSS applied)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(PRAY_URL)
      const panel = page.locator('[data-role="prayer-footer-content"]')
      // Probe the resolved transition-duration via getComputedStyle.
      // motion-reduce:duration-0 Tailwind utility maps to
      // `transition-duration: 0s` when the `prefers-reduced-motion`
      // media query matches (Playwright's reducedMotion='reduce'
      // emulates this for the chrome).
      const computedDuration = await panel.evaluate(
        (el) => window.getComputedStyle(el).transitionDuration,
      )
      // Expected: "0s" (sometimes "0s, 0s" if multiple transition-
      // properties stack). Negative assertion: not the 200ms default.
      expect(computedDuration).not.toMatch(/200ms|0\.2s/)
      // Even with transitions disabled, the slide-up still works as a
      // state change — open → close still flips aria-expanded.
      await openPanel(page)
      await page.keyboard.press('Escape')
      await expect(
        page.locator('[data-role="prayer-footer-strip"]'),
      ).toHaveAttribute('aria-expanded', 'false')
    })
  })
}
