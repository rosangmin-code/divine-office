import type { LiturgicalSeason, LiturgicalColor, CelebrationRank, DayOfWeek } from './types'
import { DAY_NAMES_MN } from './types'

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
 * Priority: sanctoral name (대축일·축일·기념일) > composed "season + week + day" string.
 */
export function buildLiturgicalNameMn(args: {
  season: LiturgicalSeason
  weekOfSeason: number
  dayOfWeek: DayOfWeek
  sanctoralName?: string
}): string {
  const { season, weekOfSeason, dayOfWeek, sanctoralName } = args

  if (sanctoralName) return sanctoralName

  const seasonName = SEASON_NAMES_MN[season]
  if (dayOfWeek === 'SUN') {
    return `${seasonName}, ${weekOfSeason}-р ням гараг`
  }
  return `${seasonName}, ${weekOfSeason}-р долоо хоногийн ${DAY_NAMES_MN[dayOfWeek]} гараг`
}
