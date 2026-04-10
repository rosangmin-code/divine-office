import { test, expect } from '@playwright/test'
import { DATES, ACTIVE_HOURS, HOUR_NAMES_MN } from './fixtures/dates'

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

    // 3 active hour cards
    const hourLinks = page.locator('a[href*="/pray/"]')
    await expect(hourLinks).toHaveCount(3)
  })

  test('renders correctly for a specific Ordinary Time date', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Season text
    await expect(page.getByText('Жирийн цаг улирал')).toBeVisible()

    // Green color indicator (border-l-4)
    await expect(page.locator('.border-liturgical-green')).toBeVisible()

    // 3 active hour cards link to correct date
    for (const hour of ACTIVE_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link).toBeVisible()
    }
  })

  test('hour cards show correct Mongolian names and time hints', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Check each active hour card has the Mongolian name
    for (const hour of ACTIVE_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link.getByText(HOUR_NAMES_MN[hour])).toBeVisible()
    }

    // Check time hints
    await expect(page.getByText('~06:00')).toBeVisible() // lauds
    await expect(page.getByText('~18:00')).toBeVisible() // vespers
    await expect(page.getByText('~21:00')).toBeVisible() // compline
  })

  test('shows "Өнөөдөр" button when viewing non-today date', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Should show "Өнөөдөр" (Today) button since we're not on today's date
    await expect(page.getByText('Өнөөдөр')).toBeVisible()
  })

  test('shows error for invalid date', async ({ page }) => {
    await page.goto('/?date=invalid')

    await expect(page.getByText('Өгөгдөл олдсонгүй: invalid')).toBeVisible()
  })
})
