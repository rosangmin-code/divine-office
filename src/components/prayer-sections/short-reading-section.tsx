import type { HourSection } from '@/lib/types'
import { formatRefMn, hasMongolianBookName } from '@/lib/scripture-ref-mn'
import { PageRef } from '../page-ref'
import { RichContent } from './rich-content'

export function ShortReadingSection({
  section,
}: {
  section: Extract<HourSection, { type: 'shortReading' }>
}) {
  // NFR-002 — propers 의 `ref` 는 몽골어(`Исаиа 52:13-15`)와 영문 약어
  // (`Isa 53:11b-12`)가 혼재한다. 영문이면 책 이름만 몽골어로 바꾸고, 그래도
  // 영문이 남는(매핑 없는) 경우에만 성경 데이터의 `bookMn` 을 앞에 붙여
  // 이전 `Исаиа — Isa 53:11b-12` 표기를 유지한다 (매핑되면 중복이라 생략).
  const refMn = formatRefMn(section.ref)
  const showBookMn = Boolean(section.bookMn) && !hasMongolianBookName(refMn)
  return (
    <section aria-label="Уншлага" className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        Уншлага <PageRef page={section.page} />
      </p>
      <p data-role="short-reading-ref" className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {showBookMn && `${section.bookMn} — `}
        {refMn}
      </p>
      {section.textRich && section.textRich.blocks.length > 0 ? (
        // FR-161 R-15: 짧은 독서는 산문 — natural flow (사용자 spec).
        <RichContent content={section.textRich} className="mt-2" flow="natural" />
      ) : (
        <div className="mt-2 space-y-1">
          {section.verses.map((v, i) => (
            <p
              key={i}
              className="font-reading text-base leading-relaxed text-stone-800 dark:text-stone-200"
            >
              {v.verse > 0 && (
                <sup className="mr-1 text-xs text-stone-500 dark:text-stone-400">
                  {v.verse}
                </sup>
              )}
              {v.text}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
