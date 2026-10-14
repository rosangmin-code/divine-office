// @fr FR-183
//
// FR-183 — 시편·성경찬가 본문의 "논리 행" 커버리지.
//
// 사용자 규칙 (2026-10-14): 앱은 책의 인쇄행을 1:1 재현하지 않는다. 책에서
// 접힌 행 — 들여쓴 연속행이든, 단 폭이 넘쳐 flush 로 넘어간 잔여행이든 —
// 은 앞 행과 같은 논리 행이다. 앱은 논리 행을 복원해 화면 폭에 맞춰 다시
// 접고, 접힌 줄에만 들여쓰기를 준다. `stanza.phrases[].lineRange` 가 바로
// 그 논리 행 그룹이고, `phrases` 가 없는 블록은 렌더러가 legacy line 경로로
// 떨어져 **접힌 줄에 들여쓰기가 전혀 들어가지 않는다** (psalm-block.tsx).
//
// FR-183 이전에는 135 ref 중 3개가 `phrases` 미보유였고, 그중 둘이 실제로
// 화면에 나갔다 — `Psalm 118:1-16` (주일 아침, 시편 2·4주)과
// `Isaiah 61:10-62:5` (수요일 아침, 4주). 둘 다 PDF x 좌표 재추출 +
// 인쇄면 대조로 논리 행을 복원했다.
//
// `lines[].indent` 필드는 이 판정에 쓰지 않는다 — 실측 결과 과잉·누락·반전이
// 섞여 있어 신뢰할 수 없다(FR-183 조사). 근거는 PDF 조판 좌표뿐이다.

import { describe, it, expect } from 'vitest'
import rich from '../../data/loth/prayers/commons/psalter-texts.rich.json'
import week1 from '../../data/loth/psalter/week-1.json'
import week2 from '../../data/loth/psalter/week-2.json'
import week3 from '../../data/loth/psalter/week-3.json'
import week4 from '../../data/loth/psalter/week-4.json'
import compline from '../../data/loth/ordinarium/compline.json'

type Span = { text?: string }
type Line = { spans: Span[] }
type Phrase = { lineRange: [number, number] }
type Block = {
  kind: string
  lines?: Line[]
  phrases?: Phrase[]
  paragraphBoundaries?: number[]
}
type Entry = { stanzasRich?: { blocks?: Block[] } }

const entries = Object.entries(rich as unknown as Record<string, Entry>)
const stanzaBlocks = (e: Entry): Block[] =>
  (e.stanzasRich?.blocks ?? []).filter((b) => b.kind === 'stanza')
const lineText = (l: Line): string => l.spans.map((s) => s.text ?? '').join('')

// 손상된 고아 엔트리. 어떤 시간경도 이 ref 를 참조하지 않으며(아래 테스트가
// 고정), 블록들이 책 p.540(좌단)과 p.541(우단)을 번갈아 가리키는 2단 조판
// 뒤섞임 상태다. 실제 끝기도는 `Psalm 88:2-19`(phrases 보유)를 쓴다.
// 논리 행을 복원하려면 본문 순서부터 재구성해야 하므로 FR-183 범위 밖이다.
const CORRUPT_ORPHAN = 'Psalm 88:2-10'

describe('FR-183 — 시편 rich 의 논리 행(phrase) 커버리지', () => {
  it('phrases 미보유 블록은 손상 고아 엔트리 하나뿐이다 (회귀 가드)', () => {
    const missing = entries
      .filter(([, e]) => stanzaBlocks(e).some((b) => !b.phrases || b.phrases.length === 0))
      .map(([ref]) => ref)
    expect(missing).toEqual([CORRUPT_ORPHAN])
  })

  it('손상 고아 엔트리는 어떤 시간경에서도 참조되지 않는다', () => {
    const refs = new Set<string>()
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) { node.forEach(walk); return }
      const obj = node as Record<string, unknown>
      if (typeof obj.ref === 'string') refs.add(obj.ref)
      Object.values(obj).forEach(walk)
    }
    ;[week1, week2, week3, week4, compline].forEach(walk)
    expect(refs.has(CORRUPT_ORPHAN)).toBe(false)
    // 실제로 렌더되는 쪽은 phrases 를 갖고 있다.
    expect(refs.has('Psalm 88:2-19')).toBe(true)
  })

  it('모든 phrase 가 lines[] 를 빠짐·겹침 없이 정확히 덮는다', () => {
    for (const [ref, e] of entries) {
      for (const [bi, b] of stanzaBlocks(e).entries()) {
        if (!b.phrases || b.phrases.length === 0) continue
        const total = b.lines?.length ?? 0
        let expected = 0
        for (const p of b.phrases) {
          const [start, end] = p.lineRange
          expect(Number.isInteger(start), `${ref} b${bi}`).toBe(true)
          expect(Number.isInteger(end), `${ref} b${bi}`).toBe(true)
          expect(start, `${ref} b${bi} 시작<=끝`).toBeLessThanOrEqual(end)
          expect(start, `${ref} b${bi} 연속`).toBe(expected)
          expect(end, `${ref} b${bi} 범위`).toBeLessThan(total)
          expected = end + 1
        }
        expect(expected, `${ref} b${bi} 전체 커버`).toBe(total)
      }
    }
  })

  it('문단 경계는 언제나 phrase 의 시작 행이다', () => {
    for (const [ref, e] of entries) {
      for (const [bi, b] of stanzaBlocks(e).entries()) {
        if (!b.paragraphBoundaries || !b.phrases) continue
        const starts = new Set(b.phrases.map((p) => p.lineRange[0]))
        for (const pb of b.paragraphBoundaries) {
          expect(starts.has(pb), `${ref} b${bi} 문단경계 ${pb}`).toBe(true)
        }
      }
    }
  })

  // 인쇄면(책 p.406–408)에서 직접 확인한 병합. 들여쓴 연속행 8 + 단 폭
  // 넘침 잔여행 3 = 11건, 인쇄행 71 → 논리행 60.
  it('Psalm 118:1-16 — 책이 접은 11행이 앞 행과 한 논리 행으로 묶인다', () => {
    const blocks = stanzaBlocks((rich as unknown as Record<string, Entry>)['Psalm 118:1-16'])
    const joined = (bi: number, start: number, end: number): string =>
      (blocks[bi].lines ?? []).slice(start, end + 1).map(lineText).join(' ')
    const merged = blocks.flatMap((b, bi) =>
      (b.phrases ?? [])
        .filter((p) => p.lineRange[1] > p.lineRange[0])
        .map((p) => [bi, ...p.lineRange] as const),
    )
    expect(merged).toHaveLength(11)
    // 들여쓴 연속행 (책 p.406)
    expect(joined(0, 9, 10)).toBe('ЭЗЭН надад хариулж, намайг уудам газарт авчирсан.')
    expect(joined(0, 15, 16)).toBe('Хүнд итгэхээс ЭЗЭНий дотор хоргодох нь илүү дээр.')
    // 단 폭 넘침으로 flush 처리된 잔여행 (책 p.407 / p.408)
    expect(joined(0, 32, 33)).toBe('ЭЗЭНий баруун мутар эрэлхэг зоригтойгоор үйлддэг.')
    expect(joined(1, 22, 23)).toBe('Тахилыг тахилын ширээний эврэнд уяагаар холбогтун.')
    const logical = blocks.reduce((n, b) => n + (b.phrases?.length ?? 0), 0)
    const printed = blocks.reduce((n, b) => n + (b.lines?.length ?? 0), 0)
    expect([printed, logical]).toEqual([71, 60])
  })

  // 인쇄면(책 p.459–460): 들여쓴 연속행 2건뿐, 넘침 없음. 32 → 30.
  it('Isaiah 61:10-62:5 — 책이 들여쓴 2행만 묶인다', () => {
    const blocks = stanzaBlocks((rich as unknown as Record<string, Entry>)['Isaiah 61:10-62:5'])
    const joined = (bi: number, start: number, end: number): string =>
      (blocks[bi].lines ?? []).slice(start, end + 1).map(lineText).join(' ')
    const merged = blocks.flatMap((b, bi) =>
      (b.phrases ?? [])
        .filter((p) => p.lineRange[1] > p.lineRange[0])
        .map((p) => [bi, ...p.lineRange] as const),
    )
    expect(merged).toHaveLength(2)
    expect(joined(4, 2, 3)).toBe('Харин чамайг “Түүний доторх Миний баяр хөөр” гээд,')
    expect(joined(4, 5, 6)).toBe('Учир нь ЭЗЭН чамайг таалж, газар чинь гэрлэх болно.')
    const logical = blocks.reduce((n, b) => n + (b.phrases?.length ?? 0), 0)
    const printed = blocks.reduce((n, b) => n + (b.lines?.length ?? 0), 0)
    expect([printed, logical]).toEqual([32, 30])
  })
})
