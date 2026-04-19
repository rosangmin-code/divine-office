import type { HourSection } from '@/lib/types'
import { PsalmBlock } from '../psalm-block'

export function PsalmodySection({
  section,
}: {
  section: Extract<HourSection, { type: 'psalmody' }>
}) {
  const showNumbers = section.psalms.length > 1
  return (
    <section aria-label="Дууллын залбирал">
      {section.psalms.map((psalm, i) => (
        <PsalmBlock
          key={i}
          psalm={psalm}
          antiphonNumber={showNumbers ? i + 1 : undefined}
        />
      ))}
    </section>
  )
}
