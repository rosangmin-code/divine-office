/**
 * PrayerFooter 본문 탭 제스처 판정 — 순수 로직 (H2, app-review §3.3).
 *
 * 배경: FR-164 (GOAL #24 → #66 sub-2) 는 기도 중 화면을 가리지 않으면서도
 * 어르신이 쓰기 쉬운 **큰 탭 영역**으로 설정에 들어가게 하는 것이 의도다.
 * 그런데 "본문 아무 곳 click = 패널 열기" 는 click 을 만들어 내는 모든 경로를
 * 열기 제스처로 오인했다:
 *
 *   1. 스크린리더 더블탭 — AT 가 만든 합성 click (detail === 0) 까지 열기로
 *      해석 → 읽는 도중 패널이 뜨고 포커스를 뺏김.
 *   2. 관성 스크롤 정지 탭 — 스크롤을 멈추려고 찍는 탭.
 *   3. 드래그/롱프레스 — 선택 해제 직후의 pointerup.
 *
 * 그래서 "실제 포인터로, 움직이지 않고, 짧게, 스크롤이 잠잠할 때 찍은 탭"
 * 만 열기로 본다. 스크린리더·키보드 사용자는 상시 노출되는 명시적 트리거
 * (`data-role="prayer-footer-handle"`) 로 연다.
 */

/** 탭으로 인정하는 pointerdown↔pointerup 최대 이동량 (px). */
export const TAP_MOVE_TOLERANCE_PX = 10
/** 탭으로 인정하는 최대 누름 시간 (ms). 이보다 길면 롱프레스/드래그. */
export const TAP_MAX_DURATION_MS = 500
/** click 이 직전 pointerup 과 짝이라고 볼 수 있는 최대 간격 (ms). */
export const TAP_MAX_AGE_MS = 500
/** 마지막 스크롤 이후 이 시간 안의 탭은 '스크롤 정지 탭' 으로 보고 무시 (ms). */
export const SCROLL_QUIET_MS = 600

export interface BodyTapContext {
  /** click 이벤트의 `detail`. 실제 포인터 클릭은 ≥1, AT·스크립트 합성은 0. */
  detail: number
  /** 클릭 대상이 인터랙티브 요소(또는 풋터 자신) 안인가. */
  onInteractiveTarget: boolean
  /** 텍스트 선택이 살아 있는가 (드래그 선택 중). */
  hasTextSelection: boolean
  /** 직전 pointerdown 시각 (ms). 포인터 입력을 못 봤으면 null. */
  lastPointerDownAt: number | null
  /** 직전 pointerup 시각 (ms). 포인터 입력을 못 봤으면 null. */
  lastPointerUpAt: number | null
  /** 직전 누름의 이동 거리 (px). */
  lastPointerMovePx: number
  /** 직전 누름의 지속 시간 (ms). */
  lastPointerDurationMs: number
  /** 그 pointerdown 직전에 마지막으로 관측된 스크롤 시각 (ms). 없으면 null. */
  scrollAtPointerDown: number | null
  /** click 처리 시각 (ms). */
  now: number
}

/**
 * 본문 탭으로 설정 패널을 열어도 되는지.
 *
 * 하나라도 걸리면 false — 기본값은 "열지 않는다" 다.
 */
export function shouldOpenOnBodyTap(ctx: BodyTapContext): boolean {
  // 링크·버튼·입력·패널 자신 → 각자의 동작이 우선.
  if (ctx.onInteractiveTarget) return false
  // 본문을 드래그 선택한 직후의 click.
  if (ctx.hasTextSelection) return false
  // AT 합성 click / element.click() / 키보드 활성화 (detail === 0).
  if (!Number.isFinite(ctx.detail) || ctx.detail < 1) return false
  // 짝이 되는 실제 포인터 입력을 못 봤거나 너무 오래된 경우.
  if (ctx.lastPointerDownAt === null || ctx.lastPointerUpAt === null) return false
  if (ctx.now - ctx.lastPointerUpAt > TAP_MAX_AGE_MS) return false
  // 드래그(스와이프/스크롤 제스처) 또는 롱프레스.
  if (ctx.lastPointerMovePx > TAP_MOVE_TOLERANCE_PX) return false
  if (ctx.lastPointerDurationMs > TAP_MAX_DURATION_MS) return false
  // 관성 스크롤을 멈추려고 찍은 탭.
  if (
    ctx.scrollAtPointerDown !== null &&
    ctx.lastPointerDownAt - ctx.scrollAtPointerDown < SCROLL_QUIET_MS
  ) {
    return false
  }
  return true
}
