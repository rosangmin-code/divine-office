'use client'

/**
 * 접근 가능한 공용 listbox / radiogroup 훅 (H3 · M7, app-review §3.3).
 *
 * 이전: hymn / marian-antiphon / invitatory / gospel-canticle 네 곳이 같은
 * 드롭다운을 각자 복붙했고, 공통으로
 *   - `<li role="option">` 안에 `<button>` 을 중첩 (option 의 자식은
 *     presentational 이어야 한다 — 중첩 버튼은 AT 에서 이름/역할이 깨진다),
 *   - 화살표키 · Home/End · Enter/Space · Esc · 바깥 클릭 전무,
 *   - 열려도 포커스가 목록으로 들어가지 않고 `aria-activedescendant` 없음
 * 이었다. 네 곳을 이 훅으로 수렴한다.
 *
 * WAI-ARIA APG 의 "Select-Only Combobox" + roving tabindex 혼합:
 *   트리거  — `role="combobox" aria-haspopup="listbox" aria-expanded
 *             aria-controls` (+ 열렸을 때 `aria-activedescendant`)
 *   목록    — `role="listbox"`
 *   항목    — `<li role="option" id aria-selected tabindex>` — 중첩 버튼 없이
 *             li 자신이 클릭·포커스 대상 (roving tabindex).
 *
 * 렌더 마크업(클래스·문구·data-role/data-testid)은 기존과 같게 유지해 e2e 를
 * 깨뜨리지 않는다. 네이티브 `<select>` 로 되돌리지 않는다 — e2e·컴포넌트
 * 테스트가 못 잡는 회귀가 있었다 (#96 → #98).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  comboboxTriggerKeyAction,
  listboxKeyAction,
  nextRovingIndex,
  type RovingOrientation,
} from '@/lib/roving-nav'

// ---------------------------------------------------------------------------
// 옵션 스타일 — 네 곳이 동일했던 클래스 문자열을 한 곳으로.
// ---------------------------------------------------------------------------

const OPTION_BASE =
  'w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-liturgical-gold)]'
const OPTION_SELECTED = 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
const OPTION_IDLE =
  'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'

/** `<li role="option">` 의 공통 클래스. */
export function listboxOptionClassName(selected: boolean): string {
  return `${OPTION_BASE} ${selected ? OPTION_SELECTED : OPTION_IDLE}`
}

// ---------------------------------------------------------------------------
// useListbox
// ---------------------------------------------------------------------------

export interface UseListboxParams {
  /** 옵션 개수. */
  count: number
  /** 현재 선택 인덱스 (외부 소유 — settings/useState 어느 쪽이든). */
  selectedIndex: number
  /** 옵션 확정 시 호출. 훅이 닫기·포커스 복원을 이어서 처리한다. */
  onSelect: (index: number) => void
}

export interface ListboxTriggerProps {
  ref: (el: HTMLButtonElement | null) => void
  type: 'button'
  role: 'combobox'
  'aria-haspopup': 'listbox'
  'aria-expanded': boolean
  'aria-controls': string
  'aria-activedescendant'?: string
  onClick: () => void
  onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void
}

export interface ListboxListProps {
  ref: (el: HTMLUListElement | null) => void
  id: string
  role: 'listbox'
  onKeyDown: (e: ReactKeyboardEvent<HTMLUListElement>) => void
  onBlur: (e: ReactFocusEvent<HTMLUListElement>) => void
}

export interface ListboxOptionProps {
  ref: (el: HTMLLIElement | null) => void
  id: string
  role: 'option'
  'aria-selected': boolean
  tabIndex: number
  onClick: () => void
}

export interface ListboxApi {
  /** 목록이 펼쳐져 있는가. */
  open: boolean
  /** 프로그램적으로 닫기 (옵션 선택 외 경로). */
  close: () => void
  /** 키보드 활성 옵션 인덱스 (열렸을 때만 의미 있음). */
  activeIndex: number
  triggerProps: ListboxTriggerProps
  listProps: ListboxListProps
  getOptionProps: (index: number) => ListboxOptionProps
}

function clampIndex(index: number, count: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= count) return 0
  return index
}

export function useListbox({ count, selectedIndex, onSelect }: UseListboxParams): ListboxApi {
  const baseId = useId()
  const listId = `${baseId}-listbox`
  const optionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId])

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(selectedIndex, count))

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const optionRefs = useRef(new Map<number, HTMLLIElement>())

  const setTriggerRef = useCallback((el: HTMLButtonElement | null) => {
    triggerRef.current = el
  }, [])
  const setListRef = useCallback((el: HTMLUListElement | null) => {
    listRef.current = el
  }, [])

  const focusTrigger = useCallback(() => {
    triggerRef.current?.focus()
  }, [])

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const openAt = useCallback((index: number) => {
    setActiveIndex(index)
    setOpen(true)
  }, [])

  const select = useCallback(
    (index: number) => {
      onSelect(index)
      setOpen(false)
      focusTrigger()
    },
    [onSelect, focusTrigger],
  )

  // 열릴 때 / 활성 인덱스가 바뀔 때 해당 옵션으로 포커스 (roving tabindex).
  useEffect(() => {
    if (!open) return
    const el = optionRefs.current.get(activeIndex) ?? optionRefs.current.get(0)
    el?.focus()
  }, [open, activeIndex])

  // 바깥 클릭 → 닫기 (포커스는 옮기지 않는다 — 사용자가 이미 다른 곳을 눌렀다).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (triggerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const triggerProps: ListboxTriggerProps = {
    ref: setTriggerRef,
    type: 'button',
    role: 'combobox',
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    'aria-controls': listId,
    ...(open ? { 'aria-activedescendant': optionId(activeIndex) } : {}),
    onClick: () => {
      if (open) setOpen(false)
      else openAt(clampIndex(selectedIndex, count))
    },
    onKeyDown: (e) => {
      if (open) {
        if (e.key === 'Escape') {
          e.preventDefault()
          close(true)
        }
        return
      }
      const action = comboboxTriggerKeyAction(e.key, selectedIndex, count)
      if (action.type !== 'open') return
      if (action.preventDefault) e.preventDefault()
      openAt(action.index ?? 0)
    },
  }

  const listProps: ListboxListProps = {
    ref: setListRef,
    id: listId,
    role: 'listbox',
    onKeyDown: (e) => {
      const action = listboxKeyAction(e.key, activeIndex, count)
      if (action.type === 'none') return
      if (action.preventDefault) e.preventDefault()
      if (action.type === 'move') setActiveIndex(action.index ?? 0)
      else if (action.type === 'select') select(activeIndex)
      else if (action.type === 'close') close(action.restoreFocus === true)
    },
    onBlur: (e) => {
      const next = e.relatedTarget as Node | null
      if (next && (listRef.current?.contains(next) || triggerRef.current?.contains(next))) return
      setOpen(false)
    },
  }

  const getOptionProps = (index: number): ListboxOptionProps => ({
    ref: (el: HTMLLIElement | null) => {
      if (el) optionRefs.current.set(index, el)
      else optionRefs.current.delete(index)
    },
    id: optionId(index),
    role: 'option',
    'aria-selected': index === selectedIndex,
    tabIndex: index === activeIndex ? 0 : -1,
    onClick: () => select(index),
  })

  return {
    open,
    close: () => close(false),
    activeIndex,
    triggerProps,
    listProps,
    getOptionProps,
  }
}

// ---------------------------------------------------------------------------
// useRadioGroup — M7. 같은 roving 로직을 radiogroup 에 적용.
// ---------------------------------------------------------------------------

export interface UseRadioGroupParams {
  count: number
  selectedIndex: number
  onSelect: (index: number) => void
  /** 그리드형 radiogroup 은 'both' (기본). 세로 목록은 'vertical'. */
  orientation?: RovingOrientation
}

export interface RadioGroupItemProps {
  ref: (el: HTMLButtonElement | null) => void
  type: 'button'
  role: 'radio'
  'aria-checked': boolean
  tabIndex: number
  onClick: () => void
}

export interface RadioGroupApi {
  /** `role="radiogroup"` 컨테이너에 spread. */
  groupProps: { onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void }
  getRadioProps: (index: number) => RadioGroupItemProps
}

export function useRadioGroup({
  count,
  selectedIndex,
  onSelect,
  orientation = 'both',
}: UseRadioGroupParams): RadioGroupApi {
  const itemRefs = useRef(new Map<number, HTMLButtonElement>())
  // 선택된 항목만 tab stop (roving tabindex). 선택이 없으면 첫 항목.
  const activeIndex = clampIndex(selectedIndex, count)

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const next = nextRovingIndex(e.key, activeIndex, count, { orientation, wrap: true })
    if (next === null) return
    e.preventDefault()
    // WAI-ARIA radiogroup: 방향키 이동은 곧 선택이다.
    if (next !== selectedIndex) onSelect(next)
    itemRefs.current.get(next)?.focus()
  }

  return {
    groupProps: { onKeyDown: handleKeyDown },
    getRadioProps: (index: number): RadioGroupItemProps => ({
      ref: (el: HTMLButtonElement | null) => {
        if (el) itemRefs.current.set(index, el)
        else itemRefs.current.delete(index)
      },
      type: 'button',
      role: 'radio',
      'aria-checked': index === selectedIndex,
      tabIndex: index === activeIndex ? 0 : -1,
      onClick: () => onSelect(index),
    }),
  }
}
