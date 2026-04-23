/**
 * pdftotext-column-splitter.mjs — split `pdftotext -layout` output into
 * left/right book-page column streams.
 *
 * Background
 * ----------
 * `public/psalter.pdf` is a 2-up landscape layout: each physical PDF page
 * carries two book pages side by side. `pdftotext -layout` preserves x
 * positions using spaces, so the two columns are visually aligned but
 * textually interleaved on every line. Downstream consumers that only need
 * book-page-ordered text must first *split* each line at the gutter
 * (whitespace band between the two columns) before treating it as flowing
 * prose.
 *
 * This module does only the splitting step. It does **not** merge wrapped
 * lines, detect stanzas, or fix page-break artefacts. Those are later stages.
 * A deliberately pure splitter is critical — the prior `extract-psalm-texts.js`
 * heuristics (`mergeColumnWraps`, `mergeAcrossStanzaBoundaries`) are the
 * strongly-suspected source of the 6 body-text corruptions in commit c92abf3.
 *
 * Algorithm (per physical page)
 * -----------------------------
 * 1. Collect all whitespace runs of >= 5 characters inside each non-blank
 *    line and record the column at which text resumes. The dominant resume
 *    column per page is the gutter boundary ("cut column"). Five is chosen
 *    because observed gutters on the pilot pages range from 5 to 40+ spaces;
 *    a higher threshold would miss tight lines.
 * 2. For each line, split at the cut column:
 *      left  = line.slice(0, cut).trimEnd()    (but keep leading spaces — indent is meaningful)
 *      right = line.slice(cut)                  (right's own leading spaces carry indent info)
 *    Leading whitespace on the left slice IS preserved (it encodes stanza
 *    indent). Only trailing padding on the left is removed so tokens near the
 *    cut don't carry spurious tail whitespace.
 * 3. If a line is shorter than the cut column OR contains no gutter-sized gap
 *    (single-column line — only one book page had text on that row), assign
 *    it to one side using x-position heuristic:
 *      - first non-space index < cut - 2 -> left
 *      - else                             -> right
 *    If the first non-space is within ±2 of the cut, flag as `ambiguous` so
 *    callers can choose how to treat it (we still place it on the side
 *    indicated by the heuristic).
 *
 * Output
 * ------
 * Array of `{ physicalPage, bookPage, column, lines, cutColumn, ambiguousLineIndices }`
 * entries — two per physical page (one for left, one for right) — in
 * book-order. `lines` preserves leading spaces so later stanza/indent
 * detection works against raw output.
 *
 * Dependencies: none (node stdlib only).
 */

import { readFileSync } from 'node:fs'
import { physicalToBookPages } from './book-page-mapper.mjs'

/**
 * Minimum whitespace-run length (in spaces) to count as a column gutter.
 * Five is the smallest value where the pilot set's gutter column forms a
 * clean modal cluster; below that, legitimate in-column multi-space
 * indentation creates spurious cut candidates.
 */
const MIN_GUTTER_SPACES = 5

/**
 * Parse a raw `pdftotext -layout` output file and split it into per-page,
 * per-column line streams.
 *
 * @param {string} txtContent - raw UTF-8 text from `pdftotext -layout`.
 *   Pages must be separated by form-feed (\f, U+000C); this is pdftotext's
 *   default behaviour.
 * @param {number[]} physicalPages - the physical page numbers corresponding
 *   to each \f-separated block, in order. Typically generated from the
 *   extractor's `-f` / `-l` range. Must match the number of non-empty
 *   form-feed-separated blocks.
 * @returns {Array<{
 *   physicalPage: number,
 *   bookPage: number,
 *   column: 'left'|'right',
 *   lines: string[],
 *   cutColumn: number,
 *   ambiguousLineIndices: number[]
 * }>}
 */
export function splitColumns(txtContent, physicalPages) {
  // pdftotext emits a leading \f before the first page in some versions and
  // a trailing \f at EOF. Normalise both.
  const blocks = txtContent.split('\f')
  // Filter trailing empty-only block (trailing \f) but keep legitimately
  // empty pages so the index aligns with physicalPages.
  while (blocks.length > 0 && blocks[blocks.length - 1] === '') blocks.pop()
  // Drop a leading empty block (leading \f) if present.
  if (blocks.length > 0 && blocks[0] === '') blocks.shift()

  if (blocks.length !== physicalPages.length) {
    throw new Error(
      `splitColumns: page count mismatch — got ${blocks.length} \\f-blocks ` +
        `but received ${physicalPages.length} physicalPages`,
    )
  }

  const results = []
  for (let i = 0; i < blocks.length; i++) {
    const physicalPage = physicalPages[i]
    const { left: leftBookPage, right: rightBookPage } = physicalToBookPages(physicalPage)
    const pageLines = blocks[i].split('\n')
    const cutColumn = detectCutColumn(pageLines)

    const leftLines = []
    const rightLines = []
    const leftAmbiguous = []
    const rightAmbiguous = []

    for (const rawLine of pageLines) {
      // Strip trailing \r if present (cross-platform safety).
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

      if (line.length === 0) {
        // Blank line is meaningful (stanza separator). Mirror it on both
        // sides so per-column consumers still see stanza breaks.
        leftLines.push('')
        rightLines.push('')
        continue
      }

      const firstNonSpace = line.length - line.trimStart().length

      // Case A: line ends before the cut column — single-column line, assign
      // to left or right based on where the text sits.
      if (line.length <= cutColumn) {
        if (firstNonSpace < cutColumn - 2) {
          leftLines.push(line)
          rightLines.push('')
        } else if (firstNonSpace > cutColumn + 2) {
          // Will not happen here (line.length <= cut) but keep symmetry.
          leftLines.push('')
          rightLines.push(line)
        } else {
          // Ambiguous zone — nudge to whichever side it's closer to.
          const goesLeft = firstNonSpace < cutColumn
          if (goesLeft) {
            leftLines.push(line)
            rightLines.push('')
            leftAmbiguous.push(leftLines.length - 1)
          } else {
            leftLines.push('')
            rightLines.push(line)
            rightAmbiguous.push(rightLines.length - 1)
          }
        }
        continue
      }

      // Case B: line spans the cut column. Decide where the gutter ends on
      // THIS line, then split such that right-column inner indent is
      // preserved.
      const { leftEnd, rightStart } = resolveLineGutter(line, cutColumn)
      const leftPart = trimEnd(line.slice(0, leftEnd))
      // Inner indent = rightStart - cutColumn when rightStart >= cutColumn.
      // We cut at cutColumn and keep the `rightStart - cutColumn` spaces as
      // leading whitespace on the right slice, which faithfully encodes the
      // refrain/antiphon indent structure. When rightStart < cutColumn
      // (tight line), we cut at rightStart (no inner indent, but the line
      // is already fully flush in its column).
      const splitAt = Math.min(cutColumn, rightStart)
      const rightPart = line.slice(splitAt)

      if (leftPart.length > 0 && !/^\s*$/.test(leftPart)) {
        leftLines.push(leftPart)
      } else {
        leftLines.push('')
      }
      if (rightPart.length > 0 && !/^\s*$/.test(rightPart)) {
        rightLines.push(rightPart)
      } else {
        rightLines.push('')
      }
    }

    results.push({
      physicalPage,
      bookPage: leftBookPage,
      column: 'left',
      lines: leftLines,
      cutColumn,
      ambiguousLineIndices: leftAmbiguous,
    })
    results.push({
      physicalPage,
      bookPage: rightBookPage,
      column: 'right',
      lines: rightLines,
      cutColumn,
      ambiguousLineIndices: rightAmbiguous,
    })
  }

  return results
}

/**
 * Detect the per-page right-column baseline column — the typical column at
 * which the right column's text begins when that column has NO inner
 * indentation.
 *
 * Algorithm: scan every line, collect the column at which text resumes after
 * every whitespace run of length >= MIN_GUTTER_SPACES. Those "resume
 * columns" cluster around two or three values per page (one for each
 * inner-indent level the right column uses). The **baseline** is the
 * smallest cluster's column (with >= 2 observations and >= 30 to reject
 * outliers from in-column bullets). Using the minimum lets later logic
 * identify rightward offsets as inner-column indent instead of gutter.
 *
 * Fallback: 54 (empirical average across the pilot pages).
 *
 * @param {string[]} pageLines
 * @returns {number}
 */
function detectCutColumn(pageLines) {
  const counts = new Map()
  const gutterRegex = new RegExp(`(?<=\\S) {${MIN_GUTTER_SPACES},}`, 'g')
  for (const line of pageLines) {
    for (const match of line.matchAll(gutterRegex)) {
      const col = match.index + match[0].length
      if (col >= line.length) continue
      counts.set(col, (counts.get(col) ?? 0) + 1)
    }
  }
  if (counts.size === 0) return 54

  const sorted = [...counts.entries()].sort(([a], [b]) => a - b)
  for (const [col, count] of sorted) {
    if (count >= 2 && col >= 30) return col
  }
  let bestCol = Infinity
  let bestCount = 0
  for (const [col, count] of counts) {
    if (count > bestCount || (count === bestCount && col < bestCol)) {
      bestCol = col
      bestCount = count
    }
  }
  return bestCol
}

/**
 * For a line that spans the gutter, identify where the left column ends
 * (leftEnd) and where the right column's text begins (rightStart).
 *
 * The two columns are separated by a whitespace run of >= 3 spaces (the
 * smallest structural gap; normal word-spaces are 1). Multiple such runs can
 * appear on a line (e.g. tabs, multi-word headers). We select the run that
 * best matches the per-page `cutColumn`:
 *   - Preferred: the run that brackets cutColumn (cutColumn ∈ [start, end]).
 *   - Fallback: the run whose end is closest to cutColumn within ±20.
 *   - Last resort: the largest run on the line.
 *
 * `leftEnd` = run.start (last char before gutter + 1).
 * `rightStart` = run.end (first char after gutter).
 *
 * When leftEnd/rightStart cannot be determined (no structural gaps at all),
 * return `{ leftEnd: nominalCut, rightStart: nominalCut }` — callers will
 * then cut at the nominal column (possibly bisecting a word on that line,
 * but the page's majority lines remain clean).
 *
 * @param {string} line
 * @param {number} cutColumn
 * @returns {{ leftEnd: number, rightStart: number }}
 */
function resolveLineGutter(line, cutColumn) {
  const runs = []
  const runRegex = / {3,}/g
  let m
  while ((m = runRegex.exec(line)) !== null) {
    // Skip leading-space runs (whole-line indent, not a gutter).
    if (m.index === 0) continue
    // Skip trailing-space runs (gap at end of line is not a gutter).
    if (m.index + m[0].length >= line.length) continue
    runs.push({ start: m.index, end: m.index + m[0].length, width: m[0].length })
  }

  if (runs.length === 0) {
    // No internal gutter on this line. Two sub-cases:
    //   (a) Right-only line — content starts deep enough to be in the right
    //       column (typical for headings / shorter lines). Signal by pushing
    //       leftEnd/rightStart to firstNonSpace so the left slice is empty
    //       and the right slice preserves the line from its first character.
    //   (b) Otherwise, fall back to nominal cut (may bisect, but that's only
    //       an issue for atypically wide left-column content).
    const firstNonSpace = line.length - line.trimStart().length
    // Threshold: content must start at or after the right column's baseline
    // minus a small tolerance. Using cutColumn - 10 covers right-column
    // headings that extend slightly left of the majority cut (observed on
    // pages 813 / 607 where titles begin ~6 chars before the detected cut).
    if (firstNonSpace >= Math.max(20, cutColumn - 10)) {
      return { leftEnd: firstNonSpace, rightStart: firstNonSpace }
    }
    return { leftEnd: cutColumn, rightStart: cutColumn }
  }

  // Preferred: run that brackets cutColumn.
  for (const r of runs) {
    if (cutColumn >= r.start && cutColumn <= r.end) {
      return { leftEnd: r.start, rightStart: r.end }
    }
  }

  // Fallback: run whose end is closest to cutColumn within ±20.
  let best = null
  let bestDist = Infinity
  for (const r of runs) {
    const dist = Math.abs(r.end - cutColumn)
    if (dist < bestDist && dist <= 20) {
      best = r
      bestDist = dist
    }
  }
  if (best) return { leftEnd: best.start, rightStart: best.end }

  // Last resort: widest run.
  let widest = runs[0]
  for (const r of runs) if (r.width > widest.width) widest = r
  return { leftEnd: widest.start, rightStart: widest.end }
}

/**
 * Trim trailing whitespace without using String.prototype.trimEnd because we
 * want an explicit, regex-free implementation that makes the intent (only
 * tail padding) obvious. Keeps the regex-heavy top of the file focused on
 * semantic logic.
 */
function trimEnd(s) {
  let end = s.length
  while (end > 0 && s.charCodeAt(end - 1) === 32) end--
  return s.slice(0, end)
}

/**
 * Convenience: read a pdftotext layout file from disk and split it.
 * @param {string} filePath
 * @param {number[]} physicalPages
 */
export function splitColumnsFromFile(filePath, physicalPages) {
  const content = readFileSync(filePath, 'utf-8')
  return splitColumns(content, physicalPages)
}
