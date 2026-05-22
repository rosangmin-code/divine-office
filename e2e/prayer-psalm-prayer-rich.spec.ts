import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-153h
test.describe('Psalter psalmPrayerRich rendering (FR-153h)', () => {
  test.beforeEach(async ({ page }) => {
    // 2026-01-18 은 romcal 기준 '2nd Sunday of OT' 이고 psalter cycle 상 week-2
    // 를 사용한다 (week-1 Sunday 는 Baptism 이후 건너뜀). week-2 SUN Lauds 의
    // 첫 psalm 은 Ps 118:1-16 — psalmPrayer 가 "Тэнгэрбурхан Эзэн минь, Та
    // бидэнд Есүс Христ барилгачдын голсон чулуу..." 로 시작.
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
  test('first psalm psalmPrayer renders via rich AST (RichContent paragraph branch)', async ({ page }) => {
    // week-2 SUN Lauds 의 첫 psalm Ps 118:1-16 psalmPrayer 가 rich 카탈로그에
    // 존재하므로 RichContent <p> 경로로 렌더. 캐논 incipit 으로 정체 검증.
    const psalmPrayer = page.locator('[data-role="psalm-prayer"]').first()
    await expect(psalmPrayer).toBeVisible()
    await expect(psalmPrayer).toContainText('Есүс Христ барилгачдын голсон чулуу')
  })

  // @fr FR-153h
  test('psalm-prayer heading carries 전례 빨강 (WI #5: stone-500→liturgical-red)', async ({ page }) => {
    // WI #5 (#2-sub-1): 섹션 제목은 전례 빨강(text-liturgical-red = #c1121f /
    // 다크 #ef4444)으로 화면 전반 통일 (DESIGN.md SSOT §Components "Section
    // title"). 이전 WI-62 의 stone-500 faint 처리는 사용자 결정으로 폐기.
    const heading = page
      .locator('[data-role="psalm-prayer"]')
      .first()
      .locator('p')
      .first()
    await expect(heading).toHaveClass(/text-liturgical-red/)
  })
})
