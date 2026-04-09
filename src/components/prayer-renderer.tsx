import type { AssembledHour, HourSection } from '@/lib/types'
import { PsalmBlock } from './psalm-block'

function SectionDivider() {
  return <hr className="my-6 border-stone-200" />
}

function InvitatorySection({ section }: { section: Extract<HourSection, { type: 'invitatory' }> }) {
  return (
    <div className="mb-4 rounded-lg bg-stone-100 p-4">
      <p className="text-sm font-semibold text-stone-600">Нээлтийн залбирал</p>
      <p className="mt-2 text-stone-800">
        <span className="font-medium text-red-700">V. </span>{section.versicle}
      </p>
      <p className="text-stone-800">
        <span className="font-medium text-red-700">R. </span>{section.response}
      </p>
    </div>
  )
}

function HymnSection({ section }: { section: Extract<HourSection, { type: 'hymn' }> }) {
  if (!section.text) {
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-stone-600">Магтаал дуу</p>
        <p className="mt-1 text-sm italic text-stone-400">[Орчуулга хийгдэж байна]</p>
      </div>
    )
  }
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Магтаал дуу</p>
      <div className="mt-2 whitespace-pre-line text-stone-800">{section.text}</div>
    </div>
  )
}

function PsalmodySection({ section }: { section: Extract<HourSection, { type: 'psalmody' }> }) {
  return (
    <div>
      {section.psalms.map((psalm, i) => (
        <PsalmBlock key={i} psalm={psalm} />
      ))}
    </div>
  )
}

function ShortReadingSection({ section }: { section: Extract<HourSection, { type: 'shortReading' }> }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Богино уншлага</p>
      <p className="mt-1 text-xs text-stone-400">
        {section.bookMn && `${section.bookMn} — `}{section.ref}
      </p>
      <div className="mt-2 space-y-1">
        {section.verses.map((v, i) => (
          <p key={i} className="text-base leading-relaxed text-stone-800">
            {v.verse > 0 && <sup className="mr-1 text-xs text-stone-400">{v.verse}</sup>}
            {v.text}
          </p>
        ))}
      </div>
    </div>
  )
}

function ResponsorySection({ section }: { section: Extract<HourSection, { type: 'responsory' }> }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Хариу дуулал</p>
      <p className="mt-2 text-stone-800">
        <span className="font-medium text-red-700">V. </span>{section.versicle}
      </p>
      <p className="text-stone-800">
        <span className="font-medium text-red-700">R. </span>{section.response}
      </p>
    </div>
  )
}

function GospelCanticleSection({ section }: { section: Extract<HourSection, { type: 'gospelCanticle' }> }) {
  const canticleNames: Record<string, string> = {
    benedictus: 'Захариагийн магтаал дуу (Benedictus)',
    magnificat: 'Мариагийн магтаал дуу (Magnificat)',
    nuncDimittis: 'Симеоны магтаал дуу (Nunc Dimittis)',
  }

  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">
        {canticleNames[section.canticle] ?? section.canticle}
      </p>

      {/* Antiphon */}
      {section.antiphon && (
        <div className="my-2 rounded-lg bg-amber-50 px-4 py-2 text-sm italic text-amber-900">
          <span className="font-semibold">Ant. </span>{section.antiphon}
        </div>
      )}

      {/* Canticle text */}
      {section.text ? (
        <div className="space-y-1 pl-2">
          <p className="text-base leading-relaxed text-stone-800">{section.text}</p>
        </div>
      ) : (
        <p className="text-sm italic text-stone-400">[Орчуулга хийгдэж байна]</p>
      )}

      {/* Antiphon repeat */}
      {section.antiphon && (
        <div className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-sm italic text-amber-900">
          <span className="font-semibold">Ant. </span>{section.antiphon}
        </div>
      )}
    </div>
  )
}

function IntercessionsSection({ section }: { section: Extract<HourSection, { type: 'intercessions' }> }) {
  if (section.items.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-stone-600">Залбирлын дуудлага</p>
        <p className="mt-1 text-sm italic text-stone-400">[Орчуулга хийгдэж байна]</p>
      </div>
    )
  }
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Залбирлын дуудлага</p>
      {section.intro && (
        <p className="mt-2 text-stone-800">{section.intro}</p>
      )}
      <ul className="mt-2 space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="text-stone-800">— {item}</li>
        ))}
      </ul>
    </div>
  )
}

function OurFatherSection() {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Эзэний залбирал</p>
      <p className="mt-2 text-base leading-relaxed text-stone-800">
        Тэнгэр дэх Эцэг маань, Таны нэр ариун байх болтугай. Таны хаанчлал ирэх болтугай.
        Таны хүсэл тэнгэрт шиг газар дээр биелэх болтугай. Өнөөдрийн өдөр тутмын талхаа
        бидэнд өгөөч. Бидний гэм нүглийг уучлаач, бид ч бас бидэнд гэм хийсэн хүмүүсийг
        уучилна. Биднийг уруу татлагад бүү оруулаач. Харин бузар муугаас биднийг
        ангижруулаач. Амэн.
      </p>
    </div>
  )
}

function ConcludingPrayerSection({ section }: { section: Extract<HourSection, { type: 'concludingPrayer' }> }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Төгсгөлийн залбирал</p>
      <p className="mt-2 text-base leading-relaxed text-stone-800">{section.text}</p>
    </div>
  )
}

function DismissalSection() {
  return (
    <div className="mb-4 rounded-lg bg-stone-100 p-4">
      <p className="text-stone-800">
        <span className="font-medium text-red-700">V. </span>
        Эзэн биднийг адислаж, бүх бузар муугаас хамгаалж, мөнх амьдрал руу хөтлөх болтугай.
      </p>
      <p className="text-stone-800">
        <span className="font-medium text-red-700">R. </span>Амэн.
      </p>
    </div>
  )
}

function ExamenSection({ section }: { section: Extract<HourSection, { type: 'examen' }> }) {
  return (
    <div className="mb-4 rounded-lg bg-violet-50 p-4">
      <p className="text-sm font-semibold text-stone-600">Ухамсрын цэгнүүр</p>
      <p className="mt-2 text-base leading-relaxed text-stone-800">{section.text}</p>
    </div>
  )
}

function BlessingSection({ section }: { section: Extract<HourSection, { type: 'blessing' }> }) {
  return (
    <div className="mb-4 rounded-lg bg-stone-100 p-4">
      <p className="text-sm font-semibold text-stone-600">Адислал</p>
      <p className="mt-2 text-stone-800">{section.text}</p>
      <p className="text-stone-800">
        <span className="font-medium text-red-700">R. </span>{section.response}
      </p>
    </div>
  )
}

function MarianAntiphonSection({ section }: { section: Extract<HourSection, { type: 'marianAntiphon' }> }) {
  return (
    <div className="mb-4 rounded-lg bg-blue-50 p-4">
      <p className="text-sm font-semibold text-stone-600">{section.title}</p>
      <p className="mt-2 text-base leading-relaxed text-stone-800">{section.text}</p>
    </div>
  )
}

function PatristicReadingSection({ section }: { section: Extract<HourSection, { type: 'patristicReading' }> }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-stone-600">Хоёрдугаар уншлага</p>
      <p className="text-xs text-stone-400">{section.author} — {section.source}</p>
      <div className="mt-2 text-base leading-relaxed text-stone-800">
        {section.text || <span className="italic text-stone-400">[Орчуулга хийгдэж байна]</span>}
      </div>
    </div>
  )
}

export function PrayerRenderer({ hour }: { hour: AssembledHour }) {
  return (
    <div className="space-y-2">
      {hour.sections.map((section, i) => {
        const showDivider = i > 0

        return (
          <div key={i}>
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
