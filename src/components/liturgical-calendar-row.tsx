'use client'

import { forwardRef, useRef, useState } from 'react'
import type { CalendarListRow } from '@/lib/calendar-list-types'
import { shouldRowUseRedAccent } from '@/lib/calendar-list-types'
import { HourCardList } from './hour-card-list'
import { CelebrationPicker } from './celebration-picker'
import { Icon } from './icon'
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
//     options; folded to one line at font size L and above, FR-189) +
//     hour cards underneath. The expand/collapse affordance itself is
//     owned by the parent list container.

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
 *
 * FR-189 — at font size L and above (`font-large`) the full picker (a
 * heading and one card per option, 710px of an 839px phone screen at 5XL)
 * pushed the row's hour buttons off the first screen. There it folds into
 * one line, the current choice and «Солих», which opens the picker;
 * clicking an option folds it again. At M and below the line is never
 * shown and the picker always is.
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
  const [open, setOpen] = useState(false)
  const lineRef = useRef<HTMLButtonElement>(null)
  const selected = options.find((o) => o.id === selectedId) ?? options[0]
  const pickerId = `celebration-options-${dateStr}`

  const fold = () => {
    setOpen(false)
    // Folding hides the option that has focus, but only where the line is
    // shown (large text); hand focus to the line there.
    const line = lineRef.current
    if (line && getComputedStyle(line).display !== 'none') line.focus()
  }

  return (
    <>
      <button
        ref={lineRef}
        type="button"
        data-role="celebration-summary"
        data-celebration-id={selected.id}
        aria-expanded={open}
        aria-controls={pickerId}
        onClick={() => setOpen((v) => !v)}
        // «Солих» drops to its own line when the name would otherwise be
        // squeezed to a word per line (5XL on a phone).
        className="hidden min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-left text-sm transition-colors hover:bg-stone-100 active:bg-stone-100 font-large:flex dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:active:bg-white/10"
      >
        <span className="flex min-w-0 flex-1 basis-48 items-start gap-3">
          <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full bg-liturgical-gold" />
          <span className="font-medium text-stone-800 dark:text-stone-100">
            <span className="sr-only">Залбирлын сонголт: </span>
            {selected.nameMn}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-stone-500 dark:text-stone-400">
          Солих
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} aria-hidden />
        </span>
      </button>
      <div
        id={pickerId}
        className={open ? 'font-large:mt-2' : 'font-large:hidden'}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) fold()
        }}
      >
        <CelebrationPicker
          dateStr={dateStr}
          options={options}
          selectedId={selectedId}
          onSelectAction={onSelect}
          onPickAction={fold}
        />
      </div>
    </>
  )
}

type CelebrationPickerOption = React.ComponentProps<typeof CelebrationPicker>['options'][number]
