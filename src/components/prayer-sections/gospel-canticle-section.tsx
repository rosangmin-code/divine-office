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
    return (
      <span
        key={key}
        className="not-italic text-red-700 dark:text-red-400"
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
    if (block.kind === 'para') {
      block.spans.forEach((s) => out.push(renderAntiphonSpan(s, keyCounter++)))
    } else if (block.kind === 'stanza') {
      block.lines.forEach((line, li) => {
        // PDF stanza lines are visually distinct rows; inter-line break
        // matches the PDF layout (was inline space — F-X1 #217 fix).
        if (li > 0) out.push(<br key={`lsep-${bi}-${li}`} />)
        line.spans.forEach((s) => out.push(renderAntiphonSpan(s, keyCounter++)))
      })
    } else if (block.kind === 'rubric-line') {
      // PDF rubric line: red + upright (NOT italic). Parent wrapper
      // is italic, so explicit `not-italic` is required to escape the
      // amber-italic AntiphonBox styling.
      out.push(
        <span
          key={`rubric-${bi}`}
          className="not-italic text-red-700 dark:text-red-400"
        >
          {block.text}
        </span>,
      )
    }
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
        Heading page ref points at the FIXED ordinarium body (`bodyPage`),
        not the daily propers antiphon page. The antiphon page is rendered
        on the AntiphonBox below. This split prevents the long-standing
        confusion where users opened the PDF to e.g. p722 expecting the
        Magnificat body and found only the seasonal antiphon (task #11).
      */}
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {name} <PageRef page={section.bodyPage} />
      </p>

      {shouldRender && renderAntiphon('my-3')}

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
