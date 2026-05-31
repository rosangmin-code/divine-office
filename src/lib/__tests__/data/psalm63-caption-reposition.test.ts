import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * GOAL #130 — Psalm 63 Lauds caption reposition (body → post-title header).
 *
 * Step 4 RED tests (DOGFOODING). Derived from:
 *   - docs/research/GOAL130-spec.md  (§lock 계약, d686295)
 *   - docs/research/GOAL130-scenarios.md
 *   - docs/design/mental-models/goal130-psalm63-caption-reposition.md
 *
 * Data-assertion layer (D1 stanza/rich + D2 caption preservation + D3
 * negative guards). These assert the POST-FIX committed-data state and are
 * intentionally RED before Step 6 (the caption currently contaminates the
 * Psalm 63 first stanza in both plain + rich psalter data, and the Psalm 63
 * uncited-caption header entry is absent). The D3 negative-guard +
 * invariant cases are GREEN now and MUST stay GREEN after the fix — they
 * lock that the ref-keyed skip did not regress legitimate body starts or
 * the antiphon routing.
 *
 * Kept in a dedicated new file (NOT folded into existing psalter data
 * tests) to avoid merge conflict with the concurrent #105 psalm-prayer
 * GOAL that touches the same data bundle (dispatch #134 ⚠ #105 회피).
 *
 * Mongolian liturgical text is quoted verbatim from the PDF-sourced data
 * (citation exception); spelling is the data/PDF form `тэмүүлнэ` (NOT the
 * GOAL-description form `тэмүүлэнэ`) per spec §Test Contract + MM note.
 */

const ROOT = path.resolve(__dirname, '../../../..')

function read(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

// --- Locked literals (spec §Locked User Outcome / §Test Contract) ---
const PS63_REF = 'Psalm 63:2-9'
const PS63_BODY_FIRST_LINE = 'Тэнгэрбурхан, Та миний Тэнгэрбурхан'
const PS63_CAPTION_L1 = 'Гэм нүглийн харанхуйгаас салсан хэнбугай ч'
const PS63_CAPTION_L2 = 'Тэнгэрбурханыг хүсэн тэмүүлнэ.'
const PS63_TITLE = 'Тэнгэрбурханаар цангаж буй сэтгэл'
const PS63_DEFAULT_ANTIPHON =
  'Аяа Тэнгэрбурхан минь, би өнөөдөр Таныг Өөрийнхөө хүч болгохын тулд эртлэн хайх болно. Аллэлуяа!'

const PSALTER_TEXTS = 'src/data/loth/psalter-texts.json'
const PSALTER_TEXTS_RICH =
  'src/data/loth/prayers/commons/psalter-texts.rich.json'
const PSALTER_HEADERS_RICH =
  'src/data/loth/prayers/commons/psalter-headers.rich.json'
const WEEK1 = 'src/data/loth/psalter/week-1.json'

// @fr FR-160-C
describe('GOAL #130 — Psalm 63 caption reposition · data assertions', () => {
  describe('[D1] body extraction — caption removed from stanzas', () => {
    it('plain psalter-texts.json: Psalm 63 stanzas[0][0] is the real body first line', () => {
      const data = read(PSALTER_TEXTS)
      const ps63 = data[PS63_REF]
      expect(ps63).toBeTruthy()
      // RED before Step 6: stanzas[0][0] currently holds the caption line.
      expect(ps63.stanzas[0][0]).toBe(PS63_BODY_FIRST_LINE)
    })

    it('plain psalter-texts.json: neither caption line survives in Psalm 63 stanzas[0]', () => {
      const data = read(PSALTER_TEXTS)
      const stanza0: string[] = data[PS63_REF].stanzas[0]
      const joined = stanza0.map((l) => l.trim())
      // RED before Step 6: both caption lines are still present in the body.
      expect(joined).not.toContain(PS63_CAPTION_L1)
      expect(joined).not.toContain(PS63_CAPTION_L2)
    })

    it('rich psalter-texts.rich.json: Psalm 63 first rendered stanza line is the body line', () => {
      const data = read(PSALTER_TEXTS_RICH)
      const block0 = data[PS63_REF].stanzasRich.blocks[0]
      const line0 = block0.lines[0].spans
        .map((s: { text?: string }) => s.text ?? '')
        .join('')
      // RED before Step 6: first rich line currently holds the caption.
      expect(line0).toBe(PS63_BODY_FIRST_LINE)
    })

    it('rich psalter-texts.rich.json: caption lines absent from Psalm 63 first stanza block', () => {
      const data = read(PSALTER_TEXTS_RICH)
      const block0 = data[PS63_REF].stanzasRich.blocks[0]
      const lineTexts: string[] = block0.lines.map(
        (l: { spans: { text?: string }[] }) =>
          l.spans.map((s) => s.text ?? '').join(''),
      )
      // RED before Step 6.
      expect(lineTexts).not.toContain(PS63_CAPTION_L1)
      expect(lineTexts).not.toContain(PS63_CAPTION_L2)
    })
  })

  describe('[D2] caption preservation — relocated to psalter-headers.rich.json (NOT deleted)', () => {
    it('Psalm 63 has an uncited_caption header entry preserving both caption lines exactly', () => {
      const headers = read(PSALTER_HEADERS_RICH)
      const ref = headers.refs?.[PS63_REF]
      // RED before Step 6: the Psalm 63 header entry does not exist yet.
      expect(ref).toBeTruthy()
      const entries: { kind: string; preface_text: string }[] = ref.entries
      const caption = entries.find((e) => e.kind === 'uncited_caption')
      expect(caption).toBeTruthy()
      expect(caption!.preface_text).toContain(PS63_CAPTION_L1)
      expect(caption!.preface_text).toContain(PS63_CAPTION_L2)
    })

    it('preserved caption uses the data/PDF spelling `тэмүүлнэ` (no machine-translation correction `тэмүүлэнэ`)', () => {
      const headers = read(PSALTER_HEADERS_RICH)
      const entries: { kind: string; preface_text: string }[] =
        headers.refs?.[PS63_REF]?.entries ?? []
      const caption = entries.find((e) => e.kind === 'uncited_caption')
      // RED before Step 6 (entry absent → caption undefined).
      expect(caption).toBeTruthy()
      expect(caption!.preface_text).toContain('тэмүүлнэ')
      expect(caption!.preface_text).not.toContain('тэмүүлэнэ')
    })
  })

  describe('[D3] negative guards + invariants (GREEN now, MUST stay GREEN — no shape-only heuristic regression)', () => {
    it('Revelation 19:1-7 stanzas[0][0] === "Аллэлуяа!" (legitimate body start unchanged)', () => {
      const data = read(PSALTER_TEXTS)
      expect(data['Revelation 19:1-7'].stanzas[0][0]).toBe('Аллэлуяа!')
    })

    it('Psalm 139:1-18 stanzas[0][0] === "I" (Roman-numeral part marker body start unchanged)', () => {
      const data = read(PSALTER_TEXTS)
      expect(data['Psalm 139:1-18'].stanzas[0][0]).toBe('I')
    })

    it('week-1.json SUN Lauds first psalm ref/title/default_antiphon are invariant (antiphon routing untouched)', () => {
      const week1 = read(WEEK1)
      const firstPsalm = week1.days.SUN.lauds.psalms[0]
      expect(firstPsalm.ref).toBe(PS63_REF)
      expect(firstPsalm.title).toBe(PS63_TITLE)
      expect(firstPsalm.default_antiphon).toBe(PS63_DEFAULT_ANTIPHON)
    })
  })
})
