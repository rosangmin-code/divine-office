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

  // skip (without a substitute) hides the psalmody body entirely. The
  // section element + skip directive still renders so the user sees
  // why content is missing. substitute also hides body but shows the
  // directive in its place.
  const hideBody = hasSkip || hasSubstitute

  return (
    <section aria-label="Дууллын залбирал" data-role="psalmody-section">
      <DirectiveBlock directives={prepends} />
      {hideBody ? (
        <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
      ) : (
        section.psalms.map((psalm, i) => (
          <PsalmBlock
            key={i}
            psalm={psalm}
            antiphonNumber={showNumbers ? i + 1 : undefined}
          />
        ))
      )}
      <DirectiveBlock directives={appends} />
    </section>
  )
}
