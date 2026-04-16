import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DATES } from './fixtures/dates'

test.describe('Prayer section detail rendering', () => {
  test.describe('Psalm block structure', () => {
    test('psalm has antiphon, reference header, and Gloria Patri', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      // Antiphon markers (rendered as italic amber text via AntiphonBox)
      const antiphons = page.locator('[data-role="antiphon"]')
      expect(await antiphons.count()).toBeGreaterThanOrEqual(2)
      await expect(antiphons.first()).toBeVisible()

      // Psalm reference h4 header (one per psalm block)
      const refHeaders = page.locator('h4')
      expect(await refHeaders.count()).toBeGreaterThan(0)

      // Gloria Patri text
      await expect(page.getByText('Эцэг, Хүү, Ариун Сүнсэнд жавхланг').first()).toBeVisible()
    })

    test('Psalm 119 sub-sections in psalter-texts have distinct content (FR-124)', async () => {
      // psalter-texts.json must not assign the same body to multiple sub-ranges
      // of Psalm 119. The extractor was previously matching on chapter alone,
      // which made every "Psalm 119:X-Y" inherit the same wrong content.
      const file = path.resolve(__dirname, '../src/data/loth/psalter-texts.json')
      const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, { stanzas: string[][] }>
      const sections = Object.keys(data).filter((k) => k.startsWith('Psalm 119:'))
      // We expect at least the sub-sections that have distinct headers in the
      // PDF source (Дуулал 119:105-112 and Дуулал 119:145-152) to be present
      // and to differ from one another.
      expect(sections.length).toBeGreaterThanOrEqual(2)
      const firsts = sections.map((k) => data[k].stanzas[0]?.[0] ?? '')
      const unique = new Set(firsts)
      expect(unique.size).toBe(sections.length)
    })
  })

  test.describe('Hymn section', () => {
    test('hymn renders label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()
    })
  })

  test.describe('Our Father section', () => {
    test('contains the full prayer text', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      const ourFather = page.locator('[aria-label="Эзэний даатгал залбирал"]')
      await expect(ourFather.getByText('Эзэний даатгал залбирал', { exact: true })).toBeVisible()
      await expect(ourFather.getByText(/Тэнгэр дэх Эцэг минь ээ/)).toBeVisible()
    })
  })

  test.describe('Dismissal section', () => {
    test('is rendered with section label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      const dismissal = page.locator('[aria-label="Илгээлт"]').last()
      await expect(dismissal).toBeVisible()
      await expect(dismissal.getByText('Төгсгөл', { exact: true })).toBeVisible()
    })
  })

  test.describe('Gospel canticle text fidelity (PDF source)', () => {
    test('Benedictus uses PDF text, not Bible JSONL', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const canticle = page.locator('[aria-label="Захариагийн магтаал"]')
      // PDF: "Тэнгэрбурхан Эзэн магтагдах болтугай" (not "Бурхан Эзэн магтагдаг" from Bible JSONL)
      await expect(canticle.getByText('Тэнгэрбурхан Эзэн магтагдах болтугай')).toBeVisible()
    })

    test('Magnificat uses PDF text, not Bible JSONL', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
      const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
      // PDF: "Аврагч Тэнгэрбурханд баяссан" (not "Аврагч Бурхандаа баясна" from Bible JSONL)
      await expect(canticle.getByText('Аврагч Тэнгэрбурханд баяссан')).toBeVisible()
    })

    test('Nunc Dimittis uses PDF text, not Bible JSONL', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
      const canticle = page.locator('[aria-label="Сайнмэдээний айлдлын магтаал"]')
      // PDF: "амар амгалангаар эдүгээ чөлөөлтүгэй" (not "амар тайван явуултугай" from Bible JSONL)
      await expect(canticle.getByText('амар амгалангаар эдүгээ чөлөөлтүгэй')).toBeVisible()
    })

    test('Benedictus includes doxology', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const canticle = page.locator('[aria-label="Захариагийн магтаал"]')
      await expect(canticle.getByText('Эцэг, Хүү, Ариун Сүнсэнд жавхланг')).toBeVisible()
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
