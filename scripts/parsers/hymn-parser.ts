/**
 * Hymn parser: cleans a raw PDF-extracted hymn block into usable text.
 *
 * The upstream `divine-office-reader` content for a given hymn often contains
 * a mix of (a) the real hymn verses, (b) surrounding table-of-contents
 * fragments (feast-day headings broken across lines, numbered cross-references
 * to other hymns, all-caps section titles broken one word per line, page
 * numbers), and (c) the literal "Магтуу" section header which may appear
 * BEFORE or AFTER the real verses depending on the source page.
 *
 * Pipeline
 * --------
 *  1. Classify every line (blank / verse / hymnRef / dateHeader / allCaps…).
 *  2. Tag date-header tails: once a `dateHeader` line appears, any following
 *     `verse` line is treated as a broken continuation of that heading until
 *     we hit a structural break (blank line, hymnRef, section header, page
 *     number, or another dateHeader).
 *  3. Demote `hymnRef` to `stanzaMarker` when the ref is clearly mid-hymn —
 *     i.e. the previous non-blank non-noise line in the same segment was a
 *     verse/refrain and the next non-blank line is also a verse/refrain.
 *     A ref at the very start of a segment is treated as a TOC pointer, not
 *     a stanza number.
 *  4. Split into segments by blank lines, drop noise lines per segment, and
 *     keep only segments with at least two remaining content lines. This
 *     prevents single stray uppercase fragments (e.g. "Мариа" inside a TOC)
 *     from being mistaken for a one-line hymn body.
 *  5. Join kept segments with a single blank line. If nothing remains the
 *     parser returns null so the caller can treat the hymn as empty.
 */

import { classifyLines, isLowercaseCyrillicStart } from './lexer.ts'
import type { ClassifiedLine, LineKind, ParseDiagnostic, ParseResult } from './types.ts'

export interface HymnParse {
  text: string
}

export interface HymnParseOptions {
  /**
   * Canonical hymn titles from `hymns-index.json`. When provided, any line
   * matching `N. <title>` where `<title>` is in this set is treated as a
   * cross-reference to another hymn and stripped, regardless of its position.
   */
  knownTitles?: ReadonlySet<string>
}

const NOISE_KINDS: ReadonlySet<LineKind> = new Set<LineKind>([
  'dateHeader',
  'dateHeaderTail',
  'hymnRef',
  'pageNumber',
  'seasonHeader',
  'magtuuHeader',
  'allCapsHeader',
  'allCapsWordFragment',
])

const CONTENT_KINDS: ReadonlySet<LineKind> = new Set<LineKind>([
  'verse',
  'refrainMarker',
  'stanzaMarker',
])

const TAIL_BREAKERS: ReadonlySet<LineKind> = new Set<LineKind>([
  'blank',
  'hymnRef',
  'magtuuHeader',
  'allCapsHeader',
  'seasonHeader',
  'pageNumber',
])

const MIN_SEGMENT_CONTENT_LINES = 2

export function parseHymn(raw: string, options: HymnParseOptions = {}): ParseResult<HymnParse> {
  const lines = classifyLines(raw)
  const diagnostics: ParseDiagnostic[] = []

  tagDateHeaderTails(lines)
  promoteStanzaMarkers(lines, options.knownTitles)

  const segments = splitSegmentsByBlanks(lines)
  const kept: string[] = []

  for (const seg of segments) {
    const cleaned = seg.filter(line => CONTENT_KINDS.has(line.kind)).map(line => line.raw)
    if (cleaned.length < MIN_SEGMENT_CONTENT_LINES) continue
    if (kept.length > 0) kept.push('')
    kept.push(...cleaned)
  }

  while (kept.length && kept[kept.length - 1] === '') kept.pop()

  if (kept.length === 0) {
    diagnostics.push({ kind: 'warn', message: 'no hymn body detected' })
    return { value: null, diagnostics }
  }

  return { value: { text: kept.join('\n') }, diagnostics }
}

function tagDateHeaderTails(lines: ClassifiedLine[]): void {
  let inTail = false
  for (const line of lines) {
    if (line.kind === 'dateHeader') {
      inTail = true
      continue
    }
    if (TAIL_BREAKERS.has(line.kind)) {
      inTail = false
      continue
    }
    if (!inTail) continue
    if (line.kind === 'verse' && (isLowercaseCyrillicStart(line.trimmed) || !line.trimmed.includes(' '))) {
      line.kind = 'dateHeaderTail'
    } else {
      inTail = false
    }
  }
}

const HYMN_REF_SPLIT_RE = /^\d{1,3}\.\s+(.*)$/

function promoteStanzaMarkers(
  lines: ClassifiedLine[],
  knownTitles?: ReadonlySet<string>,
): void {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].kind !== 'hymnRef') continue

    if (knownTitles) {
      const m = HYMN_REF_SPLIT_RE.exec(lines[i].trimmed)
      const title = m?.[1]?.trim()
      if (title && knownTitles.has(title)) continue // keep as TOC ref (noise)
    }

    const next = findNeighbourInSegment(lines, i, +1)
    if (next && CONTENT_KINDS.has(next.kind)) {
      lines[i].kind = 'stanzaMarker'
    }
  }
}

function findNeighbourInSegment(
  lines: ClassifiedLine[],
  from: number,
  dir: -1 | 1,
): ClassifiedLine | null {
  for (let i = from + dir; i >= 0 && i < lines.length; i += dir) {
    const k = lines[i].kind
    if (k === 'blank') return null
    if (NOISE_KINDS.has(k)) continue
    return lines[i]
  }
  return null
}

function splitSegmentsByBlanks(lines: ClassifiedLine[]): ClassifiedLine[][] {
  const segments: ClassifiedLine[][] = []
  let current: ClassifiedLine[] = []
  for (const line of lines) {
    if (line.kind === 'blank') {
      if (current.length) {
        segments.push(current)
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length) segments.push(current)
  return segments
}
