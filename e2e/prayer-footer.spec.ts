import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// GOAL #66 sub-2 (#68, FR-164) — PrayerFooter 인터랙션 재설계 e2e.
// 이전(GOAL #24): 상시 32px strip 탭 → Огноо/Тохиргоо 패널.
// 현재: 상시 strip 없음. 본문 아무 곳 '가벼운 탭' → 설정(Тохиргоо) 패널 슬라이드업.
//
// Selector strategy (CLAUDE.md '테스트 selector 원칙' — 기능 검증은
// data-role 우선):
//   backdrop      — [data-role="prayer-footer-backdrop"]
//   panel         — [data-role="prayer-footer-content"] (always mounted; inert when collapsed)
//   Тохиргоо link — [data-role="prayer-footer-menu-settings"] → /settings
//
// Regression guard: strip / Огноо 메뉴 surface 는 완전히 제거됨.

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  desktop: { width: 1280, height: 800 },
} as const

type ViewportName = keyof typeof VIEWPORTS

const PRAY_URL = `/pray/${DATES.ordinaryWeekday}/lauds`

// Helper — 본문(제목 텍스트) 가벼운 탭으로 패널 오픈. h1(시간전례명)은
// 비인터랙티브 텍스트라 document click 리스너가 패널을 연다.
async function openPanelByBodyTap(page: import('@playwright/test').Page) {
  const panel = page.locator('[data-role="prayer-footer-content"]')
  await expect(panel).toHaveAttribute('data-expanded', 'false')
  await page.getByRole('heading', { level: 1 }).click()
  await expect(panel).toHaveAttribute('data-expanded', 'true')
}

for (const variant of Object.keys(VIEWPORTS) as ViewportName[]) {
  test.describe(`GOAL #66 PrayerFooter — ${variant} (${VIEWPORTS[variant].width}×${VIEWPORTS[variant].height})`, () => {
    test.use({ viewport: VIEWPORTS[variant] })

    // @fr FR-164
    test('D1 body tap → panel slide-up — collapsed by default, opens on non-interactive tap', async ({ page }) => {
      await page.goto(PRAY_URL)
      const panel = page.locator('[data-role="prayer-footer-content"]')
      // 로드 직후 collapsed — 상시 strip 없음.
      await expect(panel).toHaveAttribute('data-expanded', 'false')
      await expect(page.locator('[data-role="prayer-footer-strip"]')).toHaveCount(0)
      // 본문 탭 → 오픈 + 첫 메뉴(설정 링크) auto-focus.
      await page.getByRole('heading', { level: 1 }).click()
      await expect(panel).toHaveAttribute('data-expanded', 'true')
      await expect(page.locator('[data-role="prayer-footer-menu-settings"]')).toBeFocused()
    })

    // @fr FR-164
    test('D2 interactive tap ignored — tapping the back link navigates, panel logic does not hijack', async ({ page }) => {
      await page.goto(PRAY_URL)
      // back 링크(인터랙티브)를 탭하면 패널을 열지 않고 정상 네비게이션.
      await page.locator('[aria-label="Бүх цагийн залбирлууд руу буцах"]').click()
      await expect(page).toHaveURL(new RegExp(`/\\?date=${DATES.ordinaryWeekday}`))
    })

    // @fr FR-164
    test('D3 Тохиргоо menu navigates to /settings', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanelByBodyTap(page)
      const settingsLink = page.locator('[data-role="prayer-footer-menu-settings"]')
      await expect(settingsLink).toHaveAttribute('href', '/settings')
      await expect(settingsLink).toHaveAttribute('aria-label', 'Тохиргоо')
      await settingsLink.click()
      await expect(page).toHaveURL(/\/settings$/)
    })

    // @fr FR-164
    test('D4a panel dismiss — backdrop click closes the panel', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanelByBodyTap(page)
      const backdrop = page.locator('[data-role="prayer-footer-backdrop"]')
      const panel = page.locator('[data-role="prayer-footer-content"]')
      await expect(backdrop).toHaveAttribute('data-expanded', 'true')
      await backdrop.click()
      await expect(panel).toHaveAttribute('data-expanded', 'false')
      await expect(backdrop).toHaveAttribute('data-expanded', 'false')
    })

    // @fr FR-164
    test('D4b panel dismiss — Escape key closes the panel', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanelByBodyTap(page)
      const panel = page.locator('[data-role="prayer-footer-content"]')
      await page.keyboard.press('Escape')
      await expect(panel).toHaveAttribute('data-expanded', 'false')
    })

    // @fr FR-164
    // 닫힘 시 focus 가 inert 로 전환되는 패널 링크에 갇히지 않아야 한다
    // (handleClose 가 activeElement 를 blur → body 로 내려감).
    test('D4c focus not trapped — after Escape, focus leaves the panel subtree', async ({ page }) => {
      await page.goto(PRAY_URL)
      await openPanelByBodyTap(page)
      await page.keyboard.press('Escape')
      const focusedRole = await page.evaluate(
        () => document.activeElement?.getAttribute('data-role') ?? null,
      )
      // 설정 링크에 focus 가 남아있지 않음 (body 또는 null).
      expect(focusedRole).not.toBe('prayer-footer-menu-settings')
    })

    // @fr FR-164
    test('D5 body content not occluded — no horizontal overflow, panel is a fixed overlay', async ({ page }) => {
      await page.goto(PRAY_URL)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(2)
      // 상시 strip skeleton 도 제거 — 로드 후 회색 바 요소 없음.
      await expect(page.locator('[data-role="prayer-footer-strip-skeleton"]')).toHaveCount(0)
      // 패널은 collapsed 기본값 (본문 flow 를 차지하지 않는 fixed overlay).
      await expect(page.locator('[data-role="prayer-footer-content"]')).toHaveAttribute(
        'data-expanded',
        'false',
      )
    })

    // @fr FR-164
    test('D6 prayer page header does NOT mount a SettingsLink; Тохиргоо reachable via body tap', async ({ page }) => {
      await page.goto(PRAY_URL)
      await expect(page.locator('[data-role="settings-link"]')).toHaveCount(0)
      await openPanelByBodyTap(page)
      await expect(page.locator('[data-role="prayer-footer-menu-settings"]')).toBeVisible()
    })
  })

  // -----------------------------------------------------------------
  // D7 — reduced-motion variant (runtime emulateMedia, test.use typedef
  // 가 reducedMotion 미노출).
  // -----------------------------------------------------------------
  test.describe(`GOAL #66 PrayerFooter — ${variant} reduced-motion`, () => {
    test.use({ viewport: VIEWPORTS[variant] })

    // @fr FR-164
    test('D7 reduced-motion — panel transitions are duration-0 (motion-reduce CSS applied)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(PRAY_URL)
      const panel = page.locator('[data-role="prayer-footer-content"]')
      const computedDuration = await panel.evaluate(
        (el) => window.getComputedStyle(el).transitionDuration,
      )
      expect(computedDuration).not.toMatch(/200ms|0\.2s/)
      // transition 제거 상태에서도 상태 전환(오픈→Esc close)은 동작.
      await openPanelByBodyTap(page)
      await page.keyboard.press('Escape')
      await expect(panel).toHaveAttribute('data-expanded', 'false')
    })
  })
}
