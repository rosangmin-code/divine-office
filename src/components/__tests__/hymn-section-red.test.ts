/**
 * WI #5 (#2-sub-1) — Магтуу 등 섹션 제목 전례 빨강 통일 (GOAL #2).
 *
 * 사용자 directive (2026-05-22): "магтуу 가 제목인데 통일이 안 되어 있어.
 * 그때 다시 빨간색으로 하기로 했었는데 반영이 안 되었네." → 섹션 제목을
 * 전례 빨강(`--color-liturgical-red` = #c1121f / 다크 #ef4444)으로 통일.
 *
 * 본 테스트는 이전 WI #39 의 `hymn-section-no-red.test.ts` 를 REVERSE 한
 * 것이다. WI #39 는 헤딩을 까망 처리(no-red)했으나, 디자인 SSOT(DESIGN.md
 * §Components "Section title") 가 "섹션 제목은 전례 빨강으로 통일" 로
 * 갱신되며 사용자 결정대로 빨강을 복원한다.
 *
 * 두 축을 분리해 검증한다:
 *   1. 헤딩(제목) — `text-liturgical-red dark:text-liturgical-red-dark`
 *      가 emit 되어야 한다 (정상 분기 + 번역미완 fallback 분기 모두).
 *   2. 본문 refrain phrase — 제목이 아니므로 빨강을 쓰지 않는다. WI #39
 *      의 본문 refrain no-red 불변식은 그대로 유지(본문/응답구/메타는
 *      제목 통일 대상이 아님). `data-role="psalm-phrase-refrain"`
 *      메타데이터도 보존(회중 응답 식별 / e2e selector 안정성).
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

// Extract the className of the heading `<p ...>Магтуу` element. The wrapping
// `<section aria-label="Магтуу">` carries the same word, so we anchor on the
// `<p ...>Магтуу` opening tag to scope strictly to the heading element.
function headingClass(html: string): string {
  const m = html.match(/<p class="([^"]*)"[^>]*>\s*Магтуу/)
  return m ? m[1] : ''
}

// @fr GOAL #2 WI #5
describe('HymnSection — Магтуу 섹션 제목 전례 빨강 통일 (WI #5 / GOAL #2)', () => {
  it('헤딩 (normal path): `<p>Магтуу</p>` 가 전례 빨강 토큰을 emit', () => {
    // textRich 가 있으면 정상 분기의 헤딩이 렌더된다.
    const content = makeRichContent([
      makeStanzaBlock(['Алдар тэргүй Эзэн', 'Бид тантай хамт']),
    ])
    const section = makeHymnSection({ textRich: content })
    const html = render(createElement(HymnSection, { section }))
    expect(html).toContain('Магтуу')
    // 헤딩에 전례 빨강(라이트+다크) 토큰이 emit 되어야 한다.
    const cls = headingClass(html)
    expect(cls).toContain('text-liturgical-red')
    expect(cls).toContain('dark:text-liturgical-red-dark')
    // 이전 faint(stone-500/400) 색은 헤딩에서 제거됐어야 한다.
    expect(cls).not.toContain('text-stone-500')
    expect(cls).not.toContain('text-stone-400')
  })

  it('헤딩 (fallback path, 번역 미완): `<p>Магтуу</p>` 가 전례 빨강 토큰을 emit', () => {
    // text 비어있고 textRich 도 없으면 번역미완 fallback 분기가 활성화.
    const section = makeHymnSection({})
    const html = render(createElement(HymnSection, { section }))
    expect(html).toContain('Магтуу')
    expect(html).toContain('[Орчуулга хийгдэж байна]')
    const cls = headingClass(html)
    expect(cls).toContain('text-liturgical-red')
    expect(cls).toContain('dark:text-liturgical-red-dark')
    expect(cls).not.toContain('text-stone-500')
    expect(cls).not.toContain('text-stone-400')
  })

  it('본문 refrain phrase: data-role 보존 + 빨강 색상 없음 (제목만 빨강)', () => {
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

    // 본문 refrain 은 제목이 아니므로 빨강을 쓰지 않는다 — Tailwind
    // text-red-* 팔레트도, 전례 빨강 토큰도 refrain span 엔 없어야 한다.
    expect(html).not.toMatch(
      /data-role="psalm-phrase-refrain"[^>]+class="[^"]*text-red-/,
    )
    expect(html).not.toMatch(
      /data-role="psalm-phrase-refrain"[^>]+class="[^"]*text-liturgical-red/,
    )
    // 본문 어디에도 raw Tailwind red 팔레트(text-red-700/400 등)는 leak
    // 되지 않아야 한다 (WI #39 본문 no-red 불변식 유지). 제목 통일색은
    // `text-liturgical-red` 토큰을 쓰므로 이 가드에 걸리지 않는다.
    expect(html).not.toMatch(/\btext-red-\d/)
  })
})
