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

  it('rich path emits Mongolian V/R prefixes for versicle / response spans', () => {
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
    // Cyrillic V (В.) / R (Х.) per Mongolian liturgical convention.
    expect(html).toMatch(/<span[^>]*>В\. <\/span>/)
    expect(html).toMatch(/<span[^>]*>Х\. <\/span>/)
    expect(html).toContain('Эзэн дэргэд байх болтугай.')
    expect(html).toContain('Сүнс хамт байх болтугай.')
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

  // WI #30 (2026-05-16) — 헤딩 색상 까망 처리 + 색상-독립 anchor 마이그레이션.
  // GOAL #20 "제목은 빨간 글씨 그대로 해" 가 사용자 directive 반전으로 무효화.
  describe('WI #30 — canticle heading color (까망 처리)', () => {
    it('compline heading carries data-role="canticle-heading" + stone-800, NO red', () => {
      const section = makeSection({ canticle: 'nuncDimittis' })
      const html = render(createElement(GospelCanticleSection, { section }))
      // data-role anchor 존재 (색상-독립 stable selector)
      expect(html).toMatch(/<p[^>]*data-role="canticle-heading"[^>]*>/)
      // 헤딩 라인의 텍스트가 stone-800 클래스에 들어 있음 (까망)
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-800[^"]*"[^>]*>Сайнмэдээний айлдлын магтаал/,
      )
      // red 클래스 헤딩에 없음 (회귀 가드 — WI #20 반전 확정)
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-red-[^"]*"[^>]*>/,
      )
    })

    it('vespers heading also carries data-role + stone-800 NO red (3 hour 일관)', () => {
      const section = makeSection({
        canticle: 'magnificat',
        antiphon: 'Магнификат шад магтаал.',
        text: 'Сэтгэл минь Эзэнийг дээдэлнэ.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-800[^"]*"[^>]*>Мариагийн магтаал/,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-red-[^"]*"[^>]*>/,
      )
    })

    it('lauds heading also carries data-role + stone-800 NO red', () => {
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        text: 'Магтан жавхлан өргөе.',
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      expect(html).toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-stone-800[^"]*"[^>]*>Захариагийн магтаал/,
      )
      expect(html).not.toMatch(
        /<p[^>]*data-role="canticle-heading"[^>]*class="[^"]*text-red-[^"]*"[^>]*>/,
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
      // 어떤 verse 에도 `mt-3` 없음 (균일 `space-y-1` 만 적용).
      expect(html).not.toMatch(
        /<p[^>]*data-role="gospel-canticle-verse"[^>]*class="[^"]*mt-3[^"]*"/,
      )
      // 어떤 verse 에도 `data-paragraph-boundary="true"` 없음.
      expect(html).not.toMatch(
        /data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"/,
      )
      // 외곽 `space-y-1` baseline 유지.
      expect(html).toMatch(/<div[^>]*class="[^"]*space-y-1[^"]*"/)
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

    it('benedictus 실제 canticles.json paragraphBoundaries=[1,2,3,4,5,8,12,14,16] 와 동일 동작', () => {
      // PDF page 34 의 10 단락 구조를 그대로 재현. verses[]는 실제
      // canticles.json benedictus 의 19 entry, paragraphBoundaries 도 동일.
      const section = makeSection({
        canticle: 'benedictus',
        antiphon: 'Бенедиктус шад магтаал.',
        verses: Array.from({ length: 19 }, (_, i) => `B-${i}.`),
        paragraphBoundaries: [1, 2, 3, 4, 5, 8, 12, 14, 16],
      })
      const html = render(createElement(GospelCanticleSection, { section }))
      // mt-3 가 정확히 9번 (paragraphBoundaries 길이) 등장.
      const mt3Count = (
        html.match(/data-role="gospel-canticle-verse"[^>]*data-paragraph-boundary="true"[^>]*class="[^"]*mt-3/g) ?? []
      ).length
      expect(mt3Count).toBe(9)
      // 경계 인덱스 verse 들이 모두 boundary 표시.
      expect(html).toMatch(/data-paragraph-boundary="true"[^>]*>B-1\./)
      expect(html).toMatch(/data-paragraph-boundary="true"[^>]*>B-16\./)
      // 비-경계 인덱스 verse (예: 0, 6, 7, 10, 13, 15, 17, 18) 는 boundary 미부착.
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-0\./)
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-7\./)
      expect(html).not.toMatch(/data-paragraph-boundary="true"[^>]*>B-18\./)
    })

    it('canticles.json source — 3 막토 entry 모두 paragraphBoundaries 부착되어 있음', async () => {
      // canticles.json SSOT 직접 import 해서 데이터 보존 검증.
      const data = (await import('@/data/loth/ordinarium/canticles.json'))
        .default as Record<string, { paragraphBoundaries?: number[]; verses?: string[] }>
      // 3 entry 모두 paragraphBoundaries: number[] non-empty.
      expect(data.benedictus.paragraphBoundaries).toEqual([1, 2, 3, 4, 5, 8, 12, 14, 16])
      expect(data.magnificat.paragraphBoundaries).toEqual([4, 6, 8, 9])
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
