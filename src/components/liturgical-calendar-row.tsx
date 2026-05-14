'use client'

import { forwardRef } from 'react'
import type { CalendarListRow } from '@/lib/calendar-list-types'
import { shouldRowUseRedAccent } from '@/lib/calendar-list-types'
import { HourCardList } from './hour-card-list'
import { CelebrationPicker } from './celebration-picker'
import { romanNumeral } from '@/lib/mappings'

// FR-145 (#8) — Single row in the liturgical-calendar-list first screen.
//
// Layout follows image.png:
//   - Bold first line: day-of-week + numeric date (e.g. "Пүр 14 5월")
//   - Indented second line: default celebration nameMn
//   - Optional third line: "эсвэл <alternative nameMn>" (or X)
//
// Decisions:
//   - Red accent (uppercase + red text) applies when
//     `shouldRowUseRedAccent` → rank ∈ {SOLEMNITY, FEAST}.
//   - The "Today (Automatic)" anchor row uses a synthetic layout with
//     only the body text "(Автомат)" — no weekday/date header.
//   - When expanded, the row inlines the celebration picker (if >1
//     options) + hour cards underneath. The expand/collapse affordance
//     itself is owned by the parent list container.

interface LiturgicalCalendarRowProps {
  row: CalendarListRow
  expanded: boolean
  selectedCelebrationId: string
  onToggle: () => void
  onSelectCelebration: (id: string) => void
}

// FR-145 iter 2 MINOR #3 — `forwardRef` on the <li> directly so the
// parent list can attach a ref for scrollIntoView without an extra
// content-shim element (which would have broken the HTML5 `<ul> > <li>`
// content model).
export const LiturgicalCalendarRow = forwardRef<HTMLLIElement, LiturgicalCalendarRowProps>(function LiturgicalCalendarRow(
  {
    row,
    expanded,
    selectedCelebrationId,
    onToggle,
    onSelectCelebration,
  },
  ref,
) {
  const isAnchor = row.kind === 'today-anchor'
  const useRed = shouldRowUseRedAccent(row)

  const headerLabel = isAnchor
    ? null
    : `${row.dayLabel} ${row.dayOfMonth} ${row.month}-р сар`

  // Today (Automatic): synthetic body — "(Автомат)"
  // Date rows: defaultCelebration.nameMn (uppercase + red when fitted)
  const defaultBody = isAnchor
    ? '(Автомат)'
    : row.defaultCelebration.nameMn

  return (
    <li
      ref={ref}
      data-testid="calendar-row"
      data-row-kind={row.kind}
      data-date={row.date}
      data-today={row.isToday ? 'true' : undefined}
      className={
        'group rounded-xl transition-colors ' +
        (row.isToday
          ? 'bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-800 dark:to-stone-900 '
          : 'hover:bg-stone-100/60 dark:hover:bg-stone-800/40 ')
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`calendar-row-body-${row.date}`}
        data-testid="calendar-row-toggle"
        className="block w-full px-3 py-3 text-left"
      >
        {headerLabel && (
          <p
            data-testid="calendar-row-header"
            className="text-sm font-semibold text-liturgical-gold dark:text-liturgical-gold-dark"
          >
            {headerLabel}
          </p>
        )}
        <p
          data-testid="calendar-row-default"
          className={
            'mt-0.5 pl-4 leading-snug ' +
            (useRed
              ? 'text-base font-semibold uppercase text-liturgical-red dark:text-liturgical-red-dark'
              : 'text-sm text-stone-700 dark:text-stone-300')
          }
        >
          {defaultBody}
        </p>
        {row.alternatives.map((alt) => (
          <p
            key={alt.id}
            data-testid="calendar-row-alternative"
            data-celebration-id={alt.id}
            className="mt-0.5 pl-4 text-sm text-stone-600 dark:text-stone-400"
          >
            эсвэл {alt.nameMn}
          </p>
        ))}
      </button>

      {expanded && !isAnchor && (
        <div
          id={`calendar-row-body-${row.date}`}
          data-testid="calendar-row-body"
          className="border-t border-stone-200 px-3 pb-4 pt-3 dark:border-stone-800"
        >
          {/* Psalter week — small caption, matches existing hour-page layout */}
          <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
            Дуулалтын {romanNumeral(row.psalterWeek)}
          </p>
          {/* Inline celebration picker (only when >1 options) */}
          {row.alternatives.length > 0 && (
            <div className="mb-4">
              <InlineCelebrationPicker
                dateStr={row.date}
                options={[row.defaultCelebration, ...row.alternatives]}
                selectedId={selectedCelebrationId}
                onSelect={onSelectCelebration}
              />
            </div>
          )}
          <HourCardList
            hours={[...row.hoursSummary]}
            dateStr={row.date}
            celebrationId={selectedCelebrationId}
          />
        </div>
      )}
    </li>
  )
})

/**
 * Inline variant of {@link CelebrationPicker} that drives selection state
 * upward via `onSelect` rather than mutating the URL. The CelebrationPicker
 * component is preserved unchanged on the prayer page; this inline version
 * suits the calendar-list flow where multiple rows can be expanded and
 * each manages its own selection without polluting the global URL.
 */
function InlineCelebrationPicker({
  dateStr,
  options,
  selectedId,
  onSelect,
}: {
  dateStr: string
  options: CelebrationPickerOption[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Reuse the design tokens / a11y story of the existing picker by
  // delegating to it visually; the inline form sets `dateStr` only for
  // the data-testid wiring continuity with the existing component.
  return (
    <CelebrationPicker
      dateStr={dateStr}
      options={options}
      selectedId={selectedId}
      onSelectAction={onSelect}
    />
  )
}

type CelebrationPickerOption = React.ComponentProps<typeof CelebrationPicker>['options'][number]
