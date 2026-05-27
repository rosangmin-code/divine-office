import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * FR-167 / WI #37 (GOAL #35 sub-2) — Gospel Canticle 본문 절 구분을 시편과
 * 동일한 'PDF Cyrillic 대문자 시작 = 새 절' 규칙으로 재분절한 결과가 화면에
 * 반영되는지 검증.
 *
 * 사용자 보고: '성모찬송과 즈카르야의 노래 본문이 시편 본문과 다르게 구현
 * 되고 있어 … pdf 에서 대문자 시작하는 것으로 절구분 하는 것이 구현이 안
 * 되는 거.'
 *
 * 검증 축 분리(CLAUDE.md selector 원칙):
 *   - 기능(절 개수/구조) → `[data-role="gospel-canticle-verse"]` count
 *     (로케일-독립). 재분절 전 benedictus 19 / magnificat 12 → 재분절 후
 *     benedictus 25 / magnificat 19. 개수 자체가 capital-start 분절의 증거.
 *   - 몽골어 문구 정확성(NFR-002) → getByText 로 의도적 결합. 이전에 한 절로
 *     병합돼 있던 두 시행이 별개 절로 분리됐음을 확인.
 *
 * 데이터 SoT/회귀가드: `scripts/extract-gospel-canticles.mjs --verify` (NFR-009l).
 */
test.describe('FR-167 Gospel Canticle capital-start verse division', () => {
  // @fr FR-167
  test('lauds Benedictus(Захариагийн магтаал) renders 25 verses (capital-start 재분절)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const canticle = page.locator('[aria-label="Захариагийн магтаал"]')
    await expect(canticle).toBeVisible()
    // 기능 검증: 재분절 후 25 절 (재분절 전 19) — 로케일-독립 selector.
    await expect(canticle.locator('[data-role="gospel-canticle-verse"]')).toHaveCount(25)
  })

  // @fr FR-167
  test('lauds Benedictus: 이전 병합 절이 별개 절로 분리 (NFR-002 문구)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const canticle = page.locator('[aria-label="Захариагийн магтаал"]')
    await expect(canticle).toBeVisible()
    // 재분절 전 한 절("Учир нь Тэр ард түмэндээ очиж, Тэднийгээ золин авчээ.")
    // 이 PDF 대문자 라인대로 두 절로 분리됨 → 각각 별개 verse <p>.
    await expect(
      canticle.locator('[data-role="gospel-canticle-verse"]', {
        hasText: 'Учир нь Тэр ард түмэндээ очиж,',
      }),
    ).toHaveCount(1)
    await expect(
      canticle.locator('[data-role="gospel-canticle-verse"]', {
        hasText: 'Тэднийгээ золин авчээ.',
      }),
    ).toHaveCount(1)
  })

  // @fr FR-167
  test('vespers Magnificat(Мариагийн магтаал) renders 19 verses (capital-start 재분절)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
    const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
    await expect(canticle).toBeVisible()
    // 기능 검증: 재분절 후 19 절 (재분절 전 12).
    await expect(canticle.locator('[data-role="gospel-canticle-verse"]')).toHaveCount(19)
  })

  // @fr FR-167
  test('vespers Magnificat: 이전 병합 절이 별개 절로 분리 (NFR-002 문구)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
    const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
    await expect(canticle).toBeVisible()
    // 재분절 전 한 절("Харагтун, энэ цагаас хойш Бүх үеийнхэн …")이 두 절로 분리.
    await expect(
      canticle.locator('[data-role="gospel-canticle-verse"]', {
        hasText: 'Харагтун, энэ цагаас хойш',
      }),
    ).toHaveCount(1)
    await expect(
      canticle.locator('[data-role="gospel-canticle-verse"]', {
        hasText: 'Бүх үеийнхэн намайг ерөөлтэй гэж тооцох болно.',
      }),
    ).toHaveCount(1)
  })
})
