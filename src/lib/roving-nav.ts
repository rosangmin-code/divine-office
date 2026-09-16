/**
 * Roving-tabindex 키보드 내비게이션 — 순수 로직 (H3, app-review §3.3).
 *
 * `useListbox` / `useRadioGroup` (src/components/ui/listbox.tsx) 가 이 모듈의
 * 순수 함수를 감싼다. vitest 환경에 jsdom 이 없으므로 (vitest.config.ts) 키보드
 * 계약은 여기서 단위 테스트하고, 실제 focus 이동은 Playwright 가 맡는다.
 */

export type RovingOrientation = 'vertical' | 'horizontal' | 'both'

export interface RovingNavOptions {
  /** 어떤 방향키를 이동으로 볼지. 기본 'vertical' (↑/↓ 만). */
  orientation?: RovingOrientation
  /** 양 끝에서 순환할지. WAI-ARIA: listbox=false, radiogroup=true. */
  wrap?: boolean
}

/**
 * 방향키/Home/End 로 이동할 다음 인덱스를 돌려준다.
 * 이동 키가 아니거나 항목이 없으면 `null`.
 */
export function nextRovingIndex(
  key: string,
  current: number,
  count: number,
  { orientation = 'vertical', wrap = false }: RovingNavOptions = {},
): number | null {
  if (!Number.isInteger(count) || count <= 0) return null
  const from = Number.isInteger(current) && current >= 0 && current < count ? current : 0
  const vertical = orientation === 'vertical' || orientation === 'both'
  const horizontal = orientation === 'horizontal' || orientation === 'both'

  const step = (delta: number): number => {
    const next = from + delta
    if (next < 0) return wrap ? count - 1 : 0
    if (next >= count) return wrap ? 0 : count - 1
    return next
  }

  switch (key) {
    case 'ArrowDown':
      return vertical ? step(1) : null
    case 'ArrowUp':
      return vertical ? step(-1) : null
    case 'ArrowRight':
      return horizontal ? step(1) : null
    case 'ArrowLeft':
      return horizontal ? step(-1) : null
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/** 열린 listbox 안에서 눌린 키가 뜻하는 동작. */
export interface ListboxKeyAction {
  type: 'move' | 'select' | 'close' | 'none'
  /** type==='move' 일 때 이동할 인덱스. */
  index?: number
  /** type==='close' 일 때 트리거로 포커스를 되돌릴지 (Esc=true, Tab=false). */
  restoreFocus?: boolean
  /** 브라우저 기본 동작을 막아야 하는지. Tab 은 막지 않는다. */
  preventDefault?: boolean
}

const SELECT_KEYS = new Set(['Enter', ' ', 'Spacebar'])

/**
 * 열린 listbox 의 키 → 동작 매핑 (WAI-ARIA APG listbox 패턴).
 *
 *  - ↑/↓ · Home/End : 활성 옵션 이동 (순환 없음)
 *  - Enter / Space  : 활성 옵션 선택
 *  - Escape         : 닫고 트리거로 포커스 복원
 *  - Tab            : 닫되 포커스는 브라우저가 다음 요소로 옮기게 둔다
 */
export function listboxKeyAction(
  key: string,
  activeIndex: number,
  count: number,
): ListboxKeyAction {
  const moved = nextRovingIndex(key, activeIndex, count, { orientation: 'vertical', wrap: false })
  if (moved !== null) return { type: 'move', index: moved, preventDefault: true }
  if (SELECT_KEYS.has(key)) return { type: 'select', preventDefault: true }
  if (key === 'Escape') return { type: 'close', restoreFocus: true, preventDefault: true }
  if (key === 'Tab') return { type: 'close', restoreFocus: false, preventDefault: false }
  return { type: 'none' }
}

/** 닫힌 combobox 트리거에서 눌린 키가 뜻하는 동작. */
export interface ComboboxTriggerKeyAction {
  type: 'open' | 'none'
  /** type==='open' 일 때 열면서 활성화할 인덱스. */
  index?: number
  preventDefault?: boolean
}

/**
 * 닫힌 트리거의 키 → 동작. Enter/Space 는 브라우저가 button 기본 동작으로
 * click 을 발화하므로 여기서는 방향키/Home/End 만 처리한다.
 *
 * APG: 닫힌 combobox 에서 ↓/↑ 는 "열고 **현재 선택** 옵션을 활성화" 다
 * (한 칸 더 내려가지 않는다). Home/End 만 처음/마지막으로 건너뛴다.
 */
export function comboboxTriggerKeyAction(
  key: string,
  selectedIndex: number,
  count: number,
): ComboboxTriggerKeyAction {
  if (!Number.isInteger(count) || count <= 0) return { type: 'none' }
  const clamped =
    Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < count
      ? selectedIndex
      : 0
  switch (key) {
    case 'ArrowDown':
    case 'ArrowUp':
      return { type: 'open', index: clamped, preventDefault: true }
    case 'Home':
      return { type: 'open', index: 0, preventDefault: true }
    case 'End':
      return { type: 'open', index: count - 1, preventDefault: true }
    default:
      return { type: 'none' }
  }
}
