import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * GOAL #12 [F4] — W1 Wednesday Vespers page-boundary truncation + concludingPrayer
 * decontamination (sweep result, GOAL #8).
 *
 * DEFECT (parsed_data/full_pdf.txt:4044-4068, page boundary 122->123):
 *   The intercessions (Гуйлтын залбирал) array dropped the response to the
 *   "Өдөр тутмын зовлон..." petition AND the entire following petition at the
 *   page break, so the array jumped straight from
 *     "ажилладаг хүмүүсийг Та тайтгаруулна уу."   (L4047, lead tail)
 *   to the closing doxology "Тантай, Ариун Сүнсний нэгдэлтэй..." (L4065).
 *   Dropped source lines (L4055-4059):
 *     L4055  "- Ажилчдын эрхэм чанарыг хадгална уу."            (response to L4046-4047)
 *     L4056  "Өнөөдөр талийгаач хүмүүст Та өрөвч нинжин"        (next petition, lead 1)
 *     L4057  "сэтгэлийн хаалгаа өргөнөөр нээгээд,"              (lead 2)
 *     L4058  "- Тэднийг нигүүлсэлдээ болон Өөрийн"              (response 1)
 *     L4059  "хаанчлалдаа хүлээн авна уу."                      (response 2)
 *
 *   Separately the concludingPrayer field was CONTAMINATED: the correct prayer
 *   (L4061-4064) had an erroneous copy of the intercessions intro + petitions
 *   A-D + doxology appended to it.
 *
 * FIX (iter2, AC2 amended by leader + reviewer dvo-review):
 *   The collect doxology (L4065-4068, "Тантай, Ариун Сүнсний нэгдэлтэй … Таны
 *   Хүүгээр уламжлан тийн болтугай.") belongs to the CONCLUDING PRAYER, not the
 *   intercessions — SoT order puts it AFTER the "Төгсгөлийн даатгал залбирал"
 *   header (L4060) + prayer body (L4061-4064); and every OTHER vespers/lauds
 *   entry in week-1.json carries this exact doxology INSIDE concludingPrayer
 *   while ending intercessions[] with the Lord's-Prayer marker, never the
 *   doxology. So:
 *     - intercessions[] = intro + petitions (restored), ENDS at the last
 *       petition "…хаанчлалдаа хүлээн авна уу." (L4059); NO doxology element.
 *     - concludingPrayer = L4061-4068 (prayer body + doxology); contaminating
 *       intercessions middle block removed.
 *
 * All expected strings derived by READING full_pdf.txt + the in-repo data —
 * byte-verbatim, NOT machine-translated (NFR-002). week-1.json is the single
 * app-consumed source for this entry (no rich mirror).
 */
const REPO_ROOT = process.cwd()
const WEEK1_PATH = path.join(REPO_ROOT, 'src/data/loth/psalter/week-1.json')

// Restored intercessions elements (full_pdf.txt source lines noted).
// L4047 lead-tail with the L4055 response merged onto it (array wrap convention).
const PETITION_D_RESPONSE =
  'ажилладаг хүмүүсийг Та тайтгаруулна уу. - Ажилчдын эрхэм чанарыг хадгална уу.'
const PETITION_E_LEAD_1 = 'Өнөөдөр талийгаач хүмүүст Та өрөвч нинжин' // L4056
const PETITION_E_LEAD2_RESP1 =
  'сэтгэлийн хаалгаа өргөнөөр нээгээд, - Тэднийг нигүүлсэлдээ болон Өөрийн' // L4057 + L4058
const PETITION_E_RESPONSE_2 = 'хаанчлалдаа хүлээн авна уу.' // L4059 — LAST intercessions element
// The pre-fix truncated array carried this as a STANDALONE element; after the
// merge it must no longer appear bare.
const TRUNCATED_LEAD_TAIL_BARE = 'ажилладаг хүмүүсийг Та тайтгаруулна уу.'

// Collect doxology (L4065-4068). It belongs to concludingPrayer, NOT intercessions.
const DOXOLOGY_INCIPIT = 'Тантай, Ариун Сүнсний нэгдэлтэй'
const DOXOLOGY_FULL =
  'Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг Тэнгэрбурхан Есүс Христ бидний Эзэн, Таны Хүүгээр уламжлан тийн болтугай.'

// concludingPrayer must be EXACTLY L4061-4068 (prayer body + doxology).
const CONCLUDING_PRAYER_EXACT =
  'Аяа, Эзэн минь, өдөр ч, шөнө ч Та биднийг харж хамгаална уу. Энэ амьдралын тоо томшгүй өөрчлөлтийн дундаас Та хэзээ ч хувиршгүй хайраараа биднийг хүчирхэгжүүлнэ үү. ' +
  DOXOLOGY_FULL
// Markers from the erroneous appended intercessions block — must be gone from
// concludingPrayer (the doxology is NOT a contamination marker — it is the
// legitimate collect tail).
const CONTAMINATION_MARKERS = [
  'Гуйлтын залбирал',
  'Бидний үйлдэх',
  'Католик шашныг',
]

interface Vespers {
  intercessions: string[]
  concludingPrayer: string
}
interface Week1 {
  days: Record<string, { vespers: Vespers }>
}

const raw = fs.readFileSync(WEEK1_PATH, 'utf-8')
const week1 = JSON.parse(raw) as Week1
const vespers = week1.days.WED.vespers
const ic = vespers.intercessions

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe('GOAL #12 [F4] — W1 WED vespers truncation restore + concludingPrayer decontamination', () => {
  describe('intercessions: dropped petitions restored', () => {
    it('contains the restored petition-D response and full petition-E (verbatim)', () => {
      expect(ic).toContain(PETITION_D_RESPONSE)
      expect(ic).toContain(PETITION_E_LEAD_1)
      expect(ic).toContain(PETITION_E_LEAD2_RESP1)
      expect(ic).toContain(PETITION_E_RESPONSE_2)
    })

    it('no longer carries the truncated bare lead-tail element', () => {
      // Pre-fix the array jumped from this bare element straight to the doxology;
      // the L4055 response is now merged onto it.
      expect(ic).not.toContain(TRUNCATED_LEAD_TAIL_BARE)
    })

    it('places the restored petitions in contiguous source order', () => {
      const idxD = ic.indexOf(PETITION_D_RESPONSE)
      const idxE1 = ic.indexOf(PETITION_E_LEAD_1)
      const idxE2 = ic.indexOf(PETITION_E_LEAD2_RESP1)
      const idxE3 = ic.indexOf(PETITION_E_RESPONSE_2)
      expect(idxD).toBeGreaterThanOrEqual(0)
      expect(idxE1).toBe(idxD + 1)
      expect(idxE2).toBe(idxE1 + 1)
      expect(idxE3).toBe(idxE2 + 1)
    })

    it('ENDS at the last petition — the collect doxology is NOT in intercessions[]', () => {
      // AC2 (amended): the doxology belongs to concludingPrayer. intercessions[]
      // must end at petition-E's response and carry no doxology element.
      expect(ic[ic.length - 1]).toBe(PETITION_E_RESPONSE_2)
      expect(ic.some((s) => s.includes(DOXOLOGY_INCIPIT))).toBe(false)
    })

    it('each restored line occurs exactly once within this entry (no double-count)', () => {
      const joined = ic.join('\n')
      expect(countOccurrences(joined, PETITION_D_RESPONSE)).toBe(1)
      expect(countOccurrences(joined, PETITION_E_LEAD_1)).toBe(1)
      expect(countOccurrences(joined, PETITION_E_LEAD2_RESP1)).toBe(1)
      // PETITION_E_RESPONSE_2 is a generic phrase; assert single occurrence
      // within THIS entry's intercessions (a different TUE petition uses it too).
      expect(countOccurrences(joined, PETITION_E_RESPONSE_2)).toBe(1)
    })
  })

  describe('concludingPrayer: prayer body + collect doxology (L4061-4068)', () => {
    it('equals the exact concluding prayer including the doxology tail', () => {
      expect(vespers.concludingPrayer).toBe(CONCLUDING_PRAYER_EXACT)
    })

    it('ends with the collect doxology (project convention — matches every other day)', () => {
      expect(vespers.concludingPrayer.endsWith(DOXOLOGY_FULL)).toBe(true)
    })

    it('carries none of the erroneous appended intercessions markers', () => {
      for (const marker of CONTAMINATION_MARKERS) {
        expect(vespers.concludingPrayer).not.toContain(marker)
      }
    })
  })

  // Cross-day convention guard: WED/vespers was the lone anomaly (doxology
  // stranded in intercessions). After the fix it must match the dominant
  // shape — concludingPrayer ends with the doxology AND intercessions does not.
  describe('cross-day convention', () => {
    it('WED/vespers concludingPrayer ends with the same doxology as MON/vespers', () => {
      const mon = week1.days.MON.vespers.concludingPrayer
      expect(mon.endsWith(DOXOLOGY_FULL)).toBe(true)
      expect(vespers.concludingPrayer.endsWith(DOXOLOGY_FULL)).toBe(true)
    })
  })
})
