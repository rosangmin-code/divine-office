import Link from 'next/link'
import type { Metadata } from 'next'
import ordinariumData from '@/data/loth/ordinarium.json'
import { SettingsLink } from '@/components/settings-link'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'Залбиралт цагийн ёслолын дэг жаяг | Цагийн Залбирал',
  description: 'Өглөөний болон оройн даатгал залбирлын дэг жаяг — урих дуудлага, дуулал, магтуу, гуйлтын залбирал, төгсгөл',
}

type ParagraphBlock = { type: 'paragraph'; text: string }
type RubricBlock = { type: 'rubric'; text: string }
type VersicleBlock = { type: 'versicle'; v: string; r: string }
type HeadingBlock = { type: 'heading'; text: string; subtitle?: string }
type PsalmStanzaBlock = { type: 'psalm-stanza'; lines: string[] }
type AntiphonGroupBlock = {
  type: 'antiphon-group'
  season: string
  page?: number
  items: { day: string; text: string }[]
}

type Block =
  | ParagraphBlock
  | RubricBlock
  | VersicleBlock
  | HeadingBlock
  | PsalmStanzaBlock
  | AntiphonGroupBlock

type Subsection = {
  id: string
  title: string
  page?: number
  blocks: Block[]
}

type Section = {
  id: string
  title: string
  page: number
  subsections: Subsection[]
}

const sections = ordinariumData.sections as Section[]

function PageNum({ page }: { page?: number }) {
  if (!page) return null
  return (
    <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
      х.{page}
    </span>
  )
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
      <ul className="space-y-3 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex items-baseline gap-1 font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
            >
              <span>{section.title}</span>
              <span className="flex-1 border-b border-dotted border-stone-300 dark:border-stone-600 mx-1" />
              <PageNum page={section.page} />
            </a>
            <ul className="ml-4 mt-1 space-y-1">
              {section.subsections.map((sub) => (
                <li key={sub.id}>
                  <a
                    href={`#${sub.id}`}
                    className="flex items-baseline gap-1 text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                  >
                    <span>{sub.title}</span>
                    <span className="flex-1 border-b border-dotted border-stone-200 dark:border-stone-700 mx-1" />
                    <PageNum page={sub.page} />
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200 text-justify">
          {block.text}
        </p>
      )
    case 'rubric':
      return (
        <p
          data-block="rubric"
          className="font-serif text-sm leading-relaxed text-red-700/80 dark:text-red-400/80"
        >
          {block.text}
        </p>
      )
    case 'heading':
      return (
        <div className="mt-4">
          <h4 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
            {block.text}
          </h4>
          {block.subtitle && (
            <p className="text-xs italic text-stone-500 dark:text-stone-400">
              {block.subtitle}
            </p>
          )}
        </div>
      )
    case 'versicle':
      return (
        <div className="rounded-lg bg-stone-100 dark:bg-stone-800 px-4 py-3 space-y-1">
          <p className="font-serif text-base text-stone-800 dark:text-stone-200">
            {block.v}
          </p>
          <p className="font-serif text-base text-stone-800 dark:text-stone-200">
            <abbr title="Хариу" className="font-medium text-red-700 dark:text-red-400 no-underline">
              R.{' '}
            </abbr>
            {block.r}
          </p>
        </div>
      )
    case 'psalm-stanza':
      return (
        <div className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200 space-y-0.5 pl-2 border-l-2 border-stone-200 dark:border-stone-700">
          {block.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )
    case 'antiphon-group':
      return (
        <div className="mt-3">
          <p className="font-serif text-sm font-semibold text-red-700/80 dark:text-red-400/80">
            {block.season}
            <PageNum page={block.page} />
          </p>
          <ul className="mt-1 space-y-1 font-serif text-base text-stone-800 dark:text-stone-200">
            {block.items.map((item, i) => (
              <li key={i}>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {item.day}:
                </span>{' '}
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )
  }
}

function SubsectionContent({ sub }: { sub: Subsection }) {
  return (
    <section id={sub.id} className="scroll-mt-8 mt-6">
      <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-3 flex items-baseline">
        {sub.title}
        <PageNum page={sub.page} />
      </h3>
      <div className="space-y-3">
        {sub.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  )
}

function SectionContent({ section }: { section: Section }) {
  return (
    <article id={section.id} className="scroll-mt-8 mb-10">
      <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-baseline">
        {section.title}
        <PageNum page={section.page} />
      </h2>
      {section.subsections.map((sub) => (
        <SubsectionContent key={sub.id} sub={sub} />
      ))}
    </article>
  )
}

export default function OrdinariumPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">
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
          Залбиралт цагийн ёслолын дэг жаяг
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          Өглөөний болон оройн даатгал залбирлын дэг жаяг
        </p>
      </header>

      <TableOfContents />

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

      <Footer />
    </div>
  )
}
