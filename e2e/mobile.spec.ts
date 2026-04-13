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
})
