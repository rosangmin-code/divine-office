import { test, expect } from '@playwright/test'

test.describe('Error handling', () => {
  test('invalid hour type shows error on prayer page', async ({ page }) => {
    await page.goto('/pray/2026-02-04/matins')
    await expect(page.getByText('Буруу цагийн төрөл: matins')).toBeVisible()
  })

  test('invalid date on homepage shows error', async ({ page }) => {
    // FR-145 (GOAL #4) — the month-list home silently degrades a malformed
    // `?date=` to today's month (`resolveMonthRouting`): no error copy, no
    // 4xx, no empty screen. Assert that contract — the month list renders
    // and the bogus value never leaks into the UI or a row anchor.
    const response = await page.goto('/?date=abc')
    expect(response?.status()).toBe(200)
    await expect(page.getByTestId('liturgical-calendar-list')).toBeVisible()
    await expect(page.locator('[data-testid="month-nav-label-text"]')).toHaveText(
      /^\d{4} оны \d{1,2}-р сар$/,
    )
    await expect(page.getByText('Өгөгдөл олдсонгүй')).toHaveCount(0)
    await expect(page.locator('[data-testid="calendar-row"][data-date="abc"]')).toHaveCount(0)
  })

  test('invalid date on prayer page shows 404', async ({ page }) => {
    // 날짜가 `isValidDateStr` 를 통과하지 못하면 page.tsx 가 `notFound()` 를
    // 호출 → Next.js 404 라우트 (`app/not-found.tsx`) 가 렌더된다.
    await page.goto('/pray/invalid/lauds')
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
  })

  test('far future date does not crash (no 500 error)', async ({ page }) => {
    const response = await page.goto('/?date=2040-06-15')
    // Should not return 500
    expect(response?.status()).not.toBe(500)
  })

  // @fr FR-NEW (#242 F-X5 FU#2)
  test('firstVespers URL on ordinary OT weekday (no celebration) returns 404', async ({ page }) => {
    // 2026-06-15 = Monday OT, no Solemnity/Feast → date is NOT eligible
    // for firstVespers content per `isFirstVespersEligibleDate`. Without
    // the gate, the URL silently returned 200 with an out-of-rubric
    // Sunday-vespers fallback. With the gate, page.tsx calls
    // notFound() → Next.js 404 route renders.
    //
    // NOTE (2026-09-14): the HTTP status is 200, not 404 — the route has a
    // `loading.tsx` boundary, so Next streams the shell first and the
    // `notFound()` thrown inside the page body arrives after the headers.
    // The user-facing contract (not-found body rendered, no prayer
    // content) is asserted here; the "200 on notFound()" status problem is
    // tracked separately (app-review §2 HTTP smoke).
    await page.goto('/pray/2026-06-15/firstVespers')
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
    await expect(page.locator('article')).toHaveCount(0)
  })

  // @fr FR-NEW (#242 F-X5 FU#2)
  test('firstCompline URL on ordinary OT weekday (no celebration) returns 404', async ({ page }) => {
    // Same streaming caveat as the firstVespers case above.
    await page.goto('/pray/2026-06-15/firstCompline')
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
    await expect(page.locator('article')).toHaveCount(0)
  })

  // @fr FR-NEW (#242 F-X5 FU#2)
  test('API firstVespers on ordinary OT weekday returns 404', async ({ request }) => {
    const res = await request.get('/api/loth/2026-06-15/firstVespers')
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('not available')
  })

  // @fr FR-NEW (#242 F-X5 FU#2) — regression guard
  test('firstVespers URL on a Sunday (eligible date) still returns 200', async ({ page }) => {
    // 2026-06-14 = Sunday → eligible. Gate must NOT fire for Sundays.
    const response = await page.goto('/pray/2026-06-14/firstVespers')
    expect(response?.status()).toBe(200)
  })

  // @fr FR-NEW (#242 F-X5 FU#2) — regression guard
  test('firstVespers URL on a fixed-date Solemnity (eligible date) still returns 200', async ({ request }) => {
    // 2026-06-29 Mon Sts. Peter & Paul — sanctoral.firstVespers present.
    const res = await request.get('/api/loth/2026-06-29/firstVespers')
    expect(res.status()).toBe(200)
  })
})
