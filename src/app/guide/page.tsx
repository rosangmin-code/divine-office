import Link from 'next/link'
import type { Metadata } from 'next'
import gilhData from '@/data/loth/gilh.json'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Залбиралт цагийн заавар | Цагийн Залбирал',
  description: 'Залбиралт цагийн ёслолын ерөнхий танилцуулга ба заавар',
}

type Subsection = {
  id: string
  number?: string
  title: string
  page?: number
  paragraphs: string[]
}

type Section = {
  id: string
  title: string
  subtitle?: string
  page: number
  paragraphs?: string[]
  subsections?: Subsection[]
}

type Footnote = {
  number: string
  text: string
}

const sections = gilhData.sections as Section[]
const footnotes = gilhData.footnotes as Footnote[]

function PageNum({ page }: { page?: number }) {
  if (!page) return null
  return (
    <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
      х.{page}
    </span>
  )
}

function FootnoteRef({ number }: { number: string }) {
  return (
    <a
      href={`#fn-${number}`}
      id={`fnref-${number}`}
      className="text-xs text-red-600/70 dark:text-red-400/70 hover:underline align-super"
    >
      [{number}]
    </a>
  )
}

function renderTextWithFootnotes(text: string) {
  // Replace [N] patterns with FootnoteRef links
  const parts = text.split(/\[(\d+)\]/)
  if (parts.length === 1) return text

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // This is a footnote number
      return <FootnoteRef key={i} number={part} />
    }
    return part
  })
}

function TableOfContents() {
  return (
    <nav
      aria-label="Гарчиг"
      className="mb-8 rounded-xl bg-white p-6 shadow-sm dark:bg-neutral-900 dark:ring-1 dark:ring-stone-800"
    >
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-4">
        Гарчиг
      </h2>
      <ul className="space-y-2 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex items-baseline gap-1 text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
            >
              <span className="font-medium">{section.title}</span>
              <span className="flex-1 border-b border-dotted border-stone-300 dark:border-stone-600 mx-1" />
              <PageNum page={section.page} />
            </a>
            {section.subsections && (
              <ul className="ml-4 mt-1 space-y-1">
                {section.subsections.map((sub) => (
                  <li key={sub.id}>
                    <a
                      href={`#${sub.id}`}
                      className="flex items-baseline gap-1 text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      <span>
                        {sub.number && <span className="text-red-600/70 dark:text-red-400/70">§{sub.number} </span>}
                        {sub.title}
                      </span>
                      <span className="flex-1 border-b border-dotted border-stone-200 dark:border-stone-700 mx-1" />
                      <PageNum page={sub.page} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        <li>
          <a
            href="#footnotes"
            className="flex items-baseline gap-1 text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            <span>Зүүлт тайлбар</span>
            <span className="flex-1 border-b border-dotted border-stone-200 dark:border-stone-700 mx-1" />
          </a>
        </li>
      </ul>
    </nav>
  )
}

function SectionContent({ section }: { section: Section }) {
  return (
    <article id={section.id} className="scroll-mt-8 mb-10">
      <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-baseline">
        {section.title}
        <PageNum page={section.page} />
      </h2>
      {section.subtitle && (
        <p className="text-sm italic text-stone-500 dark:text-stone-400 mb-4">
          {section.subtitle}
        </p>
      )}

      {/* Direct paragraphs (foreword) */}
      {section.paragraphs && (
        <div className="space-y-4">
          {section.paragraphs.map((p, i) => (
            <p
              key={i}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200 text-justify"
            >
              {renderTextWithFootnotes(p)}
            </p>
          ))}
        </div>
      )}

      {/* Subsections */}
      {section.subsections?.map((sub) => (
        <SubsectionContent key={sub.id} sub={sub} isRubric={section.id === 'rubrics'} />
      ))}
    </article>
  )
}

function SubsectionContent({ sub, isRubric }: { sub: Subsection; isRubric: boolean }) {
  return (
    <section id={sub.id} className="scroll-mt-8 mt-6">
      <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-3 flex items-baseline">
        {sub.number && (
          <span className="text-red-600/70 dark:text-red-400/70 mr-2">§{sub.number}</span>
        )}
        {sub.title}
        <PageNum page={sub.page} />
      </h3>
      <div className={isRubric ? 'space-y-2' : 'space-y-4'}>
        {sub.paragraphs.map((p, i) => {
          // Rubric items that look like liturgical elements (short, no period)
          if (isRubric && !p.includes('.') && p.length < 40) {
            return (
              <p
                key={i}
                className="font-serif text-sm font-semibold text-stone-600 dark:text-stone-400"
              >
                {p}
              </p>
            )
          }
          // Versicle/response pairs (contains \n with —)
          if (p.includes('\n')) {
            return (
              <div key={i} className="rounded-lg bg-stone-100 dark:bg-stone-800 px-4 py-3 space-y-1">
                {p.split('\n').map((line, j) => (
                  <p key={j} className="font-serif text-base text-stone-800 dark:text-stone-200">
                    {line.startsWith('—') ? (
                      <>
                        <abbr title="Хариу" className="font-medium text-red-700 dark:text-red-400 no-underline">R. </abbr>
                        {line.slice(2)}
                      </>
                    ) : (
                      line
                    )}
                  </p>
                ))}
              </div>
            )
          }
          return (
            <p
              key={i}
              className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200 text-justify"
            >
              {renderTextWithFootnotes(p)}
            </p>
          )
        })}
      </div>
    </section>
  )
}

function FootnotesSection() {
  return (
    <section id="footnotes" className="scroll-mt-8 mt-10 pt-6 border-t border-stone-200 dark:border-stone-700">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-4">
        Зүүлт тайлбар
      </h2>
      <ol className="space-y-2">
        {footnotes.map((fn) => (
          <li
            key={fn.number}
            id={`fn-${fn.number}`}
            className="text-xs text-stone-600 dark:text-stone-400 scroll-mt-8"
          >
            <a
              href={`#fnref-${fn.number}`}
              className="font-semibold text-red-600/70 dark:text-red-400/70 hover:underline mr-1"
            >
              [{fn.number}]
            </a>
            {fn.text}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            ← Нүүр хуудас
          </Link>
          <div className="flex items-center gap-1">
            <SettingsLink />
          </div>
        </div>
        <h1 className="text-center mb-2 text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Залбиралт цагийн заавар
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          General Instruction of the Liturgy of the Hours
        </p>
      </header>

      {/* Table of Contents */}
      <TableOfContents />

      {/* Content */}
      <div>
        {sections.map((section, i) => (
          <div key={section.id}>
            {i > 0 && (
              <div className="section-divider" role="separator">
                <span className="text-xs text-stone-300 dark:text-stone-600">✝</span>
              </div>
            )}
            <SectionContent section={section} />
          </div>
        ))}
      </div>

      {/* Footnotes */}
      <FootnotesSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}
