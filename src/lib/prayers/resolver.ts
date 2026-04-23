import type { LiturgicalSeason, DayOfWeek, HourType } from '../types'
import {
  loadSeasonalRichOverlay,
  loadSanctoralRichOverlay,
  type RichOverlay,
} from './rich-overlay'

export interface ResolveRichContext {
  season: LiturgicalSeason
  weekKey: string
  day: DayOfWeek
  hour: HourType
  sanctoralKey?: string | null
}

/**
 * 우선순위 (높은 것부터):
 *  1. override (향후 확장)
 *  2. sanctoral (sanctoralKey 주어졌을 때만)
 *  3. seasonal
 *  4. common (catalog) — 현재는 scope 밖
 *
 * 각 *Rich 필드를 독립적으로 resolve — 예컨대 concludingPrayerRich 는
 * sanctoral 에 있고 intercessionsRich 는 seasonal 에 있을 수 있다.
 * 두 레벨의 필드를 합쳐서 반환.
 *
 * source 태그는 각 필드의 PrayerText.source 에 이미 저장돼 있다는 가정 —
 * rich JSON 생성 시(Stage 3b) 포함시킨다. resolver 는 source 를 재정의하지
 * 않는다 (rich 파일이 권위 있는 소스 정보를 갖고 있음).
 */
export function resolveRichOverlay(ctx: ResolveRichContext): RichOverlay {
  const seasonal = loadSeasonalRichOverlay(ctx.season, ctx.weekKey, ctx.day, ctx.hour)
  const sanctoral = ctx.sanctoralKey
    ? loadSanctoralRichOverlay(ctx.sanctoralKey, ctx.hour)
    : null

  // Higher-priority layer wins per field via spread order.
  return {
    ...(seasonal ?? {}),
    ...(sanctoral ?? {}),
  }
}
