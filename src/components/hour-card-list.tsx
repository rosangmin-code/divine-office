import Link from 'next/link'
import { HourIcon } from './hour-icon'
import { Icon } from './icon'
import type { HourType } from '@/lib/types'

interface HourCardListProps {
  hours: { type: HourType; nameMn: string }[]
  dateStr: string
  celebrationId?: string
}

// FR-185 — every hour name ends in this phrase. What tells the hours apart
// is the part before it («Өглөөний», «Оройн», «1 дүгээр Оройн», …), so only
// that part is set bold. Names without the phrase stay bold as a whole.
const SHARED_TAIL = ' даатгал залбирал'

export function splitHourName(name: string): { lead: string; tail: string } {
  if (name.length > SHARED_TAIL.length && name.endsWith(SHARED_TAIL)) {
    return { lead: name.slice(0, -SHARED_TAIL.length), tail: SHARED_TAIL }
  }
  return { lead: name, tail: '' }
}

export function HourCardList({ hours, dateStr, celebrationId }: HourCardListProps) {
  return (
    // FR-185 — one flat card with hairline-divided rows instead of separate
    // shadowed slabs (DESIGN.md Elevation: hairlines, not shadows).
    // overflow-hidden clips the row hover tint to the rounded corners.
    <section
      aria-label="Цагийн залбирлууд"
      data-role="hour-list"
      className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5"
    >
      {hours.map((hour) => (
        <HourCard key={hour.type} hour={hour} dateStr={dateStr} celebrationId={celebrationId} />
      ))}
    </section>
  )
}

function HourCard({
  hour,
  dateStr,
  celebrationId,
}: {
  hour: { type: HourType; nameMn: string }
  dateStr: string
  celebrationId?: string
}) {
  const suffix = celebrationId && celebrationId !== 'default'
    ? `?celebration=${encodeURIComponent(celebrationId)}`
    : ''
  const { lead, tail } = splitHourName(hour.nameMn)
  return (
    // The focus ring is drawn inset so the card's overflow-hidden does not
    // clip it. `!` is needed: the global `:focus-visible` rule in
    // globals.css is unlayered and so beats any Tailwind utility.
    <Link
      href={`/pray/${dateStr}/${hour.type}${suffix}`}
      className="flex min-h-[44px] items-center gap-3.5 px-3.5 py-3.5 transition-colors hover:bg-stone-100 focus-visible:-outline-offset-2! active:bg-stone-100 dark:hover:bg-white/5 dark:active:bg-white/5"
    >
      <HourIcon
        hour={hour.type}
        className="h-5.5 w-5.5 shrink-0 text-liturgical-gold dark:text-liturgical-gold-dark"
      />

      {/* Content — Mongolian hour name only. The raw English HourType enum
          (lauds/vespers/compline) was previously rendered here as a caption,
          which violated NFR-002 (no English text in the Mongolian-only UI).
          `hour.nameMn` already carries the full Mongolian label, so no
          secondary caption is needed (#64 fix-H3). */}
      <h3 className="flex-1 text-stone-700 dark:text-stone-300">
        <span className="font-semibold text-stone-800 dark:text-stone-100">{lead}</span>
        {tail}
      </h3>

      {/* Chevron — desktop only (#361). 모바일에서는 행 자체가 click
          affordance 이고, 좁은 화면에서 라벨 옆 화살표가 시각적 노이즈 +
          horizontal real-estate 손실을 일으킨다는 사용자 피드백. md (≥768px)
          이상에서만 노출. Link 자체가 nav 라 AT 에는 숨긴다. */}
      <Icon name="next" aria-hidden className="hidden shrink-0 text-stone-400 md:block" />
    </Link>
  )
}
