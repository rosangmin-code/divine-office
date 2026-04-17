import { describe, it, expect, vi } from 'vitest'
import {
  getCelebrationOptions,
  resolveCelebration,
  DEFAULT_CELEBRATION_ID,
} from '../celebrations'
import { assembleHour } from '../loth-service'

// Mock bible-loader to avoid loading large JSONL files in tests.
vi.mock('../bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

describe('getCelebrationOptions', () => {
  it('always lists the romcal default first with isDefault=true', () => {
    const result = getCelebrationOptions('2026-06-15')
    expect(result).not.toBeNull()
    expect(result!.options.length).toBeGreaterThanOrEqual(1)
    expect(result!.options[0].isDefault).toBe(true)
    expect(result!.options[0].id).toBe(DEFAULT_CELEBRATION_ID)
    expect(result!.options[0].source).toBe('romcal')
  })

  it('returns only the default option on a plain weekday with no optional memorials', () => {
    const result = getCelebrationOptions('2026-06-15') // OT Monday, no saint registered
    expect(result!.options).toHaveLength(1)
    expect(result!.options[0].id).toBe(DEFAULT_CELEBRATION_ID)
  })

  it('adds saturday-mary option on Ordinary Time Saturdays', () => {
    const result = getCelebrationOptions('2026-05-30') // OT Saturday
    expect(result!.options.length).toBeGreaterThanOrEqual(2)
    const ids = result!.options.map((o) => o.id)
    expect(ids).toContain('saturday-mary')
    const mary = result!.options.find((o) => o.id === 'saturday-mary')!
    expect(mary.source).toBe('votive')
    expect(mary.isDefault).toBe(false)
    expect(mary.color).toBe('WHITE')
  })

  it('includes optional memorials from optional-memorials.json for matching MM-DD weekday', () => {
    const result = getCelebrationOptions('2026-04-17') // Easter Friday, WEEKDAY
    const ids = result!.options.map((o) => o.id)
    expect(ids).toContain('04-17-benedict-joseph-labre')
    const entry = result!.options.find((o) => o.id === '04-17-benedict-joseph-labre')!
    expect(entry.source).toBe('optional')
    expect(entry.nameMn).toContain('Бенедикт')
  })

  it('does not expose optional alternatives on a feast/solemnity (non-weekday rank)', () => {
    const result = getCelebrationOptions('2026-06-13') // Immaculate Heart of Mary, FEAST
    expect(result!.options).toHaveLength(1)
    expect(result!.options[0].isDefault).toBe(true)
  })

  it('returns null for an invalid date', () => {
    expect(getCelebrationOptions('not-a-date')).toBeNull()
  })
})

describe('resolveCelebration', () => {
  it('returns the default option when no id is provided', () => {
    const resolved = resolveCelebration('2026-05-30')
    expect(resolved!.option.isDefault).toBe(true)
    expect(resolved!.sanctoralOverride).toBeNull()
  })

  it('returns the default option for an unknown id (graceful fallback)', () => {
    const resolved = resolveCelebration('2026-05-30', 'totally-unknown-id')
    expect(resolved!.option.isDefault).toBe(true)
    expect(resolved!.sanctoralOverride).toBeNull()
  })

  it('resolves saturday-mary and returns its sanctoral override', () => {
    const resolved = resolveCelebration('2026-05-30', 'saturday-mary')
    expect(resolved!.option.id).toBe('saturday-mary')
    expect(resolved!.sanctoralOverride).not.toBeNull()
    expect(resolved!.sanctoralOverride!.lauds?.concludingPrayer).toContain('Мариа')
  })

  it('resolves an optional-memorials entry and returns its override', () => {
    const resolved = resolveCelebration('2026-04-17', '04-17-benedict-joseph-labre')
    expect(resolved!.option.id).toBe('04-17-benedict-joseph-labre')
    expect(resolved!.sanctoralOverride).not.toBeNull()
    expect(resolved!.sanctoralOverride!.lauds?.concludingPrayer).toContain('Бенедикт')
  })

  it('refuses to resolve a valid-looking id on a day it is not registered for', () => {
    // saturday-mary should only be offered on OT Saturdays; on a Monday
    // resolveCelebration must fall back to default.
    const resolved = resolveCelebration('2026-06-15', 'saturday-mary')
    expect(resolved!.option.isDefault).toBe(true)
    expect(resolved!.sanctoralOverride).toBeNull()
  })
})

describe('assembleHour with celebrationId override', () => {
  it('applies the saturday-mary concluding prayer on an OT Saturday when selected', async () => {
    const base = await assembleHour('2026-05-30', 'lauds')
    const chosen = await assembleHour('2026-05-30', 'lauds', { celebrationId: 'saturday-mary' })

    expect(base).not.toBeNull()
    expect(chosen).not.toBeNull()

    const baseConcluding = base!.sections.find((s) => s.type === 'concludingPrayer')
    const chosenConcluding = chosen!.sections.find((s) => s.type === 'concludingPrayer')
    expect(baseConcluding).toBeDefined()
    expect(chosenConcluding).toBeDefined()
    // The Mary Saturday memorial prayer mentions Цэвэр Охин / Мариа.
    expect((chosenConcluding as { type: 'concludingPrayer'; text: string }).text).toMatch(/Мариа|Цэвэр Охин/)
    // And it should differ from the default psalter/season concluding prayer.
    expect((chosenConcluding as { type: 'concludingPrayer'; text: string }).text).not.toBe(
      (baseConcluding as { type: 'concludingPrayer'; text: string }).text,
    )
  })

  it('overrides liturgicalDay.nameMn to the selected celebration', async () => {
    const chosen = await assembleHour('2026-05-30', 'lauds', { celebrationId: 'saturday-mary' })
    expect(chosen!.liturgicalDay.nameMn).toContain('Мариа')
    expect(chosen!.liturgicalDay.rank).toBe('OPTIONAL_MEMORIAL')
    expect(chosen!.liturgicalDay.color).toBe('WHITE')
  })

  it('leaves liturgicalDay untouched when the default is chosen', async () => {
    const base = await assembleHour('2026-05-30', 'lauds')
    const withDefault = await assembleHour('2026-05-30', 'lauds', { celebrationId: 'default' })
    expect(withDefault!.liturgicalDay.nameMn).toBe(base!.liturgicalDay.nameMn)
  })

  it('applies an optional-memorials entry concluding prayer', async () => {
    const chosen = await assembleHour('2026-04-17', 'lauds', {
      celebrationId: '04-17-benedict-joseph-labre',
    })
    const concluding = chosen!.sections.find((s) => s.type === 'concludingPrayer')
    expect((concluding as { type: 'concludingPrayer'; text: string }).text).toContain('Бенедикт')
    expect(chosen!.liturgicalDay.nameMn).toContain('Бенедикт')
  })

  it('ignores an unknown celebrationId and falls back to default behaviour', async () => {
    const base = await assembleHour('2026-05-30', 'lauds')
    const withUnknown = await assembleHour('2026-05-30', 'lauds', {
      celebrationId: 'does-not-exist',
    })
    expect(withUnknown!.liturgicalDay.nameMn).toBe(base!.liturgicalDay.nameMn)
  })
})
