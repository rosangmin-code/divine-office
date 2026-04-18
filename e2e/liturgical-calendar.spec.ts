import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Liturgical calendar seasons and colors', () => {
  test('Ordinary Time: green color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.getByText('Жирийн цаг улирлын').first()).toBeVisible()
    await expect(page.locator('.border-liturgical-green').first()).toBeVisible()
  })

  test('Advent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.adventWeekday}`)
    await expect(page.getByText('Ирэлтийн цаг улирлын').first()).toBeVisible()
    await expect(page.locator('.border-liturgical-violet').first()).toBeVisible()
  })

  test('Christmas: white color', async ({ page }) => {
    await page.goto(`/?date=${DATES.christmasDay}`)
    await expect(page.locator('.border-stone-400').first()).toBeVisible()
  })

  test('Lent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.lentWeekday}`)
    await expect(page.getByText('Дөч хоногийн цаг улирлын').first()).toBeVisible()
    await expect(page.locator('.border-liturgical-violet').first()).toBeVisible()
  })

  test('Easter: white color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.easterSunday}`)
    await expect(page.getByText('Дээгүүр өнгөрөх цаг улирлын').first()).toBeVisible()
    await expect(page.locator('.border-stone-400').first()).toBeVisible()
  })

  test('season transition: Ordinary Time → Advent boundary', async ({ page }) => {
    // Last OT Saturday → green
    await page.goto(`/?date=${DATES.lastOTSaturday}`)
    await expect(page.locator('.border-liturgical-green').first()).toBeVisible()
    await expect(page.getByText('Жирийн цаг улирлын').first()).toBeVisible()

    // First Advent Sunday → violet
    await page.goto(`/?date=${DATES.firstAdventSunday}`)
    await expect(page.locator('.border-liturgical-violet').first()).toBeVisible()
    await expect(page.getByText('Ирэлтийн цаг улирлын').first()).toBeVisible()
  })
})

test.describe('Liturgical day heading details (home)', () => {
  test('heading merges season + week; psalter week on its own line', async ({ page }) => {
    // OT Week 4 Wednesday → psalter week 4 (IV)
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Жирийн цаг улирлын 4-р долоо хоног' }),
    ).toBeVisible()
    await expect(page.getByText('Дуулалтын IV', { exact: true }).first()).toBeVisible()
  })

  test('card shows gregorian date + weekday line (Mongolian)', async ({ page }) => {
    // 2026-02-04 Wednesday → "2026.02.04 Лхагва"
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.getByText('2026.02.04 Лхагва', { exact: true })).toBeVisible()
  })

  test('heading text tinted with season color class', async ({ page }) => {
    // Ordinary Time: heading carries text-liturgical-green
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.locator('h2.text-liturgical-green').first()).toBeVisible()

    // Advent: heading carries text-liturgical-violet
    await page.goto(`/?date=${DATES.adventWeekday}`)
    await expect(page.locator('h2.text-liturgical-violet').first()).toBeVisible()
  })

  test('WHITE season uses gold text class on heading (not white)', async ({ page }) => {
    // Christmas Day is WHITE → heading should use text-liturgical-gold for readability
    await page.goto(`/?date=${DATES.christmasDay}`)
    await expect(page.locator('h2.text-liturgical-gold')).toBeVisible()
  })

  test('color label (Ногоон/Нил ягаан/…) is no longer displayed', async ({ page }) => {
    // After commit 56b2914 the explicit color word was removed from the subtitle
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.getByText('Ногоон', { exact: true })).toHaveCount(0)
  })

  test('sanctoral solemnity replaces generic day name (St. Joseph)', async ({ page }) => {
    await page.goto(`/?date=${DATES.stJoseph}`)
    // heading should NOT fall back to "{season-GEN} N-р долоо хоног"
    await expect(page.getByRole('heading', { level: 2 })).not.toHaveText(
      /долоо хоног/,
    )
    // And the color border should be WHITE (rendered as stone-400)
    await expect(page.locator('.border-stone-400').first()).toBeVisible()
  })

  test('Easter Octave psalter week is clamped to I (not V)', async ({ page }) => {
    // romcal returns psalterWeek=5 for the octave; calendar.ts clamps to 1
    await page.goto(`/?date=${DATES.easterFriday}`)
    await expect(page.getByText(/Дуулалтын I\b/)).toBeVisible()
    await expect(page.getByText(/Дуулалтын V/)).toHaveCount(0)
  })
})

test.describe('Liturgical day heading details (pray page)', () => {
  test('pray page header shows gregorian date + weekday', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(page.getByText('2026.02.04 Лхагва', { exact: true })).toBeVisible()
  })

  test('pray page header merges season + week and shows psalter week line', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(
      page.getByText('Жирийн цаг улирлын 4-р долоо хоног').first(),
    ).toBeVisible()
    await expect(page.getByText('Дуулалтын IV', { exact: true }).first()).toBeVisible()
  })

  test('pray page hour heading is tinted with season color', async ({ page }) => {
    await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
    await expect(page.locator('h1.text-liturgical-violet').first()).toBeVisible()
  })

  test('pray page header shows liturgical day name in subtitle', async ({ page }) => {
    // 2026-02-04 is OT week 4 Wednesday
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(
      page.getByText('Жирийн цаг улирлын 4-р долоо хоног').first(),
    ).toBeVisible()
  })
})
