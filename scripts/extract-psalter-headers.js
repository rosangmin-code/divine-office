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

  const refs = {}
  let headerCount = 0
  let patristicCount = 0
  let ntCount = 0

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

    // Capture the preface block: from windowStart up to and including attribLineIdx,
    // collapsing whitespace.
    const block = lines.slice(windowStart, attribLineIdx + 1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')

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
  console.log(`[extract] OUT: ${OUT.replace(REPO_ROOT + '/', '')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
