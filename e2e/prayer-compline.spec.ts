import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Compline (Night Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
  })

  test('has correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Шөнийн залбирал' })).toBeVisible()
  })

  test('does NOT have invitatory', async ({ page }) => {
    await expect(page.getByText('Нээлтийн залбирал')).not.toBeVisible()
  })

  test('has Nunc Dimittis gospel canticle', async ({ page }) => {
    await expect(page.getByText('Симеоны магтаал дуу (Nunc Dimittis)')).toBeVisible()
  })

  test('does NOT have intercessions', async ({ page }) => {
    await expect(page.getByText('Залбирлын дуудлага')).not.toBeVisible()
  })

  test('does NOT have Our Father', async ({ page }) => {
    await expect(page.getByText('Эзэний залбирал')).not.toBeVisible()
  })

  test('has hymn, psalmody, blessing', async ({ page }) => {
    await expect(page.getByText('Магтаал дуу', { exact: true })).toBeVisible()
    await expect(page.locator('text=Дуулал').first()).toBeVisible()
    // Compline uses "Адислал" (blessing) instead of standard dismissal
    await expect(page.getByText('Адислал')).toBeVisible()
  })

  test('fixed weekly cycle: same day-of-week has same psalms across different psalter weeks', async ({ page }) => {
    // Get psalm references from one Wednesday
    const psalmRefs1: string[] = []
    const refs1 = page.locator('h4.text-sm.font-semibold.text-stone-600')
    const count1 = await refs1.count()
    for (let i = 0; i < count1; i++) {
      const text = await refs1.nth(i).textContent()
      if (text && text.includes('Psalm')) {
        psalmRefs1.push(text)
      }
    }

    // Navigate to another Wednesday in a different psalter week
    await page.goto(`/pray/${DATES.lentWeekday}/compline`)
    const psalmRefs2: string[] = []
    const refs2 = page.locator('h4.text-sm.font-semibold.text-stone-600')
    const count2 = await refs2.count()
    for (let i = 0; i < count2; i++) {
      const text = await refs2.nth(i).textContent()
      if (text && text.includes('Psalm')) {
        psalmRefs2.push(text)
      }
    }

    expect(psalmRefs1).toEqual(psalmRefs2)
  })
})
