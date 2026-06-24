import type { SectionOverride } from '@/lib/types'
import { PageRef } from '../page-ref'

// GOAL #201 (#201-sub-2): an inline page reference already present in the
// directive text — the "Дууллууд … х. 58." substitute family embeds its
// borrowed-psalm page directly. Matches a Cyrillic `х.` + digit.
const INLINE_PAGE_RE = /х\.\s*\d/

// GOAL #201 (#201-sub-2): the PDF source page to surface as a `(х. NNN)`
// link beside a directive — `evidencePdf.page` propagated onto the override
// — UNLESS the directive text already carries its own inline page reference
// (in which case a second link would be redundant). Pure + exported so the
// decision is unit-testable without the `showPageRefs` settings gate that
// `PageRef` itself applies.
export function directiveSourcePage(d: SectionOverride): number | undefined {
  if (typeof d.page !== 'number') return undefined
  if (d.text != null && INLINE_PAGE_RE.test(d.text)) return undefined
  return d.page
}

// FR-160-B PR-9a — render the conditional-rubric directives surfaced
// by Layer 4.5 (`HourPropers.sectionOverrides`). Each directive is
// rendered as a single-line italic red note with `data-role` and
// `data-mode` attributes so e2e tests (PR-9b B5) can locate them
// reliably. Display text falls back to ref / ordinariumKey hint when
// no inline `text` was provided in the rubric target — the assembler
// (PR-?) can later inline the actual ordinarium body.
export function DirectiveBlock({
  directives,
  filterMode,
  className = '',
}: {
  directives: SectionOverride[] | undefined
  /** Render only directives matching this mode; omit to render all. */
  filterMode?: SectionOverride['mode']
  className?: string
}) {
  if (!directives || directives.length === 0) return null
  const filtered = filterMode
    ? directives.filter((d) => d.mode === filterMode)
    : directives
  if (filtered.length === 0) return null
  return (
    <div className={className}>
      {filtered.map((d) => {
        const display =
          d.text ?? d.ref ?? (d.ordinariumKey ? `(${d.ordinariumKey})` : '')
        const sourcePage = directiveSourcePage(d)
        return (
          <p
            key={d.rubricId}
            data-role="conditional-rubric-directive"
            data-rubric-id={d.rubricId}
            data-mode={d.mode}
            className="mt-2 text-sm italic text-stone-500 dark:text-stone-400"
          >
            {display}
            {sourcePage != null && <PageRef page={sourcePage} />}
          </p>
        )
      })}
    </div>
  )
}

// Helpers for components to decide rendering. Pure utility — keeps
// each section component compact while sharing the directive-mode
// semantics across all 5 sections.
export function partitionDirectives(
  directives: SectionOverride[] | undefined,
): {
  hasSkip: boolean
  hasSubstitute: boolean
  prepends: SectionOverride[]
  appends: SectionOverride[]
  substitutes: SectionOverride[]
  skips: SectionOverride[]
} {
  const list = directives ?? []
  return {
    hasSkip: list.some((d) => d.mode === 'skip'),
    hasSubstitute: list.some((d) => d.mode === 'substitute'),
    prepends: list.filter((d) => d.mode === 'prepend'),
    appends: list.filter((d) => d.mode === 'append'),
    substitutes: list.filter((d) => d.mode === 'substitute'),
    skips: list.filter((d) => d.mode === 'skip'),
  }
}
