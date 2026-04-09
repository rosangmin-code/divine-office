import type { AssembledHour, HourSection } from '@/lib/types'
import { PsalmBlock } from './psalm-block'

function SectionDivider() {
  return (
    <div className="section-divider" role="separator">
      <span className="text-xs text-stone-300 dark:text-stone-600">✝</span>
    </div>
  )
}

function InvitatorySection({ section }: { section: Extract<HourSection, { type: 'invitatory' }> }) {
  return (
    <section aria-label="Нээлтийн залбирал" className="mb-4 rounded-lg bg-stone-100 dark:bg-stone-800 p-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Нээлтийн залбирал</p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Versicle" className="font-medium text-red-700 dark:text-red-400 no-underline">V. </abbr>{section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Response" className="font-medium text-red-700 dark:text-red-400 no-underline">R. </abbr>{section.response}
      </p>
    </section>
  )
}

function HymnSection({ section }: { section: Extract<HourSection, { type: 'hymn' }> }) {
  if (!section.text) {
    return (
      <section aria-label="Магтаал дуу" className="mb-4">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Магтаал дуу</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      </section>
    )
  }
  return (
    <section aria-label="Магтаал дуу" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Магтаал дуу</p>
      <div className="mt-2 whitespace-pre-line font-serif text-stone-800 dark:text-stone-200">{section.text}</div>
    </section>
  )
}

function PsalmodySection({ section }: { section: Extract<HourSection, { type: 'psalmody' }> }) {
  return (
    <section aria-label="Дуулал">
      {section.psalms.map((psalm, i) => (
        <PsalmBlock key={i} psalm={psalm} />
      ))}
    </section>
  )
}

function ShortReadingSection({ section }: { section: Extract<HourSection, { type: 'shortReading' }> }) {
  return (
    <section aria-label="Богино уншлага" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Богино уншлага</p>
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
    <section aria-label="Хариу дуулал" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Хариу дуулал</p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Versicle" className="font-medium text-red-700 dark:text-red-400 no-underline">V. </abbr>{section.versicle}
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Response" className="font-medium text-red-700 dark:text-red-400 no-underline">R. </abbr>{section.response}
      </p>
    </section>
  )
}

function GospelCanticleSection({ section }: { section: Extract<HourSection, { type: 'gospelCanticle' }> }) {
  const canticleNames: Record<string, string> = {
    benedictus: 'Захариагийн магтаал дуу (Benedictus)',
    magnificat: 'Мариагийн магтаал дуу (Magnificat)',
    nuncDimittis: 'Симеоны магтаал дуу (Nunc Dimittis)',
  }

  return (
    <section aria-label={canticleNames[section.canticle] ?? section.canticle} className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
        {canticleNames[section.canticle] ?? section.canticle}
      </p>

      {/* Antiphon */}
      {section.antiphon && (
        <div className="my-2 rounded-lg bg-amber-50 dark:bg-amber-950 px-4 py-2 text-sm italic text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Ant. </span>{section.antiphon}
        </div>
      )}

      {/* Canticle text */}
      {section.text ? (
        <div className="space-y-1 pl-2">
          <p className="font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
        </div>
      ) : (
        <p className="text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      )}

      {/* Antiphon repeat */}
      {section.antiphon && (
        <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950 px-4 py-2 text-sm italic text-amber-900 dark:text-amber-200">
          <span className="font-semibold">Ant. </span>{section.antiphon}
        </div>
      )}
    </section>
  )
}

function IntercessionsSection({ section }: { section: Extract<HourSection, { type: 'intercessions' }> }) {
  if (section.items.length === 0) {
    return (
      <section aria-label="Залбирлын дуудлага" className="mb-4">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Залбирлын дуудлага</p>
        <p className="mt-1 text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</p>
      </section>
    )
  }
  return (
    <section aria-label="Залбирлын дуудлага" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Залбирлын дуудлага</p>
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
    <section aria-label="Эзэний залбирал" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Эзэний залбирал</p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        Тэнгэр дэх Эцэг маань, Таны нэр ариун байх болтугай. Таны хаанчлал ирэх болтугай.
        Таны хүсэл тэнгэрт шиг газар дээр биелэх болтугай. Өнөөдрийн өдөр тутмын талхаа
        бидэнд өгөөч. Бидний гэм нүглийг уучлаач, бид ч бас бидэнд гэм хийсэн хүмүүсийг
        уучилна. Биднийг уруу татлагад бүү оруулаач. Харин бузар муугаас биднийг
        ангижруулаач. Амэн.
      </p>
    </section>
  )
}

function ConcludingPrayerSection({ section }: { section: Extract<HourSection, { type: 'concludingPrayer' }> }) {
  return (
    <section aria-label="Төгсгөлийн залбирал" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Төгсгөлийн залбирал</p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function DismissalSection() {
  return (
    <section aria-label="Илгээлт" className="mb-4 rounded-lg bg-stone-100 dark:bg-stone-800 p-4">
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Versicle" className="font-medium text-red-700 dark:text-red-400 no-underline">V. </abbr>
        Эзэн биднийг адислаж, бүх бузар муугаас хамгаалж, мөнх амьдрал руу хөтлөх болтугай.
      </p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Response" className="font-medium text-red-700 dark:text-red-400 no-underline">R. </abbr>Амэн.
      </p>
    </section>
  )
}

function ExamenSection({ section }: { section: Extract<HourSection, { type: 'examen' }> }) {
  return (
    <section aria-label="Ухамсрын цэгнүүр" className="mb-4 rounded-lg bg-violet-50 dark:bg-violet-950 p-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Ухамсрын цэгнүүр</p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function BlessingSection({ section }: { section: Extract<HourSection, { type: 'blessing' }> }) {
  return (
    <section aria-label="Адислал" className="mb-4 rounded-lg bg-stone-100 dark:bg-stone-800 p-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Адислал</p>
      <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{section.text}</p>
      <p className="font-serif text-stone-800 dark:text-stone-200">
        <abbr title="Response" className="font-medium text-red-700 dark:text-red-400 no-underline">R. </abbr>{section.response}
      </p>
    </section>
  )
}

function MarianAntiphonSection({ section }: { section: Extract<HourSection, { type: 'marianAntiphon' }> }) {
  return (
    <section aria-label={section.title} className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">{section.title}</p>
      <p className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">{section.text}</p>
    </section>
  )
}

function PatristicReadingSection({ section }: { section: Extract<HourSection, { type: 'patristicReading' }> }) {
  return (
    <section aria-label="Хоёрдугаар уншлага" className="mb-4">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Хоёрдугаар уншлага</p>
      <p className="text-xs text-stone-500 dark:text-stone-400">{section.author} — {section.source}</p>
      <div className="mt-2 font-serif text-base leading-relaxed text-stone-800 dark:text-stone-200">
        {section.text || <span className="text-sm italic text-stone-500 dark:text-stone-400" role="note">[Орчуулга хийгдэж байна]</span>}
      </div>
    </section>
  )
}

export function PrayerRenderer({ hour }: { hour: AssembledHour }) {
  return (
    <div className="space-y-2">
      {hour.sections.map((section, i) => {
        const showDivider = i > 0

        return (
          <div key={i} style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
            {showDivider && <SectionDivider />}
            {section.type === 'invitatory' && <InvitatorySection section={section} />}
            {section.type === 'hymn' && <HymnSection section={section} />}
            {section.type === 'psalmody' && <PsalmodySection section={section} />}
            {section.type === 'shortReading' && <ShortReadingSection section={section} />}
            {section.type === 'responsory' && <ResponsorySection section={section} />}
            {section.type === 'gospelCanticle' && <GospelCanticleSection section={section} />}
            {section.type === 'intercessions' && <IntercessionsSection section={section} />}
            {section.type === 'ourFather' && <OurFatherSection />}
            {section.type === 'concludingPrayer' && <ConcludingPrayerSection section={section} />}
            {section.type === 'dismissal' && <DismissalSection />}
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
