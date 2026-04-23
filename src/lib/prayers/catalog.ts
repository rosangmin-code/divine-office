import type { PrayerText } from '../types'

// Common prayers catalog (Stage 6 에서 Ps 24/67/100 등으로 확장 예정).
// 현재는 빈 Record — resolver 에서 common 조회가 null 을 돌려주는 기본 경로.
const COMMON_CATALOG: Record<string, PrayerText> = {}

export function getCommonPrayer(id: string): PrayerText | null {
  return COMMON_CATALOG[id] ?? null
}

export function getCatalogIds(): string[] {
  return Object.keys(COMMON_CATALOG)
}
