// FR-161 R-9.D / R-9.C — shared noise filter for the auto-reconciler
// and the per-week processor.
//
// `pdftotext -layout` emits two classes of mid-body noise that block
// the line-by-line aligner:
//
//   1. Page-header running text — printed at the top of every PDF
//      page when a psalm spans a boundary. Patterns (R-9.D):
//        a. "<Weekday> гарагийн (өглөө|орой|...)  <NN>"
//           e.g. "Даваа гарагийн орой            85"
//        b. "<NN> N дугаар/дүгээр/дэх/дахь долоо хоног"
//           (week marker with leading book page)
//        c. Bare 2-4 digit number on its own line.
//
//   2. Section-title tokens — single-word section dividers printed
//      mid-page when a section transition occurs (R-9.C). These appear
//      INSIDE psalm body extractor streams and trip alignment:
//        - "Магтаал" (Canticle / Praise title)
//        - "Уншлага" (Short reading title)
//        - "Шад дуулал" / "Шад магтаал" (Antiphon-psalm / -canticle marker)
//        - "Дууллыг төгсгөх залбирал" (Concluding-prayer title)
//      Filtered ONLY when the title stands ALONE on the line (no body
//      text alongside) — a body verse like "Магтаалыг өргөгтүн" must
//      remain visible.

const PAGE_HEADER_WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба']
const WEEKDAY_HEADER_RE = new RegExp(
  `^\\s*(?:${PAGE_HEADER_WEEKDAYS.join('|')})\\s+гарагийн\\s+\\S+\\s+\\d{1,4}\\s*$`,
)
const NUMBERED_WEEK_HEADER_RE = /^\s*\d{1,4}\s+\d+\s+(?:дугаар|дүгээр|дэх|дахь)\s+долоо\s+хоног/
const BARE_PAGE_NUMBER_RE = /^\s*\d{1,4}\s*$/

const SECTION_TITLE_TOKENS = [
  'Магтаал',
  'Уншлага',
  'Шад дуулал',
  'Шад магтаал',
  'Дууллыг төгсгөх залбирал',
]
// Multi-word entries match their internal whitespace flexibly (PDF
// occasionally introduces extra spaces between tokens of a title).
const SECTION_TITLE_RE = new RegExp(
  `^\\s*(?:${SECTION_TITLE_TOKENS.map((t) => t.replace(/\s+/g, '\\s+')).join('|')})\\s*$`,
)

export function isPageHeaderLine(text) {
  const t = (text || '').trim()
  if (!t) return false
  if (WEEKDAY_HEADER_RE.test(t)) return true
  if (NUMBERED_WEEK_HEADER_RE.test(t)) return true
  if (BARE_PAGE_NUMBER_RE.test(t)) return true
  if (SECTION_TITLE_RE.test(t)) return true
  return false
}

export function stripPageHeaders(lines) {
  return lines.filter((l) => !isPageHeaderLine(l))
}

/**
 * Filter page-header noise lines from each stanza of an extractor output
 * AND remap each stanza's `phrases[].lineRange` so they continue to point
 * at the (now contiguous) surviving lines.
 *
 * For each line index removed:
 *   - phrases entirely covering only that line are dropped
 *   - phrases whose `lineRange` straddles the removed line have the
 *     missing line elided (the wrap continues across the deleted noise)
 *
 * Stanzas that become entirely empty are dropped from the output.
 */
export function stripPageHeadersFromStanzas(stanzas) {
  const out = []
  for (const stanza of stanzas) {
    const survivors = [] // newIdx → originalIdx
    for (let i = 0; i < stanza.lines.length; i++) {
      if (!isPageHeaderLine(stanza.lines[i])) survivors.push(i)
    }
    if (survivors.length === 0) continue
    const oldToNew = new Map()
    survivors.forEach((origIdx, newIdx) => oldToNew.set(origIdx, newIdx))
    const newLines = survivors.map((i) => stanza.lines[i])
    const newPhrases = []
    for (const p of stanza.phrases || []) {
      const [oldS, oldE] = p.lineRange
      // Collect every original index inside the phrase that survived.
      const kept = []
      for (let i = oldS; i <= oldE; i++) {
        if (oldToNew.has(i)) kept.push(oldToNew.get(i))
      }
      if (kept.length === 0) continue
      newPhrases.push({ ...p, lineRange: [kept[0], kept[kept.length - 1]] })
    }
    out.push({ ...stanza, lines: newLines, phrases: newPhrases })
  }
  return out
}
