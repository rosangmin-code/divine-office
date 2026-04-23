#!/usr/bin/env node
/**
 * build-rich-pilot.mjs — Stage 3b pilot rich AST builder.
 *
 * Scope: ONE prayer, Ordinary Time Week 1 SUN Lauds `concludingPrayer`
 * on book page 753 (physical PDF page 377, right half).
 *
 * Pipeline (per the 2-layer PoC):
 *   A. Body source  — `pdftotext -layout` + pdftotext-column-splitter.mjs
 *      Gives deterministic Unicode text with whitespace-preserved indent.
 *   B. Style source — pdfjs-style-overlay.mjs
 *      Gives per-span fill colour, fontName, scaleX, small-caps flag.
 *
 * The pilot matches A lines to B styled-lines by top-to-bottom order within
 * the concluding-prayer region (bounded above by the "Төгсгөлийн даатгал
 * залбирал" marker and below by the next all-caps section header), then
 * emits a `PrayerText` AST with `rubric-line` blocks for the section
 * heading and `para` blocks for the body prose.
 *
 * Acceptance gate: the flattened plain text of the emitted AST must equal
 * the original `concludingPrayer` string from ordinary-time.json (whitespace
 * normalised to single spaces + trim). PASS/FAIL is printed at the end.
 *
 * Hard constraints:
 *   - NEVER mutates any file under src/data/loth/** except writing the one
 *     rich JSON under src/data/loth/prayers/seasonal/ordinary-time/
 *     (w1-SUN-lauds.rich.json).
 *   - NEVER touches psalter-texts.json, propers/*.json, types.ts, sw.js.
 *   - Exits non-zero without writing on any validation failure.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitColumns } from './parsers/pdftotext-column-splitter.mjs'
import { bookPageToPhysical, selfVerify } from './parsers/book-page-mapper.mjs'
import { extractStyleOverlay } from './parsers/pdfjs-style-overlay.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const PROPERS_PATH = resolve(REPO_ROOT, 'src/data/loth/propers/ordinary-time.json')
const FULLTEXT_OUT = resolve(REPO_ROOT, 'scripts/out/pilot-rich-p377.txt')
const RICH_OUT = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/seasonal/ordinary-time/w1-SUN-lauds.rich.json',
)
const VALIDATION_OUT = resolve(REPO_ROOT, 'scripts/out/pilot-rich-validation.md')

const PILOT = Object.freeze({
  season: 'ORDINARY_TIME',
  weekKey: '1',
  dayKey: 'SUN',
  hour: 'lauds',
  bookPage: 753,
  // Section heading that precedes the concludingPrayer on book 753.
  // Detected via pdfjs style overlay (red + small-caps f4 family).
  sectionHeadingRegex: /Төгсгөлийн\s+даатгал\s+залбирал/i,
  // End marker (next Ordinary-Time week's header block starts here).
  // Any line whose styled spans are predominantly all-caps f3 red.
  endOfBlockRegex: /ЖИРИЙН\s+ЦАГ\s+УЛИРЛЫН/,
})

// ── Helpers ─────────────────────────────────────────────────────────────

function normaliseWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim()
}

function flattenAstToPlainText(blocks) {
  const parts = []
  for (const block of blocks) {
    if (block.kind === 'rubric-line') {
      parts.push(block.text)
      continue
    }
    if (block.kind === 'para') {
      const text = (block.spans || []).map((sp) => sp.text ?? '').join('')
      parts.push(text)
      continue
    }
    if (block.kind === 'stanza') {
      for (const line of block.lines || []) {
        parts.push((line.spans || []).map((sp) => sp.text ?? '').join(''))
      }
      continue
    }
    if (block.kind === 'divider') {
      parts.push('')
      continue
    }
  }
  return parts.join('\n')
}

function runPdftotext(firstPhysical, lastPhysical) {
  const outDir = dirname(FULLTEXT_OUT)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  console.log(
    `[rich-pilot] pdftotext -layout -f ${firstPhysical} -l ${lastPhysical} -> ${FULLTEXT_OUT}`,
  )
  execFileSync(
    'pdftotext',
    [
      '-layout',
      '-f',
      String(firstPhysical),
      '-l',
      String(lastPhysical),
      PDF_PATH,
      FULLTEXT_OUT,
    ],
    { stdio: 'inherit' },
  )
  return readFileSync(FULLTEXT_OUT, 'utf-8')
}

// ── Body line extraction (layer A) ──────────────────────────────────────

/**
 * Pull the concludingPrayer lines from the pdftotext right-column stream
 * of book 753. Returns { headingLine, bodyLines } where headingLine is
 * the section title and bodyLines are the raw prose lines preserved as
 * emitted (trimmed of trailing whitespace only).
 *
 * Segmentation:
 *   - heading = first non-empty line matching sectionHeadingRegex
 *   - body start = next non-empty line after heading
 *   - body end = first non-empty line matching endOfBlockRegex (excl.) OR
 *                a blank line that is followed only by end-marker / EOF
 *   - intra-body blank lines are stanza breaks (kept)
 */
function extractConcludingPrayerLines(bookPageStream) {
  const lines = bookPageStream.lines
  let headingIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (PILOT.sectionHeadingRegex.test(lines[i])) {
      headingIdx = i
      break
    }
  }
  if (headingIdx < 0) {
    throw new Error(
      '[rich-pilot] could not locate section heading "Төгсгөлийн даатгал залбирал" on book 753 right column',
    )
  }
  const headingLine = lines[headingIdx].replace(/\s+$/, '').trim()

  const bodyLines = []
  let sawBody = false
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (PILOT.endOfBlockRegex.test(trimmed)) break

    if (trimmed === '') {
      // Keep only intra-body blanks; trim leading blanks before first body.
      if (sawBody) bodyLines.push('')
      continue
    }

    sawBody = true
    bodyLines.push(raw.replace(/\s+$/, ''))
  }

  // Trim trailing blank separators.
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
    bodyLines.pop()
  }

  if (bodyLines.length === 0) {
    throw new Error('[rich-pilot] no body lines found after section heading')
  }

  return { headingLine, bodyLines }
}

// ── Style lookup (layer B) ──────────────────────────────────────────────

/**
 * Given the styled-line overlay for book 753 right half, locate the
 * subset of styled lines that covers the concluding-prayer region —
 * same segmentation rules as extractConcludingPrayerLines, but on the
 * pdfjs line stream (which is already top-down by y-descending).
 */
function extractConcludingPrayerStyledLines(stylePage) {
  const lines = stylePage.lines
  let headingIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const flat = lines[i].spans.map((s) => s.text).join('').trim()
    if (!flat) continue
    if (PILOT.sectionHeadingRegex.test(flat)) {
      headingIdx = i
      break
    }
  }
  if (headingIdx < 0) {
    throw new Error('[rich-pilot] section heading not found in pdfjs style overlay')
  }
  const heading = lines[headingIdx]

  const body = []
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const flat = lines[i].spans.map((s) => s.text).join('').trim()
    if (!flat) continue
    if (PILOT.endOfBlockRegex.test(flat)) break
    body.push(lines[i])
  }

  if (body.length === 0) {
    throw new Error('[rich-pilot] no body styled-lines found after section heading')
  }

  return { heading, body }
}

// ── Rich AST construction ──────────────────────────────────────────────

const RUBRIC_HEXES = new Set(['#ff0000'])

function spanIsRubric(span) {
  return RUBRIC_HEXES.has(span.fill)
}

/**
 * Build a `PrayerText` AST from matched body lines. Strategy:
 *   - Emit one `rubric-line` block for the section heading.
 *   - For each body line, build a `para` block. Spans are derived from the
 *     styled-line spans: consecutive non-rubric spans coalesce to a single
 *     `text` span (italic flag if any contributor is italic); rubric spans
 *     emit as `rubric` spans.
 *   - A blank line between body lines inserts a `divider` block between
 *     the two `para` blocks so stanza separation survives the AST.
 *   - Pilot scope: no V./R. detected on book 753. If any span text begins
 *     with "V." / "R." we'd emit versicle/response spans, but this case is
 *     unobserved here.
 *
 * The flattened plain text of all `para` blocks (joined with '\n') must
 * equal the whitespace-normalised original prayer string.
 */
function buildRichAst({ headingLine, bodyLines, stylePage, stylePageHeading, stylePageBody }) {
  const blocks = []

  // 1. Section heading — sanity-check only; NOT emitted as a block.
  //    The section component (concluding-prayer-section.tsx etc.) already
  //    renders its own red heading ("Төгсгөлийн даатгал залбирал"). If the
  //    builder also pushed a rubric-line block, RichContent would render it
  //    and the heading would appear twice. Keep the pdfjs colour check as a
  //    validation guard so we catch mis-extracted regions early.
  const headingFlat = stylePageHeading.spans.map((s) => s.text).join('').trim()
  const headingAllRed = stylePageHeading.spans.every((s) => spanIsRubric(s) || s.text.trim() === '')
  if (!headingAllRed) {
    console.warn(
      `[rich-pilot] warning: section heading spans are not uniformly red (fills=${[
        ...new Set(stylePageHeading.spans.map((s) => s.fill)),
      ].join(',')})`,
    )
  }
  const headingLineNorm = normaliseWhitespace(headingLine)
  const headingFlatNorm = normaliseWhitespace(headingFlat)
  if (headingLineNorm.length !== headingFlatNorm.length) {
    console.warn(
      `[rich-pilot] warning: heading length mismatch pdftotext=${headingLineNorm.length} pdfjs=${headingFlatNorm.length}`,
    )
  }

  // 2. Body lines -> paragraph groups -> one `para` block per paragraph.
  //    pdftotext emits visual line breaks from column wrapping. Those are
  //    not semantic paragraph breaks — treating each visual line as its own
  //    `para` makes the rendered output reflow-hostile (fixed-width columns
  //    in a fluid layout). Blank lines between body lines are semantic
  //    paragraph (or stanza) breaks, so we group consecutive non-blank
  //    lines into a paragraph and insert a `divider` block between groups.
  const styleBody = stylePageBody
  const paragraphs = [] // [{ lines: string[], styledLines: StyledLine[] }]
  let current = { lines: [], styledLines: [] }
  let styleIdx = 0
  const closeParagraph = () => {
    if (current.lines.length > 0) {
      paragraphs.push(current)
      current = { lines: [], styledLines: [] }
    }
  }

  for (const raw of bodyLines) {
    const trimmed = raw.trim()
    if (trimmed === '') {
      closeParagraph()
      continue
    }
    if (styleIdx >= styleBody.length) {
      throw new Error(
        `[rich-pilot] pdftotext body has more non-blank lines (${bodyLines.length}) than pdfjs styled body (${styleBody.length})`,
      )
    }
    const styled = styleBody[styleIdx]
    styleIdx++

    // Cross-check: same first 10 chars (whitespace squashed). Allow one-step
    // fuzzy resync for a stray styled caption we haven't matched.
    const styledText = styled.spans.map((s) => s.text).join('')
    const styledNorm = normaliseWhitespace(styledText).slice(0, 10)
    const bodyNorm = normaliseWhitespace(trimmed).slice(0, 10)
    if (styledNorm !== bodyNorm) {
      if (
        styleIdx < styleBody.length &&
        normaliseWhitespace(styleBody[styleIdx].spans.map((s) => s.text).join('')).slice(0, 10) ===
          bodyNorm
      ) {
        styleIdx++
      } else {
        console.warn(
          `[rich-pilot] line mismatch: pdftotext="${bodyNorm}" vs pdfjs="${styledNorm}" — using pdftotext text, neutral style`,
        )
      }
    }

    current.lines.push(trimmed)
    current.styledLines.push(styled)
  }
  closeParagraph()

  // Emit one `para` block per paragraph group.
  // Heuristic: if every styled span in the paragraph is body-coloured, we
  // emit a single `text` span with the paragraph's full prose (lines joined
  // by a single space — pdftotext wraps by column width, not by semantic
  // phrase). If the paragraph contains any rubric-coloured spans, we fall
  // back to the per-span reconstruction so inline rubric boundaries survive.
  for (let pi = 0; pi < paragraphs.length; pi++) {
    if (pi > 0) blocks.push({ kind: 'divider' })
    const p = paragraphs[pi]
    const allSpans = p.styledLines.flatMap((sl) => sl.spans)
    const allBodyColoured = allSpans.every((s) => !spanIsRubric(s))
    const anyItalic = allSpans.some((s) => s.isItalic)
    if (allBodyColoured) {
      const joined = p.lines.join(' ').replace(/\s+/g, ' ').trim()
      blocks.push({
        kind: 'para',
        spans: [
          {
            kind: 'text',
            text: joined,
            ...(anyItalic ? { emphasis: ['italic'] } : {}),
          },
        ],
      })
      continue
    }
    // Mixed-colour paragraph: emit span-level rubric/text distinctions.
    // Coalesce consecutive spans of the same {kind, isItalic}. Lines are
    // separated by a single space so the flattened prose still reflows.
    const prayerSpans = []
    let buf = null
    const flush = () => {
      if (buf && buf.text.length > 0) prayerSpans.push(buf)
      buf = null
    }
    for (let li = 0; li < p.styledLines.length; li++) {
      const sl = p.styledLines[li]
      for (const sp of sl.spans) {
        const isRubric = spanIsRubric(sp)
        const kind = isRubric ? 'rubric' : 'text'
        const italic = !!sp.isItalic
        if (!buf || buf.kind !== kind || buf.italic !== italic) {
          flush()
          buf = { kind, text: '', italic }
        }
        buf.text += sp.text
      }
      // Inter-line space when coalescing into a single paragraph.
      if (li < p.styledLines.length - 1 && buf) buf.text += ' '
    }
    flush()
    const cleaned = prayerSpans.map((sp) => {
      const out = { kind: sp.kind, text: sp.text.replace(/\s+/g, ' ').trim() }
      if (sp.kind === 'text' && sp.italic) out.emphasis = ['italic']
      return out
    })
    blocks.push({ kind: 'para', spans: cleaned.filter((sp) => sp.text.length > 0) })
  }

  // Trim trailing divider(s).
  while (blocks.length > 0 && blocks[blocks.length - 1].kind === 'divider') {
    blocks.pop()
  }

  // Unused analytic placeholders preserved for side-report.
  void stylePage
  return blocks
}

// ── Reports ─────────────────────────────────────────────────────────────

function writeValidationReport({
  original,
  plainConcat,
  pass,
  blocks,
  styleHistogram,
  fontHistogram,
  headingLine,
  bodyLines,
  rubricMarkers,
}) {
  const out = []
  out.push('# Stage 3b Pilot — Rich AST Validation Report')
  out.push('')
  out.push(`- Book page: ${PILOT.bookPage}`)
  out.push(`- Season/Week/Day/Hour: ORDINARY_TIME / w${PILOT.weekKey} / ${PILOT.dayKey} / ${PILOT.hour}`)
  out.push(`- Source JSON: src/data/loth/propers/ordinary-time.json`)
  out.push(`- Generated: ${new Date().toISOString()}`)
  out.push('')
  out.push('## Plain-text acceptance gate')
  out.push('')
  out.push(`- Result: **${pass ? 'PASS' : 'FAIL'}**`)
  out.push(`- Original length: ${original.length}`)
  out.push(`- Reconstructed length: ${plainConcat.length}`)
  out.push('')
  out.push('### Original (normalised)')
  out.push('```')
  out.push(normaliseWhitespace(original))
  out.push('```')
  out.push('')
  out.push('### Reconstructed from rich AST (normalised)')
  out.push('```')
  out.push(normaliseWhitespace(plainConcat))
  out.push('```')
  out.push('')
  out.push('## Block breakdown')
  const kinds = {}
  for (const b of blocks) kinds[b.kind] = (kinds[b.kind] || 0) + 1
  for (const [k, n] of Object.entries(kinds).sort()) {
    out.push(`- ${k}: ${n}`)
  }
  const spanCount = blocks.reduce(
    (acc, b) => acc + (b.spans ? b.spans.length : 0),
    0,
  )
  out.push(`- total spans (inside para/stanza): ${spanCount}`)
  out.push('')
  out.push('## Detected rubric markers (red-coloured runs on book 753 right half)')
  if (rubricMarkers.length === 0) {
    out.push('- (none)')
  } else {
    for (const m of rubricMarkers) {
      out.push(`- "${m}"`)
    }
  }
  out.push('')
  out.push('## Font histogram (book 753 right half)')
  for (const [name, n] of Object.entries(fontHistogram).sort((a, b) => b[1] - a[1])) {
    out.push(`- ${name}: ${n} spans`)
  }
  out.push('')
  out.push('## Fill-colour histogram (book 753 right half)')
  for (const [hex, n] of Object.entries(styleHistogram).sort((a, b) => b[1] - a[1])) {
    out.push(`- ${hex}: ${n} spans`)
  }
  out.push('')
  out.push('## pdftotext body segmentation')
  out.push(`- heading line: "${headingLine}"`)
  out.push(`- body lines (non-blank): ${bodyLines.filter((l) => l.trim()).length}`)
  out.push(`- total body lines incl. blanks: ${bodyLines.length}`)
  out.push('')
  out.push('```')
  for (const l of bodyLines) out.push(l.length === 0 ? '[blank]' : l)
  out.push('```')
  out.push('')
  mkdirSync(dirname(VALIDATION_OUT), { recursive: true })
  writeFileSync(VALIDATION_OUT, out.join('\n'), 'utf-8')
  console.log(`[rich-pilot] wrote validation report -> ${VALIDATION_OUT}`)
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const verify = selfVerify()
  if (!verify.ok) {
    console.error('[rich-pilot] book-page mapper self-verify FAILED', verify.failures)
    process.exit(1)
  }
  console.log('[rich-pilot] book-page mapper self-verify ok')

  if (!existsSync(PDF_PATH)) {
    console.error(`[rich-pilot] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }
  if (!existsSync(PROPERS_PATH)) {
    console.error(`[rich-pilot] ordinary-time.json not found: ${PROPERS_PATH}`)
    process.exit(1)
  }

  // Load source of truth.
  const propers = JSON.parse(readFileSync(PROPERS_PATH, 'utf-8'))
  const src = propers?.weeks?.['1']?.SUN?.lauds?.concludingPrayer
  if (typeof src !== 'string' || src.trim() === '') {
    console.error('[rich-pilot] could not read concludingPrayer from ordinary-time.json')
    process.exit(1)
  }

  // Layer A — body lines via pdftotext + column splitter.
  const { physical } = bookPageToPhysical(PILOT.bookPage)
  const pdftotextContent = runPdftotext(physical, physical)
  const streams = splitColumns(pdftotextContent, [physical])
  const rightStream = streams.find((s) => s.bookPage === PILOT.bookPage)
  if (!rightStream) {
    console.error(`[rich-pilot] right-column stream for book ${PILOT.bookPage} missing`)
    process.exit(1)
  }
  const { headingLine, bodyLines } = extractConcludingPrayerLines(rightStream)

  // Layer B — style overlay via pdfjs.
  const styleResults = await extractStyleOverlay({ pdfPath: PDF_PATH, bookPages: [PILOT.bookPage] })
  const stylePage = styleResults.find((r) => r.bookPage === PILOT.bookPage)
  if (!stylePage) {
    console.error('[rich-pilot] style overlay missing book 753')
    process.exit(1)
  }
  const { heading: stylePageHeading, body: stylePageBody } =
    extractConcludingPrayerStyledLines(stylePage)

  // Histograms over the right-half styled spans.
  const styleHistogram = {}
  const fontHistogram = {}
  const rubricMarkers = []
  for (const line of stylePage.lines) {
    for (const sp of line.spans) {
      styleHistogram[sp.fill] = (styleHistogram[sp.fill] || 0) + 1
      fontHistogram[sp.fontName] = (fontHistogram[sp.fontName] || 0) + 1
    }
    const text = line.spans.map((s) => s.text).join('').trim()
    const allRed = line.spans.length > 0 && line.spans.every((s) => s.fill === '#ff0000' || !s.text.trim())
    if (allRed && text) rubricMarkers.push(text)
  }

  // Build AST.
  const blocks = buildRichAst({
    headingLine,
    bodyLines,
    stylePage,
    stylePageHeading,
    stylePageBody,
  })

  // Acceptance gate: flatten to plain text, normalise whitespace, compare.
  // Note: rubric-line blocks (section heading) are metadata and are NOT
  // part of the body prose in ordinary-time.json. They are excluded from
  // the comparison string — the original JSON field represents only the
  // prose of the prayer. (See `concludingPrayer` definition in
  // propers/ordinary-time.json — section labels live separately on page.)
  const astPlain = flattenAstToPlainText(
    blocks.filter((b) => b.kind !== 'rubric-line'),
  )
  const originalNorm = normaliseWhitespace(src)
  const reconstructedNorm = normaliseWhitespace(astPlain)
  const pass = originalNorm === reconstructedNorm

  // Emit rich JSON (only on PASS; otherwise abort with diagnostic).
  const rich = {
    concludingPrayerRich: {
      blocks,
      page: PILOT.bookPage,
      source: {
        kind: 'seasonal',
        season: PILOT.season,
        weekKey: PILOT.weekKey,
        dayKey: PILOT.dayKey,
        hour: PILOT.hour,
      },
    },
  }

  // Always write validation report for post-mortem, regardless of pass/fail.
  writeValidationReport({
    original: src,
    plainConcat: astPlain,
    pass,
    blocks,
    styleHistogram,
    fontHistogram,
    headingLine,
    bodyLines,
    rubricMarkers,
  })

  if (!pass) {
    console.error('[rich-pilot] ACCEPTANCE GATE: FAIL')
    console.error('  original     :', originalNorm)
    console.error('  reconstructed:', reconstructedNorm)
    // Diff in short: show first divergence index.
    let i = 0
    for (; i < Math.min(originalNorm.length, reconstructedNorm.length); i++) {
      if (originalNorm[i] !== reconstructedNorm[i]) break
    }
    console.error(`  first divergence at index ${i}`)
    console.error(`    original[${i}..${i + 40}]       = ${JSON.stringify(originalNorm.slice(i, i + 40))}`)
    console.error(`    reconstructed[${i}..${i + 40}]  = ${JSON.stringify(reconstructedNorm.slice(i, i + 40))}`)
    process.exit(2)
  }

  // Write rich JSON only on PASS.
  mkdirSync(dirname(RICH_OUT), { recursive: true })
  writeFileSync(RICH_OUT, JSON.stringify(rich, null, 2) + '\n', 'utf-8')

  const kindTally = {}
  for (const b of blocks) kindTally[b.kind] = (kindTally[b.kind] || 0) + 1
  console.log('[rich-pilot] ACCEPTANCE GATE: PASS')
  console.log(`[rich-pilot] block kinds: ${JSON.stringify(kindTally)}`)
  console.log(`[rich-pilot] wrote -> ${RICH_OUT}`)
  console.log(`[rich-pilot] rubric markers on page: ${rubricMarkers.length}`)
  console.log(`[rich-pilot] fill histogram: ${JSON.stringify(styleHistogram)}`)
  console.log(`[rich-pilot] font histogram: ${JSON.stringify(fontHistogram)}`)
  console.log('[rich-pilot] done')
}

main().catch((err) => {
  console.error('[rich-pilot] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
