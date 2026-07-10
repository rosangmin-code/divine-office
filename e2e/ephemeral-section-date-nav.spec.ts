import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const EASTER_COMPLINE = '2026-04-29'
const ORDINARY_COMPLINE = '2026-08-12'

const REGINA_CAELI_TITLE = 'Тэнгэрийн Хатан'
const SALVE_REGINA_TITLE = 'Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу'

// #68 (FR-164) — PrayerFooter 의 Огноо 메뉴가 제거되어(설정만 남음), 날짜
// 홈으로의 회귀는 상단 back 링크로 수행한다. destination(`/?date=...`) 동일.
async function navigateBackToDateHome(page: import('@playwright/test').Page) {
  await page.locator('[aria-label="Бүх цагийн залбирлууд руу буцах"]').click()
}

test.describe('WI-83 multi-candidate section date navigation reset', () => {
  test('Easter compline Marian selection does not persist into Ordinary Time compline', async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message)
    })

    await page.goto(`/pray/${EASTER_COMPLINE}/compline`)
    await expect(page.getByRole('heading', { name: 'Шөнийн даатгал залбирал' })).toBeVisible()
    await expect(page.getByText(REGINA_CAELI_TITLE).first()).toBeVisible()

    await navigateBackToDateHome(page)
    await expect(page).toHaveURL(new RegExp(`/\\?date=${EASTER_COMPLINE}`))

    await page.goto(`/?date=${ORDINARY_COMPLINE}`)
    const targetRow = page.locator(
      `[data-testid="calendar-row"][data-date="${ORDINARY_COMPLINE}"]`,
    )
    await expect(targetRow).toBeVisible()
    const targetRowBody = targetRow.locator('[data-testid="calendar-row-body"]')
    if (!(await targetRowBody.isVisible())) {
      await targetRow.locator('[data-testid="calendar-row-toggle"]').click()
    }
    await targetRow.getByRole('link', { name: 'Шөнийн даатгал залбирал' }).click()

    await expect(page).toHaveURL(new RegExp(`/pray/${ORDINARY_COMPLINE}/compline`))
    await expect(page.getByRole('heading', { name: 'Шөнийн даатгал залбирал' })).toBeVisible()
    await expect(page.getByText(SALVE_REGINA_TITLE).first()).toBeVisible()
    await expect(page.getByText(REGINA_CAELI_TITLE)).toHaveCount(0)

    const screenshotPath = path.join(
      process.env.HOME ?? '.',
      '.claude/pair-cowork/scratch/dvo/wi-83-ordinary-compline-marian-reset.png',
    )
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true })
    const screenshot = await page.screenshot({ fullPage: true, path: screenshotPath })
    await testInfo.attach('wi-83-ordinary-compline-marian-reset', {
      body: screenshot,
      contentType: 'image/png',
    })
    expect(consoleErrors).toEqual([])
  })
})
