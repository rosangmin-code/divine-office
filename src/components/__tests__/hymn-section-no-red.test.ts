/**
 * WI #39 — hymn (Магтуу) section 빨간 글씨 19건 까망 처리.
 *
 * 사용자 directive (2026-05-16): "다른 거 필요 없어. 19건 해결해."
 *
 * 회귀 가드 — Магтуу 섹션 안에 `text-red-*` 색상 클래스가 단 한 건도
 * emit 되지 않아야 한다. dvo-test wi-37 진단에서 발견된 19건의 break-down:
 *
 *   - 헤딩 1건: `hymn-section.tsx` L32 (no-text fallback) + L42 (정상 분기)
 *     의 `<p className="text-sm font-semibold text-red-700 dark:text-red-400">`
 *   - 본문 refrain 18건: `<span data-role="psalm-phrase-refrain"
 *     className="block text-red-700 dark:text-red-400">` —
 *     `prayer-sections/rich-content.tsx` 의 renderBlock stanza phrase
 *     분기에서 `isRefrain ? RUBRIC_CLASS` 트리거 (L378)
 *
 * 본 가드 테스트는 두 분기 모두 `text-red-*` 클래스를 emit 하지 않는지
 * 검증한다. `data-role="psalm-phrase-refrain"` 메타데이터는 회중 응답
 * 식별 / e2e selector 안정성을 위해 보존한다 (`psalm-block.tsx` 의
 * GOAL #1 fix(psalter+sw): #3 패턴과 동일).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { HymnSection } from '../hymn-section'
import type { HourSection, PhraseGroup, PrayerBlock, PrayerText } from '@/lib/types'

function makeStanzaBlock(
  lineTexts: string[],
  options: { phrases?: PhraseGroup[] } = {},
): PrayerBlock {
  return {
    kind: 'stanza',
    lines: lineTexts.map((text) => ({
      spans: [{ kind: 'text', text }],
      indent: 0,
    })),
    ...(options.phrases ? { phrases: options.phrases } : {}),
  } as PrayerBlock
}

function makeRichContent(blocks: PrayerBlock[]): PrayerText {
  return { blocks }
}

function makeHymnSection(opts: {
  text?: string
  textRich?: PrayerText
  page?: number
}): Extract<HourSection, { type: 'hymn' }> {
  return {
    type: 'hymn',
    text: opts.text ?? '',
    textRich: opts.textRich,
    page: opts.page ?? 100,
  } as Extract<HourSection, { type: 'hymn' }>
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// @fr FR-NEW WI #39
describe('HymnSection — Магтуу 섹션 빨간 글씨 0건 회귀 가드 (WI #39)', () => {
  it('헤딩 (normal path): `<p>Магтуу</p>` 에 text-red-* 클래스 없음', () => {
    // textRich 가 있으면 정상 분기 (L40-56) 의 헤딩이 렌더된다.
    const content = makeRichContent([
      makeStanzaBlock(['Алдар тэргүй Эзэн', 'Бид тантай хамт']),
    ])
    const section = makeHymnSection({ textRich: content })
    const html = render(createElement(HymnSection, { section }))
    expect(html).toContain('Магтуу')
    // 헤딩 분기에 text-red-* 가 어떤 형태로도 등장하지 않아야 한다.
    expect(html).not.toMatch(/<p[^>]*\btext-red-/)
  })

  it('헤딩 (fallback path, 번역 미완): `<p>Магтуу</p>` 에 text-red-* 없음', () => {
    // text 비어있고 textRich 도 없으면 fallback 분기 (L29-37) 가 활성화.
    const section = makeHymnSection({})
    const html = render(createElement(HymnSection, { section }))
    expect(html).toContain('Магтуу')
    expect(html).toContain('[Орчуулга хийгдэж байна]')
    // fallback 헤딩에도 text-red-* 가 없어야 한다.
    expect(html).not.toMatch(/<p[^>]*\btext-red-/)
  })

  it('본문 refrain phrase: data-role 보존 + text-red-* 없음', () => {
    // dvo-test wi-37 진단의 실제 텍스트 sample (oye2026-05-15 lauds 막토).
    const content = makeRichContent([
      makeStanzaBlock(
        [
          'Дахилт: Аллэлуяа, Аллэлуяа, Аллэлуяа',
          'Аллэлуяа, Аллэлуяа',
          'Баярын дуу цалгин ниснэ ээ',
          'Газар дэлхий түрлэг нэмнэ ээ',
        ],
        {
          phrases: [
            { lineRange: [0, 0], indent: 0, role: 'refrain' },
            { lineRange: [1, 1], indent: 0, role: 'refrain' },
            { lineRange: [2, 2], indent: 0 },
            { lineRange: [3, 3], indent: 0 },
          ],
        },
      ),
    ])
    const section = makeHymnSection({ textRich: content })
    const html = render(createElement(HymnSection, { section }))

    // refrain span 의 data-role 메타데이터는 보존 (e2e selector 안정성).
    expect(html).toMatch(/data-role="psalm-phrase-refrain"/)
    const refrainSpans = (
      html.match(/data-role="psalm-phrase-refrain"/g) ?? []
    ).length
    expect(refrainSpans).toBe(2)

    // refrain phrase 의 className 에 text-red-* 가 등장하지 않아야 한다.
    expect(html).not.toMatch(
      /data-role="psalm-phrase-refrain"[^>]+class="[^"]*text-red-/,
    )
    // 전체 섹션 어디에도 text-red-* 가 emit 되지 않아야 한다 (헤딩 +
    // refrain + non-refrain phrase 가 모두 합산된 19건의 dvo-test
    // 진단을 글로벌 가드로 흡수).
    expect(html).not.toMatch(/\btext-red-/)
  })
})
