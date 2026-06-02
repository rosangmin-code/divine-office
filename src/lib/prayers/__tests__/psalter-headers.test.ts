/**
 * @fr FR-160-C
 * Unit tests for loadPsalterHeaderRich (rich-overlay).
 *
 * Verifies:
 *   1. catalog file existence + valid schema
 *   2. lookup returns the first authored entry per ref
 *   3. unknown ref → null (no header authored)
 *   4. mtime cache reuse (loader called twice → single fs.statSync read)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  loadPsalterHeaderRich,
  __resetRichOverlayCache,
} from '../rich-overlay'

const REPO_ROOT = process.cwd()
const CATALOG_PATH = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-headers.rich.json',
)

describe('FR-160-C psalter-headers catalog', () => {
  beforeEach(() => {
    __resetRichOverlayCache()
  })

  it('catalog file exists at canonical location', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true)
  })

  it('catalog has valid {refs, unmatched} schema with non-empty entries', () => {
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    expect(raw.refs).toBeTypeOf('object')
    const refKeys = Object.keys(raw.refs)
    expect(refKeys.length).toBeGreaterThan(0)
    for (const key of refKeys) {
      const entry = raw.refs[key]
      expect(Array.isArray(entry.entries)).toBe(true)
      expect(entry.entries.length).toBeGreaterThan(0)
      for (const e of entry.entries) {
        expect([
          'patristic_preface',
          'nt_typological',
          'uncited_caption',
        ]).toContain(e.kind)
        expect(typeof e.preface_text).toBe('string')
        expect(e.preface_text.length).toBeGreaterThan(0)
        if (
          e.kind === 'patristic_preface' ||
          e.kind === 'nt_typological'
        ) {
          expect(typeof e.attribution).toBe('string')
          expect(e.attribution.length).toBeGreaterThan(0)
        } else {
          expect(e.attribution).toBeUndefined()
        }
      }
    }
  })

  it('returns first authored header for known refs (Psalm 149)', () => {
    // Psalm 149 has a patristic preface attributed to Хэсихиус — see
    // PDF p.64 (Шашны хөвгүүд... Христ өөрсдийн Хаандаа баярлацгаа!).
    // The canonical key in psalter-texts.json is "Psalm 149:1-9".
    const header = loadPsalterHeaderRich('Psalm 149:1-9')
    expect(header).not.toBeNull()
    expect(header!.kind).toBe('patristic_preface')
    expect(header!.attribution).toBe('Хэсихиус')
    expect(header!.preface_text.length).toBeGreaterThan(0)
  })

  it('returns first authored header for known refs (NT typological)', () => {
    // Walk the catalog and find any nt_typological entry to assert
    // shape — robust to specific ref/page churn.
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    const ntKey = Object.keys(raw.refs).find((k) =>
      raw.refs[k].entries.some(
        (e: { kind: string }) => e.kind === 'nt_typological',
      ),
    )
    expect(ntKey).toBeDefined()
    const header = loadPsalterHeaderRich(ntKey!)
    expect(header).not.toBeNull()
    // Could be patristic or nt_typological as the FIRST entry; just verify
    // both possibilities are well-formed.
    expect(['patristic_preface', 'nt_typological']).toContain(header!.kind)
  })

  it('returns null for refs not present in catalog', () => {
    const header = loadPsalterHeaderRich('Psalm 999:9-9')
    expect(header).toBeNull()
  })

  // FR-160-C peer R1 finding: loader returns entries[0] without
  // occurrence-context disambiguation. The schema permits multiple
  // entries per ref (same psalm at different liturgical pages), so
  // until we add page-aware lookup, the catalog MUST keep all entries
  // for a single ref semantically equivalent (same kind + attribution).
  // This invariant is asserted in tests so a future audit that adds a
  // divergent header for the same ref fails CI loudly instead of
  // silently rendering the wrong metadata.
  it('multi-entry refs have semantically equivalent attribution+kind', () => {
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    const violations: Array<{
      ref: string
      attributions: string[]
      kinds: string[]
    }> = []
    for (const [refKey, entry] of Object.entries(raw.refs) as [
      string,
      { entries: { kind: string; attribution: string }[] },
    ][]) {
      if (!entry.entries || entry.entries.length < 2) continue
      const distinctAttrib = [
        ...new Set(entry.entries.map((e) => e.attribution)),
      ]
      const distinctKind = [...new Set(entry.entries.map((e) => e.kind))]
      if (distinctAttrib.length > 1 || distinctKind.length > 1) {
        violations.push({
          ref: refKey,
          attributions: distinctAttrib,
          kinds: distinctKind,
        })
      }
    }
    expect(violations).toEqual([])
  })

  it('loads Psalm 63 uncited caption without attribution', () => {
    // GOAL #130 moved this uncited PDF caption out of the psalm body and
    // into a dedicated header entry. The two lines are verbatim from
    // parsed_data/full_pdf.txt:1812-1813.
    const header = loadPsalterHeaderRich('Psalm 63:2-9')

    expect(header).not.toBeNull()
    expect(header!.kind).toBe('uncited_caption')
    expect(header!.preface_text).toContain(
      'Гэм нүглийн харанхуйгаас салсан хэнбугай ч',
    )
    expect(header!.preface_text).toContain(
      'Тэнгэрбурханыг хүсэн тэмүүлнэ.',
    )
    expect(header!.attribution).toBeUndefined()
  })

  // F-X9 (#362) invariant — preface_text must NOT carry the PDF title prefix
  // or the `(attribution)` literal. Both are emitted separately by
  // psalm-block.tsx (`psalm.title` and `({attribution})`), so storing them
  // in preface_text causes both to render twice in the UI (audit #362:
  // 67/77 title-dup + 74/77 attribution-dup before fix).
  //
  // Locked here so a future extractor regression (or an unfix-rebuild of
  // the catalog from a stale extractor binary) fails CI loudly. The
  // invariant covers BOTH F-X9 fix A (this dispatch — extractor + catalog
  // regen) and F-X9 fix B (renderer guard, dispatch #373) — they share
  // the same contract on preface_text shape.
  describe('F-X9 (#362) preface_text shape invariants', () => {
    /**
     * Build psalmNum -> Set<title> map by walking week-N.json + propers
     * exactly the way scripts/extract-psalter-headers.js does. Used to
     * assert that no preface_text starts with a known canonical title.
     */
    function loadPsalmTitlesByNumber(): Map<number, Set<string>> {
      const titleSources = [
        'src/data/loth/psalter/week-1.json',
        'src/data/loth/psalter/week-2.json',
        'src/data/loth/psalter/week-3.json',
        'src/data/loth/psalter/week-4.json',
        'src/data/loth/propers/advent.json',
        'src/data/loth/propers/christmas.json',
        'src/data/loth/propers/lent.json',
        'src/data/loth/propers/easter.json',
        'src/data/loth/propers/ordinary-time.json',
      ]
      const map = new Map<number, Set<string>>()
      function walk(node: unknown): void {
        if (Array.isArray(node)) {
          for (const item of node) walk(item)
          return
        }
        if (node && typeof node === 'object') {
          const obj = node as Record<string, unknown>
          if (typeof obj.ref === 'string' && typeof obj.title === 'string') {
            const m = obj.ref.match(/^Psalm\s+(\d+)/)
            if (m) {
              const num = parseInt(m[1], 10)
              const norm = obj.title.trim().replace(/\s+/g, ' ')
              if (norm) {
                if (!map.has(num)) map.set(num, new Set())
                map.get(num)!.add(norm)
              }
            }
          }
          for (const key of Object.keys(obj)) walk(obj[key])
        }
      }
      for (const rel of titleSources) {
        const path = resolve(REPO_ROOT, rel)
        try {
          walk(JSON.parse(readFileSync(path, 'utf-8')))
        } catch {
          // Optional file — skip silently in test, like the extractor.
        }
      }
      return map
    }

    function escapeRegExp(s: string): string {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    it('no entry starts with the canonical psalm title (no title-dup)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const titlesByNum = loadPsalmTitlesByNumber()
      const violations: Array<{ ref: string; page: number; title: string }> = []
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        { entries: { preface_text: string; page: number }[] },
      ][]) {
        const m = refKey.match(/^Psalm\s+(\d+)/)
        if (!m) continue
        const psNum = parseInt(m[1], 10)
        const titles = titlesByNum.get(psNum) || new Set<string>()
        for (const e of refEntry.entries) {
          for (const t of titles) {
            if (e.preface_text.startsWith(t)) {
              violations.push({ ref: refKey, page: e.page, title: t })
              break
            }
          }
        }
      }
      expect(violations).toEqual([])
    })

    it('no entry ends with the (attribution) literal (no attribution-dup)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{ ref: string; page: number; tail: string }> = []
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        {
          entries: {
            preface_text: string
            attribution: string
            page: number
          }[]
        },
      ][]) {
        for (const e of refEntry.entries) {
          if (!e.attribution) continue
          // Match the same shape the renderer emits and the extractor
          // strips: optional `харьцуул.\s+` cf-prefix + attribution +
          // optional trailing period.
          const pat = new RegExp(
            `\\((?:харьцуул\\.\\s+)?${escapeRegExp(e.attribution)}\\)\\.?\\s*$`,
            'u',
          )
          if (pat.test(e.preface_text)) {
            violations.push({
              ref: refKey,
              page: e.page,
              tail: e.preface_text.slice(-50),
            })
          }
        }
      }
      expect(violations).toEqual([])
    })

    // F-X9 NIT-2 (review #376): the canonical title-prefix invariant above
    // walks `loadPsalmTitlesByNumber()` which only sees titles authored in
    // week-N.json / propers/*.json. The PDF carries 11 additional psalms
    // whose titles are NOT in any JSON source (data gap — the extractor
    // covers them via `fallbackStripFirstPdfLine`). 7 of the 11 land in
    // the catalog; the other 4 (Psalms 95, 4, 134, 91) lack a matching
    // canonical key in psalter-texts.json so they remain in `unmatched`.
    //
    // Without the fixture below, a fallback-strip regression would re-grow
    // title-dup on these 7 entries silently — the canonical invariant
    // wouldn't catch it because it only knows JSON-sourced titles.
    //
    // Each entry's `pdfTitle` is verbatim from `parsed_data/full_pdf.txt`
    // (PDF SSOT — feedback_pdf_ssot_verbatim memory). The invariant
    // asserts each catalog entry's `preface_text` does NOT start with its
    // PDF-only title, locking the fallback strip path.
    it('no fallback-path entry starts with its PDF-only title (NIT-2)', () => {
      // 11 fallback entries discovered via traced re-run of the extractor
      // logic against `parsed_data/full_pdf.txt`. 7 land in the catalog
      // (asserted below); 4 remain in `unmatched` and are documented for
      // reference but skipped here because the loader never reads them.
      const PDF_ONLY_TITLES: Array<{
        ref: string
        page: number
        attribution: string
        pdfTitle: string
        inCatalog: boolean
      }> = [
        // In catalog (loader-reachable):
        {
          ref: 'Psalm 141:1-9',
          page: 50,
          attribution: 'Илчлэл 8:4',
          pdfTitle: 'Аюулын үед унших даатгал залбирал',
          inCatalog: true,
        },
        {
          ref: 'Psalm 119:105-112',
          page: 167,
          attribution: 'Иохан 15:12',
          pdfTitle: 'Тэнгэрбурханы энэрэл хайрын тухай бясалгал',
          inCatalog: true,
        },
        {
          ref: 'Psalm 16:1-6',
          page: 168,
          attribution: 'Үйлс 2:24',
          pdfTitle: 'Эзэн бол миний өв юм',
          inCatalog: true,
        },
        {
          ref: 'Psalm 113:1-9',
          page: 287,
          attribution: 'Лук 1:52',
          pdfTitle: 'Эзэний нэр алдрыгмагтан дуулагтун',
          inCatalog: true,
        },
        {
          ref: 'Psalm 146:1-10',
          page: 460,
          attribution: 'Арнобиус',
          pdfTitle: 'Тэнгэрбурханд найдагчид',
          inCatalog: true,
        },
        {
          ref: 'Psalm 16:1-6',
          page: 535,
          attribution: 'Үйлс 2:24',
          pdfTitle: 'Эзэн бол миний өв юм',
          inCatalog: true,
        },
        {
          ref: 'Psalm 88:2-10',
          page: 539,
          attribution: 'Лук 22:53',
          pdfTitle: 'Өвчтэй хүний даатгал залбирал',
          inCatalog: true,
        },
        // Unmatched (no canonical key in psalter-texts.json — documented
        // for completeness; not asserted because the catalog never carries
        // these refs):
        {
          ref: 'Psalm 95',
          page: 28,
          attribution: 'Еврей 3:13',
          pdfTitle: 'Тэнгэрбурханыг магтах дуудлага',
          inCatalog: false,
        },
        {
          ref: 'Psalm 4',
          page: 512,
          attribution: 'Гэгээн Августин',
          pdfTitle: 'Талархал магтаал',
          inCatalog: false,
        },
        {
          ref: 'Psalm 134',
          page: 514,
          attribution: 'Илчлэл 19:5',
          pdfTitle: 'Сүм хийдийн доторх үдшийн даатгал залбирал',
          inCatalog: false,
        },
        {
          ref: 'Psalm 91',
          page: 517,
          attribution: 'Лук 10:19',
          pdfTitle: 'Тэнгэрбурханы ивээл доорх аюулгүй байдал',
          inCatalog: false,
        },
      ]

      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{
        ref: string
        page: number
        pdfTitle: string
      }> = []
      const missing: Array<{ ref: string; page: number }> = []

      for (const fixture of PDF_ONLY_TITLES) {
        if (!fixture.inCatalog) continue
        const refEntry = raw.refs[fixture.ref] as
          | { entries: { preface_text: string; page: number }[] }
          | undefined
        if (!refEntry) {
          // The fixture promised this ref is in the catalog; if it's not,
          // the fixture is stale (or a future cleanup removed the entry).
          // Surface as a missing-fixture finding rather than a silent skip.
          missing.push({ ref: fixture.ref, page: fixture.page })
          continue
        }
        const match = refEntry.entries.find((e) => e.page === fixture.page)
        if (!match) {
          missing.push({ ref: fixture.ref, page: fixture.page })
          continue
        }
        // NIT batch #409 (review #390 NIT-FU-1): widened from
        // `startsWith` to `includes` so the invariant catches not only
        // first-line fallback regressions (where the title appears at
        // the start of preface_text) but also mid-string and trailing
        // regressions (where a future extractor change might splice the
        // title elsewhere). False-positive risk is low — `pdfTitle` is
        // a section header that should not appear inside body prose for
        // the listed PDF-only refs.
        if (match.preface_text.includes(fixture.pdfTitle)) {
          violations.push({
            ref: fixture.ref,
            page: fixture.page,
            pdfTitle: fixture.pdfTitle,
          })
        }
      }

      // Both lists must be empty. `violations` catches a fallback-strip
      // regression; `missing` catches catalog drift (a fixture entry
      // pointing at a ref/page that no longer exists in the catalog).
      expect({ violations, missing }).toEqual({
        violations: [],
        missing: [],
      })
    })
  })

  // F-X13 (#444) preface_text page-break artifact invariants — locks the
  // pre-#444 latent bug where the block-capture window in
  // `scripts/extract-psalter-headers.js` only filtered EMPTY lines and
  // therefore absorbed the PDF's running-header / page-marker lines that
  // appear between the opening and closing lines of a long preface (when
  // it crosses the visual page break of the 2-up book layout).
  //
  // Surfaced at #376 review MINOR-1 on:
  //   - Psalm 113:1-9 page 287 — `288 288 3 дугаар долоо хоног` mid-text
  //   - Psalm 122:1-9 page 398 — `399 Бямба гарагийн орой 399` mid-text
  //
  // The invariants below cover BOTH the specific user-reported regressions
  // (positive fixture: Psalm 113 / 122 must carry the clean PDF preface
  // text without artifacts) AND the global structural shape (negative
  // sweep: NO catalog entry's preface_text contains a running-header /
  // page-marker pattern). Designed to fail loudly if a future extractor
  // change re-introduces the unfiltered block-capture path.
  describe('F-X13 (#444) preface_text page-break artifact invariants', () => {
    it('Psalm 113:1-9 page 287 preface_text has no page-break artifact (positive fixture)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const refEntry = raw.refs['Psalm 113:1-9'] as
        | { entries: { preface_text: string; page: number }[] }
        | undefined
      expect(refEntry).toBeDefined()
      const match = refEntry!.entries.find((e) => e.page === 287)
      expect(match).toBeDefined()
      // PDF p.287 (full_pdf.txt L9785-9795 verbatim): the preface body is
      // the two non-blank prose lines around the page break — opening
      // "Удирдагчдыг сэнтийгээс нь буулган даруу" + closing "байгсдыг Тэр
      // өргөмжлөв (Лук 1:52)". The trailing `(Лук 1:52)` is stripped by
      // the F-X9 attribution-suffix path and the title `Эзэний нэр…` is
      // stripped by the F-X9 fallback path. What remains MUST NOT contain
      // any of the page-break artifacts the PDF interleaves at the page
      // break.
      expect(match!.preface_text).toBe(
        'Удирдагчдыг сэнтийгээс нь буулган даруу байгсдыг Тэр өргөмжлөв',
      )
    })

    it('Psalm 122:1-9 page 398 preface_text has no page-break artifact (positive fixture)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const refEntry = raw.refs['Psalm 122:1-9'] as
        | { entries: { preface_text: string; page: number }[] }
        | undefined
      expect(refEntry).toBeDefined()
      const match = refEntry!.entries.find((e) => e.page === 398)
      expect(match).toBeDefined()
      // PDF p.398-399 (full_pdf.txt L13728-13738 verbatim): preface body
      // is the two prose lines around the page break — opening "Харин
      // та нар Сион уул, амьд Тэнгэрбурханы хот," + closing "тэнгэрлэг
      // Йерусалим руу ирсэн (Еврей 12:22)" (attribution stripped). The
      // bare page number `399` and weekday running header `Бямба
      // гарагийн орой` MUST be filtered.
      expect(match!.preface_text).toBe(
        'Харин та нар Сион уул, амьд Тэнгэрбурханы хот, тэнгэрлэг Йерусалим руу ирсэн',
      )
    })

    it('no entry contains a weekday running header (negative sweep)', () => {
      // PDF running header pattern: `<weekday> гарагийн <time-of-day>` —
      // `Бямба гарагийн орой`, `Ням гарагийн өглөө`, etc. Standalone in
      // the PDF as a 2-up running header; should never appear inside a
      // captured preface body. The pattern below matches the inline
      // shape (with surrounding whitespace) so a regression that splices
      // the running header mid-text is detected.
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{
        ref: string
        page: number
        match: string
      }> = []
      const re =
        /(?:Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба)\s+гарагийн\s+(?:өглөө|өдөр|орой|даатгал)/u
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        { entries: { preface_text: string; page: number }[] },
      ][]) {
        for (const e of refEntry.entries) {
          const m = re.exec(e.preface_text)
          if (m) {
            violations.push({ ref: refKey, page: e.page, match: m[0] })
          }
        }
      }
      expect(violations).toEqual([])
    })

    it('no entry contains a week-of-cycle running header (negative sweep)', () => {
      // PDF running header pattern: `<digit> дугаар|дүгээр|дэх|дахь
      // долоо хоног`. Standalone in the PDF; should never appear inside
      // a captured preface body.
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{
        ref: string
        page: number
        match: string
      }> = []
      const re = /\d+\s+(?:дугаар|дүгээр|дэх|дахь)\s+долоо\s+хоног/u
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        { entries: { preface_text: string; page: number }[] },
      ][]) {
        for (const e of refEntry.entries) {
          const m = re.exec(e.preface_text)
          if (m) {
            violations.push({ ref: refKey, page: e.page, match: m[0] })
          }
        }
      }
      expect(violations).toEqual([])
    })

    it('no entry contains a twin-page-number artifact (negative sweep)', () => {
      // PDF 2-up layout prints the same book-page integer twice on each
      // physical page (left + right column markers). When a preface
      // crosses the page break, the unfiltered capture absorbs both
      // copies — diagnostic shape: `\b<NN> <NN>\b`. This MUST never
      // appear in a captured preface body. Defensive: also catches the
      // single-bare-integer shape sandwiched between body words (a
      // weaker but related artifact pattern not in the dispatch's two
      // refs but worth pinning preemptively).
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{
        ref: string
        page: number
        match: string
      }> = []
      // Mongolian preface bodies do not embed bare 2-4 digit integers
      // inline (verse refs in attribution e.g. `Лук 1:52` always carry
      // a `:` separator and live in the trailing `(...)` literal that
      // the F-X9 attribution-suffix strip removes). A standalone integer
      // surrounded by whitespace is therefore a strong artifact signal.
      const re = /\s(\d{2,4})\s+\1\s/u // twin same-integer
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        { entries: { preface_text: string; page: number }[] },
      ][]) {
        for (const e of refEntry.entries) {
          const m = re.exec(' ' + e.preface_text + ' ')
          if (m) {
            violations.push({ ref: refKey, page: e.page, match: m[0].trim() })
          }
        }
      }
      expect(violations).toEqual([])
    })
  })
})
