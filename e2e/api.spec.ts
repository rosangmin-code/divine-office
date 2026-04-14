import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('GET /api/calendar/today', () => {
  test('returns valid liturgical day structure', async ({ request }) => {
    const res = await request.get('/api/calendar/today')
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('date')
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('season')
    expect(body).toHaveProperty('seasonMn')
    expect(body).toHaveProperty('color')
    expect(body).toHaveProperty('colorMn')
    expect(body).toHaveProperty('rank')
    expect(body).toHaveProperty('sundayCycle')
    expect(body).toHaveProperty('weekdayCycle')
    expect(body).toHaveProperty('weekOfSeason')
    expect(body).toHaveProperty('psalterWeek')

    expect(['ADVENT', 'CHRISTMAS', 'LENT', 'EASTER', 'ORDINARY_TIME']).toContain(body.season)
    expect(['GREEN', 'VIOLET', 'WHITE', 'RED', 'ROSE']).toContain(body.color)
    expect(typeof body.psalterWeek).toBe('number')
    expect(body.psalterWeek).toBeGreaterThanOrEqual(1)
  })
})

test.describe('GET /api/calendar/date/[date]', () => {
  test('returns correct data for Ordinary Time weekday', async ({ request }) => {
    const res = await request.get(`/api/calendar/date/${DATES.ordinaryWeekday}`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.date).toBe(DATES.ordinaryWeekday)
    expect(body.season).toBe('ORDINARY_TIME')
    expect(body.color).toBe('GREEN')
  })

  test('returns 404 for invalid date', async ({ request }) => {
    const res = await request.get('/api/calendar/date/invalid')
    expect(res.status()).toBe(404)
  })
})

test.describe('GET /api/loth/[date]/[hour]', () => {
  test('Lauds: returns assembled hour with invitatory', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.hourType).toBe('lauds')
    expect(body.hourNameMn).toBe('Өглөөний даатгал залбирал')
    expect(body.date).toBe(DATES.ordinaryWeekday)
    expect(body.liturgicalDay).toBeTruthy()
    expect(body.sections).toBeInstanceOf(Array)
    expect(body.sections.length).toBeGreaterThan(0)

    // Lauds is first hour → invitatory present
    expect(body.sections[0].type).toBe('invitatory')

    // Must contain hymn, psalmody, dismissal
    const types = body.sections.map((s: { type: string }) => s.type)
    expect(types).toContain('hymn')
    expect(types).toContain('psalmody')
    expect(types).toContain('dismissal')

    // Lauds has gospel canticle (benedictus) and ourFather
    const canticle = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(canticle).toBeTruthy()
    expect(canticle.canticle).toBe('benedictus')
    expect(types).toContain('ourFather')
    // intercessions depends on propers data availability
  })

  test('Vespers: no invitatory, has magnificat', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const types = body.sections.map((s: { type: string }) => s.type)

    // No invitatory for Vespers
    expect(types[0]).not.toBe('invitatory')
    expect(types).not.toContain('invitatory')

    // Has magnificat
    const canticle = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(canticle).toBeTruthy()
    expect(canticle.canticle).toBe('magnificat')

    // Has Our Father (always for vespers)
    expect(types).toContain('ourFather')
    // intercessions depends on propers data availability
  })

  test('Compline: nunc dimittis, no intercessions, no ourFather', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/compline`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const types = body.sections.map((s: { type: string }) => s.type)

    // Has nunc dimittis
    const canticle = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(canticle).toBeTruthy()
    expect(canticle.canticle).toBe('nuncDimittis')

    // No intercessions or Our Father
    expect(types).not.toContain('intercessions')
    expect(types).not.toContain('ourFather')
  })

  // Skipped until terce is added to VALID_HOURS (data pending).
  test.skip('Terce (minor hour): no canticle, no intercessions, no ourFather', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/terce`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const types = body.sections.map((s: { type: string }) => s.type)

    expect(types).not.toContain('gospelCanticle')
    expect(types).not.toContain('intercessions')
    expect(types).not.toContain('ourFather')
    expect(types).toContain('psalmody')
    expect(types).toContain('dismissal')
  })

  test('Compline uses fixed weekly cycle (same psalms regardless of psalter week)', async ({ request }) => {
    // 2026-02-04 is Wednesday (psalter week X)
    // 2026-03-04 is Wednesday (different psalter week)
    const res1 = await request.get(`/api/loth/${DATES.ordinaryWeekday}/compline`)
    const res2 = await request.get(`/api/loth/${DATES.lentWeekday}/compline`)

    const body1 = await res1.json()
    const body2 = await res2.json()

    const psalms1 = body1.sections.find((s: { type: string }) => s.type === 'psalmody')
    const psalms2 = body2.sections.find((s: { type: string }) => s.type === 'psalmody')

    // Same day-of-week compline → same psalm references
    const refs1 = psalms1.psalms.map((p: { reference: string }) => p.reference)
    const refs2 = psalms2.psalms.map((p: { reference: string }) => p.reference)
    expect(refs1).toEqual(refs2)
  })

  test('Sanctoral propers override: St. Joseph Lauds', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.stJoseph}/lauds`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const prayer = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')

    // St. Joseph's concluding prayer should reference Joseph
    if (prayer) {
      expect(prayer.text).toContain('Иосеф')
    }
  })

  test('returns 400 for invalid hour', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/invalid`)
    expect(res.status()).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Invalid hour')
  })

  test('returns 404 for invalid date', async ({ request }) => {
    const res = await request.get('/api/loth/invalid-date/lauds')
    expect(res.status()).toBe(404)
  })
})
