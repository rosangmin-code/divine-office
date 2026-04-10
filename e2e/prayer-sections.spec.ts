import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Prayer section detail rendering', () => {
  test.describe('Psalm block structure', () => {
    test('psalm has antiphon, reference, verses, Gloria Patri', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      // Antiphon markers (amber background) with "Ant." prefix
      const antiphons = page.locator('.bg-amber-50')
      expect(await antiphons.count()).toBeGreaterThanOrEqual(2)
      await expect(page.locator('.bg-amber-50 >> text=Ant.').first()).toBeVisible()

      // Psalm reference header (e.g., "Psalm 63:2-9")
      const refHeaders = page.locator('h4.text-sm.font-semibold.text-stone-600')
      expect(await refHeaders.count()).toBeGreaterThan(0)

      // Verse numbers as superscript
      const sups = page.locator('sup.text-xs.text-stone-400')
      expect(await sups.count()).toBeGreaterThan(0)

      // Gloria Patri text
      await expect(page.getByText('Эцэг, Хүү, Ариун Сүнсэнд алдар байх болтугай.').first()).toBeVisible()
    })
  })

  test.describe('Hymn section', () => {
    test('hymn renders label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.getByText('Магтуу', { exact: true })).toBeVisible()
    })
  })

  test.describe('Our Father section', () => {
    test('contains the full prayer text', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      await expect(page.getByText('Эзэний даатгал залбирал', { exact: true })).toBeVisible()
      await expect(page.getByText('Тэнгэр дэх Эцэг маань')).toBeVisible()
    })
  })

  test.describe('Dismissal section', () => {
    test('has blessing and amen', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      await expect(page.getByText('Эзэн биднийг адислаж')).toBeVisible()
      const dismissal = page.locator('.rounded-lg.bg-stone-100').last()
      await expect(dismissal.getByText('Амэн.')).toBeVisible()
    })
  })

  test.describe('Short reading and responsory (required for Lauds)', () => {
    test('short reading is always present with ref and verses', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const types = body.sections.map((s: { type: string }) => s.type)

      // shortReading is required — psalter commons guarantee it
      expect(types).toContain('shortReading')
      const reading = body.sections.find((s: { type: string }) => s.type === 'shortReading')
      expect(reading).toHaveProperty('ref')
      expect(reading).toHaveProperty('verses')
    })

    test('responsory is always present with versicle and response', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const types = body.sections.map((s: { type: string }) => s.type)

      // responsory is required — psalter commons guarantee it
      expect(types).toContain('responsory')
      const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
      expect(resp).toHaveProperty('versicle')
      expect(resp).toHaveProperty('response')
    })
  })
})
