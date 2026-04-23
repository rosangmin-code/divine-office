#!/usr/bin/env node
/**
 * build-rich-pilot.mjs — Stage 3b pilot rich AST builder.
 *
 * Scope: Ordinary Time Week 1 SUN Lauds `concludingPrayer` on book page 753.
 *
 * Stage 6 리팩토링 (2026-04-23): 파이프라인 로직은
 * `scripts/parsers/rich-builder.mjs` 의 `buildProsePrayer` 로 이관됐다.
 * 이 스크립트는 pilot 설정(책 페이지 / 섹션 헤더 regex / 원본 문자열 소스)
 * 을 주입해 빌더를 호출하고, 수용 게이트 통과 시 pilot rich JSON 을
 * 쓰고 validation report 를 남기는 얇은 래퍼다. 같은 pattern 을 공유하는
 * 다른 시즌·날짜·시간대의 concludingPrayer 확산 스크립트도 rich-builder
 * 를 직접 호출한다.
 *
 * Hard constraints:
 *   - NEVER mutates any file under src/data/loth/** except writing the one
 *     rich JSON under src/data/loth/prayers/seasonal/ordinary-time/
 *     (w1-SUN-lauds.rich.json).
 *   - NEVER touches psalter-texts.json, propers/*.json, types.ts, sw.js.
 *   - Exits non-zero without writing on any validation failure.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { selfVerify } from './parsers/book-page-mapper.mjs'
import {
  buildProsePrayer,
  normaliseWhitespace,
} from './parsers/rich-builder.mjs'

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
  sectionHeadingRegex: /Төгсгөлийн\s+даатгал\s+залбирал/i,
  endOfBlockRegex: /ЖИРИЙН\s+ЦАГ\s+УЛИРЛЫН/,
})

function writeValidationReport({
  original,
  reconstructed,
  pass,
  blocks,
  stylePage,
  headingLine,
  bodyLines,
}) {
  // Histograms over the full styled page (not just the section body) — same
  // diagnostic surface as the pre-refactor pilot.
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
  out.push(`- Reconstructed length: ${reconstructed.length}`)
  out.push('')
  out.push('### Original (normalised)')
  out.push('```')
  out.push(normaliseWhitespace(original))
  out.push('```')
  out.push('')
  out.push('### Reconstructed from rich AST (normalised)')
  out.push('```')
  out.push(normaliseWhitespace(reconstructed))
  out.push('```')
  out.push('')
  out.push('## Block breakdown')
  const kinds = {}
  for (const b of blocks) kinds[b.kind] = (kinds[b.kind] || 0) + 1
  for (const [k, n] of Object.entries(kinds).sort()) out.push(`- ${k}: ${n}`)
  const spanCount = blocks.reduce((acc, b) => acc + (b.spans ? b.spans.length : 0), 0)
  out.push(`- total spans (inside para/stanza): ${spanCount}`)
  out.push('')
  out.push('## Detected rubric markers (red-coloured runs on book 753 right half)')
  if (rubricMarkers.length === 0) out.push('- (none)')
  else for (const m of rubricMarkers) out.push(`- "${m}"`)
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

  const propers = JSON.parse(readFileSync(PROPERS_PATH, 'utf-8'))
  const src = propers?.weeks?.['1']?.SUN?.lauds?.concludingPrayer
  if (typeof src !== 'string' || src.trim() === '') {
    console.error('[rich-pilot] could not read concludingPrayer from ordinary-time.json')
    process.exit(1)
  }

  const existingRich = existsSync(RICH_OUT)
    ? JSON.parse(readFileSync(RICH_OUT, 'utf-8'))
    : null

  const result = await buildProsePrayer({
    pdfPath: PDF_PATH,
    bookPage: PILOT.bookPage,
    sectionHeadingRegex: PILOT.sectionHeadingRegex,
    endOfBlockRegex: PILOT.endOfBlockRegex,
    originalText: src,
    source: {
      kind: 'seasonal',
      season: PILOT.season,
      weekKey: PILOT.weekKey,
      dayKey: PILOT.dayKey,
      hour: PILOT.hour,
    },
    pdftotextCachePath: FULLTEXT_OUT,
  })

  writeValidationReport({
    original: src,
    reconstructed: result.reconstructedNorm ?? '',
    pass: result.pass === true,
    blocks: result.blocks,
    stylePage: result.stylePage,
    headingLine: result.headingLine,
    bodyLines: result.bodyLines,
  })

  if (result.pass !== true) {
    console.error('[rich-pilot] ACCEPTANCE GATE: FAIL')
    console.error('  original     :', result.originalNorm)
    console.error('  reconstructed:', result.reconstructedNorm)
    const i = result.firstDivergenceAt ?? 0
    console.error(`  first divergence at index ${i}`)
    console.error(
      `    original[${i}..${i + 40}]       = ${JSON.stringify((result.originalNorm ?? '').slice(i, i + 40))}`,
    )
    console.error(
      `    reconstructed[${i}..${i + 40}]  = ${JSON.stringify((result.reconstructedNorm ?? '').slice(i, i + 40))}`,
    )
    process.exit(2)
  }

  // Merge concludingPrayerRich with any existing fields on the overlay (e.g.
  // responsoryRich that the pilot file already carries). This preserves the
  // manually authored responsory overlay.
  const rich = {
    ...(existingRich ?? {}),
    concludingPrayerRich: result.prayerText,
  }

  mkdirSync(dirname(RICH_OUT), { recursive: true })
  writeFileSync(RICH_OUT, JSON.stringify(rich, null, 2) + '\n', 'utf-8')

  const kindTally = {}
  for (const b of result.blocks) kindTally[b.kind] = (kindTally[b.kind] || 0) + 1
  console.log('[rich-pilot] ACCEPTANCE GATE: PASS')
  console.log(`[rich-pilot] block kinds: ${JSON.stringify(kindTally)}`)
  console.log(`[rich-pilot] wrote -> ${RICH_OUT}`)
  console.log('[rich-pilot] done')
}

main().catch((err) => {
  console.error('[rich-pilot] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
