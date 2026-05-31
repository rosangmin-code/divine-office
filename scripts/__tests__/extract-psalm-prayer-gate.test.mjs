/**
 * GOAL #105 / WI #109 ([#105-sub-4]) — 시편기도 continuation gate
 * — **파서 단위 픽스처 계층 (a) RED 테스트** (`extractPsalmPrayer` 직접 호출).
 *
 * 계약: docs/research/GOAL105-spec.md §A(completeness-gate) + §C7a(파서 단위
 *   픽스처 — sweep 로직중복 drift 방지) + §D.3a.
 * 시나리오: §1(시편114 흡수) / §2.1(완결→미흡수) / §2.2(미완결+END_MARKER→STOP).
 * 불변식: MM C1 / spec §0 (하드가드 선행 → SKIP → 미완결 ABSORB → 완결 STOP).
 *
 * ⚠️ RED — 현재 `scripts/extract-psalm-texts.js` 는 (i) `extractPsalmPrayer` 를
 * **export 하지 않고** (ii) 로드 시 `main()` 을 **무가드 실행**(L551)한다. 따라서:
 *   - 본 테스트의 직접호출 단위검증을 위해 fix(#111)는 함수 export +
 *     `if (require.main === module) main()` 가드(테스트 가능성 리팩터)를 해야 함.
 *   - export 전까지 `extractPsalmPrayer` 는 undefined → 아래 단언 FAIL(RED).
 *   - 현재 무가드 main() 이 로드 시 psalter-texts.json 을 덮어쓰는 부작용 방지를
 *     위해 require 직전 `fs.writeFileSync` 를 mock(데이터 손상 차단). 소스
 *     코퍼스(parsed_data)가 worktree 에 부재하므로 main() 은 빈 산출을 쓰려다
 *     실패/빈값 → mock 으로 디스크 무영향. (fix 의 가드 추가 후 require 는 main 미실행.)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const fs = require('fs')

let mod = {}
beforeAll(() => {
  // 데이터 손상 방지: 무가드 main() 의 writeFileSync 를 no-op 으로.
  const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  try {
    mod = require('../extract-psalm-texts.js')
  } catch {
    // 소스 부재 시 main() throw 가능 — RED 단언이 잡으므로 무시.
    mod = mod || {}
  } finally {
    spy.mockRestore()
  }
})

const MARKER = 'Дууллыг төгсгөх залбирал'

// [§1] 시편114형: 직전末 미완결(쉼표) + 노이즈(페이지번호/러닝헤더) + 대문자
// continuation → 흡수 → 종결 болтугай. 까지, 다음 END_MARKER 에서 STOP.
const FIXTURE_PSALM114 = [
  MARKER,
  'Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай далд нууц байдаг төгс хүчит Тэнгэрбурхан минь,',
  '',
  '71',
  'Ням гарагийн орой',
  '',
  '71',
  'Та ус ба Сүнсний төрөлтөөр шинэ Израилийг амьдруулж,',
  'Таныг тахин шүтэх болтугай.',
  '',
  'Шад магтаал',
]

// [§2.1] 완결(末 .) + 다음 섹션 라벨(대문자, END_MARKER 아님) → 흡수 금지(STOP).
const FIXTURE_STOP_COMPLETE = [
  MARKER,
  'Аяа, Эзэн минь, биднийг Та хамгаалж өгнө үү.',
  '',
  'Амилалтын улирал: Эзэн биднийг хамгаалаач.',
]

// [§2.2] 미완결(쉼표) + 다음줄이 END_MARKER → 하드가드 우선 STOP(흡수 금지).
const FIXTURE_INCOMPLETE_THEN_MARKER = [
  MARKER,
  'Аяа, төгс хүчит Тэнгэрбурхан минь,',
  '',
  'Шад магтаал',
]

function ready() {
  return typeof mod.extractPsalmPrayer === 'function'
}

// @fr GOAL-105 [D1]
describe('GOAL#105 [a-fixture] extractPsalmPrayer export + 직접호출 가능 (테스트가능성)', () => {
  it('fix(#111) 는 extractPsalmPrayer 를 export 해야 함 (현재 미export → RED)', () => {
    expect(typeof mod.extractPsalmPrayer).toBe('function')
  })
})

// @fr GOAL-105 [D1]
describe('GOAL#105 [§1] 미완결 + 노이즈 + 대문자 continuation → 흡수(болтугай. 종결)', () => {
  it('시편114 픽스처 → 후반 흡수: Та ус ба 포함 + болтугай. 종결', () => {
    if (!ready()) return expect(typeof mod.extractPsalmPrayer).toBe('function') // RED guard
    const out = mod.extractPsalmPrayer(FIXTURE_PSALM114, 0)
    expect(out).toContain('Та ус ба Сүнсний')
    expect(String(out).trim().endsWith('болтугай.')).toBe(true)
    expect(String(out)).not.toContain('Шад магтаал') // END_MARKER 미혼입
  })
})

// @fr GOAL-105 [D2]
describe('GOAL#105 [§2.1] 완결 기도 + 다음 섹션 라벨 → 흡수 금지(over-absorb 0)', () => {
  it('완결(өгнө үү.) 직후 Амилалтын улирал: 라벨 미흡수', () => {
    if (!ready()) return expect(typeof mod.extractPsalmPrayer).toBe('function')
    const out = mod.extractPsalmPrayer(FIXTURE_STOP_COMPLETE, 0)
    expect(String(out).trim().endsWith('өгнө үү.')).toBe(true)
    expect(String(out)).not.toContain('Амилалтын улирал')
  })
})

// @fr GOAL-105 [D2]
describe('GOAL#105 [§2.2] 미완결 + 다음줄 END_MARKER → 하드가드 우선 STOP', () => {
  it('미완결(минь,) 직후 Шад магтаал(END_MARKER) 미흡수, STOP', () => {
    if (!ready()) return expect(typeof mod.extractPsalmPrayer).toBe('function')
    const out = mod.extractPsalmPrayer(FIXTURE_INCOMPLETE_THEN_MARKER, 0)
    expect(String(out)).not.toContain('Шад магтаал')
    expect(String(out).trim().endsWith('минь,')).toBe(true) // 미완결이지만 하드가드로 STOP
  })
})
