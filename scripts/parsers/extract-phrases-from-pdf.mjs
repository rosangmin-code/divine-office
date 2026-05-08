#!/usr/bin/env node
/**
 * extract-phrases-from-pdf.mjs — FR-161 R-1 phrase extractor.
 *
 * Reads `public/psalter.pdf` (or any compatible 2-up landscape PDF) for a
 * given book page + column, and emits per-stanza `PhraseGroup[]` (R-3 schema,
 * src/lib/types.ts) that downstream R-2 builder uses to enrich the rich AST.
 *
 * Design overview (planer plan §5, R-0 spike doc):
 *
 *   Stage 1 — visual indent (PRIMARY)
 *     `pdftotext -layout` preserves x position as ASCII spaces. Within each
 *     column produced by `pdftotext-column-splitter.mjs`, the per-column
 *     baseline is the most-common leading-whitespace count among non-blank
 *     content lines. Lines at baseline = phrase START; lines at baseline+3
 *     (the empirically observed wrap delta on the pilot pages — Psalm 24
 *     left col 3→6, Psalm 8 left col 3→6, Psalm 110 right col 51→54) =
 *     phrase WRAP. Blank lines = stanza boundary.
 *
 *   Stage 2 — punctuation + capitalization heuristic (CROSS-CHECK)
 *     Cyrillic-safe (uses Unicode property `\p{Lu}` + `(?:\s|$)` instead of
 *     `\b` per memory `feedback_regex_unicode_boundary`). A phrase boundary
 *     is inferred when a line ends with sentence punctuation `[.!?]` (with
 *     optional trailing close-quote) AND the next non-blank line begins with
 *     an uppercase letter. This is auxiliary; Stage 1 wins on disagreement.
 *
 *   Stage 3 — cross-check
 *     If Stage 1 and Stage 2 produce identical phrase boundaries: auto-
 *     accept. Otherwise: still emit Stage 1 result but tag the stanza
 *     `needsReview: true` so the manual review queue
 *     (`scripts/out/fr-161-phrases-needs-review.json`) flags it.
 *
 * Output schema (per stanza, R-3 compatible):
 *
 *   {
 *     stanzaIndex: 0,
 *     lines: ["text without leading whitespace", ...],
 *     phrases: [{ lineRange: [0, 1], indent: 0 }, ...],
 *     needsReview: false,
 *   }
 *
 * The `phrases` array follows `src/lib/types.ts` `PhraseGroup` exactly
 * (`lineRange [start, end]` inclusive both ends, indexes into `lines[]`).
 *
 * CLI:
 *
 *   node scripts/parsers/extract-phrases-from-pdf.mjs \
 *     --pdf public/psalter.pdf --book-page 92 --column left
 *
 * Module API (preferred for tests / build pipeline):
 *
 *   import { extractPhrasesFromColumn } from './extract-phrases-from-pdf.mjs'
 *   const result = extractPhrasesFromColumn(columnLines)
 *
 * Dependencies: poppler-utils (`pdftotext`) when invoked through CLI;
 * none for the pure-module API.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { splitColumns } from './pdftotext-column-splitter.mjs'
import { bookPageToPhysical } from './book-page-mapper.mjs'

/**
 * Empirical phrase-wrap column delta. Stage 1 treats lines whose relativeCol
 * matches `currentPhrase.indent * PHRASE_INDENT_STEP + WRAP_DELTA` (within
 * `WRAP_TOLERANCE`) as a continuation of the previous phrase. The pilot
 * pages (Psalm 8 / 24 / 110 — book 282 / 92 / 68) all show exactly +3.
 *
 * The band is tight on purpose: `rel = 12` (centred-page heading) MUST NOT
 * be confused with a wrap. When `rel` exceeds `PHRASE_INDENT_STEP` the line
 * is interpreted as a new, deeper-indented phrase, not a continuation.
 */
const WRAP_DELTA = 3
const WRAP_TOLERANCE = 1

/**
 * Phrases nested deeper than the baseline by this many columns are treated
 * as an indent-1 phrase (refrain / quoted line). The pilot pages do not
 * exercise this path (refrains are detected separately via R-2 builder),
 * so this exists only to keep the type domain `0|1|2` honest when an outlier
 * is fed in. Anything beyond +6 from baseline maps to indent=2.
 */
const PHRASE_INDENT_STEP = 6

/**
 * Sentence-terminator regex used by Stage 2. Cyrillic-safe — does NOT use
 * `\b`; punctuation match is anchored with `(?:\s*$)` and the optional close
 * quote covers both straight and curly variants observed in the PDF
 * (`"`, `”` `”`, `’` `'`).
 */
const SENTENCE_END_RE = /[.!?][”"’']?\s*$/u

/**
 * Cyrillic uppercase opener — matches start-of-text uppercase. Stage 2
 * uses `\p{Lu}` (Unicode uppercase letter) so Mongolian Cyrillic capitals
 * (`Э`, `Х`, `М`, etc.) and Latin capitals both register.
 */
const STARTS_UPPER_RE = /^\s*[\p{Lu}А-ЯЁ]/u

/**
 * Read `pdftotext -layout <pdfPath> -` for a given physical page range. The
 * output is whatever poppler-utils emits, including form-feed page separators.
 *
 * @param {string} pdfPath
 * @param {number} from - first physical page (1-based, inclusive)
 * @param {number} to - last physical page (inclusive)
 * @returns {string}
 */
export function pdftotextLayout(pdfPath, from, to) {
  const out = execFileSync(
    'pdftotext',
    ['-layout', '-f', String(from), '-l', String(to), pdfPath, '-'],
    { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 },
  )
  return out
}

/**
 * Detect the per-column baseline column — the leading-whitespace count
 * that hosts the bulk of phrase-start lines.
 *
 * Three-stage policy (FR-161 — F-X10 fix #375 + FU-1 #396):
 *
 *   Stage 1 (count dominance): one candidate's count strictly dominates
 *   every other (top > 2 × runner-up). This handles the common
 *   single-content column — body uniformly at col 3 with minor noise at
 *   col 0 (page header, attribution), or body uniformly at col 0 with
 *   col 3 wrap-indent noise.
 *
 *   Stage 2 (wrap-score tie-break): on ambiguous mixed-content columns
 *   where Stage 1 finds no dominator, score each candidate by counting
 *   "valid wrap pairs" — `prev` at baseline, `cur` at baseline +
 *   WRAP_DELTA, AND `prev` mid-sentence (no terminator). The
 *   sentence-boundary filter excludes section transitions (header →
 *   next-section body) which align with the indent pattern by accident
 *   rather than as content wraps.
 *   Gate: `score >= max(2, occurrence / 5)`. The absolute floor of 2
 *   prevents a single accidental wrap from flipping baseline; the
 *   density floor prevents sparse noise from beating a populated
 *   column with rare wraps. See in-line comment for derivation.
 *
 *   Stage 3 (legacy fallback): smallest non-zero indent with count
 *   ≥ 2, then smallest indent seen. Preserves pre-F-X10 behaviour for
 *   genuinely ambiguous columns where Stage 2 gate finds no
 *   trustworthy wrap signal — typically column-mode psalms whose body
 *   sits at col 3 with no detected wraps.
 *
 * Worked examples (regression cases captured by these stages):
 *
 *   - Psalm 46:2-12 right col (body @ col 0, frequent wraps to col 3) →
 *     Stage 1 dominance fires (col 0 occ=24, col 3 occ=5 → 24 > 10).
 *     Baseline=0. User-reported wrap "Далайн зүрх рүү уулс нуран ороход
 *     ч / бид айхгүй." (book page 153) is preserved.
 *
 *   - Psalm 110:1-5,7 left col (FR-161 R-7 PILOT, body @ col 3) → Stage
 *     1 dominance fires (col 3 occ=18, col 0 occ=4 → 18 > 8). Baseline=3.
 *     Stanza wraps at col 3 → col 6 register correctly.
 *
 *   - Psalm 32 continuation page 136 left col (mixed-content, no
 *     dominator) → Stage 1 fails (col 0 occ=11, col 3 occ=17 → 17 ≤ 22).
 *     Stage 2: col-0 sentence-filtered score = 1 (one header→body
 *     transition, prev mid-sentence-shaped); col-3 score = 0. Gate
 *     col-0: max(2, 11/5) = 2.2 → 1 < 2.2 fails. Gate col-3: 0 < 3.4
 *     fails. Stage 3 falls to col 3 → Baseline=3. Pre-FU-1 gate
 *     `score>=1` would have picked col 0 and over-merged the 11-line
 *     stanza into 1 phrase.
 *
 * @param {string[]} columnLines
 * @returns {number}
 */
export function detectBaselineCol(columnLines) {
  const counts = new Map()
  for (const raw of columnLines) {
    if (raw.trim().length === 0) continue
    const lead = raw.length - raw.trimStart().length
    counts.set(lead, (counts.get(lead) ?? 0) + 1)
  }
  if (counts.size === 0) return 0
  const sorted = [...counts.entries()].sort(([a], [b]) => a - b)
  const candidates = sorted.filter((entry) => entry[1] >= 2).map((entry) => entry[0])
  if (candidates.length === 0) return sorted[0][0]

  // Score each candidate baseline by counting "valid wrap pairs" — the
  // number of consecutive non-blank lines where the first sits at the
  // candidate baseline and the second sits at baseline + WRAP_DELTA
  // (within WRAP_TOLERANCE). This reframes baseline detection as
  // "which baseline interpretation produces the most coherent
  // wrap structure?", which discriminates correctly when a column
  // mixes content at multiple indents (e.g. Psalm 20:2-8 right col
  // mixes col-0 evening-prayer text with col-3 psalm body — body
  // wraps at col 6, so baseline=3 wins).
  //
  // Sentence-boundary filter (FU-1, review #389): a true wrap pair is a
  // mid-sentence continuation — the previous line does NOT end with
  // sentence-terminator punctuation. Pairs whose prev line ends with
  // `.`, `!`, `?` (optional close-quote) are typically section
  // transitions (header → next-section body, end-of-Gloria → seasonal
  // header) that happen to align with the indent pattern by accident,
  // not by content wrap. Filtering these out at the scoring stage
  // prevents Psalm 32 / 116 / 143 page-continuation-style over-merge:
  // mixed-content columns that previously scored col-0 = 1–2 from
  // section transitions now score 0–1, falling below the Stage 2 gate
  // and ceding baseline to the legacy Stage 3 fallback.
  function scoreWraps(baseline) {
    let n = 0
    for (let i = 1; i < columnLines.length; i++) {
      const prev = columnLines[i - 1]
      const cur = columnLines[i]
      if (prev.trim().length === 0 || cur.trim().length === 0) continue
      const prevLead = prev.length - prev.trimStart().length
      const curLead = cur.length - cur.trimStart().length
      if (
        Math.abs(prevLead - baseline) <= WRAP_TOLERANCE &&
        Math.abs(curLead - (baseline + WRAP_DELTA)) <= WRAP_TOLERANCE &&
        !SENTENCE_END_RE.test(prev.trim())
      ) {
        n++
      }
    }
    return n
  }

  // Stage 1 — dominance check.
  //
  // When one candidate's count is more than DOMINANCE_RATIO times every
  // other candidate's count, that candidate is the baseline. This
  // handles the common case of a column with one clear content indent
  // and minor noise at other indents (page number / attribution /
  // section-header at col 0; uniform body at col 3). Without this guard,
  // Stage 2's wrap-score tie-break can spuriously pick a non-dominant
  // anchor when an isolated header→body transition counts as a single
  // "wrap pair" but is not actually a content wrap (Psalm 149:1-9: 25
  // body lines at col 3 vs 3 col-0 lines + 1 attribution→verse
  // transition would otherwise pick baseline=0 and merge the entire
  // psalm into one phrase).
  const DOMINANCE_RATIO = 2
  const sortedByCount = [...counts.entries()].sort(([, a], [, b]) => b - a)
  if (sortedByCount.length > 0) {
    const [topCol, topCount] = sortedByCount[0]
    if (topCount >= 2) {
      let dominant = true
      for (const [col, c] of sortedByCount) {
        if (col === topCol) continue
        if (topCount <= c * DOMINANCE_RATIO) {
          dominant = false
          break
        }
      }
      if (dominant) return topCol
    }
  }
  // Stage 2 — wrap-score tie-break for ambiguous mixed-content columns.
  //
  // Gate: `best.score >= max(2, candidate.occurrence / 5)` (FU-1 — review
  // #389). Two layered floors guard against accidental baseline flips
  // when the column has no clear dominant content type:
  //
  //   * Absolute floor of 2 — a single accidental wrap-pair (e.g. one
  //     header→body alignment that survives the sentence-boundary
  //     filter) must not flip baseline. The pre-fix gate `score >= 1`
  //     allowed exactly this: Psalm 32 page 136 left col scored col-0
  //     = 1 from a header→body transition, picked baseline=0, and
  //     collapsed the entire 11-line Psalm 32 stanza into one phrase.
  //
  //   * Density floor — wrap evidence must scale with the candidate's
  //     line count (≥ ~20% of its lines participate in wrap pairs).
  //     Without this, a sparse score on a populated column wins
  //     against silent columns: e.g. col-0 occ=11 score=2 (18%
  //     density, mostly noise) would beat col-3 occ=17 score=0
  //     (zero-wrap psalm body) under the absolute-only gate, even
  //     though col-3 is the structural baseline. The /5 divisor maps
  //     cleanly to typical wrap-rate floors observed in healthy
  //     fixtures (Psalm 24 left col ≈ 43%, Psalm 110 left col mid-30%).
  //
  // When BOTH candidates fail the gate, Stage 3 falls back to the
  // legacy "smallest non-zero indent with ≥ 2 hits". This preserves
  // the pre-F-X10 behaviour for genuinely ambiguous columns and is
  // the safe default for column-mode psalms whose body sits at col 3
  // with no detected wraps.
  let best = null
  for (const col of candidates) {
    const score = scoreWraps(col)
    const occurrence = counts.get(col) ?? 0
    if (
      best === null ||
      score > best.score ||
      (score === best.score && occurrence > best.occurrence) ||
      (score === best.score && occurrence === best.occurrence && col < best.col)
    ) {
      best = { col, score, occurrence }
    }
  }
  const minScore = Math.max(2, best.occurrence / 5)
  if (best.score >= minScore) return best.col
  // Stage 3 — legacy fallback (no wrap evidence): smallest non-zero
  // candidate with >=2 hits, then smallest seen.
  for (const col of candidates) {
    if (col !== 0) return col
  }
  return candidates[0]
}

/**
 * Drop blank lines that are column-split mirroring artifacts: when a blank
 * line (or run of blanks) is immediately followed by a non-blank line at
 * a wrap-indent column, the blank cannot be a true stanza break — a stanza
 * always starts at baseline, never at wrap-indent. Such blanks are inserted
 * by `pdftotext-column-splitter.mjs` whenever the OTHER column had content
 * at that y-row but the current column did not.
 *
 * Without this preprocessing, single-line phrase + wrap pairs (Psalm 24
 * verses 1-6 left col) get split into two single-line stanzas, destroying
 * the wrap relationship.
 *
 * @param {string[]} columnLines
 * @param {number} baseline
 * @returns {string[]}
 */
export function dropSpuriousBlanks(columnLines, baseline) {
  const out = []
  for (let i = 0; i < columnLines.length; i++) {
    const line = columnLines[i]
    if (line.trim().length === 0) {
      let j = i + 1
      while (j < columnLines.length && columnLines[j].trim().length === 0) j++
      if (j < columnLines.length) {
        const nextLead = columnLines[j].length - columnLines[j].trimStart().length
        const nextRel = nextLead - baseline
        // Wrap-indent at any phrase-indent step (rel = 3, 9, 15, ...) implies
        // this blank cannot be a stanza boundary.
        if (
          Math.abs(nextRel - WRAP_DELTA) <= WRAP_TOLERANCE ||
          Math.abs(nextRel - (PHRASE_INDENT_STEP + WRAP_DELTA)) <= WRAP_TOLERANCE ||
          Math.abs(nextRel - (PHRASE_INDENT_STEP * 2 + WRAP_DELTA)) <= WRAP_TOLERANCE
        ) {
          // Drop this blank and any consecutive blanks before the wrap.
          i = j - 1
          continue
        }
      }
    }
    out.push(line)
  }
  return out
}

/**
 * Split a column's `lines[]` (post-`splitColumns` and post-
 * `dropSpuriousBlanks`) into stanza groups. Each stanza is the list of
 * consecutive non-blank lines, preserving original leading whitespace.
 *
 * @param {string[]} columnLines
 * @returns {string[][]}
 */
export function splitIntoStanzas(columnLines) {
  const stanzas = []
  let current = []
  for (const line of columnLines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        stanzas.push(current)
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) stanzas.push(current)
  return stanzas
}

/**
 * Stage 1 — visual-indent based phrase grouping.
 *
 * @param {string[]} stanzaRawLines - lines with original leading whitespace.
 * @param {number} baseline - the per-column baseline indent.
 * @returns {{
 *   lines: string[],
 *   phrases: { lineRange: [number, number], indent: 0|1|2 }[],
 * }}
 */
export function runStage1(stanzaRawLines, baseline) {
  const lines = stanzaRawLines.map((l) => l.trim())
  const indents = stanzaRawLines.map((l) => l.length - l.trimStart().length)
  const phrases = []
  let current = null

  for (let i = 0; i < indents.length; i++) {
    const rel = indents[i] - baseline
    if (current !== null) {
      // A wrap is a continuation of the in-progress phrase: its column must
      // sit ~WRAP_DELTA cols deeper than the phrase's start column. The
      // phrase's start column = baseline + indent*PHRASE_INDENT_STEP, so the
      // wrap column = (...) + WRAP_DELTA.
      const expectedWrapRel = current.indent * PHRASE_INDENT_STEP + WRAP_DELTA
      if (Math.abs(rel - expectedWrapRel) <= WRAP_TOLERANCE) {
        current.lineRange[1] = i
        continue
      }
    }
    // Otherwise: start a new phrase. Negative rel (line less indented than
    // baseline — usually flush-left commentary that survived stanza split)
    // collapses to indent=0 to keep PhraseGroup.indent in {0,1,2}.
    const indentStep = computePhraseIndent(rel)
    if (current !== null) phrases.push(current)
    current = { lineRange: [i, i], indent: indentStep }
  }
  if (current !== null) phrases.push(current)

  return { lines, phrases }
}

/**
 * Map a relative column delta to a phrase-level indent step (0/1/2). At
 * baseline → 0. At baseline + PHRASE_INDENT_STEP → 1. Anything beyond → 2.
 * Negative deltas (line indented LESS than baseline — usually a stanza
 * header that survived stanza split) map to 0 to keep the type honest.
 *
 * @param {number} rel
 * @returns {0|1|2}
 */
function computePhraseIndent(rel) {
  if (rel < PHRASE_INDENT_STEP) return 0
  if (rel < PHRASE_INDENT_STEP * 2) return 1
  return 2
}

/**
 * Stage 2 — punctuation + capitalization heuristic. Returns boundaries
 * between phrases as a list of "line index where a NEW phrase starts"
 * (always includes 0). Cyrillic-safe.
 *
 * @param {string[]} stanzaTrimmedLines - lines with leading whitespace removed.
 * @returns {number[]}
 */
export function runStage2(stanzaTrimmedLines) {
  const starts = [0]
  for (let i = 1; i < stanzaTrimmedLines.length; i++) {
    const prev = stanzaTrimmedLines[i - 1]
    const cur = stanzaTrimmedLines[i]
    if (SENTENCE_END_RE.test(prev) && STARTS_UPPER_RE.test(cur)) {
      starts.push(i)
    }
  }
  return starts
}

/**
 * Stage 3 — compare Stage 1 phrase starts vs Stage 2 boundary starts. If
 * they agree exactly, accept Stage 1 silently. If they differ, accept Stage
 * 1 but mark the stanza `needsReview: true` so a human curator can audit.
 *
 * @param {{ lineRange: [number, number] }[]} stage1Phrases
 * @param {number[]} stage2Starts
 * @returns {boolean} true when the two stages disagree.
 */
export function crossCheckDisagrees(stage1Phrases, stage2Starts) {
  const stage1Starts = stage1Phrases.map((p) => p.lineRange[0])
  if (stage1Starts.length !== stage2Starts.length) return true
  for (let i = 0; i < stage1Starts.length; i++) {
    if (stage1Starts[i] !== stage2Starts[i]) return true
  }
  return false
}

/**
 * Top-level: extract phrase groups from a single column's pdftotext-layout
 * output (post-splitColumns).
 *
 * @param {string[]} columnLines
 * @param {{ baseline?: number }} [options]
 * @returns {{
 *   baselineCol: number,
 *   stanzas: {
 *     stanzaIndex: number,
 *     lines: string[],
 *     phrases: { lineRange: [number, number], indent: 0|1|2 }[],
 *     needsReview: boolean,
 *   }[],
 * }}
 */
export function extractPhrasesFromColumn(columnLines, options = {}) {
  const baseline = options.baseline ?? detectBaselineCol(columnLines)
  const cleaned = dropSpuriousBlanks(columnLines, baseline)
  const stanzaRawGroups = splitIntoStanzas(cleaned)
  const stanzas = stanzaRawGroups.map((rawLines, stanzaIndex) => {
    const stage1 = runStage1(rawLines, baseline)
    const stage2Starts = runStage2(stage1.lines)
    const needsReview = crossCheckDisagrees(stage1.phrases, stage2Starts)
    return {
      stanzaIndex,
      lines: stage1.lines,
      phrases: stage1.phrases,
      needsReview,
    }
  })
  return { baselineCol: baseline, stanzas }
}

/**
 * Convenience: run pdftotext on the given book page + column, split, and
 * extract phrases. The book→physical mapping uses
 * `book-page-mapper.mjs`. Returns the same shape as
 * `extractPhrasesFromColumn` plus `{ bookPage, column }`.
 *
 * @param {{
 *   pdfPath: string,
 *   bookPage: number,
 *   column?: 'left' | 'right',
 * }} args
 */
export function extractPhrasesFromPdf({ pdfPath, bookPage, column }) {
  const { physical, half } = bookPageToPhysical(bookPage)
  const targetColumn = column ?? half
  const raw = pdftotextLayout(pdfPath, physical, physical)
  const split = splitColumns(raw, [physical])
  const stream = split.find((s) => s.column === targetColumn)
  if (!stream) {
    throw new Error(
      `extractPhrasesFromPdf: no ${targetColumn}-column stream for physical page ${physical}`,
    )
  }
  const result = extractPhrasesFromColumn(stream.lines)
  return { bookPage, column: targetColumn, physicalPage: physical, ...result }
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

function cliMain() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('--help')) {
    process.stdout.write(
      'Usage: node scripts/parsers/extract-phrases-from-pdf.mjs ' +
        '--pdf <path> --book-page <N> [--column left|right] [--out <path>]\n',
    )
    process.exit(argv.length === 0 ? 1 : 0)
  }
  const args = parseCliArgs(argv)
  if (!args.pdf || !args['book-page']) {
    process.stderr.write('error: --pdf and --book-page are required\n')
    process.exit(2)
  }
  const result = extractPhrasesFromPdf({
    pdfPath: args.pdf,
    bookPage: Number(args['book-page']),
    column: args.column,
  })
  const json = JSON.stringify(result, null, 2)
  if (args.out) {
    writeFileSync(args.out, json + '\n', 'utf-8')
    process.stdout.write(`wrote ${args.out}\n`)
  } else {
    process.stdout.write(json + '\n')
  }
  // Side-effect: append review-queue stanzas to a sidecar so curators can
  // bulk-audit. Only invoked from the CLI entry — module callers handle
  // their own queueing.
  const review = result.stanzas.filter((s) => s.needsReview)
  if (review.length > 0 && args['review-out']) {
    const existing = (() => {
      try {
        return JSON.parse(readFileSync(args['review-out'], 'utf-8'))
      } catch {
        return []
      }
    })()
    existing.push({
      bookPage: result.bookPage,
      column: result.column,
      stanzas: review,
    })
    writeFileSync(args['review-out'], JSON.stringify(existing, null, 2) + '\n', 'utf-8')
    process.stderr.write(
      `note: ${review.length} stanza(s) flagged needsReview, appended to ${args['review-out']}\n`,
    )
  }
}

// CLI guard: invoked when this file is the entry point. Use fileURLToPath
// so project paths containing spaces / unicode (which URL-encode in
// import.meta.url) match the literal `process.argv[1]` correctly.
import { fileURLToPath } from 'node:url'
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  cliMain()
}
