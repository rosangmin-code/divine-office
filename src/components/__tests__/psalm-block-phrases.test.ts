/**
 * Unit tests for FR-161 R-4 — `PsalmBlock` phrase-render branch.
 *
 * Asserts the renderer's contract per planer plan §4 (Option B):
 *   - phrases absent → legacy line-by-line render (regression-safe additive)
 *   - phrases present → join `block.lines.slice(start, end+1)` with a space,
 *     emit one viewport-wrappable block per phrase
 *   - phrase.indent (0|1|2) → CSS indent class
 *   - phrase.role ('refrain'|'doxology') → role-tagged data-role + colour/italic
 *
 * Render via `react-dom/server` so tests run without jsdom (matches the
 * existing pattern in `directive-block.test.ts`). The rendered HTML is
 * structural-snapshot inspected via class / data-role substring asserts —
 * NOT exact string match, so cosmetic class re-ordering does not flake.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, PhraseGroup, PrayerBlock, PrayerText } from '@/lib/types'

function makeStanzaBlock(
  lineTexts: string[],
  options: {
    phrases?: PhraseGroup[]
    lineIndents?: (0 | 1 | 2)[]
    paragraphBoundaries?: number[]
  } = {},
): PrayerBlock {
  const lineIndents = options.lineIndents ?? lineTexts.map(() => 0 as const)
  return {
    kind: 'stanza',
    lines: lineTexts.map((text, i) => ({
      spans: [{ kind: 'text', text }],
      indent: lineIndents[i],
    })),
    ...(options.phrases ? { phrases: options.phrases } : {}),
    ...(options.paragraphBoundaries
      ? { paragraphBoundaries: options.paragraphBoundaries }
      : {}),
  } as PrayerBlock
}

function makePsalm(blocks: PrayerBlock[]): AssembledPsalm {
  const stanzasRich: PrayerText = { blocks }
  return {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: 'test antiphon',
    verses: [],
    stanzasRich,
    gloriaPatri: false,
  }
}

function render(node: React.ReactElement): string {
  // Wrap in SettingsProvider — PsalmBlock calls useSettings().
  return renderToStaticMarkup(
    createElement(SettingsProvider, null, node),
  )
}

// @fr FR-161
describe('PsalmBlock — phrase render branch (FR-161 R-4)', () => {
  it('renders legacy line-by-line when phrases is absent (no regression)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Газар хийгээд', 'түүнийг дүүргэдэг бүхэн,']),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Legacy outer keeps `whitespace-pre-line`.
    expect(html).toContain('whitespace-pre-line')
    // No phrase render-mode marker.
    expect(html).not.toContain('data-render-mode="phrase"')
    // Both lines appear as separate <span class="block">.
    expect(html).toContain('Газар хийгээд')
    expect(html).toContain('түүнийг дүүргэдэг бүхэн,')
    const blockSpanCount = (html.match(/<span class="block[^"]*"/g) ?? []).length
    expect(blockSpanCount).toBe(2)
  })

  it('renders a single PhraseGroup as one joined-text span (phrase path)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Газар хийгээд', 'түүнийг дүүргэдэг бүхэн,'], {
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Phrase-mode marker present.
    expect(html).toContain('data-render-mode="phrase"')
    // Outer drops whitespace-pre-line (phrases own the wrap policy now).
    expect(html).not.toContain('whitespace-pre-line')
    // Lines are joined with a single space — assert the joined string is
    // present whole.
    expect(html).toContain('Газар хийгээд түүнийг дүүргэдэг бүхэн,')
    // Exactly one phrase span (with default data-role="psalm-phrase").
    expect(html).toContain('data-role="psalm-phrase"')
    expect(
      (html.match(/data-role="psalm-phrase[a-z-]*"/g) ?? []).length,
    ).toBe(1)
  })

  it('renders multiple PhraseGroups with unified left margin (WI #502 — indent collapsed)', () => {
    // WI #502: 사용자 SoT — phrase.indent 0/1/2 모두 동일한 왼쪽
    // 여백 (pl-6 = 가장 작은 들여쓰기 = indent=0 baseline) 로 통일.
    // 이전 (FR-161 R-13): indent=0 → pl-6, indent=1 → pl-12,
    // indent=2 → pl-18 분기. Psalm 63 b0 line 0-1 vs 2-12 의 indent
    // 차이가 "갑자기 왼쪽 여백이 넓어지는" 효과 → 통일.
    // hanging indent (`-indent-6`) 는 wrap continuation 의 시각
    // 구분 보존 위해 유지.
    const psalm = makePsalm([
      makeStanzaBlock(['Phrase A start', 'Phrase A wrap', 'Phrase B start'], {
        phrases: [
          { lineRange: [0, 1], indent: 0 },
          { lineRange: [2, 2], indent: 1 },
        ],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Two phrase spans.
    const phraseSpans = (html.match(/data-role="psalm-phrase[a-z-]*"/g) ?? []).length
    expect(phraseSpans).toBe(2)
    // First phrase joins lines 0+1, indent=0 → `pl-6 -indent-6`.
    expect(html).toContain('Phrase A start Phrase A wrap')
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Phrase A start Phrase A wrap</)
    // Second phrase indent=1 → ALSO `pl-6 -indent-6` (WI #502 unification).
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Phrase B start</)
  })

  // WI #502 — 왼쪽 여백 통일 회귀 가드. phrase.indent 0/1/2 모두 동일
  // className 출력. hanging indent (`-indent-6`) 는 wrap continuation
  // 의 시각 구분 보존 위해 유지. `phrase.indent` 데이터는 rich.json
  // 에 PDF SoT 로 보존하되 renderer 단에서만 무시.
  it('phrase mode: indent 0/1/2 all render with unified `pl-6 -indent-6` (WI #502)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Level 0', 'Level 1', 'Level 2'], {
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 1 },
          { lineRange: [2, 2], indent: 2 },
        ],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // All three indent levels collapse to the same className (regression guard).
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Level 0</)
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Level 1</)
    expect(html).toMatch(/class="block pl-6 -indent-6"[^>]*>Level 2</)
    // Negative: deeper pl-* modifiers must NOT appear on phrase spans.
    expect(html).not.toMatch(/data-role="psalm-phrase[a-z-]*"[^>]+class="block pl-12/)
    expect(html).not.toMatch(/data-role="psalm-phrase[a-z-]*"[^>]+class="block pl-18/)
  })

  // WI #502 — legacy line mode 통일 회귀 가드. line.indent 0/1/2
  // 모두 동일 className. legacy mode 는 hanging indent 없이 baseline
  // (parent 의 pl-3) 만 사용 — 따라서 indent class 는 empty string.
  it('legacy line mode: line.indent 0/1/2 all render with no `pl-*` modifier (WI #502)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Line A', 'Line B', 'Line C'], {
        lineIndents: [0, 1, 2],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Legacy outer keeps whitespace-pre-line; no render-mode marker.
    expect(html).toContain('whitespace-pre-line')
    expect(html).not.toContain('data-render-mode="phrase"')
    // All three lines collapse to `class="block"` (no indent modifier).
    expect(html).toMatch(/<span class="block">Line A</)
    expect(html).toMatch(/<span class="block">Line B</)
    expect(html).toMatch(/<span class="block">Line C</)
    // Negative: pl-6 / pl-12 must NOT appear on legacy stanza line spans.
    expect(html).not.toMatch(/<span class="block pl-6">/)
    expect(html).not.toMatch(/<span class="block pl-12">/)
  })

  // 사용자 directive (2026-05-14): 시편 본문 전체 까만색 통일. refrain
  // data-role 속성은 보존 (회중 응답 식별 + e2e selector 안정성), 색상
  // 클래스 (`text-red-*`) 는 제거. doxology 의 italic 만 시각 강세 유지.
  it('marks phrase.role refrain with data-role but NO red color class (2026-05-14 policy)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Refrain text'], {
        phrases: [{ lineRange: [0, 0], indent: 0, role: 'refrain' }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // data-role 메타데이터 보존
    expect(html).toContain('data-role="psalm-phrase-refrain"')
    // 색상 클래스 부재 — refrain phrase 의 className 에 text-red-* 가 없음
    expect(html).not.toMatch(/data-role="psalm-phrase-refrain"[^>]+class="[^"]*text-red-/)
    // Joined text present.
    expect(html).toContain('Refrain text')
  })

  it('marks phrase.role doxology with data-role + italic class', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Doxology line'], {
        phrases: [{ lineRange: [0, 0], indent: 0, role: 'doxology' }],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('data-role="psalm-phrase-doxology"')
    expect(html).toMatch(/italic/)
    expect(html).toContain('Doxology line')
  })

  it('falls back to legacy when phrases is an empty array (defensive)', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['Empty phrases'], { phrases: [] }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).not.toContain('data-render-mode="phrase"')
    expect(html).toContain('whitespace-pre-line')
    expect(html).toContain('Empty phrases')
  })

  it('renders mixed: stanza-block-1 with phrases + stanza-block-2 without', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['With phrase'], {
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      }),
      makeStanzaBlock(['Legacy line A', 'Legacy line B']),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Phrase-mode appears (block 1) + legacy whitespace-pre-line (block 2)
    // BOTH appear on the same page output.
    expect(html).toContain('data-render-mode="phrase"')
    expect(html).toContain('whitespace-pre-line')
    expect(html).toContain('With phrase')
    expect(html).toContain('Legacy line A')
    expect(html).toContain('Legacy line B')
  })
})

// @fr FR-161
// F-X11 (#408) — within-stanza paragraph boundary rendering.
// `paragraphBoundaries[]` (line indices in the stanza) instructs the
// renderer to inject a slightly larger gap (mt-3) above the matching
// phrase or line. This sits visually between the per-phrase 0-gap and
// the inter-block stanza-level space-y-5 / space-y-4 gap, so a paragraph
// break is distinguishable from both.
describe('PsalmBlock — F-X11 paragraph boundary rendering', () => {
  it('phrase path: prepends mt-3 + data-paragraph-boundary on the matching phrase', () => {
    // 4 phrases, paragraph boundary BEFORE phrase index 2 (line 2).
    const psalm = makePsalm([
      makeStanzaBlock(['v1', 'v2', 'v3', 'v4'], {
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
        paragraphBoundaries: [2],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('data-render-mode="phrase"')
    // Exactly ONE span carries the boundary marker.
    const matches = html.match(/data-paragraph-boundary="true"/g) ?? []
    expect(matches.length).toBe(1)
    // The boundary span uses mt-3 spacing, alongside the indent class.
    expect(html).toMatch(/data-paragraph-boundary="true"[^>]+class="block pl-6 -indent-6 mt-3"[^>]*>v3</)
    // mt-3 within phrase spans appears exactly once (the boundary).
    // Note: mt-3 also appears on AntiphonBox wrappers and the optional
    // psalm-prayer `<div>`, which are page-level chrome unrelated to
    // F-X11 — assert the boundary-specific occurrence rather than a
    // page-wide count.
    const phraseSpanMt3 = (html.match(/data-role="psalm-phrase[a-z-]*"[^>]+class="[^"]*\bmt-3\b/g) ?? []).length
    expect(phraseSpanMt3).toBe(1)
  })

  it('phrase path: no boundary attribute when paragraphBoundaries is absent', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['v1', 'v2'], {
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
        ],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).not.toContain('data-paragraph-boundary')
    // No phrase span carries mt-3 (page-level mt-3 from AntiphonBox /
    // psalm-prayer chrome is allowed; F-X11 spacing should not appear).
    const phraseSpanMt3 = (html.match(/data-role="psalm-phrase[a-z-]*"[^>]+class="[^"]*\bmt-3\b/g) ?? []).length
    expect(phraseSpanMt3).toBe(0)
  })

  it('phrase path: multiple boundaries each get mt-3', () => {
    const psalm = makePsalm([
      makeStanzaBlock(['v1', 'v2', 'v3', 'v4'], {
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
        paragraphBoundaries: [1, 3],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    const markers = html.match(/data-paragraph-boundary="true"/g) ?? []
    expect(markers.length).toBe(2)
  })

  it('legacy line path: boundary applied to the matching line span (no phrases)', () => {
    // No phrases → legacy line-by-line render. The boundary attaches to
    // the matching line.
    const psalm = makePsalm([
      makeStanzaBlock(['L1', 'L2', 'L3'], {
        paragraphBoundaries: [2],
      }),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // Legacy outer keeps whitespace-pre-line.
    expect(html).toContain('whitespace-pre-line')
    expect(html).not.toContain('data-render-mode="phrase"')
    // Boundary attribute on exactly one span.
    const matches = html.match(/data-paragraph-boundary="true"/g) ?? []
    expect(matches.length).toBe(1)
    expect(html).toMatch(/data-paragraph-boundary="true"[^>]+class="block mt-3"[^>]*>L3</)
  })

  it('end-to-end: Psalm 46:2-12 user-reported case — wrap pair AND paragraph break preserved', () => {
    // Mirror the post-F-X11 expected shape for the user-reported PDF
    // p.153 case: a stanza containing the wrap pair "Далайн зүрх рүү
    // уулс нуран ороход ч / бид айхгүй." (lineRange [3,4] = 1 multi-
    // line phrase) AND a paragraph boundary before the refrain block
    // start. Asserts the renderer surfaces BOTH the joined wrap and
    // the paragraph gap concurrently.
    const psalm = makePsalm([
      makeStanzaBlock(
        [
          'Тэнгэрбурхан, бидний хоргодох газар ба хүч,',
          'Зовлон шаналан дунд үнэхээр олддог тусламж.',
          'Дэлхий өөрчлөгдөхөд ч,',
          'Далайн зүрх рүү уулс нуран ороход ч',
          'бид айхгүй.',
          'Ус хүрхрэн хөөсрөхөд ч,',
          'Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.',
          'Түг түмдийн ЭЗЭН бидэнтэй хамт',
          'Иаковын Тэнгэрбурхан бидний хүчит цайз.',
        ],
        {
          phrases: [
            { lineRange: [0, 0], indent: 0 },
            { lineRange: [1, 1], indent: 0 },
            { lineRange: [2, 2], indent: 0 },
            { lineRange: [3, 4], indent: 0 }, // wrap pair (F-X10 contract)
            { lineRange: [5, 5], indent: 0 },
            { lineRange: [6, 6], indent: 0 },
            { lineRange: [7, 7], indent: 0, role: 'refrain' },
            { lineRange: [8, 8], indent: 0, role: 'refrain' },
          ],
          paragraphBoundaries: [7], // before refrain group
        },
      ),
    ])
    const html = render(createElement(PsalmBlock, { psalm }))
    // 1. wrap pair joined with a single space (F-X10 contract, regression-safe)
    expect(html).toContain('Далайн зүрх рүү уулс нуран ороход ч бид айхгүй.')
    // 2. paragraph boundary attribute on exactly one span (F-X11 contract)
    const markers = html.match(/data-paragraph-boundary="true"/g) ?? []
    expect(markers.length).toBe(1)
    // 3. refrain phrase at index 7 carries mt-3 paragraph gap.
    //    사용자 directive (2026-05-14): refrain 색상 클래스 (text-red-*)
    //    제거 후에도 paragraph boundary (mt-3) 와 indent (pl-6 -indent-6)
    //    는 보존됨을 확인.
    expect(html).toMatch(/data-paragraph-boundary="true"[^>]+class="block pl-6 -indent-6 mt-3"[^>]*>Түг түмдийн/)
    // refrain phrase 의 className 에 red 색상 클래스가 없음을 보강 검증.
    expect(html).not.toMatch(/data-role="psalm-phrase-refrain"[^>]+class="[^"]*text-red-/)
  })
})
