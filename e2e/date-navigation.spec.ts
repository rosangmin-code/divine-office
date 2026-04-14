import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Date navigation', () => {
  test('previous day link navigates correctly', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await page.getByRole('link', { name: 'Өмнөх өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-02-03/)
  })

  test('next day link navigates correctly', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await page.getByRole('link', { name: 'Дараа өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-02-05/)
  })

  test('year boundary: Dec 31 → Jan 1', async ({ page }) => {
    await page.goto(`/?date=${DATES.newYearsEve}`)
    await page.getByRole('link', { name: 'Дараа өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-01-01/)
  })

  test('year boundary: Jan 1 → Dec 31', async ({ page }) => {
    await page.goto(`/?date=${DATES.newYearsDay}`)
    await page.getByRole('link', { name: 'Өмнөх өдөр' }).click()
    await expect(page).toHaveURL(/date=2025-12-31/)
  })

  test('multiple consecutive navigations', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Click next 3 times, waiting for each navigation
    await page.getByRole('link', { name: 'Дараа өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-02-05/)
    await page.getByRole('link', { name: 'Дараа өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-02-06/)
    await page.getByRole('link', { name: 'Дараа өдөр' }).click()
    await expect(page).toHaveURL(/date=2026-02-07/)
  })
})
