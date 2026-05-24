import type { HourSection } from '@/lib/types'
import { PsalmBlock } from '../psalm-block'
import { DirectiveBlock, partitionDirectives } from './directive-block'

export function PsalmodySection({
  section,
}: {
  section: Extract<HourSection, { type: 'psalmody' }>
}) {
  const showNumbers = section.psalms.length > 1
  const { hasSkip, hasSubstitute, prepends, appends, substitutes, skips } =
    partitionDirectives(section.directives)

  const hasPsalms = section.psalms.length > 0

  // GOAL #13 (FR-160-B-6): a psalmody `substitute` now INLINES the borrowed
  // psalms (resolved upstream by loth-service step 6.5 from the rubric's
  // `psalterRef`, or carried by the base psalter for current-week / Sunday-
  // collision rubrics) and surfaces the directive note as a small affordance
  // BELOW the body — the user sees the actual psalm text + antiphons, not a
  // pointer-only "see Week 1 Sunday p.58" note. Pre-fix, substitute hid the
  // body entirely ("시편이 안 나온다" bug).
  //
  // `skip` (without a substitute) still hides the body — the section element
  // + skip directive render so the user sees why content is intentionally
  // absent. A substitute with genuinely no psalms (defensive — should not
  // occur for authored psalterRef) also falls back to the directive-only
  // surface so the section is never empty.
  const hideBody = hasSkip || (hasSubstitute && !hasPsalms)

  return (
    <section aria-label="Дууллын залбирал" data-role="psalmody-section">
      <DirectiveBlock directives={prepends} />
      {hideBody ? (
        <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
      ) : (
        <>
          {section.psalms.map((psalm, i) => (
            <PsalmBlock
              key={i}
              psalm={psalm}
              antiphonNumber={showNumbers ? i + 1 : undefined}
            />
          ))}
          {/* substitute note kept as a small affordance below the inlined
              psalms (page-ref / source rubric) — body is primary. */}
          {hasSubstitute && <DirectiveBlock directives={substitutes} />}
        </>
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
