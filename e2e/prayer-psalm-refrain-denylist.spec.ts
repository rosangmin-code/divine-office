import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160
test.describe('Refrain denylist false-positive cleanup (FR-160-A1)', () => {
  // 2026-04-26 = Easter Week 4 SUN. Lauds psalmody[2] = Psalm 150:1-6.
  // Pre-FR-160: detectRefrainLines threshold=3 over-fired on the
  // 6-rep verse-ending 'Түүнийг магтагтун!', tagging it role=refrain
  // → red text in the UI. PDF p449-450 actual rendering is plain
  // black body text (verse-ending phrase, NOT a rubric refrain).
  // After the denylist gate, the entire Psalm 150 stanza body must
  // contain 0 lines tagged psalm-stanza-refrain.
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
  })

  // @fr FR-160
  test('Psalm 150:1-6 stanza has 0 role=refrain lines', async ({ page }) => {
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    await expect(ps150).toBeVisible()
    // Stanzas render (rich path) — confirm body is present.
    const stanzas = ps150.locator('[data-role="psalm-stanza"]')
    expect(await stanzas.count()).toBeGreaterThanOrEqual(1)
    // No line within the Psalm 150 block is tagged refrain.
    const refrains = ps150.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBe(0)
  })

  // @fr FR-160
  // 사용자 directive (2026-05-14) 이후: 시편 본문(`data-role="psalm-stanza"`)
  // 전체가 까만색 통일 → 본 테스트는 모든 시편에서 자동 통과. 그래도 회귀
  // 가드 가치는 유지된다 (psalm-block.tsx 의 stanza span 에 빨간색이 재
  // 도입되면 즉시 fail). psalm-header / 'Дуулал' 라벨 등 본문 외 빨간
  // 글씨는 본 selector 범위 밖이므로 영향 없음.
  test('Psalm 150:1-6 stanza body has no rubric red span', async ({ page }) => {
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    const redInsideStanza = ps150.locator(
      '[data-role="psalm-stanza"] .text-red-700, [data-role="psalm-stanza"] .text-red-400',
    )
    expect(await redInsideStanza.count()).toBe(0)
  })

  // @fr FR-160
  // AC-2: authentic refrains on other refs must remain intact. Daniel 3
  // canticle on OT Wk1 SUN Lauds is the canonical regression date used
  // by FR-153f tests; we re-assert it here so a denylist mistake that
  // accidentally swallows non-Psalm150 refs would surface.
  test('Daniel 3 canticle refrains preserved on OT Wk1 SUN Lauds (regression guard)', async ({ page }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const refrains = page.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBeGreaterThanOrEqual(3)
  })

  // @fr FR-160
  // A2 input boost — Psalm 29:1-10 anaphoric verse-opening false-positive
  // (3-rep 'ЭЗЭНий дуу хоолой', boundary-threshold fire). 2026-01-19 OT
  // Wk1 Monday Lauds psalmody[2] = Psalm 29:1-10 per psalter/week-1.json.
  // After the denylist gate, no role=refrain line within the Psalm 29
  // block.
  test('Psalm 29:1-10 stanza has 0 role=refrain lines (psalterWeek 1 MON Lauds)', async ({ page }) => {
    await page.goto(`/pray/${DATES.psalterW1Monday}/lauds`)
    const ps29 = page.locator('section[aria-label="Psalm 29:1-10"]')
    await expect(ps29).toBeVisible()
    const refrains = ps29.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBe(0)
  })

  // @fr FR-160
  // 사용자 directive (2026-05-14) 이후: 시편 본문 까만색 통일 → 자동 통과.
  // 회귀 가드 의미만 유지. (위 Psalm 150 케이스와 동일 정책.)
  test('Psalm 29:1-10 stanza body has no rubric red span', async ({ page }) => {
    await page.goto(`/pray/${DATES.psalterW1Monday}/lauds`)
    const ps29 = page.locator('section[aria-label="Psalm 29:1-10"]')
    const redInsideStanza = ps29.locator(
      '[data-role="psalm-stanza"] .text-red-700, [data-role="psalm-stanza"] .text-red-400',
    )
    expect(await redInsideStanza.count()).toBe(0)
  })
})
