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
    const stanzaWrapper = page
      .locator('section[aria-label*="Psalm"], section[aria-label*="Daniel"], section[aria-label*="Isaiah"]')
      .locator('div.pl-3')
      .first()
    const count = await stanzaWrapper.count()
    if (count === 0) test.skip(true, 'No psalm stanza wrapper rendered on this page')
    const pl = await stanzaWrapper.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))
    expect(pl).toBeGreaterThanOrEqual(12)
  })

  test('psalm stanzas have visible spacing on mobile (NFR-014)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'Mobile-only viewport assertion')
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    // Find a psalm section that has at least 2 stanza paragraphs.
    const stanzas = page
      .locator('section[aria-label*="Psalm"], section[aria-label*="Daniel"], section[aria-label*="Isaiah"]')
      .locator('p.font-serif')
    const count = await stanzas.count()
    if (count < 2) test.skip(true, 'Need at least 2 stanza paragraphs to measure spacing')
    const a = await stanzas.nth(0).boundingBox()
    const b = await stanzas.nth(1).boundingBox()
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    const gap = b!.y - (a!.y + a!.height)
    // space-y-5 = 20px between stanzas on mobile (allow small subpixel slack).
    expect(gap).toBeGreaterThanOrEqual(18)
  })
})
