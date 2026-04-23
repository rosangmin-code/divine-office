#!/usr/bin/env node
/**
 * PoC: pdfjs-dist token-stream extraction for sample pages.
 *
 * Goals:
 *  1. Dump raw text items (str, transform x/y, fontName, hasEOL, width, height)
 *     for PDF pages 376-378 into scripts/out/poc-pdfjs-tokens.json.
 *  2. Walk getOperatorList() to capture fill-colour operators (setFillRGBColor,
 *     setFillGray, setFillCMYKColor, setFillColorN) and assign the *active*
 *     fill colour to each text item in visit order. This is how rubric red
 *     would surface, if the PDF encodes it per-token.
 *  3. Emit a font + fill-colour histogram to scripts/out/poc-pdfjs-histogram.txt.
 *
 * Constraints: uses the legacy ESM build already on disk. No npm installs.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const PDF_PATH = resolve(ROOT, 'public', 'psalter.pdf')
const OUT_DIR = resolve(ROOT, 'scripts', 'out')
const TOKENS_OUT = resolve(OUT_DIR, 'poc-pdfjs-tokens.json')
const HISTO_OUT = resolve(OUT_DIR, 'poc-pdfjs-histogram.txt')

const PAGES = [376, 377, 378] // physical PDF pages around book page 753

// --- Load pdfjs-dist (legacy ESM) ---------------------------------------------
// The legacy build is ES5-safe and works in Node without a DOM polyfill for
// basic text/operator extraction.
const pdfjs = await import(
  'pdfjs-dist/legacy/build/pdf.mjs'
)
// In Node we point workerSrc at the worker file on disk. pdfjs still spawns a
// "fake worker" in-process but needs a non-empty string to satisfy its guard.
pdfjs.GlobalWorkerOptions.workerSrc = resolve(
  ROOT,
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.mjs'
)

const data = new Uint8Array(await readFile(PDF_PATH))
const loadingTask = pdfjs.getDocument({
  data,
  disableWorker: true,
  isEvalSupported: false,
  // Standard font data paths (so pdfjs doesn't warn endlessly):
  standardFontDataUrl: resolve(
    ROOT,
    'node_modules',
    'pdfjs-dist',
    'standard_fonts'
  ) + '/',
})
const doc = await loadingTask.promise

// Build OPS reverse lookup once.
const OPS = pdfjs.OPS
const OP_NAMES = Object.fromEntries(
  Object.entries(OPS).map(([name, code]) => [code, name])
)

const FILL_OPS = new Set([
  OPS.setFillRGBColor,
  OPS.setFillGray,
  OPS.setFillCMYKColor,
  OPS.setFillColorN,
  OPS.setFillColor,
  OPS.setFillColorSpace,
])
const TEXT_SHOW_OPS = new Set([
  OPS.showText,
  OPS.showSpacedText,
  OPS.nextLineShowText,
  OPS.nextLineSetSpacingShowText,
])

function rgbKey(r, g, b) {
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function fillOpToColor(opCode, args) {
  switch (opCode) {
    case OPS.setFillRGBColor: {
      // pdfjs v5 collapses setFillRGBColor args into a single "#rrggbb" string.
      // Older builds may give [r, g, b] in 0..255 or 0..1 — handle both.
      if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('#')) {
        return { space: 'rgb', hex: args[0].toLowerCase(), raw: [args[0]] }
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
      }
      return { space: 'rgb', hex: rgbKey(r, g, b), raw: [args[0], args[1], args[2]] }
    }
    case OPS.setFillGray: {
      const g = args[0] // 0..1
      const v = Math.round(g * 255)
      return { space: 'gray', hex: rgbKey(v, v, v), raw: [g] }
    }
    case OPS.setFillCMYKColor: {
      const [c, m, y, k] = args
      // Approximate CMYK→RGB for histogramming.
      const r = 255 * (1 - c) * (1 - k)
      const g = 255 * (1 - m) * (1 - k)
      const b = 255 * (1 - y) * (1 - k)
      return { space: 'cmyk', hex: rgbKey(r, g, b), raw: [c, m, y, k] }
    }
    case OPS.setFillColorN:
    case OPS.setFillColor: {
      // Usually colour-space dependent; we record raw args.
      return { space: 'colorN', hex: null, raw: args.slice() }
    }
    case OPS.setFillColorSpace: {
      return { space: 'colorSpace', hex: null, raw: args.slice() }
    }
    default:
      return { space: 'unknown', hex: null, raw: args.slice() }
  }
}

// ---- Walk each page ----------------------------------------------------------
const allTokens = []
const fontHisto = new Map() // fontName -> count
const colourHisto = new Map() // hex|space -> count
// Count per-page text-showing operators by active colour, so even if pdfjs
// doesn't give us a colour *per text item* via getTextContent(), we can still
// judge whether colour-tagged text runs exist.
const perPageColourRuns = []

for (const pageNum of PAGES) {
  const page = await doc.getPage(pageNum)

  // --- (a) text items via getTextContent ---
  const textContent = await page.getTextContent({
    includeMarkedContent: false,
    disableNormalization: false,
  })
  const pageItems = []
  for (const item of textContent.items) {
    if (typeof item.str !== 'string') continue
    const [a, b, c, d, e, f] = item.transform || [1, 0, 0, 1, 0, 0]
    pageItems.push({
      page: pageNum,
      str: item.str,
      x: e,
      y: f,
      width: item.width,
      height: item.height,
      scaleX: a,
      scaleY: d,
      fontName: item.fontName,
      hasEOL: !!item.hasEOL,
    })
    const key = item.fontName || '(no-font)'
    fontHisto.set(key, (fontHisto.get(key) || 0) + 1)
  }

  // --- (b) operator list for colour inspection ---
  const opList = await page.getOperatorList()
  let activeFill = { space: 'default', hex: '#000000', raw: null }
  const colourRuns = [] // { colour, textShowCount }
  let currentRun = { colour: { ...activeFill }, textShowCount: 0 }
  const pushRun = () => {
    if (currentRun.textShowCount > 0) colourRuns.push(currentRun)
  }

  // Capture actual strings shown under a non-black fill so we can confirm
  // that rubric red corresponds to header/refrain prose in the book.
  const redRunStrings = []
  let activeIsRed = false
  for (let i = 0; i < opList.fnArray.length; i += 1) {
    const opCode = opList.fnArray[i]
    const args = opList.argsArray[i] || []
    if (FILL_OPS.has(opCode)) {
      const colour = fillOpToColor(opCode, args)
      // Close previous run if colour changed.
      if (
        colour.hex !== activeFill.hex ||
        colour.space !== activeFill.space
      ) {
        pushRun()
        activeFill = colour
        currentRun = { colour: { ...activeFill }, textShowCount: 0 }
      }
      const key = `${activeFill.space}|${activeFill.hex ?? JSON.stringify(activeFill.raw)}`
      colourHisto.set(key, (colourHisto.get(key) || 0) + 1)
      activeIsRed =
        typeof activeFill.hex === 'string' && /^#(ff|e[0-9a-f]|f[0-9a-e])/.test(activeFill.hex) &&
        activeFill.hex !== '#ffffff'
    } else if (TEXT_SHOW_OPS.has(opCode)) {
      currentRun.textShowCount += 1
      if (activeIsRed) {
        // In pdfjs v5, showText args[0] is an array of glyph objects
        // ({ unicode, fontChar, isSpace, width, ... }) interleaved with numeric
        // kerning offsets. Collapse to a unicode string for sampling.
        const glyphs = opCode === OPS.nextLineSetSpacingShowText ? args[2] : args[0]
        if (Array.isArray(glyphs)) {
          let buf = ''
          for (const g of glyphs) {
            if (g && typeof g === 'object' && typeof g.unicode === 'string') {
              buf += g.unicode
            } else if (typeof g === 'string') {
              buf += g
            } else if (typeof g === 'number' && g < -200) {
              // Large negative kerning often represents a space in spaced text.
              buf += ' '
            }
          }
          if (buf.trim()) redRunStrings.push(buf)
        }
      }
    }
  }
  pushRun()

  perPageColourRuns.push({
    page: pageNum,
    runs: colourRuns,
    redSampleText: redRunStrings.slice(0, 40),
    redSampleJoined: redRunStrings.join('').slice(0, 1200),
  })
  allTokens.push(...pageItems)
  page.cleanup()
}

await doc.destroy()

// ---- Emit ---------------------------------------------------------------------
await mkdir(OUT_DIR, { recursive: true })

// Cap per-item float precision for readable JSON.
const rounded = allTokens.map((t) => ({
  ...t,
  x: Number.isFinite(t.x) ? +t.x.toFixed(2) : t.x,
  y: Number.isFinite(t.y) ? +t.y.toFixed(2) : t.y,
  width: Number.isFinite(t.width) ? +t.width.toFixed(2) : t.width,
  height: Number.isFinite(t.height) ? +t.height.toFixed(2) : t.height,
  scaleX: Number.isFinite(t.scaleX) ? +t.scaleX.toFixed(2) : t.scaleX,
  scaleY: Number.isFinite(t.scaleY) ? +t.scaleY.toFixed(2) : t.scaleY,
}))
await writeFile(
  TOKENS_OUT,
  JSON.stringify(
    {
      pdf: 'public/psalter.pdf',
      pages: PAGES,
      generated: new Date().toISOString(),
      tokenCount: rounded.length,
      tokens: rounded,
      colourRunsPerPage: perPageColourRuns,
    },
    null,
    2
  )
)

const lines = []
lines.push('# pdfjs-dist PoC histogram')
lines.push(`PDF: public/psalter.pdf`)
lines.push(`Physical pages sampled: ${PAGES.join(', ')}`)
lines.push(`Book-page range (2-up): ${PAGES[0] * 2 - 2}..${PAGES[PAGES.length - 1] * 2 - 1}`)
lines.push('')
lines.push('## Font histogram (text items per fontName)')
const fontRows = [...fontHisto.entries()].sort((a, b) => b[1] - a[1])
for (const [name, n] of fontRows) {
  lines.push(`  ${String(n).padStart(6)}  ${name}`)
}
lines.push('')
lines.push('## Fill-colour operator histogram')
lines.push('(space|hex  -> number of fill-colour set operations encountered)')
const colourRows = [...colourHisto.entries()].sort((a, b) => b[1] - a[1])
for (const [key, n] of colourRows) {
  lines.push(`  ${String(n).padStart(6)}  ${key}`)
}
lines.push('')
lines.push('## Per-page colour runs (contiguous text-show ops under one fill)')
for (const { page, runs, redSampleJoined } of perPageColourRuns) {
  lines.push(`  page ${page}:`)
  for (const r of runs) {
    const hex = r.colour.hex ?? JSON.stringify(r.colour.raw)
    lines.push(
      `    ${String(r.textShowCount).padStart(5)} text-show ops  colour=${r.colour.space}|${hex}`
    )
  }
  if (redSampleJoined) {
    lines.push(`    red-run sample (first 1200 chars of red-coloured showText args):`)
    lines.push(`      ${JSON.stringify(redSampleJoined)}`)
  }
}
lines.push('')

await writeFile(HISTO_OUT, lines.join('\n'))

console.log(`Wrote ${TOKENS_OUT}`)
console.log(`Wrote ${HISTO_OUT}`)
console.log(`Total text items: ${allTokens.length}`)
console.log(`Distinct fonts: ${fontHisto.size}`)
console.log(`Distinct fill-colour keys: ${colourHisto.size}`)
