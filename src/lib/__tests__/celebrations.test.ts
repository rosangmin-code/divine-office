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

  it('returns only the default option on 04-17 after non-PDF entries removed (FR-045 follow-up A)', () => {
    // optional-memorials.json was emptied to {} (PDF 외 3건 제거 결정).
    // Loader/types/celebrations.ts 인프라는 dormant 유지 — 빈 카탈로그에서도
    // 04-17 평일은 default 옵션만 노출되어야 한다.
    const result = getCelebrationOptions('2026-04-17') // Easter Friday, WEEKDAY
    expect(result!.options).toHaveLength(1)
    expect(result!.options[0].id).toBe(DEFAULT_CELEBRATION_ID)
    expect(result!.options[0].isDefault).toBe(true)
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

  it('falls back to default when a previously-known optional id is requested but no longer registered', () => {
    // PDF 외 3건이 제거된 후, 옛 슬러그를 그대로 전달해도 graceful fallback 으로
    // default 가 돌아와야 한다 (resolver 가 dormant 인프라를 안전 통과).
    const resolved = resolveCelebration('2026-04-17', '04-17-benedict-joseph-labre')
    expect(resolved!.option.isDefault).toBe(true)
    expect(resolved!.option.id).toBe(DEFAULT_CELEBRATION_ID)
    expect(resolved!.sanctoralOverride).toBeNull()
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

  it('ignores a dormant optional-memorials id on assembleHour and matches default behaviour', async () => {
    // optional-memorials.json {} 이후, 옛 슬러그를 celebrationId 로 전달해도
    // assembleHour 는 default 와 동일한 결과를 돌려줘야 한다.
    const base = await assembleHour('2026-04-17', 'lauds')
    const withDormant = await assembleHour('2026-04-17', 'lauds', {
      celebrationId: '04-17-benedict-joseph-labre',
    })
    expect(base).not.toBeNull()
    expect(withDormant).not.toBeNull()
    expect(withDormant!.liturgicalDay.nameMn).toBe(base!.liturgicalDay.nameMn)
    const baseConcluding = base!.sections.find((s) => s.type === 'concludingPrayer')
    const dormantConcluding = withDormant!.sections.find((s) => s.type === 'concludingPrayer')
    expect((dormantConcluding as { type: 'concludingPrayer'; text: string }).text).toBe(
      (baseConcluding as { type: 'concludingPrayer'; text: string }).text,
    )
  })

  it('ignores an unknown celebrationId and falls back to default behaviour', async () => {
    const base = await assembleHour('2026-05-30', 'lauds')
    const withUnknown = await assembleHour('2026-05-30', 'lauds', {
      celebrationId: 'does-not-exist',
    })
    expect(withUnknown!.liturgicalDay.nameMn).toBe(base!.liturgicalDay.nameMn)
  })
})

// task #8 통합 구현 (P1+P2+P4+P5) — 옵션 모델 v2 확정 결정 회귀 가드.
// 2026-05-14 Ascension Thursday (movable SOLEMNITY):
//   - default = Ascension (romcal)
//   - 마티아 사도 (PDF 카탈로그 미포함) → 옵션 미노출
//   - source = romcal, rank = SOLEMNITY
// 본 그룹은 PDF-only data policy 의 source-level 회귀 가드이며, 현재
// 구현 (celebrations.ts: SOLEMNITY rank 에서는 optional 옵션을 append
// 하지 않음) 에서 자연 통과한다.
describe('PDF-only data policy — 2026-05-14 Ascension Thursday', () => {
  it('returns Ascension as the only option on 2026-05-14 (SOLEMNITY rank → default-only)', () => {
    const result = getCelebrationOptions('2026-05-14')
    expect(result).not.toBeNull()
    expect(result!.options).toHaveLength(1)
    const def = result!.options[0]
    expect(def.id).toBe(DEFAULT_CELEBRATION_ID)
    expect(def.isDefault).toBe(true)
    expect(def.source).toBe('romcal')
    expect(def.rank).toBe('SOLEMNITY')
  })

  it('does not expose any Matthias / 05-14 saint slug among the options', () => {
    const result = getCelebrationOptions('2026-05-14')
    expect(result).not.toBeNull()
    const ids = result!.options.map((o) => o.id)
    // PDF-only 정책: Matthias 영문/몽골어/MM-DD 슬러그 그 어떤 변형도
    // 카탈로그에 author 되어 있지 않으므로 노출되어서는 안 된다.
    for (const id of ids) {
      expect(id).not.toMatch(/matthias|маттиа|маттай|05-14/i)
    }
  })

  it('resolveCelebration(2026-05-14, "matthias") falls back to default (id is unknown to the catalog)', () => {
    const resolved = resolveCelebration('2026-05-14', 'matthias')
    expect(resolved).not.toBeNull()
    expect(resolved!.option.isDefault).toBe(true)
    expect(resolved!.option.id).toBe(DEFAULT_CELEBRATION_ID)
    expect(resolved!.sanctoralOverride).toBeNull()
  })

  it('Pentecost (2026-05-24) is similarly SOLEMNITY default-only (PDF-only policy equivalence)', () => {
    const result = getCelebrationOptions('2026-05-24')
    expect(result).not.toBeNull()
    expect(result!.options).toHaveLength(1)
    expect(result!.options[0].rank).toBe('SOLEMNITY')
    expect(result!.options[0].id).toBe(DEFAULT_CELEBRATION_ID)
  })
})

// Pre-empted feast 알고리즘 — task #8 P5 deliverable.
// 동일 일자에 PDF 가 author 한 alternative celebration 이 있는 경우 옵션
// 목록에 alt 가 포함되어야 하고, PDF 미인증 alt 는 절대 노출되어서는 안
// 된다. 현재 카탈로그에는 해당 시나리오를 만족하는 일자가 없으므로
// (saturday-mary 외 PDF-authored multi-option day 없음) todo 로 동결.
describe('Pre-empted feast 알고리즘 (P5 contract — pending PDF data)', () => {
  it.todo(
    'when PDF authors an alternative on the same date as a romcal SOLEMNITY/FEAST, options contains BOTH default AND the alt id',
  )

  it.todo(
    'when PDF does NOT author an alternative, options never contains a romcal-only or sanctoral-only alt',
  )

  it.todo(
    'resolveCelebration honors a PDF-authored alt id and returns its sanctoralOverride payload',
  )

  it.todo(
    'on a weekday, PDF-authored optional memorials still surface (back-compat with existing optional-memorials.json loader path)',
  )
})
