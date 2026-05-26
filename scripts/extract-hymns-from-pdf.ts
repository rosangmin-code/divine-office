/**
 * extract-hymns-from-pdf.ts — Re-extract hymn bodies directly from the
 * canonical source `parsed_data/full_pdf.txt` (GOAL #32-sub-2).
 *
 * BACKGROUND: the legacy `extract-hymns.ts` sourced hymn bodies from the
 * external `divine-office-reader` project, whose PDF parser mis-segmented
 * hymn boundaries (over-capture into the next hymn, wrong-region grabs,
 * truncation). Audit #33 found 28 confirmed + 1 needs-review (~23% of 122)
 * contaminated hymns. The reader project is also no longer on disk.
 *
 * This script makes `full_pdf.txt` the single source of truth:
 *   1. Walk the hymn BODY region by sequential "<N>. <title>" headers,
 *      verified against `hymns-index.json` titles (the same anchor the
 *      audit used to reach 122/122 coverage).
 *   2. For each hymn N, take the RAW block (header+1 .. next header) and
 *      feed it to the EXISTING `parseHymn()` cleanup pipeline — identical
 *      cleanup to how the current bodies were produced, so the ~93 clean
 *      hymns reproduce byte-for-byte while the 29 contaminated ones get
 *      correctly-bounded content.
 *   3. `page` = the page on which the header sits.
 *
 * Modes:
 *   (default / --dry)  Build candidate + diff vs current hymns.json, print
 *                      which hymn numbers changed. Writes nothing to the
 *                      tracked data file. Candidate -> scripts/out/.
 *   --write            Overwrite src/data/loth/ordinarium/hymns.json with
 *                      the re-extracted result.
 *
 * Read-only on full_pdf.txt. Run: node --experimental-strip-types scripts/extract-hymns-from-pdf.ts [--write]
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseHymn } from './parsers/hymn-parser.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const HYMNS_INDEX = path.join(ROOT, 'src/data/loth/ordinarium/hymns-index.json')
const OUTPUT = path.join(ROOT, 'src/data/loth/ordinarium/hymns.json')
const OUT_DIR = path.join(ROOT, 'scripts/out')

interface IndexEntry { number: number; title: string }
interface HymnEntry { title: string; text: string; page?: number }

const norm = (s: string): string =>
  (s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/**
 * Strip PDF page-break sequences from a hymn's raw body lines.
 *
 * A page break in `full_pdf.txt` renders as a maximal run of
 * {blank | bare page-number | "Магтуу" running-header | form-feed} lines.
 * Such a run is removed ENTIRELY (including its blank lines) so a stanza
 * split across a page boundary merges back together — otherwise the
 * page-break blank orphans the pre-break line into a <2-line segment that
 * `parseHymn` discards (the #41 "1. Есүс мандан ирсэн" bug).
 *
 * A standalone blank NOT adjacent to page-break noise is a genuine in-page
 * stanza separator and is preserved.
 */
function stripPageBreaks(raw: string[]): string[] {
  const isBlank = (l: string) => l.replace(/[\f\r ]/g, '').trim() === ''
  const isPageNum = (l: string) => /^\d{1,4}$/.test(l.trim())
  const isMagtuu = (l: string) => l.trim() === 'Магтуу'
  const isFormFeed = (l: string) => /\f/.test(l)
  const breakish = (l: string) => isBlank(l) || isPageNum(l) || isMagtuu(l) || isFormFeed(l)
  const out: string[] = []
  for (let i = 0; i < raw.length;) {
    if (breakish(raw[i])) {
      let j = i
      let hasMarker = false
      while (j < raw.length && breakish(raw[j])) {
        if (isPageNum(raw[j]) || isMagtuu(raw[j]) || isFormFeed(raw[j])) hasMarker = true
        j++
      }
      if (hasMarker) { i = j; continue }       // drop whole page-break run
      out.push('')                              // genuine stanza blank → one blank
      i = j
      continue
    }
    out.push(raw[i]); i++
  }
  return out
}

function main(): void {
  const write = process.argv.includes('--write')
  const verify = process.argv.includes('--verify')
  const lines = fs.readFileSync(FULL_PDF, 'utf8').split(/\r?\n/)
  const index: { hymns: IndexEntry[] } = JSON.parse(fs.readFileSync(HYMNS_INDEX, 'utf8'))
  const current: Record<string, HymnEntry> = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'))
  const knownTitles = new Set<string>(index.hymns.map(h => h.title))
  const titleByNum: Record<string, string> = {}
  for (const h of index.hymns) titleByNum[String(h.number)] = h.title

  // page map: line index -> page number (bare-integer lines mark page breaks)
  const pageAt: (number | null)[] = new Array(lines.length).fill(null)
  let cur: number | null = null
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (/^\d{1,4}$/.test(t)) cur = parseInt(t, 10)
    pageAt[i] = cur
  }

  const isHeader = (line: string, expected: number): boolean => {
    const m = line.match(/^(\d{1,3})\.\s+(.+)$/u)
    if (!m || +m[1] !== expected) return false
    const want = norm(titleByNum[String(expected)] || '')
    const got = norm(m[2])
    if (!want) return false
    const k = Math.min(want.length, got.length, 12)
    return got.startsWith(want.slice(0, k)) || want.startsWith(got.slice(0, k))
  }

  // body-region start: first "1. <title1>" at/after line 30000
  const t1 = norm(`1. ${titleByNum['1']}`)
  let start = -1
  for (let i = 30000; i < lines.length; i++) {
    if (norm(lines[i]) === t1) { start = i; break }
  }
  if (start < 0) throw new Error('body-region start not found')

  const out: Record<string, HymnEntry> = {}
  let expected = 1
  const headerLineByNum: Record<string, number> = {}
  // First pass: locate every hymn header line in the body region.
  for (let i = start; i < lines.length && expected <= 122; i++) {
    if (isHeader(lines[i], expected)) { headerLineByNum[String(expected)] = i; expected++ }
  }
  const located = Object.keys(headerLineByNum).length

  for (let n = 1; n <= 122; n++) {
    const num = String(n)
    const hdr = headerLineByNum[num]
    const title = titleByNum[num]
    if (hdr == null) { out[num] = { title, text: current[num]?.text ?? '', page: current[num]?.page }; continue }
    const nextHdr = headerLineByNum[String(n + 1)] ?? lines.length
    // title-continuation: part of index title NOT on the header line (wrapped)
    const headerPart = norm(lines[hdr].replace(/^\d{1,3}\.\s+/, ''))
    const fullTitle = norm(title)
    const remainder = fullTitle.startsWith(headerPart) ? fullTitle.slice(headerPart.length).trim() : ''
    const rawLines: string[] = []
    let skippingCont = remainder.length > 0
    for (let i = hdr + 1; i < nextHdr; i++) {
      if (skippingCont) {
        const nl = norm(lines[i])
        // Skip a PDF line-wrapped title tail (e.g. "магтаал" wrapped off
        // "13. ... гуйсан") — but NOT a parenthetical subtitle like
        // "(Adeste fideles)" that the index title happens to include; those
        // are real body lines that parseHymn keeps.
        if (nl && !lines[i].trim().startsWith('(') && remainder.startsWith(nl)) continue
        skippingCont = false
      }
      rawLines.push(lines[i])
    }
    const parsed = parseHymn(stripPageBreaks(rawLines).join('\n'), { knownTitles })
    out[num] = { title, text: parsed.value?.text ?? '', page: pageAt[hdr] ?? current[num]?.page }
  }

  // diff vs current. CONTENT-AWARE: a hymn is a *real* change only when its
  // whitespace-normalized text OR page differs. Page-break blank-line cosmetics
  // (the re-extraction merges page-break runs) are NOT real changes — keeping
  // current there honors AC2 (the ~93 clean hymns stay byte-identical) and
  // avoids churning the data file with non-semantic whitespace diffs.
  const ncontent = (s: string) => (s || '').split(/\s+/).filter(Boolean).join(' ')
  const realChanged: number[] = []
  const wsOnly: number[] = []
  const emptied: number[] = []
  const merged: Record<string, HymnEntry> = {}
  for (let n = 1; n <= 122; n++) {
    const num = String(n)
    const a = current[num] || ({} as HymnEntry), b = out[num]
    const contentDiff = ncontent(a.text || '') !== ncontent(b.text || '')
    const pageDiff = (a.page ?? null) !== (b.page ?? null)
    if (contentDiff || pageDiff) { realChanged.push(n); merged[num] = b }
    else {
      merged[num] = a // keep current byte-for-byte (AC2)
      if ((a.text || '') !== (b.text || '')) wsOnly.push(n)
    }
    if (!(b.text || '').trim()) emptied.push(n)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, 'hymns-reextract-candidate.json'), JSON.stringify(out, null, 2) + '\n')

  console.log('=== extract-hymns-from-pdf ===')
  console.log('source:', path.relative(ROOT, FULL_PDF))
  console.log('body-region start line:', start + 1, '| headers located:', located, '/122')
  console.log('REAL content/page changes (', realChanged.length, '):', realChanged.join(','))
  console.log('whitespace-only re-extract diffs kept-as-current (', wsOnly.length, '):', wsOnly.join(','))
  console.log('empty-body hymns (', emptied.length, '):', emptied.join(','))

  if (verify) {
    // NFR-009e regression guard (local — needs the gitignored full_pdf.txt):
    // re-extraction must agree with committed hymns.json on whitespace-
    // normalized content + page for every hymn. Any drift = re-introduced
    // title<->body contamination (over-capture / truncation / wrong-region).
    if (realChanged.length === 0) {
      console.log('verify: OK — all 122 hymn bodies/pages agree with full_pdf.txt re-extraction')
      process.exit(0)
    }
    console.error('verify: FAIL — ' + realChanged.length + ' hymn(s) drift from full_pdf.txt:', realChanged.join(','))
    process.exit(3)
  }

  if (write) {
    fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2) + '\n')
    console.log('WROTE', path.relative(ROOT, OUTPUT), '— applied', realChanged.length, 'real changes, kept', 122 - realChanged.length, 'current')
  } else {
    console.log('(dry run — candidate at scripts/out/hymns-reextract-candidate.json; pass --write to apply content-aware merge)')
  }
}

main()
