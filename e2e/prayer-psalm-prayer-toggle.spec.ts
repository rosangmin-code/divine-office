import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-032
// #3 / #3-sub-2 — "Дууллыг төгсгөх залбирал"(시편 마침 기도) 토글의 **극성(polarity)**
// 회귀 테스트. 사용자 실버그: 토글이 '숨기기' 의미(ON=숨김)로 역방향이었음.
// 본 테스트는 메커니즘(collapsed→render)이 아니라 **사용자 기대 outcome**
// (스위치 ON = 보이기 / OFF = 숨김)을 직접 검증한다. showPageRefs 와 동일한
// 양수 토글 패턴.
//
// 주의(메커니즘 ≠ outcome): collapsed=true→숨김 이라는 렌더 게이트 동작만
// 검증하면(=WI-4 e2e) 극성 역방향을 놓친다. 여기서는 실제 스위치를 클릭한
// 결과의 aria-checked + 기도 화면 섹션 유무를 함께 단언한다.
test.describe('psalm-prayer 토글 극성 — ON=보이기 (#3-sub-2 / FR-032)', () => {
  const RICH_ROUTE = `/pray/${DATES.otWeek1Sunday}/lauds`
  const PLAIN_ROUTE = `/pray/${DATES.ordinarySunday}/lauds`
  const SWITCH = /Дууллыг төгсгөх залбирал/

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('기본값: 스위치 ON(aria-checked=true) + 기도 화면 섹션 보임', async ({ page }) => {
    // 기본 collapsed=false → 보임 → 양수 토글이므로 스위치는 기본 ON.
    await page.goto('/settings')
    await expect(page.getByRole('switch', { name: SWITCH })).toHaveAttribute('aria-checked', 'true')

    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()
    expect(await page.locator('[data-role="psalm-prayer"]').count()).toBeGreaterThanOrEqual(1)
  })

  test('스위치 OFF → 기도 화면 섹션 숨김 (사용자: 안보이게 하면 끈다)', async ({ page }) => {
    await page.goto('/settings')
    const sw = page.getByRole('switch', { name: SWITCH })
    await expect(sw).toHaveAttribute('aria-checked', 'true') // 기본 ON
    await sw.click() // ON→OFF (숨김)
    await expect(sw).toHaveAttribute('aria-checked', 'false')

    // 저장 키는 collapsed(숨김) 유지 — OFF=숨김=collapsed:true.
    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"psalmPrayerCollapsed":true')

    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-stanza"]').first()).toBeVisible()
    await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)
  })

  test('스위치 OFF→ON 재토글 → 섹션 다시 보임 (사용자: 보이게 하면 켠다)', async ({ page }) => {
    await page.goto('/settings')
    const sw = page.getByRole('switch', { name: SWITCH })
    await sw.click() // ON→OFF
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.click() // OFF→ON (보이기)
    await expect(sw).toHaveAttribute('aria-checked', 'true')

    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"psalmPrayerCollapsed":false')

    await page.goto(RICH_ROUTE)
    await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()
  })

  test('두 번째 OT 일요일에서도 OFF→숨김 동일 적용', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('switch', { name: SWITCH }).click() // ON→OFF
    await page.goto(PLAIN_ROUTE)
    await expect(page.locator('[data-role="psalm-stanza"]').first()).toBeVisible()
    await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)
  })

  test('토글 설명이 양수(보이기/харуулах) 프레이밍 — 역방향(нуух) 해소', async ({ page }) => {
    await page.goto('/settings')
    // showPageRefs 와 동일한 'харуулах'(보이기) 양수 표현. 'нуух'(숨기기) 금지.
    const section = page.locator('section[aria-labelledby="psalm-prayer-heading"]')
    await expect(section).toContainText('Дуулал бүрийн дараах залбирлыг харуулах')
    await expect(section).not.toContainText('нуух')
  })
})
