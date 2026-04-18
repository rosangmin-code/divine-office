import type { LiturgicalSeason, LiturgicalColor, CelebrationRank, DayOfWeek } from './types'
import { DAY_NAMES_MN } from './types'

const DOW_CODES: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// romcal season key -> our LiturgicalSeason
export const SEASON_MAP: Record<string, LiturgicalSeason> = {
  'Advent': 'ADVENT',
  'Christmastide': 'CHRISTMAS',
  'Lent': 'LENT',
  'Holy Week': 'LENT',
  'Easter': 'EASTER',
  'Early Ordinary Time': 'ORDINARY_TIME',
  'Later Ordinary Time': 'ORDINARY_TIME',
}

// romcal color key -> our LiturgicalColor
export const COLOR_MAP: Record<string, LiturgicalColor> = {
  'WHITE': 'WHITE',
  'GREEN': 'GREEN',
  'RED': 'RED',
  'PURPLE': 'VIOLET',
  'ROSE': 'ROSE',
}

// romcal type -> our CelebrationRank
export const RANK_MAP: Record<string, CelebrationRank> = {
  'SOLEMNITY': 'SOLEMNITY',
  'FEAST': 'FEAST',
  'MEMORIAL': 'MEMORIAL',
  'OPT_MEMORIAL': 'OPTIONAL_MEMORIAL',
  'COMMEMORATION': 'OPTIONAL_MEMORIAL',
  'FERIA': 'WEEKDAY',
  'SUNDAY': 'SOLEMNITY',
  'HOLY_WEEK': 'WEEKDAY',
  'TRIDUUM': 'SOLEMNITY',
}

// romcal cycle value -> Sunday cycle letter
export function parseSundayCycle(cycleValue: string): 'A' | 'B' | 'C' {
  if (cycleValue.includes('A')) return 'A'
  if (cycleValue.includes('B')) return 'B'
  return 'C'
}

// Weekday cycle: odd years = 1, even years = 2
export function getWeekdayCycle(year: number): '1' | '2' {
  return year % 2 === 1 ? '1' : '2'
}

// Mongolian season names
export const SEASON_NAMES_MN: Record<LiturgicalSeason, string> = {
  ADVENT: 'Ирэлтийн цаг улирал',
  CHRISTMAS: 'Мэндэлсэн өдрийн цаг улирал',
  LENT: 'Дөч хоногийн цаг улирал',
  EASTER: 'Дээгүүр өнгөрөх цаг улирал',
  ORDINARY_TIME: 'Жирийн цаг улирал',
}

// Mongolian season names in the genitive case ("...цаг улирлын"),
// used when the season modifies the liturgical day name.
export const SEASON_NAMES_MN_GEN: Record<LiturgicalSeason, string> = {
  ADVENT: 'Ирэлтийн цаг улирлын',
  CHRISTMAS: 'Мэндэлсэн өдрийн цаг улирлын',
  LENT: 'Дөч хоногийн цаг улирлын',
  EASTER: 'Дээгүүр өнгөрөх цаг улирлын',
  ORDINARY_TIME: 'Жирийн цаг улирлын',
}

// Mongolian color names
export const COLOR_NAMES_MN: Record<LiturgicalColor, string> = {
  GREEN: 'Ногоон',
  VIOLET: 'Нил ягаан',
  WHITE: 'Цагаан',
  RED: 'Улаан',
  ROSE: 'Ягаан',
}

// Mongolian rank names
export const RANK_NAMES_MN: Record<CelebrationRank, string> = {
  SOLEMNITY: 'Их баяр',
  FEAST: 'Баяр',
  MEMORIAL: 'Дурсгал',
  OPTIONAL_MEMORIAL: 'Сонгомол дурсгал',
  WEEKDAY: 'Ажлын өдөр',
}

/**
 * Build a Mongolian name for a liturgical day.
 * Priority: sanctoral name (대축일·축일·기념일) > "{season-GEN} {N}-р {Ням|долоо хоног}".
 * The specific weekday is intentionally omitted here — the calendar date line
 * (rendered separately in the UI) already carries the weekday.
 */
export function buildLiturgicalNameMn(args: {
  season: LiturgicalSeason
  weekOfSeason: number
  dayOfWeek: DayOfWeek
  sanctoralName?: string
}): string {
  const { season, weekOfSeason, dayOfWeek, sanctoralName } = args

  if (sanctoralName) return sanctoralName

  const seasonGen = SEASON_NAMES_MN_GEN[season]
  if (dayOfWeek === 'SUN') {
    return `${seasonGen} ${weekOfSeason}-р Ням`
  }
  return `${seasonGen} ${weekOfSeason}-р долоо хоног`
}

/**
 * Format a YYYY-MM-DD date string as "YYYY.MM.DD" plus the Mongolian weekday.
 */
export function formatDateMn(dateStr: string): { formatted: string; weekday: string } {
  const d = new Date(dateStr + 'T00:00:00Z')
  const weekday = DAY_NAMES_MN[DOW_CODES[d.getUTCDay()]]
  return {
    formatted: dateStr.replaceAll('-', '.'),
    weekday,
  }
}

/** Psalter-week Roman numeral (1-4; falls back to the raw number). */
export function romanNumeral(n: number): string {
  const numerals = ['I', 'II', 'III', 'IV']
  return numerals[n - 1] ?? String(n)
}
