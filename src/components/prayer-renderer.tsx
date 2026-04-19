'use client'

import type { AssembledHour, HourSection } from '@/lib/types'
import { useSettings } from '@/lib/settings'
import { PsalmBlock } from './psalm-block'
import { PageRef } from './page-ref'
import { InvitatorySection } from './invitatory-section'
import { OpeningVersicleSection } from './opening-versicle-section'
import { HymnSection } from './hymn-section'
import { MarianAntiphonSection } from './marian-antiphon-section'
import { ConcludingPrayerSection } from './concluding-prayer-section'

function SectionDivider() {
  return (
    <div className="section-divider" role="separator">
      <span className="text-xs text-stone-300 dark:text-stone-600">✝</span>
    </div>
  )
}

export function AntiphonBox({ text, label = 'psalm', number, page, className = 'my-3' }: { text: string; label?: 'psalm' | 'canticle'; number?: number; page?: number; className?: string }) {
  const base = label === 'canticle' ? 'Шад магтаал' : 'Шад дуулал'
  const heading = number ? `${base} ${number}` : base
  return (
    <div data-role="antiphon" className={`${className} text-sm italic text-amber-800 dark:text-amber-300`}>
      <span className="font-semibold not-italic">{heading}: </span>{text}<PageRef page={page} />
    </div>
  )
}

function PsalmodySection({ section }: { section: Extract<HourSection, { type: 'psalmody' }> }) {
  const showNumbers = section.psalms.length > 1
  return (
    <section aria-label="Дууллын залбирал">
      {section.psalms.map((psalm, i) => (
        <PsalmBlock key={i} psalm={psalm} antiphonNumber={showNumbers ? i + 1 : undefined} />
      ))}
    </section>
  )
}

function ShortReadingSection({ section }: { section: Extract<HourSection, { type: 'shortReading' }> }) {
  return (
    <section aria-label="Уншлага" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Уншлага <PageRef page={section.page} /></p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {section.bookMn && `${section.bookMn} — `}{section.ref}
      </p>
      <div className="mt-2 space-y-1">
        {section.verses.map((v, i) => (
          <p key={i} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
            {v.verse > 0 && <sup className="mr-1 text-xs text-stone-500 dark:text-stone-400">{v.verse}</sup>}
            {v.text}
          </p>
        ))}
      </div>
    </section>
  )
}

function ResponsorySection({ section }: { section: Extract<HourSection, { type: 'responsory' }> }) {
  return (
    <section aria-label="Хариу залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Хариу залбирал <PageRef page={section.page} /></p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>{section.response}
      </p>
    </section>
  )
}

function GospelCanticleSection({ section }: { section: Extract<HourSection, { type: 'gospelCanticle' }> }) {
  const canticleNames: Record<string, string> = {
    benedictus: 'Захариагийн магтаал',
    magnificat: 'Мариагийн магтаал',
    nuncDimittis: 'Сайнмэдээний айлдлын магтаал',
  }

  return (
    <section aria-label={canticleNames[section.canticle] ?? section.canticle} className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        {canticleNames[section.canticle] ?? section.canticle} <PageRef page={section.page} />
      </p>

      {/* Antiphon */}
      {section.antiphon && <AntiphonBox text={section.antiphon} label="canticle" page={section.page} />}

      {/* Canticle text */}
      {section.verses && section.verses.length > 0 ? (
        <div className="space-y-1 pl-2">
          {section.verses.map((verse, vi) => (
            <p key={vi} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{verse}</p>
          ))}
          {section.doxology && (
            <p className="mt-2 font-serif text-sm italic text-stone-500 dark:text-stone-400">
              {section.doxology}
            </p>
          )}
        </div>
      ) : section.text ? (
        <div className="space-y-1 pl-2">
          {section.text.split('\n').map((line, li) => (
            <p key={li} className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{line}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      )}

      {/* Antiphon repeat */}
      {section.antiphon && <AntiphonBox text={section.antiphon} label="canticle" page={section.page} />}
    </section>
  )
}

function IntercessionsSection({ section }: { section: Extract<HourSection, { type: 'intercessions' }> }) {
  if (section.items.length === 0) {
    return (
      <section aria-label="Гуйлтын залбирал" className="mb-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Гуйлтын залбирал</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      </section>
    )
  }

  const petitions = section.petitions ?? []
  const structured = petitions.length > 0

  return (
    <section aria-label="Гуйлтын залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Гуйлтын залбирал <PageRef page={section.page} /></p>

      {structured ? (
        <>
          {section.introduction && (
            <p className="mt-3 font-serif text-stone-800 dark:text-stone-200">
              {section.introduction}
            </p>
          )}
          {section.refrain && (
            <p
              data-role="intercessions-refrain"
              className="mt-3 rounded-md bg-amber-50/60 px-3 py-2 font-serif italic text-stone-800 dark:bg-stone-800/50 dark:text-stone-200"
            >
              {section.refrain}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {petitions.map((p, i) => (
              <li key={i} data-role="intercessions-petition" className="font-serif text-stone-800 dark:text-stone-200">
                <div>{p.versicle}</div>
                {p.response && (
                  <div data-role="intercessions-response" className="mt-1">
                    <span className="text-red-700 dark:text-red-400">- </span>
                    {p.response}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {section.closing && (
            <p className="mt-3 font-serif italic text-stone-700 dark:text-stone-300">«{section.closing}»</p>
          )}
        </>
      ) : (
        <>
          {section.intro && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.intro}</p>
          )}
          <ul className="mt-2 space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="font-serif text-stone-800 dark:text-stone-200">— {item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function OurFatherSection() {
  return (
    <section aria-label="Эзэний даатгал залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Эзэний даатгал залбирал</p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        Тэнгэр дэх Эцэг минь ээ, Таны нэр алдар эрхэм дээд байх болтугай.
        Таны хаанчлал орших болтугай.
        Тэнгэр дэх таны дур таалал дэлхийд ч биелэх болтугай.
        Бидэнд өдөр тутмын талхыг өнөөдөр хайрлана уу.
        Бид бусдыг уучилдгийн адил биднийг өршөөнө үү.
        Биднийг сорилтонд оруулалгүй, харин хорон муу бүхнээс гэтэлгэн соёрхоно уу. Амэн.
      </p>
    </section>
  )
}

function DismissalSection({ section }: { section: Extract<HourSection, { type: 'dismissal' }> }) {
  return (
    <section aria-label="Төгсгөл" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Төгсгөл</p>

      {/* Priest form */}
      <div className="mb-3">
        <p className="text-xs text-red-700/80 dark:text-red-400/80 mb-1 italic">Санваартан эсвэл тахилч удирдаж байгаа бол:</p>
        <p className="font-serif text-stone-800 dark:text-stone-200">
          {section.priest.greeting.versicle}
        </p>
        <p className="font-serif text-stone-800 dark:text-stone-200">
          <span className="text-red-700 dark:text-red-400">- </span>{section.priest.greeting.response}
        </p>
        <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.priest.blessing.text}</p>
        <p className="font-serif text-stone-800 dark:text-stone-200">
          <span className="text-red-700 dark:text-red-400">- </span>{section.priest.blessing.response}
        </p>
        <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
          {section.priest.dismissalVersicle.versicle}
        </p>
        <p className="font-serif text-stone-800 dark:text-stone-200">
          <span className="text-red-700 dark:text-red-400">- </span>{section.priest.dismissalVersicle.response}
        </p>
      </div>

      {/* Individual form */}
      <p className="text-xs text-red-700/80 dark:text-red-400/80 mb-1 italic">Хувийн уншлагын үед:</p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        {section.individual.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>{section.individual.response}
      </p>
    </section>
  )
}

function ExamenSection({ section }: { section: Extract<HourSection, { type: 'examen' }> }) {
  return (
    <section aria-label="Ухамсрын цэгнүүр" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Ухамсрын цэгнүүр <PageRef page={section.page} /></p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function BlessingSection({ section }: { section: Extract<HourSection, { type: 'blessing' }> }) {
  return (
    <section aria-label="Адислал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Адислал <PageRef page={section.page} /></p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.text}</p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>{section.response}
      </p>
    </section>
  )
}

const MAJOR_SECTIONS = new Set([
  'psalmody', 'shortReading', 'gospelCanticle',
  'intercessions', 'ourFather', 'concludingPrayer',
])

export function PrayerRenderer({ hour }: { hour: AssembledHour }) {
  const { settings } = useSettings()

  const visibleSections = hour.sections.filter(section => {
    if (
      section.type === 'openingVersicle' &&
      section.pairedWithInvitatory &&
      !settings.invitatoryCollapsed
    ) {
      return false
    }
    return true
  })

  return (
    <div>
      {visibleSections.map((section, i) => {
        const showDivider = i > 0
        const spacing = i === 0 ? '' : MAJOR_SECTIONS.has(section.type) ? 'mt-6' : 'mt-2'

        return (
          <div key={i} className={spacing} style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
            {showDivider && <SectionDivider />}
            {section.type === 'invitatory' && <InvitatorySection section={section} />}
            {section.type === 'openingVersicle' && <OpeningVersicleSection section={section} />}
            {section.type === 'hymn' && <HymnSection section={section} />}
            {section.type === 'psalmody' && <PsalmodySection section={section} />}
            {section.type === 'shortReading' && <ShortReadingSection section={section} />}
            {section.type === 'responsory' && <ResponsorySection section={section} />}
            {section.type === 'gospelCanticle' && <GospelCanticleSection section={section} />}
            {section.type === 'intercessions' && <IntercessionsSection section={section} />}
            {section.type === 'ourFather' && <OurFatherSection />}
            {section.type === 'concludingPrayer' && <ConcludingPrayerSection section={section} />}
            {section.type === 'dismissal' && <DismissalSection section={section} />}
            {section.type === 'examen' && <ExamenSection section={section} />}
            {section.type === 'blessing' && <BlessingSection section={section} />}
            {section.type === 'marianAntiphon' && <MarianAntiphonSection section={section} />}
          </div>
        )
      })}
    </div>
  )
}
