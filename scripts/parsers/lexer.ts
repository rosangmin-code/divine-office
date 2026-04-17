/**
 * Line-level classifier. Each parser tags lines before running its own state
 * machine. Classification is intentionally conservative: when ambiguous we
 * emit `verse` and let the parser decide context.
 *
 * Covers the Mongolian Cyrillic alphabet (А-Я, Ё, Ө, Ү).
 */

import type { ClassifiedLine, LineKind } from './types.ts'

const CYRILLIC_UPPER = 'А-ЯЁӨҮ'
const CYRILLIC_LOWER = 'а-яёөү'
const CYRILLIC_ANY = CYRILLIC_UPPER + CYRILLIC_LOWER

const DATE_HEADER_RE = /^\d{1,2}\s*д[үу]г[аэ]+р\s+сарын\s+\d{1,2}/i
const HYMN_REF_RE = new RegExp(`^\\d{1,3}\\.\\s+[${CYRILLIC_ANY}A-Za-z]`)
const PAGE_NUMBER_RE = /^\d{2,4}$/
const SEASON_HEADER_RE = /^(Жирийн|Ирэлтийн|Амилалтын|Дөчин|Эзэний)\s+цаг\s+улирал/i
const MAGTUU_HEADER_RE = /^Магтуу\s*$/
const REFRAIN_MARKER_RE = /^(Дахилт|Нийтээр|Дуулагч|Уншигч)(\s*\d+)?\s*:/i

const ALL_CAPS_CYRILLIC_RE = new RegExp(`^[${CYRILLIC_UPPER}\\s\\-—.,!?']+$`)
const HAS_UPPER_CYRILLIC_RE = new RegExp(`[${CYRILLIC_UPPER}]`)
const LOWERCASE_CYRILLIC_START_RE = new RegExp(`^[${CYRILLIC_LOWER}]`)

export function classifyLine(raw: string): ClassifiedLine {
  const trimmed = raw.trim()
  return { raw, trimmed, kind: detectKind(trimmed) }
}

function detectKind(s: string): LineKind {
  if (!s) return 'blank'
  if (MAGTUU_HEADER_RE.test(s)) return 'magtuuHeader'
  if (DATE_HEADER_RE.test(s)) return 'dateHeader'
  if (HYMN_REF_RE.test(s) && s.length < 80) return 'hymnRef'
  if (PAGE_NUMBER_RE.test(s)) return 'pageNumber'
  if (SEASON_HEADER_RE.test(s)) return 'seasonHeader'
  if (REFRAIN_MARKER_RE.test(s)) return 'refrainMarker'

  if (HAS_UPPER_CYRILLIC_RE.test(s) && ALL_CAPS_CYRILLIC_RE.test(s) && s === s.toUpperCase()) {
    return /\s/.test(s) ? 'allCapsHeader' : 'allCapsWordFragment'
  }

  return 'verse'
}

export function isLowercaseCyrillicStart(s: string): boolean {
  return LOWERCASE_CYRILLIC_START_RE.test(s)
}

export function classifyLines(raw: string): ClassifiedLine[] {
  return raw.split('\n').map(classifyLine)
}
