/**
 * pdfjs-style-overlay.mjs — reusable style overlay extractor (Stage 3b).
 *
 * Given a PDF path and a list of book pages, emits per-book-page
 * `StyledLine[]` arrays where each line has x/y-sorted text spans annotated
 * with fill colour, fontName, scaleX, italic & small-caps flags.
 *
 * This is the style half of the 2-layer pipeline documented in
 * `scripts/out/poc-findings.md`. It is NOT a body-text source — its output
 * is meant to be line-matched against `pdftotext -layout` output (the body
 * source) so downstream consumers can build rich `PrayerText` AST.
 *
 * Dependencies: `pdfjs-dist` 5.x legacy ESM build (already bundled for the
 * PDF viewer).
 *
 * ── Algorithm ────────────────────────────────────────────────────────────
 *
 * For every requested book page:
 *   1. Translate to physical PDF page + half via book-page-mapper.
 *   2. Open the physical page with pdfjs-dist (legacy build).
 *   3. Walk `getOperatorList()` to track the active fill colour as a stack
 *      frame per graphics state (save/restore).
 *   4. Walk `getTextContent({ includeMarkedContent: false })` and pair
 *      every non-empty text item with the fill colour active at the same
 *      "showText occurrence index" — pdfjs emits `textContent.items` in the
 *      same order as its `opList` `showText`/`showSpacedText`/
 *      `nextLineShowText`/`nextLineSetSpacingShowText` operators.
 *   5. Constrain to the requested half of the physical page (book parity:
 *      even -> left, odd -> right). `pageWidth/2` as the column divider.
 *   6. Group surviving text items into lines by y-coordinate (tolerance
 *      ±1.5 pt), sort spans within a line by x, then merge consecutive
 *      same-y same-font neighbours whose x-gap is small (small-caps
 *      re-assembly).
 *
 * ── Output shape ─────────────────────────────────────────────────────────
 *
 *   Array<{
 *     bookPage: number,
 *     physicalPage: number,
 *     half: 'left' | 'right',
 *     pageWidth: number,
 *     pageHeight: number,
 *     lines: Array<{
 *       y: number,                       // physical-page y of the baseline
 *       spans: Array<{
 *         text: string,
 *         x: number,                     // physical-page x of span start
 *         width: number,
 *         fill: string,                  // `#rrggbb` or `unknown`
 *         fontName: string,
 *         scaleX: number,
 *         isItalic: boolean,             // heuristic: fontName contains 'italic'
 *         isSmallCaps: boolean,          // heuristic: fontName classifier (f4 family or scaleX<9)
 *       }>
 *     }>
 *   }>
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bookPageToPhysical } from './book-page-mapper.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')

// ── pdfjs-dist bootstrap (legacy ESM build) ─────────────────────────────

let _pdfjs = null
async function loadPdfjs() {
  if (_pdfjs) return _pdfjs
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = resolve(
    REPO_ROOT,
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs',
  )
  _pdfjs = pdfjs
  return pdfjs
}

// ── Colour helpers ──────────────────────────────────────────────────────

function rgbKey(r, g, b) {
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function fillOpToColor(OPS, opCode, args) {
  switch (opCode) {
    case OPS.setFillRGBColor: {
      // pdfjs v5: sometimes collapses to a single "#rrggbb" string.
      if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('#')) {
        return { hex: args[0].toLowerCase() }
      }
      let r = args[0]
      let g = args[1]
      let b = args[2]
      if ([r, g, b].every((v) => typeof v === 'number')) {
        if (r <= 1 && g <= 1 && b <= 1) {
          r *= 255
          g *= 255
          b *= 255
        }
        return { hex: rgbKey(r, g, b) }
      }
      return { hex: 'unknown' }
    }
    case OPS.setFillGray: {
      const g = args[0] // 0..1
      const v = Math.round(g * 255)
      return { hex: rgbKey(v, v, v) }
    }
    case OPS.setFillCMYKColor: {
      const [c, m, y, k] = args
      const r = 255 * (1 - c) * (1 - k)
      const g = 255 * (1 - m) * (1 - k)
      const b = 255 * (1 - y) * (1 - k)
      return { hex: rgbKey(r, g, b) }
    }
    default:
      return { hex: 'unknown' }
  }
}

// ── Font classification ─────────────────────────────────────────────────

function classifyFont(fontName, scaleX) {
  const lower = (fontName || '').toLowerCase()
  const isItalic = /italic|oblique/.test(lower)
  // PoC observation: g_d0_f4 is the small-caps family (scaleX alternates
  // between 11 and ~7.7). Anything with explicit 'small' marker also counts.
  // Scale heuristic: the f4 small cap letters come out at scaleX ≈ 7.7,
  // whereas body f2 is a stable scaleX = 11.
  const f4Family = /_f4(\b|$)/i.test(fontName || '') || /f4/i.test(lower)
  const tightScale = typeof scaleX === 'number' && scaleX > 0 && scaleX < 9
  return {
    isItalic,
    isSmallCaps: f4Family || tightScale,
  }
}

// ── opList walker ───────────────────────────────────────────────────────

/**
 * Extract per-showText glyph runs with their active fill colour. pdfjs 5.x
 * emits `showText` args as an array of glyph objects (or interleaved numeric
 * kerning offsets) — concatenating `unicode` yields the run's visible
 * string. We return:
 *
 *   [{ hex, text }]
 *
 * in the order showText-family ops fire. Callers then stream-match this
 * against non-empty `textContent.items[].str` to recover per-item colour,
 * because pdfjs sometimes groups several successive showText ops into a
 * single text item (space-coalescing). Stream matching by glyph prefix is
 * robust to that grouping; index-matching is not.
 *
 * Tracks `save` (q) / `restore` (Q) so nested graphics states don't leak
 * their fill across sibling subtrees.
 */
function collectShowTextRuns(OPS, opList) {
  const TEXT_SHOW_OPS = new Set([
    OPS.showText,
    OPS.showSpacedText,
    OPS.nextLineShowText,
    OPS.nextLineSetSpacingShowText,
  ])
  const FILL_OPS = new Set([
    OPS.setFillRGBColor,
    OPS.setFillGray,
    OPS.setFillCMYKColor,
  ])

  function glyphsToString(glyphs) {
    if (!Array.isArray(glyphs)) return ''
    let buf = ''
    for (const g of glyphs) {
      if (g && typeof g === 'object' && typeof g.unicode === 'string') {
        buf += g.unicode
      } else if (typeof g === 'string') {
        buf += g
      }
      // Numeric kerning offsets do not always represent a space — pdfjs
      // only synthesises a separator when it exceeds a threshold which it
      // internally converts into a `isSpace: true` glyph. So we ignore
      // numeric offsets here.
    }
    return buf
  }

  const runs = []
  let active = { hex: '#000000' }
  const stack = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const op = opList.fnArray[i]
    const args = opList.argsArray[i] || []
    if (op === OPS.save) {
      stack.push({ ...active })
      continue
    }
    if (op === OPS.restore) {
      const popped = stack.pop()
      if (popped) active = popped
      continue
    }
    if (FILL_OPS.has(op)) {
      active = fillOpToColor(OPS, op, args)
      continue
    }
    if (TEXT_SHOW_OPS.has(op)) {
      // nextLineSetSpacingShowText: args[0]=wordSpace, args[1]=charSpace, args[2]=glyphs.
      const glyphs = op === OPS.nextLineSetSpacingShowText ? args[2] : args[0]
      const text = glyphsToString(glyphs)
      runs.push({ hex: active.hex, text })
    }
  }
  return runs
}

/**
 * Assign a fill hex to each non-empty `textContent.items` entry by
 * stream-matching against the concatenated showText run text.
 *
 * `textContent.items[].str` concatenated (in order) should match
 * `runs.map(r => r.text).join('')` ignoring at most minor whitespace
 * differences. We advance an index into the runs' joined string and, for
 * each item, pick the fill of the run that contains the item's starting
 * offset. If an item overlaps multiple runs (rare: a single item spans a
 * colour boundary), we use the run that covers its LAST character — a
 * conservative choice because colour changes typically occur at word
 * boundaries and the tail is usually the semantic content.
 */
function assignFillsToItems(items, runs) {
  // Build a per-character colour map from runs.
  let totalLen = 0
  for (const r of runs) totalLen += r.text.length
  const charFill = new Uint32Array(totalLen)
  const runHexList = []
  {
    let pos = 0
    for (const r of runs) {
      const hexIdx = runHexList.indexOf(r.hex)
      const idx = hexIdx === -1 ? runHexList.push(r.hex) - 1 : hexIdx
      for (let j = 0; j < r.text.length; j++) charFill[pos + j] = idx
      pos += r.text.length
    }
  }
  // Concatenate the full run stream for index advancement.
  const runsJoined = runs.map((r) => r.text).join('')

  // Stream-match items' str against runsJoined, advancing a cursor. Missing
  // chars in runsJoined (e.g. an implicit space synthesised by pdfjs into
  // the item but not present as a glyph) are tolerated: we search within a
  // small forward window.
  const out = new Array(items.length).fill('#000000')
  let cursor = 0
  for (let i = 0; i < items.length; i++) {
    const str = items[i].str
    if (!str || str.length === 0) continue

    // Try exact match at cursor first.
    let matchStart = -1
    if (runsJoined.substr(cursor, str.length) === str) {
      matchStart = cursor
    } else {
      // Windowed search ±80 chars.
      const lo = Math.max(0, cursor - 20)
      const hi = Math.min(runsJoined.length, cursor + 80 + str.length)
      const idx = runsJoined.indexOf(str, lo)
      if (idx >= 0 && idx <= hi) matchStart = idx
    }

    if (matchStart >= 0) {
      // Use fill of the last-character position within the run stream.
      const last = Math.min(matchStart + Math.max(0, str.length - 1), runsJoined.length - 1)
      const fillIdx = charFill[last] ?? 0
      out[i] = runHexList[fillIdx] ?? '#000000'
      cursor = matchStart + str.length
    } else {
      // Could not locate the item in the run stream — typically a
      // pdfjs-synthesised whitespace placeholder. Inherit the previous
      // item's fill so it doesn't lie and flip to black mid-run.
      out[i] = i > 0 ? out[i - 1] : '#000000'
    }
  }
  return out
}

// ── Line grouping ───────────────────────────────────────────────────────

const Y_TOLERANCE = 1.5

/**
 * Group spans into lines by y-coordinate (within Y_TOLERANCE), then sort
 * each line left-to-right. Small-caps fragment merging happens here —
 * neighbours with identical y and fontName whose x-gap is narrow collapse
 * into a single span. Advance width is approximated as `span.width` (pdfjs
 * reports per-glyph-group width in user-space units).
 */
function groupIntoLines(spans) {
  if (spans.length === 0) return []
  // First, bucket by y.
  const buckets = []
  const sortedByY = spans.slice().sort((a, b) => b.y - a.y || a.x - b.x)
  for (const s of sortedByY) {
    let placed = false
    for (const b of buckets) {
      if (Math.abs(b.y - s.y) <= Y_TOLERANCE) {
        b.spans.push(s)
        // Running mean y keeps buckets stable as we add.
        b.y = (b.y * b.count + s.y) / (b.count + 1)
        b.count++
        placed = true
        break
      }
    }
    if (!placed) buckets.push({ y: s.y, spans: [s], count: 1 })
  }
  // Sort spans within each line by x.
  for (const b of buckets) b.spans.sort((a, b) => a.x - b.x)

  // Merge same-fontName adjacent spans whose x-gap is narrow. The threshold
  // is `advance * 0.3` as per the task spec: if the current span's width is
  // W and the next span starts within W*0.3 of (x+W), merge.
  for (const b of buckets) {
    const merged = []
    for (const s of b.spans) {
      const prev = merged[merged.length - 1]
      if (prev && prev.fontName === s.fontName && prev.fill === s.fill) {
        const prevEnd = prev.x + prev.width
        const advance = prev.width
        const gap = s.x - prevEnd
        // Allow tiny negative gap (kerning overlap) or tight positive gap.
        if (gap <= Math.max(advance * 0.3, 1.0)) {
          prev.text += s.text
          prev.width = s.x + s.width - prev.x
          continue
        }
      }
      merged.push({ ...s })
    }
    b.spans = merged
  }

  // Return y-sorted top-to-bottom (high-y first: PDF origin is bottom-left).
  buckets.sort((a, b) => b.y - a.y)
  return buckets.map((b) => ({ y: +b.y.toFixed(2), spans: b.spans }))
}

// ── Main entry ──────────────────────────────────────────────────────────

/**
 * Extract styled lines for a list of book pages.
 *
 * @param {{ pdfPath: string, bookPages: number[] }} opts
 * @returns {Promise<Array<{
 *   bookPage: number, physicalPage: number, half: 'left'|'right',
 *   pageWidth: number, pageHeight: number,
 *   lines: Array<{ y: number, spans: Array<{
 *     text: string, x: number, width: number, fill: string,
 *     fontName: string, scaleX: number, isItalic: boolean, isSmallCaps: boolean,
 *   }> }>
 * }>>}
 */
export async function extractStyleOverlay({ pdfPath, bookPages }) {
  if (!Array.isArray(bookPages) || bookPages.length === 0) {
    throw new Error('extractStyleOverlay: bookPages must be a non-empty array')
  }
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await readFile(pdfPath))
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    standardFontDataUrl:
      resolve(REPO_ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
  })
  const doc = await loadingTask.promise
  const OPS = pdfjs.OPS

  // Group requested book pages by physical page so we only fetch each
  // physical page once.
  const byPhysical = new Map()
  for (const book of bookPages) {
    const { physical, half } = bookPageToPhysical(book)
    if (!byPhysical.has(physical)) byPhysical.set(physical, [])
    byPhysical.get(physical).push({ book, half })
  }

  const results = []
  try {
    for (const [physical, entries] of byPhysical) {
      const page = await doc.getPage(physical)
      const viewport = page.getViewport({ scale: 1 })
      const pageWidth = viewport.width
      const pageHeight = viewport.height

      const [textContent, opList] = await Promise.all([
        page.getTextContent({ includeMarkedContent: false, disableNormalization: false }),
        page.getOperatorList(),
      ])
      const runs = collectShowTextRuns(OPS, opList)
      // Keep only items with a non-empty visible string (pdfjs emits
      // zero-length placeholders for "move text position" ops that do NOT
      // correspond to a showText operator and would otherwise desync the
      // fill stream).
      const visibleItems = textContent.items.filter(
        (it) => typeof it.str === 'string' && it.str.length > 0,
      )
      const perItemFills = assignFillsToItems(visibleItems, runs)

      const allSpans = []
      for (let idx = 0; idx < visibleItems.length; idx++) {
        const item = visibleItems[idx]
        const [a, , , d, e, f] = item.transform || [1, 0, 0, 1, 0, 0]
        const x = e
        const y = f
        const scaleX = a
        const scaleY = d
        const fill = perItemFills[idx] ?? '#000000'
        const { isItalic, isSmallCaps } = classifyFont(item.fontName || '', scaleX)
        allSpans.push({
          text: item.str,
          x: +x.toFixed(2),
          y: +y.toFixed(2),
          width: +(+item.width || 0).toFixed(2),
          height: +(+item.height || scaleY || 0).toFixed(2),
          scaleX: +scaleX.toFixed(2),
          fontName: item.fontName || '',
          fill,
          isItalic,
          isSmallCaps,
        })
      }

      for (const { book, half } of entries) {
        const mid = pageWidth / 2
        const filtered = allSpans.filter((s) => {
          if (half === 'left') return s.x < mid
          return s.x >= mid
        })
        const lines = groupIntoLines(filtered)
        results.push({
          bookPage: book,
          physicalPage: physical,
          half,
          pageWidth: +pageWidth.toFixed(2),
          pageHeight: +pageHeight.toFixed(2),
          lines,
        })
      }

      page.cleanup()
    }
  } finally {
    await doc.destroy()
  }

  // Keep output in book-page order.
  results.sort((a, b) => a.bookPage - b.bookPage)
  return results
}
