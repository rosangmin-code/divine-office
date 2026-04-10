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

  test('invalid date on prayer page shows error', async ({ page }) => {
    await page.goto('/pray/invalid/lauds')
    await expect(page.getByText('Өгөгдөл олдсонгүй: invalid')).toBeVisible()
  })

  test('far future date does not crash (no 500 error)', async ({ page }) => {
    const response = await page.goto('/?date=2040-06-15')
    // Should not return 500
    expect(response?.status()).not.toBe(500)
  })
})
