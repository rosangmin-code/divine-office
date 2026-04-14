import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Lauds (Morning Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
  })

  test('has correct header with hour name and liturgical info', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
    await expect(page.getByText(DATES.ordinaryWeekday)).toBeVisible()
  })

  test('has core sections: invitatory, hymn, psalmody, benedictus, ourFather, dismissal', async ({ page }) => {
    // Invitatory (first hour of day)
    await expect(page.locator('[aria-label="Урих дуудлага"]')).toBeVisible()

    // Hymn
    await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()

    // Psalmody (antiphon markers around psalm blocks)
    await expect(page.locator('[data-role="antiphon"]').first()).toBeVisible()

    // Gospel Canticle - Benedictus
    await expect(page.locator('[aria-label="Захариагийн магтаал"]')).toBeVisible()

    // Our Father (always present for lauds)
    await expect(page.getByText('Эзэний даатгал залбирал', { exact: true })).toBeVisible()

    // Dismissal
    await expect(page.locator('[aria-label="Илгээлт"]')).toBeVisible()
  })

  test('invitatory has versicle and response', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const invitatory = body.sections.find((s: { type: string }) => s.type === 'invitatory')
    expect(invitatory).toBeTruthy()
    expect(invitatory.versicle).toBeTruthy()
    expect(invitatory.response).toBeTruthy()
  })

  test('back link navigates to homepage with date', async ({ page }) => {
    const backLink = page.getByText('← Бүх цагийн залбирал')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })

  test('has intercessions section', async ({ page }) => {
    await expect(page.getByText('Гүйлтын залбирал')).toBeVisible()
  })

  test('has concluding prayer section', async ({ page }) => {
    await expect(page.getByText('Төгсгөлийн даатгал залбирал')).toBeVisible()
  })

  test('bottom back button navigates to homepage', async ({ page }) => {
    const backBtn = page.getByRole('link', { name: 'Буцах', exact: true })
    await expect(backBtn).toBeVisible()
    await expect(backBtn).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })
})
