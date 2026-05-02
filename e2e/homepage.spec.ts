import { test, expect } from '@playwright/test'
import { DATES, ALL_HOURS, HOUR_NAMES_MN } from './fixtures/dates'

test.describe('Homepage', () => {
  test('renders with today\'s date by default', async ({ page }) => {
    // Anchor to a known Mon-Fri weekday so the hour-card count is stable
    // (post-#230 F-X5 the count varies: SAT=1, SUN=5, Mon-Fri=3). Without
    // a fixed date the test flakes whenever the test run lands on
    // Saturday or Sunday.
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Title (Mongolian only — no English subtitle)
    await expect(page.getByRole('heading', { name: 'Цагийн Залбирал', exact: true })).toBeVisible()
    await expect(page.getByText('Liturgy of the Hours')).toHaveCount(0)

    // Date input exists
    await expect(page.locator('input[type="date"]')).toBeVisible()

    // Liturgical day info card
    const dayInfoCard = page.locator('.rounded-xl.bg-white.shadow-sm').first()
    await expect(dayInfoCard).toBeVisible()

    // 3 active hour cards (Mon-Fri default — SAT=1, SUN=5 per #230 F-X5)
    const hourLinks = page.locator('a[href*="/pray/"]')
    await expect(hourLinks).toHaveCount(3)
  })

  test('renders correctly for a specific Ordinary Time date', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Season is merged into the heading (genitive form)
    await expect(page.getByText('Жирийн цаг улирлын').first()).toBeVisible()

    // Mongolian liturgical day name — season + week of season (weekday omitted)
    // DATES.ordinaryWeekday = 2026-02-04 (Wednesday, OT Week 4)
    await expect(
      page.getByRole('heading', { name: 'Жирийн цаг улирлын 4-р долоо хоног' }),
    ).toBeVisible()
    await expect(page.getByText(/Ordinary Time|Wednesday of/)).toHaveCount(0)

    // Green color indicator (border-l-4)
    await expect(page.locator('.border-liturgical-green')).toBeVisible()

    // 3 active hour cards link to correct date
    for (const hour of ALL_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link).toBeVisible()
    }
  })

  test('hour cards show correct Mongolian names', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Check each active hour card has the Mongolian name
    for (const hour of ALL_HOURS) {
      const link = page.locator(`a[href="/pray/${DATES.ordinaryWeekday}/${hour}"]`)
      await expect(link.getByText(HOUR_NAMES_MN[hour])).toBeVisible()
    }
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

  // @fr FR-NEW (#230 F-X5)
  test('Saturday card list omits vespers + compline (relocated to Sunday firstVespers/firstCompline)', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinarySaturday}`)

    // Saturday only shows lauds — vespers + compline cards removed.
    const hourLinks = page.locator('a[href*="/pray/"]')
    await expect(hourLinks).toHaveCount(1)
    await expect(
      page.locator(`a[href="/pray/${DATES.ordinarySaturday}/lauds"]`),
    ).toBeVisible()
    await expect(
      page.locator(`a[href="/pray/${DATES.ordinarySaturday}/vespers"]`),
    ).toHaveCount(0)
    await expect(
      page.locator(`a[href="/pray/${DATES.ordinarySaturday}/compline"]`),
    ).toHaveCount(0)
  })

  // @fr FR-NEW (#230 F-X5)
  test('Sunday card list adds firstVespers + firstCompline above lauds', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinarySunday}`)

    const hourLinks = page.locator('a[href*="/pray/"]')
    await expect(hourLinks).toHaveCount(5)
    // All 5 in correct order: firstVespers, firstCompline, lauds, vespers, compline
    for (const hour of ['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline'] as const) {
      await expect(
        page.locator(`a[href="/pray/${DATES.ordinarySunday}/${hour}"]`),
      ).toBeVisible()
    }
  })
})
