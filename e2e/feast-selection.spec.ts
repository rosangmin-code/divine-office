import { test, expect } from '@playwright/test'

// Dates derived from the romcal 2026 output used in unit tests.
const OT_SATURDAY = '2026-05-30'   // FERIA, OT Saturday → default + saturday-mary
const EASTER_WEEKDAY = '2026-04-17' // FERIA, Easter week 2 Friday → default + Benedict Joseph Labre
const PLAIN_WEEKDAY = '2026-06-15'  // FERIA, OT Monday → default only
const FEAST_DAY = '2026-06-13'      // FEAST (Immaculate Heart) → default only

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

  test('/api/calendar/options returns a registered optional memorial on its MM-DD', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${EASTER_WEEKDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const ids = body.options.map((o: { id: string }) => o.id)
    expect(ids).toContain('04-17-benedict-joseph-labre')
  })

  test('/api/calendar/options returns only the default on a plain weekday', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${PLAIN_WEEKDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.options).toHaveLength(1)
    expect(body.options[0].id).toBe('default')
  })

  test('invalid date returns 404 from the options API', async ({ request }) => {
    const res = await request.get('/api/calendar/options/not-a-date')
    expect(res.status()).toBe(404)
  })

  test('unknown celebrationId is ignored and default propers are served', async ({ request }) => {
    const base = await (await request.get(`/api/loth/${OT_SATURDAY}/lauds`)).json()
    const withBogus = await (
      await request.get(`/api/loth/${OT_SATURDAY}/lauds?celebration=does-not-exist`)
    ).json()
    expect(withBogus.liturgicalDay.nameMn).toBe(base.liturgicalDay.nameMn)
  })
})
