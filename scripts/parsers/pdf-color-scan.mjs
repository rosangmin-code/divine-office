#!/usr/bin/env node
// Full-book fill-color scan. Open question #1 from poc-findings.md:
// "Do all 485 PDF pages use exactly the same two fill colours?"
// Output: scripts/out/pdf-color-histogram.json (global) + per-page colour presence.
//
// Approach is the minimal subset of pdf-lexer.poc.mjs: walk getOperatorList()
// on every page, convert fill ops to hex, tally. No text extraction — this
// just confirms the colour palette so Stage 3b can fix the taxonomy.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const PDF_PATH = resolve(ROOT, 'public', 'psalter.pdf')
const OUT_DIR = resolve(ROOT, 'scripts', 'out')
const OUT_FILE = resolve(OUT_DIR, 'pdf-color-histogram.json')

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
pdfjs.GlobalWorkerOptions.workerSrc = resolve(
  ROOT,
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.mjs',
)

const data = new Uint8Array(await readFile(PDF_PATH))
const loadingTask = pdfjs.getDocument({
  data,
  useSystemFonts: true,
  disableWorker: true,
  isEvalSupported: false,
  standardFontDataUrl: resolve(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
})
const doc = await loadingTask.promise
const OPS = pdfjs.OPS

const FILL_OPS = new Set([
  OPS.setFillRGBColor,
  OPS.setFillGray,
  OPS.setFillCMYKColor,
])

function rgbKey(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function opToHex(opCode, args) {
  if (opCode === OPS.setFillRGBColor) {
    if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('#')) {
      return args[0].toLowerCase()
    }
    let [r, g, b] = args
    if ([r, g, b].every((v) => typeof v === 'number')) {
      if (r <= 1 && g <= 1 && b <= 1) { r *= 255; g *= 255; b *= 255 }
      return rgbKey(r, g, b)
    }
  }
  if (opCode === OPS.setFillGray) {
    const v = Math.round(args[0] * 255)
    return rgbKey(v, v, v)
  }
  if (opCode === OPS.setFillCMYKColor) {
    const [c, m, y, k] = args
    const r = 255 * (1 - c) * (1 - k)
    const g = 255 * (1 - m) * (1 - k)
    const b = 255 * (1 - y) * (1 - k)
    return rgbKey(r, g, b)
  }
  return null
}

const globalHisto = new Map()
const perPageColours = []  // [{ page, colors: { hex: count } }]

const totalPages = doc.numPages
process.stderr.write(`Scanning ${totalPages} pages...\n`)

for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
  const page = await doc.getPage(pageNum)
  const opList = await page.getOperatorList()
  const perPage = new Map()
  for (let i = 0; i < opList.fnArray.length; i++) {
    const code = opList.fnArray[i]
    if (!FILL_OPS.has(code)) continue
    const hex = opToHex(code, opList.argsArray[i])
    if (!hex) continue
    globalHisto.set(hex, (globalHisto.get(hex) || 0) + 1)
    perPage.set(hex, (perPage.get(hex) || 0) + 1)
  }
  perPageColours.push({ page: pageNum, colors: Object.fromEntries(perPage) })
  if (pageNum % 50 === 0) process.stderr.write(`  ${pageNum}/${totalPages}\n`)
}

await mkdir(OUT_DIR, { recursive: true })
const summary = {
  totalPages,
  globalHistogram: Object.fromEntries(
    [...globalHisto.entries()].sort((a, b) => b[1] - a[1]),
  ),
  uniqueColorsPerPageDistribution: (() => {
    const dist = {}
    for (const p of perPageColours) {
      const n = Object.keys(p.colors).length
      dist[n] = (dist[n] || 0) + 1
    }
    return dist
  })(),
  pagesWithUnexpectedColor: perPageColours
    .filter((p) => Object.keys(p.colors).some((hex) => hex !== '#ff0000' && hex !== '#2c2e35'))
    .map((p) => ({ page: p.page, colors: p.colors })),
  perPage: perPageColours,
}
await writeFile(OUT_FILE, JSON.stringify(summary, null, 2))
process.stderr.write(`Done. ${OUT_FILE}\n`)
process.stderr.write(`Global colors: ${JSON.stringify(summary.globalHistogram)}\n`)
process.stderr.write(`Pages with unexpected color: ${summary.pagesWithUnexpectedColor.length}\n`)
