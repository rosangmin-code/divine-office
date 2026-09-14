import { test, expect, type Page } from '@playwright/test'
import { DATES } from './fixtures/dates'

// 2026-09-14 — 홈의 일별 "Өмнөх өдөр / Дараа өдөр" 링크는 월 캘린더 리스트
// (FR-145 / GOAL #4) 도입으로 사라졌고, 날짜 이동은 MonthNav 의 prev/next
// 버튼(`?month=YYYY-MM` push) 으로만 이뤄진다. 옛 일별 단언을 삭제하는
// 대신 같은 의도(이전/다음 이동, 연도 경계, 연속 이동)를 월 단위로 옮겼다.
// `?date=` 로 진입하면 그 달이 렌더되므로 옛 앵커 날짜를 그대로 쓴다.

function monthLabel(page: Page) {
  return page.locator('[data-testid="month-nav-label-text"]')
}

/** Click prev/next; `?date=` deep-links auto-scroll the focus row into
 *  view, so bring the nav back into the viewport before clicking. */
async function clickMonthNav(page: Page, dir: 'prev' | 'next') {
  const btn = page.locator(`[data-testid="month-nav-${dir}"]`)
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
}

test.describe('Date navigation', () => {
  test('previous day link navigates correctly', async ({ page }) => {
    // 2026-02-04 → prev = January 2026
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(monthLabel(page)).toHaveText('2026 оны 2-р сар')
    await clickMonthNav(page, 'prev')
    await expect(page).toHaveURL(/\/\?month=2026-01$/)
    await expect(monthLabel(page)).toHaveText('2026 оны 1-р сар')
    await expect(
      page.locator('[data-testid="calendar-row"][data-row-kind="date"][data-date="2026-01-31"]'),
    ).toHaveCount(1)
  })

  test('next day link navigates correctly', async ({ page }) => {
    // 2026-02-04 → next = March 2026
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await clickMonthNav(page, 'next')
    await expect(page).toHaveURL(/\/\?month=2026-03$/)
    await expect(monthLabel(page)).toHaveText('2026 оны 3-р сар')
    await expect(
      page.locator('[data-testid="calendar-row"][data-row-kind="date"][data-date="2026-03-01"]'),
    ).toHaveCount(1)
  })

  test('year boundary: Dec 31 → Jan 1', async ({ page }) => {
    // December 2025 → next = January 2026 (year rolls over)
    await page.goto(`/?date=${DATES.newYearsEve}`)
    await expect(monthLabel(page)).toHaveText('2025 оны 12-р сар')
    await clickMonthNav(page, 'next')
    await expect(page).toHaveURL(/\/\?month=2026-01$/)
    await expect(monthLabel(page)).toHaveText('2026 оны 1-р сар')
    await expect(
      page.locator('[data-testid="calendar-row"][data-row-kind="date"][data-date="2026-01-01"]'),
    ).toHaveCount(1)
  })

  test('year boundary: Jan 1 → Dec 31', async ({ page }) => {
    // January 2026 → prev = December 2025 (year rolls back)
    await page.goto(`/?date=${DATES.newYearsDay}`)
    await expect(monthLabel(page)).toHaveText('2026 оны 1-р сар')
    await clickMonthNav(page, 'prev')
    await expect(page).toHaveURL(/\/\?month=2025-12$/)
    await expect(monthLabel(page)).toHaveText('2025 оны 12-р сар')
    await expect(
      page.locator('[data-testid="calendar-row"][data-row-kind="date"][data-date="2025-12-31"]'),
    ).toHaveCount(1)
  })

  test('multiple consecutive navigations', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)

    // Click next 3 times, waiting for each navigation
    await clickMonthNav(page, 'next')
    await expect(page).toHaveURL(/\/\?month=2026-03$/)
    await clickMonthNav(page, 'next')
    await expect(page).toHaveURL(/\/\?month=2026-04$/)
    await clickMonthNav(page, 'next')
    await expect(page).toHaveURL(/\/\?month=2026-05$/)
    await expect(monthLabel(page)).toHaveText('2026 оны 5-р сар')
  })
})
