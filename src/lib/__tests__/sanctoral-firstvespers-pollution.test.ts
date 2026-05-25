import { describe, it, expect } from 'vitest'
import feasts from '@/data/loth/sanctoral/feasts.json'
import solemnities from '@/data/loth/sanctoral/solemnities.json'

// @fr FR-156
// Data-integrity regression guard for the sanctoral First Vespers
// parsing-pollution cleanup (GOAL #24 / WI-25, source audit #23).
//
// Twelve fixed-date `firstVespers.{concludingPrayer|alternativeConcludingPrayer}`
// fields in feasts.json / solemnities.json had OCR "runaway" pollution: the
// correct Evening-Prayer-I collect was concatenated with the full Second
// Vespers (EP-II) bleed and the next feast's ALL-CAPS header. The worst case
// (12-08 Immaculate Conception) was a 92,803-char blob. Three solemnities
// (06-24 / 06-29 / 08-15) additionally absorbed the Invitatory + Lauds
// Benedictus antiphon + Lauds collect before the EP-II marker.
//
// The fix truncates each field to the genuine EP-I collect and strips the
// spurious PDF section-header splice "Гэгээнтнүүдийн Онцлог шинж". This test
// asserts the pollution can never silently return. The bled EP-II/Lauds
// content is verified lossless elsewhere (preserved in the entry's own
// vespers2 / lauds siblings); here we guard only that firstVespers is clean.

const EP_II_MARKER = '2 дугаар Оройн даатгал залбирал' // Second Vespers bleed
const PAGE_HEADER_SPLICE = 'Гэгээнтнүүдийн Онцлог шинж' // Sanctoral section running-header
const BENEDICTUS_BLEED = 'Захариагийн магтаал' // Lauds gospel-canticle label (Pattern B)
const INVITATORY_BLEED = 'Урих дуудлага' // Invitatory header (Pattern B)

type SanctoralEntry = {
  firstVespers?: {
    concludingPrayer?: string
    alternativeConcludingPrayer?: string
  }
}

// [file label, entry, dateKey, field, expected EP-I collect head fragment]
const CASES: Array<[string, SanctoralEntry, string, 'concludingPrayer' | 'alternativeConcludingPrayer', string]> = [
  ['feasts', (feasts as Record<string, SanctoralEntry>)['02-02'], '02-02', 'concludingPrayer', 'Аяа, төгс хүчит Эцэг минь'],
  ['feasts', (feasts as Record<string, SanctoralEntry>)['08-06'], '08-06', 'concludingPrayer', 'Аяа, Тэнгэрбурхан Эцэг минь, Та амин ганц Хүүгийнхээ жавхлант'],
  ['feasts', (feasts as Record<string, SanctoralEntry>)['09-14'], '09-14', 'concludingPrayer', 'хүн төрөлхтний авралын төлөө Амин ганц Хүүгээ загалмайн'],
  ['feasts', (feasts as Record<string, SanctoralEntry>)['11-09'], '11-09', 'concludingPrayer', 'эрх сүрийнхээ мөнхийн өргөөг бэлтгэхээр амьд суурь чулууг'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['03-19'], '03-19', 'concludingPrayer', 'Та бидний Аврагчийг Гэгээн Иосефийн халамжид даатгасан'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['03-25'], '03-25', 'concludingPrayer', 'Таны Үг бие махбод болж, Цэвэр Охин Мариагаас мэндэлсэн'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['06-24'], '06-24', 'concludingPrayer', 'Өөрийн ард түмнийг авралын замаар замнахад тусална уу'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['06-29'], '06-29', 'concludingPrayer', 'Гэгээн Петр, Паулын залбирлаар дамжуулан Та биднийг зоригжуулна'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['08-15'], '08-15', 'concludingPrayer', 'Та Өөрийн Хүүгийн эх байх дархан эрхийг цэвэр ариун'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['11-01'], '11-01', 'concludingPrayer', 'бид бүх цаг үе болон газар газрын гэгээн'],
  ['solemnities', (solemnities as Record<string, SanctoralEntry>)['12-08'], '12-08', 'concludingPrayer', 'Язгуурын гэм нүгэлгүй бүрэлдсэн Цэвэр охин Мариагаар'],
]

describe('sanctoral First Vespers parsing-pollution cleanup (FR-156 / GOAL #24)', () => {
  describe.each(CASES)('%s %s firstVespers.%s', (_file, entry, dateKey, field, headFragment) => {
    const value = entry.firstVespers?.[field] ?? ''

    it('field exists and is a bounded EP-I collect (not a runaway blob)', () => {
      expect(value.length).toBeGreaterThan(0)
      // A genuine collect is short; the worst pre-fix blob was 92,803 chars.
      expect(value.length).toBeLessThan(1500)
    })

    it('contains no EP-II Second-Vespers bleed', () => {
      expect(value).not.toContain(EP_II_MARKER)
    })

    it('contains no PDF section-header splice', () => {
      expect(value).not.toContain(PAGE_HEADER_SPLICE)
    })

    it('contains no Invitatory / Lauds-Benedictus bleed (Pattern B guard)', () => {
      expect(value).not.toContain(INVITATORY_BLEED)
      expect(value).not.toContain(BENEDICTUS_BLEED)
    })

    it('preserves the correct EP-I collect text', () => {
      expect(value).toContain(headFragment)
      // Mongolian collects close with the standard doxology terminator.
      expect(value.trimEnd()).toMatch(/(болтугай|билээ)\.$/)
    })
  })

  it('every targeted sanctoral firstVespers field is free of the EP-II marker (exhaustive sweep)', () => {
    const allEntries: Array<[string, SanctoralEntry]> = [
      ...Object.entries(feasts as Record<string, SanctoralEntry>),
      ...Object.entries(solemnities as Record<string, SanctoralEntry>),
    ]
    const polluted: string[] = []
    for (const [key, entry] of allEntries) {
      const fv = entry.firstVespers
      if (!fv) continue
      for (const f of ['concludingPrayer', 'alternativeConcludingPrayer'] as const) {
        const v = fv[f]
        // 01-01 (Mother of God) is handled separately (no vespers2 sibling);
        // it is the only remaining field permitted to carry EP-II content
        // until the EP-II-completeness follow-up decides its disposition.
        if (key === '01-01') continue
        if (typeof v === 'string' && v.includes(EP_II_MARKER)) {
          polluted.push(`${key}.firstVespers.${f}`)
        }
      }
    }
    expect(polluted).toEqual([])
  })
})
