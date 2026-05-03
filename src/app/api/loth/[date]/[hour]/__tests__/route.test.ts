// @fr FR-NEW (#242 F-X5 FU#2)
// Integration test for /api/loth/[date]/[hour] GET handler.
// Validates the FU#2 firstVespers/firstCompline 404 gate WITHOUT
// requiring a running dev server (e2e parallel coverage in
// e2e/error-handling.spec.ts requires fresh dev server; this test
// covers the same gate at the route-handler unit-integration level
// so CI / sandboxed env still verifies the contract).
import { describe, it, expect, vi } from 'vitest'
import { GET } from '../route'

// Mock bible-loader to avoid the 7.4MB JSONL import the assembler
// triggers downstream (matches loth-service.test.ts pattern).
vi.mock('@/lib/bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

function callGet(date: string, hour: string) {
  const request = new Request(`http://localhost/api/loth/${date}/${hour}`)
  return GET(request, { params: Promise.resolve({ date, hour }) })
}

describe('GET /api/loth/[date]/[hour] — FU#2 firstVespers eligibility gate', () => {
  it('returns 404 for firstVespers on an ordinary OT weekday (2026-06-15 Mon)', async () => {
    const res = await callGet('2026-06-15', 'firstVespers')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('not available')
  })

  it('returns 404 for firstCompline on an ordinary OT weekday (2026-06-15 Mon)', async () => {
    const res = await callGet('2026-06-15', 'firstCompline')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('not available')
  })

  it('returns 404 for firstVespers on an ordinary Saturday (2030-06-15 Sat) — Sat is NOT eligible (the firstVespers content moved to Sunday URL after #230 F-X5)', async () => {
    const res = await callGet('2030-06-15', 'firstVespers')
    expect(res.status).toBe(404)
  })

  it('returns 200 for firstVespers on a Sunday (2026-06-14)', async () => {
    const res = await callGet('2026-06-14', 'firstVespers')
    expect(res.status).toBe(200)
  })

  it('returns 200 for firstVespers on a fixed-date Solemnity (Sts. Peter & Paul 2026-06-29 Mon)', async () => {
    const res = await callGet('2026-06-29', 'firstVespers')
    expect(res.status).toBe(200)
  })

  it('returns 200 for firstCompline on a fixed-date Solemnity (Christmas 2026-12-25 Fri)', async () => {
    const res = await callGet('2026-12-25', 'firstCompline')
    expect(res.status).toBe(200)
  })

  it('returns 200 for vespers on an ordinary OT weekday (regression — gate must NOT block lauds/vespers/compline)', async () => {
    const res = await callGet('2026-06-15', 'vespers')
    expect(res.status).toBe(200)
  })

  it('returns 200 for lauds on an ordinary OT weekday (regression — gate must NOT block lauds)', async () => {
    const res = await callGet('2026-06-15', 'lauds')
    expect(res.status).toBe(200)
  })

  it('returns 400 for an unrecognized hour (regression — pre-FU#2 invalid-hour branch unchanged)', async () => {
    const res = await callGet('2026-06-15', 'matins')
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid date string (regression — invalid-date branch fires before FU#2 gate)', async () => {
    const res = await callGet('not-a-date', 'firstVespers')
    expect(res.status).toBe(400)
  })
})
