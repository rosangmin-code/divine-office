/**
 * GOAL #105 / WI #109 ([#105-sub-4]) — 시편114 시편기도 페이지경계 절단 근본수정
 * — **데이터 단언 계층 (c) RED 테스트**.
 *
 * 계약: docs/research/GOAL105-spec.md §D.2b (정확 machine 단언, prose 금지) +
 *       §F([D1]/[D3]) + MM Observable outcome.
 * 시나리오: docs/research/GOAL105-scenarios.md §1([D1]) / §3([D3]) / §6.7(음성단언).
 *
 * ⚠️ RED — 재추출(#111) 전이므로 psalter-texts.json / rich.json 의 시편114
 * psalmPrayer(Rich)가 `...Тэнгэрбурхан минь,` 로 절단 → 아래 완전성 단언은 현재
 * FAIL. 음성 단언(4 drop 라벨 부재) + delta 가드는 현재도 통과(over-absorb 0).
 *
 * 이 계층은 소스 코퍼스(parsed_data) 불필요 — 산출 데이터 파일만 읽으므로
 * worktree 에서 그대로 실행 가능(소스는 worktree untracked, §리더 플래그 참조).
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const psalter = require('../../src/data/loth/psalter-texts.json')
const rich = require('../../src/data/loth/prayers/commons/psalter-texts.rich.json')

const KEY = 'Psalm 114:1-8'
const EXPECT_CONTAINS = 'Та ус ба Сүнсний төрөлтөөр'
const EXPECT_END = 'болтугай.'
const TRUNC_END = 'Тэнгэрбурхан минь,'

// build-psalter-prayers-rich gate 의 flatten 컨벤션(rubric-line 제외)에 정합.
function flattenRich(pr) {
  if (!pr || !Array.isArray(pr.blocks)) return ''
  const out = []
  for (const b of pr.blocks) {
    if (b.kind === 'rubric-line') continue
    if (Array.isArray(b.spans)) {
      for (const s of b.spans) if (typeof s.text === 'string') out.push(s.text)
    } else if (Array.isArray(b.lines)) {
      for (const ln of b.lines) for (const s of ln.spans ?? []) if (typeof s.text === 'string') out.push(s.text)
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

// 4 baseline STOP 의 nextHead(다음 섹션 텍스트) — 어떤 psalmPrayer/Rich 에도
// 흡수되어선 안 됨(§6.7 over-absorb 0).
const DROP_LABELS = [
  'Амилалтын улирал:',  // w2 L3577 next
  'Хоол хүнс өгчээ.',   // w3 L644 next
  'Манаач хүн',         // w4 L55 next
  '(Х. Аллэлуяа!)',     // w4 L691 next
]

// @fr GOAL-105 [D1]
describe('GOAL#105 [D1] 시편114 psalmPrayer 완전성 (plain 경로 산출)', () => {
  it('psalter-texts.json Psalm 114 psalmPrayer = 옵션1 완전체(болтугай. 종결, Та ус ба 포함)', () => {
    const p = psalter[KEY]?.psalmPrayer ?? ''
    expect(p).toContain(EXPECT_CONTAINS) // RED: 현재 절단이라 후반 부재
    expect(p.trim().endsWith(EXPECT_END)).toBe(true) // RED: 현재 'минь,' 종결
    expect(p.trim().endsWith(TRUNC_END)).toBe(false) // RED: 현재 정확히 이 절단
  })
})

// @fr GOAL-105 [D3]
describe('GOAL#105 [D3] 시편114 psalmPrayerRich 완전성 (rich 경로, dual-path 정합)', () => {
  it('rich.json Psalm 114 psalmPrayerRich(flatten) = болтугай. 종결, Та ус ба 포함', () => {
    const flat = flattenRich(rich[KEY]?.psalmPrayerRich)
    expect(flat).toContain('Та ус ба Сүнсний') // RED
    expect(flat.endsWith(EXPECT_END)).toBe(true) // RED: 현재 'минь,'
  })

  it('plain ↔ rich 종결 정합(혼합출력 금지) — 둘 다 болтугай. 로 끝남', () => {
    const p = (psalter[KEY]?.psalmPrayer ?? '').trim()
    const flat = flattenRich(rich[KEY]?.psalmPrayerRich)
    expect(p.endsWith(EXPECT_END) && flat.endsWith(EXPECT_END)).toBe(true) // RED
  })
})

// @fr GOAL-105 [D2]
describe('GOAL#105 [D2] over-absorb 0 — 4 drop 라벨이 어떤 psalmPrayer/Rich 에도 부재 (§6.7)', () => {
  it('4 baseline nextHead 가 모든 psalmPrayer 에 부재', () => {
    const allPrayers = Object.values(psalter)
      .map((e) => e?.psalmPrayer)
      .filter((x) => typeof x === 'string')
    for (const label of DROP_LABELS) {
      const hit = allPrayers.find((p) => p.includes(label))
      expect(hit, `drop 라벨 "${label}" 가 psalmPrayer 에 흡수됨(over-absorb)`).toBeUndefined()
    }
  })

  it('4 baseline nextHead 가 모든 psalmPrayerRich 에 부재', () => {
    const allRich = Object.values(rich)
      .map((e) => flattenRich(e?.psalmPrayerRich))
      .filter((x) => x.length > 0)
    for (const label of DROP_LABELS) {
      const hit = allRich.find((p) => p.includes(label))
      expect(hit, `drop 라벨 "${label}" 가 psalmPrayerRich 에 흡수됨`).toBeUndefined()
    }
  })
})
