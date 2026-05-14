import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-153f
test.describe('Psalter stanzasRich rendering (FR-153f)', () => {
  test.beforeEach(async ({ page }) => {
    // Ordinary Time Week 1 Sunday Lauds — hosts Daniel 3:57-88 canticle which
    // contains the auto-detected refrain "Эзэнийг магтагтун" (≥3x within the
    // canticle). Use the same date as the FR-153 pilot.
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
  })

  // @fr FR-153f
  test('renders psalm stanzas via rich AST (data-role markers present)', async ({ page }) => {
    // Each stanza block renders as <p data-role="psalm-stanza">. Ps 63 + Dan 3
    // + Ps 149 together contribute many stanza blocks; require ≥ 3 to confirm
    // the rich branch is active across multiple psalms.
    const stanzas = page.locator('[data-role="psalm-stanza"]')
    await expect(stanzas.first()).toBeVisible()
    expect(await stanzas.count()).toBeGreaterThanOrEqual(3)
  })

  // @fr FR-153f
  test('Daniel 3 refrain lines are tagged with role=refrain', async ({ page }) => {
    // role:'refrain' → data-role="psalm-stanza-refrain" on the <span>.
    // Daniel 3 repeats "Эзэнийг магтагтун" across the canticle; auto-detection
    // via ≥3x trimmed-line repeat must yield multiple refrain lines.
    const refrains = page.locator('[data-role="psalm-stanza-refrain"]')
    await expect(refrains.first()).toBeVisible()
    expect(await refrains.count()).toBeGreaterThanOrEqual(3)
  })

  // @fr FR-153f
  // 사용자 directive (2026-05-14): 시편 본문 전체 까만색 통일. PRD §12.1 의
  // "빨간색 = 회중 응답" rubric 정책에서 refrain 라인은 제외된다 — 시편
  // 본문 가독성 우선. data-role 메타데이터는 보존하여 회중 응답 식별과
  // e2e selector 안정성은 유지 (denylist/allowlist 정합화 로직, refrain
  // 데이터 모델은 영향 없음).
  test('refrain lines do NOT carry red colour (2026-05-14 black-text policy)', async ({ page }) => {
    const first = page.locator('[data-role="psalm-stanza-refrain"]').first()
    await expect(first).not.toHaveClass(/text-red-700/)
    await expect(first).not.toHaveClass(/text-red-400/)
  })
})
