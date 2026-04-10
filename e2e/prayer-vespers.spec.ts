import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Vespers (Evening Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
  })

  test('has correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Оройн залбирал' })).toBeVisible()
  })

  test('does NOT have invitatory', async ({ page }) => {
    await expect(page.getByText('Нээлтийн залбирал')).not.toBeVisible()
  })

  test('has Magnificat gospel canticle', async ({ page }) => {
    await expect(page.getByText('Мариагийн магтаал дуу (Magnificat)')).toBeVisible()
  })

  test('has Our Father (always present for vespers)', async ({ page }) => {
    await expect(page.getByText('Эзэний залбирал', { exact: true })).toBeVisible()
  })

  test('has hymn, psalmody, dismissal', async ({ page }) => {
    await expect(page.getByText('Магтаал дуу', { exact: true })).toBeVisible()
    await expect(page.locator('text=Ant.').first()).toBeVisible()
    await expect(page.getByText('Эзэн биднийг адислаж')).toBeVisible()
  })

  test('has intercessions section', async ({ page }) => {
    await expect(page.getByText('Залбирлын дуудлага')).toBeVisible()
  })

  test('has concluding prayer section', async ({ page }) => {
    await expect(page.getByText('Төгсгөлийн залбирал')).toBeVisible()
  })
})
