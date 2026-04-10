import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Lauds (Morning Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
  })

  test('has correct header with hour name and liturgical info', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Өглөөний залбирал' })).toBeVisible()
    await expect(page.getByText(DATES.ordinaryWeekday)).toBeVisible()
  })

  test('has core sections: invitatory, hymn, psalmody, benedictus, ourFather, dismissal', async ({ page }) => {
    // Invitatory (first hour of day)
    await expect(page.getByText('Нээлтийн залбирал')).toBeVisible()

    // Hymn
    await expect(page.getByText('Магтаал дуу', { exact: true })).toBeVisible()

    // Psalmody (psalm blocks with "Ant." markers)
    await expect(page.locator('text=Ant.').first()).toBeVisible()

    // Gospel Canticle - Benedictus
    await expect(page.getByText('Захариагийн магтаал дуу (Benedictus)')).toBeVisible()

    // Our Father (always present for lauds)
    await expect(page.getByText('Эзэний залбирал', { exact: true })).toBeVisible()

    // Dismissal
    await expect(page.getByText('Эзэн биднийг адислаж')).toBeVisible()
  })

  test('invitatory has versicle and response', async ({ page }) => {
    const invitatory = page.locator('.rounded-lg.bg-stone-100').first()
    await expect(invitatory.getByText('V.')).toBeVisible()
    await expect(invitatory.getByText('R.')).toBeVisible()
  })

  test('back link navigates to homepage with date', async ({ page }) => {
    const backLink = page.getByText('← Бүх цагийн залбирал')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })

  test('has intercessions section', async ({ page }) => {
    await expect(page.getByText('Залбирлын дуудлага')).toBeVisible()
  })

  test('has concluding prayer section', async ({ page }) => {
    await expect(page.getByText('Төгсгөлийн залбирал')).toBeVisible()
  })

  test('bottom back button navigates to homepage', async ({ page }) => {
    const backBtn = page.getByRole('link', { name: 'Буцах' })
    await expect(backBtn).toBeVisible()
    await expect(backBtn).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })
})
