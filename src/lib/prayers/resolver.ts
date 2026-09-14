import type { LiturgicalSeason, DayOfWeek, HourType, HourPropers } from '../types'
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
   * 의 wk1 fallback 가드 + special-key 매칭에 사용 — Easter/OT 의 movable
   * solemnities (Ascension/Pentecost/Trinity 등) 와 Christmas 의 variable-date
   * 관측일 (Holy Family/Baptism/Epiphany) 식별.
   */
  celebrationName?: string | null
  /**
   * ISO 날짜 문자열 (예: "2026-12-25"). Christmas season 의 fixed-date
   * special-key 매칭 (dec25 / jan1 / octave) 에 사용 — celebrationName 만
   * 으로는 romcal 의 Christmas 전례명 변형 ("Octave 평일", "Christmas
   * Weekday" 등) 을 안정적으로 식별할 수 없어 date-key 가 필요. 누락 시
   * Christmas fixed-date 매칭 미동작 (variable-date 매칭은 영향 없음).
   */
  dateStr?: string | null
}

/** The four rich layers before the priority merge. `null` = nothing authored. */
export interface RichOverlayLayers {
  complineCommons: RichOverlay | null
  psalterCommons: RichOverlay | null
  seasonal: RichOverlay | null
  sanctoral: RichOverlay | null
}

export function resolveRichOverlayLayers(ctx: ResolveRichContext): RichOverlayLayers {
  const complineCommons = ctx.hour === 'compline'
    ? loadComplineCommonsRichOverlay(ctx.day)
    : null
  const psalterCommons = ctx.psalterWeek != null && ctx.hour !== 'compline'
    ? loadPsalterCommonsRichOverlay(ctx.psalterWeek, ctx.day, ctx.hour)
    : null
  const seasonal = loadSeasonalRichOverlay(ctx.season, ctx.weekKey, ctx.day, ctx.hour, ctx.celebrationName, ctx.dateStr)
  const sanctoral = ctx.sanctoralKey
    ? loadSanctoralRichOverlay(ctx.sanctoralKey, ctx.hour)
    : null
  return { complineCommons, psalterCommons, seasonal, sanctoral }
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
  return mergeRichLayers(resolveRichOverlayLayers(ctx))
}

export function mergeRichLayers(layers: RichOverlayLayers): RichOverlay {
  // Higher-priority layer wins per field via spread order.
  return {
    ...(layers.complineCommons ?? {}),
    ...(layers.psalterCommons ?? {}),
    ...(layers.seasonal ?? {}),
    ...(layers.sanctoral ?? {}),
  }
}

// ── Rich ↔ plain source parity ────────────────────────────────────────────

/**
 * Plain field ↔ rich field pairs checked by `applyRichSourceParity`.
 * `alternativeConcludingPrayer` is listed in its own right AND grouped with
 * `concludingPrayer` (see below).
 */
export const RICH_FIELD_PAIRS: ReadonlyArray<
  readonly [keyof HourPropers, keyof RichOverlay]
> = [
  ['shortReading', 'shortReadingRich'],
  ['responsory', 'responsoryRich'],
  ['intercessions', 'intercessionsRich'],
  ['concludingPrayer', 'concludingPrayerRich'],
  ['alternativeConcludingPrayer', 'alternativeConcludingPrayerRich'],
  ['gospelCanticleAntiphon', 'gospelCanticleAntiphonRich'],
  ['hymn', 'hymnRich'],
]

/**
 * The plain cells each rich layer was generated from. `loth-service`
 * fetches them with the SAME keys it used for the rich lookup (psalter
 * commons object, `getSeasonHourPropers(...)` for the seasonal key, the
 * sanctoral `hourPropers`). `undefined` / `null` = layer not applicable.
 */
export interface RichSourceCells {
  psalterCommons?: Partial<HourPropers> | null
  seasonal?: Partial<HourPropers> | null
  sanctoral?: Partial<HourPropers> | null
}

/**
 * Textual identity of a plain propers field: letters and digits only, so
 * whitespace / punctuation / quote-glyph differences between two copies of
 * one PDF block do not count (sanctoral 12-25 firstVespers prints
 * “Ааба,Аав аа”, christmas.json dec25 "Ааба, Аав аа"). Two DIFFERENT
 * prayers never agree letter-for-letter, so this stays a strict identity
 * test for the purpose at hand. Objects (shortReading / responsory)
 * compare on their text-bearing members only — `ref` / `page` are
 * metadata that legitimately differ between copies ("Galatians 4:3-7" vs
 * "Gal 4:3-7").
 */
function plainTextKey(value: unknown): string | null {
  const key = textIdentity(value)
  return key.length > 0 ? key : null
}

function textIdentity(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.replace(/[^\p{L}\p{N}]+/gu, '')
  if (Array.isArray(value)) return value.map(textIdentity).join('|')
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    const parts: string[] = []
    for (const k of ['text', 'fullResponse', 'versicle', 'shortResponse', 'intro', 'refrain', 'closing']) {
      if (k in o) parts.push(textIdentity(o[k]))
    }
    return parts.join('|')
  }
  return textIdentity(String(value))
}

/**
 * Keep a rich field only when the plain text it will be rendered over is
 * the text of the cell that rich was generated from.
 *
 * Plain propers are merged psalter-commons ⟩ seasonal ⟩ sanctoral field by
 * field (`loth-service` Layers 1-3), but the rich overlay used to be merged
 * on the same per-layer priority WITHOUT looking at which layer actually
 * supplied the plain field. The renderer prefers rich, so whenever a
 * higher plain layer won a field but authored no rich for it, the lower
 * layer's rich was displayed over a different prayer:
 *
 *   - All Saints 2026-11-01 Lauds / Vespers / First Vespers: sanctoral
 *     plain (p.837) under `ordinary-time/w31-SUN-*` rich (p.811).
 *   - St Joseph 2026-03-19, Annunciation 03-25, Immaculate Conception
 *     12-08 (+ their eves): sanctoral plain under the Lent / Advent
 *     week-1 weekday rich (p.641 / p.639 / p.562).
 *   - Christmas Eve 2026-12-24 Vespers: Christmas First Vespers plain
 *     (p.588) under `advent/w1-THU-vespers` rich (p.571); Dec 24 Lauds
 *     plain (dec24 cell, p.582) under the same weekday rich.
 *   - Christmas Day / Ascension / Pentecost Second Vespers: `vespers2`
 *     cell plain under the `-vespers` (First Vespers) rich — on a
 *     Solemnity-not-on-Sunday the stray alternate rich then made F-2 swap
 *     an EMPTY text into the section.
 *
 * Rule per field: take the highest-priority layer that authors the rich,
 * and keep it only if that layer's source cell carries the same plain
 * text as the merged plain. Otherwise try the next layer down; if none
 * matches, the field has no rich and renders its plain text.
 * `alternativeConcludingPrayer` additionally follows `concludingPrayer`:
 * when the primary's rich is dropped, the alternate's rich from the same
 * layer goes too (an alternate rich without a matching primary is what
 * turned Ascension EP II 2026-05-14 into an empty `text`).
 *
 * Layers with no source cell to compare against (compline commons — its
 * plain is filled in later by `mergeComplineDefaults`; the hymn catalog
 * applied after Layer 4) are left as the priority merge produced them.
 */
export function applyRichSourceParity(
  layers: RichOverlayLayers,
  cells: RichSourceCells,
  mergedPlain: Partial<HourPropers>,
): RichOverlay {
  const result: RichOverlay = { ...(layers.complineCommons ?? {}) }
  // Highest priority first.
  const ordered: Array<[RichOverlay | null, Partial<HourPropers> | null | undefined]> = [
    [layers.sanctoral, cells.sanctoral],
    [layers.seasonal, cells.seasonal],
    [layers.psalterCommons, cells.psalterCommons],
  ]
  const pickedLayer = new Map<keyof RichOverlay, number>()
  for (const [plainField, richField] of RICH_FIELD_PAIRS) {
    const plainKey = plainTextKey(mergedPlain[plainField])
    for (let i = 0; i < ordered.length; i++) {
      const [rich, cell] = ordered[i]
      const candidate = rich?.[richField]
      if (!candidate) continue
      const cellKey = plainTextKey(cell?.[plainField])
      if (plainKey != null && cellKey != null && plainKey === cellKey) {
        result[richField] = candidate
        pickedLayer.set(richField, i)
        break
      }
    }
  }
  // Group rule: the alternate concluding prayer rich must come from the
  // same layer as the primary's (or be absent when the primary has none).
  const primaryLayer = pickedLayer.get('concludingPrayerRich')
  const altLayer = pickedLayer.get('alternativeConcludingPrayerRich')
  if (altLayer !== undefined && altLayer !== primaryLayer) {
    delete result.alternativeConcludingPrayerRich
  }
  return result
}
