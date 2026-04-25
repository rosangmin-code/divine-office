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

    test('psalm-concluding prayer renders when data is present (FR-132)', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

      const prayers = page.locator('[data-role="psalm-prayer"]')
      const count = await prayers.count()
      expect(count).toBeGreaterThanOrEqual(1)

      const first = prayers.first()
      await expect(first).toBeVisible()
      await expect(first).toContainText('Дууллыг төгсгөх залбирал')

      // The prayer body paragraph must be non-empty and distinct from the header.
      const bodyText = await first.locator('p').nth(1).textContent()
      expect((bodyText ?? '').trim().length).toBeGreaterThan(30)
    })

    test('psalm-concluding prayer hidden when psalmPrayerCollapsed toggle is on (FR-032)', async ({ page, context }) => {
      await context.clearCookies()

      // Baseline: default toggle off → prayers visible.
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()

      // Enable collapse via /settings.
      await page.goto('/settings')
      await page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ }).click()

      // Prayers must disappear from the pray page.
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.locator('[data-role="psalm-prayer"]')).toHaveCount(0)

      // Toggle back off → prayers return.
      await page.goto('/settings')
      await page.getByRole('switch', { name: /Дууллыг төгсгөх залбирал/ }).click()
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.locator('[data-role="psalm-prayer"]').first()).toBeVisible()
    })
  })

  test.describe('Hymn section', () => {
    test('hymn renders label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()
    })

    test('hymn candidate menu button is visible', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const btn = page.getByRole('button', { name: /Бусад магтуу/ })
      await expect(btn).toBeVisible()
    })

    test('clicking menu button reveals candidate list', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const btn = page.getByRole('button', { name: /Бусад магтуу/ })
      await btn.click()
      const list = page.getByRole('listbox', { name: 'Магтуу сонгох' })
      await expect(list).toBeVisible()
      const items = list.locator('li')
      expect(await items.count()).toBeGreaterThan(1)
    })

    test('selecting a different hymn changes displayed text', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const hymnSection = page.locator('[aria-label="Магтуу"]')
      // Hymn body now renders as multiple stanza paragraphs (RichContent
      // path) — match the first font-serif element to capture the opening
      // line. Strict-mode locator otherwise rejects multi-match.
      const originalText = await hymnSection.locator('.font-serif').first().textContent()

      // Open menu and select a different hymn
      await page.getByRole('button', { name: /Бусад магтуу/ }).click()
      const items = page.getByRole('listbox', { name: 'Магтуу сонгох' }).locator('li button')
      // Find an item that is NOT currently selected
      const count = await items.count()
      for (let i = 0; i < count; i++) {
        const item = items.nth(i)
        const ariaSelected = await item.locator('..').getAttribute('aria-selected')
        if (ariaSelected !== 'true') {
          await item.click()
          break
        }
      }

      const newText = await hymnSection.locator('.font-serif').first().textContent()
      expect(newText).not.toBe(originalText)
    })

    test('today marker is shown on algorithmically selected hymn', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await page.getByRole('button', { name: /Бусад магтуу/ }).click()
      await expect(page.getByText('(өнөөдрийн)')).toBeVisible()
    })

    test('API response includes hymn candidates', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const hymn = body.sections.find((s: { type: string }) => s.type === 'hymn')
      expect(hymn).toBeDefined()
      expect(hymn.candidates).toBeDefined()
      expect(hymn.candidates.length).toBeGreaterThan(1)
      expect(hymn.selectedIndex).toBeGreaterThanOrEqual(0)
    })

    test('different days produce different hymns via API', async ({ request }) => {
      const res1 = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      // ordinaryWeekday is Wednesday (2026-02-04), get Thursday (2026-02-05)
      const res2 = await request.get(`/api/loth/2026-02-05/lauds`)
      const body1 = await res1.json()
      const body2 = await res2.json()
      const hymn1 = body1.sections.find((s: { type: string }) => s.type === 'hymn')
      const hymn2 = body2.sections.find((s: { type: string }) => s.type === 'hymn')
      expect(hymn1.text).not.toBe(hymn2.text)
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

      const dismissal = page.locator('[aria-label="Төгсгөл"]').last()
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

  test.describe('Antiphon labeling (FR-125)', () => {
    test('psalm antiphon shows "Шад дуулал:" label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const antiphons = page.locator('[data-role="antiphon"]')
      await expect(antiphons.first()).toBeVisible()
      await expect(antiphons.first()).toContainText(/Шад дуулал(\s\d+)?:/)
    })

    test('gospel canticle antiphon shows "Шад магтаал:" label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const canticle = page.locator('[aria-label="Захариагийн магтаал"]')
      const antiphon = canticle.locator('[data-role="antiphon"]').first()
      await expect(antiphon).toContainText('Шад магтаал:')
    })

    test('vespers Magnificat antiphon shows "Шад магтаал:" label', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
      const canticle = page.locator('[aria-label="Мариагийн магтаал"]')
      const antiphon = canticle.locator('[data-role="antiphon"]').first()
      await expect(antiphon).toContainText('Шад магтаал:')
    })
  })

  test.describe('Marian antiphon selection (FR-130)', () => {
    test('marian antiphon selection menu is visible in compline', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
      const btn = page.getByRole('button', { name: /Бусад дуу/ })
      await expect(btn).toBeVisible()
    })

    test('clicking menu reveals 4 Marian antiphon candidates', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
      const btn = page.getByRole('button', { name: /Бусад дуу/ })
      await btn.click()
      const list = page.getByRole('listbox', { name: 'Мариагийн дуу сонгох' })
      await expect(list).toBeVisible()
      const items = list.locator('li')
      expect(await items.count()).toBe(4)
    })

    test('selecting a different antiphon changes displayed title', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
      // The default is Salve Regina
      await expect(page.getByText('Төгс жаргалт Цэвэр Охин Мариагийн хүндэтгэлийн дуу')).toBeVisible()

      await page.getByRole('button', { name: /Бусад дуу/ }).click()
      // Select "Аврагчийн хайрт эх" (second option)
      await page.getByRole('listbox', { name: 'Мариагийн дуу сонгох' }).locator('li button').nth(1).click()

      // Title should change to the selected antiphon
      await expect(page.getByText('Аврагчийн хайрт эх').first()).toBeVisible()
    })

    test('API response includes marian antiphon candidates', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/compline`)
      const body = await res.json()
      const marian = body.sections.find((s: { type: string }) => s.type === 'marianAntiphon')
      expect(marian).toBeDefined()
      expect(marian.candidates).toBeDefined()
      expect(marian.candidates.length).toBe(4)
      expect(marian.selectedIndex).toBe(0)
    })
  })

  test.describe('Alternative concluding prayer (FR-131)', () => {
    test('Sunday compline shows alternate prayer toggle', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinarySunday}/compline`)
      const btn = page.getByRole('button', { name: /Сонголтот залбирал/ })
      await expect(btn).toBeVisible()
    })

    test('toggling shows alternate text', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinarySunday}/compline`)
      const section = page.locator('[aria-label="Төгсгөлийн даатгал залбирал"]')
      const originalText = await section.locator('.font-serif').textContent()

      await page.getByRole('button', { name: /Сонголтот залбирал/ }).click()
      const newText = await section.locator('.font-serif').textContent()
      expect(newText).not.toBe(originalText)
    })

    test('weekday compline without alternate does not show toggle', async ({ page }) => {
      // Monday compline has no alternate concluding prayer
      await page.goto(`/pray/2026-02-02/compline`)
      const btn = page.getByRole('button', { name: /Сонголтот залбирал/ })
      await expect(btn).toHaveCount(0)
    })

    test('API returns alternateText for Sunday compline', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/compline`)
      const body = await res.json()
      const prayer = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
      expect(prayer).toBeDefined()
      expect(prayer.alternateText).toBeTruthy()
    })

    test('API returns alternateText for ordinary Sunday vespers with alternative', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/vespers`)
      const body = await res.json()
      const prayer = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
      expect(prayer).toBeDefined()
      // Ordinary Time Week 5 Sunday vespers has alternativeConcludingPrayer in propers
      expect(prayer.alternateText).toBeTruthy()
    })
  })

  test.describe('Rubric rendering (FR-126~128)', () => {
    test('dismissal rubric instructions are rendered in red', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const dismissal = page.locator('[aria-label="Төгсгөл"]').last()
      const rubric = dismissal.getByText('Санваартан эсвэл тахилч удирдаж байгаа бол:')
      await expect(rubric).toBeVisible()
      await expect(rubric).toHaveClass(/text-red-700/)
    })

    test('Gloria Patri omission rubric applies only to the Benedicite (Daniel 3:57-88, 56)', async ({ request }) => {
      // Contract: only the Sunday Lauds Benedicite (weeks 1/3) has gloriaPatri=false,
      // because the canticle's text already ends with a trinitarian doxology (GILH §123).
      // All other psalms and canticles have gloriaPatri=true.
      const sundayDates = [DATES.ordinarySunday, DATES.easter3rdSunday, DATES.firstAdventSunday]
      for (const date of sundayDates) {
        const res = await request.get(`/api/loth/${date}/lauds`)
        const body = await res.json()
        const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
        const psalms = psalmody?.psalms ?? []
        for (const p of psalms as { psalmType: string; reference: string; gloriaPatri: boolean }[]) {
          if (p.reference === 'Daniel 3:57-88, 56') {
            expect(p.gloriaPatri).toBe(false)
          } else {
            expect(p.gloriaPatri).toBe(true)
          }
        }
      }
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

    test('responsory is always present with fullResponse, versicle, shortResponse', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const types = body.sections.map((s: { type: string }) => s.type)

      // responsory is required — psalter commons guarantee it
      expect(types).toContain('responsory')
      const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
      expect(resp).toHaveProperty('fullResponse')
      expect(resp).toHaveProperty('versicle')
      expect(resp).toHaveProperty('shortResponse')
    })
  })
})
