#!/usr/bin/env node
/**
 * build-hymn-phrases-into-rich.mjs — F-X3 Phase A pilot builder.
 *
 * Reads `src/data/loth/prayers/hymns/{N}.rich.json` files and injects
 * `phrases?: PhraseGroup[]` into each `kind:'stanza'` block of `hymnRich`.
 *
 * Method (a2) — punctuation + refrain detection (no PDF re-parse):
 *
 *   1. For each line in a stanza, join its `spans[].text` and inspect the
 *      trailing character. Phrase boundaries fire on `.` `!` `?` `…`
 *      (sentence terminators) or `:` only when it's a "Дахилт:" rubric
 *      with no body text on the same line.
 *   2. Lines without terminators are accumulated into the open phrase.
 *      The last line of the stanza always closes the open phrase even if
 *      no terminator fires.
 *   3. If a stanza's first line starts with `Дахилт` (`Дахилт:` /
 *      `Дахилт N:` / inline-with-content), all phrases in that stanza
 *      receive `role: 'refrain'`. The "Дахилт" first-line rubric is kept
 *      with the body lines that follow it (a lone "Дахилт:" line attaches
 *      to the next phrase rather than splitting off; an inline
 *      "Дахилт: <text>" line is the start of phrase 0).
 *   4. All phrases default to `indent: 0` — hymns are flat single-column
 *      in the PDF, so wrap continuations don't need a hanging indent
 *      shift relative to the phrase start. (This is the price of method
 *      a2: PDF column geometry isn't consulted; hanging indent uses the
 *      universal psalm-block.tsx wrap CSS at indent=0.)
 *
 * Output schema is identical to the psalter builder
 * (`scripts/build-phrases-into-rich.mjs`): each phrase is
 * `{ lineRange: [start, end], indent?: 0|1|2, role?: 'refrain' | 'doxology' }`.
 *
 * Contracts:
 *
 *   - additive — `lines[]` are preserved; only `phrases?` is appended.
 *   - idempotent — re-running with the same hymn data overwrites the
 *     `phrases` array with the same value.
 *   - atomic per file — either the whole hymn injects cleanly or the
 *     file is rejected (no partial inject).
 *   - dry-run (`--dry-run`) — print proposed diff to stdout, write nothing.
 *
 * Stanza-level coverage is 100% by construction (every line index lands
 * in exactly one phrase) so `scripts/verify-phrase-coverage.js` PASSes.
 *
 * CLI:
 *
 *   node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76
 *   node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76 --dry-run
 *   node scripts/build-hymn-phrases-into-rich.mjs --all          # every hymn 1..122
 *   node scripts/build-hymn-phrases-into-rich.mjs --hymn-dir <p> # alternate dir
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, join, dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_HYMN_DIR = resolve(HERE, '..', 'src/data/loth/prayers/hymns')

// Sentence-terminator characters we honour as phrase-close signals. Keep
// in sync with the documented method-a2 contract above. Curly Mongolian
// punctuation is rare in this corpus — straight ASCII variants suffice.
const TERMINATORS = new Set(['.', '!', '?', '…'])

// "Дахилт" prefix forms we recognize as refrain markers. The Mongolian
// transliteration is fixed by the PDF. A first-line opener like
// "Дахилт 1: Мөнх галаас..." (inline content) and a lone "Дахилт:"
// rubric line both qualify.
const REFRAIN_PREFIX_RE = /^\s*Дахилт(\s*\d+)?\s*:/

/**
 * Concatenate every span's text in a line into a single plain string.
 * Whitespace is preserved as written; we trim only when checking the
 * trailing character so embedded NBSP/leading indent quirks survive.
 *
 * @param {{ spans: { text: string }[] }} line
 */
function joinedLineText(line) {
  if (!Array.isArray(line?.spans)) return ''
  return line.spans.map((s) => (typeof s?.text === 'string' ? s.text : '')).join('')
}

/**
 * Decide whether a joined line text closes the current phrase. Returns
 * true when the LAST non-whitespace character is in TERMINATORS. A
 * trailing close-quote (`"` or `'`) immediately after the terminator is
 * tolerated (e.g. "...магтагдтугай!\""). Lone "Дахилт:" rubric lines do
 * NOT close — they belong with the next phrase that follows.
 *
 * @param {string} text
 */
function closesPhrase(text) {
  if (typeof text !== 'string') return false
  const stripped = text.replace(/[\s"'»«„“”‘’]+$/u, '')
  if (stripped.length === 0) return false
  const last = stripped[stripped.length - 1]
  return TERMINATORS.has(last)
}

/**
 * `true` when the line is a rubric-only "Дахилт:" marker — nothing after
 * the colon. Such lines must NOT split a phrase: they attach to the
 * lines that follow (which carry the actual refrain body).
 *
 * @param {string} text
 */
function isLoneRefrainRubric(text) {
  return /^\s*Дахилт(\s*\d+)?\s*:\s*$/.test(text)
}

/**
 * `true` when the FIRST line of a stanza opens with "Дахилт" — covers
 * both inline ("Дахилт 1: Мөнх галаас...") and rubric-only ("Дахилт:")
 * forms. Used to mark every phrase in the stanza as `role: 'refrain'`.
 *
 * @param {string} text
 */
function isRefrainStanzaOpener(text) {
  return REFRAIN_PREFIX_RE.test(text || '')
}

/**
 * Pure planner: produce a `phrases` array for one stanza using method
 * (a2). Returns the new array (caller decides whether to inject).
 *
 * Algorithm:
 *
 *   - Walk lines left-to-right, opening a phrase at `start = 0`.
 *   - Close the phrase at line `i` when its joined text ends with a
 *     terminator AND it isn't a lone "Дахилт:" rubric (which doesn't
 *     close).
 *   - Closing emits `{ lineRange: [start, i], indent: 0 }`; advance
 *     `start = i + 1` and continue.
 *   - At end-of-stanza, if `start <= lines.length - 1`, emit a final
 *     phrase covering the remainder.
 *   - If the first line is a refrain opener, set `role: 'refrain'` on
 *     every emitted phrase.
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @returns {{ lineRange: [number, number], indent: 0, role?: 'refrain' }[]}
 */
export function planStanzaPhrases(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []
  const phrases = []
  let start = 0
  for (let i = 0; i < lines.length; i++) {
    const text = joinedLineText(lines[i])
    if (isLoneRefrainRubric(text)) {
      // Lone "Дахилт:" — attach to the phrase opened at `start`. Do not
      // close here even if (technically) `:` isn't in TERMINATORS.
      continue
    }
    if (closesPhrase(text)) {
      phrases.push({ lineRange: [start, i], indent: 0 })
      start = i + 1
    }
  }
  // Tail — any trailing lines without a terminator form one final phrase.
  if (start <= lines.length - 1) {
    phrases.push({ lineRange: [start, lines.length - 1], indent: 0 })
  }
  // If we somehow emitted zero phrases (all-blank stanza?), produce a
  // single covering phrase so coverage stays 100% — the verifier rejects
  // populated phrases on empty stanzas, and rejects 0-phrase stanzas with
  // populated lines via the additive contract (skipped). For a stanza
  // with content but no terminators we still want one phrase covering all
  // lines.
  if (phrases.length === 0 && lines.length > 0) {
    phrases.push({ lineRange: [0, lines.length - 1], indent: 0 })
  }
  // Refrain role propagation: if the FIRST line opens with "Дахилт",
  // every phrase inherits `role: 'refrain'`. The renderer styles refrain
  // phrases distinctly (RUBRIC_CLASS in rich-content.tsx).
  const firstText = joinedLineText(lines[0])
  if (isRefrainStanzaOpener(firstText)) {
    for (const p of phrases) p.role = 'refrain'
  }
  return phrases
}

/**
 * Plan + apply phrase injection for one hymn file's `hymnRich` payload.
 * Returns the new `hymnRich` (deep-cloned where blocks change). Pure —
 * does not write anything.
 *
 * @param {{ blocks: any[] }} hymnRich
 */
export function injectPhrasesIntoHymnRich(hymnRich) {
  if (!hymnRich || !Array.isArray(hymnRich.blocks)) {
    return { ok: false, error: 'hymnRich.blocks missing or non-array' }
  }
  const blocks = hymnRich.blocks.map((block) => {
    if (!block || block.kind !== 'stanza') return block
    const phrases = planStanzaPhrases(block.lines || [])
    // Idempotent overwrite: drop any prior `phrases` field, write fresh.
    const { phrases: _drop, ...rest } = block
    if (phrases.length === 0) return rest // shouldn't happen, defensive
    return { ...rest, phrases }
  })
  return { ok: true, data: { ...hymnRich, blocks } }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = { ids: null, all: false, dryRun: false, hymnDir: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--ids') {
      args.ids = (argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean)
      i++
    } else if (flag === '--all') {
      args.all = true
    } else if (flag === '--dry-run') {
      args.dryRun = true
    } else if (flag === '--hymn-dir') {
      args.hymnDir = argv[i + 1]
      i++
    } else if (flag === '--help' || flag === '-h') {
      args.help = true
    }
  }
  return args
}

function listAllHymnIds(dir) {
  return readdirSync(dir)
    .filter((f) => /^\d+\.rich\.json$/.test(f))
    .map((f) => f.replace(/\.rich\.json$/, ''))
    .sort((a, b) => Number(a) - Number(b))
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/build-hymn-phrases-into-rich.mjs ' +
      '[--ids 1,11,26,40,76 | --all] [--dry-run] [--hymn-dir <path>]\n' +
      '\n' +
      'Injects phrases[] into hymnRich.blocks of src/data/loth/prayers/hymns/{N}.rich.json.\n' +
      'Method (a2): sentence-terminator + Дахилт-prefix detection. No PDF re-parse.\n',
  )
}

function describeStanza(block, phrases) {
  const lineCount = (block.lines || []).length
  const phraseSummary = phrases
    .map((p) => `[${p.lineRange[0]},${p.lineRange[1]}]${p.role ? `:${p.role}` : ''}`)
    .join(' ')
  return `lines=${lineCount} phrases=${phrases.length} ${phraseSummary}`
}

function processOneHymn(id, hymnDir, dryRun) {
  const filePath = join(hymnDir, `${id}.rich.json`)
  if (!existsSync(filePath)) {
    return { id, ok: false, error: 'FILE_NOT_FOUND', filePath }
  }
  let payload
  try {
    payload = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    return { id, ok: false, error: `JSON_PARSE_FAILED: ${err.message}`, filePath }
  }
  const result = injectPhrasesIntoHymnRich(payload?.hymnRich)
  if (!result.ok) {
    return { id, ok: false, error: result.error, filePath }
  }
  const newPayload = { ...payload, hymnRich: result.data }
  // Per-stanza summary (for dry-run + on-success log).
  const summaries = []
  const blocks = result.data.blocks
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]
    if (block?.kind !== 'stanza') continue
    summaries.push(`  block ${bi}: ${describeStanza(block, block.phrases || [])}`)
  }
  if (!dryRun) {
    writeFileSync(filePath, JSON.stringify(newPayload, null, 2) + '\n', 'utf-8')
  }
  return { id, ok: true, filePath, summaries }
}

function cliMain() {
  const argv = process.argv.slice(2)
  const args = parseCliArgs(argv)
  if (args.help || (!args.ids && !args.all)) {
    printHelp()
    process.exit(args.help ? 0 : 1)
  }
  const hymnDir = resolve(args.hymnDir || DEFAULT_HYMN_DIR)
  const ids = args.all ? listAllHymnIds(hymnDir) : args.ids
  process.stdout.write(`[hymn-phrases] ${args.dryRun ? 'DRY-RUN' : 'WRITE'} mode — ${ids.length} hymn(s) — dir=${hymnDir}\n`)

  let okCount = 0
  let failCount = 0
  for (const id of ids) {
    const r = processOneHymn(id, hymnDir, args.dryRun)
    if (r.ok) {
      okCount++
      process.stdout.write(`hymn ${id}: OK (${r.summaries.length} stanza block(s))\n`)
      if (args.dryRun) {
        for (const s of r.summaries) process.stdout.write(s + '\n')
      }
    } else {
      failCount++
      process.stderr.write(`hymn ${id}: FAIL — ${r.error}\n`)
    }
  }
  process.stdout.write(`[hymn-phrases] done — OK=${okCount} FAIL=${failCount}\n`)
  if (failCount > 0) process.exit(3)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
