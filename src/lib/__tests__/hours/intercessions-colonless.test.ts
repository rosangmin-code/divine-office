import { describe, it, expect } from 'vitest'
import { parseIntercessions } from '../../hours/intercessions'
import week1 from '../../../data/loth/psalter/week-1.json'
import week3 from '../../../data/loth/psalter/week-3.json'
import week4 from '../../../data/loth/psalter/week-4.json'

// GOAL #31 / WI #33 (#31-sub-2) — colonless psalter intercessions regression.
//
// RCA (scratch/dvo/mm-goal31-wed-intercessions.md): parseIntercessions ended
// the introduction on the first ":" (lib/hours/intercessions.ts:63-104). The
// four blocks below are source-faithful to the Mongolian book PDF
// (parsed_data/full_pdf.txt) which carries NO ":" after the introduction, so
// the parser consumed EVERY line into the introduction and returned
// petitions:[]. The render layer (intercessions-section.tsx:80-147) then drops
// the structured path (petitions.length>0) and falls back to a flat bullet
// list — the user-visible bug.
//
// SoT discipline: the ":" is genuinely absent from the book, so the fix is in
// the parser (colonless fallback), NOT a ":" inserted into the data (MT/날조
// 금지). Every assertion below is anchored to a full_pdf.txt line range.
//
// MM Test Scenario Map rows reproduced exactly (intro excludes refrain; refrain
// is the standalone response sentence; restored page-boundary petitions parse
// as petition responses).

type IntercessionsHost = {
  days: Record<
    string,
    Record<string, { intercessions: string[] }>
  >
}

describe('parseIntercessions — colonless psalter fallback (GOAL #31 / WI #33)', () => {
  describe('W1 WED Vespers (week-1.json:624-643 / full_pdf.txt:4029-4059)', () => {
    const raw = (week1 as unknown as IntercessionsHost).days.WED.vespers
      .intercessions
    const parsed = parseIntercessions(raw)

    it('no longer returns an empty petitions array (RED → GREEN)', () => {
      expect(parsed.petitions.length).toBeGreaterThan(0)
    })

    it('separates the colonless introduction without absorbing the refrain', () => {
      // full_pdf.txt:4029-4033 — intro ends "Түүнд хүрэх болтугай." (no colon).
      expect(parsed.introduction).toBe(
        'Бидний үйлдэх гэж буй бүх зүйлээр Эзэний нэр алдар магтагдах болтугай. ' +
          'Учир нь Тэр Өөрийнхөө сонгосон хүмүүсээ хязгааргүй хайраар хүрээлдэг. ' +
          'Бидний даатгал залбирал Түүнд хүрэх болтугай.',
      )
      expect(parsed.introduction).not.toContain('хайраа харуулна')
      expect(parsed.introduction?.endsWith(':')).toBe(false)
    })

    it('extracts the standalone refrain (full_pdf.txt:4034)', () => {
      expect(parsed.refrain).toBe('Эзэн, бидэнд Өөрийн хайраа харуулна уу.')
    })

    it('parses all 5 petitions including the page-boundary restored one', () => {
      // full_pdf.txt:4035-4047 + page break + 4055-4059 = 5 petitions.
      expect(parsed.petitions).toHaveLength(5)
      expect(parsed.petitions[0]).toEqual({
        versicle: 'Эзэн, Өөрийн Католик шашныг санана уу.',
        response:
          'Түүнийг хамаг хорон муугаас сахин хамгаалж, ' +
          'Өөрийн төгс хайрын зүг өсгөн хөгжүүлнэ үү.',
      })
      // Page-boundary petition (full_pdf.txt:4046-4047 versicle, 4055 response).
      expect(parsed.petitions[3]).toEqual({
        versicle:
          'Өдөр тутмын зовлон бэрхшээл, дарамт шахалттай ' +
          'ажилладаг хүмүүсийг Та тайтгаруулна уу.',
        response: 'Ажилчдын эрхэм чанарыг хадгална уу.',
      })
      // Final petition (full_pdf.txt:4056-4059).
      expect(parsed.petitions[4].versicle).toContain('Өнөөдөр талийгаач хүмүүст')
      expect(parsed.petitions[4].response).toContain('хаанчлалдаа хүлээн авна уу')
      for (const p of parsed.petitions) {
        expect(p.response).toBeTruthy()
      }
    })
  })

  describe('W3 SUN Lauds (week-3.json:76-95 / full_pdf.txt:10337-10357)', () => {
    const raw = (week3 as unknown as IntercessionsHost).days.SUN.lauds
      .intercessions
    const parsed = parseIntercessions(raw)

    it('separates intro / refrain across the wrapped petition-1 versicle', () => {
      // full_pdf.txt:10337-10339 intro, 10340 refrain, 10341-10342 versicle.
      expect(parsed.introduction).toBe(
        'Эцэг минь, Та хүн төрөлхтний зүрхийг гэгээрүүлэхийн тулд ' +
          'Өөрийн Ариун Сүнсээ илгээсэн билээ. Бидний залбирлыг сонсоно уу.',
      )
      expect(parsed.introduction).not.toContain('гэгээрүүлнэ үү')
      expect(parsed.refrain).toBe(
        'Эзэн минь, Та Өөрийн хүмүүсээ гэгээрүүлнэ үү.',
      )
    })

    it('parses the wrapped petition-1 versicle and its response', () => {
      // Versicle wraps full_pdf.txt:10341-10342, response 10343-10344.
      expect(parsed.petitions.length).toBeGreaterThanOrEqual(3)
      expect(parsed.petitions[0].versicle).toBe(
        'Бидний гэрэл болсон Тэнгэрбурхан Та ерөөлтэй еэ!',
      )
      expect(parsed.petitions[0].response).toContain(
        'цог жавхлангаар бялхаасан',
      )
      // The closing Lord's-Prayer incipit must not become a petition.
      expect(parsed.closing).toContain('Тэнгэр дэх Эцэг')
    })
  })

  describe('W4 SUN Lauds (week-4.json:75-100 / full_pdf.txt:14253-14280)', () => {
    const raw = (week4 as unknown as IntercessionsHost).days.SUN.lauds
      .intercessions
    const parsed = parseIntercessions(raw)

    it('keeps the refrain distinct from a multi-sentence petition-1 versicle', () => {
      // full_pdf.txt:14253-14256 intro, 14257 refrain, 14258-14266 versicle
      // (the versicle carries an INTERNAL sentence end "...байна." at 14259 and
      // a "Учир нь" continuation at 14260 — both belong to one petition).
      expect(parsed.introduction).toBe(
        'Хүч чадал, сайн сайхны Тэнгэрбурханыг сайшаахын тулд ' +
          'зүрх сэтгэлээ нээцгээ. Учир нь Тэр биднийг хайрладаг ' +
          'бөгөөд бидний хэрэгцээг мэддэг.',
      )
      expect(parsed.introduction).not.toContain('магтаж, Танд найдаж')
      expect(parsed.refrain).toBe('Эзэн бид Таныг магтаж, Танд найдаж байна.')
    })

    it('binds the "Учир нь" continuation into petition-1 versicle', () => {
      expect(parsed.petitions).toHaveLength(4)
      expect(parsed.petitions[0].versicle).toContain(
        'Төгс хүчит Тэнгэрбурхан, ертөнцийн Хаан Таныг бид алдаршуулж байна.',
      )
      expect(parsed.petitions[0].versicle).toContain(
        'Учир нь биднийг нүгэлтнүүд байхад',
      )
      expect(parsed.petitions[0].response).toContain('дуудсан билээ')
    })
  })

  describe('W4 MON Vespers (week-4.json:327-347 / full_pdf.txt:15151-15181)', () => {
    const raw = (week4 as unknown as IntercessionsHost).days.MON.vespers
      .intercessions
    const parsed = parseIntercessions(raw)

    it('extracts a two-element wrapped refrain after a two-sentence intro', () => {
      // full_pdf.txt:15151-15152 intro (2 sentences), 15153-15154 wrapped
      // refrain, 15155-15156 petition-1 versicle.
      expect(parsed.introduction).toBe(
        'Есүс Түүнд найддаг хүмүүсийг орхихгүй. ' +
          'Тиймээс эгэл даруухнаар Түүнээс ийн гуйцгаая.',
      )
      expect(parsed.refrain).toBe(
        'Эзэн минь, Тэнгэрбурхан минь, Та биднийг сонсоно уу.',
      )
      expect(parsed.introduction).not.toContain('сонсоно уу')
    })

    it('parses all 5 petitions including the page-boundary restored one', () => {
      // full_pdf.txt:15155-15170 + page break + 15178-15181 = 5 petitions.
      expect(parsed.petitions).toHaveLength(5)
      expect(parsed.petitions[0].versicle).toContain(
        'Бидний гэрэл болсон Христ минь',
      )
      expect(parsed.petitions[0].response).toContain(
        'манай Шашин үндэстнүүдийн төлөө',
      )
      // Page-boundary petition (full_pdf.txt:15178-15181).
      expect(parsed.petitions[4].versicle).toContain(
        'бүх талийгаачдын гэм нүглийг',
      )
      expect(parsed.petitions[4].response).toContain(
        'гэгээнтнүүдийн хамтаар',
      )
      expect(parsed.closing).toContain('Тэнгэр дэх Эцэг')
    })
  })
})
