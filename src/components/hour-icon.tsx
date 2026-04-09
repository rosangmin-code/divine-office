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
    case 'officeOfReadings':
      // Open book
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      )
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
    case 'terce':
      // Morning sun (small with rays going up-right)
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.93 19.07l1.41-1.41" />
          <path d="M17.66 6.34l1.41-1.41" />
        </svg>
      )
    case 'sext':
      // High noon sun (larger, bold)
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v3" />
          <path d="M12 20v3" />
          <path d="M4.22 4.22l2.12 2.12" />
          <path d="M17.66 17.66l2.12 2.12" />
          <path d="M1 12h3" />
          <path d="M20 12h3" />
          <path d="M4.22 19.78l2.12-2.12" />
          <path d="M17.66 6.34l2.12-2.12" />
        </svg>
      )
    case 'none':
      // Afternoon sun (setting direction)
      return (
        <svg {...props}>
          <circle cx="12" cy="10" r="4" />
          <path d="M12 2v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M19.07 4.93l-1.41 1.41" />
          <path d="M2 16h20" />
          <path d="M5 16a7 7 0 0 0 .8-3" />
          <path d="M18.2 13a7 7 0 0 0 .8 3" />
        </svg>
      )
    case 'vespers':
      // Sunset
      return (
        <svg {...props}>
          <path d="M2 16h20" />
          <path d="M5 16a7 7 0 0 1 14 0" />
          <path d="M12 16v4" />
          <path d="M8 20h8" />
        </svg>
      )
    case 'compline':
      // Crescent moon with star
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
