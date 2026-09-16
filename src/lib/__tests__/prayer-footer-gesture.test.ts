/**
 * H2 (app-review 2026-09-13 §3.3) — PrayerFooter 본문 탭 판정.
 *
 * 회귀 대상: `prayer-footer.tsx` 가 본문의 **모든** click 을 "설정 패널 열기"
 * 로 해석해 스크린리더 더블탭(합성 click)·관성 스크롤 정지 탭마다 패널이
 * 열리고 포커스를 뺏던 문제. 열기 조건을 순수 함수로 뽑아 고정한다.
 */

import { describe, it, expect } from 'vitest'
import {
  SCROLL_QUIET_MS,
  TAP_MAX_AGE_MS,
  TAP_MAX_DURATION_MS,
  TAP_MOVE_TOLERANCE_PX,
  shouldOpenOnBodyTap,
  type BodyTapContext,
} from '../prayer-footer-gesture'

const NOW = 10_000

/** 아무 문제 없는 "진짜 탭" 기준 컨텍스트. */
function goodTap(overrides: Partial<BodyTapContext> = {}): BodyTapContext {
  return {
    detail: 1,
    onInteractiveTarget: false,
    hasTextSelection: false,
    lastPointerDownAt: NOW - 80,
    lastPointerUpAt: NOW - 20,
    lastPointerMovePx: 1,
    lastPointerDurationMs: 60,
    scrollAtPointerDown: null,
    now: NOW,
    ...overrides,
  }
}

describe('shouldOpenOnBodyTap — 여는 경우', () => {
  it('실제 포인터로 짧게, 움직이지 않고, 스크롤이 잠잠할 때 연다', () => {
    expect(shouldOpenOnBodyTap(goodTap())).toBe(true)
  })

  it('스크롤이 충분히 오래전이면 연다', () => {
    expect(
      shouldOpenOnBodyTap(
        goodTap({ scrollAtPointerDown: NOW - 80 - SCROLL_QUIET_MS - 1 }),
      ),
    ).toBe(true)
  })

  it('허용 오차 안의 미세한 손떨림은 탭으로 본다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ lastPointerMovePx: TAP_MOVE_TOLERANCE_PX }))).toBe(true)
  })
})

describe('shouldOpenOnBodyTap — 열지 않는 경우', () => {
  // H2 의 핵심 — 스크린리더 더블탭은 detail 0 짜리 합성 click 이다.
  it('AT/스크립트 합성 click (detail === 0) 은 열지 않는다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ detail: 0 }))).toBe(false)
  })

  it('포인터 입력을 전혀 못 본 click 은 열지 않는다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ lastPointerDownAt: null }))).toBe(false)
    expect(shouldOpenOnBodyTap(goodTap({ lastPointerUpAt: null }))).toBe(false)
  })

  // 스크롤 직후 탭 = 관성 스크롤을 멈추려는 탭.
  it('스크롤 직후(SCROLL_QUIET_MS 이내)의 탭은 열지 않는다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ scrollAtPointerDown: NOW - 80 - 10 }))).toBe(false)
    expect(
      shouldOpenOnBodyTap(goodTap({ scrollAtPointerDown: NOW - 80 - (SCROLL_QUIET_MS - 1) })),
    ).toBe(false)
  })

  it('드래그(스와이프)는 열지 않는다', () => {
    expect(
      shouldOpenOnBodyTap(goodTap({ lastPointerMovePx: TAP_MOVE_TOLERANCE_PX + 1 })),
    ).toBe(false)
  })

  it('롱프레스는 열지 않는다', () => {
    expect(
      shouldOpenOnBodyTap(goodTap({ lastPointerDurationMs: TAP_MAX_DURATION_MS + 1 })),
    ).toBe(false)
  })

  it('포인터 입력과 짝이 아닌 오래된 click 은 열지 않는다', () => {
    expect(
      shouldOpenOnBodyTap(goodTap({ lastPointerUpAt: NOW - TAP_MAX_AGE_MS - 1 })),
    ).toBe(false)
  })

  it('인터랙티브 요소(링크/버튼/옵션) 위의 탭은 열지 않는다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ onInteractiveTarget: true }))).toBe(false)
  })

  it('본문을 드래그 선택한 직후의 click 은 열지 않는다', () => {
    expect(shouldOpenOnBodyTap(goodTap({ hasTextSelection: true }))).toBe(false)
  })
})
