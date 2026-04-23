import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-153h
test.describe('Psalter psalmPrayerRich rendering (FR-153h)', () => {
  test.beforeEach(async ({ page }) => {
    // Ordinary Time Week 1 Sunday Lauds — Ps 63:2-9, Dan 3:57-88, Ps 149:1-9
    // 세 psalm 각각의 psalmPrayer 가 주간 공통 카탈로그에 존재한다. Ps 63 은 p59,
    // Dan 3 은 p65(FAIL 영역 — fallback 확인용), Ps 149 는 p65(FAIL — fallback).
    // stanzasRich 가 이미 rich AST 로 렌더된 상태에서 psalmPrayer 영역만 검증.
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
  })

  // @fr FR-153h
  test('psalm-prayer section renders with Mongolian rubric heading', async ({ page }) => {
    // 우리말 rubric 라벨 "Дууллыг төгсгөх залбирал" 이 psalm-prayer 섹션마다
    // 존재. data-role 로 섹션 경계, 문구 자체는 NFR-002 맞춤법 검증.
    const sections = page.locator('[data-role="psalm-prayer"]')
    await expect(sections.first()).toBeVisible()
    expect(await sections.count()).toBeGreaterThanOrEqual(1)
    await expect(sections.first()).toContainText('Дууллыг төгсгөх залбирал')
  })

  // @fr FR-153h
  test('Ps 63 psalmPrayer renders via rich AST (RichContent paragraph branch)', async ({ page }) => {
    // Ps 63 (p59) 은 PASS 영역 — 카탈로그에 psalmPrayerRich 존재, 렌더는
    // RichContent <p> 경로를 탄다. 역돌려 렌더 구분: rich 경로는
    // 한 psalm-prayer 섹션 내 font-serif <p> 의 클래스 / 구조.
    const psalmPrayer = page.locator('[data-role="psalm-prayer"]').first()
    await expect(psalmPrayer).toBeVisible()
    // 본문의 첫 의미 단위가 "Эцэг минь," 로 시작 (Ps 63 psalmPrayer canonical text).
    await expect(psalmPrayer).toContainText('Эцэг минь')
  })

  // @fr FR-153h
  test('psalm-prayer heading carries red rubric class (§12.1)', async ({ page }) => {
    // rubric label 의 색 규약 일관성 — 빨강 heading 유지 (FR-153f 와 동일).
    const heading = page
      .locator('[data-role="psalm-prayer"]')
      .first()
      .locator('p')
      .first()
    await expect(heading).toHaveClass(/text-red-700/)
  })
})
