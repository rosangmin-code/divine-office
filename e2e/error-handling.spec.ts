import { test, expect } from '@playwright/test'

test.describe('Error handling', () => {
  test('invalid hour type returns 404 on prayer page', async ({ page }) => {
    // 이전 동작: page.tsx 가 "Буруу цагийн төрөл: matins" 평문을 200 으로 렌더
    // (뒤로 가는 링크 없음 — app-review 2026-09-13 §2 HTTP 스모크). 현재는
    // 세그먼트 layout.tsx 가 notFound() 를 올려 상태코드 404 + 공용
    // not-found UI (홈 링크 포함).
    const response = await page.goto('/pray/2026-02-04/matins')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
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
    // 날짜가 `isValidDateStr` 를 통과하지 못하면 세그먼트 `layout.tsx` 가
    // `notFound()` 를 호출 → Next.js 404 라우트 (`app/not-found.tsx`) 렌더.
    // layout 은 `loading.tsx` Suspense 경계 바깥이라 상태코드도 404 다.
    const response = await page.goto('/pray/invalid/lauds')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
  })

  test('impossible calendar date on prayer page shows 404', async ({ page }) => {
    // 2026 은 윤년이 아니라 02-29 가 존재하지 않는다 (`isValidDateStr` 의
    // Date.UTC round-trip 이 걸러낸다). app-review §2 에서 200 으로 보고된 URL.
    const response = await page.goto('/pray/2026-02-29/lauds')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
  })

  test('out-of-range PDF page returns 404', async ({ page }) => {
    // `/pdf/[page]` 는 1..969 범위 밖이면 notFound(). 루트 `loading.tsx` 가
    // 앱 전체를 Suspense 로 감싸던 동안에는 200 이었고, 홈 스켈레톤을
    // `(home)` 라우트 그룹으로 옮겨 경계를 홈에만 한정하면서 404 가 됐다.
    for (const path of ['/pdf/0', '/pdf/970', '/pdf/abc']) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
    }
  })

  test('valid PDF page still returns 200', async ({ page }) => {
    const response = await page.goto('/pdf/58')
    expect(response?.status()).toBe(200)
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
    // 2026-09-17: the gate moved from the page body to the segment
    // `layout.tsx`, which renders outside the `loading.tsx` Suspense
    // boundary — so the HTTP status is now a real 404, not the streamed 200
    // this test used to tolerate (app-review §2 HTTP smoke).
    const response = await page.goto('/pray/2026-06-15/firstVespers')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Хуудас олдсонгүй')).toBeVisible()
    await expect(page.locator('article')).toHaveCount(0)
  })

  // @fr FR-NEW (#242 F-X5 FU#2)
  test('firstCompline URL on ordinary OT weekday (no celebration) returns 404', async ({ page }) => {
    const response = await page.goto('/pray/2026-06-15/firstCompline')
    expect(response?.status()).toBe(404)
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
