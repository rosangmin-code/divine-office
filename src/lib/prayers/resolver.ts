import type { LiturgicalSeason, DayOfWeek, HourType } from '../types'
import {
  loadSeasonalRichOverlay,
  loadSanctoralRichOverlay,
  loadPsalterCommonsRichOverlay,
  loadComplineCommonsRichOverlay,
  type RichOverlay,
} from './rich-overlay'

export interface ResolveRichContext {
  season: LiturgicalSeason
  weekKey: string
  day: DayOfWeek
  hour: HourType
  sanctoralKey?: string | null
  /**
   * 4주 시편집 주간 (1..4). loth-service 가 `day.psalterWeek` 를 그대로
   * 전달. 누락 시 psalter commons rich 를 시도하지 않는다.
   */
  psalterWeek?: number | string | null
  /**
   * romcal 이 부여한 전례 이름 (예: "Ascension of the Lord"). seasonal rich
   * 의 wk1 fallback 가드에 사용 — special-key 후보 (Ascension/Pentecost 등)
   * 는 wascension/weasterSunday/wpentecost rich 가 별도로 존재하므로 wk1
   * fallback 으로 대체되면 안 된다.
   */
  celebrationName?: string | null
}

/**
 * 우선순위 (높은 것부터):
 *  1. override (향후 확장)
 *  2. sanctoral (sanctoralKey 주어졌을 때만)
 *  3. seasonal
 *  4. psalter commons (psalterWeek 주어졌을 때만, hour ≠ compline)
 *  5. compline commons (hour === 'compline' 일 때만)
 *
 * 각 *Rich 필드를 독립적으로 resolve — 예컨대 concludingPrayerRich 는
 * sanctoral 에 있고 intercessionsRich 는 seasonal 에 있을 수 있다.
 * spread 순서로 우선순위를 표현한다 (뒤에 spread 된 쪽이 이김).
 *
 * source 태그는 각 필드의 PrayerText.source 에 이미 저장돼 있다는 가정 —
 * rich JSON 생성 시(Stage 3b) 포함시킨다. resolver 는 source 를 재정의하지
 * 않는다 (rich 파일이 권위 있는 소스 정보를 갖고 있음).
 */
export function resolveRichOverlay(ctx: ResolveRichContext): RichOverlay {
  const complineCommons = ctx.hour === 'compline'
    ? loadComplineCommonsRichOverlay(ctx.day)
    : null
  const psalterCommons = ctx.psalterWeek != null && ctx.hour !== 'compline'
    ? loadPsalterCommonsRichOverlay(ctx.psalterWeek, ctx.day, ctx.hour)
    : null
  const seasonal = loadSeasonalRichOverlay(ctx.season, ctx.weekKey, ctx.day, ctx.hour, ctx.celebrationName)
  const sanctoral = ctx.sanctoralKey
    ? loadSanctoralRichOverlay(ctx.sanctoralKey, ctx.hour)
    : null

  // Higher-priority layer wins per field via spread order.
  return {
    ...(complineCommons ?? {}),
    ...(psalterCommons ?? {}),
    ...(seasonal ?? {}),
    ...(sanctoral ?? {}),
  }
}
