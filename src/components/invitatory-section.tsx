'use client'

import type { HourSection } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { AntiphonBox } from './prayer-renderer'
import { PageRef } from './page-ref'

type InvitatoryProps = { section: Extract<HourSection, { type: 'invitatory' }> }

export function InvitatorySection({ section }: InvitatoryProps) {
  const { settings, updateSettings } = useSettings()
  const collapsed = settings.invitatoryCollapsed

  return (
    <section aria-label="Урих дуудлага" className="mb-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          Урих дуудлага {!collapsed && <PageRef page={section.page} />}
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

      {!collapsed && (
        <div id="invitatory-body">
          {section.rubric && (
            <p className="mt-1 text-xs italic text-red-700/80 dark:text-red-400/80">{section.rubric}</p>
          )}
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.versicle}</p>
          <p className="font-serif text-stone-800 dark:text-stone-200">
            <span className="text-red-700 dark:text-red-400">- </span>
            {section.response}
          </p>

          <AntiphonBox text={section.antiphon} />

          <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-400">
            {section.psalm.ref.replace('Psalm', 'Дуулал')}
          </p>
          <p className="text-xs italic text-stone-500 dark:text-stone-400">{section.psalm.title}</p>
          {section.psalm.epigraph && (
            <p className="mt-1 text-xs italic text-stone-500 dark:text-stone-400">{section.psalm.epigraph}</p>
          )}

          {section.psalm.stanzas.map((stanza, si) => (
            <div key={si}>
              <div className="mt-3 space-y-1 pl-2">
                {stanza.map((line, li) => (
                  <p key={li} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
                    {line}
                  </p>
                ))}
              </div>
              <AntiphonBox text={section.antiphon} />
            </div>
          ))}

          <div className="mt-3 space-y-1 pl-2">
            <p className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.gloryBe}</p>
          </div>
          <AntiphonBox text={section.antiphon} />
        </div>
      )}
    </section>
  )
}
