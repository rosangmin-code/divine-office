'use client'

import type { AssembledPsalm } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { PageRef } from './page-ref'
import { AntiphonBox } from './prayer-renderer'
import { RichContent } from './prayer-sections/rich-content'

// Escape a string for use as a literal RegExp source (defensive helper for
// `sanitizePsalmHeaderPreface`; covers the standard JS regex meta-set).
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * F-X9 (#362 audit, #373 dispatch B) defensive guard for the FR-160-C
 * `psalter-headers` catalog. The PDF block-capture extractor (origin
 * `155f17a`) inadvertently bundled the title-line prefix and the
 * `(attribution)` suffix into `preface_text`, while the renderer below
 * also emits `psalm.title` (line 24-26) and the attribution span
 * (line 35-37) separately — producing a visible double-emit on 67/77
 * (title) and 74/77 (attribution) catalog entries.
 *
 * Dispatch A (#372) regenerates the catalog so `preface_text` is body-
 * only; this guard is the layered defense — it is a NOP on clean data
 * and resilient if a stale catalog ever returns. Layered by design.
 *
 * Strip rules:
 *   - If `preface_text` starts with `psalm.title` (trimmed), drop that
 *     prefix and any single separator punctuation that follows.
 *   - If `preface_text` ends with `(attribution)` or `(attribution).`,
 *     drop that suffix. Also strips the optional Mongolian "compare with"
 *     cf-prefix `харьцуул.` (e.g. `(харьцуул. Үйлс 2:24)`) for parity
 *     with the extractor's `stripAttributionSuffix` helper
 *     (`scripts/extract-psalter-headers.js`) and the catalog invariant
 *     test (`src/lib/prayers/__tests__/psalter-headers.test.ts`). All
 *     three layers share the same dirty-pattern definition so a stale
 *     catalog with cf-prefix attribution literals is stripped uniformly
 *     (NIT-1 from review #376 — F-X9 cohort layered defense parity).
 *
 * Non-strict matches (mid-string near-matches, ~7 catalog entries) are
 * intentionally NOT touched — those require data correction (Dispatch A).
 */
export function sanitizePsalmHeaderPreface(
  prefaceText: string,
  title: string | undefined,
  attribution: string | undefined,
): string {
  let pt = prefaceText
  const trimmedTitle = title?.trim() ?? ''
  if (trimmedTitle && pt.startsWith(trimmedTitle)) {
    pt = pt.slice(trimmedTitle.length).trimStart()
    // Drop a single separator (period / comma / colon / em-dash) that some
    // PDF entries place between the title-line and the body — e.g.
    // "title. Зөвт..." → "Зөвт...".
    pt = pt.replace(/^[.,;:—\-]\s*/, '')
  }
  if (attribution) {
    // Optional `харьцуул.\s+` cf-style prefix mirrors the extractor's
    // `stripAttributionSuffix` (scripts/extract-psalter-headers.js:262)
    // and the invariant test pattern (psalter-headers.test.ts:238). The
    // prefix appears in some prefaces (e.g. parsed_data/full_pdf.txt
    // :13223, :14790) and is consumed-but-excluded from the captured
    // attribution; the renderer guard must therefore accept either form.
    const attribPat = new RegExp(
      `\\s*\\((?:харьцуул\\.\\s+)?${escapeRegExp(attribution)}\\)\\.?\\s*$`,
      'u',
    )
    pt = pt.replace(attribPat, '').trimEnd()
  }
  return pt
}

export function PsalmBlock({ psalm, antiphonNumber }: { psalm: AssembledPsalm; antiphonNumber?: number }) {
  const { settings } = useSettings()
  return (
    <section data-role="psalm-block" aria-label={psalm.reference} className="mb-6">
      {/* Antiphon (before) */}
      {psalm.antiphon && (
        <AntiphonBox
          text={psalm.antiphon}
          label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'}
          number={antiphonNumber}
          page={psalm.antiphonPage}
          className="mb-3"
        />
      )}

      {/* Psalm title & reference */}
      {/* WI-46 — 빨간 PSALM 헤더(라벨 span + h4 reference/page-ref) 가운데정렬.
          래퍼에 text-center 를 주면 라벨·reference 가 center 되고, 설명문
          (title/preface <p> — g-32 에서 이미 text-center)은 무변경. 본문
          stanzas/verses/Gloria/antiphon 은 이 div 바깥 형제라 미영향. */}
      <div className="mb-2 text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-liturgical-red dark:text-liturgical-red-dark">
          {psalm.psalmType === 'canticle' ? 'Магтаал' : 'Дуулал'}
        </span>
        <h4
          data-role="psalm-header"
          className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark"
        >
          {psalm.reference} <PageRef page={psalm.page} />
        </h4>
        {psalm.title && (
          <p className="text-center text-xs italic text-stone-500 dark:text-stone-500">{psalm.title}</p>
        )}
        {/* FR-160-C: psalm-header preface (patristic Father / NT typological).
            F-X9 (#373) — defensive guard strips title-prefix and (attribution)-
            suffix that some catalog entries inadvertently bundled into
            `preface_text` (see `sanitizePsalmHeaderPreface` doc above). */}
        {psalm.headerRich && (() => {
          const header = psalm.headerRich
          // GOAL #130 — `uncited_caption` (e.g. the Psalm 63 Lauds caption) has
          // NO attribution. Render it in the same post-title header slot but
          // WITHOUT the `(attribution)` parenthesis / empty attribution span.
          // `whitespace-pre-line` preserves the caption's 2-line break.
          if (header.kind === 'uncited_caption') {
            return (
              <p
                data-role="psalm-header-rich"
                data-kind="uncited_caption"
                className="mt-1 whitespace-pre-line text-center text-xs italic text-stone-500 dark:text-stone-400"
              >
                {header.preface_text}
              </p>
            )
          }
          const prefaceBody = sanitizePsalmHeaderPreface(
            header.preface_text,
            psalm.title,
            header.attribution,
          )
          return (
            <p
              data-role="psalm-header-rich"
              data-kind={header.kind}
              className="mt-1 text-center text-xs italic text-stone-500 dark:text-stone-400"
            >
              {prefaceBody}
              {prefaceBody ? ' (' : '('}
              <span data-role="psalm-header-attribution">{header.attribution}</span>
              {')'}
            </p>
          )
        })()}
      </div>

      {/* Stanzas (PDF source) or Verses (fallback) */}
      {psalm.stanzasRich && psalm.stanzasRich.blocks && psalm.stanzasRich.blocks.length > 0 ? (
        <div className="space-y-5 pl-3 md:space-y-4 md:pl-2">
          {psalm.stanzasRich.blocks.map((block, bi) => {
            if (block.kind !== 'stanza') return null
            // FR-161 R-4: phrase-render path. When the stanza carries
            // `phrases?: PhraseGroup[]`, group `lines[]` by `lineRange`
            // (inclusive both ends), join with a space, and emit one
            // viewport-wrappable phrase per group. The outer `<p>` drops
            // `whitespace-pre-line` because phrases now own the wrapping
            // policy. Falls back to the legacy line-by-line render when
            // `phrases` is absent or empty (regression-safe additive).
            if (block.phrases && block.phrases.length > 0) {
              // F-X11 (#408) — within-stanza paragraph boundaries. When a
              // phrase's first-line index appears in
              // `paragraphBoundaries`, prepend `mt-3` to that phrase's
              // span so a smaller-than-stanza-but-larger-than-phrase gap
              // renders above it (matches the PDF's visual paragraph
              // spacing within a verse cluster — see audit doc §5.2).
              const paragraphBoundarySet = new Set(
                block.paragraphBoundaries ?? [],
              )
              return (
                <p
                  key={bi}
                  data-role="psalm-stanza"
                  data-render-mode="phrase"
                  className="font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200"
                >
                  {block.phrases.map((phrase, pi) => {
                    const [start, end] = phrase.lineRange
                    const phraseText = block.lines
                      .slice(start, end + 1)
                      .map((l) => l.spans.map((sp) => sp.text ?? '').join(''))
                      .join(' ')
                    // WI #502 — 왼쪽 여백 통일 (사용자 SoT, dispatch 502).
                    // 이전 (R-13): phrase.indent 0/1/2 → pl-6 / pl-12 /
                    // pl-18 분기. Psalm 63 b0 line 0-1 vs 2-12 의 indent
                    // 차이가 화면에서 "갑자기 왼쪽 여백이 넓어지는"
                    // 효과를 일으킴 → 가장 작은 들여쓰기 (indent=0 =
                    // pl-6) 로 통일. hanging indent (`-indent-6`) 는
                    // wrap continuation 의 시각 구분 보존 위해 유지.
                    // `phrase.indent` 데이터 자체는 rich.json 에 보존
                    // (PDF SoT) — renderer 단에서만 무시. 향후 PDF
                    // typography 재현 옵션 등에서 활용 가능.
                    // WI-28 — `continuation` role: a call/response continuation
                    // line (e.g. Psalm 81 'Хүмүүс ээ,' 뒤 'Намайг гэрчилж
                    // байхад') renders FULLY indented (drop the `-indent-6`
                    // hanging cancel) so its first visual line sits under the
                    // flush call line rather than flush itself. All other
                    // phrases keep the hanging `pl-6 -indent-6` (WI #502
                    // unified baseline). The capital-Cyrillic-start heuristic in
                    // scripts/build-phrases-into-rich.mjs mis-split such
                    // continuations into their own phrase; the `continuation`
                    // role in the data marks the ones that are NOT new verses.
                    const isContinuation = phrase.role === 'continuation'
                    const indentClass = isContinuation ? 'pl-6' : 'pl-6 -indent-6'
                    const isRefrain = phrase.role === 'refrain'
                    const isDoxology = phrase.role === 'doxology'
                    // 사용자 directive (2026-05-14): 시편 본문은 refrain 포함
                    // 전체가 까만색 본문 컬러로 렌더된다. `text-red-700
                    // dark:text-red-400` 트리거 제거 — data-role 메타데이터
                    // (`psalm-phrase-refrain`) 는 회중 응답 식별 / e2e
                    // selector 안정성을 위해 보존. doxology 의 italic 강조는
                    // 시각 강세를 유지 (색상 통일 정책과 무관).
                    const roleClass = isDoxology ? ' italic' : ''
                    const dataRole = isRefrain
                      ? 'psalm-phrase-refrain'
                      : isDoxology
                      ? 'psalm-phrase-doxology'
                      : isContinuation
                      ? 'psalm-phrase-continuation'
                      : 'psalm-phrase'
                    const isParagraphStart = paragraphBoundarySet.has(start)
                    const paragraphClass = isParagraphStart ? ' mt-3' : ''
                    return (
                      <span
                        key={pi}
                        data-role={dataRole}
                        data-paragraph-boundary={isParagraphStart ? 'true' : undefined}
                        className={`block${indentClass ? ' ' + indentClass : ''}${roleClass}${paragraphClass}`}
                      >
                        {phraseText}
                      </span>
                    )
                  })}
                </p>
              )
            }
            // F-X11 (#408) — within-stanza paragraph boundaries also
            // apply on the legacy line-render path. When `phrases` is
            // absent (or empty) but `paragraphBoundaries` is set,
            // prepend `mt-3` to the matching `<span>` so the
            // paragraph gap renders even before phrase data exists.
            // This keeps paragraph rendering decoupled from phrase
            // injection — F-X11 paragraph fix can land standalone for
            // refs that don't yet have phrases.
            const legacyParagraphBoundarySet = new Set(
              block.paragraphBoundaries ?? [],
            )
            return (
              <p
                key={bi}
                data-role="psalm-stanza"
                className="whitespace-pre-line font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200"
              >
                {block.lines.map((line, li) => {
                  // WI #502 — 왼쪽 여백 통일. line.indent 무관하게 동일
                  // 처리 (가장 작은 들여쓰기 = no pl-* modifier, parent
                  // 의 pl-3 baseline 만 적용). 데이터 line.indent 는
                  // rich.json 에 보존 (PDF SoT). 자세한 rationale 은
                  // phrase mode 분기의 코멘트 참고.
                  const indentClass = ''
                  const isRefrain = line.role === 'refrain'
                  // 사용자 directive (2026-05-14): legacy line mode 도
                  // refrain 포함 전체 본문이 까만색으로 통일. `text-red-700
                  // dark:text-red-400` 트리거 제거. data-role 메타데이터
                  // (`psalm-stanza-refrain`) 는 회중 응답 식별 + e2e selector
                  // 안정성을 위해 보존.
                  const text = line.spans.map((sp) => sp.text ?? '').join('')
                  const isParagraphStart = legacyParagraphBoundarySet.has(li)
                  const paragraphClass = isParagraphStart ? ' mt-3' : ''
                  return (
                    <span
                      key={li}
                      data-role={isRefrain ? 'psalm-stanza-refrain' : undefined}
                      data-paragraph-boundary={isParagraphStart ? 'true' : undefined}
                      className={`block${indentClass ? ' ' + indentClass : ''}${paragraphClass}`}
                    >
                      {text}
                    </span>
                  )
                })}
              </p>
            )
          })}
        </div>
      ) : psalm.stanzas && psalm.stanzas.length > 0 ? (
        <div className="space-y-5 pl-3 md:space-y-4 md:pl-2">
          {psalm.stanzas.map((stanza, si) => (
            <p key={si} data-role="psalm-stanza" className="whitespace-pre-line font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200">
              {stanza.map((line, li) => {
                // WI #502 — 왼쪽 여백 통일. Plain stanzas mode (legacy
                // fallback) 도 phrase / legacy-line mode 와 같은 정책
                // 으로 통일: leading whitespace 의 indent encoding 을
                // 무시하고 모두 동일 baseline 으로 렌더. 데이터 자체
                // (leading spaces) 는 JSON 보존, renderer 단에서만
                // strip. 자세한 rationale 은 phrase mode 코멘트 참고.
                const leading = line.match(/^ */)![0].length
                const trimmed = line.slice(leading)
                return (
                  <span key={li} className="block">{trimmed}</span>
                )
              })}
            </p>
          ))}
        </div>
      ) : psalm.verses.length > 0 ? (
        <div className="space-y-1 pl-3 md:pl-2">
          {psalm.verses.map((v, i) => (
            <p key={i} className="whitespace-pre-line font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200">
              <sup className="mr-1 text-xs text-stone-500 dark:text-stone-500" aria-label={`Ишлэл ${v.verse}`}>{v.verse}</sup>
              {v.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="pl-3 md:pl-2">
          <p role="note" className="text-sm italic text-stone-500 dark:text-stone-500">
            [Орчуулга хийгдэж байна]
          </p>
        </div>
      )}

      {/* Gloria Patri */}
      {psalm.gloriaPatri ? (
        <p className="mt-2 font-reading text-sm italic text-stone-500 dark:text-stone-400">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.
        </p>
      ) : psalm.gloriaPatri === false && (
        <p className="mt-2 text-xs italic text-stone-500 dark:text-stone-400">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй
        </p>
      )}

      {/* Psalm-concluding prayer (Дууллыг төгсгөх залбирал) */}
      {/* #3 / FR-032: 마침 기도 표시 게이트는 plain(`psalmPrayer`) 또는
          rich(`psalmPrayerRich`) 중 하나라도 내용이 있으면 켜지고, 설정의
          `psalmPrayerCollapsed` 토글이 양 경로를 동일하게 숨김/노출한다.
          이전 게이트는 plain `psalm.psalmPrayer` 존재에만 묶여 있어,
          rich-only 항목(psalmPrayerRich 만 있고 plain 텍스트 없음)이 추가되면
          collapsed=false 라도 영영 안 뜨고 토글도 무시되는 latent 결함이
          있었다 (가설 b). 아래 블록 내부의 rich/plain 분기는 그대로 두고
          래퍼 게이트만 양 경로를 포괄하도록 교정 — 현재 카탈로그(rich 보유
          80개 ref 전부 plain 도 보유)에는 동작 무변경(NOP)이고, 향후
          rich-only 데이터에 대한 회귀 방어다. */}
      {(psalm.psalmPrayer ||
        (psalm.psalmPrayerRich && psalm.psalmPrayerRich.blocks.length > 0)) &&
        !settings.psalmPrayerCollapsed && (
        <div data-role="psalm-prayer" className="mt-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
            Дууллыг төгсгөх залбирал <PageRef page={psalm.psalmPrayerPage} />
          </p>
          {psalm.psalmPrayerRich && psalm.psalmPrayerRich.blocks.length > 0 ? (
            // FR-161 R-15: 시편 마침 기도문은 산문 — natural flow (사용자 spec).
            <RichContent
              content={psalm.psalmPrayerRich}
              className="mt-1"
              flow="natural"
            />
          ) : (
            <p className="mt-1 font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200">
              {psalm.psalmPrayer}
            </p>
          )}
        </div>
      )}

      {/* Antiphon (after) */}
      {psalm.antiphon && (
        <AntiphonBox
          text={psalm.antiphon}
          label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'}
          number={antiphonNumber}
          page={psalm.antiphonPage}
          className="mt-3"
        />
      )}
    </section>
  )
}
