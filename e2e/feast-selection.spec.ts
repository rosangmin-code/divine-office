import { test, expect } from '@playwright/test'

// Dates derived from the romcal 2026 output used in unit tests.
const OT_SATURDAY = '2026-05-30'   // FERIA, OT Saturday → default + saturday-mary
const PLAIN_WEEKDAY = '2026-06-15'  // FERIA, OT Monday → default only
const FEAST_DAY = '2026-06-13'      // FEAST (Immaculate Heart) → default only

// Task #48 removed all PDF-외 optional memorials (04-17 Benedict Joseph Labre,
// 06-13 Anthony of Padua, 10-04 Francis of Assisi) — `optional-memorials.json`
// is now `{}`. The "registered optional memorial on its MM-DD" assertion is
// obsolete; the surviving multi-option case is covered by the Saturday-Mary
// votive memorial tests above.

test.describe('Feast / memorial selection', () => {
  test('home page shows a picker on an OT Saturday and offers the saturday-mary option', async ({ page }) => {
    await page.goto(`/?date=${OT_SATURDAY}`)

    const picker = page.getByTestId('celebration-picker').first()
    await expect(picker).toBeVisible()

    const maryOption = picker.locator('[data-celebration-id="saturday-mary"]').first()
    await expect(maryOption).toBeVisible()

    // Default is the romcal Saturday weekday.
    const defaultOption = picker.locator('[data-celebration-id="default"]').first()
    await expect(defaultOption).toBeVisible()
    await expect(defaultOption).toHaveAttribute('aria-checked', 'true')
  })

  test('selecting saturday-mary updates the URL and propagates to hour card links', async ({ page }) => {
    await page.goto(`/?date=${OT_SATURDAY}`)

    const picker = page.getByTestId('celebration-picker').first()
    await picker.locator('[data-celebration-id="saturday-mary"]').first().click()

    await expect(page).toHaveURL(/celebration=saturday-mary/)

    const laudsLink = page.getByRole('link', { name: /Өглөөний даатгал залбирал/ }).first()
    const href = await laudsLink.getAttribute('href')
    expect(href).toContain('celebration=saturday-mary')
  })

  test('plain weekday hides the picker when only the default option exists', async ({ page }) => {
    await page.goto(`/?date=${PLAIN_WEEKDAY}`)
    await expect(page.getByTestId('celebration-picker')).toHaveCount(0)
  })

  test('feast day hides the picker', async ({ page }) => {
    await page.goto(`/?date=${FEAST_DAY}`)
    await expect(page.getByTestId('celebration-picker')).toHaveCount(0)
  })

  test('pray page honors ?celebration=saturday-mary query on Lauds', async ({ page, request }) => {
    await page.goto(`/pray/${OT_SATURDAY}/lauds?celebration=saturday-mary`)
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()

    // The API returns the Mary-specific concluding prayer text.
    const res = await request.get(`/api/loth/${OT_SATURDAY}/lauds?celebration=saturday-mary`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const concluding = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(concluding).toBeTruthy()
    expect(concluding.text).toMatch(/Мариа|Цэвэр Охин/)

    expect(body.liturgicalDay.nameMn).toMatch(/Мариа/)
    expect(body.liturgicalDay.color).toBe('WHITE')
  })

  test('pray page back links preserve the celebration query', async ({ page }) => {
    await page.goto(`/pray/${OT_SATURDAY}/vespers?celebration=saturday-mary`)
    const backLink = page.getByRole('link', { name: /Бүх цагийн залбирлууд руу буцах/ })
    const href = await backLink.getAttribute('href')
    expect(href).toContain('celebration=saturday-mary')
  })

  test('/api/calendar/options returns the romcal default plus saturday-mary on an OT Saturday', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${OT_SATURDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.date).toBe(OT_SATURDAY)
    expect(Array.isArray(body.options)).toBe(true)

    const ids = body.options.map((o: { id: string }) => o.id)
    expect(ids).toContain('default')
    expect(ids).toContain('saturday-mary')

    const def = body.options.find((o: { id: string }) => o.id === 'default')
    expect(def.isDefault).toBe(true)
    expect(def.source).toBe('romcal')

    const mary = body.options.find((o: { id: string }) => o.id === 'saturday-mary')
    expect(mary.isDefault).toBe(false)
    expect(mary.source).toBe('votive')
    expect(mary.color).toBe('WHITE')
  })

  test('/api/calendar/options returns only the default on a plain weekday', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${PLAIN_WEEKDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.options).toHaveLength(1)
    expect(body.options[0].id).toBe('default')
  })

  // FR-031: optional-memorials.json is currently empty (task #48 removed the
  // 3 non-PDF-authored entries). Days without a registered MM-DD optional
  // memorial return only the romcal default — verifies the loader doesn't
  // synthesise spurious options after the catalog became empty.
  test('/api/calendar/options returns only default for an MM-DD without registered optional memorial', async ({ request }) => {
    const res = await request.get('/api/calendar/options/2026-04-17') // formerly Benedict Joseph Labre
    expect(res.status()).toBe(200)
    const body = await res.json()
    const ids = body.options.map((o: { id: string }) => o.id)
    expect(ids).toEqual(['default'])
  })

  test('invalid date returns 400 from the options API', async ({ request }) => {
    // Aligns with commit 905073b's `isValidDateStr` contract — malformed
    // strings return 400 (Bad Request), not 404. The original 404 assertion
    // was stale even before #48.
    const res = await request.get('/api/calendar/options/not-a-date')
    expect(res.status()).toBe(400)
  })

  test('unknown celebrationId is ignored and default propers are served', async ({ request }) => {
    const base = await (await request.get(`/api/loth/${OT_SATURDAY}/lauds`)).json()
    const withBogus = await (
      await request.get(`/api/loth/${OT_SATURDAY}/lauds?celebration=does-not-exist`)
    ).json()
    expect(withBogus.liturgicalDay.nameMn).toBe(base.liturgicalDay.nameMn)
  })
})
