/**
 * FR-168 / WI #94 ([#90-sub-4]) — 토요일 성모 기념(saturday-mary) 아침기도
 * Benedictus 후렴 6옵션 드롭다운 + 안내 루브릭 — **데이터/조립 계층 RED 테스트**.
 *
 * 블루프린트(MM): docs/design/mental-models/goal90-saturday-mary-benedictus-dropdown.md
 *   - Observable outcome: "saturday-mary Lauds 진입 → Benedictus 후렴 = 옵션1
 *     원문(평일 후렴과 byte 불일치)"; "모든 후렴 = breviary 성모 공통 원문".
 *   - Design contract: gospelCanticle 섹션 + HourPropers 에 candidates /
 *     selectedIndex / rubric (additive optional). default 0(옵션1).
 * 시나리오: docs/research/GOAL90-sub2-scenarios.md (D1·D2·D4)
 * 설계 lock: docs/research/GOAL90-sub3-spec.md (§1 스키마, §6 데이터, §2 resolver)
 * 원문 SoT: parsed_data/propers/propers_final.txt L9853-9882 (book p863-864), #91 §3.1
 *
 * ⚠️ RED 단계 — 구현(#96) 전이므로 본 파일의 feature 테스트는 **현재 FAIL** 한다
 * (saturday-mary lauds 후렴 = 평일과 동일, candidates/rubric/selectedIndex 부재).
 * D3-E1(평일은 드롭다운/루브릭 미부여)만 회귀 가드(현재도 통과)다.
 *
 * selector 축 분리(CLAUDE.md): 본 파일은 데이터 계층이므로 텍스트 결합(D4 원문
 * 정합)을 의도적으로 수행한다. UI 기능(드롭다운/combobox/data-role)은
 * 컴포넌트/e2e 테스트가 색상·로케일 독립 anchor 로 검증.
 */

import { describe, it, expect, vi } from 'vitest'
import { assembleHour } from '../loth-service'

// Mock bible-loader to avoid loading large JSONL files in tests
// (celebrations.test.ts 동일 패턴).
vi.mock('../bible-loader', () => ({
  warmBibleCache: vi.fn().mockResolvedValue(undefined),
  lookupRef: vi.fn().mockReturnValue({
    reference: '',
    bookMn: 'Дуулал',
    texts: [{ verse: 1, text: 'Mock verse' }],
  }),
  getChapter: vi.fn().mockReturnValue(null),
}))

const OT_SATURDAY = '2026-05-30' // FERIA, OT Saturday → default + saturday-mary
const PLAIN_WEEKDAY = '2026-06-15' // FERIA, OT Monday → default only

// 현재(b627ca8) saturday-mary lauds 가 평일과 공유하는 ferial Benedictus 후렴
// (probe 확인, 끝 마침표 포함). 구현 후 옵션1 로 교체되어야 한다.
const FERIAL_BENEDICTUS =
  'Эзэн минь, Та биднийг амар амгалангийн зам мөрөөр хөтөлнө үү.'

// 안내 루브릭 — propers_final.txt L9854-9855 (authentic 몽골어).
const RUBRIC = 'Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:'

// 6개 후렴 각 옵션의 distinctive verbatim 구절 (propers_final.txt L9856-9882).
// 페이지브레이크 아티팩트(running header/page number)를 배제한 본문 지문이라,
// #96 의 join 방식(공백/개행)과 무관하게 정합을 검증한다.
const OPT_PHRASES: { idx: number; page: number; phrases: string[] }[] = [
  // 1 (L9856-9864, p863)
  { idx: 0, page: 863, phrases: ['Төгс жаргалт Цэвэр Охин Мариагийн дурсахуйд', 'зуучлан залбирах болтугай'] },
  // 2 (L9865-9867, p863)
  { idx: 1, page: 863, phrases: ['Дээдийн дээд Эзэн Тэнгэрбурхан энэ дэлхий'] },
  // 3 (L9868-9871, p863)
  { idx: 2, page: 863, phrases: ['алдсан амьдралыг маань бидэнд дахин', 'дэлхийн Аврагчийг төрүүлсэн'] },
  // 4 (L9872-9875, p864)
  { idx: 3, page: 864, phrases: ['Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Аллэлуяа!'] },
  // 5 (L9876-9879, p864)
  { idx: 4, page: 864, phrases: ['магтах үгсийг хэрхэн олох вэ'] },
  // 6 (L9880-9882, p864)
  { idx: 5, page: 864, phrases: ['Израилийн баяр хөөр, Йерусалимын цог жавхлан'] },
]

// gospelCanticle 섹션의 (구현 후) 기대 형태 — 현재 타입에는 candidates/
// selectedIndex/rubric 가 없으므로 superset 인터페이스로 캐스팅한다.
interface GCCandidateLike {
  text: string
  page?: number
}
interface GospelCanticleLike {
  type: 'gospelCanticle'
  antiphon: string
  candidates?: GCCandidateLike[]
  selectedIndex?: number
  rubric?: string
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

async function gc(date: string, opts?: { celebrationId?: string }): Promise<GospelCanticleLike> {
  const h = await assembleHour(date, 'lauds', opts)
  expect(h).not.toBeNull()
  const s = h!.sections.find((x) => x.type === 'gospelCanticle')
  expect(s, 'lauds 에 gospelCanticle(Benedictus) 섹션이 존재해야 함').toBeDefined()
  return s as unknown as GospelCanticleLike
}

// @fr FR-168
describe('FR-168 [D1] saturday-mary Lauds Benedictus 후렴 = 옵션1(default), 평일과 불일치', () => {
  it('성모 후렴이 평일(ferial) 후렴과 byte 불일치한다 (현재 동일 → RED)', async () => {
    const ferial = await gc(OT_SATURDAY) // default (성모 미선택)
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    // 현재: mary.antiphon === ferial.antiphon === FERIAL_BENEDICTUS → 아래 둘 다 FAIL.
    expect(mary.antiphon).not.toBe(ferial.antiphon)
    expect(mary.antiphon).not.toBe(FERIAL_BENEDICTUS)
  })

  it('성모 후렴 기본값 = 옵션1 (selectedIndex 0 + 옵션1 원문 지문)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    expect(mary.selectedIndex ?? 0).toBe(0)
    const a = norm(mary.antiphon)
    for (const p of OPT_PHRASES[0].phrases) expect(a).toContain(p)
  })

  it('default antiphon == candidates[selectedIndex] (옵션1 평문 동기화)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    const idx = mary.selectedIndex ?? 0
    expect(idx).toBe(0)
    expect(mary.candidates, 'candidates 배열이 존재해야 함').toBeDefined()
    const sel = (mary.candidates ?? [])[idx]?.text ?? '__no-candidate__'
    expect(norm(mary.antiphon)).toBe(norm(sel))
  })
})

// @fr FR-168
describe('FR-168 [D2] 6개 후렴 candidates 보존 (드롭다운 데이터 원천)', () => {
  it('candidates = 정확히 6개', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    expect(mary.candidates).toBeDefined()
    expect(mary.candidates).toHaveLength(6)
  })

  it('각 옵션 텍스트 = breviary L9856-9882 원문 지문 (옵션 순서 보존)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    const cands = mary.candidates ?? []
    for (const opt of OPT_PHRASES) {
      const text = norm(cands[opt.idx]?.text ?? '')
      for (const phrase of opt.phrases) {
        expect(text, `옵션${opt.idx + 1} 원문 지문 누락`).toContain(phrase)
      }
    }
  })
})

// @fr FR-168
describe('FR-168 [D3] 안내 루브릭 — 별도 필드(후렴 본문과 분리)', () => {
  it('rubric 필드 = breviary L9854 원문 (현재 부재 → RED)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    expect(mary.rubric).toBeDefined()
    expect(norm(mary.rubric ?? '')).toBe(RUBRIC)
  })

  it('루브릭이 후렴 본문(antiphon)에 혼입되지 않는다 (D3-E2 분리)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    expect(mary.antiphon).not.toContain('Дараах шад магтаалуудын')
  })

  // 회귀 가드 (현재도 통과): 평일/성모 미선택은 candidates·rubric 미부여 →
  // 단일 후렴(legacy) 경로. 구현 후에도 평일은 드롭다운/루브릭이 없어야 함.
  it('[D3-E1 guard] 평일·성모 미선택 Lauds 는 candidates/rubric 미부여', async () => {
    const ferial = await gc(OT_SATURDAY) // default
    expect(ferial.candidates).toBeUndefined()
    expect(ferial.rubric).toBeUndefined()
    const weekday = await gc(PLAIN_WEEKDAY)
    expect(weekday.candidates).toBeUndefined()
    expect(weekday.rubric).toBeUndefined()
  })
})

// @fr FR-168
describe('FR-168 [D4] 후렴 데이터 무결성 + authentic 몽골어 (NFR-002)', () => {
  it('정확히 6개 · 비공백 · 중복 0 · page ∈ {863,864}', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    const cands = mary.candidates ?? []
    expect(cands).toHaveLength(6)
    for (const c of cands) expect(norm(c.text).length).toBeGreaterThan(0)
    const uniq = new Set(cands.map((c) => norm(c.text)))
    expect(uniq.size).toBe(6)
    for (const c of cands) expect([863, 864]).toContain(c.page)
  })

  it('영어 fallback 0 — 후렴/루브릭/antiphon 에 라틴 문자 없음 (NFR-002)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    const latin = /[A-Za-z]/
    for (const c of mary.candidates ?? []) {
      expect(c.text, '후렴에 영어 혼입').not.toMatch(latin)
    }
    expect(mary.rubric ?? '', '루브릭에 영어 혼입').not.toMatch(latin)
    expect(mary.antiphon, 'antiphon 에 영어 혼입').not.toMatch(latin)
  })

  it('맞춤법 빈출 오타 부재 (Гүйлтын/Зургадугаар — CLAUDE.md)', async () => {
    const mary = await gc(OT_SATURDAY, { celebrationId: 'saturday-mary' })
    const blob =
      (mary.candidates ?? []).map((c) => c.text).join(' ') + ' ' + (mary.rubric ?? '')
    expect(blob).not.toContain('Гүйлтын') // 옳음: Гуйлтын
    expect(blob).not.toContain('Зургадугаар') // 옳음: Зургаадугаар
  })
})
