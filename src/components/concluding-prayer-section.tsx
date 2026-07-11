'use client'

import { useState } from 'react'
import type { HourSection } from '@/lib/types'
import { PageRef } from './page-ref'
import { RichContent } from './prayer-sections/rich-content'
import { Icon } from './icon'

type ConcludingPrayerSectionProps = {
  section: Extract<HourSection, { type: 'concludingPrayer' }>
}

export function ConcludingPrayerSection({ section }: ConcludingPrayerSectionProps) {
  const [showAlternate, setShowAlternate] = useState(false)

  const displayText = showAlternate && section.alternateText ? section.alternateText : section.text
  const activeRich = showAlternate ? section.alternateTextRich : section.textRich

  return (
    <section aria-label="Төгсгөлийн даатгал залбирал" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        Төгсгөлийн даатгал залбирал <PageRef page={section.page} />
      </p>
      {activeRich && activeRich.blocks.length > 0 ? (
        // FR-161 R-15: 전체 마침 기도문은 본문 petition + Trinitarian
        // doxology 의 다중 문장 구성 — sentence flow 로 문장 단위 grouping.
        // 사용자 spec: "각 문장을 한 단위씩 묶고 문장이 바뀌는 데서는
        // 줄바꿈을 하면 돼".
        <RichContent content={activeRich} className="mt-2" flow="sentence" />
      ) : (
        <p className="mt-2 font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200">
          {displayText}
        </p>
      )}

      {section.alternateText && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAlternate(!showAlternate)}
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-liturgical-gold)]"
          >
            <Icon
              name="next"
              size={14}
              className={`transition-transform ${showAlternate ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            {showAlternate ? 'Үндсэн залбирал' : 'Сонголтот залбирал'}
          </button>
        </div>
      )}
    </section>
  )
}
