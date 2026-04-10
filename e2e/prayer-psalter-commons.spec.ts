import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Psalter commons (short reading, responsory, intercessions, concluding prayer)', () => {
  test.describe('Ordinary Time weekday Lauds via API', () => {
    test('has shortReading with ref and non-empty verses', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const reading = body.sections.find((s: { type: string }) => s.type === 'shortReading')
      expect(reading).toBeTruthy()
      expect(reading).toHaveProperty('ref')
      expect(reading).toHaveProperty('verses')
      expect(reading.verses.length).toBeGreaterThan(0)
      expect(reading.verses[0]).toBeTruthy()
    })

    test('has responsory with versicle and response', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
      expect(resp).toBeTruthy()
      expect(resp).toHaveProperty('versicle')
      expect(resp).toHaveProperty('response')
    })

    test('has intercessions with items array', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(intercessions.items).toBeInstanceOf(Array)
      expect(intercessions.items.length).toBeGreaterThan(0)
    })

    test('has concludingPrayer with text', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const prayer = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
      expect(prayer).toBeTruthy()
      expect(prayer.text).toBeTruthy()
    })
  })

  test.describe('Ordinary Time weekday Vespers via API', () => {
    test('has shortReading with ref and non-empty verses', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const reading = body.sections.find((s: { type: string }) => s.type === 'shortReading')
      expect(reading).toBeTruthy()
      expect(reading).toHaveProperty('ref')
      expect(reading).toHaveProperty('verses')
      expect(reading.verses.length).toBeGreaterThan(0)
      expect(reading.verses[0]).toBeTruthy()
    })

    test('has responsory with versicle and response', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
      expect(resp).toBeTruthy()
      expect(resp).toHaveProperty('versicle')
      expect(resp).toHaveProperty('response')
    })

    test('has intercessions with items array', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(intercessions.items).toBeInstanceOf(Array)
      expect(intercessions.items.length).toBeGreaterThan(0)
    })

    test('has concludingPrayer with text', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const prayer = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
      expect(prayer).toBeTruthy()
      expect(prayer.text).toBeTruthy()
    })
  })

  test.describe('Ordinary Time Sunday Lauds via API', () => {
    test('has shortReading, responsory, intercessions, concludingPrayer', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const types = body.sections.map((s: { type: string }) => s.type)

      expect(types).toContain('shortReading')
      expect(types).toContain('responsory')
      expect(types).toContain('intercessions')
      expect(types).toContain('concludingPrayer')
    })

    test('shortReading text is non-empty', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const reading = body.sections.find((s: { type: string }) => s.type === 'shortReading')
      expect(reading).toBeTruthy()
      expect(reading.verses.length).toBeGreaterThan(0)
      expect(reading.verses[0]).toBeTruthy()
    })
  })

  test.describe('Psalm verse content verification', () => {
    test('Lauds psalm verses are non-empty (bible loading works)', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
      expect(psalmody).toBeTruthy()
      expect(psalmody.psalms.length).toBeGreaterThan(0)

      for (const psalm of psalmody.psalms) {
        expect(psalm.verses.length).toBeGreaterThan(0)
        // Each verse should have non-empty text
        expect(psalm.verses[0].text).toBeTruthy()
      }
    })

    test('Vespers psalm verses are non-empty (bible loading works)', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
      expect(psalmody).toBeTruthy()
      expect(psalmody.psalms.length).toBeGreaterThan(0)

      for (const psalm of psalmody.psalms) {
        expect(psalm.verses.length).toBeGreaterThan(0)
        expect(psalm.verses[0].text).toBeTruthy()
      }
    })
  })
})
