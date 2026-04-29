import type { JSX } from 'react'
import type { PrayerBlock, PrayerSpan, PrayerText } from '@/lib/types'

// PDF 원형(루브릭 빨간색·이탤릭·V./R. 마커·들여쓰기)을 PrayerText AST 에서
// 복원해 내는 공용 렌더러. 앞으로 concludingPrayer/shortReading/responsory/
// intercessions/hymn 등 모든 rich 오버레이가 이 컴포넌트를 경유한다.
//
// 본 컴포넌트는 페이지 참조(`content.page`)를 직접 렌더하지 않는다 —
// PageRef 배치는 상위 섹션 헤더가 담당한다(기존 섹션 컴포넌트 규약).

const RUBRIC_CLASS = 'text-red-700 dark:text-red-400'
const BODY_CLASS =
  'font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200'

// 2 스페이스 = 1 단계 indent — psalm-block.tsx 의 stanza 렌더와 일치시킨다.
function indentClassFor(level: 0 | 1 | 2 | undefined): string {
  if (!level) return ''
  if (level === 1) return 'pl-6'
  return 'pl-12'
}

// FR-161 R-13: hanging indent for phrase wrap continuation lines.
// First-line position matches the legacy phrase indent (0 / 6 / 12
// spacing units); viewport-wrapped continuation lines indent +6 further
// via `text-indent: -1.5rem` (-indent-6). User spec: "구문 wrap 시 들여쓰기".
function phraseHangingIndentClass(level: 0 | 1 | 2 | undefined): string {
  const lv = level ?? 0
  if (lv === 0) return 'pl-6 -indent-6'
  if (lv === 1) return 'pl-12 -indent-6'
  return 'pl-18 -indent-6'
}

// V. / R. 접두어는 몽골어 관례에 맞춰 하드코딩한다: В. (Вэрсикл) / Х. (Хариу).
// responsory-section.tsx 는 접두어 대신 "- " 하이픈만 사용하지만, Rich AST 가
// 기도문 전반을 담당하면서 versicle/response 를 명시 태깅하므로 더 명확한
// 키릴 접두어를 쓴다. 색·굵기는 기존 rubric/response 스타일과 일치.
const VERSICLE_PREFIX = 'В.'
const RESPONSE_PREFIX = 'Х.'

function emphasisClass(emphasis?: ('italic' | 'bold')[]): string {
  if (!emphasis || emphasis.length === 0) return ''
  const parts: string[] = []
  if (emphasis.includes('italic')) parts.push('italic')
  if (emphasis.includes('bold')) parts.push('font-semibold')
  return parts.join(' ')
}

function renderSpan(span: PrayerSpan, key: number): JSX.Element {
  if (span.kind === 'text') {
    const cls = emphasisClass(span.emphasis)
    if (!cls) return <span key={key}>{span.text}</span>
    return (
      <span key={key} className={cls}>
        {span.text}
      </span>
    )
  }
  if (span.kind === 'rubric') {
    return (
      <span key={key} className={RUBRIC_CLASS}>
        {span.text}
      </span>
    )
  }
  if (span.kind === 'versicle') {
    return (
      <span key={key}>
        <span className={`${RUBRIC_CLASS} font-semibold`}>{VERSICLE_PREFIX} </span>
        {span.text}
      </span>
    )
  }
  // response
  return (
    <span key={key}>
      <span className={`${RUBRIC_CLASS} font-semibold`}>{RESPONSE_PREFIX} </span>
      {span.text}
    </span>
  )
}

function renderSpans(spans: PrayerSpan[]): JSX.Element[] {
  return spans.map((s, i) => renderSpan(s, i))
}

function renderBlock(block: PrayerBlock, key: number): JSX.Element {
  if (block.kind === 'para') {
    const indent = indentClassFor(block.indent)
    const cls = [BODY_CLASS, indent].filter(Boolean).join(' ')
    return (
      <p key={key} className={cls}>
        {renderSpans(block.spans)}
      </p>
    )
  }
  if (block.kind === 'rubric-line') {
    return (
      <p
        key={key}
        className={`${RUBRIC_CLASS} text-sm font-semibold`}
      >
        {block.text}
      </p>
    )
  }
  if (block.kind === 'stanza') {
    // FR-161 R-4: phrase-render path. Same contract as psalm-block.tsx —
    // when `phrases?: PhraseGroup[]` is present + non-empty, group lines
    // by `lineRange` (inclusive both ends), join their text spans with a
    // space, and emit one viewport-wrappable block per phrase. role
    // ('refrain'/'doxology') maps to colour/italic. Falls back to legacy
    // line-by-line render when phrases are absent.
    if (block.phrases && block.phrases.length > 0) {
      return (
        <p key={key} className={BODY_CLASS} data-render-mode="phrase">
          {block.phrases.map((phrase, pi) => {
            const [start, end] = phrase.lineRange
            const phraseSpans = block.lines.slice(start, end + 1).flatMap((l) => l.spans)
            // FR-161 R-13: hanging indent for phrase wrap continuation.
            const indent = phraseHangingIndentClass(phrase.indent)
            const isRefrain = phrase.role === 'refrain'
            const isDoxology = phrase.role === 'doxology'
            const roleClass = isRefrain
              ? RUBRIC_CLASS
              : isDoxology
              ? 'italic'
              : ''
            const dataRole = isRefrain
              ? 'psalm-phrase-refrain'
              : isDoxology
              ? 'psalm-phrase-doxology'
              : 'psalm-phrase'
            const cls = ['block', indent, roleClass].filter(Boolean).join(' ')
            // Insert spaces between joined lines' span sequences.
            const joined: JSX.Element[] = []
            const groups = block.lines.slice(start, end + 1)
            for (let gi = 0; gi < groups.length; gi++) {
              if (gi > 0) joined.push(<span key={`sep-${gi}`}>{' '}</span>)
              joined.push(...groups[gi].spans.map((s, si) => renderSpan(s, gi * 100 + si)))
            }
            return (
              <span key={pi} data-role={dataRole} className={cls}>
                {joined}
              </span>
            )
          })}
        </p>
      )
    }
    return (
      <p key={key} className={BODY_CLASS}>
        {block.lines.map((line, li) => {
          const indent = indentClassFor(line.indent)
          const cls = ['block', indent].filter(Boolean).join(' ')
          return (
            <span key={li} className={cls}>
              {renderSpans(line.spans)}
            </span>
          )
        })}
      </p>
    )
  }
  // divider
  return <div key={key} className="my-2" aria-hidden />
}

export function RichContent({
  content,
  className,
}: {
  content: PrayerText
  className?: string
}): JSX.Element {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      {content.blocks.map((b, i) => renderBlock(b, i))}
    </div>
  )
}
