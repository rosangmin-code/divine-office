/**
 * Unit tests for `HourCardList` — the home hour buttons (FR-185).
 *
 * The three (or five) hours render as rows of ONE flat card instead of
 * separate shadowed slabs, with a Lucide glyph and the distinguishing part
 * of the name set bold. Asserted on the SSR string (no DOM environment in
 * vitest, same pattern as footer.test.ts); hover/focus/layout are covered
 * by e2e/home-first-screen.spec.ts.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { HourCardList, splitHourName } from '../hour-card-list'
import { HOUR_NAMES_MN, type HourType } from '@/lib/types'

const ALL: HourType[] = ['firstVespers', 'firstCompline', 'lauds', 'vespers', 'compline']

function render(hours: HourType[]): string {
  return renderToStaticMarkup(
    createElement(HourCardList, {
      hours: hours.map((type) => ({ type, nameMn: HOUR_NAMES_MN[type] })),
      dateStr: '2026-11-01',
    }),
  )
}

// @fr FR-185
describe('splitHourName — bold only the part that tells the hours apart', () => {
  it('splits every hour name before the shared «даатгал залбирал»', () => {
    expect(ALL.map((t) => splitHourName(HOUR_NAMES_MN[t]).lead)).toEqual([
      '1 дүгээр Оройн',
      '1 дүгээр Оройн залбирлын дараах Шөнийн',
      'Өглөөний',
      'Оройн',
      'Шөнийн',
    ])
    for (const t of ALL) {
      const { lead, tail } = splitHourName(HOUR_NAMES_MN[t])
      expect(tail).toBe(' даатгал залбирал')
      expect(lead + tail).toBe(HOUR_NAMES_MN[t])
    }
  })

  it('keeps a name without the shared phrase whole', () => {
    expect(splitHourName('Магтаал')).toEqual({ lead: 'Магтаал', tail: '' })
    expect(splitHourName(' даатгал залбирал')).toEqual({ lead: ' даатгал залбирал', tail: '' })
  })
})

// @fr FR-185
describe('HourCardList — one flat card of rows', () => {
  it('renders a single hour-list card with one link per hour and no shadows', () => {
    const html = render(['lauds', 'vespers', 'compline'])
    expect(html.match(/data-role="hour-list"/g)).toHaveLength(1)
    expect(html.match(/<a /g)).toHaveLength(3)
    expect(html).toContain('divide-y')
    expect(html).not.toMatch(/\bshadow(-sm|-md)?\b/)
    expect(html).not.toContain('translate-y')
  })

  it('sets the distinguishing part bold and keeps the full name as the text', () => {
    const html = render(['lauds'])
    expect(html).toContain(
      '<h3 class="flex-1 text-stone-700 dark:text-stone-300"><span class="font-semibold text-stone-800 dark:text-stone-100">Өглөөний</span> даатгал залбирал</h3>',
    )
  })

  it('draws Lucide glyphs — sunrise / sunset / moon-star — and no unicode arrow', () => {
    const html = render(ALL)
    expect(html.match(/lucide-sunrise/g)).toHaveLength(1)
    expect(html.match(/lucide-sunset/g)).toHaveLength(2) // vespers + first vespers
    expect(html.match(/lucide-moon-star/g)).toHaveLength(2) // compline + first compline
    expect(html).not.toContain('→')
    // desktop-only chevron (#361) stays hidden on mobile
    expect(html.match(/lucide-chevron-right/g)).toHaveLength(5)
    expect(html).toMatch(/class="lucide lucide-chevron-right[^"]*\bhidden\b[^"]*md:block/)
  })
})
