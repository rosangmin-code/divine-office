import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// These tests only run on the mobile-chrome project
test.describe('Mobile layout', () => {
  test('homepage has no horizontal scroll', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('hour cards have sufficient touch target size (>= 44px height)', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    const hourCards = page.locator('a[href*="/pray/"]')
    const count = await hourCards.count()

    for (let i = 0; i < count; i++) {
      const box = await hourCards.nth(i).boundingBox()
      expect(box).toBeTruthy()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  // @fr FR-178
  test('시간경 카드가 조밀하다 — 3장 블록이 세로 공간을 과하게 먹지 않는다', async ({ page }) => {
    // 사용자 피드백 (2026-09-17): "카드형이 불필요하게 공간을 많이 차지하는 거 같아".
    // 기본 글씨 크기 기준 카드 1장 = 세로 패딩 2×12 + 아이콘/텍스트 24 = 48px,
    // 카드 간격 8px → 3장 블록 160px. 여유를 둬 상한 200px 으로 고정한다.
    // (이전: 카드 68px + 간격 16px = 236px)
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    const cards = page.locator('a[href*="/pray/"]').filter({ has: page.locator('h3') })
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(3)

    const blockHeight = await cards.first().evaluate(
      (el) => Math.round((el.parentElement as HTMLElement).getBoundingClientRect().height),
    )
    expect(blockHeight).toBeLessThanOrEqual(200)

    // 터치 타겟은 글씨 크기와 무관하게 44px 하한 (min-h-[44px]).
    for (let i = 0; i < (await cards.count()); i++) {
      const box = await cards.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeLessThanOrEqual(64)
    }
  })

  // @fr FR-178
  test('홈과 기도 본문의 좌우 여백이 같다', async ({ page }) => {
    // 사용자 지적 (2026-09-17): 기도 본문은 여백을 최소화해 뒀는데 홈은 그대로라
    // 두 화면의 여백이 달랐다. 최상위 컨테이너 패딩을 같은 값으로 맞춘다.
    const pad = async (url: string, sel: string) => {
      await page.goto(url)
      return page.locator(sel).first().evaluate((el) => {
        const c = getComputedStyle(el)
        return [c.paddingLeft, c.paddingRight].join('/')
      })
    }
    const home = await pad(`/?date=${DATES.ordinaryWeekday}`, 'div.mx-auto')
    const pray = await pad(`/pray/${DATES.ordinaryWeekday}/lauds`, 'div.mx-auto')
    expect(home).toBe(pray)
  })

  test('prayer page has no horizontal scroll', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('prayer page text is readable (font-size >= 14px)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

    const verseParagraphs = page.locator('.text-base')
    const count = await verseParagraphs.count()

    if (count > 0) {
      const fontSize = await verseParagraphs.first().evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize)
      })
      expect(fontSize).toBeGreaterThanOrEqual(14)
    }
  })

  test('prayer article inner width >= 320px for readability (NFR-013)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

    const article = page.locator('article').first()
    await expect(article).toBeVisible()

    const contentWidth = await article.evaluate((el) => {
      const s = getComputedStyle(el)
      return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
    })
    expect(contentWidth).toBeGreaterThanOrEqual(320)
  })

  test('antiphon inner width >= 320px on mobile (NFR-013)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

    const antiphon = page.locator('[data-role="antiphon"]').first()
    const count = await antiphon.count()
    if (count === 0) test.skip(true, 'No antiphon rendered on this page')

    const contentWidth = await antiphon.evaluate((el) => {
      const s = getComputedStyle(el)
      return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
    })
    expect(contentWidth).toBeGreaterThanOrEqual(320)
  })

  test('psalm has left padding on mobile (NFR-014)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only viewport assertion')
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    // PsalmBlock wraps stanzas in a div with `pl-3` (12px) on mobile.
    // NFR-002 이후 aria-label 은 몽골어(`Дуулал 108:2-14`)라 영문 결합 selector
    // 는 조용히 0건이 됐다 (app-review 2026-09-13 §4 #13) → data-role 로 이관,
    // 0건이면 skip 대신 실패.
    const stanzaWrapper = page
      .locator('[data-role="psalm-block"]')
      .locator('div.pl-3')
      .first()
    expect(await stanzaWrapper.count(), 'psalm stanza wrapper must render on lauds').toBe(1)
    const pl = await stanzaWrapper.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))
    expect(pl).toBeGreaterThanOrEqual(12)
  })

  test('psalm stanzas have visible spacing on mobile (NFR-014)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only viewport assertion')
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    // Find a psalm section that has at least 2 stanza paragraphs.
    // NFR-002: 영문 aria-label 결합 → data-role (위 테스트와 동일 이유).
    // Stanzas carry `data-role="psalm-stanza"` (psalm-block.tsx); the
    // former `p.font-reading` selector also matched header/prayer <p>s
    // inside the section and measured the wrong gap.
    const stanzas = page
      .locator('[data-role="psalm-block"]')
      .locator('p[data-role="psalm-stanza"]')
    const count = await stanzas.count()
    expect(count, 'need at least 2 stanza paragraphs to measure spacing').toBeGreaterThanOrEqual(2)
    const a = await stanzas.nth(0).boundingBox()
    const b = await stanzas.nth(1).boundingBox()
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    const gap = b!.y - (a!.y + a!.height)
    // space-y-5 = 20px between stanzas on mobile (allow small subpixel slack).
    expect(gap).toBeGreaterThanOrEqual(18)
  })
})
