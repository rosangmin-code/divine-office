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
 *   3. If a stanza's first line opens with one of the refrain prefix
 *      families — `Дахилт:` / `Дахилт N:` / inline `Дахилт: <text>` /
 *      `Нийтээр: <text>` (congregational response) /
 *      `Эсвэл: <text>` / `Эсвэл нийтээр: <text>` (alternate refrain) —
 *      all phrases in that stanza receive `role: 'refrain'`. A first-line
 *      rubric line is kept with the body lines that follow it (a lone
 *      "Дахилт:" line attaches to the next phrase rather than splitting
 *      off; an inline "Дахилт: <text>" / "Нийтээр: <text>" /
 *      "Эсвэл: <text>" line is the start of phrase 0).
 *   4. All phrases default to `indent: 0` — hymns are flat single-column
 *      in the PDF, so wrap continuations don't need a hanging indent
 *      shift relative to the phrase start. (This is the price of method
 *      a2: PDF column geometry isn't consulted; hanging indent uses the
 *      universal psalm-block.tsx wrap CSS at indent=0.)
 *
 * Method (b2 strict) — task #291, parallel-epithet remediation:
 *
 *   When the (a2) terminator scan would emit ZERO phrase boundaries
 *   (i.e., the stanza has no `. ! ? …` terminators) AND the stanza
 *   matches one of two strict gates, switch to per-line phrases (each
 *   line becomes its own `lineRange: [i, i]`). Otherwise fall back to
 *   the (a2) single-covering-phrase fallback (current behavior).
 *
 *   - Layer 1 (parallel-epithet detect): ≥3 stanza lines share the
 *     same first 3-codepoint prefix (case-sensitive, after trim) AND
 *     that repetition covers ≥40% of the stanza's non-empty lines.
 *     Captures hymn 49 block 2 ("Маш ..." × 4), hymn 90 block 0
 *     ("Та ..." × 11), hymn 22, etc.
 *   - Layer 2 (numbered-list strict): first line opens with a verse
 *     number marker (`\d+\.\s`) AND length CV (stddev/mean of line
 *     lengths) < 0.4 AND no-short-tail (last line length ≥ 80% of
 *     mean). Captures the "1. / 2. / 3." numbered hymn shape.
 *   - Both gates miss → keep the (a2) single covering phrase.
 *     Documented as `a2_fallback` in the decision report so curators
 *     can review false-negatives.
 *
 *   The b2 strict logic ONLY fires on stanzas that would otherwise hit
 *   the empty-phrases fallback. Stanzas with terminator-driven phrases
 *   keep the (a2) per-sentence phrase emission unchanged. Refrain-role
 *   propagation runs on top of b2 splits — a per-line stanza opened by
 *   a refrain prefix marks every emitted line as `role:'refrain'`.
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
 *   - decisions (`--decisions`) — JSON-line per-stanza decision report
 *     `{hymn_id, block_index, decision, reason, line_count, phrase_count}`.
 *     Composable with `--dry-run` for curator review without writes.
 *
 * Stanza-level coverage is 100% by construction (every line index lands
 * in exactly one phrase) so `scripts/verify-phrase-coverage.js` PASSes.
 *
 * CLI:
 *
 *   node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76
 *   node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76 --dry-run
 *   node scripts/build-hymn-phrases-into-rich.mjs --all          # every hymn 1..122
 *   node scripts/build-hymn-phrases-into-rich.mjs --all --decisions  # decision report
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

// Refrain / response prefix forms we recognize as refrain markers. The
// Mongolian transliteration is fixed by the PDF. Three families qualify:
//
//   - "Дахилт:" / "Дахилт N:" / inline ("Дахилт 1: ..." or "Дахилт:Үнэн ...")
//     — the canonical refrain rubric.
//   - "Нийтээр:" — "all/everyone:" — congregational response, semantically
//     equivalent to a refrain (rendered in the same italic style).
//   - "Эсвэл:" / "Эсвэл нийтээр:" — "or:" / "or all together:" — alternate
//     refrain wording (composite handles both lone "Эсвэл:" and the chained
//     "Эсвэл нийтээр:" form found in hymns 114, 115).
//
// All three opener families propagate `role: 'refrain'` to every phrase in
// the stanza. Lone-rubric variant (prefix on a line with NO body) is also
// recognized via `isLoneRefrainRubric` (pattern shared below).
const REFRAIN_PREFIX_RE = /^\s*(?:Дахилт(?:\s*\d+)?|Нийтээр|Эсвэл(?:\s+нийтээр)?)\s*:/

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
 * `true` when the line is a rubric-only refrain marker — one of the
 * recognized prefix families ("Дахилт:" / "Дахилт N:" / "Нийтээр:" /
 * "Эсвэл:" / "Эсвэл нийтээр:") with nothing after the colon. Such lines
 * must NOT split a phrase: they attach to the lines that follow (which
 * carry the actual refrain body). Pattern is the prefix half of
 * REFRAIN_PREFIX_RE plus a `\s*$` tail to enforce the lone-line shape.
 *
 * @param {string} text
 */
function isLoneRefrainRubric(text) {
  return /^\s*(?:Дахилт(?:\s*\d+)?|Нийтээр|Эсвэл(?:\s+нийтээр)?)\s*:\s*$/.test(text)
}

/**
 * `true` when the FIRST line of a stanza opens with a recognized refrain
 * prefix — covers `Дахилт` (canonical refrain), `Нийтээр` (congregational
 * response), `Эсвэл` / `Эсвэл нийтээр` (alternate refrain) — in both
 * inline ("Дахилт 1: Мөнх галаас..." / "Нийтээр: Нялх...") and rubric-only
 * ("Дахилт:") forms. Used to mark every phrase in the stanza as
 * `role: 'refrain'`.
 *
 * @param {string} text
 */
function isRefrainStanzaOpener(text) {
  return REFRAIN_PREFIX_RE.test(text || '')
}

// Codepoint slice — Cyrillic-safe (avoid byte slicing, see
// feedback_regex_unicode_boundary). Returns the first n codepoints
// (Unicode scalars) of `text` after a leading-whitespace trim.
function codepointPrefix(text, n) {
  if (typeof text !== 'string') return ''
  const trimmed = text.replace(/^\s+/u, '')
  // Array.from iterates by codepoint, not byte/char.
  const cps = Array.from(trimmed)
  return cps.slice(0, n).join('')
}

/**
 * Detect b2 strict gate activation for a stanza. Returns the matching
 * layer and a short reason string, or `null` when neither layer fires.
 * Inspected only when the (a2) terminator scan would otherwise emit
 * the empty-phrases fallback — see `planStanzaPhrasesWithDecision`.
 *
 * Layer 1 (parallel-epithet):
 *   - Among non-empty lines, find the most common 3-codepoint prefix
 *     (after trim).
 *   - Activate when that prefix repeats on ≥3 lines AND covers ≥40%
 *     of the non-empty line count.
 *
 * Layer 2 (numbered-list strict):
 *   - First non-empty line starts with `\d+\.` followed by whitespace
 *     or a Cyrillic letter (`1. Маш...`, `2.Эзэн...`).
 *   - ≥3 non-empty lines.
 *   - Length coefficient of variation (stddev / mean of joined-line
 *     character counts, codepoint count) < 0.4.
 *   - No-short-tail: last non-empty line length ≥ 80% of the mean.
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @returns {{ layer: 1 | 2, reason: string } | null}
 */
export function detectB2Strict(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return null
  const nonEmptyTexts = []
  for (const ln of lines) {
    const t = joinedLineText(ln).trim()
    if (t.length > 0) nonEmptyTexts.push(t)
  }
  if (nonEmptyTexts.length < 3) return null

  // ── Layer 1 — parallel-epithet 3-codepoint-prefix repetition ──────────
  const prefixCounts = new Map()
  for (const t of nonEmptyTexts) {
    const prefix = codepointPrefix(t, 3)
    if (prefix.length === 0) continue
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1)
  }
  let topPrefix = null
  let topCount = 0
  for (const [pfx, count] of prefixCounts) {
    if (count > topCount) {
      topPrefix = pfx
      topCount = count
    }
  }
  const ratio = nonEmptyTexts.length > 0 ? topCount / nonEmptyTexts.length : 0
  if (topCount >= 3 && ratio >= 0.4) {
    return {
      layer: 1,
      reason: `parallel-epithet: prefix "${topPrefix}" × ${topCount}/${nonEmptyTexts.length} (${Math.round(ratio * 100)}%)`,
    }
  }

  // ── Layer 2 — numbered + uniform structure ────────────────────────────
  const numberedOpener = /^\s*\d+\.\s*[А-ЯӨҮа-яөүA-Za-z]/u
  if (!numberedOpener.test(nonEmptyTexts[0])) return null
  // Codepoint-count for each non-empty line (Cyrillic-safe).
  const lengths = nonEmptyTexts.map((t) => Array.from(t).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  if (mean <= 0) return null
  const variance =
    lengths.reduce((acc, n) => acc + (n - mean) ** 2, 0) / lengths.length
  const stddev = Math.sqrt(variance)
  const cv = stddev / mean
  if (cv >= 0.4) return null
  const lastLen = lengths[lengths.length - 1]
  if (lastLen / mean < 0.8) return null
  return {
    layer: 2,
    reason: `numbered+uniform: cv=${cv.toFixed(3)} tail/mean=${(lastLen / mean).toFixed(2)}`,
  }
}

/**
 * Pure planner: produce a `phrases` array AND a structured decision tag
 * for one stanza. Decision tags drive the curator dry-run report and
 * the dispatch's `phase_d_summary` accounting.
 *
 * Decision values:
 *   - `a2_refrain`     — first line opens with a refrain marker; every
 *                        phrase carries `role:'refrain'`. Phrase count
 *                        depends on terminator scan (≥1).
 *   - `a2_terminator`  — terminator scan emitted ≥2 phrases (no
 *                        fallback path entered). Existing (a2) shape.
 *   - `b2_layer1`      — terminator-less, parallel-epithet detect fired
 *                        → per-line phrases.
 *   - `b2_layer2`      — terminator-less, numbered+uniform fired →
 *                        per-line phrases.
 *   - `a2_fallback`    — terminator-less, neither b2 layer fired →
 *                        single covering phrase (legacy behavior).
 *
 * Algorithm — same skeleton as before; only the empty-phrases fallback
 * branch grew the b2 detection step.
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @returns {{
 *   phrases: { lineRange: [number, number], indent: 0, role?: 'refrain' }[],
 *   decision: { kind: 'a2_terminator' | 'a2_refrain' | 'a2_fallback' | 'b2_layer1' | 'b2_layer2', reason: string },
 * }}
 */
export function planStanzaPhrasesWithDecision(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { phrases: [], decision: { kind: 'a2_fallback', reason: 'empty-stanza' } }
  }
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

  // ── b2 strict — entry point ──────────────────────────────────────────
  // Reachable only when terminator scan emitted exactly one tail phrase
  // covering [0, lines.length - 1] (i.e., the legacy single-covering
  // fallback). Detection is a stanza-level pattern check.
  const isFallbackShape =
    phrases.length === 1 &&
    phrases[0].lineRange[0] === 0 &&
    phrases[0].lineRange[1] === lines.length - 1
  // Decision label for the existing (a2) path. Refrain detection runs
  // last so it can override `a2_terminator` / `a2_fallback` / `b2_*`.
  let decision = isFallbackShape
    ? { kind: 'a2_fallback', reason: 'no-terminator + neither b2 layer' }
    : { kind: 'a2_terminator', reason: `terminator-scan ${phrases.length} phrase(s)` }

  if (isFallbackShape) {
    const b2 = detectB2Strict(lines)
    if (b2) {
      // Per-line split: each non-empty line becomes its own phrase.
      // Empty lines (shouldn't occur in production hymn data, but
      // defensive) are skipped — phrase coverage is then NOT 100%, so
      // we revert to a single covering phrase. In practice production
      // stanzas have all-non-empty lines.
      let allNonEmpty = true
      for (const ln of lines) {
        if (joinedLineText(ln).trim().length === 0) {
          allNonEmpty = false
          break
        }
      }
      if (allNonEmpty) {
        phrases.length = 0
        for (let i = 0; i < lines.length; i++) {
          phrases.push({ lineRange: [i, i], indent: 0 })
        }
        decision =
          b2.layer === 1
            ? { kind: 'b2_layer1', reason: b2.reason }
            : { kind: 'b2_layer2', reason: b2.reason }
      }
    }
  }

  // If we somehow emitted zero phrases (all-blank stanza?), produce a
  // single covering phrase so coverage stays 100% — the verifier rejects
  // populated phrases on empty stanzas, and rejects 0-phrase stanzas with
  // populated lines via the additive contract (skipped). For a stanza
  // with content but no terminators we still want one phrase covering all
  // lines.
  if (phrases.length === 0 && lines.length > 0) {
    phrases.push({ lineRange: [0, lines.length - 1], indent: 0 })
    decision = { kind: 'a2_fallback', reason: 'defensive zero-emit' }
  }
  // Refrain role propagation: if the FIRST line opens with "Дахилт",
  // every phrase inherits `role: 'refrain'`. The renderer styles refrain
  // phrases distinctly (RUBRIC_CLASS in rich-content.tsx).
  const firstText = joinedLineText(lines[0])
  if (isRefrainStanzaOpener(firstText)) {
    for (const p of phrases) p.role = 'refrain'
    decision = { kind: 'a2_refrain', reason: 'first-line refrain opener' }
  }
  return { phrases, decision }
}

/**
 * Backward-compat wrapper: produce just the `phrases` array (existing
 * tests + callers that don't need the decision tag).
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @returns {{ lineRange: [number, number], indent: 0, role?: 'refrain' }[]}
 */
export function planStanzaPhrases(lines) {
  return planStanzaPhrasesWithDecision(lines).phrases
}

/**
 * Plan + apply phrase injection for one hymn file's `hymnRich` payload.
 * Returns the new `hymnRich` (deep-cloned where blocks change) AND the
 * per-stanza decision array (used for the `--decisions` curator
 * report). Pure — does not write anything.
 *
 * @param {{ blocks: any[] }} hymnRich
 */
export function injectPhrasesIntoHymnRich(hymnRich) {
  if (!hymnRich || !Array.isArray(hymnRich.blocks)) {
    return { ok: false, error: 'hymnRich.blocks missing or non-array' }
  }
  const decisions = []
  const blocks = hymnRich.blocks.map((block, blockIndex) => {
    if (!block || block.kind !== 'stanza') return block
    const { phrases, decision } = planStanzaPhrasesWithDecision(block.lines || [])
    decisions.push({
      blockIndex,
      decision: decision.kind,
      reason: decision.reason,
      lineCount: (block.lines || []).length,
      phraseCount: phrases.length,
    })
    // Idempotent overwrite: drop any prior `phrases` field, write fresh.
    const { phrases: _drop, ...rest } = block
    if (phrases.length === 0) return rest // shouldn't happen, defensive
    return { ...rest, phrases }
  })
  return { ok: true, data: { ...hymnRich, blocks }, decisions }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = {
    ids: null,
    all: false,
    dryRun: false,
    hymnDir: null,
    decisions: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--ids') {
      args.ids = (argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean)
      i++
    } else if (flag === '--all') {
      args.all = true
    } else if (flag === '--dry-run') {
      args.dryRun = true
    } else if (flag === '--decisions') {
      args.decisions = true
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
      '[--ids 1,11,26,40,76 | --all] [--dry-run] [--decisions] [--hymn-dir <path>]\n' +
      '\n' +
      'Injects phrases[] into hymnRich.blocks of src/data/loth/prayers/hymns/{N}.rich.json.\n' +
      'Method (a2): sentence-terminator + Дахилт-prefix detection. No PDF re-parse.\n' +
      'Method (b2 strict, task #291): parallel-epithet + numbered-list per-line split,\n' +
      '  fires only on terminator-less stanzas that pass strict gates.\n' +
      '\n' +
      '  --dry-run     do not write files; print proposed phrase summary\n' +
      '  --decisions   emit JSON-line per-stanza decision report\n' +
      '                ({hymn_id, block_index, decision, reason, line_count, phrase_count})\n',
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
  return { id, ok: true, filePath, summaries, decisions: result.decisions }
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
  process.stdout.write(
    `[hymn-phrases] ${args.dryRun ? 'DRY-RUN' : 'WRITE'} mode — ${ids.length} hymn(s) — dir=${hymnDir}${args.decisions ? ' --decisions' : ''}\n`,
  )

  let okCount = 0
  let failCount = 0
  // Aggregate decision tally — surfaced as the final summary line for
  // curator review and used as completion_report.phase_d_summary.
  const tally = {
    a2_terminator: 0,
    a2_refrain: 0,
    a2_fallback: 0,
    b2_layer1: 0,
    b2_layer2: 0,
  }
  let stanzaTotal = 0
  for (const id of ids) {
    const r = processOneHymn(id, hymnDir, args.dryRun)
    if (r.ok) {
      okCount++
      process.stdout.write(`hymn ${id}: OK (${r.summaries.length} stanza block(s))\n`)
      if (args.dryRun) {
        for (const s of r.summaries) process.stdout.write(s + '\n')
      }
      if (Array.isArray(r.decisions)) {
        for (const d of r.decisions) {
          stanzaTotal += 1
          tally[d.decision] = (tally[d.decision] || 0) + 1
          if (args.decisions) {
            process.stdout.write(
              JSON.stringify({
                hymn_id: id,
                block_index: d.blockIndex,
                decision: d.decision,
                reason: d.reason,
                line_count: d.lineCount,
                phrase_count: d.phraseCount,
              }) + '\n',
            )
          }
        }
      }
    } else {
      failCount++
      process.stderr.write(`hymn ${id}: FAIL — ${r.error}\n`)
    }
  }
  process.stdout.write(`[hymn-phrases] done — OK=${okCount} FAIL=${failCount}\n`)
  process.stdout.write(
    `[hymn-phrases] decisions — total_hymn=${ids.length} total_stanza=${stanzaTotal} ` +
      `b2_layer1=${tally.b2_layer1} b2_layer2=${tally.b2_layer2} ` +
      `a2_terminator=${tally.a2_terminator} a2_refrain=${tally.a2_refrain} ` +
      `a2_fallback=${tally.a2_fallback}\n`,
  )
  if (failCount > 0) process.exit(3)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
