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

// ── F-X8 (task #300) — Магтуу 류 줄바꿈 규칙 (capital=verse, lower=wrap) ───
//
// User spec (#300): "들여쓰기 없음, 대문자로 시작하는 line = 새로운 절, 소문자
// 시작 line = 같은 절의 wrap continuation". The PDF typesetter, when a verse
// line exceeded the column width, wrapped to the NEXT visual line WITHOUT
// re-capitalising. Those lowercase-opening lines are NOT new verses — they
// belong to the prior capital-opening verse line as a flowing wrap. The
// (a2)/(b2) terminator and per-line splitters cannot tell wraps apart from
// real verse boundaries because they do not inspect the leading character.
//
// Two-pass post-processing on the (a2)/(b2) planner output:
//
//   1. `splitMagtuuPhrasesOnCapitalBoundaries` — explode every multi-line
//      phrase into per-verse sub-phrases. Each non-lowercase line opens a
//      new sub-phrase; lowercase lines stay attached to the prior verse.
//      Inherits the parent phrase's `indent` and `role` (refrain
//      propagation survives the split). Single-line input phrases are
//      pass-through.
//   2. `mergeLowercaseWraps` — across phrase boundaries, if the next
//      phrase's first line opens lowercase (b2-layer1 hymn 11 shape:
//      per-line phrases planned, but line 8 = "чамд өгье" wrap of line 7),
//      absorb it into the prior phrase.
//
// Both passes are pure + idempotent — re-running yields the same output.
// Edge case: if the FIRST line of a stanza opens lowercase (cross-stanza
// wrap from a sibling block above, 2 hymns: 1.b4 / 44.b4), there is no
// prior phrase to merge into so the lowercase phrase is preserved as-is
// (documented as a known limitation in `docs/handoff-fx8-magtuu-wrap-
// rule.md`).

// Mongolian Cyrillic lowercase set — written out longhand because regex
// `[а-я]` ranges drop ё/ө/ү inconsistently across engines (see
// memory/feedback_regex_unicode_boundary.md). Order doesn't matter; this
// is membership-only.
//
// #330 F-X8 F-9 — composition note: this set is the full Russian alphabet
// (33 letters: а-я + ё) PLUS the two Mongolian-specific lowercase letters
// ө and ү (no ы in modern Mongolian, but kept for parity with Russian
// loanwords / pre-reform spellings that occasionally surface in liturgy).
// Membership is therefore a Russian superset; lowercase Russian-only
// loanwords also match — acceptable because Mongolian Cyrillic embeds
// the full Russian alphabet for transliteration of foreign names and
// technical terms, so a "lowercase Cyrillic continuation" never needs
// to distinguish Russian-only letters from Mongolian-specific ones.
const MONGOLIAN_CYRILLIC_LOWERCASE = new Set(
  'абвгдеёжзийклмнопрстуфхцчшщъыьэюяөү'.split(''),
)

/**
 * `true` when the first non-whitespace character of `text` is a Mongolian-
 * Cyrillic lowercase letter (excludes Latin, digits, punctuation, capital
 * Cyrillic, and anything that already opens a new verse).
 *
 * @param {string} text
 */
function startsWithLowercaseCyrillic(text) {
  if (typeof text !== 'string') return false
  const trimmed = text.replace(/^\s+/u, '')
  if (trimmed.length === 0) return false
  return MONGOLIAN_CYRILLIC_LOWERCASE.has(trimmed[0])
}

/**
 * Pass 1 — explode each multi-line phrase into per-verse sub-phrases on
 * Mongolian-Cyrillic capital-line boundaries (any line whose first non-
 * whitespace character is NOT a lowercase Mongolian-Cyrillic letter
 * starts a new sub-phrase). Lowercase-opening lines stay attached to the
 * prior sub-phrase as a wrap continuation. Inherits the parent phrase's
 * `indent` and `role` so refrain propagation survives the split.
 *
 * Single-line input phrases are returned unchanged (no inner lines to
 * split). Empty/blank lines inside a phrase do not open a sub-phrase
 * boundary and stay attached to whichever sub-phrase contains them.
 *
 * Pure — never mutates input. Returns `{ phrases, splitCount }` where
 * `splitCount` is the number of NEW sub-phrase boundaries introduced
 * (so an input phrase split into N sub-phrases contributes `N - 1`).
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @param {{ lineRange: [number, number], indent?: 0 | 1 | 2, role?: 'refrain' | 'doxology' }[]} phrases
 */
// #330 F-X8 F-5 / #345 I-3 — pure clone helper for phrase pass-through.
// The shallow `{ ...phrase }` spread leaves any nested mutable
// (e.g. `lineRange` array) shared with the input; downstream callers that
// index-mutate would silently corrupt the input. Today only `lineRange` is
// non-primitive, but the schema may grow new array/object fields (see the
// JSDoc on splitMagtuuPhrasesOnCapitalBoundaries / mergeLowercaseWraps).
// `structuredClone` (Node 17+) gives us forward-compat deep-clone semantics
// for any future field shape — pure data so no clone-incompatible types.
// Used by both Pass A and Pass B.
function clonePhrase(phrase) {
  if (!phrase || typeof phrase !== 'object') return phrase
  return structuredClone(phrase)
}

export function splitMagtuuPhrasesOnCapitalBoundaries(lines, phrases) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return {
      phrases: Array.isArray(phrases) ? phrases.map(clonePhrase) : [],
      splitCount: 0,
    }
  }
  const linesLen = Array.isArray(lines) ? lines.length : 0
  // #345 I-5 — Explicit degenerate guard: planner contract requires
  // `phrases[i].lineRange[1] < lines.length`. When `lines` is empty AND
  // any phrase asks for content, the per-phrase safeEnd clamp at L527
  // truncates each multi-line phrase to a single-line tail (semantically
  // correct, but the silent absorption can mask an upstream planner bug).
  // Emit a single dev warning here so the degenerate input surfaces once
  // at the call site rather than per-phrase deep inside the loop.
  if (
    process.env.NODE_ENV !== 'production' &&
    linesLen === 0 &&
    phrases.some((p) => Array.isArray(p?.lineRange) && p.lineRange[1] > p.lineRange[0])
  ) {
    console.warn(
      `[splitMagtuuPhrasesOnCapitalBoundaries] linesLen=0 but ${phrases.length} ` +
        `phrase(s) request content — per-phrase clamping to single-line tails`,
    )
  }
  const out = []
  let splitCount = 0
  for (const phrase of phrases) {
    const range = phrase.lineRange
    if (!Array.isArray(range) || range.length !== 2) {
      out.push(clonePhrase(phrase))
      continue
    }
    const [start, end] = range
    // #330 F-X8 F-4 — distinguish "single-line phrase" (start === end,
    // expected) from "malformed range" (start > end, planner bug). The
    // pre-fix `start >= end` collapsed both into a silent pass-through;
    // we now keep the pass-through behaviour (do not crash production
    // builder runs) but emit a developer warning in non-production so
    // a planner regression surfaces during local/dev/CI runs.
    if (start > end) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[splitMagtuuPhrasesOnCapitalBoundaries] malformed lineRange ` +
            `start=${start} > end=${end} — passing through unchanged`,
        )
      }
      out.push(clonePhrase(phrase))
      continue
    }
    if (start === end) {
      // Single-line phrase — no inner boundaries to draw.
      out.push(clonePhrase(phrase))
      continue
    }
    // Inherit parent meta on every emitted sub-phrase so refrain colour /
    // hanging-indent level survive the split.
    const carry = {}
    if (phrase.indent !== undefined) carry.indent = phrase.indent
    if (phrase.role !== undefined) carry.role = phrase.role
    // #330 F-X8 F-8 — bound the iteration end to the actual `lines`
    // array length so an out-of-range planner end (end >= lines.length)
    // can no longer be silently absorbed via `lines[i] || {}`. The
    // planner contract is end < lines.length; if violated we still
    // proceed defensively up to the available data and warn in dev.
    const safeEnd = Math.min(end, Math.max(linesLen - 1, start))
    if (process.env.NODE_ENV !== 'production' && safeEnd !== end) {
      console.warn(
        `[splitMagtuuPhrasesOnCapitalBoundaries] lineRange end=${end} ` +
          `exceeds lines.length=${linesLen} — clamping to ${safeEnd}`,
      )
    }
    let curStart = start
    let emitted = 0
    for (let i = start + 1; i <= safeEnd; i++) {
      const text = joinedLineText(lines[i])
      const trimmed = text.replace(/^\s+/u, '')
      if (trimmed.length === 0) continue // blank — stays in the open sub-phrase
      if (!startsWithLowercaseCyrillic(text)) {
        // New verse boundary — close the open sub-phrase ending at i-1.
        out.push({ lineRange: [curStart, i - 1], ...carry })
        emitted += 1
        curStart = i
      }
      // else lowercase wrap — keep accumulating into the open sub-phrase.
    }
    // Tail — emit the final sub-phrase covering the residual range.
    out.push({ lineRange: [curStart, safeEnd], ...carry })
    emitted += 1
    if (emitted > 1) splitCount += emitted - 1
  }
  return { phrases: out, splitCount }
}

/**
 * Pass 2 — post-process planned phrases by absorbing any phrase whose
 * first line opens with a Mongolian-Cyrillic lowercase letter into the
 * previous phrase. The merged phrase keeps the prior phrase's `indent`
 * and `role`; the absorbed phrase's metadata is discarded.
 *
 * Pure — never mutates the input arrays. Returns `{ phrases, mergedCount }`
 * where `mergedCount` is the number of phrases absorbed (not the number
 * of LINES — for tally telemetry parity with line-count audits, callers
 * that need that should compute `lineRange[1] - lineRange[0] + 1` per
 * absorbed phrase).
 *
 * @param {{ spans: { text: string }[] }[]} lines
 * @param {{ lineRange: [number, number], indent?: 0 | 1 | 2, role?: 'refrain' | 'doxology' }[]} phrases
 */
export function mergeLowercaseWraps(lines, phrases) {
  if (!Array.isArray(phrases) || phrases.length < 2) {
    return {
      phrases: Array.isArray(phrases) ? phrases.map(clonePhrase) : [],
      mergedCount: 0,
    }
  }
  const linesLen = Array.isArray(lines) ? lines.length : 0
  // #330 F-X8 F-5 — clone the first phrase (deep on lineRange) so the
  // input array's references are never mutated when prev.lineRange is
  // reassigned during a merge.
  const out = [clonePhrase(phrases[0])]
  let mergedCount = 0
  for (let i = 1; i < phrases.length; i++) {
    const prev = out[out.length - 1]
    const cur = phrases[i]
    const firstLineIdx = cur.lineRange?.[0]
    // #330 F-X8 F-3 — Pass B bounds check on cur.lineRange[1] too. The
    // pre-fix code only validated firstLineIdx (lineRange[0]) and would
    // produce `[prev.start, undefined]` if cur.lineRange were length-1
    // (or if [1] were non-numeric). Production planner output is always
    // [start,end] so this is unreachable in practice, but the contract
    // is now explicit.
    const lastLineIdx = cur.lineRange?.[1]
    if (typeof firstLineIdx !== 'number' || typeof lastLineIdx !== 'number') {
      if (
        process.env.NODE_ENV !== 'production' &&
        cur.lineRange != null
      ) {
        console.warn(
          `[mergeLowercaseWraps] malformed lineRange (firstLineIdx=` +
            `${firstLineIdx}, lastLineIdx=${lastLineIdx}) — passing through`,
        )
      }
      out.push(clonePhrase(cur))
      continue
    }
    // #330 F-X8 F-8 — bound firstLineIdx to lines.length so the prior
    // `lines[firstLineIdx] || {}` silent absorb is removed; out-of-range
    // (planner bug) → treat as no-merge pass-through with a dev warning.
    if (firstLineIdx >= linesLen) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[mergeLowercaseWraps] firstLineIdx=${firstLineIdx} ` +
            `exceeds lines.length=${linesLen} — passing through`,
        )
      }
      out.push(clonePhrase(cur))
      continue
    }
    const firstLineText = joinedLineText(lines[firstLineIdx])
    if (startsWithLowercaseCyrillic(firstLineText)) {
      // Absorb cur into prev — extend prev.lineRange[1] to cur.lineRange[1].
      // Mutating `prev` is safe because it's a fresh clonePhrase() copy
      // (lineRange deep-cloned), so the input array stays untouched.
      prev.lineRange = [prev.lineRange[0], lastLineIdx]
      mergedCount += 1
    } else {
      out.push(clonePhrase(cur))
    }
  }
  return { phrases: out, mergedCount }
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
    const { phrases: planned, decision } = planStanzaPhrasesWithDecision(block.lines || [])
    // F-X8 (#300) — Магтуу 줄바꿈 규칙 (capital=verse, lower=wrap):
    //
    //   Pass A: split each multi-line phrase on Mongolian-Cyrillic
    //           capital-line boundaries (lowercase-opening lines stay
    //           attached to the prior verse). This converts the (a2)
    //           single-covering and (a2_terminator) sentence-grouped
    //           phrases into per-verse sub-phrases while preserving role
    //           (refrain) and indent inheritance.
    //
    //   Pass B: across phrase boundaries, absorb any phrase whose first
    //           line opens lowercase into the prior phrase. Catches the
    //           per-line planner case (b2_layer1, b2_layer2) where Pass
    //           A is a no-op but lowercase wraps still need merging.
    //
    // Both passes are pure + idempotent. The order is hard-coded A→B in
    // production because A introduces new phrase boundaries that B may
    // then merge across; reverse order (B→A) is NOT exercised by the
    // unit tests and is not part of the contract. The unit tests pin
    // the A→B sequence via `injectPhrasesIntoHymnRich`. `splitFired` /
    // `wrapMerged` carry telemetry for the curator summary line.
    // (#330 F-X8 F-10 — earlier comment overstated commutativity.)
    const { phrases: split, splitCount: splitFired } =
      splitMagtuuPhrasesOnCapitalBoundaries(block.lines || [], planned)
    const { phrases, mergedCount: wrapMerged } = mergeLowercaseWraps(
      block.lines || [],
      split,
    )
    decisions.push({
      blockIndex,
      decision: decision.kind,
      reason: decision.reason,
      lineCount: (block.lines || []).length,
      phraseCount: phrases.length,
      splitFired,
      wrapMerged,
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
  // F-X8 (#300) — telemetry for both passes of the Магтуу wrap rule:
  //   - Pass A (split-on-capital): how many stanzas had at least one
  //     intra-phrase split + how many new sub-phrase boundaries opened.
  //   - Pass B (lowercase-merge): how many stanzas absorbed at least one
  //     cross-phrase wrap + how many phrase entries were absorbed.
  // Both numbers surface in the summary line so the curator can verify
  // the rule ran with the expected fan-in/out after a re-build.
  let wrapSplitStanzas = 0
  let wrapSplitNewBoundaries = 0
  let wrapMergedStanzas = 0
  let wrapMergedPhrases = 0
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
          if (typeof d.splitFired === 'number' && d.splitFired > 0) {
            wrapSplitStanzas += 1
            wrapSplitNewBoundaries += d.splitFired
          }
          if (typeof d.wrapMerged === 'number' && d.wrapMerged > 0) {
            wrapMergedStanzas += 1
            wrapMergedPhrases += d.wrapMerged
          }
          if (args.decisions) {
            process.stdout.write(
              JSON.stringify({
                hymn_id: id,
                block_index: d.blockIndex,
                decision: d.decision,
                reason: d.reason,
                line_count: d.lineCount,
                phrase_count: d.phraseCount,
                wrap_split: d.splitFired ?? 0,
                wrap_merged: d.wrapMerged ?? 0,
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
  // F-X8 (#300) summary — both passes are unconditional, so zero counts
  // signal "no Магтуу wrap shape detected" rather than a configuration
  // skip. A future re-extract that regresses the wrap structure should
  // surface as a noticeable change in either count.
  process.stdout.write(
    `[hymn-phrases] magtuu-rule — split_stanzas=${wrapSplitStanzas} ` +
      `split_new_boundaries=${wrapSplitNewBoundaries} ` +
      `merged_stanzas=${wrapMergedStanzas} ` +
      `phrases_absorbed=${wrapMergedPhrases}\n`,
  )
  if (failCount > 0) process.exit(3)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
