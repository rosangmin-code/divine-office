import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Office of Readings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/officeOfReadings`)
  })

  test('has correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Уншлагын залбирал' })).toBeVisible()
  })

  test('does NOT have invitatory', async ({ page }) => {
    await expect(page.getByText('Нээлтийн залбирал')).not.toBeVisible()
  })

  test('does NOT have gospel canticle', async ({ page }) => {
    await expect(page.getByText('Benedictus')).not.toBeVisible()
    await expect(page.getByText('Magnificat')).not.toBeVisible()
    await expect(page.getByText('Nunc Dimittis')).not.toBeVisible()
  })

  test('does NOT have intercessions or Our Father', async ({ page }) => {
    await expect(page.getByText('Залбирлын дуудлага')).not.toBeVisible()
    await expect(page.getByText('Эзэний залбирал')).not.toBeVisible()
  })

  test('has hymn, psalmody, dismissal', async ({ page }) => {
    await expect(page.getByText('Магтаал дуу', { exact: true })).toBeVisible()
    await expect(page.locator('text=Дуулал').first()).toBeVisible()
    await expect(page.getByText('Эзэн биднийг адислаж')).toBeVisible()
  })
})
