#!/usr/bin/env node
/**
 * verify-psalter-stanzas.js
 *
 * Compares the stanza/line structure of each entry in
 * src/data/loth/psalter-texts.json against the PDF plain-text extract
 * (psalter_full_text.txt). It is a SUSPECT FINDER, not an auto-fixer:
 * it emits a review JSON listing entries where the JSON body line count
 * diverges meaningfully from what appears in the PDF text, where doxology
 * presence disagrees, or where the JSON body looks truncated.
 *
 * Limitations (deliberate):
 *  - The PDF plain text loses indent/column structure; it is only a coarse
 *    proxy. False positives are expected — this is an "open this entry next"
 *    list, not a correction set.
 *  - Many short readings / antiphons share psalm refs; we always anchor on
 *    the FIRST occurrence of the Mongolian header, which is fine because
 *    psalm bodies are reused verbatim.
 *  - English ↔ Mongolian book mapping covers what currently appears in
 *    psalter-texts.json (18 books). New books will land in `unmatched`.
 *
 * Read-only. Emits scripts/out/psalter-stanza-review.json.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TEXTS = path.join(ROOT, 'src/data/loth/psalter-texts.json')
const PDF_TXT = path.join(ROOT, 'psalter_full_text.txt')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT = path.join(OUT_DIR, 'psalter-stanza-review.json')

const BOOK_MAP = {
  Psalm: ['Дуулал'],
  Daniel: ['Даниел'],
  Revelation: ['Илчлэл'],
  Tobit: ['Тобит'],
  Colossians: ['Колоссай'],
  '1 Peter': ['1 Петр'],
  '2 Peter': ['2 Петр'],
  Ephesians: ['Эфэс', 'Эфес'],
  Philippians: ['Филиппой', 'Филипп'],
  '1 Chronicles': ['1 Шастирын дээд', '1Шастирын дээд'],
  '1 Samuel': ['1 Самуел'],
  Deuteronomy: ['Дэд хууль', 'Хууль'],
  Exodus: ['Гэтлэл'],
  Ezekiel: ['Езекиел', 'Хэзеки', 'Иезекиел'],
  Habakkuk: ['Хабаккук'],
  Isaiah: ['Исаиа'],
  Jeremiah: ['Иеремиа', 'Иеремия'],
  Judith: ['Иудит'],
  Sirach: ['Сирак'],
  Wisdom: ['Мэргэн ухаан'],
}

const NEXT_REF_BOOKS = Object.values(BOOK_MAP).flat()
const NEXT_REF_RE = new RegExp(
  '^(?:' +
    NEXT_REF_BOOKS.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
    ')\\s+\\d+(?::|\\s|$)',
)

const NOISE_RES = [
  /^\d+$/,
  /^\d+\s+\d+\s*(дүгээр|дугаар)\s+долоо хоног$/,
  /^\d+\s*(дүгээр|дугаар)\s+долоо хоног\s+\d+$/,
  /^\d+\s*(дүгээр|дугаар)\s+долоо хоног$/,
  /^(Ням|Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба) гара(гийн|гын) (өглөө|орой)$/,
  /^(Өглөөний|Оройн) даатгал залбирал$/,
]

const ENDERS = new Set([
  'Уншлага',
  'Магтаал',
  'Магтуу',
  'Дууллыг төгсгөх залбирал',
])
const ENDER_RES = [
  /^Шад (дуулал|магтаал)/,
  /^Урих дуудлага$/,
  /^Эцэг, Хүү, Ариун Сүнсэнд жавхланг/,
]

function normalizeRefForMatch(s) {
  return s.replace(/\s+/g, ' ').trim().replace(/,\s*/g, ',')
}

function isNoise(line) {
  const t = line.trim()
  if (t === '') return false
  return NOISE_RES.some(re => re.test(t))
}

function isEnder(line) {
  const t = line.trim()
  if (ENDERS.has(t)) return true
  return ENDER_RES.some(re => re.test(t))
}

function isNextRefHeader(line, currentMnHeads) {
  const t = normalizeRefForMatch(line)
  if (!NEXT_REF_RE.test(t)) return false
  // ignore the current entry's own header repeats (rare but possible)
  return !currentMnHeads.some(h => normalizeRefForMatch(h) === t)
}

function toMongolianRefs(engRef) {
  for (const [eng, mns] of Object.entries(BOOK_MAP)) {
    if (engRef === eng || engRef.startsWith(eng + ' ')) {
      const tail = engRef.slice(eng.length)
      return mns.map(mn => (mn + tail).trim())
    }
  }
  return []
}

function expandVerseSet(spec) {
  // "26-27, 29, 34-41" → Set([26,27,29,34..41])
  const out = new Set()
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?[a-zа-яА-ЯбВвАа]?$/)
    if (!m) continue
    const start = +m[1]
    const end = m[2] ? +m[2] : start
    for (let i = start; i <= end; i++) out.add(i)
  }
  return out
}

function setEq(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

function findHeader(pdfLines, mnRef) {
  const target = normalizeRefForMatch(mnRef)
  // 1) exact match
  for (let i = 0; i < pdfLines.length; i++) {
    if (normalizeRefForMatch(pdfLines[i]) === target) return { idx: i, kind: 'exact' }
  }
  const m = target.match(/^(.+?)\s+(\d+)(?::(.+))?$/)
  if (m) {
    const prefix = `${m[1]} ${m[2]}`
    const targetVerseSet = m[3] ? expandVerseSet(m[3]) : null
    // 2) verse-set equivalence: same book+chapter, equivalent verse set
    //    (e.g. JSON "3:26-27, 29, 34-41" ↔ PDF "3:26, 27, 29, 34-41")
    if (targetVerseSet && targetVerseSet.size > 0) {
      const re = new RegExp(
        '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':(.+)$',
      )
      for (let i = 0; i < pdfLines.length; i++) {
        const t = normalizeRefForMatch(pdfLines[i])
        const mv = t.match(re)
        if (!mv) continue
        const pdfSet = expandVerseSet(mv[1])
        if (pdfSet.size > 0 && setEq(pdfSet, targetVerseSet))
          return { idx: i, kind: 'verse-set' }
      }
    }
    // 3) chapter-prefix match: PDF often drops the verse range,
    //    e.g. JSON "Дуулал 149:1-9" → PDF "Дуулал 149"
    for (let i = 0; i < pdfLines.length; i++) {
      const t = normalizeRefForMatch(pdfLines[i])
      if (t === prefix) return { idx: i, kind: 'chapter-only' }
    }
    // 4) chapter-with-suffix match: e.g. PDF "Дуулал 19А" / "Дуулал 19Б"
    //    (one-letter Cyrillic suffix marking psalm sub-section)
    const reSuffix = new RegExp(
      '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[А-Я]$',
    )
    for (let i = 0; i < pdfLines.length; i++) {
      if (reSuffix.test(normalizeRefForMatch(pdfLines[i])))
        return { idx: i, kind: 'chapter-suffix' }
    }
    // 5) chapter-with-different-verse-range: same book+chapter, any tail
    //    (helps when JSON splits one psalm into two refs like 16:1-6 / 16:7-11)
    const re = new RegExp(
      '^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':',
    )
    for (let i = 0; i < pdfLines.length; i++) {
      if (re.test(normalizeRefForMatch(pdfLines[i]))) return { idx: i, kind: 'chapter-fuzzy' }
    }
  }
  return null
}

function extractBody(pdfLines, headerIdx, currentMnHeads) {
  const out = []
  for (let i = headerIdx + 1; i < pdfLines.length; i++) {
    const raw = pdfLines[i]
    const t = raw.trim()
    if (isEnder(raw)) break
    if (isNextRefHeader(raw, currentMnHeads)) break
    if (isNoise(raw)) continue
    out.push(raw)
  }
  // Drop leading metadata: title (first non-empty), optional epigraph
  // (line ending with a parenthetical citation).
  let dropped = 0
  while (out.length && dropped < 3) {
    const first = out[0].trim()
    if (first === '') { out.shift(); continue }
    out.shift()
    dropped++
    if (!/\)\s*\.?\s*$/.test(first)) break
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop()
  return out
}

function countBody(lines) {
  return lines.filter(l => l.trim() !== '').length
}

function jsonLineCount(entry) {
  return entry.stanzas.reduce((s, st) => s + st.length, 0)
}

function isDoxologyRubric(line) {
  // "Эцэг, Хүү, Ариун Сүнсэнд жавхланг…" — the standard Gloria Patri
  // *rubric* (one-line, ends with ellipsis or trailing dot+ellipsis).
  // Body doxology (Daniel 3 / Tobit) reads as a complete poetic stanza
  // and never ends with "…" on its first occurrence line.
  return /Эцэг.*Хүү.*Сүнс.*[……]\s*$/.test(line.trim())
}

function hasTrinitarianDoxology(lines) {
  // True only when there is a doxology *body* (a line that mentions all
  // three persons but is NOT the standalone rubric ending in "…").
  return lines.some(l =>
    /Эцэг/.test(l) && /Хүү/.test(l) && /Сүнс/.test(l) && !isDoxologyRubric(l),
  )
}

function jsonHasTrinitarianDoxology(entry) {
  return entry.stanzas.some(s => hasTrinitarianDoxology(s))
}

function main() {
  const texts = JSON.parse(fs.readFileSync(TEXTS, 'utf-8'))
  const pdfLines = fs.readFileSync(PDF_TXT, 'utf-8').split('\n')

  const review = []
  const unmatched = []

  for (const [engRef, entry] of Object.entries(texts)) {
    if (!entry.stanzas || entry.stanzas.length === 0) continue

    const mnCandidates = toMongolianRefs(engRef)
    if (mnCandidates.length === 0) {
      unmatched.push({ engRef, reason: 'no Mongolian book mapping' })
      continue
    }

    let header = null
    let mnRef = null
    for (const cand of mnCandidates) {
      header = findHeader(pdfLines, cand)
      if (header) { mnRef = cand; break }
    }
    if (!header) {
      unmatched.push({
        engRef,
        candidates: mnCandidates,
        reason: 'no header match in PDF text',
      })
      continue
    }
    const headerIdx = header.idx
    const matchKind = header.kind

    const body = extractBody(pdfLines, headerIdx, mnCandidates)
    const pdfCount = countBody(body)
    const jsonCount = jsonLineCount(entry)
    const diff = pdfCount - jsonCount

    const flags = []
    // line count divergence
    if (Math.abs(diff) >= 6) {
      flags.push(`line-diff:${diff >= 0 ? '+' : ''}${diff}`)
    } else if (Math.abs(diff) >= 3) {
      flags.push(`line-diff-minor:${diff >= 0 ? '+' : ''}${diff}`)
    }
    // doxology disagreement
    if (hasTrinitarianDoxology(body) && !jsonHasTrinitarianDoxology(entry)) {
      flags.push('pdf-has-doxology-json-missing')
    }
    if (!hasTrinitarianDoxology(body) && jsonHasTrinitarianDoxology(entry)) {
      flags.push('json-has-doxology-pdf-missing')
    }

    if (flags.length === 0) continue

    review.push({
      engRef,
      mnRef,
      matchKind,
      pdfHeaderLine: headerIdx + 1,
      jsonStanzas: entry.stanzas.length,
      jsonLines: jsonCount,
      pdfLines: pdfCount,
      diff,
      flags,
      pdfBodyTail: body.slice(-4).map(l => l.trim()),
      jsonBodyTail: entry.stanzas[entry.stanzas.length - 1].slice(-3),
    })
  }

  // Sort: most severe first (largest absolute diff), then doxology issues
  review.sort((a, b) => {
    const da = Math.abs(a.diff), db = Math.abs(b.diff)
    if (da !== db) return db - da
    return a.engRef.localeCompare(b.engRef)
  })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalEntries: Object.keys(texts).length,
        reviewCount: review.length,
        unmatchedCount: unmatched.length,
        review,
        unmatched,
      },
      null,
      2,
    ),
  )
  console.log(`wrote ${path.relative(ROOT, OUT)}`)
  console.log(`  total entries:       ${Object.keys(texts).length}`)
  console.log(`  flagged for review:  ${review.length}`)
  console.log(`  unmatched (skipped): ${unmatched.length}`)
}

main()
