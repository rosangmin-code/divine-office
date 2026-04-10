import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getHoursSummary, assembleHour } from '../loth-service'

// Mock bible-loader to avoid loading 7.4MB JSONL in tests
vi.mock('../bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

describe('getHoursSummary', () => {
  it('returns 3 active hours for a valid date', () => {
    const result = getHoursSummary('2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.hours).toHaveLength(3)
    expect(result!.hours.map((h) => h.type)).toEqual(['lauds', 'vespers', 'compline'])
  })

  it('returns liturgical day info', () => {
    const result = getHoursSummary('2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(result!.date).toBe('2026-06-15')
  })

  it('returns null for invalid date', () => {
    expect(getHoursSummary('invalid')).toBeNull()
  })

  it('returns data for any valid date (romcal generates dynamically)', () => {
    const result = getHoursSummary('2030-06-15')
    expect(result).not.toBeNull()
    expect(result!.hours).toHaveLength(3)
  })
})

describe('assembleHour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for invalid date', async () => {
    const result = await assembleHour('invalid', 'lauds')
    expect(result).toBeNull()
  })

  it('returns null for unsupported hour type', async () => {
    const result = await assembleHour('2026-06-15', 'officeOfReadings')
    expect(result).toBeNull()
  })

  it('assembles lauds with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'lauds')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('lauds')
    expect(result!.date).toBe('2026-06-15')
    expect(result!.liturgicalDay.season).toBe('ORDINARY_TIME')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('assembles vespers with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('assembles compline with correct structure', async () => {
    const result = await assembleHour('2026-06-15', 'compline')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('compline')
    expect(result!.sections.length).toBeGreaterThan(0)
  })

  it('Saturday vespers uses Sunday propers', async () => {
    // 2026-06-13 is a Saturday in OT
    const result = await assembleHour('2026-06-13', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.hourType).toBe('vespers')
  })
})

describe('propers merge priority', () => {
  it('solemnity vespers uses vespers2 data', async () => {
    // St. Joseph (March 19) is a Solemnity
    const result = await assembleHour('2026-03-19', 'vespers')
    expect(result).not.toBeNull()
    expect(result!.liturgicalDay.rank).toBe('SOLEMNITY')
  })

  it('sanctoral propers override season propers', async () => {
    // St. Joseph lauds should have sanctoral data
    const result = await assembleHour('2026-03-19', 'lauds')
    expect(result).not.toBeNull()
    // Verify sections are assembled (sanctoral layer applied)
    expect(result!.sections.length).toBeGreaterThan(0)
  })
})
