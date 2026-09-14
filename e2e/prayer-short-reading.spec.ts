import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// 2026-09-14 — FR-161 R-15 이후 shortReading rich 는 `RichContent
// flow="natural"` 로 렌더된다: 래퍼 `<div class="space-y-2">` 없이 섹션
// 바로 아래 `<p data-render-mode="flow">` 한 개가 본문 전체를 자연 wrap 으로
// 담는다. legacy(plain verses) 분기는 `<div class="space-y-1">` + `<p><sup>`
// 절 번호. rich 경로의 정체성 = flow 단락 1개 + `<sup>` 0개.
const RICH_FLOW = 'p[data-render-mode="flow"]'

test.describe('shortReading (Уншлага) Rich overlay — Stage 6 (FR-153e)', () => {
  // @fr FR-153
  test('Advent Sunday lauds renders rich overlay (RichContent wrapper, no legacy verses)', async ({
    page,
  }) => {
    // Advent Week 1 Sunday — seasonal propers shortReading (Ром 13:11-14)
    // 의 rich overlay 가 prayers/seasonal/advent/w1-SUN-lauds.rich.json 에
    // 존재. 일요일 데이터가 필요하므로 firstAdventSunday 사용.
    await page.goto(`/pray/${DATES.firstAdventSunday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    // Rich 경로의 정체성: natural-flow 단락 1개, legacy 분기의 `<sup>` 절
    // 번호 없음.
    const richWrapper = section.locator(RICH_FLOW)
    await expect(richWrapper).toHaveCount(1)

    const legacyVerseNumbers = section.locator('sup')
    await expect(legacyVerseNumbers).toHaveCount(0)

    // 본문 첫 단어로 rich 가 실제로 채워졌는지 검증.
    await expect(section).toContainText('Цаг үеийг')
  })

  // @fr FR-153
  test('Ordinary Time weekday lauds falls back to psalter commons rich', async ({ page }) => {
    // psalter commons 의 shortReadingRich 가 fallback 으로 적재되는지 검증.
    // 평일이라 seasonal propers 의 shortReading 이 없고, psalter commons 가
    // 내려와야 한다 (FR-153e 의 psalter commons 카탈로그 경로 활용).
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator(RICH_FLOW)
    await expect(richWrapper).toHaveCount(1)

    const legacyVerseNumbers = section.locator('sup')
    await expect(legacyVerseNumbers).toHaveCount(0)
  })

  // @fr FR-153
  test('Compline shortReading uses commons/compline rich overlay', async ({ page }) => {
    // ordinarium/compline.json 의 7일치 shortReading 이
    // prayers/commons/compline/{DAY}.rich.json 으로 분산 저장되고
    // resolver 가 hour=compline 분기로 적재.
    await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator(RICH_FLOW)
    await expect(richWrapper).toHaveCount(1)

    const legacyVerseNumbers = section.locator('sup')
    await expect(legacyVerseNumbers).toHaveCount(0)
  })

  // @fr FR-153
  test('rich shortReading reflows to single paragraph (no per-line splits)', async ({
    page,
  }) => {
    // shortReading 은 캐논상 항상 단일 단락이며, PDF 가 줄간 시각적 spacing
    // 으로 빈 라인을 출력해도 buildShortReading 의 collapseBodyBlanks 로
    // 한 단락으로 reflow 되어야 한다. flow 단락이 정확히 1개이고 그 안에
    // per-line `display:block` span (legacy line-by-line 렌더) 이 없어야 함.
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator(RICH_FLOW)
    await expect(richWrapper).toHaveCount(1)
    await expect(richWrapper.locator('span.block')).toHaveCount(0)
    // 헤더(제목 + 참조) 2개 + 본문 flow 1개 — 본문 단락은 1개뿐.
    await expect(section.locator('> p')).toHaveCount(3)
  })
})
