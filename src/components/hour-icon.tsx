import type { HourType } from '@/lib/types'

export function HourIcon({ hour, className = 'h-6 w-6' }: { hour: HourType; className?: string }) {
  const props = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (hour) {
    case 'lauds':
      // Sunrise
      return (
        <svg {...props}>
          <path d="M12 2v4" />
          <path d="M4.93 5.93l2.83 2.83" />
          <path d="M19.07 5.93l-2.83 2.83" />
          <path d="M2 16h20" />
          <path d="M5 16a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'vespers':
    case 'firstVespers':
      // Sunset (shared with First Vespers — Sunday I 1st Vespers is also a
      // sunset prayer; PDF distinguishes only by 1/2 numbering)
      return (
        <svg {...props}>
          <path d="M2 16h20" />
          <path d="M5 16a7 7 0 0 1 14 0" />
          <path d="M12 16v4" />
          <path d="M8 20h8" />
        </svg>
      )
    case 'compline':
    case 'firstCompline':
      // Crescent moon with star (shared with First Compline)
      return (
        <svg {...props}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          <path d="M17 5l.5 1.5L19 7l-1.5.5L17 9l-.5-1.5L15 7l1.5-.5z" />
        </svg>
      )
    default:
      return null
  }
}
