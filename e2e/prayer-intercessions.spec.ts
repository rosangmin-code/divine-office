import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Intercessions (Гүйлтын залбирал) role structure', () => {
  test.describe('API parsed fields', () => {
    test('psalter commons: lauds exposes refrain + petitions with responses', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(Array.isArray(intercessions.petitions)).toBe(true)
      expect(intercessions.petitions.length).toBeGreaterThan(0)
      expect(intercessions.refrain).toBeTruthy()
      // 도입부가 ":"로 끝나지 않는다
      if (intercessions.introduction) {
        expect(intercessions.introduction.trim().endsWith(':')).toBe(false)
      }
      // 최소 하나의 petition에 응답이 존재한다
      const withResponse = intercessions.petitions.filter((p: { response?: string }) => Boolean(p.response))
      expect(withResponse.length).toBeGreaterThan(0)
    })

    test('seasonal propers: Advent weekday vespers parses em-dash petitions', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.adventWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(intercessions.petitions.length).toBeGreaterThan(0)
      // advent 포맷은 refrain이 도입부와 같은 줄에 있으므로 분리되어 있어야 한다
      expect(intercessions.refrain).toBeTruthy()
      // 모든 petition에 versicle과 response가 있어야 한다 (em-dash 포맷)
      for (const p of intercessions.petitions) {
        expect(p.versicle).toBeTruthy()
        expect(p.response).toBeTruthy()
      }
    })

    test('raw items field is preserved for backwards compatibility', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions.items).toBeInstanceOf(Array)
      expect(intercessions.items.length).toBeGreaterThan(0)
    })
  })

  test.describe('UI rendering', () => {
    test('refrain is visually separated from petitions', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.getByText('Гүйлтын залбирал')).toBeVisible()

      const refrain = page.locator('[data-role="intercessions-refrain"]').first()
      await expect(refrain).toBeVisible()
    })

    test('each petition splits versicle and response into separate DOM nodes', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const petitions = page.locator('[data-role="intercessions-petition"]')
      const count = await petitions.count()
      expect(count).toBeGreaterThan(0)

      // 최소 하나의 petition이 응답 DOM 노드를 가진다
      const responseNodes = page.locator('[data-role="intercessions-response"]')
      const respCount = await responseNodes.count()
      expect(respCount).toBeGreaterThan(0)
    })

    test('response is prefixed with a red dash', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const responseNodes = page.locator('[data-role="intercessions-response"]')
      await expect(responseNodes.first()).toContainText('-')
    })
  })
})
