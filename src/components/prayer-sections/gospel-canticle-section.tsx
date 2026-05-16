import type { JSX } from 'react'
import type { HourSection, PrayerSpan, PrayerText } from '@/lib/types'
import { PageRef } from '../page-ref'
import { AntiphonBox } from './antiphon-box'

const CANTICLE_NAMES: Record<string, string> = {
  benedictus: 'Захариагийн магтаал',
  magnificat: 'Мариагийн магтаал',
  nuncDimittis: 'Сайнмэдээний айлдлын магтаал',
}

// Small inline renderer for antiphon-grade rich content. Antiphons in the
// Mongolian LOTH are short prose lines (often a single para block, single
// text span); future seasonal propers may carry inline rubrics or emphasis.
// We render flat inline spans so the parent's amber-italic styling
// (text-sm italic text-amber-800) cascades — using <RichContent> directly
// would inject BODY_CLASS (font-serif text-base text-stone-800) and
// override the visual identity that distinguishes antiphons from body
// prose. Rubric spans get an explicit red + `not-italic` (PDF rubric is
// red and upright, not italic — the parent wrapper's `italic` would
// otherwise leak in via inheritance).
function renderAntiphonSpan(span: PrayerSpan, key: number): JSX.Element {
  if (span.kind === 'rubric') {
    // WI #21 (2026-05-15): 사용자 directive — '막토 안에는 빨간 글씨
    // 필요 없어' — `text-red-700 dark:text-red-400` 트리거 제거. kind
    // 메타데이터 (`rubric`) 는 향후 정책 변동 hook + 데이터 분류 보존.
    // `not-italic` 은 부모 AntiphonBox 의 italic 을 상쇄하기 위해 유지.
    return (
      <span
        key={key}
        className="not-italic"
      >
        {span.text}
      </span>
    )
  }
  if (span.kind === 'versicle') {
    return (
      <span key={key}>
        <span className="font-semibold not-italic">В. </span>
        {span.text}
      </span>
    )
  }
  if (span.kind === 'response') {
    return (
      <span key={key}>
        <span className="font-semibold not-italic">Х. </span>
        {span.text}
      </span>
    )
  }
  // text — preserve emphasis if declared (italic is already inherited from
  // the AntiphonBox wrapper, so 'italic' emphasis is a no-op visually; we
  // still pass the class to keep semantic intent).
  const emphasis = span.emphasis ?? []
  const cls: string[] = []
  if (emphasis.includes('italic')) cls.push('italic')
  if (emphasis.includes('bold')) cls.push('font-semibold')
  if (cls.length === 0) return <span key={key}>{span.text}</span>
  return (
    <span key={key} className={cls.join(' ')}>
      {span.text}
    </span>
  )
}

function renderAntiphonRich(content: PrayerText): JSX.Element[] {
  const out: JSX.Element[] = []
  let keyCounter = 0
  let firstEmitted = true
  for (let bi = 0; bi < content.blocks.length; bi++) {
    const block = content.blocks[bi]
    if (block.kind === 'divider') continue

    // Compute this block's emitted elements FIRST. Task #222 defensive
    // hardening: pre-fix `firstEmitted` was flipped to `false` BEFORE the
    // inner content emission, so a para with empty `spans` (or any block
    // shape that emits nothing) would still flip the flag — leaking a
    // stray `<br/>` into the NEXT block's separator pointing at content
    // that never appeared. Post-fix we only flip + push the block
    // separator after we KNOW the block produced at least one element.
    const blockOut: JSX.Element[] = []
    if (block.kind === 'para') {
      block.spans.forEach((s) =>
        blockOut.push(renderAntiphonSpan(s, keyCounter++)),
      )
    } else if (block.kind === 'stanza') {
      block.lines.forEach((line, li) => {
        // PDF stanza lines are visually distinct rows; inter-line break
        // matches the PDF layout (was inline space — F-X1 #217 fix).
        if (li > 0) blockOut.push(<br key={`lsep-${bi}-${li}`} />)
        line.spans.forEach((s) =>
          blockOut.push(renderAntiphonSpan(s, keyCounter++)),
        )
      })
    } else if (block.kind === 'rubric-line') {
      // #247 NIT-2 / #250 F-1 — production-data no-op defensive guard.
      // Skip rubric-line blocks whose `text` is empty/whitespace-only.
      // The schema does not exclude empty strings, and a malformed
      // authoring would surface a stray empty red `<span>` (and its
      // preceding inter-block `<br/>` separator) under an antiphon.
      // Note: this is a real behavior change for malformed input, NOT
      // redundant with the `blockOut.length === 0` guard below — the
      // rubric-line branch unconditionally pushes a `<span>` so
      // `blockOut.length` would be 1, not 0, and the downstream guard
      // would NOT short-circuit. Production data has no empty
      // rubric-line blocks today; this is type-safety hardening.
      if (!block.text.trim()) continue
      // WI #21 (2026-05-15): 사용자 directive — '막토 안에는 빨간 글씨
      // 필요 없어' — `text-red-700 dark:text-red-400` 트리거 제거. kind
      // 메타데이터 (`rubric-line`) 는 향후 정책 변동 hook + 데이터 분류
      // 보존. `not-italic` 은 부모 AntiphonBox 의 italic 을 상쇄하기
      // 위해 유지 (rubric-line text 는 직립 표시).
      blockOut.push(
        <span
          key={`rubric-${bi}`}
          className="not-italic"
        >
          {block.text}
        </span>,
      )
    }

    if (blockOut.length === 0) continue // empty block — skip separator + flip

    // F-X1 (#217) — block boundary MUST surface as a real line break, not
    // an inline single-space. Earlier the inter-block separator emitted
    // `<span>{' '}</span>`, which silently flowed para/stanza/rubric-line
    // blocks together when seasonal Eastertide overlays (or sanctoral
    // propers) supplied multi-block antiphon AST. Single-block authoring
    // (the common case) still renders identically — `firstEmitted` skips
    // the leading break.
    if (!firstEmitted) {
      out.push(<br key={`bsep-${bi}`} />)
    }
    firstEmitted = false
    out.push(...blockOut)
  }
  return out
}

function AntiphonRichBox({
  content,
  page,
  className = 'my-3',
}: {
  content: PrayerText
  page?: number
  className?: string
}): JSX.Element {
  return (
    <div
      data-role="antiphon"
      data-render-mode="rich"
      className={`${className} text-sm italic text-amber-800 dark:text-amber-300`}
    >
      <span className="font-semibold not-italic">Шад магтаал: </span>
      {renderAntiphonRich(content)}
      <PageRef page={page} />
    </div>
  )
}

export function GospelCanticleSection({
  section,
}: {
  section: Extract<HourSection, { type: 'gospelCanticle' }>
}) {
  const name = CANTICLE_NAMES[section.canticle] ?? section.canticle
  // FR-161 wi-002 (revised #208): branch on antiphonRich presence. When
  // the rich AST is present + non-empty, render the inline rich path that
  // preserves the amber/italic antiphon visual while honouring
  // rubric/emphasis spans. Otherwise fall through to the legacy plain
  // AntiphonBox so existing data renders unchanged.
  const hasRich = !!(
    section.antiphonRich &&
    section.antiphonRich.blocks &&
    section.antiphonRich.blocks.length > 0
  )
  // Gate is `section.antiphon || hasRich` (per #207 review fix): rich
  // overlays can ship without the plain string companion (sanctoral
  // propers may author Rich-only seasonal antiphons), and gating purely
  // on `section.antiphon` would silently swallow them.
  const shouldRender = !!section.antiphon || hasRich
  // WI #29 (2026-05-16) — compline (nuncDimittis) 만 PDF 순서가 안티폰 →
  // 헤딩 → 본문. vespers (magnificat) / lauds (benedictus) 의 PDF 컨벤션
  // 추가 확인이 필요해 보수적으로 nuncDimittis 만 swap. WI #27 부록 +
  // `~/.claude/pair-cowork/scratch/dvo/wi-27/addendum-28.md` 의 PDF page
  // 258 (인쇄본 514-515) 토요일 끝기도 흐름 증거 참조. lauds/vespers PDF
  // 컨벤션 확인 후 일반화 가능 (분기 제거 → Option 1).
  const antiphonFirst = section.canticle === 'nuncDimittis'
  const renderAntiphon = (className: string) =>
    hasRich && section.antiphonRich ? (
      <AntiphonRichBox
        content={section.antiphonRich}
        page={section.page}
        className={className}
      />
    ) : (
      <AntiphonBox
        text={section.antiphon}
        label="canticle"
        page={section.page}
        className={className}
      />
    )

  return (
    <section aria-label={name} className="mb-4">
      {/*
        WI #29 — compline 안티폰은 PDF 순서대로 헤딩보다 먼저 (antiphonFirst).
        vespers/lauds 는 antiphonFirst=false → 기존 컨벤션 (헤딩 → 안티폰).
      */}
      {antiphonFirst && shouldRender && renderAntiphon('my-3')}

      {/*
        Heading page ref points at the FIXED ordinarium body (`bodyPage`),
        not the daily propers antiphon page. The antiphon page is rendered
        on the AntiphonBox below. This split prevents the long-standing
        confusion where users opened the PDF to e.g. p722 expecting the
        Magnificat body and found only the seasonal antiphon (task #11).
      */}
      {/*
        WI #30 (2026-05-16) — 사용자 directive 반전. GOAL #20 "제목은 빨간
        글씨 그대로 해" → 본 WI 에서 까망 처리 (시각 거슬림 정정 결정).
        `text-red-700 dark:text-red-400` 색상 className 제거, body text
        color 명시 (stone-800 / stone-200 dark). `data-role="canticle-
        heading"` 는 ordering 회귀 가드 테스트의 stable anchor 로 추가 —
        이전에 text-red-700 클래스에 결합돼 있던 anchor 를 색상-독립
        구조 anchor 로 이관 (WI #29 deferred nit 해소).
      */}
      <p
        data-role="canticle-heading"
        className="text-sm font-semibold text-stone-800 dark:text-stone-200"
      >
        {name} <PageRef page={section.bodyPage} />
      </p>

      {!antiphonFirst && shouldRender && renderAntiphon('my-3')}

      {section.verses && section.verses.length > 0 ? (
        <div className="space-y-1 pl-2">
          {section.verses.map((verse, vi) => (
            <p
              key={vi}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {verse}
            </p>
          ))}
          {section.doxology && (
            <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
              {section.doxology}
            </p>
          )}
        </div>
      ) : section.text ? (
        <div className="space-y-1 pl-2">
          {section.text.split('\n').map((line, li) => (
            <p
              key={li}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p
          className="text-sm italic text-stone-500 dark:text-stone-400"
          role="note"
        >
          [Орчуулга хийгдэж байна]
        </p>
      )}

      {shouldRender && renderAntiphon('my-3')}
    </section>
  )
}
