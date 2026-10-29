import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// Home first screen — design review by the "3 second rule" (2026-10-28,
// docs/bug-reports/2026-10-28-home-first-screen.md).
//
// FR-184: with a large font setting the first screen must still land on
// today's row with its hours. The settings provider used to write the
// default size onto <html> while hydrating; the one-time scroll to today
// ran in that window and left large-font users weeks above today.
// FR-185: the hour buttons are rows of one flat card, today's row says
// «Өнөөдөр», and the psalter week sits on the date line.
//
// Selectors: data-testid / data-role for structure (CLAUDE.md selector
// principle); Mongolian text only where the wording itself is checked.

const TODAY_ROW = '[data-testid="calendar-row"][data-today="true"]'

for (const size of ['xl', 'xxxl', 'x5l'] as const) {
  // @fr FR-184
  test(`font ${size} — first screen shows today's date line and its first hour`, async ({ page }) => {
    await page.addInitScript((stored) => {
      localStorage.setItem('loth-settings', JSON.stringify({ fontSize: stored }))
      // Every value <html data-font-size> holds during the load. oldValue
      // catches a value that was set and replaced inside one batch.
      const seen: string[] = []
      ;(window as unknown as { __fontSizes: string[] }).__fontSizes = seen
      new MutationObserver((records) => {
        for (const r of records) if (r.oldValue !== null) seen.push(r.oldValue)
      }).observe(document, {
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['data-font-size'],
      })
    }, size)
    await page.goto('/')

    const today = page.locator(TODAY_ROW)
    await expect(today.getByTestId('calendar-row-header')).toBeInViewport()
    await expect(today.locator('[data-role="hour-list"] a').first()).toBeInViewport()

    const seen = await page.evaluate(() => [
      ...(window as unknown as { __fontSizes: string[] }).__fontSizes,
      document.documentElement.dataset.fontSize ?? '',
    ])
    expect(new Set(seen)).toEqual(new Set([size]))
  })
}

// @fr FR-185
test('today row explains its highlight with an «Өнөөдөр» tag', async ({ page }) => {
  await page.goto('/')
  const badge = page.locator(`${TODAY_ROW} [data-role="today-badge"]`)
  await expect(badge).toHaveText('Өнөөдөр')
  await expect(badge).toBeInViewport()
  await expect(page.locator('[data-role="today-badge"]')).toHaveCount(1)
})

// @fr FR-185
test('hours are rows of one flat card; the psalter week sits on the date line', async ({ page }) => {
  await page.goto(`/?date=${DATES.ordinaryWeekday}`)
  const row = page.locator(`[data-testid="calendar-row"][data-date="${DATES.ordinaryWeekday}"]`)
  const list = row.locator('[data-role="hour-list"]')
  await expect(list).toHaveCount(1)
  const links = list.locator('a[href*="/pray/"]')
  await expect(links).toHaveCount(3)
  for (const shadow of await links.evaluateAll((els) => els.map((el) => getComputedStyle(el).boxShadow))) {
    expect(shadow).toBe('none')
  }

  // Only the part that tells the hours apart is bold.
  const lead = links.first().locator('h3 > span')
  await expect(lead).toHaveText('Өглөөний')
  expect(Number(await lead.evaluate((el) => getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(600)
  expect(Number(await links.first().locator('h3').evaluate((el) => getComputedStyle(el).fontWeight))).toBeLessThan(600)

  // The psalter week moved from a caption above the hours into the
  // row's toggle, next to the date.
  await expect(
    row.getByTestId('calendar-row-toggle').getByText('Дуулалтын IV', { exact: true }),
  ).toBeVisible()
})
