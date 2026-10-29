import { Icon, type IconName } from './icon'
import type { HourType } from '@/lib/types'

// FR-185 — Lucide glyphs from the app's single icon family (DESIGN.md
// Iconography) instead of hand-drawn SVGs. First Vespers / First Compline
// share the evening / night glyphs: the book tells them apart only by number.
const HOUR_ICON: Record<HourType, IconName> = {
  lauds: 'morning',
  vespers: 'evening',
  firstVespers: 'evening',
  compline: 'night',
  firstCompline: 'night',
}

export function HourIcon({ hour, className = 'h-6 w-6' }: { hour: HourType; className?: string }) {
  return <Icon name={HOUR_ICON[hour]} className={className} aria-hidden />
}
