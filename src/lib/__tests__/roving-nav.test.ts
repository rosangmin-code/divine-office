/**
 * H3 (app-review 2026-09-13 §3.3) — 공용 listbox / radiogroup 키보드 계약.
 *
 * vitest 환경에 jsdom 이 없으므로 (vitest.config.ts) 훅의 live focus 이동은
 * Playwright 가 검증하고, 여기서는 "어떤 키가 무슨 동작인가" 라는 계약을
 * 순수 함수 수준에서 고정한다.
 */

import { describe, it, expect } from 'vitest'
import {
  comboboxTriggerKeyAction,
  listboxKeyAction,
  nextRovingIndex,
} from '../roving-nav'

describe('nextRovingIndex — 방향키/Home/End 이동', () => {
  it('세로 기본: ↓ 는 다음, ↑ 는 이전', () => {
    expect(nextRovingIndex('ArrowDown', 0, 4)).toBe(1)
    expect(nextRovingIndex('ArrowUp', 2, 4)).toBe(1)
  })

  it('Home/End 는 처음/마지막', () => {
    expect(nextRovingIndex('Home', 3, 4)).toBe(0)
    expect(nextRovingIndex('End', 0, 4)).toBe(3)
  })

  it('wrap=false (listbox) 는 양 끝에서 멈춘다', () => {
    expect(nextRovingIndex('ArrowUp', 0, 4)).toBe(0)
    expect(nextRovingIndex('ArrowDown', 3, 4)).toBe(3)
  })

  it('wrap=true (radiogroup) 는 양 끝에서 순환한다', () => {
    expect(nextRovingIndex('ArrowUp', 0, 4, { wrap: true })).toBe(3)
    expect(nextRovingIndex('ArrowDown', 3, 4, { wrap: true })).toBe(0)
  })

  it("orientation='vertical' 은 ←/→ 를 무시한다", () => {
    expect(nextRovingIndex('ArrowRight', 0, 4)).toBeNull()
    expect(nextRovingIndex('ArrowLeft', 1, 4)).toBeNull()
  })

  it("orientation='both' 은 네 방향키를 모두 받는다 (그리드형 radiogroup)", () => {
    expect(nextRovingIndex('ArrowRight', 0, 3, { orientation: 'both' })).toBe(1)
    expect(nextRovingIndex('ArrowLeft', 2, 3, { orientation: 'both' })).toBe(1)
    expect(nextRovingIndex('ArrowDown', 0, 3, { orientation: 'both' })).toBe(1)
  })

  it('이동 키가 아니면 null — 타이핑을 가로채지 않는다', () => {
    for (const key of ['Enter', ' ', 'Escape', 'Tab', 'a', 'PageDown']) {
      expect(nextRovingIndex(key, 1, 4)).toBeNull()
    }
  })

  it('빈 목록 / 깨진 current 를 방어한다', () => {
    expect(nextRovingIndex('ArrowDown', 0, 0)).toBeNull()
    expect(nextRovingIndex('ArrowDown', -5, 4)).toBe(1)
    expect(nextRovingIndex('ArrowDown', Number.NaN, 4)).toBe(1)
  })
})

describe('listboxKeyAction — 열린 listbox 의 키 계약', () => {
  it('↑/↓/Home/End → move (기본 동작 차단)', () => {
    expect(listboxKeyAction('ArrowDown', 0, 4)).toEqual({
      type: 'move',
      index: 1,
      preventDefault: true,
    })
    expect(listboxKeyAction('ArrowUp', 2, 4)).toEqual({
      type: 'move',
      index: 1,
      preventDefault: true,
    })
    expect(listboxKeyAction('Home', 3, 4).index).toBe(0)
    expect(listboxKeyAction('End', 0, 4).index).toBe(3)
  })

  it('Enter / Space → select', () => {
    expect(listboxKeyAction('Enter', 1, 4)).toEqual({ type: 'select', preventDefault: true })
    expect(listboxKeyAction(' ', 1, 4)).toEqual({ type: 'select', preventDefault: true })
  })

  it('Escape → 닫고 트리거로 포커스 복원', () => {
    expect(listboxKeyAction('Escape', 1, 4)).toEqual({
      type: 'close',
      restoreFocus: true,
      preventDefault: true,
    })
  })

  it('Tab → 닫되 포커스는 브라우저에 맡긴다 (preventDefault 하지 않음)', () => {
    expect(listboxKeyAction('Tab', 1, 4)).toEqual({
      type: 'close',
      restoreFocus: false,
      preventDefault: false,
    })
  })

  it('그 밖의 키는 none', () => {
    expect(listboxKeyAction('a', 1, 4)).toEqual({ type: 'none' })
  })
})

describe('comboboxTriggerKeyAction — 닫힌 트리거의 키 계약', () => {
  it('↓/↑ 는 열면서 **현재 선택** 을 활성화한다 (한 칸 더 가지 않는다)', () => {
    expect(comboboxTriggerKeyAction('ArrowDown', 2, 6)).toEqual({
      type: 'open',
      index: 2,
      preventDefault: true,
    })
    expect(comboboxTriggerKeyAction('ArrowUp', 2, 6)).toEqual({
      type: 'open',
      index: 2,
      preventDefault: true,
    })
  })

  it('Home/End 는 처음/마지막을 활성화하며 연다', () => {
    expect(comboboxTriggerKeyAction('Home', 3, 6).index).toBe(0)
    expect(comboboxTriggerKeyAction('End', 3, 6).index).toBe(5)
  })

  it('Enter/Space 는 button 기본 click 에 맡긴다 (여기선 none)', () => {
    expect(comboboxTriggerKeyAction('Enter', 0, 6)).toEqual({ type: 'none' })
    expect(comboboxTriggerKeyAction(' ', 0, 6)).toEqual({ type: 'none' })
  })

  it('옵션이 없으면 열지 않는다', () => {
    expect(comboboxTriggerKeyAction('ArrowDown', 0, 0)).toEqual({ type: 'none' })
  })

  it('깨진 selectedIndex 는 0 으로 방어한다', () => {
    expect(comboboxTriggerKeyAction('ArrowDown', 99, 4).index).toBe(0)
    expect(comboboxTriggerKeyAction('ArrowDown', Number.NaN, 4).index).toBe(0)
  })
})
