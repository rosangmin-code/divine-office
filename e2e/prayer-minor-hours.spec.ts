import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

for (const hour of ['terce', 'sext', 'none'] as const) {
  test.describe(`${hour.charAt(0).toUpperCase() + hour.slice(1)} (minor hour) page`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/${hour}`)
    })

    test('does NOT have invitatory', async ({ page }) => {
      await expect(page.getByText('Нээлтийн залбирал')).not.toBeVisible()
    })

    test('does NOT have gospel canticle', async ({ page }) => {
      await expect(page.getByText('Benedictus')).not.toBeVisible()
      await expect(page.getByText('Magnificat')).not.toBeVisible()
      await expect(page.getByText('Nunc Dimittis')).not.toBeVisible()
    })

    test('does NOT have intercessions', async ({ page }) => {
      await expect(page.getByText('Гүйлтын залбирал')).not.toBeVisible()
    })

    test('does NOT have Our Father', async ({ page }) => {
      await expect(page.getByText('Эзэний даатгал залбирал')).not.toBeVisible()
    })

    test('has hymn, psalmody, dismissal', async ({ page }) => {
      await expect(page.getByText('Магтуу', { exact: true })).toBeVisible()
      await expect(page.locator('text=Дуулал').first()).toBeVisible()
      await expect(page.getByText('Эзэн биднийг адислаж')).toBeVisible()
    })
  })
}
