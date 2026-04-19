import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Lauds (Morning Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
  })

  test('has correct header with hour name and liturgical info', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
    // Date line uses dotted ISO format (2026.02.04) followed by the Mongolian weekday
    await expect(page.getByText(DATES.ordinaryWeekday.replaceAll('-', '.'))).toBeVisible()
  })

  test('has core sections: invitatory, hymn, psalmody, benedictus, ourFather, dismissal', async ({ page }) => {
    // Invitatory (first hour of day) — replaces the opening versicle per GILH §266
    await expect(page.locator('[aria-label="Урих дуудлага"]')).toBeVisible()

    // Opening Versicle (Удиртгал) is paired as a collapse fallback — visible
    // by default since invitatoryCollapsed defaults to true
    await expect(page.locator('[aria-label="Удиртгал"]')).toBeVisible()

    // Hymn
    await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()

    // Psalmody (antiphon markers around psalm blocks)
    await expect(page.locator('[data-role="antiphon"]').first()).toBeVisible()

    // Gospel Canticle - Benedictus
    await expect(page.locator('[aria-label="Захариагийн магтаал"]')).toBeVisible()

    // Our Father (always present for lauds)
    await expect(page.getByText('Эзэний даатгал залбирал', { exact: true })).toBeVisible()

    // Dismissal
    await expect(page.locator('[aria-label="Төгсгөл"]')).toBeVisible()
  })

  test('invitatory has versicle and response', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const invitatory = body.sections.find((s: { type: string }) => s.type === 'invitatory')
    expect(invitatory).toBeTruthy()
    expect(invitatory.versicle).toBeTruthy()
    expect(invitatory.response).toBeTruthy()
  })

  test('openingVersicle is paired with invitatory (collapse fallback, GILH §266)', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const types = body.sections.map((s: { type: string }) => s.type)
    expect(types[0]).toBe('invitatory')
    expect(types[1]).toBe('openingVersicle')
    const ov = body.sections.find((s: { type: string }) => s.type === 'openingVersicle')
    expect(ov.pairedWithInvitatory).toBe(true)
  })

  test('back link navigates to homepage with date', async ({ page }) => {
    const backLink = page.getByText('← Бүх цагийн залбирал')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })

  test('has intercessions section', async ({ page }) => {
    await expect(page.getByText('Гуйлтын залбирал')).toBeVisible()
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

test.describe('Invitatory collapse toggle', () => {
  test('초대송은 기본적으로 접혀 있다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await expect(section).toBeVisible()
    await expect(section.locator('#invitatory-body')).toHaveCount(0)
    const toggle = section.getByRole('button', { name: 'Урих дуудлага дэлгэх' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('토글 클릭 시 초대송 본문이 펼쳐진다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await section.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await expect(section.locator('#invitatory-body')).toBeVisible()
    await expect(section.getByRole('button', { name: 'Урих дуудлага хураах' })).toHaveAttribute('aria-expanded', 'true')
    await expect(section.getByText(/Дуулал/)).toBeVisible()
  })

  test('새로고침 후에도 펼침 상태가 유지된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await page
      .locator('[aria-label="Урих дуудлага"]')
      .getByRole('button', { name: 'Урих дуудлага дэлгэх' })
      .click()
    await page.reload()
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await expect(section.locator('#invitatory-body')).toBeVisible()
    await expect(section.getByRole('button', { name: 'Урих дуудлага хураах' })).toHaveAttribute('aria-expanded', 'true')
  })

  test('초대송이 접혀 있을 때 Удиртгал(도입부)이 대체 표시된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(page.locator('[aria-label="Удиртгал"]')).toBeVisible()
  })

  test('초대송을 펼치면 Удиртгал이 숨겨지고, 다시 접으면 돌아온다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    const opening = page.locator('[aria-label="Удиртгал"]')

    await expect(opening).toBeVisible()

    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await expect(opening).toHaveCount(0)

    await invitatory.getByRole('button', { name: 'Урих дуудлага хураах' }).click()
    await expect(opening).toBeVisible()
  })
})
