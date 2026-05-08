#!/usr/bin/env node
/**
 * extract-psalter-headers.js — FR-160-C
 *
 * Walk parsed_data/full_pdf.txt and emit per-psalm header metadata
 * blocks that contain either:
 *   (a) a patristic preface — quote ending with "(Хэсихиус)" /
 *       "(Гэгээн Августин)" / "(Гэгээн Касиодор)" etc.
 *   (b) an NT typological citation — quote ending with "(Үйлс N:M)",
 *       "(Матай N:M)", "(Иохан N:M)", etc.
 *
 * Header position: the lines BETWEEN "Дуулал N" (psalm title) and
 * the first verse of the psalm body, where the page also displays
 * a red-coloured attribution.
 *
 * Output: scripts/out/psalter-headers-extract.json
 *   {refs: {<psalm-ref>: {patristic_preface | nt_typological,
 *                          text, page, evidence_line_range}}}
 *
 * NB: This is a scaffolding extractor that uses raw text patterns.
 * For final ship, output is reviewed against the canonical
 * psalter-texts.json catalog. Mismatches are reported.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const FULL_TXT = resolve(REPO_ROOT, 'parsed_data/full_pdf.txt')
const PSALTER_TEXTS = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
// F-X9 fix A: title catalog sources (week-N.json + propers) for prefix-strip.
// We walk these JSONs recursively and collect every {ref:"Psalm N:M-K", title}
// pair so the extractor can strip the title line(s) the PDF places between
// the `Дуулал N` anchor and the preface body.
const TITLE_SOURCE_FILES = [
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
const OUT = resolve(REPO_ROOT, 'scripts/out/psalter-headers-extract.json')

// FR-160-C extraction patterns. Patristic Fathers cited in the Mongolian
// LOTH PDF — discovered via grep audit of parsed_data/full_pdf.txt.
const PATRISTIC_FATHERS = [
  'Хэсихиус',
  'Августин',
  'Гэгээн Августин',
  'Касиодор',
  'Кассиодор',
  'Гэгээн Касиодор',
  'Гэгээн Кассиодор',
  'Арнобиус',
  'Кацен',
  'Ориген',
  'Жером',
  'Григориус',
]
const PATRISTIC_RE = new RegExp(
  `\\(((?:${PATRISTIC_FATHERS.join('|')}))\\)`,
  'u',
)

// NT books cited (typological psalm prefaces). Discovered via comprehensive
// grep over parsed_data/full_pdf.txt — superset of the dispatch list.
// Ordering: multi-word entries (e.g. '1 Петр') and numbered prefixes ('1Кор')
// MUST precede their single-word counterparts so alternation matches the
// longer form first and never gets shadowed by a shorter prefix.
const NT_BOOKS = [
  '1 Петр', '2 Петр',
  '1Кор', '2Кор', '1Иохан', '2Иохан', '1Тимот', '2Тимот',
  'Үйлс', 'Матай', 'Иохан', 'Иох', 'Лук', 'Марк',
  'Ром', 'Еврей', 'Ефес', 'Галат', 'Илчлэл', 'Филиппой',
  'Тит', 'Иаков', 'Колосси', 'Үзэгдэл',
  'Иуда', 'Филемон',
]
// Optional `харьцуул.\s+` (Mongolian "compare with") cf-style prefix — appears
// in some prefaces (e.g. parsed_data/full_pdf.txt:13223, 14790). The prefix
// is consumed but excluded from the captured citation.
const NT_RE = new RegExp(
  `\\((?:харьцуул\\.\\s+)?((?:${NT_BOOKS.join('|')})\\s*\\d+(?:[:.]\\d+(?:[,-]\\s*\\d+)*)?)\\)`,
  'u',
)

// F-X9 fix A helpers ---------------------------------------------------------

/**
 * Escape a string for use inside a RegExp literal — used for stripping the
 * trailing `(${attribValue})` literal from a captured preface block.
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Normalize whitespace (collapse runs to single space) and trim.
 * Title strings in week-N.json may contain non-breaking spaces or stray
 * tabs; canonical compare uses whitespace-collapsed form.
 */
function normWS(s) {
  return s.trim().replace(/\s+/g, ' ')
}

/**
 * Recursively walk a JSON tree and collect every object with both `ref`
 * and `title` string fields. Returns array of {ref, title} pairs.
 */
function collectRefTitlePairs(node, out) {
  if (Array.isArray(node)) {
    for (const item of node) collectRefTitlePairs(item, out)
    return
  }
  if (node && typeof node === 'object') {
    if (typeof node.ref === 'string' && typeof node.title === 'string') {
      out.push({ ref: node.ref, title: node.title })
    }
    for (const key of Object.keys(node)) collectRefTitlePairs(node[key], out)
  }
}

/**
 * Build psalmNum -> [titles] map by walking week-N.json + propers.
 *
 * Handles both Psalm refs (`Psalm N:M-K`) and bare-number entries.
 * Same psalm can have different titles across pages (e.g. Psalm 51 has
 * different patristic prefaces on different pages but the same psalm
 * "title" string), so we store distinct strings per psalm number.
 */
async function loadPsalmTitlesByNumber() {
  const titlesByNum = new Map() // psalmNum -> Set<title>
  for (const rel of TITLE_SOURCE_FILES) {
    const path = resolve(REPO_ROOT, rel)
    let raw
    try {
      raw = await readFile(path, 'utf8')
    } catch (e) {
      // File optional; log but don't fail — propers may not all exist.
      console.warn(`[extract] title source missing: ${rel}`)
      continue
    }
    let json
    try {
      json = JSON.parse(raw)
    } catch (e) {
      console.warn(`[extract] title source not JSON: ${rel}`)
      continue
    }
    const pairs = []
    collectRefTitlePairs(json, pairs)
    for (const { ref, title } of pairs) {
      const m = ref.match(/^Psalm\s+(\d+)/)
      if (!m) continue
      const num = parseInt(m[1], 10)
      const norm = normWS(title)
      if (!norm) continue
      if (!titlesByNum.has(num)) titlesByNum.set(num, new Set())
      titlesByNum.get(num).add(norm)
    }
  }
  return titlesByNum
}

/**
 * Strip canonical title prefix from a captured preface block.
 *
 * Tries every candidate title for this psalm number, longest first, and
 * strips the first one that matches the start of `text` (whitespace-
 * normalized). Optional trailing period after the title is also consumed
 * (PDF often adds `.` after the title line; week-N.json titles do not
 * carry it). Returns the stripped string. If no candidate matches,
 * returns the input unchanged.
 */
function stripTitlePrefix(text, candidateTitles) {
  if (!candidateTitles || candidateTitles.length === 0) return text
  // Longest first — prevents a shorter title from shadowing a longer one
  // when the same psalm has multiple title variants.
  const sorted = [...candidateTitles].sort((a, b) => b.length - a.length)
  for (const t of sorted) {
    const norm = normWS(t)
    if (text.startsWith(norm)) {
      let rest = text.slice(norm.length)
      // Consume optional trailing punctuation+whitespace between title and body.
      rest = rest.replace(/^[\s.]+/, '')
      return rest
    }
  }
  return text
}

/**
 * Position-based fallback when canonical title lookup misses.
 *
 * Some psalms have title text rendered in the PDF but lack a `title`
 * field in week-N.json/propers (data gap; e.g. Psalm 119:105-112 page
 * 167 has the PDF title "Тэнгэрбурханы энэрэл хайрын тухай бясалгал"
 * but no JSON title). The audit caught these as "near-match" title-dup
 * (7/77) which the strict canonical strip cannot reach.
 *
 * Heuristic: take the first PDF line at windowStart. If it does NOT
 * contain the attribution literal (i.e. it's not the attribLine itself
 * for short prefaces) AND the captured block contains content beyond
 * that line (i.e. there IS body following), strip it as a title.
 *
 * This is intentionally conservative — only fires when canonical lookup
 * already failed AND structural signals point at a title-shaped first
 * line. Over-strip risk is bounded because the renderer guard (Option B,
 * task #373) provides defense-in-depth on any residual title-dup.
 *
 * Returns the input unchanged when the first line is missing/empty or
 * looks like body content (contains attribution literal, or block is
 * single-line).
 */
function fallbackStripFirstPdfLine(text, rawPdfLines, attribValue) {
  // Find the first non-empty trimmed line.
  let firstIdx = -1
  for (let k = 0; k < rawPdfLines.length; k++) {
    if (rawPdfLines[k].trim().length > 0) {
      firstIdx = k
      break
    }
  }
  if (firstIdx < 0) return text
  const firstLine = rawPdfLines[firstIdx].trim().replace(/\s+/g, ' ')
  if (!firstLine) return text
  // Don't strip if the first line itself carries the attribution — that
  // would erase the entire preface.
  if (firstLine.includes(`(${attribValue})`)) return text
  if (firstLine.includes(`(харьцуул. ${attribValue})`)) return text
  // Don't strip if the captured block IS just the first line — nothing
  // would remain.
  if (text === firstLine) return text
  if (!text.startsWith(firstLine)) return text
  let rest = text.slice(firstLine.length)
  rest = rest.replace(/^[\s.]+/, '')
  // Don't apply fallback if stripping leaves an empty preface body —
  // signals the heuristic guessed wrong on a single-piece preface.
  if (!rest) return text
  return rest
}

/**
 * Strip the trailing `(attribValue)` literal (and optional `.`) from a
 * captured preface block.
 *
 * Handles the optional `харьцуул.\s+` cf-style prefix that the NT regex
 * (above) consumes from inside the parens but excludes from the captured
 * `attribValue`. Returns the stripped string with trailing whitespace
 * trimmed. If no match, returns the input unchanged.
 */
function stripAttributionSuffix(text, attribValue) {
  const escAttrib = escapeRegExp(attribValue)
  const pat = new RegExp(
    `\\s*\\((?:харьцуул\\.\\s+)?${escAttrib}\\)\\.?\\s*$`,
    'u',
  )
  return text.replace(pat, '').trimEnd()
}

// ---------------------------------------------------------------------------

function findPagesForLines(lines) {
  // full_pdf.txt has lines that are pure integers acting as page markers
  // (LEFT/RIGHT half of 2-up, "2N-2"/"2N-1"). Build line-index → page map.
  const pageOfLine = new Array(lines.length).fill(-1)
  let currentPage = -1
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(\d+)\s*$/)
    if (m && parseInt(m[1], 10) <= 1000) {
      // accept reasonable book-page ints; running headers like "64\t\t1 дүгээр..."
      // are skipped because they have non-digit content.
      currentPage = parseInt(m[1], 10)
    }
    pageOfLine[i] = currentPage
  }
  return pageOfLine
}

async function main() {
  const txt = await readFile(FULL_TXT, 'utf8')
  const lines = txt.split('\n')
  const pageOfLine = findPagesForLines(lines)

  // F-X9 fix A: load canonical titles from week-N.json + propers so the
  // captured preface_text can be stripped of the title prefix the PDF
  // places between the `Дуулал N` anchor and the patristic/NT body.
  const titlesByNum = await loadPsalmTitlesByNumber()

  const refs = {}
  let headerCount = 0
  let patristicCount = 0
  let ntCount = 0
  // F-X9 fix A diagnostics: how often the title-prefix / attribution-suffix
  // strip actually fired. Surfaces when the canonical title catalog is out
  // of sync with PDF titles (would silently miss strip → catalog regress).
  let titleStrippedCount = 0
  let attributionStrippedCount = 0

  // Walk: find "Дуулал N" or "Магтаал N" / canticle header lines
  for (let i = 0; i < lines.length; i++) {
    // R1: anchor matches plain `Дуулал N` and verse-range variants
    // (`Дуулал N:m-n`, `Дуулал N: m-n`, `Дуулал N:m-n, p-q`). The verse
    // range suffix is captured separately so the catalog builder can
    // attach the block to the matching canonical key (`Psalm N:m-n`) when
    // the same psalm appears under multiple verse-range keys with
    // different prefaces.
    const titleMatch = lines[i].match(
      /^\s*Дуулал\s+(\d+)((?::\s*\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)?)\s*$/,
    )
    if (!titleMatch) continue
    const psalmNum = parseInt(titleMatch[1], 10)
    // Normalize captured verse-range suffix to canonical key form
    // (no space after `:`, single space after `,`). Empty string for
    // plain `Дуулал N` anchors — builder fans out to all matching keys.
    const verseRange = (titleMatch[2] || '')
      .replace(/^:\s*/, '')
      .trim()
      .split(/\s*,\s*/)
      .filter(Boolean)
      .join(', ')

    // Look ahead up to 15 lines to find a patristic/NT attribution
    const windowStart = i + 1
    const windowEnd = Math.min(i + 16, lines.length)
    let attribLineIdx = -1
    let attribKind = null
    let attribValue = null
    for (let j = windowStart; j < windowEnd; j++) {
      const line = lines[j]
      const pm = PATRISTIC_RE.exec(line)
      if (pm) {
        attribLineIdx = j
        attribKind = 'patristic_preface'
        attribValue = pm[1]
        break
      }
      const nm = NT_RE.exec(line)
      if (nm) {
        attribLineIdx = j
        attribKind = 'nt_typological'
        attribValue = nm[1]
        break
      }
    }
    if (attribLineIdx < 0) continue

    headerCount++
    if (attribKind === 'patristic_preface') patristicCount++
    else ntCount++

    // Capture the preface block: from windowStart (line after `Дуулал N`)
    // up to and including attribLineIdx (the line carrying `(attribValue)`),
    // collapsing whitespace.
    //
    // F-X9 latent bug (origin commit 155f17a, 2026-04-27): this raw block
    // included BOTH the PDF title line(s) at the start AND the literal
    // `(attribValue)` at the end. The renderer (`psalm-block.tsx`) emits
    // `psalm.title` and `({attribValue})` separately, so storing them in
    // preface_text caused both to appear twice in the rendered UI
    // (audit #362: 67/77 title-dup + 74/77 attribution-dup).
    //
    // Fix: strip the canonical title prefix (looked up from
    // psalter/week-N.json + propers/*.json) and the trailing
    // `(attribValue)` literal. The strip is purely string-manipulation on
    // the captured block; the PDF text itself is untouched.
    const rawPdfLines = lines.slice(windowStart, attribLineIdx + 1)
    const rawBlock = rawPdfLines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')

    const candidateTitles = Array.from(titlesByNum.get(psalmNum) || [])
    let block = stripTitlePrefix(rawBlock, candidateTitles)
    if (block !== rawBlock) {
      titleStrippedCount++
    } else {
      // Canonical strip missed — try position-based fallback (covers the
      // 7 audit "near-match" cases where the PDF carries a title but the
      // JSON sources don't store it as a `title` field).
      const fb = fallbackStripFirstPdfLine(rawBlock, rawPdfLines, attribValue)
      if (fb !== rawBlock) {
        block = fb
        titleStrippedCount++
      }
    }
    const blockBeforeAttribStrip = block
    block = stripAttributionSuffix(block, attribValue)
    if (block !== blockBeforeAttribStrip) attributionStrippedCount++

    const page = pageOfLine[i]
    const refKey = `Psalm ${psalmNum}`
    if (!refs[refKey]) refs[refKey] = []
    refs[refKey].push({
      psalmNumber: psalmNum,
      verseRange,
      kind: attribKind,
      attribution: attribValue,
      preface_text: block,
      page,
      evidence_line_range: [windowStart + 1, attribLineIdx + 1],
    })
  }

  // Cross-reference with psalter-texts.json for canonical key matching
  const psalterRaw = await readFile(PSALTER_TEXTS, 'utf8')
  const psalter = JSON.parse(psalterRaw)
  const catalogKeys = Object.keys(psalter)
  const refToCanonicalKeys = {}
  for (const refKey of Object.keys(refs)) {
    const psNum = refs[refKey][0].psalmNumber
    const matching = catalogKeys.filter((k) => k.startsWith(`Psalm ${psNum}:`) || k === `Psalm ${psNum}`)
    refToCanonicalKeys[refKey] = matching
  }

  const summary = {
    totalHeaderBlocks: headerCount,
    patristicCount,
    ntCount,
    distinctPsalmRefs: Object.keys(refs).length,
    refs,
    refToCanonicalKeys,
  }

  await writeFile(OUT, JSON.stringify(summary, null, 2), 'utf8')
  console.log(`[extract] header blocks: ${headerCount} (patristic ${patristicCount} + NT ${ntCount})`)
  console.log(`[extract] distinct psalms: ${Object.keys(refs).length}`)
  console.log(
    `[extract] F-X9 strip: title-prefix ${titleStrippedCount}/${headerCount}, ` +
      `attribution-suffix ${attributionStrippedCount}/${headerCount}`,
  )
  console.log(`[extract] OUT: ${OUT.replace(REPO_ROOT + '/', '')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
