#!/usr/bin/env node
/**
 * verify-hymn-phrase-merge.js
 *
 * NFR-009m — phrase-merge CORRECTNESS guard for hymn rich.json files.
 *
 * Closes the detection gap diagnosed in
 * `docs/bug-reports/2026-06-30-magtuu-hymn-linebreak-phrase-heuristic.md`
 * (GOAL #4 / #1, X.897 + X.912). The МАГТУУ orphan recurred five times
 * because every existing verifier checks the WRONG axis:
 *
 *   - verify-{hymn,psalter,...}-pages.js  → page NUMBERS, not line breaks.
 *   - verify-phrase-coverage.js (NFR-009j) → phrase COVERAGE (tiling): it
 *     proves phrases cover lines[] with no gap/overlap, but an orphan
 *     split `[0,0],[1,1]` tiles PERFECTLY, so it passes green. Coverage
 *     ≠ boundary correctness. It also defaults to the single psalter file
 *     and is never run over `prayers/hymns/*.rich.json`.
 *
 * This guard fills BOTH holes: it scans EVERY hymn rich file and asserts a
 * merge-CORRECTNESS invariant on top of coverage.
 *
 * ── Orphan-suspect rule ────────────────────────────────────────────────
 * A single-line phrase `[n,n]` is an ORPHAN SUSPECT (a wrap continuation
 * the builder failed to merge into the previous phrase) when ALL hold:
 *
 *   1. it is not the first phrase (i > 0) — there is a predecessor to
 *      merge into;
 *   2. the previous phrase's LAST line does NOT end in sentence
 *      punctuation (SENTENCE_END_RE) — i.e. the clause is grammatically
 *      open, so the next short line reads as its continuation;
 *   3. the line is SHORT (≤ maxWords words, default 2) — wrap tails are
 *      1-2 word fragments ("Их Эзэнийг", "мэт", "сарниулаад");
 *   4. the stanza shows WRAP EVIDENCE — at least one OTHER phrase spans
 *      multiple lines. This is the key discriminator the naive scan
 *      missed: in a genuine short-line hymn (anaphora / numbered verse,
 *      e.g. hymns 5/101/107) NO phrase wraps, so every line is its own
 *      verse and a short line is intentional — not flagged. The orphan
 *      only looks suspect when the SAME stanza proves PDF-wrapping is in
 *      play (other tails got merged into `[n,n+1]` phrases) yet this one
 *      short tail stands alone;
 *   5. the line is NOT a (near-)duplicate of the previous line — refrain
 *      repetitions ("Намайг өөрчлөөч" twice) are not orphans.
 *
 * On the live corpus this rule flags X.897 (hymn 21, "Их Эзэнийг") plus a
 * small baseline of genuine ambiguous suspects; the naive "capital-start +
 * ≤3 words" scan in the bug report flagged 467/73 (mostly legitimate
 * anaphora). See the @fr test for the precision/recall fixtures.
 *
 * ── Allowlist (manual-review baseline) ─────────────────────────────────
 * Mirrors the `verify-*-pages.js` "verified-correction bucket = 0" idiom.
 * `scripts/data/hymn-phrase-orphan-allowlist.json` records KNOWN suspects
 * (keyed by hymn file + verbatim text) that are triaged out of the gate:
 * either confirmed-legitimate or deferred pending PDF-SoT manual review
 * (GOAL #4 §4 follow-up). The guard FAILS (exit 1) only on an ACTIVE
 * suspect — one NOT in the allowlist. X.897 (hymn 21) is deliberately
 * absent from the allowlist, so the guard flags it now (proving detection
 * works) and goes green once the X.897 fix merges and the orphan
 * disappears. New builder regressions land as active suspects → exit 1.
 *
 * SENTENCE_END_RE is the SSOT from `src/components/prayer-sections/
 * rich-content.tsx` (L137, FR-161 R-16), inlined here the same way
 * verify-phrase-coverage.js mirrors PhraseGroupSchema — changes there
 * must be mirrored here, and the @fr test exercises the shared shape.
 *
 * Read-only. Exits 0 on PASS (no active suspects), 1 on any active
 * suspect or a load error.
 *
 * CLI:
 *   node scripts/verify-hymn-phrase-merge.js               # list active, exit 0/1
 *   node scripts/verify-hymn-phrase-merge.js --all         # include allowlisted
 *   node scripts/verify-hymn-phrase-merge.js --max-words 3 # widen the sweep
 *   node scripts/verify-hymn-phrase-merge.js --hymns-dir <p> --allowlist <p>
 */

'use strict'

const fs = require('fs')
const path = require('path')

// Reuse the stanza walker from the coverage verifier (SSOT for the
// hymnRich/psalter shape auto-detect). We only need its iterator.
const { iterStanzasWithPhrases } = require('./verify-phrase-coverage.js')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_HYMNS_DIR = 'src/data/loth/prayers/hymns'
const DEFAULT_ALLOWLIST = 'scripts/data/hymn-phrase-orphan-allowlist.json'
const DEFAULT_MAX_WORDS = 2

// SSOT mirror of rich-content.tsx SENTENCE_END_RE (FR-161 R-16): a line
// ends a sentence when it closes with `.!?…:` plus optional closing
// quote/paren. A previous line WITHOUT this is grammatically open.
const SENTENCE_END_RE = /[.!?…:]+["»'')\]]*\s*$/u

// ─── text helpers ────────────────────────────────────────────────────────

/** Concatenated, trimmed text of one stanza line (joins its spans). */
function lineText(stanza, lineIndex) {
  const line = stanza.lines && stanza.lines[lineIndex]
  if (!line || !Array.isArray(line.spans)) return ''
  return line.spans
    .map((s) => (s && typeof s.text === 'string' ? s.text : ''))
    .join('')
    .trim()
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length
}

// Normalised form for refrain-duplicate detection: lowercased, stripped of
// punctuation / repeat-markers (/2x/) / digits, whitespace collapsed.
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?…:;«»'']/gu, '')
    .replace(/[()/\\]/gu, '')
    .replace(/[0-9x]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── pure detector ───────────────────────────────────────────────────────

/**
 * Find orphan-suspect phrases in one stanza. Pure — no I/O. Returns a list
 * of suspects (empty = clean) per the five-condition rule documented above.
 *
 * @param {{ lines: any[], phrases: any[] }} stanza
 * @param {{ maxWords?: number }} [opts]
 * @returns {{ phraseIndex: number, lineIndex: number, text: string,
 *             prevText: string, words: number }[]}
 */
function findOrphanSuspects(stanza, opts = {}) {
  const maxWords = opts.maxWords ?? DEFAULT_MAX_WORDS
  const phrases = Array.isArray(stanza.phrases) ? stanza.phrases : []
  if (phrases.length < 2) return []

  // Condition 4: wrap evidence — some phrase in this stanza spans >1 line.
  const hasWrapEvidence = phrases.some(
    (p) =>
      Array.isArray(p.lineRange) && p.lineRange[1] > p.lineRange[0],
  )
  if (!hasWrapEvidence) return []

  const suspects = []
  for (let i = 1; i < phrases.length; i++) {
    const range = phrases[i].lineRange
    if (!Array.isArray(range)) continue
    const [start, end] = range
    if (start !== end) continue // condition: single-line phrase only

    const text = lineText(stanza, start)
    if (wordCount(text) > maxWords) continue // condition 3: short only

    const prevRange = phrases[i - 1].lineRange
    if (!Array.isArray(prevRange)) continue
    const prevText = lineText(stanza, prevRange[1]) // prev phrase's last line
    if (SENTENCE_END_RE.test(prevText)) continue // condition 2: prev open

    // Condition 5: not a refrain repetition of the previous line.
    const n = normalize(text)
    if (n && (n === normalize(prevText) || normalize(prevText).includes(n)))
      continue

    suspects.push({ phraseIndex: i, lineIndex: start, text, prevText, words: wordCount(text) })
  }
  return suspects
}

/**
 * Scan one parsed hymn rich.json blob. Returns suspects tagged with their
 * block index. Uses the shared stanza iterator so the hymnRich/psalter
 * shape detection stays SSOT with verify-phrase-coverage.js.
 *
 * @param {Record<string, any>} richData
 * @param {{ maxWords?: number }} [opts]
 */
function scanHymnData(richData, opts = {}) {
  const out = []
  for (const slot of iterStanzasWithPhrases(richData)) {
    for (const s of findOrphanSuspects(slot.stanza, opts)) {
      out.push({ blockIndex: slot.blockIndex, ...s })
    }
  }
  return out
}

// ─── allowlist ─────────────────────────────────────────────────────────

/**
 * Load the allowlist into a Set of `${hymn} ${normalize(text)}` keys.
 * Missing file → empty set (the gate then flags every suspect, which is a
 * safe-by-default failure rather than a silent pass).
 */
function loadAllowlist(allowlistAbs) {
  if (!fs.existsSync(allowlistAbs)) return new Set()
  const raw = JSON.parse(fs.readFileSync(allowlistAbs, 'utf-8'))
  const entries = Array.isArray(raw) ? raw : raw.entries || []
  const set = new Set()
  for (const e of entries) {
    if (!e || !e.hymn || typeof e.text !== 'string') continue
    set.add(`${e.hymn} ${normalize(e.text)}`)
  }
  return set
}

function allowlistKey(hymnFile, text) {
  return `${hymnFile} ${normalize(text)}`
}

// ─── corpus scan ─────────────────────────────────────────────────────────

/**
 * Scan every `*.rich.json` under `hymnsDirAbs`. Returns the full suspect
 * list (each tagged with `hymn` + `allowlisted`) and the active subset
 * (suspects NOT in the allowlist — these fail the gate).
 */
function scanCorpus(hymnsDirAbs, allowlistSet, opts = {}) {
  const files = fs
    .readdirSync(hymnsDirAbs)
    .filter((f) => f.endsWith('.rich.json'))
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))

  const suspects = []
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(hymnsDirAbs, file), 'utf-8'))
    for (const s of scanHymnData(data, opts)) {
      const allowlisted = allowlistSet.has(allowlistKey(file, s.text))
      suspects.push({ hymn: file, allowlisted, ...s })
    }
  }
  return { suspects, active: suspects.filter((s) => !s.allowlisted), filesScanned: files.length }
}

// ─── CLI ───────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = {
    all: false,
    maxWords: DEFAULT_MAX_WORDS,
    hymnsDir: null,
    allowlist: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--all') args.all = true
    else if (flag === '--max-words') args.maxWords = parseInt(argv[++i], 10) || DEFAULT_MAX_WORDS
    else if (flag === '--hymns-dir') args.hymnsDir = argv[++i] || null
    else if (flag === '--allowlist') args.allowlist = argv[++i] || null
    else if (flag === '--help' || flag === '-h') args.help = true
  }
  return args
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/verify-hymn-phrase-merge.js [--all] [--max-words N]\n' +
      '\n' +
      'Phrase-merge correctness guard for hymn rich.json (NFR-009m).\n' +
      '  --all          include allowlisted suspects in the listing\n' +
      `  --max-words N  short-line threshold (default ${DEFAULT_MAX_WORDS})\n` +
      `  --hymns-dir P  hymn rich dir (default ${DEFAULT_HYMNS_DIR})\n` +
      `  --allowlist P  allowlist json (default ${DEFAULT_ALLOWLIST})\n`,
  )
}

function describeSuspect(s) {
  const tag = s.allowlisted ? '[allowed]' : '[ACTIVE] '
  return `  ${tag} ${s.hymn} blocks[${s.blockIndex}] phrase[${s.phraseIndex}] (${s.words}w) "${s.text}"  <- prev:"…${s.prevText.slice(-24)}"`
}

function main() {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return 0
  }
  const hymnsDirAbs = path.isAbsolute(args.hymnsDir || DEFAULT_HYMNS_DIR)
    ? args.hymnsDir
    : path.join(ROOT, args.hymnsDir || DEFAULT_HYMNS_DIR)
  const allowlistAbs = path.isAbsolute(args.allowlist || DEFAULT_ALLOWLIST)
    ? args.allowlist
    : path.join(ROOT, args.allowlist || DEFAULT_ALLOWLIST)

  if (!fs.existsSync(hymnsDirAbs)) {
    console.error(`[verify-hymn-phrase-merge] hymns dir not found: ${hymnsDirAbs}`)
    return 1
  }

  let allowlistSet
  let result
  try {
    allowlistSet = loadAllowlist(allowlistAbs)
    result = scanCorpus(hymnsDirAbs, allowlistSet, { maxWords: args.maxWords })
  } catch (err) {
    console.error(`[verify-hymn-phrase-merge] scan failed: ${err.message}`)
    return 1
  }

  const { suspects, active, filesScanned } = result
  const allowedCount = suspects.length - active.length

  if (active.length === 0) {
    console.log(
      `[verify-hymn-phrase-merge] OK — ${filesScanned} hymn file(s) scanned, ` +
        `0 active orphan-suspect(s) (${allowedCount} allowlisted)`,
    )
    if (args.all && suspects.length > 0) {
      for (const s of suspects) console.log(describeSuspect(s))
    }
    return 0
  }

  console.error(
    `[verify-hymn-phrase-merge] FAIL — ${active.length} active orphan-suspect(s) ` +
      `across ${new Set(active.map((s) => s.hymn)).size} hymn(s) ` +
      `(${allowedCount} allowlisted, ${filesScanned} files scanned)`,
  )
  const listed = args.all ? suspects : active
  for (const s of listed) console.error(describeSuspect(s))
  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  findOrphanSuspects,
  scanHymnData,
  scanCorpus,
  loadAllowlist,
  allowlistKey,
  normalize,
  lineText,
  SENTENCE_END_RE,
  DEFAULT_MAX_WORDS,
}
