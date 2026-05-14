#!/usr/bin/env node
/**
 * build-phrases-into-rich.mjs — FR-161 R-2 builder.
 *
 * Reads phrase-extractor JSON (output of `scripts/parsers/extract-phrases-
 * from-pdf.mjs`) and injects `phrases?: PhraseGroup[]` into the matching
 * `kind: 'stanza'` blocks of `src/data/loth/prayers/commons/psalter-
 * texts.rich.json` (or any compatible rich-AST file).
 *
 * Contracts (per R-2 dispatch):
 *
 *   1. additive — existing `lines[]` are preserved; `phrases?` is appended
 *      to the stanza block. Refs without phrases stay untouched.
 *   2. atomic — across the entire input batch, EITHER every (ref, stanza)
 *      can be matched and injected, OR no file is written. Partial inject
 *      is forbidden (reduces operator confusion when a single bad mapping
 *      surfaces an extractor / rich.json drift).
 *   3. idempotent — re-running with the same extractor JSON produces the
 *      same rich.json. The injected `phrases` array fully overwrites any
 *      prior value at the matched stanza block.
 *   4. dry-run (--dry-run) — print the proposed diff to stdout without
 *      touching the rich.json on disk.
 *
 * Matching algorithm:
 *
 *   For each `kind:'stanza'` block in `richData[ref].stanzasRich.blocks`:
 *     a. take the first line's text (`block.lines[0].spans[0].text`)
 *     b. find the extractor stanza whose first non-blank line matches
 *        (exact equality after `.trim()`, OR a 12-char prefix match for
 *        rare punctuation drift such as smart-quote vs straight quote).
 *     c. require `extractorStanza.lines.length === richBlock.lines.length`
 *        — otherwise the rich.json has pre-joined wraps that PhraseGroup
 *        `lineRange` would mis-index. Mismatch → atomic rejection so the
 *        operator surfaces the underlying data drift before injecting.
 *     d. on success, `block.phrases = extractorStanza.phrases`.
 *
 * Input shape (extractor JSON):
 *
 *   Single-ref: { ref: "Psalm 110:1-5, 7", stanzas: [...] }
 *   Multi-ref:  { refs: [{ ref: "...", stanzas: [...] }, ...] }
 *
 * The extractor itself does not emit `ref` (it works in PDF coordinates).
 * The CLI here therefore accepts `--ref <key>` to attach a ref to a single-
 * file extractor output, or expects `refs:[]` shape for batch mode.
 *
 * Curator review queue (F-X11 follow-up batch — #426, review #419 M-1):
 *
 *   The extractor sets `needsReview: true` on stanzas where Stage 1
 *   (visual indent) and Stage 2 (sentence-end heuristic) disagree. The
 *   builder collects these flags into a `reviewQueue` array in the
 *   result, and the CLI persists them to
 *   `.claude/scaffold/phrase-extract-review-queue.json` (override with
 *   `--review-queue <path>`, suppress with `--no-review-queue`). The
 *   queue is a SEPARATE channel from the rich-AST schema — `phrases`
 *   and `paragraphBoundaries` still inject into the matched stanza
 *   blocks, but `needsReview` is never written to rich.json.
 *
 * CLI:
 *
 *   node scripts/build-phrases-into-rich.mjs --extractor-out <json> \
 *     [--target src/data/loth/prayers/commons/psalter-texts.rich.json] \
 *     [--ref "Psalm 110:1-5, 7"] [--dry-run] \
 *     [--review-queue <path>] [--no-review-queue]
 *
 * Module API (preferred for tests):
 *
 *   import { injectPhrasesIntoRichData } from './build-phrases-into-rich.mjs'
 *   const result = injectPhrasesIntoRichData(richData, batches)
 *   if (result.ok) writeFileSync(target, JSON.stringify(result.data, null, 2))
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const DEFAULT_TARGET = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

/**
 * F-X11 follow-up batch (#426 — review #419 M-1) — sidecar location for
 * the curator review queue (Stage 3 `needsReview` flags from the extractor).
 * The queue is intentionally separate from `psalter-texts.rich.json` to
 * keep the rich-AST schema surface stable; curators audit this file when
 * the builder reports flagged stanzas.
 */
const DEFAULT_REVIEW_QUEUE_PATH = '.claude/scaffold/phrase-extract-review-queue.json'

/**
 * Compare two strings for stanza-first-line match. Trims whitespace; on
 * exact mismatch, falls back to a 12-character prefix overlap (rich.json
 * occasionally normalizes smart-quotes / typography while the extractor
 * preserves the PDF original). The prefix length 12 covers a typical 2-3
 * Mongolian word opener; longer would over-tighten, shorter would hit
 * spurious matches across short refrain lines.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function stanzaFirstLineMatches(a, b) {
  const at = (a || '').trim()
  const bt = (b || '').trim()
  if (!at || !bt) return false
  if (at === bt) return true
  // FR-161 R-9.E — normalise typography (quotes + dashes + NBSP +
  // ellipsis + trailing em-dash strip) before prefix comparison.
  // rich.json sometimes carries `“`/`”`/`’` while the extractor preserves
  // PDF straight quotes (or vice versa). It also commonly appends a
  // trailing em-dash `–` to a line that the PDF body extractor never
  // sees (Psalm 51 / 92 / 118 / 135 / Daniel 3 etc.). Mirroring the
  // auto-reconciler's `norm()` keeps the alignment-time and window-
  // match-time matchers in lockstep.
  const normA = normalizeTypography(normalizeQuotes(at))
  const normB = normalizeTypography(normalizeQuotes(bt))
  if (normA === normB) return true
  const prefixLen = Math.min(12, normA.length, normB.length)
  return normA.slice(0, prefixLen) === normB.slice(0, prefixLen)
}

function normalizeQuotes(s) {
  return s.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'")
}

// ─── #498 (Phase 1 Pilot) — capital-start phrase grouping ──────────────────
//
// `regroupPhrasesByCapitalStart` rebuilds a stanza's `phrases?:
// PhraseGroup[]` directly from the rich-AST `lines[]`, using a mechanical
// rule: every line whose first non-whitespace character is a Cyrillic
// CAPITAL letter (А–Я + Ё + Mongolian Ө/Ү) starts a NEW phrase; everything
// else (smart quotes, digits, lowercase letters, opening punctuation) is a
// wrap continuation that extends the prior phrase's `lineRange` end.
//
// Why this exists (vs the extractor-driven `translatePhrases` family above):
//   - The extractor's grouping relies on PDF column/baseline geometry, which
//     is unavailable when curators want to re-derive phrase shape from the
//     existing rich.json content (e.g., post-typography-fix re-grouping
//     without re-running pdftotext / pdfminer).
//   - The original method (1 line = 1 phrase) over-fragmented prosaic prose
//     lines that wrap across multiple short rows: a sentence head followed
//     by a lowercase-leading continuation should render as ONE viewport-
//     wrappable phrase, not two. The capital-start rule captures that
//     intent directly from the rich.json `lines[]` text.
//
// Why Mongolian-aware character class (not just `[А-ЯЁ]`):
//   Mongolian Cyrillic extends the Russian А-Я + Ё set with two capitals:
//   Ө (U+04E8) and Ү (U+04AE), both common in this project's PDF source
//   (e.g., Psalm 42 b3 `Өөрийн минь хад…`, `Өстнүүд минь…`). A strict
//   `/^[А-ЯЁ]/` would silently misclassify those head lines as wrap
//   continuations and collapse them into the prior phrase. The wider class
//   `/^[А-ЯЁӨҮ]/` matches the actual alphabet used in the source PDF.
//
// Latin uppercase is intentionally EXCLUDED — Latin words in the body are
// always interpolations (foreign abbreviations, citations), not the start
// of a new Mongolian sentence/verse, so they should remain wrap continuations.
//
// `paragraphBoundaries` is preserved by the caller — this function only
// rebuilds `phrases`, and `paragraphBoundaries` indexes into `lines[]`,
// which is unchanged.
//
// @param {Array<{spans?: {text?: string}[], indent?: number, role?: string}>} lines
// @returns {Array<{lineRange: [number, number], indent: number, role?: string}>}
//
// task #4 (2026-05-14) — `role` propagation. When EVERY line in a phrase's
// coverage range carries the same defined `role` (e.g. all `'refrain'`),
// the phrase inherits that role so phrase-mode rendering can surface the
// rubric data-role (`psalm-phrase-refrain`) consistently with legacy
// line-mode. Mixed roles (e.g. one refrain + one plain) → skip
// propagation; the line-level metadata is preserved so callers can still
// fall back to legacy line-mode rendering if needed. The tie-break is
// CONSERVATIVE — partial-role phrases are NOT marked, preventing rubric
// mistag bleed across phrase boundaries (NFR-009e/NFR-009f data integrity).

const CYRILLIC_CAPITAL_START_RE = /^[А-ЯЁӨҮ]/

/**
 * Helper — compute the uniform `role` over `lines[start..end]` (inclusive).
 * Returns the shared role string, or `undefined` when the range is empty,
 * out-of-bounds, has any mixed/missing role, or the head role is `undefined`.
 *
 * Used by both `regroupPhrasesByCapitalStart` (rich-only regroup path)
 * and the rich-line role propagation pass inside `injectPhrasesIntoRichData`
 * (extractor-driven path). Single SSOT for the tie-break rule (task #4).
 */
function uniformLineRole(lines, start, end) {
  if (!Array.isArray(lines)) return undefined
  if (start < 0 || end >= lines.length || start > end) return undefined
  const head = lines[start]?.role
  if (head === undefined) return undefined
  for (let i = start + 1; i <= end; i++) {
    if (lines[i]?.role !== head) return undefined
  }
  return head
}

export function regroupPhrasesByCapitalStart(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []
  const phrases = []
  let curStart = 0
  let curIndent = lines[0]?.indent ?? 0
  const pushPhrase = (start, end, indent) => {
    const phrase = { lineRange: [start, end], indent }
    const role = uniformLineRole(lines, start, end)
    if (role !== undefined) phrase.role = role
    phrases.push(phrase)
  }
  for (let i = 1; i < lines.length; i++) {
    const text = (lines[i].spans ?? [])
      .map((sp) => sp.text ?? '')
      .join('')
      .replace(/^\s+/, '')
    const isCapital = CYRILLIC_CAPITAL_START_RE.test(text)
    if (isCapital) {
      // Close prior phrase, open new one rooted at lines[i].
      pushPhrase(curStart, i - 1, curIndent)
      curStart = i
      curIndent = lines[i].indent ?? 0
    }
    // else: continuation — current phrase's lineRange end will be extended
    // implicitly when we close it (on the next capital, or at the tail).
  }
  // Tail: close the final phrase covering [curStart, lines.length - 1].
  pushPhrase(curStart, lines.length - 1, curIndent)
  return phrases
}

const TRAILING_EM_DASH_RE = /\s*[-–—]\s*$/

function normalizeTypography(s) {
  return s
    .replace(/[ ]/g, ' ') // NBSP -> space
    .replace(TRAILING_EM_DASH_RE, '') // trailing em/en/hyphen + ws strip — RUN FIRST
    .replace(/[–—]/g, '-') // inner em/en-dash -> hyphen (defensive)
    .replace(/…/g, '...') // ellipsis -> ASCII
}

/**
 * Flatten extractor stanzas into one stream: `[{ text, stanzaIndex,
 * lineWithinStanza }, ...]`. Used by `planRefUpdates` so a rich-block whose
 * lines span MULTIPLE extractor stanzas (rich.json sometimes combines what
 * the PDF separates by blank lines — Psalm 110:1-5,7 stanza 0 is 5 verses)
 * can still be matched.
 *
 * F-X11 (#408) — also surfaces `isParagraphStart` per row so the builder
 * can translate stanza-relative paragraphBoundaries into rich-block-
 * relative indices once a window is matched. A row at lineWithinStanza
 * `b` whose stanza's `paragraphBoundaries` includes `b` is marked. The
 * row at lineWithinStanza 0 is NEVER marked (a paragraph break before the
 * first line of a stanza is the stanza boundary itself, not a within-
 * stanza break).
 *
 * @param {{ stanzaIndex?: number, lines: string[], phrases: any[], paragraphBoundaries?: number[] }[]} extractorStanzas
 */
function flattenExtractorStream(extractorStanzas) {
  const stream = []
  for (let s = 0; s < extractorStanzas.length; s++) {
    const stanza = extractorStanzas[s]
    const boundaries = new Set(stanza.paragraphBoundaries || [])
    for (let i = 0; i < stanza.lines.length; i++) {
      stream.push({
        text: stanza.lines[i],
        stanzaPos: s,
        lineWithinStanza: i,
        isParagraphStart: i > 0 && boundaries.has(i),
      })
    }
  }
  return stream
}

// F-X11 WI-A2 (#452) — wrap-tolerant matcher helpers.
//
// Cross-column wrap: PDF column-break can split a single logical line into
// 2-3 stream rows because pdftotext sees a column boundary as a hard line
// terminator. rich.json carries the JOINED logical line; the extractor
// stream carries the SPLIT physical lines. Pre-#452 the matcher tried only
// 1-1 alignment (with a 12-char prefix tolerance for typography drift),
// which silently mis-aligned in two distinct ways:
//
//   1. The prefix-match ACCIDENTALLY succeeded for a wrap-fragment because
//      `stream[N]` (e.g. 'Та Өөрийн нүүр царайг нуусанд') shares its first
//      12 chars with `rich[N]` (e.g. 'Та Өөрийн нүүр царайг нуусанд би
//      сэтгэл зовж байв.' — the joined two-fragment line). Alignment then
//      desynced at `rich[N+1]` vs the wrap-continuation fragment
//      `stream[N+1]` (e.g. 'би сэтгэл зовж байв.'), producing
//      LINE_COUNT_MISMATCH instead of a clean match.
//
//   2. When `stream[N]` was so much shorter than `rich[N]` that the
//      12-char prefix didn't even succeed, the matcher gave up at this
//      probe entirely — even though concatenating `stream[N] + ' ' +
//      stream[N+1]` would have produced an exact match.
//
// Bridge fix: when alignment fails at a single rich line OR when the rich
// line is meaningfully longer than the stream line (suggesting wrap
// happened), try absorbing 1-2 trailing wrap-continuation stream rows into
// the current rich line. A "wrap continuation" is a row whose first
// non-whitespace character is a lowercase letter (Cyrillic / Latin) — this
// is the strong signal in the LotH PDF body that a logical line continues
// from the previous row. Capital starts (new sentence / verse / proper
// noun), opening quotes/parens, dashes, and digits are EXCLUDED.

const MAX_WRAP_BRIDGE_DEPTH = 3 // 1 primary + up to 2 absorbed = up to 3 stream rows

/**
 * F-X11 WI-A2-2 (#456) — strict-match guard for wrap bridges.
 *
 * `stanzaFirstLineMatches` accepts a 12-char prefix match as a typography-
 * drift fallback (smart-quote vs straight-quote / inner em-dash drift).
 * That tolerance is appropriate at the line-by-line alignment cursor
 * where both sides are meant to represent the SAME logical line. It is
 * NOT appropriate at the bridge-acceptance gate: the bridge claim is
 * "concat of N short rows EQUALS the long target row", and `concat`
 * length is a strong invariant — a real wrap bridge produces `concat`
 * length ≈ target length. A spurious 12-char prefix-only match on a
 * clearly-different length collapses an unrelated lower-line under the
 * bridge head and silently de-syncs every following alignment step.
 *
 * Production-shape false-positive (#456 regression on Tobit 13:8-11
 * block 8): rich.0 = 'Сэтгэл минь Эзэний, агуу Хааныг' (31 chars),
 * rich.1 = 'ерөөн магтагтун.' (16 chars, lowercase wrap continuation),
 * ext s1.6 = 'Сэтгэл минь Эзэнийг, агуу Хааныг' (32 chars — single-char
 * 'Эзэнийг' typography drift vs rich's 'Эзэний'). Without this guard
 * the reverse bridge's 12-char-prefix match accepted the joined concat
 * 'Сэтгэл минь Эзэний, агуу Хааныг ерөөн магтагтун.' (~48 chars) as
 * matching ext s1.6 (~32 chars), absorbing rich.1 spuriously. The next
 * step then tried to align rich.2 against ext s1.7, which succeeded
 * deceptively (the 12-char prefix matched ANOTHER short ext line),
 * and the entire block silently mis-mapped — verdict drifted from
 * pre-#456 PASS into post-#456 NO_MATCHING_EXTRACTOR_STANZA on probe
 * exhaustion, caught by the Phase 2-B regression sweep.
 *
 * Tolerance: `max(4, ceil(0.15 × max-len))`. The fixed floor of 4
 * covers common typography insertions (' бол', word-stem typos within
 * one or two chars); the percentage stretches with line size to keep
 * longer lines usable when their proportional drift is small.
 *
 * @param {string} concat — joined multi-row text from one side of the bridge
 * @param {string} target — single-row text from the other side
 * @returns {boolean}
 */
function bridgeMatch(concat, target) {
  if (!stanzaFirstLineMatches(concat, target)) return false
  const at = (concat || '').trim()
  const bt = (target || '').trim()
  const delta = Math.abs(at.length - bt.length)
  const maxAllowed = Math.max(4, Math.ceil(0.15 * Math.max(at.length, bt.length)))
  return delta <= maxAllowed
}

/**
 * F-X11 WI-A2 (#452) — true if `text` looks like a wrap-continuation of the
 * previous physical line. Conservative: only the lowercase-letter case
 * passes; anything that could plausibly start a new logical unit (capital,
 * digit, opening punctuation) is rejected so the bridge cannot accidentally
 * absorb a new stanza / new sentence / page-footer fragment.
 *
 * Cyrillic case is detected via Unicode case sensitivity (`ch.toUpperCase()
 * !== ch && ch.toLowerCase() === ch`), which correctly handles the Mongolian
 * Cyrillic alphabet (а-я, ө, ү, plus Latin a-z) without per-script tables.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isWrapContinuation(text) {
  const t = (text || '').trim()
  if (!t) return false
  // Reject opening punctuation that suggests a new sentence / quote /
  // stanza / dialog turn. Mongolian PDFs use both « » guillemets and
  // ASCII / curly quotes; cover the common variants here.
  if (/^[«»"'""„‟''‚‛(\[—–\-]/.test(t)) return false
  // Reject digit-leading rows (page numbers, verse labels, page-footer
  // residue from the WI-A bridge — defense in depth).
  if (/^\d/.test(t)) return false
  const ch = t[0]
  // Letter is "lowercase" iff distinct from itself uppercased and equal
  // to itself lowercased. Non-letters fail (toUpperCase === toLowerCase
  // for them), which is the desired behaviour.
  return ch !== ch.toUpperCase() && ch === ch.toLowerCase()
}

/**
 * F-X11 WI-A2 (#452) — try to absorb 1-2 trailing wrap-continuation lines
 * from the stream so that the joined text matches `richText`. Walks
 * incrementally and returns on the first successful concat (so the
 * SHORTEST bridge wins, never over-absorbing).
 *
 * Returns `{ consumed: 2 | 3 }` on success or `null` on failure. consumed=1
 * (no bridging) is the direct-match path handled by `tryAlignStep`, not
 * reported here.
 *
 * @param {{ text: string }[]} stream
 * @param {number} streamIdx
 * @param {string} richText
 * @returns {{ consumed: number } | null}
 */
function tryBridgeWrap(stream, streamIdx, richText) {
  if (streamIdx + 1 >= stream.length) return null
  let concat = (stream[streamIdx]?.text || '').trim()
  for (let depth = 1; depth < MAX_WRAP_BRIDGE_DEPTH; depth++) {
    const i = streamIdx + depth
    if (i >= stream.length) return null
    const next = (stream[i]?.text || '').trim()
    if (!isWrapContinuation(next)) return null
    concat = concat + ' ' + next
    // F-X11 WI-A2-2 (#456) — `bridgeMatch` adds a length-similarity guard
    // on top of `stanzaFirstLineMatches`'s 12-char prefix tolerance, so a
    // partial concat (only `streamIdx + streamIdx+1`) cannot accidentally
    // satisfy the bridge claim against a much-longer rich line by sharing
    // its 12-char prefix. The forward direction was previously immune in
    // practice because column-break wraps emit nearly-equal-length pairs;
    // the guard formalises the invariant so future wrap shapes (mixed
    // typography + multi-row) cannot regress.
    if (bridgeMatch(concat, richText)) {
      return { consumed: depth + 1 }
    }
  }
  return null
}

/**
 * F-X11 WI-A2-2 (#456) — REVERSE direction wrap-tolerant bridge: mirror of
 * `tryBridgeWrap` for the case where rich.json carries a phrase-split
 * (R-8 result — a logical line broken across 2-3 short rich lines, with
 * the continuation lines starting lowercase) and the extractor has the
 * SAME logical line wrap-MERGED into a single physical row. Pre-#456 the
 * matcher tried only forward bridge (rich-merged ← ext-split); the
 * mirror case (rich-split → ext-merged) silently failed at line N+1
 * because the second rich line never appears as a standalone physical
 * row in the stream.
 *
 * The mechanism is exactly symmetric: when `richTexts[richIdx]` is
 * meaningfully shorter than `streamText` (the ext line at the alignment
 * cursor) AND `richTexts[richIdx+1]` looks like a wrap continuation
 * (lowercase-letter-leading, no opening punctuation, no leading digit —
 * same `isWrapContinuation` guard the forward direction uses),
 * concatenate `richTexts[richIdx] + ' ' + richTexts[richIdx+1]` and
 * compare against `streamText`. The shortest valid bridge wins (so a
 * 2-rich-line bridge is preferred over a 3-rich-line bridge when both
 * would match), and the conservative guard rejects capital starts /
 * opening quotes / digits to keep new-sentence / new-verse / page-
 * footer fragments from being absorbed.
 *
 * Production-shape regression: Revelation 4:11; 5:9-10, 12 b1 lines
 * 14-15 (rich='Алдар ба' + 'магтаалыг авах зохистой нь Тэр мөн.' →
 * ext s1.17='Алдар ба магтаалыг авах зохистой нь Тэр мөн.'). Without
 * this bridge the block reports rich=16 ext=15 and is rejected at the
 * atomic gate; with it, the block aligns 1-1 except at lines 14-15
 * which collapse to a single ext line with `bridgedTargetCoords`
 * carrying both rich line indices.
 *
 * @param {string[]} richTexts
 * @param {number} richIdx
 * @param {string} streamText
 * @returns {{ consumed: number } | null} — `consumed` is the number of
 *   rich lines absorbed (2 or 3); `null` when no valid bridge exists.
 */
function tryBridgeRich(richTexts, richIdx, streamText) {
  if (richIdx + 1 >= richTexts.length) return null
  let concat = (richTexts[richIdx] || '').trim()
  for (let depth = 1; depth < MAX_WRAP_BRIDGE_DEPTH; depth++) {
    const i = richIdx + depth
    if (i >= richTexts.length) return null
    const next = (richTexts[i] || '').trim()
    if (!isWrapContinuation(next)) return null
    concat = concat + ' ' + next
    // F-X11 WI-A2-2 (#456) — see `bridgeMatch` doc for why the length
    // guard is critical here: without it, the 12-char prefix tolerance
    // in `stanzaFirstLineMatches` accepts a much-longer rich-merged
    // concat as matching a short ext line whenever they share a 12-char
    // opening (Tobit 13:8-11 b8 regression: rich.0 'Сэтгэл минь Эзэний…'
    // 31 chars, ext s1.6 'Сэтгэл минь Эзэнийг…' 32 chars, single-char
    // typography drift on the 'Эзэний'/'Эзэнийг' suffix is fine for
    // line-by-line alignment but would falsely accept the full bridge
    // 'Сэтгэл минь Эзэний… ерөөн магтагтун.' ~48 chars at this gate).
    if (bridgeMatch(concat, streamText)) {
      return { consumed: depth + 1 }
    }
  }
  return null
}

/**
 * F-X11 WI-A2 (#452) + WI-A2-2 (#456) — align ONE STEP of the rich/stream
 * walk: consume `consumedRich` rich lines and `consumedStream` stream rows
 * such that the consumed text from each side matches.
 *
 * Three alignment shapes:
 *   - Direct (1 rich ↔ 1 stream): stanzaFirstLineMatches passes 1-1.
 *   - FORWARD bridge (1 rich ↔ N stream, N≥2): rich is meaningfully
 *     longer than the stream line at the cursor, and trailing stream
 *     rows are wrap continuations (#452 mechanism).
 *   - REVERSE bridge (N rich ↔ 1 stream, N≥2): stream is meaningfully
 *     longer than the rich line at the cursor, and trailing rich lines
 *     are wrap continuations (#456 mechanism — mirror of #452).
 *
 * Order of attempts (parallels the asymmetric forward-direction
 * behaviour from #452):
 *   1. If rich is meaningfully longer than the stream line, try
 *      FORWARD bridge first. Avoids the 12-char prefix accidentally
 *      accepting a wrap-fragment as the whole rich line.
 *   2. If stream is meaningfully longer than the rich line, try
 *      REVERSE bridge first. Avoids the symmetric prefix-trap where
 *      the 12-char prefix would accept the short rich line as the
 *      whole stream line (and de-sync the next rich/stream pair).
 *   3. Direct 1-1 match.
 *   4. Final fallback: try BOTH bridges in succession (forward, then
 *      reverse) for typography-drift cases where lengths are similar
 *      but exact + 12-char prefix both fail.
 *
 * @param {{ text: string }[]} stream
 * @param {number} streamIdx
 * @param {string[]} richTexts
 * @param {number} richIdx
 * @returns {{ consumedRich: number, consumedStream: number } | null}
 */
function tryAlignStep(stream, streamIdx, richTexts, richIdx) {
  if (streamIdx >= stream.length) return null
  if (richIdx >= richTexts.length) return null
  const sText = (stream[streamIdx]?.text || '').trim()
  const rText = (richTexts[richIdx] || '').trim()
  const hasNextRich = richIdx + 1 < richTexts.length

  // 1. Forward bridge first when rich is meaningfully longer.
  if (rText.length > sText.length && sText.length > 0) {
    const bridged = tryBridgeWrap(stream, streamIdx, rText)
    if (bridged) return { consumedRich: 1, consumedStream: bridged.consumed }
  }

  // 2. Reverse bridge first when stream is meaningfully longer (#456).
  // Mirror of step 1 — same prefix-trap surface, opposite direction.
  if (sText.length > rText.length && rText.length > 0 && hasNextRich) {
    const bridged = tryBridgeRich(richTexts, richIdx, sText)
    if (bridged) return { consumedRich: bridged.consumed, consumedStream: 1 }
  }

  // 3. Direct match.
  if (stanzaFirstLineMatches(sText, rText)) {
    return { consumedRich: 1, consumedStream: 1 }
  }

  // 4. Final fallback bridges for typography-drift / asymmetry cases.
  const fwd = tryBridgeWrap(stream, streamIdx, rText)
  if (fwd) return { consumedRich: 1, consumedStream: fwd.consumed }
  if (hasNextRich) {
    const rev = tryBridgeRich(richTexts, richIdx, sText)
    if (rev) return { consumedRich: rev.consumed, consumedStream: 1 }
  }
  return null
}

/**
 * F-X11 WI-A2 (#452) + WI-A2-2 (#456) — align the entire `richTexts`
 * sequence to the stream starting at `probe`, allowing per-step
 * forward and reverse wrap-bridge absorption.
 *
 * Returns `{ windowEnd, streamIndices }` on success where
 * `streamIndices[k]` is the array of stream indices consumed by rich
 * line `k`:
 *   - Direct match: `[streamIdx]` (length 1).
 *   - Forward bridge: `[streamIdx, streamIdx+1, ...]` (length 2-3) for
 *     the SINGLE rich line that absorbed multiple stream rows.
 *   - Reverse bridge: each of the multiple rich lines in the group
 *     gets `[streamIdx]` (same single stream index), so the
 *     downstream window builder can detect "reverse continuation"
 *     entries (k>0 with streamIndices[k-1][0] === streamIndices[k][0]
 *     AND length 1) and suppress their paragraph-start inheritance.
 *
 * `windowEnd` is the LAST stream index consumed (inclusive).
 *
 * Returns `null` when no alignment exists at this probe.
 *
 * @param {{ text: string }[]} stream
 * @param {number} probe
 * @param {string[]} richTexts
 * @returns {{ windowEnd: number, streamIndices: number[][] } | null}
 */
function alignAtProbe(stream, probe, richTexts) {
  let streamIdx = probe
  let richIdx = 0
  const streamIndices = []
  while (richIdx < richTexts.length) {
    const step = tryAlignStep(stream, streamIdx, richTexts, richIdx)
    if (!step) return null
    if (step.consumedRich === 1) {
      // Direct (consumedStream=1) or forward bridge (consumedStream≥2).
      // The single rich line at `richIdx` absorbed `consumedStream`
      // stream rows; record all of them on this rich line's entry.
      const indices = []
      for (let i = 0; i < step.consumedStream; i++) indices.push(streamIdx + i)
      streamIndices.push(indices)
    } else {
      // Reverse bridge: `consumedRich` rich lines (≥2) all reduce to
      // a SINGLE stream row. Each rich line gets the same stream
      // index recorded; the window builder uses identical-streamIdx
      // sequences as the reverse-continuation signal.
      // INVARIANT: reverse bridge always consumes exactly 1 stream
      // row (tryAlignStep enforces this — `tryBridgeRich` returns
      // consumed counts the rich rows, the stream is fixed at the
      // alignment cursor).
      for (let i = 0; i < step.consumedRich; i++) {
        streamIndices.push([streamIdx])
      }
    }
    richIdx += step.consumedRich
    streamIdx += step.consumedStream
  }
  return { windowEnd: streamIdx - 1, streamIndices }
}

/**
 * Translate the extractor's phrase list (whose lineRange is RELATIVE to
 * each extractor stanza) into rich-block-relative phrases by walking the
 * window in the flat stream. Only phrases whose every line in the
 * extractor stanza falls inside the window are kept; cross-window phrases
 * (would happen if rich.json splits a phrase the extractor groups) are
 * dropped — they shouldn't exist when line-by-line text already matches.
 *
 * F-X11 WI-A2 (#452) — window entries can carry `bridgedSourceCoords`
 * (multiple `(stanzaPos, lineWithinStanza)` pairs from the stream that
 * were absorbed into a single rich line via cross-column wrap bridge).
 * All bridged source coords map to the SAME windowIndex so a phrase that
 * straddles the bridged stream rows collapses into a single rich-line
 * phrase. Entries without `bridgedSourceCoords` (legacy callers / direct
 * 1-1 alignment) fall back to the entry's own `(stanzaPos,
 * lineWithinStanza)`.
 *
 * @param {{
 *   stanzaPos: number,
 *   lineWithinStanza: number,
 *   bridgedSourceCoords?: { stanzaPos: number, lineWithinStanza: number }[],
 * }[]} window
 * @param {{ stanzaIndex?: number, phrases: any[] }[]} extractorStanzas
 */
function translatePhrases(window, extractorStanzas) {
  // Build a quick lookup: (stanzaPos, lineWithinStanza) → windowIndex[].
  // F-X11 WI-A2 (#452) — when an entry carries bridgedSourceCoords (>1
  // stream rows merged into one rich line via FORWARD wrap bridge),
  // every source coord maps to the SAME windowIndex.
  // F-X11 WI-A2-2 (#456) — REVERSE bridge case: a single source coord
  // (one ext line) maps to MULTIPLE windowIndices (the multiple rich
  // lines the ext line was split across). The lookup value is therefore
  // an array; downstream phrase translation must collect all indices.
  // For 1-1 alignment the array has length 1; for forward bridges every
  // bridged source coord points to a single windowIndex array; for
  // reverse bridges the same source coord is appended once per
  // windowIndex (length 2-3).
  const lookup = new Map()
  for (let i = 0; i < window.length; i++) {
    const w = window[i]
    const coords = w.bridgedSourceCoords || [
      { stanzaPos: w.stanzaPos, lineWithinStanza: w.lineWithinStanza },
    ]
    for (const c of coords) {
      const key = `${c.stanzaPos}:${c.lineWithinStanza}`
      const existing = lookup.get(key)
      if (existing) {
        existing.push(i)
      } else {
        lookup.set(key, [i])
      }
    }
  }
  const phrases = []
  for (let s = 0; s < extractorStanzas.length; s++) {
    for (const phrase of extractorStanzas[s].phrases) {
      // FR-161 R-9.D — coverage repair for boundary-crossing phrases.
      // When a rich block starts at a wrap-continuation line (Psalm 147
      // v12 starts mid-sentence "хөндлүүдийг бэхжүүлэн"), the matching
      // extractor phrase straddles the window's leading edge: lineRange
      // [k-1, k] in extractor, but k-1 lives BEFORE the window start.
      // Old behaviour dropped the entire phrase, leaving rich line 0
      // uncovered → R-6 verifier coverage gap. New behaviour: clip the
      // phrase to the window's intersection so coverage is preserved.
      //
      // F-X11 WI-A2 (#452) — when bridge collapsed multiple stream rows
      // into one rich line, multiple source coords resolve to the SAME
      // windowIndex. Track UNIQUE windowIndices and require contiguity on
      // those — not on the source coord count, which would over-count.
      const origStart = phrase.lineRange[0]
      const origEnd = phrase.lineRange[1]
      const hitWindowIndices = []
      for (let li = origStart; li <= origEnd; li++) {
        const wis = lookup.get(`${s}:${li}`)
        if (wis !== undefined) {
          for (const wi of wis) hitWindowIndices.push(wi)
        }
      }
      if (hitWindowIndices.length === 0) continue // phrase outside window entirely
      const firstInWindow = Math.min(...hitWindowIndices)
      const lastInWindow = Math.max(...hitWindowIndices)
      // Verify the unique windowIndices form a contiguous range (e.g.
      // {3} or {3,4,5}) — gaps would indicate a discontiguous clip and
      // are dropped to keep phrase coverage honest.
      const uniqueSorted = [...new Set(hitWindowIndices)].sort((a, b) => a - b)
      let contiguous = true
      for (let i = 1; i < uniqueSorted.length; i++) {
        if (uniqueSorted[i] !== uniqueSorted[i - 1] + 1) {
          contiguous = false
          break
        }
      }
      if (!contiguous) continue
      phrases.push({
        ...phrase,
        lineRange: [firstInWindow, lastInWindow],
      })
    }
  }
  // Sort by start index for stable output.
  phrases.sort((a, b) => a.lineRange[0] - b.lineRange[0])
  // FR-161 R-9.D — final coverage backfill. R-6 verifier demands every
  // line index is covered by at least one phrase. After the contiguous
  // clip pass, a window index can be uncovered when the source phrase
  // crossed the window's leading or trailing edge and was either dropped
  // (no surviving lookup) or clipped (kept neighbours). Backfill each
  // uncovered index as its own single-line phrase. SKIP backfill when the
  // extractor stream had zero phrases overall — that path means "no
  // phrase data available", and the caller (`injectPhrasesIntoRichData`)
  // wants to strip the `phrases` field so legacy line-render takes over.
  const totalExtractorPhrases = extractorStanzas.reduce(
    (acc, s) => acc + (s.phrases?.length ?? 0),
    0,
  )
  if (totalExtractorPhrases === 0) return []
  const covered = new Set()
  for (const p of phrases) {
    for (let i = p.lineRange[0]; i <= p.lineRange[1]; i++) covered.add(i)
  }
  for (let i = 0; i < window.length; i++) {
    if (covered.has(i)) continue
    phrases.push({ lineRange: [i, i], indent: 0 })
  }
  phrases.sort((a, b) => a.lineRange[0] - b.lineRange[0])
  // F-X11 Phase 2-D (#463) — lineRange dedup pass.
  //
  // Two source-side mechanisms can produce two phrase entries with the
  // SAME rich-relative `lineRange` after the upstream coord→windowIndex
  // translation:
  //   1. Two extractor phrases that start at neighbouring lines but, via
  //      FORWARD-bridge merging (#452 cross-column wrap), both collapse
  //      onto the same single rich line — both end up with `[k, k]`.
  //   2. Adjacent extractor phrases that, after REVERSE-bridge fan-out
  //      (#456 ext-line-split-across-rich-rows), both clip to the same
  //      `[k, k]` window slice (because the same windowIndex is the
  //      only one inside the window for both source lines).
  //
  // Without dedup the renderer renders the same rich line twice, which
  // surfaces as the user-visible NFR-009j 0-OVERLAP regression caught in
  // #457 (Psalm 16:1-6 b0 phrases[3]+[4] / Psalm 137:1-6 b1
  // phrases[2]+[3] both lineRange [3,3] / [2,2] respectively). Keep the
  // first occurrence (sort already runs by start) and drop the rest.
  const seenLineRange = new Set()
  const deduped = []
  for (const p of phrases) {
    const key = `${p.lineRange[0]}:${p.lineRange[1]}`
    if (seenLineRange.has(key)) continue
    seenLineRange.add(key)
    deduped.push(p)
  }
  return deduped
}

/**
 * Plan the (ref, stanza) updates for a single batch ref. Pure: returns
 * `{ updates, issues }` without mutating the input.
 *
 * Window-based matching: searches for a contiguous N-line window across
 * the flat extractor stream (rather than requiring an extractor stanza to
 * start at exactly the rich block's first line). This handles rich.json
 * structures that combine several PDF blank-separated mini-stanzas into a
 * single logical stanza block.
 *
 * @param {{ block: any, blockIndex: number }[]} richStanzaSlots
 * @param {{ stanzaIndex?: number, lines: string[], phrases: any[] }[]} extractorStanzas
 * @returns {{
 *   updates: { blockIndex: number, phrases: any[], richFirstLine: string }[],
 *   issues: { blockIndex: number, kind: string, [key: string]: any }[],
 * }}
 */
export function planRefUpdates(richStanzaSlots, extractorStanzas) {
  const updates = []
  const issues = []
  const stream = flattenExtractorStream(extractorStanzas)
  // Track consumed window ranges so two rich blocks can't claim the same
  // span. Stored as [start, end] inclusive, sorted by start.
  const consumed = []
  function isOverlap(start, end) {
    for (const [cs, ce] of consumed) {
      if (start <= ce && end >= cs) return true
    }
    return false
  }

  for (const slot of richStanzaSlots) {
    const richTexts = (slot.block.lines || []).map(
      (l) => l?.spans?.[0]?.text || '',
    )
    const richFirstLine = richTexts[0]?.trim() ?? ''
    if (!richFirstLine) {
      issues.push({ blockIndex: slot.blockIndex, kind: 'EMPTY_RICH_LINE' })
      continue
    }
    // F-X11 WI-A2 (#452) — wrap-tolerant alignment. `alignAtProbe` walks
    // the stream from `probe` and absorbs trailing wrap-continuation rows
    // into the current rich line when the rich line is meaningfully
    // longer than the stream line at the alignment cursor. The total
    // stream rows consumed for a window can therefore be ≥
    // `richTexts.length`. Probe loop bound `probe < stream.length` lets
    // alignAtProbe naturally short-circuit on stream exhaustion.
    let windowStart = -1
    let alignment = null
    for (let probe = 0; probe < stream.length; probe++) {
      const a = alignAtProbe(stream, probe, richTexts)
      if (!a) continue
      if (isOverlap(probe, a.windowEnd)) continue
      windowStart = probe
      alignment = a
      break
    }
    if (windowStart < 0) {
      // Fall back diagnostic: find any matching first-line position, then
      // measure how far it agrees in sequence before drifting. Three
      // distinguishable outcomes:
      //   - first line absent entirely → NO_MATCHING_EXTRACTOR_STANZA
      //   - first line found, prefix matches all richTexts (would have
      //     succeeded but every such window is already consumed by an
      //     earlier slot) → NO_MATCHING_EXTRACTOR_STANZA (window contention)
      //   - first line found, sequence drifts before reaching N → LINE_COUNT_MISMATCH
      const firstLineHit = stream.findIndex((s) =>
        stanzaFirstLineMatches(s.text, richTexts[0]),
      )
      if (firstLineHit < 0) {
        issues.push({
          blockIndex: slot.blockIndex,
          kind: 'NO_MATCHING_EXTRACTOR_STANZA',
          richFirstLine,
        })
      } else {
        const matchedPrefix = countMatchingPrefix(stream, firstLineHit, richTexts)
        if (matchedPrefix === richTexts.length) {
          // The text aligns; only blocker was overlap with a prior consumed
          // window. Surface it as NO_MATCHING_EXTRACTOR_STANZA — the
          // operator's fix is to either map to a different ref or split
          // the rich block.
          issues.push({
            blockIndex: slot.blockIndex,
            kind: 'NO_MATCHING_EXTRACTOR_STANZA',
            richFirstLine,
          })
        } else {
          issues.push({
            blockIndex: slot.blockIndex,
            kind: 'LINE_COUNT_MISMATCH',
            richFirstLine,
            richLineCount: richTexts.length,
            extractorLineCount: matchedPrefix,
          })
        }
      }
      continue
    }
    // F-X11 WI-A2 (#452) + WI-A2-2 (#456) — build window entries from
    // the per-rich-line streamIndices arrays. Each entry's PRIMARY
    // metadata (text, stanzaPos, lineWithinStanza, isParagraphStart)
    // comes from the FIRST source stream row. Forward-bridged
    // subsequent rows contribute their (stanzaPos, lineWithinStanza)
    // to `bridgedSourceCoords` so phrase translation can map them all
    // to the same windowIndex. Bridged rows do NOT contribute
    // paragraph boundaries — wrap continuations are by definition
    // intra-line, not paragraph breaks.
    //
    // REVERSE-bridge case (#456): when rich-split lines collapse to a
    // single stream row, alignAtProbe emits multiple consecutive
    // entries with IDENTICAL `indices=[streamIdx]` (length 1). Detect
    // by comparing entry `k`'s indices to entry `k-1`'s — if they
    // share a single stream index, entry `k` is a continuation of
    // the reverse-bridged group whose head is at `k-1`'s position.
    // For continuations: copy the source's (stanzaPos,
    // lineWithinStanza) (so phrase lookup still resolves correctly)
    // but SUPPRESS isParagraphStart — the source ext line has at most
    // ONE PB-start (corresponding to the head rich line), and
    // continuation rich lines are intra-source-line splits that
    // cannot independently introduce a paragraph break (semantic
    // invariant from the dispatch — same reasoning as forward
    // bridge's intra-line rule).
    const windowEntries = alignment.streamIndices.map((indices, entryIdx) => {
      const primary = stream[indices[0]]
      const prev = entryIdx > 0 ? alignment.streamIndices[entryIdx - 1] : null
      const isReverseContinuation =
        !!prev &&
        prev.length === 1 &&
        indices.length === 1 &&
        prev[0] === indices[0]
      return {
        text: primary.text,
        stanzaPos: primary.stanzaPos,
        lineWithinStanza: primary.lineWithinStanza,
        isParagraphStart: isReverseContinuation
          ? false
          : primary.isParagraphStart,
        bridgedSourceCoords: indices.map((si) => ({
          stanzaPos: stream[si].stanzaPos,
          lineWithinStanza: stream[si].lineWithinStanza,
        })),
      }
    })
    consumed.push([windowStart, alignment.windowEnd])
    const translatedPhrases = translatePhrases(windowEntries, extractorStanzas)
    // F-X11 Phase 2-D (#463) — propagate rich block line.indent into
    // phrase.indent.
    //
    // Background: extractor's `phrases[i].indent` is derived from the
    // PDF column position relative to the per-column baseline (Stage 1
    // visual-indent). For a stanza whose entire body sits at one
    // visual-indent step above its column baseline (e.g. Psalm 30:2-13
    // antiphon block at PDF baseline+PHRASE_INDENT_STEP), that whole
    // block's extractor `indent` is 0 even though every rich line carries
    // `line.indent === 1`. The renderer's `phrase.indent === 0 → pl-6`
    // path then renders a flush-left line — the regression
    // dispatch-#463 calls out as "Psalm 30:2-13 b0/b2/b4 phrase.indent
    // flatten".
    //
    // Fix: when EVERY rich line in the phrase's coverage carries the
    // same numeric `line.indent` value, override `phrase.indent` to
    // match. Mixed-indent phrases (rare — a phrase straddling a 0/1
    // change) keep the extractor value to avoid silently widening when
    // the source data already disagrees with itself.
    const richLines = slot.block.lines || []
    for (const phrase of translatedPhrases) {
      const start = phrase.lineRange[0]
      const end = phrase.lineRange[1]
      if (start < 0 || end >= richLines.length) continue
      const headIndent = Number(richLines[start]?.indent) || 0
      let uniform = true
      for (let i = start + 1; i <= end; i++) {
        const li = Number(richLines[i]?.indent) || 0
        if (li !== headIndent) {
          uniform = false
          break
        }
      }
      if (!uniform) continue
      // F-X11 Phase 2-F (#477) — skip-if-explicit guard for #475 audit
      // Pattern B/C contamination (intentional non-zero phrase.indent that
      // disagrees with the uniform line.indent — Roman 'I'/'II' centered
      // markers, short hanging-indent wrap-continuations). Per audit
      // verdict GO_WITH_CAVEAT, these explicit non-zero indents must be
      // preserved across reinject; only Pattern A (phrase.indent=0,
      // line.indent>0 — extractor per-column-baseline absorption) and the
      // already-equal case may proceed to propagation.
      const explicitNonZero =
        Number(phrase.indent) !== 0 && Number(phrase.indent) !== headIndent
      if (explicitNonZero) continue
      phrase.indent = headIndent
    }
    // task #4 (2026-05-14) — rich-line `role` propagation, parallel to the
    // `indent` pass above. The extractor doesn't know about FR-160-A4
    // allowlist `forced_lines` or FR-153f threshold-detected refrain
    // tagging — those live ONLY in `psalter-texts.rich.json` as
    // `line.role='refrain'`. Without this pass, phrase-mode rendering of
    // refrain-tagged psalms (e.g. Psalm 24:1-10, 67:2-8, Daniel 3:57-88,
    // 56) emits 0 `data-role="psalm-phrase-refrain"` markup despite
    // 6/4/44 `line.role='refrain'` annotations in source data — the gap
    // task #3 surfaced via 3 `test.fixme()` Markings in
    // `e2e/prayer-psalm-refrain-allowlist.spec.ts`.
    //
    // Tie-break (CONSERVATIVE — shared with `regroupPhrasesByCapitalStart`):
    //   - All rich lines in the phrase's coverage share the same defined
    //     role → propagate.
    //   - Mixed roles or any undefined → skip (line.role preserved on
    //     `richLines[]`; renderer falls back to legacy line-mode behavior
    //     if needed, and `lines[].role` is the SoT for downstream audits).
    //   - Extractor-set explicit `phrase.role` (rare — never observed in
    //     the current corpus, defensive only) is preserved.
    for (const phrase of translatedPhrases) {
      if (phrase.role !== undefined) continue // preserve extractor-set role
      const start = phrase.lineRange[0]
      const end = phrase.lineRange[1]
      const role = uniformLineRole(richLines, start, end)
      if (role !== undefined) phrase.role = role
    }
    updates.push({
      blockIndex: slot.blockIndex,
      phrases: translatedPhrases,
      paragraphBoundaries: translateParagraphBoundaries(windowEntries),
      richFirstLine,
    })
  }
  return { updates, issues }
}

/**
 * F-X11 (#408) — translate paragraph-boundary markers from extractor-
 * stanza-relative indices to rich-block-relative indices. The flat-stream
 * `window` carries `isParagraphStart` per row (set by
 * `flattenExtractorStream` based on each source stanza's
 * `paragraphBoundaries`). A row at window index `wi` with
 * `isParagraphStart === true` becomes a paragraph boundary at the rich
 * block's line index `wi`.
 *
 * Index 0 is excluded by `flattenExtractorStream` (a boundary at the
 * very first line of a stanza maps to the stanza boundary, not a within-
 * stanza break). Index 0 in the WINDOW would also be a no-op visually
 * (stanza-start spacing already comes from the outer block wrapper), so
 * filter it here defensively.
 *
 * @param {{ isParagraphStart?: boolean }[]} window
 * @returns {number[]}
 */
function translateParagraphBoundaries(window) {
  const out = []
  for (let i = 1; i < window.length; i++) {
    if (window[i].isParagraphStart) out.push(i)
  }
  return out
}

function countMatchingPrefix(stream, start, richTexts) {
  let n = 0
  while (
    start + n < stream.length &&
    n < richTexts.length &&
    stanzaFirstLineMatches(stream[start + n].text, richTexts[n])
  ) {
    n++
  }
  return n
}

/**
 * Curator queue bulk-hotfix (#447 — audit #446) — header artifact filter.
 *
 * The multi-page gather inside `processOne` walks 2-5 columns per ref via
 * `MULTI_PAGE_DEPTH=4`; each scanned column produces stanzas, and ANY of
 * them with Stage 1↔Stage 2 disagreement is flagged `needsReview` and
 * pushed to the curator queue regardless of whether `injectPhrasesIntoRichData`
 * actually used the column (line-count match drove the inject decision).
 *
 * The audit (#446 docs/audit-curator-queue-2026-05-09.md) found 70-80% of
 * the 206-entry queue is SCAN BYPRODUCTS — page titles ("Дуулал N"), book
 * sections ("Магтаал…"), the doxology ("Эцэг, Хүү, Ариун Сүнсэнд…"),
 * day/season/page headers ("Бямба…", "3 ДУГААР ДОЛОО ХОНОГ", Roman
 * numeral dividers "I" / "II", etc.). 12/12 PDF spot-checks confirmed
 * these never correspond to an actually-injected stanza, so suppressing
 * them at queue-collection time has zero rich.json impact.
 *
 * Pattern catalog (Categories A-D from §2 of the audit):
 *   - A. Page-title:        `Дуулал \d+`
 *   - B. Book-section:      `Магтаал[\t ]…`
 *   - C. Doxology:          `Эцэг, Хүү, Ариун Сүнсэнд…`
 *                           `Оройн даатгал залбирал`
 *                           `Дууллын залбирал`
 *                           `Шад (дуулал|магтаал)`
 *   - D. Day/season/page:   `Бямба…`
 *                           `[1-4] ДУГААР ДОЛОО ХОНОГ`
 *                           `Ариун долоо хоног`
 *                           `Амилалтын улирал`
 *                           `Дөчин хоногийн…`
 *                           `12 сарын \d…`
 *                           `I{1,2}$` (exact "I" or "II" Roman dividers)
 *
 * Note on alternation precedence: `I{1,2}$` is anchored only at end-of-
 * string (the `$` does NOT distribute across alternatives — JS regex
 * alternation has lower precedence than concatenation), so a body line
 * starting with "I am a Roman who…" is NOT filtered. This is deliberate —
 * only bare divider lines are noise.
 */
const HEADER_ARTIFACT_RE =
  /^(Дуулал \d+|Магтаал[\t ]|Эцэг, Хүү, Ариун Сүнсэнд|Оройн даатгал залбирал|Дууллын залбирал|Шад (дуулал|магтаал)|Бямба|[1-4] ДУГААР ДОЛОО ХОНОГ|Ариун долоо хоног|Амилалтын улирал|Дөчин хоногийн|12 сарын \d|I{1,2}$)/

/**
 * Curator queue bulk-hotfix (#447) — true if `firstLine` matches one of
 * the header / section / page-title artifact patterns documented above.
 * Trims the input first; tolerates `null`/`undefined`. Exported for unit
 * testability so each catalog entry can be pinned independently of
 * `collectReviewQueue` internals.
 *
 * @param {string} firstLine - the trimmed-or-untrimmed first line of an
 *   extractor stanza.
 * @returns {boolean}
 */
export function isHeaderArtifact(firstLine) {
  return HEADER_ARTIFACT_RE.test((firstLine || '').trim())
}

/**
 * F-X11 follow-up batch (#426 — review #419 M-1) — collect Stage 3
 * `needsReview` flags from extractor stanzas into a curator review queue.
 * The flag is set when Stage 1 (visual indent) and Stage 2 (sentence-end +
 * capital-start punctuation heuristic) disagree on phrase boundaries; the
 * stanza is still injected (Stage 1 wins), but the curator should audit
 * the result before relying on it. Pre-#426 the flag was only surfaced by
 * the EXTRACTOR CLI's `--review-out` sidecar; the BUILDER (which is what
 * `node scripts/build-phrases-into-rich.mjs` runs in batch jobs) silently
 * dropped it on the floor — `needsReview` had 0 occurrences in the
 * builder source. The 124 deferred refs batch re-extraction would
 * therefore have shipped any disagreements without curator visibility.
 *
 * The queue is a SEPARATE channel from rich.json (no schema change). It
 * carries enough context (ref, stanzaIndex, firstLine, lineCount) for a
 * curator to locate each flagged stanza without having to re-run the
 * extractor. The CLI persists it to
 * `.claude/scaffold/phrase-extract-review-queue.json`.
 *
 * Curator queue bulk-hotfix (#447 — audit #446):
 *
 *   1. Header filter — stanzas whose `firstLine` matches `isHeaderArtifact`
 *      (Categories A-D from audit §2 — page titles, book sections,
 *      doxology, day/season/page headers, Roman dividers) are dropped at
 *      queue-collection time. 12/12 PDF spot-checks in #446 confirmed
 *      these never correspond to an injected stanza, so the filter has
 *      zero rich.json impact. ~70-80 of 206 entries (35-40%) suppressed.
 *
 *   2. (firstLine, lineCount) dedupe — the multi-page gather scans the
 *      same column window from neighbouring pages, surfacing the same
 *      `(firstLine, lineCount)` shape multiple times across refs (audit
 *      Category E — Cross-ref firstLine duplicate ~50 overlapping with
 *      A-D). The dedupe set is shared across the whole `batches` input
 *      (NOT per-ref) so cross-ref duplicates collapse to a single queue
 *      entry. Different `lineCount` for the same `firstLine` is preserved
 *      (different cap-windows can be different stanzas).
 *
 * Combined effect (per audit §4): 206 → ~50-80 entries (60-75% reduction).
 *
 * @param {{ ref: string, stanzas: { stanzaIndex?: number, lines: string[], needsReview?: boolean, phrases: any[] }[] }[]} batches
 * @returns {{
 *   ref: string,
 *   stanzaIndex: number,
 *   firstLine: string,
 *   lineCount: number,
 * }[]}
 */
export function collectReviewQueue(batches) {
  const queue = []
  // Bulk-hotfix #447 — dedupe scope is the WHOLE batches input (cross-ref),
  // not per-ref. Audit #446 §2 Cat E (~50 overlapping cross-ref duplicates)
  // is the noise class this collapses.
  const seen = new Set()
  for (const batch of batches) {
    for (let i = 0; i < (batch.stanzas?.length ?? 0); i++) {
      const stanza = batch.stanzas[i]
      if (!stanza?.needsReview) continue
      const firstLine = (stanza.lines?.[0] ?? '').trim()
      const lineCount = stanza.lines?.length ?? 0
      // Bulk-hotfix #447 — header/section/page-title artifact filter.
      if (isHeaderArtifact(firstLine)) continue
      // Bulk-hotfix #447 — (firstLine, lineCount) dedupe across the batch.
      // JSON.stringify gives a collision-free key for the 2-tuple; firstLine
      // can contain any unicode (including tabs / quotes) and lineCount is
      // a small integer.
      const dedupeKey = JSON.stringify([firstLine, lineCount])
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      queue.push({
        ref: batch.ref,
        stanzaIndex: stanza.stanzaIndex ?? i,
        firstLine,
        lineCount,
      })
    }
  }
  return queue
}

/**
 * Plan + apply all batches against the rich data. Atomic: if ANY batch
 * has issues, no mutation happens — returns `{ ok: false, issues }`.
 *
 * F-X11 follow-up batch (#426) — also surfaces `reviewQueue` (a list of
 * `{ ref, stanzaIndex, firstLine, lineCount }` for every extractor stanza
 * with `needsReview: true`) regardless of whether the atomic gate passes.
 * The queue is independent of `data`: even when the gate fails the queue
 * still tells the curator which stanzas the extractor flagged. The CLI
 * writes it to `.claude/scaffold/phrase-extract-review-queue.json` so a
 * batch job can surface curator-needed audits without changing rich.json
 * schema. Schema for the queue entries is documented on
 * `collectReviewQueue` above.
 *
 * @param {Record<string, any>} richData
 * @param {{ ref: string, stanzas: { stanzaIndex?: number, lines: string[], phrases: any[] }[] }[]} batches
 * @returns {{
 *   ok: boolean,
 *   data?: Record<string, any>,
 *   plan?: { ref: string, updates: any[] }[],
 *   issues?: { ref: string, error: string, [key: string]: any }[],
 *   reviewQueue: { ref: string, stanzaIndex: number, firstLine: string, lineCount: number }[],
 * }}
 */
export function injectPhrasesIntoRichData(richData, batches) {
  const reviewQueue = collectReviewQueue(batches)
  // 1. Plan every batch first; collect issues without mutating.
  const planned = []
  const allIssues = []

  for (const batch of batches) {
    const ref = richData[batch.ref]
    if (!ref) {
      allIssues.push({ ref: batch.ref, error: 'REF_NOT_FOUND' })
      continue
    }
    const blocks = ref.stanzasRich?.blocks
    if (!Array.isArray(blocks)) {
      allIssues.push({ ref: batch.ref, error: 'NO_STANZAS_RICH_BLOCKS' })
      continue
    }
    const richStanzaSlots = blocks
      .map((block, blockIndex) => ({ block, blockIndex }))
      .filter((x) => x.block.kind === 'stanza')
    if (richStanzaSlots.length === 0) {
      allIssues.push({ ref: batch.ref, error: 'NO_STANZA_BLOCKS' })
      continue
    }
    const { updates, issues } = planRefUpdates(richStanzaSlots, batch.stanzas)
    if (issues.length > 0) {
      for (const issue of issues) {
        allIssues.push({ ref: batch.ref, error: 'STANZA_PLAN_ISSUE', ...issue })
      }
      continue
    }
    if (updates.length !== richStanzaSlots.length) {
      allIssues.push({
        ref: batch.ref,
        error: 'INCOMPLETE_COVERAGE',
        plannedUpdates: updates.length,
        richStanzaCount: richStanzaSlots.length,
      })
      continue
    }
    planned.push({ ref: batch.ref, updates })
  }

  // 2. Atomic gate.
  if (allIssues.length > 0) {
    return { ok: false, issues: allIssues, plan: planned, reviewQueue }
  }

  // 3. Apply (deep clone the touched refs so the caller's input is intact).
  const data = { ...richData }
  for (const refPlan of planned) {
    const ref = data[refPlan.ref]
    const blocks = ref.stanzasRich.blocks.map((block, i) => {
      const update = refPlan.updates.find((u) => u.blockIndex === i)
      if (!update) return block
      // F-X11 (#408) — apply phrases AND paragraphBoundaries to the block
      // (both fields are independently optional). Idempotent: assigning
      // overwrites any prior values; empty arrays are stripped so a clean
      // re-extraction reverts to the legacy line-render fallback shape.
      const noPhrases = !update.phrases || update.phrases.length === 0
      const noBoundaries =
        !update.paragraphBoundaries || update.paragraphBoundaries.length === 0
      if (noPhrases && noBoundaries) {
        // Strip both a previously-set `phrases` AND
        // `paragraphBoundaries` field if extractor has neither — keeps
        // round-trips honest.
        const {
          phrases: _dropP,
          paragraphBoundaries: _dropB,
          ...rest
        } = block
        return rest
      }
      // Build the next block in a deterministic field order: existing
      // shape, then `phrases`, then `paragraphBoundaries`. JSON
      // serialisation key order is stable in V8 so this keeps diffs
      // small when only one of the two fields is present.
      const next = { ...block }
      if (noPhrases) {
        delete next.phrases
      } else {
        next.phrases = update.phrases
      }
      if (noBoundaries) {
        delete next.paragraphBoundaries
      } else {
        next.paragraphBoundaries = update.paragraphBoundaries
      }
      return next
    })
    data[refPlan.ref] = {
      ...ref,
      stanzasRich: { ...ref.stanzasRich, blocks },
    }
  }
  return { ok: true, data, plan: planned, reviewQueue }
}

/**
 * Render a human-readable dry-run summary.
 *
 * @param {{
 *   ok: boolean,
 *   data?: any,
 *   plan?: { ref: string, updates: any[] }[],
 *   issues?: any[],
 * }} result
 * @returns {string}
 */
export function renderDryRun(result) {
  const lines = []
  if (result.ok) {
    lines.push(`atomic gate: PASS — ${result.plan.length} ref(s) ready to inject`)
    for (const refPlan of result.plan) {
      lines.push(`  ${refPlan.ref}:`)
      for (const u of refPlan.updates) {
        const phraseSummary = u.phrases
          .map((p) => `[${p.lineRange[0]},${p.lineRange[1]}]`)
          .join(' ')
        const pbCount = (u.paragraphBoundaries || []).length
        const pbSummary = pbCount > 0 ? ` ¶=${u.paragraphBoundaries.join(',')}` : ''
        lines.push(
          `    block ${u.blockIndex} (first="${u.richFirstLine.slice(0, 30)}…") → ${u.phrases.length} phrase(s) ${phraseSummary}${pbSummary}`,
        )
      }
    }
  } else {
    lines.push(`atomic gate: FAIL — ${result.issues.length} issue(s); no inject`)
    for (const issue of result.issues) {
      const detail = Object.entries(issue)
        .filter(([k]) => k !== 'ref' && k !== 'error')
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 40) : v}`)
        .join(' ')
      lines.push(`  ${issue.ref}: ${issue.error} ${detail}`)
    }
  }
  return lines.join('\n')
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (!flag.startsWith('--')) continue
    const key = flag.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  }
  return args
}

/**
 * Normalise extractor input into `{ refs: [...] }` regardless of whether
 * the file was a single-ref or multi-ref export. Single-ref needs an
 * external `ref` (from `--ref` flag).
 *
 * @param {any} extractorJson
 * @param {string|undefined} explicitRef
 * @returns {{ ref: string, stanzas: any[] }[]}
 */
function normalizeBatches(extractorJson, explicitRef) {
  if (Array.isArray(extractorJson?.refs)) {
    return extractorJson.refs.map((r) => ({ ref: r.ref, stanzas: r.stanzas }))
  }
  if (Array.isArray(extractorJson?.stanzas)) {
    if (!explicitRef) {
      throw new Error('extractor JSON is single-ref shape but --ref was not provided')
    }
    return [{ ref: explicitRef, stanzas: extractorJson.stanzas }]
  }
  throw new Error('extractor JSON has neither refs[] nor stanzas[]')
}

function cliMain() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('--help')) {
    process.stdout.write(
      'Usage: node scripts/build-phrases-into-rich.mjs ' +
        '--extractor-out <json> [--target <rich.json>] [--ref <key>] ' +
        '[--review-queue <path>] [--no-review-queue] [--dry-run]\n',
    )
    process.exit(argv.length === 0 ? 1 : 0)
  }
  const args = parseCliArgs(argv)
  if (!args['extractor-out']) {
    process.stderr.write('error: --extractor-out is required\n')
    process.exit(2)
  }
  const targetPath = resolve(args.target || DEFAULT_TARGET)
  const extractorJson = JSON.parse(readFileSync(args['extractor-out'], 'utf-8'))
  const batches = normalizeBatches(extractorJson, args.ref)
  const richData = JSON.parse(readFileSync(targetPath, 'utf-8'))

  const result = injectPhrasesIntoRichData(richData, batches)
  process.stdout.write(renderDryRun(result) + '\n')

  // F-X11 follow-up batch (#426 — review #419 M-1): always surface the
  // curator review queue regardless of atomic gate result. When the gate
  // fails the data isn't written, but the queue still tells the curator
  // which extractor stanzas need their attention. `--no-review-queue`
  // suppresses persistence (handy for ephemeral CI checks), and
  // `--review-queue <path>` overrides the default sidecar location.
  // `--dry-run` also suppresses persistence so a dry run never mutates
  // the queue file (parallel to its `data` non-write semantics).
  const writeReviewQueue =
    !args['no-review-queue'] &&
    !args['dry-run'] &&
    Array.isArray(result.reviewQueue) &&
    result.reviewQueue.length > 0
  if (writeReviewQueue) {
    const reviewQueuePath = resolve(
      args['review-queue'] || DEFAULT_REVIEW_QUEUE_PATH,
    )
    writeFileSync(
      reviewQueuePath,
      JSON.stringify(result.reviewQueue, null, 2) + '\n',
      'utf-8',
    )
    process.stderr.write(
      `note: ${result.reviewQueue.length} stanza(s) flagged needsReview, ` +
        `wrote curator queue to ${reviewQueuePath}\n`,
    )
  } else if (
    Array.isArray(result.reviewQueue) &&
    result.reviewQueue.length > 0
  ) {
    process.stderr.write(
      `note: ${result.reviewQueue.length} stanza(s) flagged needsReview ` +
        `(queue not persisted: --no-review-queue or --dry-run)\n`,
    )
  }

  if (!result.ok) {
    process.exit(3)
  }
  if (args['dry-run']) {
    process.stdout.write('dry-run: target NOT modified\n')
    return
  }
  writeFileSync(targetPath, JSON.stringify(result.data, null, 2) + '\n', 'utf-8')
  process.stdout.write(`wrote ${targetPath}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
