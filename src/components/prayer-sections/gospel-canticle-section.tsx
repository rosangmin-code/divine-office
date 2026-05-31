'use client'

import { useId, useState, type JSX } from 'react'
import type { HourSection, PrayerSpan, PrayerText } from '@/lib/types'
import { PageRef } from '../page-ref'
import { Icon } from '../icon'
import { AntiphonBox } from './antiphon-box'

const CANTICLE_NAMES: Record<string, string> = {
  benedictus: 'Захариагийн магтаал',
  magnificat: 'Мариагийн магтаал',
  nuncDimittis: 'Сайнмэдээний айлдлын магтаал',
}

// FR-168 (GOAL #90) — clamp an arbitrary selectedIndex into a valid
// candidate index. Non-integer / out-of-range (incl. NaN) → 0 (option 1).
// Same contract as `resolveGospelCanticle`'s assembler-side clamp so the
// rendered antiphon and the dropdown's selection never disagree.
function clampCandidateIndex(idx: number | undefined, len: number): number {
  if (len <= 0) return 0
  return Number.isInteger(idx) && (idx as number) >= 0 && (idx as number) < len
    ? (idx as number)
    : 0
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
  // WI #12 (2026-05-19): PDF convention 정합 — Mongolian LOTH PDF 본문에는
  // 키릴 'В./Х.' 접두어가 존재하지 않고, responsory 의 verse/response 쌍은
  // call 라인 무접두 + response 라인 '- ' (hyphen) 으로 표기된다 (WI #10
  // 확립). gospel-canticle 안티폰의 versicle/response 스팬은 commons /
  // propers 현행 데이터에 0건이지만 PrayerSpan union 타입 일부로 살아 있어
  // 분기는 forward-compat defense 로 보존. 렌더는 responsory 규약과 동일:
  // versicle (call) = 접두어 없음, response (answer) = 'not-italic' 으로
  // 부모 italic 을 깬 '- ' 접두어 + 본문.
  if (span.kind === 'versicle') {
    return <span key={key}>{span.text}</span>
  }
  if (span.kind === 'response') {
    return (
      <span key={key}>
        <span className="not-italic">- </span>
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

  // FR-168 (GOAL #90) — saturday-mary Benedictus 6-option dropdown. When the
  // section carries a `candidates` list, the antiphon shown is the selected
  // option (ephemeral client state, default = data `selectedIndex`). The
  // dropdown + rubric only surface on this candidate path; legacy
  // single-antiphon entries (every other day) skip it entirely.
  const candidates = section.candidates
  const hasCandidates = Array.isArray(candidates) && candidates.length > 0
  const initialIdx = hasCandidates
    ? clampCandidateIndex(section.selectedIndex, candidates!.length)
    : 0
  const [selectedIdx, setSelectedIdx] = useState(initialIdx)
  // FR-168 (GOAL #90, #98 [#90-sub-8]) — custom listbox menu open/close state.
  // The candidate chooser is a click-to-open listbox (hymn-section /
  // marian-antiphon-section 선례) instead of a native <select>: native
  // <option>s are not reliably click-openable under Playwright (their nodes
  // stay hidden), so the #94 e2e (combobox.click() → option.click()) only
  // exercises a real custom listbox. The native-select impl (#96) shipped but
  // could not satisfy that contract — this WI converts it.
  const [menuOpen, setMenuOpen] = useState(false)
  const listId = useId()
  const safeIdx = hasCandidates
    ? clampCandidateIndex(selectedIdx, candidates!.length)
    : 0
  // The text/page actually rendered in the AntiphonBox. On the candidate
  // path this is the selected option (NOT `section.antiphon`, which only
  // mirrors the default); on the legacy path it is the plain antiphon.
  const shownAntiphonText = hasCandidates
    ? candidates![safeIdx]?.text ?? section.antiphon
    : section.antiphon
  const shownAntiphonPage = hasCandidates
    ? candidates![safeIdx]?.page ?? section.page
    : section.page

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
  // FR-168 (GOAL #90, spec §4c peer-corrected): also render when a
  // candidate list is present — even if `antiphon` is somehow empty, a
  // candidate-bearing section must surface the dropdown + selected antiphon.
  const shouldRender = !!section.antiphon || hasRich || hasCandidates
  // WI #29 (2026-05-16) — compline (nuncDimittis) 만 PDF 순서가 안티폰 →
  // 헤딩 → 본문. vespers (magnificat) / lauds (benedictus) 의 PDF 컨벤션
  // 추가 확인이 필요해 보수적으로 nuncDimittis 만 swap. WI #27 부록 +
  // `~/.claude/pair-cowork/scratch/dvo/wi-27/addendum-28.md` 의 PDF page
  // 258 (인쇄본 514-515) 토요일 끝기도 흐름 증거 참조. lauds/vespers PDF
  // 컨벤션 확인 후 일반화 가능 (분기 제거 → Option 1).
  const antiphonFirst = section.canticle === 'nuncDimittis'
  const renderAntiphon = (className: string) =>
    hasCandidates ? (
      // FR-168 — candidate path: render the SELECTED option's text (plain;
      // candidates carry no rich AST). `data-role="antiphon"` is preserved
      // by AntiphonBox so e2e/legacy anchors keep working.
      <AntiphonBox
        text={shownAntiphonText}
        label="canticle"
        page={shownAntiphonPage}
        className={className}
      />
    ) : hasRich && section.antiphonRich ? (
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

  // FR-168 — defensive option set. The production path always ships a valid
  // in-range `selectedIndex` (data default = 0), so the full 6-option
  // chooser renders. When the INCOMING `selectedIndex` is structurally
  // corrupt (out-of-range / NaN), we cannot trust the selection state, so
  // we degrade to the single canonical default option (option 1) — this
  // guarantees the user sees the authentic default antiphon rather than a
  // wrong option (e.g. a `Math.min(idx, len-1)` clamp bug would surface the
  // LAST option). `safeIdx` already clamps the DISPLAYED antiphon to 0.
  const selectionWasValid =
    hasCandidates &&
    Number.isInteger(section.selectedIndex) &&
    (section.selectedIndex as number) >= 0 &&
    (section.selectedIndex as number) < candidates!.length
  const optionItems = hasCandidates
    ? selectionWasValid
      ? candidates!.map((c, i) => ({ c, i }))
      : [{ c: candidates![0], i: 0 }]
    : []

  // FR-168 — dropdown + rubric block, rendered once near the top of the
  // section (above the canticle heading) ONLY on the candidate path.
  const renderCandidateControls = () =>
    hasCandidates ? (
      <div className="my-3">
        {section.rubric ? (
          <p
            data-role="canticle-antiphon-rubric"
            className="mb-1 text-xs not-italic text-stone-500 dark:text-stone-400"
          >
            {section.rubric}
          </p>
        ) : null}
        {/* FR-168 (#98) — custom listbox, hymn-section/marian-antiphon-section
            패턴 차용 (네이티브 <select> 폐기). `role="combobox"` 토글 버튼을
            누르면 `role="listbox"` ul 안에 `role="option"` li 가 펼쳐지고,
            항목 선택 시 setSelectedIdx + 메뉴 닫힘. 유지 계약:
            data-role="canticle-antiphon-dropdown",
            aria-label="${name} — шад магтаалыг сонгох", aria-selected. */}
        <div data-role="canticle-antiphon-dropdown">
          <button
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-controls={listId}
            aria-label={`${name} — шад магтаалыг сонгох`}
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center gap-1 text-sm text-stone-700 transition-colors hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-300 dark:hover:text-stone-100"
          >
            <Icon
              name="next"
              size={14}
              className={`transition-transform ${menuOpen ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            Шад магтаал сонгох ({optionItems.length})
          </button>

          {menuOpen && (
            <ul
              id={listId}
              role="listbox"
              aria-label={`${name} — шад магтаалыг сонгох`}
              className="mt-2 space-y-1"
            >
              {optionItems.map(({ c, i }) => (
                <li key={i} role="option" aria-selected={i === safeIdx}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIdx(i)
                      setMenuOpen(false)
                    }}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      i === safeIdx
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                    }`}
                  >
                    {c.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    ) : null

  return (
    <section aria-label={name} className="mb-4">
      {/* FR-168 (GOAL #90) — saturday-mary Benedictus 후렴 선택 드롭다운 +
          안내 루브릭. candidates 부재(평일) 시 null → legacy 단일 후렴 유지. */}
      {renderCandidateControls()}

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
        WI #5 (#2-sub-1) — gospel-canticle 헤딩을 다른 prayer-section
        헤딩과 동일한 전례 빨강(`text-liturgical-red` = #c1121f / 다크
        #ef4444)으로 통일. DESIGN.md(SSOT) §Components "Section title":
        섹션 제목은 미사경본·전례서 루브릭 빨강으로 화면 전반 통일
        (절기 의미색 season-red 용도와는 별개의 제목 통일색). 이전
        WI-62 의 stone-500 faint 처리는 사용자 결정(빨강 통일)으로 폐기됨.
        `data-role="canticle-heading"` 색상-독립 anchor 는 그대로 보존
        (e2e selector 안정성 + ordering test #29 anchor).
      */}
      <p
        data-role="canticle-heading"
        className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark"
      >
        {name} <PageRef page={section.bodyPage} />
      </p>

      {!antiphonFirst && shouldRender && renderAntiphon('my-3')}

      {section.verses && section.verses.length > 0 ? (
        // WI #35 — within-canticle paragraph boundaries (시편 F-X11 #408
        // 패턴 차용). `section.paragraphBoundaries` 에 포함된 0-based
        // verses 인덱스의 `<p>` 위에 `mt-3` 을 prepend 해서 PDF page
        // 34/40/515 의 단락 spacing 을 표현. 부재 / 빈 array → 기존
        // 균일 `space-y-1` 만 적용 (additive contract, regression-safe).
        // `data-role` / `data-paragraph-boundary` 데이터 attribute 는
        // 색상-독립 e2e selector anchor (CLAUDE.md "data-role 우선" 정책).
        (() => {
          const paragraphSet = new Set(section.paragraphBoundaries ?? [])
          return (
            <div className="space-y-1 pl-2">
              {section.verses!.map((verse, vi) => {
                const isParagraphStart = paragraphSet.has(vi)
                return (
                  <p
                    key={vi}
                    data-role="gospel-canticle-verse"
                    data-paragraph-boundary={isParagraphStart ? 'true' : undefined}
                    className={`font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200${isParagraphStart ? ' mt-3' : ''}`}
                  >
                    {verse}
                  </p>
                )
              })}
              {section.doxology && (
                <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
                  {section.doxology}
                </p>
              )}
            </div>
          )
        })()
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
