import { test, expect, type Page } from '@playwright/test'

// GOAL #4 (FR-163) — Liturgical-calendar first screen month view.
// Covers the 7 dogfooding ACs (D1-D7) across mobile (375×667) +
// desktop (1280×800) viewports plus a 4-variant visual snapshot set
// (mobile/desktop × light/dark).
//
// Selector strategy (CLAUDE.md '테스트 selector 원칙' — 기능 검증은
// data-testid / data-role 우선, 몽골어 텍스트는 NFR-002 spelling
// regression 가드일 때만):
//   list rows       — [data-testid="calendar-row"][data-row-kind="date"]
//   today row       — [data-testid="calendar-row"][data-today="true"]
//   month-nav label — [data-testid="month-nav-label-text"]
//   month-nav prev  — [data-testid="month-nav-prev"]
//   month-nav next  — [data-testid="month-nav-next"]
//   footer (home)   — [data-role="footer"][data-variant="home"]
//   footer Өнөөдөр  — [data-role="footer-today"]
//   footer Тохиргоо — [data-role="footer-settings"] wrapper ↓ but
//                     SettingsLink itself renders [data-role="settings-link"]
//                     — we scope to footer to disambiguate from any other
//                     mount (though after wi-004 the home only has it in
//                     the footer).

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1280, height: 800 },
} as const

type ViewportName = keyof typeof VIEWPORTS

// `2026-12-15` is well inside romcal range and the surrounding 31-day
// December month is large enough that anchor / scroll-into-view is
// observable at both viewports. The 12-15 row also has hour-card links
// (LiturgicalCalendarList renders the body when the row is expanded —
// here we just assert the row + its toggle button are present).
const DEEP_LINK_DATE = '2026-12-15'
const DEEP_LINK_MONTH_LABEL = '2026 оны 12-р сар'

async function getDateRowCount(page: Page): Promise<number> {
  // Count `kind="date"` rows specifically — the synthetic today-anchor
  // row carries `data-row-kind="today-anchor"` and would otherwise
  // inflate the count by 1 when today is in the viewed month.
  return await page
    .locator('[data-testid="calendar-row"][data-row-kind="date"]')
    .count()
}

for (const variant of Object.keys(VIEWPORTS) as ViewportName[]) {
  test.describe(`GOAL #4 calendar-list month view — ${variant} (${VIEWPORTS[variant].width}×${VIEWPORTS[variant].height})`, () => {
    test.use({ viewport: VIEWPORTS[variant] })

    // @fr FR-163
    test('D1 month view — ?month=2026-05 renders exactly 31 date rows (May 31 days)', async ({ page }) => {
      await page.goto('/?month=2026-05')
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2026 оны 5-р сар',
      )
      const count = await getDateRowCount(page)
      // Tight equality: month-mode renders exactly 1 row per day,
      // never the legacy ±60-day window (~120 rows).
      expect(count).toBe(31)
    })

    // @fr FR-163
    test('D1 month view — ?month=2026-06 renders exactly 30 date rows (June 30 days)', async ({ page }) => {
      await page.goto('/?month=2026-06')
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2026 оны 6-р сар',
      )
      expect(await getDateRowCount(page)).toBe(30)
    })

    // @fr FR-163
    test('D1 month view — ?month=2025-02 renders exactly 28 date rows (common-year Feb)', async ({ page }) => {
      // Cross-month boundary + non-leap year — guards against off-by-one
      // (a leap-year miscalc would render 29; a ±60-day regression
      // would render 120+).
      await page.goto('/?month=2025-02')
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2025 оны 2-р сар',
      )
      expect(await getDateRowCount(page)).toBe(28)
    })

    // @fr FR-163
    test('D2 today auto-anchor — home `/` renders a row with data-today=true and scrolls it into view', async ({ page }) => {
      await page.goto('/')
      const todayRow = page.locator('[data-testid="calendar-row"][data-today="true"]')
      await expect(todayRow).toHaveCount(1)
      // scrollIntoView({block:'center'}) — exists in DOM AND is
      // intersecting the viewport (Playwright's `toBeInViewport`
      // checks the intersection ratio).
      await expect(todayRow).toBeInViewport({ ratio: 0.1 })
    })

    // @fr FR-163
    test('D3 MonthNav prev — click pushes /?month=YYYY-(MM-1) and updates label', async ({ page }) => {
      // Use 2026-08 (deliberately NOT today's month). When today's
      // month is rendered, the calendar-list mount-once auto-scroll
      // (scrollIntoView({block:'center'}) on the today row) pushes
      // MonthNav above the viewport on shorter mobile heights — the
      // Playwright auto-scroll-back can race the URL assertion. A
      // non-today month skips the auto-scroll entirely and isolates
      // this test to the prev-click → URL-push contract.
      await page.goto('/?month=2026-08')
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2026 оны 8-р сар',
      )
      const prevBtn = page.locator('[data-testid="month-nav-prev"]')
      await prevBtn.scrollIntoViewIfNeeded()
      await prevBtn.click()
      // URL push is the wi-004 wrapper contract; assert both URL +
      // re-rendered label text.
      await expect(page).toHaveURL(/\/\?month=2026-07$/)
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2026 оны 7-р сар',
      )
    })

    // @fr FR-163
    test('D3 MonthNav next — click pushes /?month=YYYY-(MM+1) and updates label across year boundary', async ({ page }) => {
      // Year boundary: Dec → Jan crosses to next year via shiftMonth's
      // (t%12+12)%12+1 idiom; assert URL push is correct.
      await page.goto('/?month=2026-12')
      await page.locator('[data-testid="month-nav-next"]').click()
      await expect(page).toHaveURL(/\/\?month=2027-01$/)
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        '2027 оны 1-р сар',
      )
    })

    // @fr FR-163
    test('D3 MonthNav present in header on every entry — picker button exists with native input', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('[data-testid="month-nav"]')).toBeVisible()
      // Hidden native input (opacity-0 + absolute) drives showPicker();
      // assert it exists as a focusable interaction surface — `toHaveCount(1)`
      // not `toBeVisible` because the input is intentionally hidden
      // visually (showPicker viewport-anchor trick documented in
      // src/components/month-nav.tsx).
      await expect(page.locator('[data-testid="month-nav-picker"]')).toHaveCount(1)
    })

    // @fr FR-163
    test('D4 footer Өнөөдөр — click from non-today month navigates back to /', async ({ page }) => {
      // Land on a month deliberately distant from today (2026-08 is past
      // today=2026-05-20 → guaranteed non-today).
      await page.goto('/?month=2026-08')
      await expect(page).toHaveURL(/\/\?month=2026-08$/)
      // Footer must be the home variant.
      await expect(
        page.locator('[data-role="footer"][data-variant="home"]'),
      ).toBeVisible()
      const todayBtn = page.locator('[data-role="footer-today"]')
      await expect(todayBtn).toBeVisible()
      await expect(todayBtn).toHaveAttribute(
        'aria-label',
        'Өнөөдрийн өдөр рүү шилжих',
      )
      await todayBtn.click()
      // router.push('/') → URL becomes /
      await expect(page).toHaveURL(/\/$/)
    })

    // @fr FR-163
    test('D5 footer Тохиргоо — click navigates to /settings', async ({ page }) => {
      // Use /?month=2026-08 (non-today) to skip auto-scroll. Iter-1
      // showed ~33% mobile-chrome flake on this same shape rooted in
      // the hydration / auto-scroll interaction (reviewer's iter-1
      // defect #3 root-cause analysis). Non-today month removes the
      // scrollIntoView entirely; the chain of pre-click waits below
      // absorbs any remaining hydration timing.
      await page.goto('/?month=2026-08')
      const footer = page.locator('[data-role="footer"][data-variant="home"]')
      await expect(footer).toBeVisible()
      // Scope SettingsLink lookup to the home footer — wi-004 removed
      // it from the page header, so it lives only inside the footer
      // now. SettingsLink renders [data-role="settings-link"] always;
      // we narrow with the footer locator to defensively exclude any
      // future header mount.
      const settingsLink = footer.locator('[data-role="settings-link"]')
      await expect(settingsLink).toBeVisible()
      await expect(settingsLink).toHaveAttribute('href', '/settings')
      await expect(settingsLink).toHaveAttribute('aria-label', 'Тохиргоо')
      await settingsLink.click()
      await expect(page).toHaveURL(/\/settings$/)
    })

    // @fr FR-163
    test('D6 ?date= deep-link — /?date=2026-12-15 renders 2026-12 month with that row anchored', async ({ page }) => {
      await page.goto(`/?date=${DEEP_LINK_DATE}`)
      await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
        DEEP_LINK_MONTH_LABEL,
      )
      const namedRow = page.locator(
        `[data-testid="calendar-row"][data-date="${DEEP_LINK_DATE}"]`,
      )
      await expect(namedRow).toHaveCount(1)
      // The named-date row drives the auto-scroll (initialDate prop).
      await expect(namedRow).toBeInViewport({ ratio: 0.1 })
      // December has 31 days — count guards against month-derivation
      // regression (e.g. accidentally slicing 6 chars instead of 7).
      expect(await getDateRowCount(page)).toBe(31)
    })

    // @fr FR-163
    // D7 — mobile + desktop layout: implicit. Both describes share
    // the test set; running `npx playwright test` against both
    // viewports satisfies D7. We add one explicit responsive guard
    // here so the AC is checkable even from a single-viewport run.
    test('D7 layout responsiveness — MonthNav + Footer fit within viewport without horizontal overflow', async ({ page }) => {
      await page.goto('/?month=2026-05')
      // Document scrollWidth must not exceed clientWidth — overflow
      // would indicate an unwanted horizontal scrollbar at this
      // viewport (regression on the sticky-footer flex strip or the
      // MonthNav button row).
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth - doc.clientWidth
      })
      expect(overflow).toBeLessThanOrEqual(2) // 2px tolerance for sub-pixel rounding
    })
  })
}

// ---------------------------------------------------------------------------
// Visual snapshots — 8 baseline images (mobile/desktop × light/dark
// × chromium/mobile-chrome).
//
// Iter 1 review (dvo-rev-cl FAIL): 2 of 4 PNGs were blank (hydration
// race before screenshot); the 2 non-blank PNGs only captured mid-
// calendar rows because /?month=2026-05 is today's month → mount-once
// scrollIntoView({block:'center'}) pushed MonthNav + Footer out of the
// captured viewport. ALSO: snapshot path didn't include project name,
// so both `chromium` and `mobile-chrome` projects raced on the same
// file → last-write-wins (the resulting 3360×2100 "desktop" PNG was
// actually rendered by mobile-chrome's Pixel 7 DPR).
//
// Iter 2 fixes:
//   (a) Use /?month=2026-08 (non-today; no auto-scroll occlusion).
//   (b) testInfo.project.name suffixed into the PNG path (no
//       file-overwrite race; one PNG per (project, viewport, scheme)).
//   (c) Wait for the today-row's CONTENT (a real calendar-row, not just
//       the testid) before screenshot to absorb hydration timing.
//   (d) fullPage: true — captures the entire page including offscreen
//       MonthNav (top) and Footer (bottom) so a reviewer sees the
//       chrome the snapshot claims to verify.
// ---------------------------------------------------------------------------
for (const variant of Object.keys(VIEWPORTS) as ViewportName[]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`GOAL #4 visual snapshot — ${variant} ${colorScheme}`, () => {
      test.use({ viewport: VIEWPORTS[variant], colorScheme })

      // @fr FR-163
      test(`captures home /?month=2026-08 (${variant} ${colorScheme})`, async ({ page }, testInfo) => {
        // 2026-08 is a non-today month — guarantees no scrollIntoView
        // auto-scroll, so MonthNav stays at the page top and Footer at
        // the bottom for the snapshot to capture both.
        await page.goto('/?month=2026-08')
        // Wait for MonthNav label text AND a real calendar-row to
        // appear — both are post-hydration signals. Without the row
        // wait Playwright occasionally screenshots the unstyled
        // pre-hydration shell (root cause of iter-1 blank PNGs).
        await page.locator('[data-testid="month-nav-label-text"]').waitFor()
        await page
          .locator('[data-testid="calendar-row"][data-row-kind="date"]')
          .first()
          .waitFor()
        await page.locator('[data-role="footer"][data-variant="home"]').waitFor()
        // Project name in path so chromium + mobile-chrome don't
        // race-overwrite each other.
        const projectSlug = testInfo.project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        await page.screenshot({
          path: `e2e/snapshots/calendar-list-month-${variant}-${colorScheme}-${projectSlug}.png`,
          fullPage: true,
        })
      })
    })
  }
}
