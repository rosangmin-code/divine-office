import type { HourSection } from '@/lib/types'
import { PsalmBlock } from '../psalm-block'
import { DirectiveBlock, partitionDirectives } from './directive-block'

export function PsalmodySection({
  section,
  hoistInlinedSubstituteNote = false,
}: {
  section: Extract<HourSection, { type: 'psalmody' }>
  /**
   * GOAL #48: when true, the `bodyInlined` substitute notice ("psalms +
   * canticles borrowed from Week 1 Sunday") is NOT re-rendered below the
   * psalms here — the parent (`PrayerRenderer`) hoists it to the top of
   * the prayer body (after the title, before УДИРТГАЛ) instead, so the
   * note appears exactly once. The psalm BODY is unaffected (it still
   * renders). Non-bodyInlined substitutes are untouched. Default false
   * keeps standalone usage backward-compatible (note below psalms).
   */
  hoistInlinedSubstituteNote?: boolean
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
              psalms (page-ref / source rubric) — body is primary. GOAL #48:
              when the parent hoists the bodyInlined notice to the top of the
              prayer body, drop it here so it is not rendered twice; any
              non-bodyInlined substitute (rare) still shows below the psalms. */}
          {hasSubstitute && substituteInlined && (
            <DirectiveBlock
              directives={
                hoistInlinedSubstituteNote
                  ? substitutes.filter((d) => !d.bodyInlined)
                  : substitutes
              }
            />
          )}
        </>
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
