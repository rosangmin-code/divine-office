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

  // GOAL #13 (FR-160-B-6): a psalmody `substitute` whose borrowed psalter
  // psalms were INLINED by the assembler (marked `bodyInlined`, set when the
  // rubric carried a structured `psalterRef`) now renders the actual psalm
  // body + antiphons and surfaces the directive note as a small affordance
  // BELOW the body — the user sees the psalm text, not a pointer-only
  // "see Week 1 Sunday p.58" note ("시편이 안 나온다" bug fixed).
  //
  // Substitutes WITHOUT `bodyInlined` (late-Advent "current running week",
  // All Souls' Sunday-collision — their psalms are NOT inlined from a fixed
  // psalterRef) keep the LEGACY note-only surface (body hidden) so this WI
  // does not regress their established behavior. `skip` (without a
  // substitute) likewise hides the body. A bodyInlined substitute with
  // genuinely no psalms (defensive) also falls back to the note-only
  // surface so the section is never empty.
  const substituteInlined = substitutes.some((d) => d.bodyInlined) && hasPsalms
  const hideBody = hasSkip || (hasSubstitute && !substituteInlined)

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
          {/* inlined-substitute note kept as a small affordance below the
              psalms (page-ref / source rubric) — body is primary. */}
          {hasSubstitute && substituteInlined && (
            <DirectiveBlock directives={substitutes} />
          )}
        </>
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
