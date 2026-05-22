import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-032
// #3 — "Дууллыг төгсгөх залбирал" (psalm-concluding prayer) 숨김/보이기 토글이
// 기도 화면 렌더에 반영되는지 검증. 기존 settings.spec.ts 는 localStorage
// 영속성만 확인했고, 실제 pray 화면에서 섹션이 숨김/노출되는지(=사용자 버그)
// 는 커버하지 않았다. 이 파일이 그 갭을 메운다.
//
// 렌더 게이트: src/components/psalm-block.tsx — psalm-concluding prayer 블록은
//   (psalm.psalmPrayer || psalmPrayerRich-non-empty) && !settings.psalmPrayerCollapsed
// 조건으로 게이팅된다. plain(psalmPrayer) 경로와 rich(psalmPrayerRich) 경로
// 모두 토글에 반응해야 한다 (AC3).
test.describe('psalm-prayer collapse toggle reflects on prayer screen (#3 / FR-032)', () => {
  // 2026-01-18 lauds = OT week-2 SUN — 첫 psalm Ps 118:1-16 의 psalmPrayer 가
  // rich 카탈로그(psalmPrayerRich)에 존재 → RichContent 경로로 렌더.
  const RICH_ROUTE = `/pray/${DATES.otWeek1Sunday}/lauds`
  // 2026-02-08 lauds = OT Sunday — 동일하게 psalm-prayer 섹션을 렌더하는 또
  // 다른 날짜 (양 경로 회귀 폭 확보).
  const PLAIN_ROUTE = `/pray/${DATES.ordinarySunday}/lauds`

  async function seedCollapsed(page: import('@playwright/test').Page, collapsed: boolean) {
    await page.addInitScript((value) => {
      window.localStorage.setItem(
        'loth-settings',
        JSON.stringify({ version: 1, psalmPrayerCollapsed: value }),
      )
    }, collapsed)
  }

  test('default (collapsed=false): psalm-prayer section is shown', async ({ page }) => {
    await page.goto(RICH_ROUTE)
    const sections = page.locator('[data-role="psalm-prayer"]')
    await expect(sections.first()).toBeVisible()
    expect(await sections.count()).toBeGreaterThanOrEqual(1)
    await expect(sections.first()).toContainText('Дууллыг төгсгөх залбирал')
  })

  test('collapsed=true: psalm-prayer section is hidden (rich path)', async ({ page }) => {
    await seedCollapsed(page, true)
    await page.goto(RICH_ROUTE)
    // 본문(stanza)은 렌더되어야 하므로 페이지 자체는 정상 — 단지 마침 기도만 숨김.
    await expect(page.locator('[data-role="psalm-stanza"]').first()).toBeVisible()
    await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)
  })

  test('collapsed=true: psalm-prayer section is hidden (second OT Sunday)', async ({ page }) => {
    await seedCollapsed(page, true)
    await page.goto(PLAIN_ROUTE)
    await expect(page.locator('[data-role="psalm-stanza"]').first()).toBeVisible()
    await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)
  })

  test('toggle ON→OFF round-trip via /settings reflects on pray page (FR-032)', async ({ page }) => {
    // 1) 기본 노출 확인
    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()

    // 2) /settings 에서 토글을 켜서(collapsed=true) 숨김으로 전환
    await page.goto('/settings')
    const switchBtn = page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ })
    await switchBtn.click()
    await expect(switchBtn).toHaveAttribute('aria-checked', 'true')

    // 3) 기도 화면으로 돌아오면 마침 기도 섹션이 사라져야 함
    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-stanza"]').first()).toBeVisible()
    await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)

    // 4) 다시 끄면(collapsed=false) 노출 복귀
    await page.goto('/settings')
    await page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ }).click()
    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()
  })
})
