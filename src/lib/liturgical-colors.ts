import type { LiturgicalColor } from './types'

export const BORDER_COLOR_CLASSES: Record<LiturgicalColor, string> = {
  GREEN: 'border-liturgical-green dark:border-liturgical-green-dark',
  VIOLET: 'border-liturgical-violet dark:border-liturgical-violet-dark',
  WHITE: 'border-stone-400 dark:border-stone-500',
  RED: 'border-liturgical-red dark:border-liturgical-red-dark',
  ROSE: 'border-liturgical-rose dark:border-liturgical-rose-dark',
}

// WHITE season uses the gold accent for text (pure #f5f0eb is unreadable on a
// light surface); other colors map directly to their liturgical palette.
export const TEXT_COLOR_CLASSES: Record<LiturgicalColor, string> = {
  GREEN: 'text-liturgical-green dark:text-liturgical-green-dark',
  VIOLET: 'text-liturgical-violet dark:text-liturgical-violet-dark',
  WHITE: 'text-liturgical-gold dark:text-liturgical-gold-dark',
  RED: 'text-liturgical-red dark:text-liturgical-red-dark',
  ROSE: 'text-liturgical-rose dark:text-liturgical-rose-dark',
}
