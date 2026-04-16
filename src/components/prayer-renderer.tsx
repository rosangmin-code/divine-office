import type { AssembledHour, HourSection } from '@/lib/types'
import { PsalmBlock } from './psalm-block'
import { PageRef } from './page-ref'
import { InvitatorySection } from './invitatory-section'

function SectionDivider() {
  return (
    <div className="section-divider" role="separator">
      <span className="text-xs text-stone-300 dark:text-stone-600">✝</span>
    </div>
  )
}

export function AntiphonBox({ text, className = 'my-3' }: { text: string; className?: string }) {
  return (
    <div data-role="antiphon" className={`${className} text-sm italic text-amber-800 dark:text-amber-300`}>
      <span className="font-semibold not-italic">Шад. </span>{text}
    </div>
  )
}

function OpeningVersicleSection({ section }: { section: Extract<HourSection, { type: 'openingVersicle' }> }) {
  return (
    <section aria-label="Удиртгал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Удиртгал</p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <span className="text-red-700 dark:text-red-400">- </span>{section.response}
      </p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        {section.gloryBe}{section.alleluia ? ` ${section.alleluia}` : ''}
      </p>
    </section>
  )
}

function HymnSection({ section }: { section: Extract<HourSection, { type: 'hymn' }> }) {
  if (!section.text) {
    return (
      <section aria-label="Магтуу" className="mb-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Магтуу</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      </section>
    )
  }
  return (
    <section aria-label="Магтуу" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Магтуу <PageRef page={section.page} /></p>
      <div className="mt-2 whitespace-pre-line font-serif text-stone-800 dark:text-stone-200">{section.text}</div>
    </section>
  )
}

function PsalmodySection({ section }: { section: Extract<HourSection, { type: 'psalmody' }> }) {
  return (
    <section aria-label="Дууллын залбирал">
      {section.psalms.map((psalm, i) => (
        <PsalmBlock key={i} psalm={psalm} />
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
      {section.antiphon && <AntiphonBox text={section.antiphon} />}

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
      {section.antiphon && <AntiphonBox text={section.antiphon} />}
    </section>
  )
}

function IntercessionsSection({ section }: { section: Extract<HourSection, { type: 'intercessions' }> }) {
  if (section.items.length === 0) {
    return (
      <section aria-label="Гүйлтын залбирал" className="mb-4">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Гүйлтын залбирал</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      </section>
    )
  }
  return (
    <section aria-label="Гүйлтын залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Гүйлтын залбирал <PageRef page={section.page} /></p>
      {section.intro && (
        <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.intro}</p>
      )}
      <ul className="mt-2 space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="font-serif text-stone-800 dark:text-stone-200">— {item}</li>
        ))}
      </ul>
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

function ConcludingPrayerSection({ section }: { section: Extract<HourSection, { type: 'concludingPrayer' }> }) {
  return (
    <section aria-label="Төгсгөлийн даатгал залбирал" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Төгсгөлийн даатгал залбирал <PageRef page={section.page} /></p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function DismissalSection({ section }: { section: Extract<HourSection, { type: 'dismissal' }> }) {
  return (
    <section aria-label="Илгээлт" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Төгсгөл</p>

      {/* Priest form */}
      <div className="mb-3">
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 italic">Санваартан эсвэл тахилч удирдаж байгаа бол:</p>
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
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 italic">Хувийн уншлагын үед:</p>
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

function MarianAntiphonSection({ section }: { section: Extract<HourSection, { type: 'marianAntiphon' }> }) {
  return (
    <section aria-label={section.title} className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{section.title} <PageRef page={section.page} /></p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function PatristicReadingSection({ section }: { section: Extract<HourSection, { type: 'patristicReading' }> }) {
  return (
    <section aria-label="Хоёрдугаар уншлага" className="mb-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Хоёрдугаар уншлага <PageRef page={section.page} /></p>
      <p className="text-xs text-stone-500 dark:text-stone-400">{section.author} — {section.source}</p>
      <div className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        {section.text || <span className="text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</span>}
      </div>
    </section>
  )
}

const MAJOR_SECTIONS = new Set([
  'psalmody', 'shortReading', 'gospelCanticle',
  'intercessions', 'ourFather', 'concludingPrayer', 'patristicReading',
])

export function PrayerRenderer({ hour }: { hour: AssembledHour }) {
  return (
    <div>
      {hour.sections.map((section, i) => {
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
            {section.type === 'patristicReading' && <PatristicReadingSection section={section} />}
            {section.type === 'examen' && <ExamenSection section={section} />}
            {section.type === 'blessing' && <BlessingSection section={section} />}
            {section.type === 'marianAntiphon' && <MarianAntiphonSection section={section} />}
          </div>
        )
      })}
    </div>
  )
}
