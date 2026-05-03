import { test, expect } from '@playwright/test'

test.describe('Error handling', () => {
  test('invalid hour type shows error on prayer page', async ({ page }) => {
    await page.goto('/pray/2026-02-04/matins')
    await expect(page.getByText('Буруу цагийн төрөл: matins')).toBeVisible()
  })

  test('invalid date on homepage shows error', async ({ page }) => {
    await page.goto('/?date=abc')
    await expect(page.getByText('Өгөгдөл олдсонгүй: abc')).toBeVisible()
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
    const response = await page.goto('/pray/2026-06-15/firstVespers')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
  })

  // @fr FR-NEW (#242 F-X5 FU#2)
  test('firstCompline URL on ordinary OT weekday (no celebration) returns 404', async ({ page }) => {
    const response = await page.goto('/pray/2026-06-15/firstCompline')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
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
