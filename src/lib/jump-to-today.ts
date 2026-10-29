// FR-187 — "go to today" shared by the home footer's «Өнөөдөр» button and the
// «Өнөөдөр (Автомат)» row at the top of the calendar list.
//
// The footer and the list are siblings, so they talk through a window event.
// The list cancels the event when it has today's row and scrolls to it itself;
// an uncancelled event means today is not on screen and the caller navigates
// to `/` instead.

export const JUMP_TO_TODAY_EVENT = 'loth-jump-to-today'

/** True when a mounted calendar list took the jump. */
export function requestJumpToToday(): boolean {
  return !window.dispatchEvent(new Event(JUMP_TO_TODAY_EVENT, { cancelable: true }))
}

/**
 * Scroll a calendar row into view. A row taller than the screen (large font
 * settings) is aligned to the top, otherwise centring would cut off its date
 * line (FR-184).
 */
export function revealRow(el: HTMLElement, behavior: ScrollBehavior): void {
  const block = el.getBoundingClientRect().height > window.innerHeight ? 'start' : 'center'
  el.scrollIntoView({ block, behavior })
}
