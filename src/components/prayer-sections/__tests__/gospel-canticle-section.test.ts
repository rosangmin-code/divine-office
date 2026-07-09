/**
 * Unit tests for wi-002 / #208 — `GospelCanticleSection` antiphonRich render
 * branch. Rendered via `react-dom/server` (no jsdom) — matches the existing
 * pattern in `psalm-block-phrases.test.ts`. Structural-substring asserts —
 * NOT exact match — so cosmetic class re-ordering does not flake.
 *
 * Coverage:
 *   - antiphonRich absent → legacy plain `AntiphonBox` (no regression)
 *   - antiphonRich present + non-empty → rich path (data-render-mode="rich")
 *   - antiphonRich present but `blocks: []` → defensive legacy fallback
 *   - text-emphasis spans (italic / bold) → emphasis classes propagate
 *   - rubric span / rubric-line block → red + not-italic override (PDF
 *     rubric is red and upright; parent wrapper is italic)
 *   - versicle / response spans → "В. " / "Х. " prefixes (Mongolian)
 *   - stanza block → multi-line spans space-separated
 *   - divider block → skipped (no marker emitted)
 *   - rich-only entry (plain `antiphon` empty, antiphonRich present) →
 *     STILL renders (regressed gate fix: `(antiphon || hasRich)`)
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type React from 'react'
import { GospelCanticleSection } from '../gospel-canticle-section'
import type { HourSection, PrayerText } from '@/lib/types'

// Local type alias renamed to avoid shadowing the imported component value
// `GospelCanticleSection` (per #207 review fix #4 — `nit` rename).
type GospelCanticleSectionLike = Extract<HourSection, { type: 'gospelCanticle' }>

function makeSection(
  overrides: Partial<GospelCanticleSectionLike> = {},
): GospelCanticleSectionLike {
  return {
    type: 'gospelCanticle',
    canticle: 'nuncDimittis',
    antiphon:
      'Эзэн минь, биднийг сэрүүн байхад ч хамгаалж, унтаж байхад ч сахин хамгаална уу.',
    text: 'Эзэн минь, одоо Та зарцаа амар амгалан явуулна уу.',
    page: 515,
    bodyPage: 515,
    ...overrides,
  } as GospelCanticleSectionLike
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// @fr FR-161
describe('GospelCanticleSection — antiphonRich render branch (#208)', () => {
  it('renders legacy plain AntiphonBox when antiphonRich is absent (no regression)', () => {
    const section = makeSection() // no antiphonRich
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-role="antiphon"')
    expect(html).not.toContain('data-render-mode="rich"')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
    expect(html).toContain('Шад магтаал')
  })

  it('renders rich path when antiphonRich is present + non-empty', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            {
              kind: 'text',
              text: 'Эзэн минь, биднийг сэрүүн байхад ч хамгаалж, унтаж байхад ч сахин хамгаална уу.',
            },
          ],
        },
      ],
      page: 515,
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('data-role="antiphon"')
    expect(html).toContain('text-amber-800')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
    expect(html).toContain('Шад магтаал')
  })

  it('falls back to legacy when antiphonRich has zero blocks (defensive)', () => {
    const antiphonRich: PrayerText = { blocks: [] }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).not.toContain('data-render-mode="rich"')
    expect(html).toContain('data-role="antiphon"')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
  })

  it('rich path renders rubric span with not-italic override but NO red (WI #21)', () => {
    // WI #21 (2026-05-15): 사용자 directive — '막토 안에는 빨간 글씨 필요 없어'
    // — rubric kind 스팬에서 `text-red-700 dark:text-red-400` 트리거 제거.
    // `not-italic` 은 부모 AntiphonBox 의 italic 을 상쇄하기 위해 유지.
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            { kind: 'text', text: 'Тэнгэрбурханы жигүүр дор ' },
            { kind: 'rubric', text: '(Аллэлуяа)' },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('(Аллэлуяа)')
    // WI #21: rubric 스팬에는 red className 이 없어야 함 (안티폰 영역 전체).
    // 단 섹션 헤딩 (L205) 의 'Сайнмэдээний айлдлын магтаал' 라벨은 별도
    // path 로 빨간색 그대로이므로 anchor 매칭으로 안티폰 영역만 검증.
    expect(html).toMatch(
      /<span[^>]*class="not-italic"[^>]*>\(Аллэлуяа\)<\/span>/,
    )
    // Rubric span 자체는 red 가 아님 — `class="not-italic"` 단독.
    expect(html).not.toMatch(
      /<span[^>]*class="[^"]*text-red-[^"]*"[^>]*>\(Аллэлуяа\)<\/span>/,
    )
  })

  it('rich path renders rubric-line block with not-italic but NO red (WI #21)', () => {
    // WI #21 (2026-05-15): rubric-line block 에도 빨간색 제거 적용.
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'rubric-line', text: 'Амилалтын улирал:' },
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'Эзэн амилсан, аллэлуяа.' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Амилалтын улирал:')
    expect(html).toMatch(
      /<span[^>]*class="not-italic"[^>]*>Амилалтын улирал:<\/span>/,
    )
    // WI #21: rubric-line span 자체는 red 가 아님.
    expect(html).not.toMatch(
      /<span[^>]*class="[^"]*text-red-[^"]*"[^>]*>Амилалтын улирал:<\/span>/,
    )
    expect(html).toContain('Эзэн амилсан, аллэлуяа.')
  })

  it('rich path propagates text emphasis (italic + bold) classes', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            { kind: 'text', text: 'Эзэн ' },
            { kind: 'text', text: 'хүчирхэг', emphasis: ['bold'] },
            { kind: 'text', text: ' амилсан, ' },
            { kind: 'text', text: 'үнэхээр', emphasis: ['italic'] },
            { kind: 'text', text: ' амилсан.' },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('font-semibold')
    expect(html).toContain('хүчирхэг')
    // The italic emphasis class is emitted (visually a no-op since the
    // parent is italic, but semantic intent is preserved per renderer
    // contract).
    expect(html).toMatch(/<span[^>]*class="italic"[^>]*>үнэхээр<\/span>/)
  })

  // WI #12 (2026-05-19): Mongolian LOTH PDF 본문에는 'В./Х.' 키릴 접두어
  // 가 등장하지 않는다. PDF convention 은 responsory 와 동일 — versicle
  // (call) 라인은 무접두, response (answer) 라인은 '- ' (hyphen) prefix.
  // gospel-canticle 안티폰의 versicle/response 스팬은 commons / propers
  // 현행 데이터 0건의 forward-compat defense 분기이며, 본 테스트는 분기가
  // 트리거될 때 PDF 규약대로 렌더됨을 가드한다.
  it('rich path renders versicle (no prefix) + response ("- " prefix) per PDF convention (WI #12)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'versicle', text: 'Эзэн дэргэд байх болтугай.' }],
        },
        {
          kind: 'para',
          spans: [{ kind: 'response', text: 'Сүнс хамт байх болтугай.' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    // 본문은 양쪽 모두 그대로 등장.
    expect(html).toContain('Эзэн дэргэд байх болтугай.')
    expect(html).toContain('Сүнс хамт байх болтугай.')
    // 키릴 'В.' / 'Х.' 접두어는 어디에도 등장하지 않음 (PDF 본문 0건).
    expect(html).not.toContain('В.')
    expect(html).not.toContain('Х.')
    // versicle 텍스트 직전에 '- ' 접두 span 이 붙지 않음 (call 무접두).
    expect(html).not.toMatch(
      /<span[^>]*>- <\/span>\s*Эзэн дэргэд байх болтугай\./,
    )
    // response 텍스트 직전에 'not-italic' 클래스 '- ' 접두 span 부착.
    expect(html).toMatch(
      /<span[^>]*class="not-italic"[^>]*>- <\/span>Сүнс хамт байх болтугай\./,
    )
  })

  it('rich path renders stanza-block lines with <br/> line breaks (#217 F-X1)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'stanza',
          lines: [
            { spans: [{ kind: 'text', text: 'Шад нэг' }], indent: 0 },
            { spans: [{ kind: 'text', text: 'Шад хоёр' }], indent: 0 },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Шад нэг')
    expect(html).toContain('Шад хоёр')
    // F-X1 (#217): inter-stanza-line break is now `<br/>` (was inline space
    // — flowed lines together inside the italic AntiphonBox wrapper).
    expect(html).toMatch(/Шад нэг[\s\S]*?<br\s*\/?>[\s\S]*?Шад хоёр/)
    expect(html).toContain('data-render-mode="rich"')
  })

  it('rich path inserts <br/> between blocks (#217 F-X1)', () => {
    // Multi-block antiphon AST (e.g. seasonal Eastertide overlay that
    // appends a parenthetical Alleluia rubric, or sanctoral propers
    // shipping a rubric-line + para combo) MUST render as visually
    // distinct rows. The pre-fix renderer flowed blocks together with
    // a single-space `<span>` separator — visible as run-on prose
    // inside the amber-italic AntiphonBox wrapper. The fix swaps the
    // separator for `<br/>`.
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'para', spans: [{ kind: 'text', text: 'Эхний хэсэг.' }] },
        { kind: 'para', spans: [{ kind: 'text', text: 'Хоёр дахь хэсэг.' }] },
        {
          kind: 'para',
          spans: [{ kind: 'rubric', text: '(Аллэлуяа!)' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    // Expect two `<br/>` between three rendered blocks (block separator
    // is suppressed before the first emitted block).
    const brCount = (html.match(/<br\s*\/?>/g) ?? []).length
    expect(brCount).toBeGreaterThanOrEqual(2)
    // Adjacency: block N text followed by `<br/>` followed by block N+1.
    // Tolerant matcher — react-dom/server emits `</span><br/>` so we
    // span any intermediate close-tags via [\s\S]*?.
    expect(html).toMatch(/Эхний хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?Хоёр дахь хэсэг\./)
    expect(html).toMatch(/Хоёр дахь хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?\(Аллэлуяа!\)/)
  })

  it('rich path skips divider blocks (no marker emitted)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'para', spans: [{ kind: 'text', text: 'Эхний хэсэг.' }] },
        { kind: 'divider' },
        { kind: 'para', spans: [{ kind: 'text', text: 'Хоёр дахь хэсэг.' }] },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Эхний хэсэг.')
    expect(html).toContain('Хоёр дахь хэсэг.')
    // Divider should not insert any divider/aria-hidden marker — it
    // contributes an inter-block boundary that surfaces as the
    // `<br/>` separator before the next emitted block (#217 F-X1).
    expect(html).not.toContain('aria-hidden')
    expect(html).toMatch(/Эхний хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?Хоёр дахь хэсэг\./)
  })

  // Task #222 defensive hardening — pre-fix `firstEmitted` flipped to
  // `false` BEFORE the inner content emission. A para block with empty
  // `spans` would still flip the flag and the NEXT non-empty block would
  // emit a stray leading `<br/>` despite it being the first VISIBLE block.
  // Post-fix the flag flips only after the block actually emitted at
  // least one element.
  it('rich path skips block separator when a para has empty spans (#222 hardening)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        // Empty-spans para — hand-authored / future overlay shape that
        // contributes nothing renderable.
        { kind: 'para', spans: [] },
        // First VISIBLE block — must NOT be preceded by a `<br/>`.
        { kind: 'para', spans: [{ kind: 'text', text: 'Бодит хэсэг.' }] },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('Бодит хэсэг.')
    // Inside the rich antiphon container the leading `<br/>` would be
    // visually a stray empty line. We assert there's no `<br/>` between
    // the wrapper's "Шад магтаал: " label and the first emitted body.
    expect(html).toMatch(/Шад магтаал:[\s\S]*?<\/span>(?!\s*<br)/)
    // Defensive: if there's any `<br/>` it does NOT appear before the
    // first body content.
    const labelIdx = html.indexOf('Бодит хэсэг.')
    const firstBrIdx = html.search(/<br\s*\/?>/)
    if (firstBrIdx !== -1) {
      expect(firstBrIdx).toBeGreaterThan(labelIdx)
    }
  })

  // WI #29 (2026-05-16): compline (nuncDimittis) PDF 순서는 안티폰 → 헤딩 →
  // 본문 → recap 안티폰. PDF page 258 (인쇄본 514-515) 토요일 끝기도 흐름.
  // vespers (magnificat) / lauds (benedictus) 는 헤딩 → 안티폰 → 본문 →
  // recap 안티폰 (기존 컨벤션 보존).
  describe('WI #29 — compline antiphon-first ordering (PDF order)', () => {
    // Helper: locate the heading `<p ... data-role="canticle-heading">`
    // OPENING tag. The wrapping `<section aria-label="<canticle name>">`
    // carries the same name string, so plain `indexOf(name)` finds the
    // aria-label first. Anchoring on `data-role="canticle-heading"`
    // scopes the index to the heading element only — color-independent.
    //
    // WI #30 anchor migration: #29 iter 1 anchor 는 text-red-700 클래스에
    // 결합돼 있었음. 본 WI 에서 헤딩 색상 까망 처리하면서 색상-독립 구조
    // anchor 로 이관 (CLAUDE.md selector 원칙 일치 — 데이터-role 우선).
    const HEADING_TAG_RE = /<p[^>]*data-role="canticle-heading"[^>]*>/
    const headingTagIdx = (html: string): number => {
      const m = html.match(HEADING_TAG_RE)
      return m && m.index !== undefined ? m.index : -1
    }

    it('compline (nuncDimittis) renders antiphon BEFORE heading', () => {
      const section = makeSection({ canticle: 'nuncDimittis' })
      const html = render(createElement(GospelCanticleSection, { section }))
      const antiphonIdx = html.indexOf('data-role="antiphon"')
      const headingIdx = headingTagIdx(html)
      expect(antiphonIdx).toBeGreaterThan(-1)
      expect(headingIdx).toBeGreaterThan(-1)
      // 안티폰 마커가 헤딩 `<p>` 보다 먼저 등장 → PDF 순서 일치.
      expect(antiphonIdx).toBeLessThan(headingIdx)
    })

    it('compline (nuncDimittis) recap antiphon STILL renders after body', () => {
      const section = makeSection({ canticle: 'nuncDimittis' })
      const html = render(createElement(GospelCanticleSection, { section }))
      // 안티폰 마커가 정확히 2번 나와야 함 — 헤딩 위 (PDF 순서) +
      // 본문 아래 recap. ordering swap 이 recap 을 잃지 않음을 가드.
      const matches = html.match(/data-role="antiphon"/g) ?? []
      expect(matches.length).toBe(2)
    })

    it('vespers (magnificat) PRESERVES legacy heading-first ordering', () => {
      const section = makeSection({
        canticle: 'magnificat',
        antiphon: 'Магнификат шад магтаал.',
        text: 'Сэтгэл минь Эзэнийг дээдэлнэ.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      const headingIdx = headingTagIdx(html)
      const antiphonIdx = html.indexOf('data-role="antiphon"')
      expect(headingIdx).toBeGreaterThan(-1)
      expect(antiphonIdx).toBeGreaterThan(-1)
      // 헤딩 `<p>` 가 안티폰보다 먼저 등장 → 기존 컨벤션 (회귀 없음).
      expect(headingIdx).toBeLessThan(antiphonIdx)
    })

    it('lauds (benedictus) PRESERVES legacy heading-first ordering', () => {
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        text: 'Магтан жавхлан өргөе ЭЗЭН Израилийн Тэнгэрбурханд.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      const headingIdx = headingTagIdx(html)
      const antiphonIdx = html.indexOf('data-role="antiphon"')
      expect(headingIdx).toBeGreaterThan(-1)
      expect(antiphonIdx).toBeGreaterThan(-1)
      // 헤딩 `<p>` 가 안티폰보다 먼저 등장 → 기존 컨벤션 (회귀 없음).
      expect(headingIdx).toBeLessThan(antiphonIdx)
    })

    it('compline rich-AST antiphon also renders BEFORE heading', () => {
      const antiphonRich: PrayerText = {
        blocks: [
          {
            kind: 'para',
            spans: [{ kind: 'text', text: 'Эзэн минь, биднийг сахин хамгаалаач.' }],
          },
        ],
      }
      const section = makeSection({ canticle: 'nuncDimittis', antiphonRich })
      const html = render(createElement(GospelCanticleSection, { section }))
      const antiphonIdx = html.indexOf('data-render-mode="rich"')
      const headingIdx = headingTagIdx(html)
      expect(antiphonIdx).toBeGreaterThan(-1)
      expect(headingIdx).toBeGreaterThan(-1)
      expect(antiphonIdx).toBeLessThan(headingIdx)
    })
  })

  // WI #5 (#2-sub-1) — gospel-canticle 헤딩을 다른 prayer-section 헤딩과
  // 동일한 전례 빨강(`text-liturgical-red` = #c1121f / 다크 #ef4444)으로
  // 통일. DESIGN.md(SSOT) §Components "Section title": 섹션 제목은 미사경본·
  // 전례서 루브릭 빨강으로 화면 전반 통일(절기 의미색 season-red 와는 별개의
  // 제목 통일색). 이전 WI-62 의 stone-500 faint 처리는 사용자 결정(빨강
  // 통일)으로 폐기 — 본 describe 는 그 REVERSE. `data-role="canticle-heading"`
  // 색상-독립 anchor 는 그대로 보존 (ordering test #29 anchor + 본 색상 verify).
  describe('WI #5 — canticle heading color (전례 빨강 통일)', () => {
    it('compline heading carries data-role="canticle-heading" + 전례 빨강 (liturgical-red)', () => {
      const section = makeSection({ canticle: 'nuncDimittis' })
      const html = render(createElement(GospelCanticleSection, { section }))
      // data-role anchor 존재 (색상-독립 stable selector — WI #30 도입분 보존)
      expect(html).toMatch(/<p[^>]*data-role="canticle-heading"[^>]*>/)
      // 헤딩 라인의 텍스트가 전례 빨강(text-liturgical-red) 클래스에 들어 있음
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-liturgical-red[^"]*"[^>]*>Сайнмэдээний айлдлын магтаал/,
      )
      // 이전 faint(stone-500) 색은 헤딩에서 제거됨 (REVERSE 회귀 가드)
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-500[^"]*"[^>]*>/,
      )
    })

    it('vespers heading also carries data-role + 전례 빨강 (3 hour 일관)', () => {
      const section = makeSection({
        canticle: 'magnificat',
        antiphon: 'Магнификат шад магтаал.',
        text: 'Сэтгэл минь Эзэнийг дээдэлнэ.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-liturgical-red[^"]*"[^>]*>Мариагийн магтаал/,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-500[^"]*"[^>]*>/,
      )
    })

    it('lauds heading also carries data-role + 전례 빨강', () => {
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        text: 'Магтан жавхлан өргөе.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-liturgical-red[^"]*"[^>]*>Захариагийн магтаал/,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-500[^"]*"[^>]*>/,
      )
    })
  })

  // WI #35 (2026-05-16) — within-canticle paragraph boundaries 시각 표현.
  // 시편 F-X11 #408 의 `paragraphBoundaries` 패턴을 막토 verses path 로 차용.
  // canticles.json 의 3 막토 entry 모두 `paragraphBoundaries: number[]` 가
  // PDF (인쇄 page 34/40/515) 와 대조해 인코딩되며, 본 분기에서 해당 인덱스
  // verse 의 `<p>` 위에 `mt-3` 을 prepend.
  describe('WI #35 — paragraphBoundaries → mt-3 inject (within-canticle paragraph spacing)', () => {
    it('positive: paragraphBoundaries set 일 때 해당 인덱스 verse `<p>` 에 mt-3 + data-paragraph-boundary', () => {
      const section = makeSection({
        canticle: 'magnificat',
        antiphon: 'Магнификат шад магтаал.',
        // PDF page 40 단락 구조 mock — verses[0..3] = 단락 1,
        // verses[4..5] = 단락 2, verses[6..7] = 단락 3.
        verses: [
          'Verse line 0.',
          'Verse line 1.',
          'Verse line 2.',
          'Verse line 3.',
          'Verse line 4.',
          'Verse line 5.',
          'Verse line 6.',
          'Verse line 7.',
        ],
        paragraphBoundaries: [4, 6],
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      // 모든 verse 가 `data-role="gospel-canticle-verse"` 가짐 (색상-독립
      // stable selector).
      const verseTagCount = (
        html.match(/data-role="gospel-canticle-verse"/g) ?? []
      ).length
      expect(verseTagCount).toBe(8)
      // verses[4] / verses[6] 에 `mt-3` + `data-paragraph-boundary="true"`.
      expect(html).toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*class="[^"]*mt-3[^"]*"[^>]*>Verse line 4\./,
      )
      expect(html).toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*class="[^"]*mt-3[^"]*"[^>]*>Verse line 6\./,
      )
      // verses[0] / verses[3] 등 paragraphBoundaries 외 인덱스는 `mt-3`
      // 없음 + `data-paragraph-boundary` attribute 없음.
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*>Verse line 0\./,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*>Verse line 3\./,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*>Verse line 5\./,
      )
    })

    it('negative (additive contract): paragraphBoundaries 부재 → 기존 spacing 유지, 어떤 verse 에도 mt-3 / data-paragraph-boundary 없음', () => {
      const section = makeSection({
        canticle: 'magnificat',
        antiphon: 'Магнификат шад магтаал.',
        verses: ['L0.', 'L1.', 'L2.'],
        // paragraphBoundaries 의도적으로 누락 — pre-WI-35 데이터 shape.
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      // 모든 verse 에 data-role anchor 부착 (회귀 가드).
      expect((html.match(/data-role="gospel-canticle-verse"/g) ?? []).length).toBe(3)
      // 어떤 verse 에도 `mt-3` 없음 (경계 없으면 시편식 `pl-3 md:pl-2`
      // wrapper baseline 만 적용, g-40).
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*class="[^"]*mt-3[^"]*"/,
      )
      // 어떤 verse 에도 `data-paragraph-boundary="true"` 없음.
      expect(html).not.toMatch(
        /data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"/,
      )
      // 외곽 시편식 `pl-3 md:pl-2` wrapper baseline 유지 (g-40: space-y-1
      // 제거 → hanging-indent wrapper 로 의도 변경, gospel-canticle-section.tsx L417).
      expect(html).toMatch(/<div[^>]*class="[^"]*pl-3[^"]*"/)
    })

    it('empty paragraphBoundaries array 도 부재와 동일 동작 (defensive)', () => {
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        verses: ['L0.', 'L1.', 'L2.'],
        paragraphBoundaries: [],
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect((html.match(/data-role="gospel-canticle-verse"/g) ?? []).length).toBe(3)
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*class="[^"]*mt-3[^"]*"/,
      )
      expect(html).not.toMatch(
        /data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"/,
      )
    })

    it('benedictus 실제 canticles.json paragraphBoundaries=[1,3,5,7,9,12,15,18,21] 와 동일 동작', () => {
      // FR-167 / WI #37 — capital-start 재분절 후 benedictus 25 verse,
      // paragraphBoundaries [1,3,5,7,9,12,15,18,21] (9 단락 — 현행 시각
      // 단락 구조 보존). verses[]는 실제 canticles.json benedictus 길이(25)
      // 와 동일한 mock, paragraphBoundaries 도 새 값과 동일.
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        verses: Array.from({ length: 25 }, (_, i) => `B-${i}.`),
        paragraphBoundaries: [1, 3, 5, 7, 9, 12, 15, 18, 21],
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      // mt-3 가 정확히 9번 (paragraphBoundaries 길이) 등장.
      const mt3Count = (
        html.match(/data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*class="[^"]*mt-3/g) ?? []
      ).length
      expect(mt3Count).toBe(9)
      // 경계 인덱스 verse 들이 모두 boundary 표시.
      expect(html).toMatch(/data-paragraph-boundary="true"[^>]*>B-1\./)
      expect(html).toMatch(/data-paragraph-boundary="true"[^>]*>B-21\./)
      // 비-경계 인덱스 verse (예: 0, 2, 16, 24) 는 boundary 미부착.
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-0\./)
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-2\./)
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-24\./)
    })

    it('canticles.json source — 3 막토 entry 모두 paragraphBoundaries 부착되어 있음', async () => {
      // canticles.json SSOT 직접 import 해서 데이터 보존 검증.
      const data = (await import('@/data/loth/ordinarium/canticles.json'))
        .default as Record<string, { paragraphBoundaries?: number[]; verses?: string[] }>
      // FR-167 / WI #37 (2026-05-26) — capital-start 재분절 후 새 인덱스.
      // 현행 시각 단락 구조 보존 매핑(현 paragraphBoundaries 의 앵커 텍스트를
      // 새 verses[] 인덱스로 무손실 환산). benedictus [1,2,3,4,5,8,12,14,16]
      // → [1,3,5,7,9,12,15,18,21], magnificat [4,6,8,9] → [5,7,11,13],
      // nuncDimittis [1,2] 불변(이미 capital 규칙 정합). SoT 도출:
      // `scripts/extract-gospel-canticles.mjs --verify` (NFR-009l 가드).
      expect(data.benedictus.paragraphBoundaries).toEqual([1, 3, 5, 7, 9, 12, 15, 18, 21])
      expect(data.magnificat.paragraphBoundaries).toEqual([5, 7, 11, 13])
      expect(data.nuncDimittis.paragraphBoundaries).toEqual([1, 2])
      // 모든 boundary 인덱스가 verses[] 범위 안 + 0 이 아님 (스키마 가드).
      for (const key of ['benedictus', 'magnificat', 'nuncDimittis'] as const) {
        const verses = data[key].verses ?? []
        const bounds = data[key].paragraphBoundaries ?? []
        for (const b of bounds) {
          expect(b).toBeGreaterThan(0)
          expect(b).toBeLessThan(verses.length)
        }
      }
    })
  })

  // FR-167 / WI #37 (2026-05-26) — Gospel Canticle 본문 절 구분을 시편과
  // 동일한 'PDF Cyrillic 대문자 시작 = 새 절' 규칙으로 재분절. SoT 도출 +
  // 회귀 가드 = `scripts/extract-gospel-canticles.mjs --verify` (NFR-009l,
  // 시편 `regroupPhrasesByCapitalStart` 동일 로직 재사용). 본 describe 는
  // committed canticles.json 만 사용(full_pdf.txt 불요) — CI 에서 데이터
  // 불변식을 검증한다. 사용자 보고: 'pdf 에서 대문자 시작하는 것으로
  // 절구분 하는 것이 구현이 안 되는 거'.
  // @fr FR-167
  describe('FR-167 / WI #37 — capital-start verse division (committed canticles.json invariants)', () => {
    // 시편 추출 규칙과 동일한 Cyrillic 대문자 클래스(Ө/Ү 포함 몽골 키릴).
    // scripts/build-phrases-into-rich.mjs:172 CYRILLIC_CAPITAL_START_RE 와 일치.
    const CYRILLIC_CAPITAL_START = /^[А-ЯЁӨҮ]/

    async function loadCanticles() {
      return (await import('@/data/loth/ordinarium/canticles.json')).default as Record<
        string,
        { verses?: string[]; paragraphBoundaries?: number[] }
      >
    }

    it('재분절 후 verse 개수: benedictus 25 / magnificat 19 / nuncDimittis 4', async () => {
      const data = await loadCanticles()
      expect(data.benedictus.verses).toHaveLength(25)
      expect(data.magnificat.verses).toHaveLength(19)
      expect(data.nuncDimittis.verses).toHaveLength(4)
    })

    it('불변식: 모든 절의 첫 글자가 Cyrillic 대문자 (capital-start 규칙 — wrap-continuation 흡수 검증)', async () => {
      const data = await loadCanticles()
      for (const key of ['benedictus', 'magnificat', 'nuncDimittis'] as const) {
        const verses = data[key].verses ?? []
        expect(verses.length).toBeGreaterThan(0)
        verses.forEach((v, i) => {
          // 소문자/숫자/따옴표 시작 절이 하나라도 있으면 = wrap-continuation 이
          // 별도 절로 잘못 분리됐다는 뜻(재분절 전 결함). 전부 대문자여야 함.
          expect(
            CYRILLIC_CAPITAL_START.test(v),
            `${key}[${i}] must start with a Cyrillic capital: ${JSON.stringify(v)}`,
          ).toBe(true)
        })
      }
    })

    it('benedictus: 이전 병합 절이 PDF 대문자 라인대로 분리됨 (verse[1]/[2])', async () => {
      const data = await loadCanticles()
      // 재분절 전: verse[1] = "Учир нь Тэр ард түмэндээ очиж, Тэднийгээ золин
      // авчээ." (PDF 두 대문자 시행을 병합). 재분절 후: 두 절로 분리.
      expect(data.benedictus.verses![1]).toBe('Учир нь Тэр ард түмэндээ очиж,')
      expect(data.benedictus.verses![2]).toBe('Тэднийгээ золин авчээ.')
    })

    it('benedictus: 소문자 wrap-continuation 이 직전 절로 흡수됨 (verse[11])', async () => {
      const data = await loadCanticles()
      // 재분절 전: verse[7] = "дурсан санахын тулд юм." (소문자 continuation 이
      // 별도 절로 잘못 분리). 재분절 후: 직전 대문자 절에 공백 join 흡수.
      expect(data.benedictus.verses![11]).toBe(
        'Өвөг Абрахамд маань өргөсөн тангаргыг дурсан санахын тулд юм.',
      )
    })

    it('magnificat: PDF 대문자 라인대로 분리 (verse[3]/[4]) + continuation 흡수 (verse[5])', async () => {
      const data = await loadCanticles()
      // 재분절 전 verse[3] = "Харагтун, энэ цагаас хойш Бүх үеийнхэн намайг
      // ерөөлтэй гэж тооцох болно." (병합) → 두 절로 분리.
      expect(data.magnificat.verses![3]).toBe('Харагтун, энэ цагаас хойш')
      expect(data.magnificat.verses![4]).toBe('Бүх үеийнхэн намайг ерөөлтэй гэж тооцох болно.')
      // verse[5] = "Учир нь Хүчит Нэгэн"(대문자) + "миний төлөө агуу үйлсийг
      // хийв."(소문자 continuation) 흡수.
      expect(data.magnificat.verses![5]).toBe('Учир нь Хүчит Нэгэн миний төлөө агуу үйлсийг хийв.')
    })

    it('nuncDimittis: 이미 capital 규칙 정합 — 4 절 내용 불변', async () => {
      const data = await loadCanticles()
      expect(data.nuncDimittis.verses).toEqual([
        'Аяа Эзэн минь, Та урьд өгүүлсэнчлэн зардас намайгаа амар амгалангаар эдүгээ чөлөөлтүгэй.',
        'Учир нь миний нүд бүх ард түмний нүүрэн дээр таны бэлтгэсэн авралыг харсан юм.',
        'Энэ нь харь үндэстэнд илчлэгдэх гэгээн гэрэл,',
        'Таны ард түмэн Израилийг алдаршуулах сүр жавхлан юм.',
      ])
    })

    it('절 분절이 렌더에 반영됨: benedictus 25 verse 가 모두 gospel-canticle-verse 로 렌더', async () => {
      const data = await loadCanticles()
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        verses: data.benedictus.verses,
        paragraphBoundaries: data.benedictus.paragraphBoundaries,
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect((html.match(/data-role="gospel-canticle-verse"/g) ?? []).length).toBe(25)
      // 분리된 두 절이 별개 <p> 로 렌더 (병합 잔재 없음).
      expect(html).toContain('Учир нь Тэр ард түмэндээ очиж,')
      expect(html).toContain('Тэднийгээ золин авчээ.')
    })
  })

  it('renders rich path even when plain `antiphon` is empty (#207 gate fix)', () => {
    // Sanctoral / seasonal data may legitimately ship rich-only without
    // a plain string companion — the prior gate `section.antiphon &&`
    // would silently swallow this. After fix #2 the gate is
    // `section.antiphon || hasRich`.
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'Аллэлуяа, аллэлуяа.' }],
        },
      ],
    }
    const section = makeSection({ antiphon: '', antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('Аллэлуяа, аллэлуяа.')
    expect(html).toContain('Шад магтаал')
  })
})
