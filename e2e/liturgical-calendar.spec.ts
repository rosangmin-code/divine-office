import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Liturgical calendar seasons and colors', () => {
  test('Ordinary Time: green color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.getByText('Жирийн цаг улирал')).toBeVisible()
    await expect(page.locator('.border-liturgical-green')).toBeVisible()
  })

  test('Advent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.adventWeekday}`)
    await expect(page.getByText('Ирэлтийн цаг улирал')).toBeVisible()
    await expect(page.locator('.border-liturgical-violet')).toBeVisible()
  })

  test('Christmas: white color', async ({ page }) => {
    await page.goto(`/?date=${DATES.christmasDay}`)
    await expect(page.locator('.border-stone-400')).toBeVisible()
  })

  test('Lent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.lentWeekday}`)
    await expect(page.getByText('Дөч хоногийн цаг улирал')).toBeVisible()
    await expect(page.locator('.border-liturgical-violet')).toBeVisible()
  })

  test('Easter: white color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.easterSunday}`)
    await expect(page.getByText('Дээгүүр өнгөрөх цаг улирал')).toBeVisible()
    await expect(page.locator('.border-stone-400')).toBeVisible()
  })

  test('season transition: Ordinary Time → Advent boundary', async ({ page }) => {
    // Last OT Saturday → green
    await page.goto(`/?date=${DATES.lastOTSaturday}`)
    await expect(page.locator('.border-liturgical-green')).toBeVisible()
    await expect(page.getByText('Жирийн цаг улирал')).toBeVisible()

    // First Advent Sunday → violet
    await page.goto(`/?date=${DATES.firstAdventSunday}`)
    await expect(page.locator('.border-liturgical-violet')).toBeVisible()
    await expect(page.getByText('Ирэлтийн цаг улирал')).toBeVisible()
  })
})
