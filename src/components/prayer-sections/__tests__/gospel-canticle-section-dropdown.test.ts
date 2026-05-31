/**
 * FR-168 / WI #94 ([#90-sub-4]) — saturday-mary Benedictus 후렴 드롭다운 +
 * 루브릭 — **렌더러(컴포넌트) 계층 RED 테스트**.
 *
 * `react-dom/server` 정적 렌더(jsdom 없음) — gospel-canticle-section.test.ts /
 * marian-antiphon-section.test.ts 패턴 차용. 구조-substring 검증.
 *
 * 블루프린트(MM): docs/design/mental-models/goal90-saturday-mary-benedictus-dropdown.md
 *   Design contract — candidates/selectedIndex/rubric, 범위 밖 index → 옵션1
 *   clamp(safeIdx 일관), 루브릭 별도 필드(후렴 본문 혼입 금지) + 드롭다운 동반.
 * 설계 lock: docs/research/GOAL90-sub3-spec.md §4(clamp+루브릭+data-role hook),
 *   §4c test hook: data-role="canticle-antiphon-dropdown"/"canticle-antiphon-rubric",
 *   role="combobox", aria-selected.
 * 시나리오: docs/research/GOAL90-sub2-scenarios.md D2-E2/E3(clamp), D3-E2(분리), D3-E4(a11y).
 *
 * ⚠️ RED — 현재 GospelCanticleSection 은 candidates/selectedIndex/rubric 를
 * 전혀 읽지 않고 단일 section.antiphon 만 렌더한다(#96 develop 전). 따라서 신규
 * data-role/combobox/루브릭 hook 검증은 모두 FAIL 한다. 마지막 guard(평일=
 * legacy 단일 후렴, 드롭다운/루브릭 미렌더)만 회귀 가드로 현재도 통과.
 *
 * selector 축 분리(CLAUDE.md): 기능(드롭다운/combobox/data-role/분리) = 색상·
 * 로케일 독립 anchor. 후렴 6개의 원문 정합(D4)은 데이터 단위 테스트가 담당.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type React from 'react'
import { GospelCanticleSection } from '../gospel-canticle-section'
import type { HourSection } from '@/lib/types'

// 6개 후렴 full text (propers_final.txt L9856-9882 — 페이지 아티팩트 제거 본문).
const OPT_FULL: string[] = [
  'Төгс жаргалт Цэвэр Охин Мариагийн дурсахуйд зориулсан энэ өдрийг агуу их бишрэлтэйгээр ёслон тэмдэглэцгээе. Тэр Эзэн Есүс Христтэй хамт бидний төлөө зуучлан залбирах болтугай.',
  'Дээдийн дээд Эзэн Тэнгэрбурхан энэ дэлхий дээрх бүх эмэгтэйчүүдээс илүү Цэвэр Охин Мариа таныг адисалсан.',
  'Гэм нүгэлгүй, Цэвэр Ариун Мариа таны ачаар алдсан амьдралыг маань бидэнд дахин хайрлан соёрхсон юм. Та тэнгэрээс хүүхэд хүлээн аваад, дэлхийн Аврагчийг төрүүлсэн.',
  'Амар амгалан Мариа минь ээ, Та хишиг ивээлээр бялхам билээ. Эзэн Тантай хамт байна. Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Аллэлуяа!',
  'Гэм нүгэлгүй Цэвэр Ариун Мариа минь ээ, би таныг магтах үгсийг хэрхэн олох вэ? Учир нь таны ачаар бид манай аврагч Эзэн Есүс Христийг хүлээн авсан.',
  'Та бол Израилийн баяр хөөр, Йерусалимын цог жавхлан юм. Та бол манай үндэстний дээд зэргийн нэр төр юм.',
]
// 각 옵션 고유 지문 (다른 옵션과 겹치지 않는 부분).
const OPT_UNIQUE = [
  'Төгс жаргалт Цэвэр Охин Мариагийн дурсахуйд',
  'Дээдийн дээд Эзэн Тэнгэрбурхан энэ дэлхий',
  'дэлхийн Аврагчийг төрүүлсэн',
  'Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Аллэлуяа!',
  'магтах үгсийг хэрхэн олох вэ',
  'Израилийн баяр хөөр, Йерусалимын цог жавхлан',
]
const RUBRIC = 'Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:'
const FERIAL_BENEDICTUS =
  'Эзэн минь, Та биднийг амар амгалангийн зам мөрөөр хөтөлнө үү.'

const CANDIDATES = OPT_FULL.map((text, i) => ({ text, page: i < 3 ? 863 : 864 }))

// 구현 후 기대 형태 — 현재 타입에 candidates/selectedIndex/rubric 부재 →
// superset 캐스팅.
type GCSection = Extract<HourSection, { type: 'gospelCanticle' }>
function makeGC(overrides: Record<string, unknown> = {}): GCSection {
  return {
    type: 'gospelCanticle',
    canticle: 'benedictus',
    antiphon: OPT_FULL[0], // default 평문 동기화(옵션1)
    text: 'Израилийн Тэнгэрбурхан Эзэн магтагдах болтугай!',
    page: 863,
    bodyPage: 34,
    ...overrides,
  } as unknown as GCSection
}
function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// @fr FR-168
describe('FR-168 [D2] GospelCanticleSection 드롭다운 렌더 (candidates 존재 시)', () => {
  it('candidates+selectedIndex=0 → data-role="canticle-antiphon-dropdown" + combobox 노출 (현재 부재 → RED)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ candidates: CANDIDATES, selectedIndex: 0, rubric: RUBRIC }),
      }),
    )
    expect(html).toContain('data-role="canticle-antiphon-dropdown"')
    expect(html).toMatch(/role="combobox"/)
    // 커스텀 listbox(hymn/marian 선례): 옵션 li 는 menuOpen 시에만 DOM 에
    // 들어오므로 정적 SSR(닫힘) 에는 옵션2~6 본문이 없다. 정적 계약은
    // (a) combobox 가 6개 선택지를 안내하고 (b) 선택된 옵션1 후렴이 표시됨.
    // 6개 원문 펼침은 상호작용 필요 → e2e D4 가 담당
    // (MEMORY: native select vs custom listbox e2e gotcha).
    expect(html).toContain('Шад магтаал сонгох (6)')
    expect(html).toContain(OPT_UNIQUE[0])
  })

  it('selectedIndex=2 → 화면 후렴 = 옵션3 (renderer 가 selectedIndex 반영, 현재 옵션1 → RED)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ candidates: CANDIDATES, selectedIndex: 2, rubric: RUBRIC }),
      }),
    )
    // 표시 후렴 본문(AntiphonBox)에 옵션3 고유 지문이 보여야 함.
    expect(html).toContain('дэлхийн Аврагчийг төрүүлсэн')
  })
})

// @fr FR-168
describe('FR-168 [D2-E2/E3] 범위 밖/손상 index → 옵션1 clamp (크래시·빈 후렴 없음)', () => {
  it('selectedIndex=9 (OOR) → 드롭다운 노출 + 후렴 = 옵션1 (RED: 드롭다운 부재)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ candidates: CANDIDATES, selectedIndex: 9, rubric: RUBRIC }),
      }),
    )
    expect(html).toContain('data-role="canticle-antiphon-dropdown"')
    // clamp → 옵션1 표시, 빈 후렴/타옵션 아님.
    expect(html).toContain(OPT_UNIQUE[0])
    expect(html).not.toContain(OPT_UNIQUE[5])
  })

  it('selectedIndex=NaN (손상) → 드롭다운 노출 + 후렴 = 옵션1 (RED: 드롭다운 부재)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({
          candidates: CANDIDATES,
          selectedIndex: Number.NaN,
          rubric: RUBRIC,
        }),
      }),
    )
    expect(html).toContain('data-role="canticle-antiphon-dropdown"')
    expect(html).toContain(OPT_UNIQUE[0])
  })
})

// @fr FR-168
describe('FR-168 [D3] 안내 루브릭 렌더 (후렴 본문과 분리, 드롭다운 동반)', () => {
  it('rubric → data-role="canticle-antiphon-rubric" 별도 요소로 노출 (현재 부재 → RED)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ candidates: CANDIDATES, selectedIndex: 0, rubric: RUBRIC }),
      }),
    )
    expect(html).toContain('data-role="canticle-antiphon-rubric"')
    expect(html).toContain(RUBRIC)
    // 드롭다운과 동반(둘 다 존재) — 루브릭만 단독 노출 금지.
    expect(html).toContain('data-role="canticle-antiphon-dropdown"')
  })

  // 회귀 가드(현재도 통과): candidates 부재(평일) → legacy 단일 후렴 경로.
  // 드롭다운/루브릭/combobox 미렌더, 기존 AntiphonBox 만.
  it('[guard] candidates 부재(평일) → 드롭다운/루브릭/combobox 미렌더 (legacy 단일 후렴)', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ antiphon: FERIAL_BENEDICTUS }),
      }),
    )
    expect(html).not.toContain('data-role="canticle-antiphon-dropdown"')
    expect(html).not.toContain('data-role="canticle-antiphon-rubric"')
    expect(html).not.toMatch(/role="combobox"/)
    expect(html).toContain('data-role="antiphon"') // 기존 단일 후렴은 유지
  })
})

// @fr FR-168
describe('FR-168 [D3-E4] 접근성(a11y) — combobox role + listbox 팝업 제어', () => {
  it('드롭다운 combobox 가 listbox 팝업 제어(aria-haspopup/aria-expanded) 노출', () => {
    const html = render(
      createElement(GospelCanticleSection, {
        section: makeGC({ candidates: CANDIDATES, selectedIndex: 0, rubric: RUBRIC }),
      }),
    )
    expect(html).toMatch(/role="combobox"/)
    // 닫힘 combobox 의 a11y 계약(정적 SSR): listbox 팝업 제어 표시.
    // aria-selected 는 옵션 li(menuOpen) 속성 → e2e a11y(D3-E4)가 열어서 검증.
    expect(html).toMatch(/aria-haspopup="listbox"/)
    expect(html).toMatch(/aria-expanded=/)
  })
})
