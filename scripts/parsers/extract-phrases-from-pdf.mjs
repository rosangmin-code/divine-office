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
 * F-X11 (#408 + #418) — drop column-split artifact blanks before stanza
 * splitting.
 *
 * `splitColumns` produces left/right streams of EQUAL length: every
 * physical-page row maps to one row in BOTH streams. When the OTHER column
 * has content but THIS column does not (typical 2-up layout: left col runs
 * an end-of-psalm prayer while right col carries the next psalm body),
 * `splitColumns` emits a `''` blank in this column at that row. Those
 * blanks are NOT visual paragraph breaks in the printed PDF — they're
 * pure layout artifacts.
 *
 * Visual paragraph breaks (which we DO want to preserve) require BOTH
 * columns to be blank at the same row index. The 2-up landscape PDF
 * encodes a true blank row as a vertical gap that runs across both
 * book-page columns simultaneously.
 *
 * This filter takes the per-row paired streams and drops a blank from
 * `thisColLines[i]` whenever `otherColLines[i]` has non-empty content.
 * The resulting stream has only "real" blanks (where both columns were
 * blank at that physical row) — those are the input to the paragraph-
 * vs-stanza distinction in `splitIntoStanzas`.
 *
 * F-X11 follow-up (#418) — promoted from dead-export to LIVE PATH.
 * `extractPhrasesFromColumn` now invokes this when `otherColumnLines` is
 * provided so artifact 1-blanks no longer become spurious paragraph
 * boundaries via the sentence-end + capital-start heuristic. The
 * #411-review false-positive on Psalm 46:2-12 right col (where every
 * verse-ending line happened to align with a left-col content row,
 * promoting mid-stanza sentence boundaries to paragraph boundaries) is
 * the canonical motivating case.
 *
 * Backward-compat: when `otherColLines` is undefined or shorter than
 * `thisColLines`, the function is a no-op pass-through (legacy callers
 * with single-column input get the original line stream).
 *
 * @param {string[]} thisColLines
 * @param {string[]} [otherColLines]
 * @returns {string[]}
 */
export function dropColumnArtifactBlanks(thisColLines, otherColLines) {
  if (!Array.isArray(otherColLines) || otherColLines.length === 0) {
    return thisColLines
  }
  const out = []
  for (let i = 0; i < thisColLines.length; i++) {
    const line = thisColLines[i]
    if (line.trim().length === 0) {
      // Only drop when other col has CONTENT at the same row. If other
      // col is also blank (or out of range), the blank is a "real" PDF
      // blank row — keep it for paragraph/stanza distinction downstream.
      const otherLine = i < otherColLines.length ? otherColLines[i] : ''
      if (otherLine.trim().length > 0) continue
    }
    out.push(line)
  }
  return out
}

/**
 * Split a column's `lines[]` (post-`splitColumns` and post-
 * `dropSpuriousBlanks`) into stanza groups. Each stanza carries a
 * `lines` array (consecutive non-blank lines, preserving original
 * leading whitespace) AND a `paragraphBoundaries` array tracking
 * within-stanza paragraph splits.
 *
 * F-X11 (#408) — paragraph-aware splitting:
 *   - 1-blank between content lines → PARAGRAPH boundary IF a sentence
 *     terminator + capital-start cross-check passes. The next line's
 *     index in the current `lines[]` is then appended to
 *     `paragraphBoundaries`; otherwise the blank is treated as a
 *     column-split artifact and skipped (kept inside the stanza, no
 *     boundary marker). The sentence-end heuristic alone is the
 *     "weak" signal — it correctly identifies real paragraph breaks
 *     but also fires on every stanza-internal sentence boundary,
 *     causing the Psalm 46:2-12 over-fragmentation that the #411
 *     review flagged.
 *   - 2+-blank → STANZA boundary (flush current stanza, start new
 *     one). This part is unchanged from pre-F-X11 behaviour.
 *
 * F-X11 follow-up (#418) — strengthens paragraph boundary detection
 * with a TWO-LAYER signal stack to reduce false positives on
 * column-split-artifact-heavy layouts:
 *
 *   Layer 1 — column-split artifact filter (caller's responsibility,
 *     applied via `dropColumnArtifactBlanks` in
 *     `extractPhrasesFromColumn` before this function runs). When
 *     OTHER col has content at the same physical row as THIS col's
 *     blank, the blank is dropped before stanza splitting. After this
 *     filter the surviving 1-blanks are predominantly TRUE PDF
 *     blanks (both cols blank at that physical row) — the heuristic
 *     in this function then operates on a high-signal stream.
 *
 *   Layer 2 — refrain detection (post-stanza, applied here in
 *     `refineParagraphBoundariesWithRefrains`). For psalms that
 *     repeat a multi-line refrain (Mongolian liturgy convention —
 *     2-line "Түг түмдийн ЭЗЭН… / Иаковын Тэнгэрбурхан…" in Psalm 46;
 *     3-line "ЭЗЭН, бидний Эзэн! / Таны нэр… / Юутай суу алдартай вэ!"
 *     in Psalm 8; 4-line "Түг түмдийн Тэнгэрбурхан, … / Тэгвэл бид
 *     аврагдана." in Psalm 80), refrain enter/exit are added as
 *     STRONG paragraph boundaries and any heuristic-derived boundaries
 *     that fall STRICTLY BETWEEN refrain instances are dropped (those
 *     are mid-stanza sentence boundaries that the print does NOT
 *     separate with paragraph spacing). The detector uses
 *     longest-match-wins per starting position (#435), so a 4-line
 *     refrain locks at length=4 instead of fragmenting into 2 × 2-line
 *     (the pre-#435 mis-split that motivated this generalisation).
 *     For non-refrain psalms (single-instance content), the refrain
 *     layer is a no-op and the heuristic boundaries pass through
 *     unchanged.
 *
 * Pre-F-X11 callers that want the legacy "every blank ends a stanza"
 * shape can still get it via `extractPhrasesFromColumn`'s backward-
 * compat shim (`splitOnEveryBlank`) — it splits each blank as a
 * stanza boundary when no `otherColumnLines` is supplied (single-
 * column fixture mode).
 *
 * @param {string[]} columnLines
 * @returns {{ lines: string[], paragraphBoundaries: number[] }[]}
 */
export function splitIntoStanzas(columnLines) {
  const stanzas = []
  let currentLines = []
  let currentBoundaries = []
  let blankRun = 0

  function flushStanza() {
    if (currentLines.length > 0) {
      stanzas.push({
        lines: currentLines,
        paragraphBoundaries: currentBoundaries,
      })
      currentLines = []
      currentBoundaries = []
    }
  }

  for (const line of columnLines) {
    if (line.trim().length === 0) {
      blankRun++
      continue
    }
    if (blankRun >= 2) {
      // 2+-blank → stanza boundary.
      flushStanza()
    } else if (blankRun === 1 && currentLines.length > 0) {
      // 1-blank within an in-progress stanza is AMBIGUOUS — could be a
      // real paragraph break OR a column-split artifact (the OTHER
      // book-page column had content at this row). Disambiguate via
      // the same sentence-terminator + capital-start heuristic that
      // Stage 2 already uses to cross-check phrase boundaries: real
      // PDF paragraph breaks land at sentence ends where the next
      // paragraph opens with an uppercase letter. Comma-terminated
      // mid-clause continuations and lowercase-start wraps are
      // therefore NEVER promoted to paragraph boundaries even if the
      // OTHER column happens to be blank.
      const prevLine = currentLines[currentLines.length - 1].trim()
      const nextLine = line.trim()
      if (SENTENCE_END_RE.test(prevLine) && STARTS_UPPER_RE.test(nextLine)) {
        currentBoundaries.push(currentLines.length)
      }
    }
    currentLines.push(line)
    blankRun = 0
  }
  flushStanza()

  // F-X11 follow-up (#418) — refine paragraph boundaries with refrain
  // detection. Mongolian liturgical psalms commonly bracket a repeated
  // 2-line refrain with paragraph spacing in print. When the heuristic
  // also fires on stanza-internal sentence boundaries between refrain
  // instances (the Psalm 46 over-fragmentation pattern), prefer the
  // refrain-bracket structure as the source of truth.
  return stanzas.map((s) => ({
    lines: s.lines,
    paragraphBoundaries: refineParagraphBoundariesWithRefrains(
      s.paragraphBoundaries,
      detectRefrains(s.lines),
      s.lines.length,
    ),
  }))
}

/**
 * F-X11 follow-up (#418) → Phase 2-A (#435) — detect repeating
 * MULTI-line refrain instances in a stanza. A "refrain" is a length-`L`
 * text window (`2 ≤ L ≤ MAX_REFRAIN_LENGTH`) that appears at two or
 * more non-overlapping positions. Mongolian liturgical convention
 * places paragraph spacing before each refrain instance and after each
 * refrain instance, regardless of the refrain's line length.
 *
 * Algorithm — LONGEST-MATCH-WINS per starting position (#435):
 *
 *   For each candidate start `i`, try lengths `len = MAX..2`. For each
 *   `len`, search ahead for non-overlapping match windows
 *   `[j, j+len-1]` (`j ≥ i + len`, jumping by `len` after each hit so
 *   partial overlaps cannot double-count). The FIRST `len` that yields
 *   `≥ 2` instances locks; shorter lengths are not considered for that
 *   start position.
 *
 * Why longest-match-wins (#435 motivating cases):
 *
 *   - Psalm 80:2-8, 15-20 — the 4-line refrain "Түг түмдийн
 *     Тэнгэрбурхан, / Биднийгээ дахин босгооч, / Нүүр царайгаа
 *     гэрэлтүүлээч, / Тэгвэл бид аврагдана." used to be detected as
 *     2 × 2-line by the legacy `length=2 fixed` algorithm: first 2
 *     lines locked as refrain, last 2 lines locked as a SEPARATE
 *     refrain. That produced 6 PB enter/exit points per occurrence
 *     (idx 6, 8, 10 around refrain 1; idx 19, 21, 23 around refrain
 *     2), splitting the refrain MID-WAY at idx 8 / 21 — visually
 *     fragmenting the user's reading flow. With longest-match-wins,
 *     `len=4` locks at i=6 and j=19, producing the conservative
 *     [6, 10, 19, 23] shape (#434 hotfix verified-correct).
 *
 *   - Psalm 8:2-10 — the 3-line opening/closing refrain "ЭЗЭН, бидний
 *     Эзэн! / Таны нэр бүх газар дэлхийд / Юутай суу алдартай вэ!"
 *     was previously detected as 2 lines, splitting the 3rd line off
 *     as a paragraph fragment (PB at idx 2 mid-refrain, idx 26
 *     mid-refrain). With longest-match-wins, `len=3` locks at i=0 and
 *     j=24, producing [3, 24] (refrain 1 exit + refrain 2 enter,
 *     idx-0 suppressed by builder rule).
 *
 * Length cap (#435 — `MAX_REFRAIN_LENGTH = 4`):
 *
 *   The dispatch capped maxLength at 4 because empirical Mongolian
 *   liturgical refrains in the corpus are 2 / 3 / 4 lines. 5+-line
 *   patterns are rare and structurally indistinguishable from
 *   "two near-identical body stanzas" (false-positive surface). When
 *   a true 5+-line refrain appears, `len=4` partially detects it
 *   (4 of N lines locked) — producing slightly under-conservative
 *   PBs, never over-fragmenting. This is the safe failure mode.
 *
 *   The cap is configurable via the optional `maxLength` argument so
 *   future audits can broaden if a real 5+-line regression surfaces.
 *   Surfacing channel: `phrase-extract-review-queue.json` (curator
 *   queue) — if a 5+-line antiphon enters the deferred-refs population
 *   and the curator flags it, raise `MAX_REFRAIN_LENGTH` to 5 (or pass
 *   an explicit `maxLength` from the call site for a scoped fix). The
 *   conservative default avoids over-fitting on near-duplicate body
 *   stanzas in the current corpus.
 *
 * Implementation invariants (carried over from #418):
 *
 *   - Trimmed text comparison: leading whitespace differences (e.g.
 *     refrain at col 3 baseline vs at col 6 wrap-indent) do NOT defeat
 *     the match.
 *   - `used` set membership: a single line belongs to at most one
 *     refrain instance, so 3+ overlapping length candidates cannot
 *     double-count.
 *   - Empty-line exclusion: candidate windows containing any
 *     whitespace-only line are skipped (defensive — empty lines should
 *     have been stripped upstream in `splitIntoStanzas`).
 *
 * KNOWN LIMITATION — sub-pattern aliasing (#436 codex peer N-1):
 *
 *   The algorithm is per-start longest-match, NOT global longest-match.
 *   A short refrain that locks first at start `i` can occlude a longer
 *   composite refrain that would have been visible globally — e.g.
 *   `['A','B','A','B','C','D','A','B','C','D']` locks the 2-line 'AB'
 *   at `i=0` before the 4-line 'ABCD' at `i=2` can be considered. The
 *   Mongolian liturgical corpus does not exercise this case (multi-line
 *   refrains have unique opening lines that do not echo elsewhere in
 *   body text), so the cheaper per-start scan is correct in practice.
 *   Future audit may switch to global-longest if a real regression
 *   surfaces — `phrase-extract-review-queue.json` (curator queue) is
 *   the surfacing channel.
 *
 * @param {string[]} stanzaLines - lines as they appear in the stanza
 *   (leading whitespace preserved; trimmed during comparison).
 * @param {number} [maxLength=4] - upper bound on refrain length. The
 *   default `4` matches the empirical corpus distribution; raise for
 *   targeted experiments only.
 * @returns {{ start: number, length: number }[]} - sorted by start;
 *   each entry is one refrain instance covering
 *   `stanzaLines[start..start+length-1]`. `length` reflects the
 *   actual matched window size (2..maxLength), not a fixed value.
 *   Returns `[]` if no refrain pattern repeats at least twice.
 */
export const MAX_REFRAIN_LENGTH = 4

export function detectRefrains(stanzaLines, maxLength = MAX_REFRAIN_LENGTH) {
  const trimmed = stanzaLines.map((l) => l.trim())
  const n = trimmed.length
  if (n < 4) return []
  if (maxLength < 2) return []

  const refrains = []
  const used = new Set()

  // Helper — a window [start, start+len) is "available" iff every line
  // in it is non-empty and not yet bound to another refrain instance.
  function windowAvailable(start, len) {
    if (start + len > n) return false
    for (let k = 0; k < len; k++) {
      if (used.has(start + k)) return false
      if (trimmed[start + k].length === 0) return false
    }
    return true
  }

  // Helper — compare two windows of length `len` for trimmed-text
  // equality across all positions.
  function windowsEqual(i, j, len) {
    for (let k = 0; k < len; k++) {
      if (trimmed[i + k] !== trimmed[j + k]) return false
    }
    return true
  }

  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue

    // Cap = min(configured ceiling, structural ceiling). The structural
    // ceiling `floor((n - i) / 2)` reflects that a length-`len`
    // refrain at `i` requires at least one ADDITIONAL non-overlapping
    // window of size `len` after it — total `2*len ≤ n - i`.
    const cap = Math.min(maxLength, Math.floor((n - i) / 2))

    let chosenLen = 0
    let chosenMatches = null

    // Longest-match-wins: try lengths from cap down to 2. Lock at the
    // FIRST length yielding ≥ 2 instances.
    for (let len = cap; len >= 2; len--) {
      if (!windowAvailable(i, len)) continue

      const matches = [i]
      let j = i + len
      while (j + len <= n) {
        if (windowAvailable(j, len) && windowsEqual(i, j, len)) {
          matches.push(j)
          j += len // jump past this match — non-overlapping
        } else {
          j++
        }
      }

      if (matches.length >= 2) {
        chosenLen = len
        chosenMatches = matches
        break
      }
    }

    if (chosenMatches !== null) {
      for (const m of chosenMatches) {
        refrains.push({ start: m, length: chosenLen })
        for (let k = 0; k < chosenLen; k++) {
          used.add(m + k)
        }
      }
    }
  }

  refrains.sort((a, b) => a.start - b.start)
  return refrains
}

/**
 * F-X11 follow-up (#418) → Phase 2-A (#435) — refine heuristic
 * paragraph boundaries using detected refrain structure. When refrains
 * are present (≥ 2 instances of a repeating pattern of 2..k lines),
 * refrain enter/exit boundaries are STRONG paragraph signals; any
 * heuristic-derived boundary that falls strictly between two
 * consecutive refrain instances is dropped (it's a mid-stanza sentence
 * boundary that the print does not separate with paragraph spacing).
 *
 * Multi-line refrain support (#435): the function reads `r.length`
 * from each refrain entry, so 2-line, 3-line, and 4-line refrains
 * (the empirical corpus range) all produce correct enter/exit
 * positions without code change. Length-2 refrains keep the legacy
 * Psalm 46 behaviour; length-3 and length-4 refrains were the
 * motivating regressions for the Phase 2-A generalisation.
 *
 * Worked examples:
 *
 *   - Psalm 46:2-12 right col (#418 — 2-line refrain): heuristic
 *     produces [8, 10, 13, 15, 16, 17, 18, 20] (over-fragments
 *     mid-stanza sentence boundaries). Refrain detector finds 2
 *     instances at [8, 9] and [18, 19] (length=2). Refrain enter/exit:
 *     8, 10, 18, 20. The "between refrain instances" range is (10, 18)
 *     exclusive → drops 13, 15, 16, 17. Final: [8, 10, 18, 20] —
 *     matches the user-confirmed-correct set (= [7, 9, 17, 19] after
 *     header strip in builder).
 *
 *   - Psalm 80:2-8, 15-20 block 0 (#435 — 4-line refrain): refrain
 *     detector finds 2 instances at start=6 length=4 and start=19
 *     length=4. Refrain enter/exit: 6, 10, 19, 23 (each `r.start +
 *     r.length` reflects the 4-line span). Pre-#435, the legacy
 *     length=2-fixed detector locked 4 false 2-line refrains at
 *     [6,7], [8,9], [19,20], [21,22], producing PBs that fragmented
 *     the refrain mid-way (idx 8, 21).
 *
 *   - Psalm 8:2-10 block 0 (#435 — 3-line refrain): refrain detector
 *     finds 2 instances at start=0 length=3 and start=24 length=3.
 *     Refrain enter/exit: 0 (suppressed by idx-0 rule), 3, 24, 27
 *     (suppressed when 27 = stanzaLineCount). Final pinned set:
 *     [3, 24] — matches the #434 hotfix conservative shape.
 *
 *   - Psalm with no refrain: refrain detector returns []. This
 *     function returns the heuristic boundaries unchanged — refrain-
 *     less psalms keep the existing F-X11 behaviour.
 *
 * @param {number[]} heuristicBoundaries - sorted asc, from `splitIntoStanzas`.
 * @param {{ start: number, length: number }[]} refrains - sorted asc.
 * @param {number} stanzaLineCount
 * @returns {number[]} - sorted asc, deduplicated.
 */
export function refineParagraphBoundariesWithRefrains(
  heuristicBoundaries,
  refrains,
  stanzaLineCount,
) {
  if (refrains.length < 2) return heuristicBoundaries

  const refrainEnterExit = new Set()
  for (const r of refrains) {
    if (r.start > 0) refrainEnterExit.add(r.start)
    if (r.start + r.length < stanzaLineCount) {
      refrainEnterExit.add(r.start + r.length)
    }
  }

  // Drop heuristic boundaries that fall STRICTLY BETWEEN consecutive
  // refrain instances — those are mid-stanza sentence-end clusters,
  // not real paragraph breaks. Heuristic boundaries before the first
  // refrain or after the last are preserved as-is (they may be
  // legitimate non-refrain breaks in the same stanza). Boundaries
  // that EQUAL refrain enter/exit positions (b === after or
  // b === beforeNext) are preserved here — they coincide with
  // refrain bracket markers and are deduplicated against
  // `refrainEnterExit` in the merge below.
  const mergedSet = new Set()
  for (const b of heuristicBoundaries) {
    let dropAsBetween = false
    for (let k = 0; k < refrains.length - 1; k++) {
      const after = refrains[k].start + refrains[k].length
      const beforeNext = refrains[k + 1].start
      if (b > after && b < beforeNext) {
        dropAsBetween = true
        break
      }
    }
    if (!dropAsBetween) mergedSet.add(b)
  }

  // Add refrain enter/exit. Set membership keeps dedup O(1) — refactor
  // from `merged.includes(rb)` (O(N×M)) per review #419 N-2. Stanzas
  // are <50 lines so the perf delta is negligible, but the Set is the
  // idiomatic shape and keeps future widening (e.g. multi-refrain
  // stanzas with overlapping enter/exit positions) honest without a
  // dedup-bug surface.
  for (const rb of refrainEnterExit) {
    mergedSet.add(rb)
  }

  return [...mergedSet].sort((a, b) => a - b)
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
 * F-X11 (#408) — when `options.otherColumnLines` is supplied (per-row
 * paired stream from the OTHER book-page column), column-split artifact
 * blanks are dropped first so `splitIntoStanzas` can correctly count
 * 1-blank vs 2+-blank to populate `paragraphBoundaries[]`. Without
 * `otherColumnLines` (legacy callers / single-column fixtures), the
 * function preserves the pre-F-X11 behaviour: every blank acts as a
 * stanza boundary and `paragraphBoundaries` is always empty.
 *
 * @param {string[]} columnLines
 * @param {{ baseline?: number, otherColumnLines?: string[] }} [options]
 * @returns {{
 *   baselineCol: number,
 *   stanzas: {
 *     stanzaIndex: number,
 *     lines: string[],
 *     phrases: { lineRange: [number, number], indent: 0|1|2 }[],
 *     paragraphBoundaries: number[],
 *     needsReview: boolean,
 *   }[],
 * }}
 */
export function extractPhrasesFromColumn(columnLines, options = {}) {
  const baseline = options.baseline ?? detectBaselineCol(columnLines)
  const hasOtherCol =
    Array.isArray(options.otherColumnLines) && options.otherColumnLines.length > 0
  // F-X11 follow-up (#418) — when both column streams are available,
  // first drop column-split artifact blanks (THIS col blank, OTHER col
  // content). After this filter the surviving 1-blanks are
  // predominantly TRUE PDF blanks (both cols visually blank at that
  // physical row), so the sentence-end + capital-start heuristic
  // applied later in `splitIntoStanzas` no longer over-fragments on
  // mid-stanza sentence boundaries that happened to land at column-
  // split artifact rows (the Psalm 46:2-12 right col regression
  // pattern from review #411).
  //
  // For the user-reported real paragraph breaks (Psalm 46 refrain
  // enter/exit) `dropColumnArtifactBlanks` ALSO removes those rows
  // because the left col carries unrelated closing-prayer content at
  // the same physical y. The remediation for that is post-stanza
  // refrain detection (`refineParagraphBoundariesWithRefrains`,
  // invoked from inside `splitIntoStanzas`): repeated 2-line refrain
  // instances are recognised by text equality and reinstated as
  // paragraph boundaries.
  //
  // Together the two layers (column-aware artifact filter +
  // text-pattern refrain detection) preserve real refrain-bracket
  // paragraph breaks while suppressing every-verse-period over-
  // fragmentation. Legacy single-column callers (no
  // `otherColumnLines`) fall through unchanged.
  const filtered = hasOtherCol
    ? dropColumnArtifactBlanks(columnLines, options.otherColumnLines)
    : columnLines
  const cleaned = dropSpuriousBlanks(filtered, baseline)
  // F-X11 backward-compat: in legacy single-column mode (no
  // `otherColumnLines`), the test fixtures expect "every blank ends a
  // stanza" — that's how the pre-F-X11 dataset was authored. Switch
  // splitting strategy by mode: live extraction (with otherCol) uses
  // the new paragraph-aware splitter; legacy callers fall back to
  // every-blank splitting. Both produce `{ lines, paragraphBoundaries }`
  // shape so downstream code is uniform.
  let stanzaGroups
  if (hasOtherCol) {
    stanzaGroups = splitIntoStanzas(cleaned)
  } else {
    stanzaGroups = splitOnEveryBlank(cleaned)
  }
  const stanzas = stanzaGroups.map((group, stanzaIndex) => {
    const stage1 = runStage1(group.lines, baseline)
    const stage2Starts = runStage2(stage1.lines)
    const needsReview = crossCheckDisagrees(stage1.phrases, stage2Starts)
    return {
      stanzaIndex,
      lines: stage1.lines,
      phrases: stage1.phrases,
      paragraphBoundaries: group.paragraphBoundaries,
      needsReview,
    }
  })
  return { baselineCol: baseline, stanzas }
}

/**
 * F-X11 (#408) — backward-compat splitter for legacy single-column
 * callers. Mirrors the pre-F-X11 behaviour: every blank ends the
 * current stanza, regardless of paragraph semantics. Output shape
 * matches `splitIntoStanzas` (each stanza carries an empty
 * `paragraphBoundaries: []` so downstream consumers don't need a
 * legacy-vs-live branch).
 *
 * @param {string[]} columnLines
 * @returns {{ lines: string[], paragraphBoundaries: number[] }[]}
 */
function splitOnEveryBlank(columnLines) {
  const stanzas = []
  let current = []
  for (const line of columnLines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        stanzas.push({ lines: current, paragraphBoundaries: [] })
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    stanzas.push({ lines: current, paragraphBoundaries: [] })
  }
  return stanzas
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
  // F-X11 (#408) — pass the OTHER column's per-row stream so column-split
  // artifact blanks can be filtered before stanza splitting. The OTHER
  // stream is always emitted by `splitColumns` (one per side per
  // physical page) and is row-aligned with the target stream (both come
  // from the same line-by-line walk of the layout output).
  const otherSide = targetColumn === 'left' ? 'right' : 'left'
  const otherStream = split.find((s) => s.column === otherSide)
  const result = extractPhrasesFromColumn(stream.lines, {
    otherColumnLines: otherStream?.lines,
  })
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
