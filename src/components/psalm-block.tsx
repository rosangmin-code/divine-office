'use client'

import type { AssembledPsalm } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { PageRef } from './page-ref'
import { AntiphonBox } from './prayer-renderer'
import { RichContent } from './prayer-sections/rich-content'

export function PsalmBlock({ psalm, antiphonNumber }: { psalm: AssembledPsalm; antiphonNumber?: number }) {
  const { settings } = useSettings()
  return (
    <section aria-label={psalm.reference} className="mb-6">
      {/* Antiphon (before) */}
      {psalm.antiphon && <AntiphonBox text={psalm.antiphon} label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'} number={antiphonNumber} page={psalm.page} className="mb-3" />}

      {/* Psalm title & reference */}
      <div className="mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-400">
          {psalm.psalmType === 'canticle' ? 'Магтуу' : 'Дуулал'}
        </span>
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
          {psalm.reference} <PageRef page={psalm.page} />
        </h4>
        {psalm.title && (
          <p className="text-xs italic text-stone-500 dark:text-stone-500">{psalm.title}</p>
        )}
        {/* FR-160-C: psalm-header preface (patristic Father / NT typological) */}
        {psalm.headerRich && (
          <p
            data-role="psalm-header-rich"
            data-kind={psalm.headerRich.kind}
            className="mt-1 text-xs italic text-red-700 dark:text-red-400"
          >
            {psalm.headerRich.preface_text}
            {' ('}
            <span data-role="psalm-header-attribution">{psalm.headerRich.attribution}</span>
            {')'}
          </p>
        )}
      </div>

      {/* Stanzas (PDF source) or Verses (fallback) */}
      {psalm.stanzasRich && psalm.stanzasRich.blocks && psalm.stanzasRich.blocks.length > 0 ? (
        <div className="space-y-5 pl-3 md:space-y-4 md:pl-2">
          {psalm.stanzasRich.blocks.map((block, bi) => {
            if (block.kind !== 'stanza') return null
            // FR-161 R-4: phrase-render path. When the stanza carries
            // `phrases?: PhraseGroup[]`, group `lines[]` by `lineRange`
            // (inclusive both ends), join with a space, and emit one
            // viewport-wrappable phrase per group. The outer `<p>` drops
            // `whitespace-pre-line` because phrases now own the wrapping
            // policy. Falls back to the legacy line-by-line render when
            // `phrases` is absent or empty (regression-safe additive).
            if (block.phrases && block.phrases.length > 0) {
              return (
                <p
                  key={bi}
                  data-role="psalm-stanza"
                  data-render-mode="phrase"
                  className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
                >
                  {block.phrases.map((phrase, pi) => {
                    const [start, end] = phrase.lineRange
                    const phraseText = block.lines
                      .slice(start, end + 1)
                      .map((l) => l.spans.map((sp) => sp.text ?? '').join(''))
                      .join(' ')
                    const indent = phrase.indent ?? 0
                    // FR-161 R-13: hanging indent — preserve the legacy
                    // phrase first-line indent (0 / 6 / 12 spacing units)
                    // and add a uniform 6-unit hang for wrap continuation
                    // lines via `text-indent: -1.5rem` (-indent-6). The
                    // resulting visual: phrase start matches the prior
                    // baseline; viewport-wrapped continuation lines are
                    // pushed in by an additional 1.5rem so wrap is
                    // visually distinguishable from the next phrase
                    // boundary (user spec: "구문 wrap 시 들여쓰기 적용").
                    const indentClass =
                      indent === 0
                        ? 'pl-6 -indent-6'
                        : indent === 1
                        ? 'pl-12 -indent-6'
                        : 'pl-18 -indent-6'
                    const isRefrain = phrase.role === 'refrain'
                    const isDoxology = phrase.role === 'doxology'
                    const roleClass = isRefrain
                      ? ' text-red-700 dark:text-red-400'
                      : isDoxology
                      ? ' italic'
                      : ''
                    const dataRole = isRefrain
                      ? 'psalm-phrase-refrain'
                      : isDoxology
                      ? 'psalm-phrase-doxology'
                      : 'psalm-phrase'
                    return (
                      <span
                        key={pi}
                        data-role={dataRole}
                        className={`block${indentClass ? ' ' + indentClass : ''}${roleClass}`}
                      >
                        {phraseText}
                      </span>
                    )
                  })}
                </p>
              )
            }
            return (
              <p
                key={bi}
                data-role="psalm-stanza"
                className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200"
              >
                {block.lines.map((line, li) => {
                  const indent = line.indent ?? 0
                  const indentClass = indent === 0 ? '' : indent === 1 ? 'pl-6' : 'pl-12'
                  const isRefrain = line.role === 'refrain'
                  const refrainClass = isRefrain ? ' text-red-700 dark:text-red-400' : ''
                  const text = line.spans.map((sp) => sp.text ?? '').join('')
                  return (
                    <span
                      key={li}
                      data-role={isRefrain ? 'psalm-stanza-refrain' : undefined}
                      className={`block${indentClass ? ' ' + indentClass : ''}${refrainClass}`}
                    >
                      {text}
                    </span>
                  )
                })}
              </p>
            )
          })}
        </div>
      ) : psalm.stanzas && psalm.stanzas.length > 0 ? (
        <div className="space-y-5 pl-3 md:space-y-4 md:pl-2">
          {psalm.stanzas.map((stanza, si) => (
            <p key={si} data-role="psalm-stanza" className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              {stanza.map((line, li) => {
                // Leading whitespace in the JSON encodes a colon/response indent
                // level — 2 spaces = 1 level. Backward compatible: existing
                // entries without leading spaces render at indent 0.
                const leading = line.match(/^ */)![0].length
                const level = Math.min(Math.floor(leading / 2), 2)
                const trimmed = line.slice(leading)
                const indentClass = level === 0 ? '' : level === 1 ? 'pl-6' : 'pl-12'
                return (
                  <span key={li} className={`block${indentClass ? ' ' + indentClass : ''}`}>{trimmed}</span>
                )
              })}
            </p>
          ))}
        </div>
      ) : psalm.verses.length > 0 ? (
        <div className="space-y-1 pl-3 md:pl-2">
          {psalm.verses.map((v, i) => (
            <p key={i} className="whitespace-pre-line font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              <sup className="mr-1 text-xs text-stone-500 dark:text-stone-500" aria-label={`Ишлэл ${v.verse}`}>{v.verse}</sup>
              {v.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="pl-3 md:pl-2">
          <p role="note" className="text-sm italic text-stone-500 dark:text-stone-500">
            [Орчуулга хийгдэж байна]
          </p>
        </div>
      )}

      {/* Gloria Patri */}
      {psalm.gloriaPatri ? (
        <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг Эхэн цагт байсан мэт аливаа цагт болготугай. Амэн.
        </p>
      ) : psalm.gloriaPatri === false && (
        <p className="mt-2 text-xs italic text-red-700/80 dark:text-red-400/80">
          Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй
        </p>
      )}

      {/* Psalm-concluding prayer (Дууллыг төгсгөх залбирал) */}
      {psalm.psalmPrayer && !settings.psalmPrayerCollapsed && (
        <div data-role="psalm-prayer" className="mt-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Дууллыг төгсгөх залбирал <PageRef page={psalm.psalmPrayerPage} />
          </p>
          {psalm.psalmPrayerRich && psalm.psalmPrayerRich.blocks.length > 0 ? (
            // FR-161 R-15: 시편 마침 기도문은 산문 — 자연 wrap (사용자 spec).
            <RichContent
              content={psalm.psalmPrayerRich}
              className="mt-1"
              flow
            />
          ) : (
            <p className="mt-1 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
              {psalm.psalmPrayer}
            </p>
          )}
        </div>
      )}

      {/* Antiphon (after) */}
      {psalm.antiphon && <AntiphonBox text={psalm.antiphon} label={psalm.psalmType === 'canticle' ? 'canticle' : 'psalm'} number={antiphonNumber} page={psalm.page} className="mt-3" />}
    </section>
  )
}
