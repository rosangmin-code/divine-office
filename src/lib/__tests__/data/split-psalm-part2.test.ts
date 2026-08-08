import { describe, expect, it } from 'vitest'

import week1 from '@/data/loth/psalter/week-1.json'
import week2 from '@/data/loth/psalter/week-2.json'
import week3 from '@/data/loth/psalter/week-3.json'
import week4 from '@/data/loth/psalter/week-4.json'
import psalterTexts from '@/data/loth/psalter-texts.json'
import psalterTextsRich from '@/data/loth/prayers/commons/psalter-texts.rich.json'

// 2026-08-08 회귀 방지 — docs/bug-reports/2026-08-08-split-psalm-part2-missing.md
//
// 긴 시편은 책에서 I부 / II부로 나뉘어 인쇄되고 각 부에 고유 후렴이 붙는다.
// week-*.json 의 두 슬롯이 같은 `ref` 를 들고 있으면 `resolvePsalm` 이 같은
// 본문을 두 번 내려 **I부가 두 번 렌더되고 II부가 사라진다**. 후렴과
// `antiphonPage` 는 II부 것이 맞게 들어 있어 겉보기로는 정상이라 눈으로
// 잡히지 않았고, `verify-psalter-pages.js` 도 두 슬롯의 `page` 가 같으면
// 이상을 못 느껴 5건 중 1건만(그것도 쪽 오류로 오진해서) 걸렸다.
//
// 그래서 다음 두 가지를 데이터 불변식으로 고정한다:
//   (1) 한 시간전례 안에서 동일 `ref` 가 두 번 나오지 않는다
//   (2) 참조된 모든 `ref` 는 plain·rich 본문이 실제로 존재한다
//       — ref 중복이 "본문 없음" 을 가려 왔으므로 (1) 만으로는 부족하다.

type PsalmEntry = { type?: string; ref?: string }
type Hour = { psalms?: PsalmEntry[] }
type Day = Record<string, Hour>
type WeekFile = { days?: Record<string, Day> } & Record<string, unknown>

const WEEKS: [number, WeekFile][] = [
  [1, week1 as WeekFile],
  [2, week2 as WeekFile],
  [3, week3 as WeekFile],
  [4, week4 as WeekFile],
]

const plainTexts = psalterTexts as Record<string, { stanzas?: string[][] }>
const richTexts = psalterTextsRich as Record<
  string,
  { stanzasRich?: { blocks?: unknown[] } }
>

/** 모든 (week, day, hour) 의 psalms[] 를 평평하게 훑는다. */
function* eachHour(): Generator<{
  week: number
  day: string
  hour: string
  psalms: PsalmEntry[]
}> {
  for (const [week, file] of WEEKS) {
    const days = (file.days ?? file) as Record<string, Day>
    for (const [day, hours] of Object.entries(days)) {
      if (!hours || typeof hours !== 'object') continue
      for (const [hour, node] of Object.entries(hours)) {
        const psalms = (node as Hour)?.psalms
        if (Array.isArray(psalms)) yield { week, day, hour, psalms }
      }
    }
  }
}

describe('split psalm Part II data invariants', () => {
  // @fr NFR-009c
  it('한 시간전례 안에 동일 ref 가 중복되지 않는다', () => {
    const duplicates: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      const seen = new Map<string, number>()
      for (const p of psalms) {
        if (!p?.ref) continue
        seen.set(p.ref, (seen.get(p.ref) ?? 0) + 1)
      }
      for (const [ref, n] of seen) {
        if (n > 1) duplicates.push(`week-${week} ${day} ${hour}: ${ref} ×${n}`)
      }
    }
    expect(duplicates).toEqual([])
  })

  // @fr NFR-009c
  it('참조된 모든 시편 ref 에 plain·rich 본문이 존재한다', () => {
    const missing: string[] = []
    for (const { week, day, hour, psalms } of eachHour()) {
      for (const [i, p] of psalms.entries()) {
        if (!p?.ref) continue
        const where = `week-${week} ${day} ${hour} psalms[${i}] ${p.ref}`
        if (!plainTexts[p.ref]?.stanzas?.length) missing.push(`${where} — plain 없음`)
        if (!richTexts[p.ref]?.stanzasRich?.blocks?.length) {
          missing.push(`${where} — rich 없음`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  // @fr NFR-009c
  it('분할 시편 5건의 II부가 I부와 다른 본문을 가진다', () => {
    const PAIRS: [string, string][] = [
      ['Psalm 45:2-10', 'Psalm 45:11-18'],
      ['Psalm 49:1-13', 'Psalm 49:14-21'],
      ['Psalm 72:1-11', 'Psalm 72:12-19'],
      ['Psalm 132:1-10', 'Psalm 132:11-18'],
      ['Psalm 145:1-13', 'Psalm 145:14-21'],
    ]
    const flat = (ref: string) => (plainTexts[ref]?.stanzas ?? []).flat().join('\n')
    for (const [one, two] of PAIRS) {
      expect(flat(one), `${one} 본문 없음`).not.toBe('')
      expect(flat(two), `${two} 본문 없음`).not.toBe('')
      expect(flat(two), `${two} 가 ${one} 과 같은 본문`).not.toBe(flat(one))
      // II부는 인쇄면의 부 마커로 시작한다 (I부는 "I")
      expect(plainTexts[two]?.stanzas?.[0]?.[0]).toBe('II')
    }
  })
})
