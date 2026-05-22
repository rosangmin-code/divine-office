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

// Movable solemnity Mongolian names. Source: public/psalter.pdf verbatim
// section headings, CROSS-CHECKED against readings/feasts.json (미사경본,
// 2026-05-22, WI #6). These 6 celebrations have no fixed MM-DD sanctoral
// entry (date varies with Easter/Pentecost), so they previously fell
// through to the weekday fallback below. Keys mirror resolveSpecialKey()
// in propers-loader.ts so the lookup stays single-source.
//
// readings/feasts.json day_title fields are missal PDF parse artifacts and
// CANNOT serve as authoritative full names — verbatim adoption would
// regress these:
//   - ascension / pentecost: day_title is a generic Mass-time label
//     ('Талархал-магтаалын … Мөргөл дээр'), carries NO feast-specific name.
//   - sacredHeart: day_title 'Есүсийн туйлын ариун нандин' is truncated
//     mid-phrase (drops the head noun 'Зүрх').
//   - trinitySunday / corpusChristi / christTheKing: day_title carries the
//     core term but case-mangled / partial ('Туйлын ариун нандин Гурвал',
//     'БИЕ бА цус', 'ертөнцийн хаан'), no 'Их баяр' suffix.
// The core terms ARE consistent with the names below (no contradiction);
// readings simply has no clean full-name field. Per user decision (WI #6,
// option A) the psalter-sourced names below are the canonical form.
export const MOVABLE_SOLEMNITY_NAMES_MN: Record<string, string> = {
  ascension: 'Эзэний Тэнгэрт Заларсан нь — Их баяр',
  pentecost: 'Пэнтикост — Ариун Сүнсний буулт — Их баяр',
  trinitySunday: 'Туйлын Ариун Нандин Гурвалын Ням гараг — Их баяр',
  corpusChristi: 'Христийн Туйлын Ариун Нандин Бие ба Цус — Их баяр',
  sacredHeart: 'Есүсийн Туйлын Ариун Нандин Зүрх — Их баяр',
  christTheKing: 'Есүс Христ Бидний Эзэн Ертөнцийн Хаан — Их баяр',
}

/**
 * Build a Mongolian name for a liturgical day.
 * Priority: sanctoral name (fixed-date 대축일·축일·기념일)
 *        > movable solemnity name (Ascension/Pentecost/Trinity/Corpus
 *          Christi/Sacred Heart/Christ the King)
 *        > "{season-GEN} {N}-р {Ням|долоо хоног}".
 * The specific weekday is intentionally omitted here — the calendar date line
 * (rendered separately in the UI) already carries the weekday.
 */
export function buildLiturgicalNameMn(args: {
  season: LiturgicalSeason
  weekOfSeason: number
  dayOfWeek: DayOfWeek
  sanctoralName?: string
  movableSolemnityName?: string
}): string {
  const { season, weekOfSeason, dayOfWeek, sanctoralName, movableSolemnityName } = args

  if (sanctoralName) return sanctoralName
  if (movableSolemnityName) return movableSolemnityName

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
