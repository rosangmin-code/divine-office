'use client'

import { useId, useState } from 'react'
import type { HourSection } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { AntiphonBox } from './prayer-renderer'
import { PageRef } from './page-ref'
import { DirectiveBlock, partitionDirectives } from './prayer-sections/directive-block'

type InvitatoryProps = { section: Extract<HourSection, { type: 'invitatory' }> }

export function InvitatorySection({ section }: InvitatoryProps) {
  const { settings, updateSettings } = useSettings()
  const collapsed = settings.invitatoryCollapsed
  const listId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const { hasSkip, hasSubstitute, prepends, appends, substitutes, skips } =
    partitionDirectives(section.directives)
  const hideBody = hasSkip || hasSubstitute

  const candidates = section.candidates
  const rawIndex = settings.invitatoryPsalmIndex ?? 0
  const psalmIndex =
    candidates && candidates.length > 0
      ? Math.min(Math.max(rawIndex, 0), candidates.length - 1)
      : 0
  const activePsalm = candidates?.[psalmIndex] ?? section.psalm
  const activePage = candidates ? candidates[psalmIndex]?.page : section.page
  const hasDirectives = (section.directives?.length ?? 0) > 0

  return (
    <section aria-label="Урих дуудлага" className="mb-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          Урих дуудлага {!collapsed && <PageRef page={activePage} />}
        </p>
        <button
          type="button"
          onClick={() => updateSettings({ invitatoryCollapsed: !collapsed })}
          aria-expanded={!collapsed}
          aria-controls="invitatory-body"
          aria-label={collapsed ? 'Урих дуудлага дэлгэх' : 'Урих дуудлага хураах'}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)] dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
            aria-hidden="true"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>

      {/* FR-160-B PR-9a R1 fix: directives surface even when the
          invitatory body is collapsed (default `invitatoryCollapsed=true`).
          Otherwise first-hour users would miss a fired skip/substitute
          rubric and see only the paired opening versicle. */}
      {collapsed && hasDirectives && (
        <div data-role="invitatory-directives-collapsed">
          <DirectiveBlock directives={prepends} />
          {hideBody && (
            <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
          )}
          <DirectiveBlock directives={appends} />
        </div>
      )}

      {!collapsed && (
        <div id="invitatory-body">
          <DirectiveBlock directives={prepends} />
          {hideBody && (
            <DirectiveBlock directives={hasSubstitute ? substitutes : skips} />
          )}
          {section.rubric && !hideBody && (
            <p className="mt-1 text-xs italic text-red-700/80 dark:text-red-400/80">{section.rubric}</p>
          )}
          {!hideBody && (
          <>
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.versicle}</p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            <span className="text-red-700 dark:text-red-400">- </span>
            {section.response}
          </p>

          <AntiphonBox text={section.antiphon} page={activePage} />

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {activePsalm.ref.replace('Psalm', 'Дуулал')}
            </p>
            {candidates && candidates.length > 1 && (
              <button
                type="button"
                data-testid="invitatory-psalm-menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls={listId}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${menuOpen ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
                Бусад дуулал ({candidates.length})
              </button>
            )}
          </div>
          {candidates && candidates.length > 1 && menuOpen && (
            <ul
              id={listId}
              className="mt-2 space-y-1"
              role="listbox"
              aria-label="Дуулал сонгох"
            >
              {candidates.map((c, i) => (
                <li key={c.ref} role="option" aria-selected={i === psalmIndex}>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ invitatoryPsalmIndex: i })
                      setMenuOpen(false)
                    }}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                      i === psalmIndex
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                    }`}
                  >
                    {c.ref.replace('Psalm', 'Дуулал')} — {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs italic text-stone-500 dark:text-stone-400">{activePsalm.title}</p>
          {activePsalm.epigraph && (
            <p className="mt-1 text-xs italic text-stone-500 dark:text-stone-400">{activePsalm.epigraph}</p>
          )}

          {activePsalm.stanzas.map((stanza, si) => (
            <div key={si}>
              <div className="mt-3 space-y-1 pl-2">
                {stanza.map((line, li) => (
                  <p key={li} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
                    {line}
                  </p>
                ))}
              </div>
              <AntiphonBox text={section.antiphon} page={activePage} />
            </div>
          ))}

          <div className="mt-3 space-y-1 pl-2">
            <p className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.gloryBe}</p>
          </div>
          <AntiphonBox text={section.antiphon} page={activePage} />
          </>
          )}
          <DirectiveBlock directives={appends} />
        </div>
      )}
    </section>
  )
}
