import { describe, it, expect } from 'vitest'
import hymns from '../../data/loth/ordinarium/hymns.json'
import hymnsIndex from '../../data/loth/ordinarium/hymns-index.json'

/**
 * NFR-009k — hymn title<->body<->page contamination regression guard.
 *
 * GOAL #32: the upstream `divine-office-reader` PDF parser mis-segmented hymn
 * boundaries, leaving 29 of 122 hymns contaminated (audit #33 / WI #34):
 *   - garbage body (foreign content from a distant page),
 *   - over-capture (body runs into the NEXT hymn, incl. its "N. title" header),
 *   - truncation (trailing stanza leaked to a neighbour).
 * WI #34 re-extracted all bodies from `parsed_data/full_pdf.txt` (the source of
 * truth) via `scripts/extract-hymns-from-pdf.ts`.
 *
 * This suite is the CI-runnable guard over the COMMITTED `hymns.json` (the
 * full PDF re-verification `node --experimental-strip-types
 * scripts/extract-hymns-from-pdf.ts --verify` needs the gitignored
 * full_pdf.txt and runs locally). It catches re-introduction of the
 * contamination class without the PDF.
 */

type Hymn = { title: string; text: string; page?: number }
const H = hymns as Record<string, Hymn>
const titleByNum: Record<string, string> = {}
for (const e of (hymnsIndex as { hymns: { number: number; title: string }[] }).hymns) {
  titleByNum[String(e.number)] = e.title
}
const norm = (s: string) => (s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// @fr NFR-009k
describe('NFR-009k hymn contamination guard', () => {
  it('every hymn has a non-empty body and a page', () => {
    for (let n = 1; n <= 122; n++) {
      const e = H[String(n)]
      expect(e, `hymn #${n} present`).toBeTruthy()
      expect((e.text || '').trim().length, `hymn #${n} body non-empty`).toBeGreaterThan(0)
      expect(typeof e.page, `hymn #${n} has numeric page`).toBe('number')
    }
  })

  it('no hymn body over-captures another hymn header line "M. <title_M>"', () => {
    const violations: string[] = []
    for (let n = 1; n <= 122; n++) {
      for (const raw of (H[String(n)].text || '').split('\n')) {
        const m = raw.trim().match(/^(\d{1,3})\.\s+(.+)$/u)
        if (!m) continue
        const M = m[1]
        if (M === String(n)) continue
        if (titleByNum[M] && norm(titleByNum[M]) === norm(m[2])) {
          violations.push(`#${n} body contains foreign header "${raw.trim()}"`)
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  // Targeted anti-regression markers for the headline contaminated hymns
  // (the 2026-05-25 lauds bug + its donor/victim cluster).
  const cases: { n: number; mustInclude?: string[]; mustExclude?: string[]; page?: number }[] = [
    // #3 = the 2026-05-25 lauds hymn. Real: "Ааваа миний Ааваа" (p886).
    { n: 3, mustInclude: ['Ааваа миний Ааваа', 'Би Танд хайртай Би талархана'], mustExclude: ['Махбод дотор', 'Бүх Монгол'], page: 886 },
    // #1 garbage -> real "Ааваа Та миний амьдралын Эзэн" (p885).
    { n: 1, mustInclude: ['Ааваа Та миний амьдралын Эзэн'], mustExclude: ['Энэрлийн нөхөр'], page: 885 },
    // #83 truncation victim -> page-939 tail restored.
    { n: 83, mustInclude: ['Хөх тэнгэрийн агуу Их Эзэн минь', 'Мэхийн хүндэлэе өвдөг сөгдөн мөргөе'] },
    // #107 garbage -> real "1. Эзэн Есүс таныгаа" (p951), NOT #1's body.
    { n: 107, mustInclude: ['Эзэн Есүс таныгаа'], mustExclude: ['Ааваа Та миний амьдралын Эзэн'], page: 951 },
    // #114 absorber -> #115 Nativity content removed.
    { n: 114, mustInclude: ['Эзэн өршөөгөөрэй'], mustExclude: ['Тэнгэрийн Эзэн ариун хөвгүүн'] },
    // #75 sub-3-line truncation found during re-extraction.
    { n: 75, mustInclude: ['Зүрхэнд минь мутраа хүргээч Та'] },
    // #2 over-capture -> #3 body no longer appended.
    { n: 2, mustExclude: ['Ааваа миний Ааваа'] },
  ]
  for (const c of cases) {
    it(`hymn #${c.n} is correctly de-contaminated`, () => {
      const text = H[String(c.n)].text
      for (const inc of c.mustInclude || []) expect(text, `#${c.n} must include "${inc}"`).toContain(inc)
      for (const exc of c.mustExclude || []) expect(text, `#${c.n} must NOT include "${exc}"`).not.toContain(exc)
      if (c.page != null) expect(H[String(c.n)].page, `#${c.n} page`).toBe(c.page)
    })
  }
})
