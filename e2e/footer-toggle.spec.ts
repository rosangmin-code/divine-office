import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-162
//
// FR-162 재정의 (#51 / #53): footer 의 click-to-toggle(▾/▴) chevron 을
// 제거하고 교회 출처표시 2줄을 **항상** 노출한다. 이전 토글 케이스
// (aria-expanded / footer-toggle / show·hide aria-label 스왑)는 모두
// 삭제됐다 — 이 스펙은 '토글 부재 + 출처 상시 노출' 을 검증한다.
//
// 홈페이지를 mount 경로로 쓴다(가장 저렴한 footer mount; 동작 계약은
// <Footer /> 가 import 되는 모든 라우트에서 동일).
test.describe('Footer — credits always visible, no toggle (FR-162)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
  })

  test('no toggle chevron is rendered (footer-toggle absent)', async ({ page }) => {
    await expect(page.locator('[data-role="footer-toggle"]')).toHaveCount(0)
  })

  test('the footer exposes no aria-expanded control (toggle removed)', async ({ page }) => {
    const footer = page.locator('[data-role="footer"]').first()
    await expect(footer).toBeVisible()
    // Scoped to the footer — calendar rows elsewhere legitimately use
    // aria-expanded; the footer itself must have none after toggle removal.
    await expect(footer.locator('[aria-expanded]')).toHaveCount(0)
  })

  test('both church-credit lines are visible without any interaction', async ({ page }) => {
    // No click needed — credits render on first paint (always visible).
    await expect(page.getByText('Цагийн Залбирал — Монгол Католик Сүм')).toBeVisible()
    await expect(page.getByText('Зарим орчуулга хийгдэж байна')).toBeVisible()
  })

  test('the credit container (footer-content) is present and visible', async ({ page }) => {
    const content = page.locator('[data-role="footer-content"]').first()
    await expect(content).toBeVisible()
    await expect(content).toContainText('Цагийн Залбирал — Монгол Католик Сүм')
    await expect(content).toContainText('Зарим орчуулга хийгдэж байна')
  })

  test('no English aria-label fallback on footer controls (NFR-002)', async ({ page }) => {
    const footer = page.locator('[data-role="footer"]').first()
    await expect(footer.locator('[aria-label*="show" i]')).toHaveCount(0)
    await expect(footer.locator('[aria-label*="hide" i]')).toHaveCount(0)
    await expect(footer.locator('[aria-label*="toggle" i]')).toHaveCount(0)
  })
})
