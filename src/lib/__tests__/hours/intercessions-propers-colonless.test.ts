import { describe, it, expect } from 'vitest'
import { parseIntercessions } from '../../hours/intercessions'
import advent from '../../../data/loth/propers/advent.json'
import christmas from '../../../data/loth/propers/christmas.json'
import easter from '../../../data/loth/propers/easter.json'
import lent from '../../../data/loth/propers/lent.json'

// GOAL #31 / WI #41 ([#31-sub-2]-sub-1) — colonless PROPERS intercessions.
//
// Follow-up to WI #33 (colonless psalter). The seven propers blocks below are
// source-faithful to the Mongolian book PDF (parsed_data/full_pdf.txt) which
// carries NO ":" after the introduction. Unlike the psalter shape (refrain on
// its own array element), the PDF→JSON extraction MERGED the intro + refrain
// into the first array element and converted the SoT line-start "- " response
// markers to " — " (em-dash). Before this WI these blocks routed to neither
// colonless handler (em-dash was unrouted) and fell to petitions:[] → the
// render layer (intercessions-section.tsx) dropped the structured path.
//
// SoT discipline: the ":" is genuinely absent and the refrain IS a distinct
// paragraph in the book (e.g. advent W1 MON vespers — full_pdf.txt:19314-19316
// prints "Эзэн минь ирэгтүн! Биднийг аврагтун!" on its own line). The fix is in
// the parser (split the merged element at the cohortative invitation boundary),
// NOT a ":" inserted into the data (MT/날조 금지).

type IntercessionsHost = {
  weeks: Record<
    string,
    Record<string, Record<string, { intercessions: string[] }>>
  >
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

interface Case {
  label: string
  host: IntercessionsHost
  week: string
  day: string
  hour: string
  sot: string // full_pdf.txt anchor
  refrain: string
  petitionCount: number
  firstVersicleStartsWith: string
  firstResponseContains: string
}

const CASES: Case[] = [
  {
    label: 'advent W1 MON vespers',
    host: advent as unknown as IntercessionsHost,
    week: '1', day: 'MON', hour: 'vespers',
    sot: 'full_pdf.txt:19314-19340',
    refrain: 'Эзэн минь ирэгтүн! Биднийг аврагтун!',
    petitionCount: 6,
    firstVersicleStartsWith: 'Бүхний Аврагч, бидний Тэнгэрбурхан',
    firstResponseContains: 'Хурдан ирэгтүн',
  },
  {
    label: 'advent W1 FRI lauds (doxological intro — no cohortative)',
    host: advent as unknown as IntercessionsHost,
    week: '1', day: 'FRI', hour: 'lauds',
    sot: 'full_pdf.txt (advent FRI lauds)',
    refrain: 'Эзэн, Таны нэр алдар алдарших болтугай.',
    petitionCount: 4,
    firstVersicleStartsWith: 'Тэнгэрбурханы сүр жавхлангийн төлөө',
    firstResponseContains: 'бие биеэ хайрлахыг',
  },
  {
    label: 'advent W1 FRI vespers',
    host: advent as unknown as IntercessionsHost,
    week: '1', day: 'FRI', hour: 'vespers',
    sot: 'full_pdf.txt:19937-19951',
    refrain: 'Эзэн, биднийг өршөөгөөрэй.',
    petitionCount: 5,
    firstVersicleStartsWith: 'Тэнгэрбурханы хонин сүргийн Сайн хоньчин',
    firstResponseContains: 'Шашныхаа дотор цуглуулна',
  },
  {
    label: 'christmas epiphany SUN lauds',
    host: christmas as unknown as IntercessionsHost,
    week: 'epiphany', day: 'SUN', hour: 'lauds',
    sot: 'full_pdf.txt (christmas epiphany SUN lauds)',
    refrain: 'Өөрийн мэндлэлтээрээ Та биднийг хорон муу бүхнээс гэтэлгэнэ үү.',
    petitionCount: 4,
    firstVersicleStartsWith: 'Эзэн, Та бүх цаг үеэс өмнө оршин байсан',
    firstResponseContains: 'үргэлжлүүлэн шинэчилж',
  },
  {
    label: 'easter W1 TUE vespers (two-sentence refrain)',
    host: easter as unknown as IntercessionsHost,
    week: '1', day: 'TUE', hour: 'vespers',
    sot: 'full_pdf.txt (easter W1 TUE vespers)',
    refrain: 'Эзэн Есүс минь, Та үүрд мөнх амьд билээ. Бидний залбирлыг сонсоно уу.',
    petitionCount: 5,
    firstVersicleStartsWith: 'Эзэн Есүс минь, Таны хажуу хавирганаас',
    firstResponseContains: 'хир толбогүй сүйт бүсгүйгээ',
  },
  {
    label: 'easter W1 THU vespers',
    host: easter as unknown as IntercessionsHost,
    week: '1', day: 'THU', hour: 'vespers',
    sot: 'full_pdf.txt (easter W1 THU vespers)',
    refrain: 'Сүр жавхлангийн Хаан, Та бидний залбирлыг сонсоно уу.',
    petitionCount: 5,
    firstVersicleStartsWith: 'Эзэн Есүс, Та амилалтаараа дамжуулан',
    firstResponseContains: 'Эцэгийнхээ сүр жавхлан',
  },
  {
    label: 'lent W6 SAT lauds (doxological intro — no cohortative)',
    host: lent as unknown as IntercessionsHost,
    week: '6', day: 'SAT', hour: 'lauds',
    sot: 'full_pdf.txt:23643-23655',
    refrain: 'Эзэн, биднийг өршөөнө үү.',
    petitionCount: 5,
    firstVersicleStartsWith: 'Христ бидний Аврагч, Таны Эх',
    firstResponseContains: 'Таны зовлонг хуваалцах',
  },
]

describe('parseIntercessions — colonless propers fallback (GOAL #31 / WI #41)', () => {
  for (const c of CASES) {
    describe(`${c.label} (${c.sot})`, () => {
      const raw = c.host.weeks[c.week][c.day][c.hour].intercessions
      const parsed = parseIntercessions(raw)

      it('no longer falls to a flat fallback (petitions non-empty)', () => {
        expect(parsed.petitions.length).toBeGreaterThan(0)
      })

      it('extracts the exact refrain (SoT paragraph boundary)', () => {
        expect(parsed.refrain).toBe(c.refrain)
      })

      it('splits intro + refrain losslessly from the merged first element', () => {
        // intro is non-empty and does NOT swallow the refrain ...
        expect(parsed.introduction).toBeTruthy()
        expect(parsed.introduction).not.toContain(c.refrain)
        // ... and intro + refrain recombine to the original first element
        // (no Mongolian text added or dropped — MT-free split).
        expect(`${parsed.introduction} ${parsed.refrain}`).toBe(norm(raw[0]))
      })

      it(`parses ${c.petitionCount} petitions with versicle/response`, () => {
        expect(parsed.petitions).toHaveLength(c.petitionCount)
        expect(parsed.petitions[0].versicle).toContain(c.firstVersicleStartsWith)
        expect(parsed.petitions[0].response).toContain(c.firstResponseContains)
        for (const p of parsed.petitions) {
          expect(p.response).toBeTruthy()
        }
      })
    })
  }
})
