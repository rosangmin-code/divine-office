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
})
