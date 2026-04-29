// FR-161 R-9.D — shared page-header noise filter for the auto-reconciler
// and the per-week processor.
//
// `pdftotext -layout` emits the running page header (e.g. "Даваа гарагийн
// орой            85") in the middle of a column stream when a psalm
// spans the page boundary. Both the alignment pass (auto-reconciler) and
// the builder window match (process-week-phrases) need to skip these
// headers so a wrap pair sitting on either side of the boundary is
// treated as one logical sequence.
//
// Heuristics (Mongolian psalter PDF):
//   1. Weekday + part-of-day phrase + trailing book-page number:
//      "<Weekday> гарагийн (өглөө|орой|...)  <NN>"
//   2. "<NN> N дугаар/дүгээр/дэх/дахь долоо хоног" (week marker)
//   3. Bare 2-3 digit number flanked by tabs / large whitespace.

const PAGE_HEADER_WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба']
const WEEKDAY_HEADER_RE = new RegExp(
  `^\\s*(?:${PAGE_HEADER_WEEKDAYS.join('|')})\\s+гарагийн\\s+\\S+\\s+\\d{1,4}\\s*$`,
)
const NUMBERED_WEEK_HEADER_RE = /^\s*\d{1,4}\s+\d+\s+(?:дугаар|дүгээр|дэх|дахь)\s+долоо\s+хоног/
const BARE_PAGE_NUMBER_RE = /^\s*\d{1,4}\s*$/

export function isPageHeaderLine(text) {
  const t = (text || '').trim()
  if (!t) return false
  if (WEEKDAY_HEADER_RE.test(t)) return true
  if (NUMBERED_WEEK_HEADER_RE.test(t)) return true
  if (BARE_PAGE_NUMBER_RE.test(t)) return true
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
