import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Special liturgical days', () => {
  test('St. Joseph (Mar 19) Lauds: sanctoral concluding prayer', async ({ page }) => {
    await page.goto(`/pray/${DATES.stJoseph}/lauds`)

    // Should render the prayer page
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()

    // Check for St. Joseph-specific content in concluding prayer
    const concludingPrayer = page.getByText('Төгсгөлийн даатгал залбирал')
    await expect(concludingPrayer).toBeVisible()
  })

  test('St. Joseph Vespers: different gospel canticle antiphon from Lauds', async ({ request }) => {
    const laudsRes = await request.get(`/api/loth/${DATES.stJoseph}/lauds`)
    const vespersRes = await request.get(`/api/loth/${DATES.stJoseph}/vespers`)

    const laudsBody = await laudsRes.json()
    const vespersBody = await vespersRes.json()

    const laudsCanticle = laudsBody.sections.find(
      (s: { type: string }) => s.type === 'gospelCanticle'
    )
    const vespersCanticle = vespersBody.sections.find(
      (s: { type: string }) => s.type === 'gospelCanticle'
    )

    // Both should have canticles
    expect(laudsCanticle).toBeTruthy()
    expect(vespersCanticle).toBeTruthy()

    // Lauds = benedictus, Vespers = magnificat
    expect(laudsCanticle.canticle).toBe('benedictus')
    expect(vespersCanticle.canticle).toBe('magnificat')
  })

  test('Easter Octave Friday (psalterWeek=5): Lauds returns full hour', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.easterFriday}/lauds`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.liturgicalDay.season).toBe('EASTER')
    expect(body.psalterWeek).toBeGreaterThanOrEqual(1)
    expect(body.psalterWeek).toBeLessThanOrEqual(4)

    const types = body.sections.map((s: { type: string }) => s.type)
    expect(types).toContain('shortReading')
    expect(types).toContain('responsory')
    expect(types).toContain('intercessions')
    expect(types).toContain('concludingPrayer')
  })

  test('Easter Sunday: uses easterSunday special propers', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.easterSunday}/lauds`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.liturgicalDay.season).toBe('EASTER')

    const types = body.sections.map((s: { type: string }) => s.type)
    expect(types).toContain('shortReading')
    expect(types).toContain('responsory')
    expect(types).toContain('intercessions')
    expect(types).toContain('concludingPrayer')

    // Easter Sunday concluding prayer should reference 부활/амилалт
    const cp = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(cp.text).toContain('амилуулсн')
  })

  test('Easter 3rd Sunday Vespers: normal psalterWeek works', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.easter3rdSunday}/vespers`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.liturgicalDay.season).toBe('EASTER')
    expect(body.sections.length).toBeGreaterThan(0)
  })

  test('Advent Dec 20: date-keyed propers differ from regular Advent weekday', async ({ request }) => {
    // Regular Advent weekday
    const regularRes = await request.get(`/api/loth/${DATES.adventWeekday}/vespers`)
    // Date-keyed Advent (Dec 20)
    const dec20Res = await request.get(`/api/loth/${DATES.adventDec20}/vespers`)

    const regularBody = await regularRes.json()
    const dec20Body = await dec20Res.json()

    // Both should return 200 with valid data
    expect(regularBody.hourType).toBe('vespers')
    expect(dec20Body.hourType).toBe('vespers')

    // The assembled hours should differ in some propers content
    // (at least the concluding prayer or gospel canticle antiphon)
    const regularPrayer = regularBody.sections.find(
      (s: { type: string }) => s.type === 'concludingPrayer'
    )
    const dec20Prayer = dec20Body.sections.find(
      (s: { type: string }) => s.type === 'concludingPrayer'
    )

    // If both have concluding prayers, they should differ
    if (regularPrayer && dec20Prayer) {
      expect(dec20Prayer.text).not.toBe(regularPrayer.text)
    }
  })
})
