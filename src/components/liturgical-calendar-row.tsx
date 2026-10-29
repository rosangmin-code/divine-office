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
//   - Gold accent (semibold + gold text, NO uppercase) applies when
//     `shouldRowUseRedAccent` → rank ∈ {SOLEMNITY, FEAST}. (DESIGN.md:
//     악센트는 골드로 통일, 빨강·대문자 강조 폐지.)
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
  // 고순위 절기(SOLEMNITY·FEAST) 강조 여부. 시각 표현은 골드(두께+색) —
  // 헬퍼명은 레거시(`...RedAccent`)지만 DESIGN.md 정책상 빨강이 아닌 골드로 렌더한다.
  const useAccent = shouldRowUseRedAccent(row)

  const headerLabel = isAnchor
    ? null
    : `${row.dayLabel} ${row.dayOfMonth} ${row.month}-р сар`

  // Today (Automatic): synthetic body — "Өнөөдөр (Автомат)", the "Today
  // (Автомат)" of FR-145 user decision 3. Tapping it goes to today's row
  // (FR-187).
  // Date rows: defaultCelebration.nameMn (uppercase + red when fitted)
  const defaultBody = isAnchor
    ? 'Өнөөдөр (Автомат)'
    : row.defaultCelebration.nameMn

  return (
    <li
      ref={ref}
      data-testid="calendar-row"
      data-row-kind={row.kind}
      data-date={row.date}
      data-today={row.isToday ? 'true' : undefined}
      className={
        // FR-185 — 20px = 안쪽 시간경 카드 12px + 간격 8px (겹친 모서리 동심원).
        'group scroll-mt-2 rounded-[1.25rem] transition-colors ' +
        // today = primary-container(골드 연한 배경, DESIGN.md calendar-day-today).
        // 이전 stone gradient → gold-container 단색.
        (row.isToday
          ? 'bg-liturgical-gold-container dark:bg-stone-800 '
          : 'hover:bg-stone-100/60 dark:hover:bg-stone-800/40 ')
      }
    >
      <button
        type="button"
        onClick={onToggle}
        // The anchor opens today's row rather than toggling a body of its
        // own, so it is not a disclosure; aria-controls still names that row.
        aria-expanded={isAnchor ? undefined : expanded}
        aria-controls={`calendar-row-body-${row.date}`}
        data-testid="calendar-row-toggle"
        className="block w-full px-2 py-3 text-left"
      >
        {headerLabel && (
          // FR-185 — date line. When the row is open it also carries the
          // psalter week (formerly a caption above the hour cards, behind a
          // divider); today's row gets an «Өнөөдөр» tag so the highlight
          // explains itself.
          // Pieces wrap as whole units at large font sizes instead of being
          // squeezed letter-column thin.
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span
              data-testid="calendar-row-header"
              className={
                'whitespace-nowrap text-sm font-semibold ' +
                // FR-188 — gold only on today's date line. Gold on all ~31
                // date lines drowned out today's row and the feast names
                // (DESIGN.md: the accent goes on one thing per screen).
                (row.isToday
                  ? 'text-liturgical-gold dark:text-liturgical-gold-dark'
                  : 'text-stone-600 dark:text-stone-400')
              }
            >
              {headerLabel}
            </span>
            {expanded && (
              <span className="whitespace-nowrap text-sm text-stone-500 dark:text-stone-400">
                <span aria-hidden>· </span>
                <span>Дуулалтын {romanNumeral(row.psalterWeek)}</span>
              </span>
            )}
            {row.isToday && (
              <span
                data-role="today-badge"
                className="ml-auto whitespace-nowrap rounded-full bg-liturgical-gold px-2.5 py-1 text-xs font-semibold leading-none text-white dark:bg-liturgical-gold-dark dark:text-neutral-950"
              >
                Өнөөдөр
              </span>
            )}
          </span>
        )}
        <p
          data-testid="calendar-row-default"
          className={
            'mt-0.5 pl-4 leading-snug ' +
            // 축일/대축일(SOLEMNITY·FEAST) 강조 = 골드(두께+색), 대문자 금지.
            // DESIGN.md: 빨강은 더 이상 일반 강조에 쓰지 않고 악센트는 골드로 통일.
            (useAccent
              ? 'text-base font-semibold text-liturgical-gold dark:text-liturgical-gold-dark'
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
          className="px-2 pb-2"
        >
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
