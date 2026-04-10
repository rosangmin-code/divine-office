import { test, expect } from '@playwright/test'
import { DATES, ALL_HOURS, HOUR_NAMES_MN } from './fixtures/dates'

test.describe('Homepage', () => {
  test('renders with today\'s date by default', async ({ page }) => {
    await page.goto('/')

    // Title
    await expect(page.getByRole('heading', { name: 'Цагийн Залбирал', exact: true })).toBeVisible()
    await expect(page.getByText('Liturgy of the Hours')).toBeVisible()

    // Date input exists
    await expect(page.locator('input[type="date"]')).toBeVisible()

    // Liturgical day info card
    const dayInfoCard = page.locator('.rounded-xl.bg-white.shadow-sm').first()
    await expect(dayInfoCard).toBeVisible()

    // 7 hour cards
    const hourLinks = page.locator('a[href*="/pray/"]')
    await expect(hourLinks).toHaveCount(7)
  })

  test('renders correctly for a specific Ordinary Time date', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Season text
    await expect(page.getByText('Жирийн цаг улирал')).toBeVisible()

    // Green color dot
    await expect(page.locator('.bg-liturgical-green')).toBeVisible()

    // All 7 hour cards link to correct date
    for (const hour of ALL_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link).toBeVisible()
    }
  })

  test('hour cards show correct Mongolian names and icons', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Check each hour card has the Mongolian name
    for (const hour of ALL_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link.getByText(HOUR_NAMES_MN[hour])).toBeVisible()
    }

    // Check time hints
    await expect(page.getByText('~06:00')).toBeVisible() // lauds
    await expect(page.getByText('~18:00')).toBeVisible() // vespers
  })

  test('shows error for invalid date', async ({ page }) => {
    await page.goto('/?date=invalid')

    await expect(page.getByText('Өгөгдөл олдсонгүй: invalid')).toBeVisible()
  })
})
