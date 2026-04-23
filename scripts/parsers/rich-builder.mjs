/**
 * rich-builder.mjs — Stage 6 확산용 공통 rich AST 빌더.
 *
 * `scripts/build-rich-pilot.mjs` 의 PDF -> PrayerText 파이프라인을
 * 영역 중립적으로 추출한 모듈. pilot 은 이 모듈을 호출하는 얇은 래퍼로
 * 축소됐으며, Stage 6 에서 concludingPrayer / alternativeConcludingPrayer /
 * responsory / intercessions / shortReading / hymn 확산 스크립트가
 * 동일한 primitives 를 재사용한다.
 *
 * ── 레이어 ──────────────────────────────────────────────────────────────
 * A. `extractSectionRegion` — 특정 book page 에서 헤딩~엔드마커 사이의
 *    본문 `bodyLines` (pdftotext -layout) 와 `stylePageBody` (pdfjs 스타일
 *    오버레이) 를 동시에 추출. 두 소스는 top-down 순서로 라인 대응.
 *
 * B. 블록 빌더 (영역별):
 *    - `buildProseBlocks`  — 단락 prose 기도문 (concluding/alternative,
 *      shortReading 기본형). 여러 시각적 라인을 한 단락으로 reflow.
 *    - `buildResponsoryBlocks` (장래) — V./R. 마커 분리.
 *    - `buildIntercessionsBlocks` (장래) — refrain/petition 구조.
 *
 * C. 수용 게이트 (`verifyPlainTextEquivalence`) — rich AST 를 plain text 로
 *    flatten 한 결과가 원본 문자열과 공백 정규화 기준 byte-equal 한지.
 *
 * ── 의존 ────────────────────────────────────────────────────────────────
 * Node stdlib 만. `scripts/parsers/` 내 다른 모듈은 직접 호출 가능.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { splitColumns } from './pdftotext-column-splitter.mjs'
import { bookPageToPhysical } from './book-page-mapper.mjs'
import { extractStyleOverlay } from './pdfjs-style-overlay.mjs'

// ── 공용 상수 / 유틸 ────────────────────────────────────────────────────

const RUBRIC_HEXES = new Set(['#ff0000'])

export function spanIsRubric(span) {
  return RUBRIC_HEXES.has(span.fill)
}

export function normaliseWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim()
}

export function flattenBlocksToPlainText(blocks, { includeRubricLines = false } = {}) {
  const parts = []
  for (const block of blocks) {
    if (block.kind === 'rubric-line') {
      if (includeRubricLines) parts.push(block.text)
      continue
    }
    if (block.kind === 'para') {
      parts.push((block.spans || []).map((sp) => sp.text ?? '').join(''))
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
    }
  }
  return parts.join('\n')
}

export function verifyPlainTextEquivalence(originalText, blocks) {
  const originalNorm = normaliseWhitespace(originalText)
  const astPlain = flattenBlocksToPlainText(
    blocks.filter((b) => b.kind !== 'rubric-line'),
  )
  const reconstructedNorm = normaliseWhitespace(astPlain)
  const pass = originalNorm === reconstructedNorm
  let firstDivergenceAt = -1
  if (!pass) {
    const limit = Math.min(originalNorm.length, reconstructedNorm.length)
    for (let i = 0; i < limit; i++) {
      if (originalNorm[i] !== reconstructedNorm[i]) {
        firstDivergenceAt = i
        break
      }
    }
    if (firstDivergenceAt < 0) firstDivergenceAt = limit
  }
  return { pass, originalNorm, reconstructedNorm, firstDivergenceAt }
}

// ── Layer A: PDF 페이지 추출 ────────────────────────────────────────────

/**
 * 단일 book page 에 대한 pdftotext -layout 덤프. 캐시 파일 경로를 받으면
 * 중간 산출물로 저장. 반환값은 전체 raw text.
 *
 * @param {object} params
 * @param {string} params.pdfPath
 * @param {number} params.firstPhysical
 * @param {number} params.lastPhysical
 * @param {string} [params.cacheOutPath]
 * @returns {string}
 */
export function runPdftotextLayout({ pdfPath, firstPhysical, lastPhysical, cacheOutPath }) {
  // Caller provides an explicit cache location or we let pdftotext write to
  // stdout. stdio-capturing keeps the pipeline hermetic for batch runs.
  if (cacheOutPath) {
    const outDir = dirname(cacheOutPath)
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
    execFileSync(
      'pdftotext',
      ['-layout', '-f', String(firstPhysical), '-l', String(lastPhysical), pdfPath, cacheOutPath],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    )
    return readFileSync(cacheOutPath, 'utf-8')
  }
  const buf = execFileSync(
    'pdftotext',
    ['-layout', '-f', String(firstPhysical), '-l', String(lastPhysical), pdfPath, '-'],
    { encoding: 'utf-8' },
  )
  return buf
}

/**
 * 지정된 book page 의 pdftotext 칼럼 스트림을 반환.
 */
export function loadBookPageStream({ pdfPath, bookPage, pdftotextCachePath }) {
  const { physical } = bookPageToPhysical(bookPage)
  const raw = runPdftotextLayout({
    pdfPath,
    firstPhysical: physical,
    lastPhysical: physical,
    cacheOutPath: pdftotextCachePath,
  })
  const streams = splitColumns(raw, [physical])
  const stream = streams.find((s) => s.bookPage === bookPage)
  if (!stream) {
    throw new Error(`[rich-builder] column stream for book ${bookPage} missing (physical=${physical})`)
  }
  return stream
}

/**
 * 지정된 book page 의 pdfjs 스타일 오버레이 페이지를 반환.
 */
export async function loadStylePage({ pdfPath, bookPage }) {
  const results = await extractStyleOverlay({ pdfPath, bookPages: [bookPage] })
  const page = results.find((r) => r.bookPage === bookPage)
  if (!page) {
    throw new Error(`[rich-builder] style overlay missing for book ${bookPage}`)
  }
  return page
}

// ── Layer A/B 결합: 섹션 영역 추출 ──────────────────────────────────────

function findLineIndex(lines, regex, flatten = (l) => l) {
  for (let i = 0; i < lines.length; i++) {
    const text = flatten(lines[i])
    if (text && regex.test(text)) return i
  }
  return -1
}

/**
 * pdftotext 스트림에서 섹션 본문 라인을 segmentation.
 */
function extractPdftextSection(bookPageStream, { sectionHeadingRegex, endOfBlockRegex }) {
  const lines = bookPageStream.lines
  const headingIdx = findLineIndex(lines, sectionHeadingRegex)
  if (headingIdx < 0) {
    throw new Error(
      `[rich-builder] section heading ${sectionHeadingRegex} not found in book ${bookPageStream.bookPage} (pdftotext)`,
    )
  }
  const headingLine = lines[headingIdx].replace(/\s+$/, '').trim()

  const bodyLines = []
  let sawBody = false
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (endOfBlockRegex && endOfBlockRegex.test(trimmed)) break
    if (trimmed === '') {
      if (sawBody) bodyLines.push('')
      continue
    }
    sawBody = true
    bodyLines.push(raw.replace(/\s+$/, ''))
  }
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
    bodyLines.pop()
  }
  if (bodyLines.length === 0) {
    throw new Error(
      `[rich-builder] no body lines after heading ${sectionHeadingRegex} on book ${bookPageStream.bookPage}`,
    )
  }
  return { headingLine, bodyLines }
}

/**
 * pdfjs styled-line 스트림에서 섹션 영역을 segmentation.
 */
function extractStyledSection(stylePage, { sectionHeadingRegex, endOfBlockRegex }) {
  const lines = stylePage.lines
  const flatten = (line) => line.spans.map((s) => s.text).join('').trim()
  const headingIdx = findLineIndex(lines, sectionHeadingRegex, flatten)
  if (headingIdx < 0) {
    throw new Error(
      `[rich-builder] section heading ${sectionHeadingRegex} not found in book ${stylePage.bookPage} (pdfjs)`,
    )
  }
  const heading = lines[headingIdx]
  const body = []
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const text = flatten(lines[i])
    if (!text) continue
    if (endOfBlockRegex && endOfBlockRegex.test(text)) break
    body.push(lines[i])
  }
  if (body.length === 0) {
    throw new Error(
      `[rich-builder] no styled body lines after heading ${sectionHeadingRegex} on book ${stylePage.bookPage}`,
    )
  }
  return { heading, body }
}

/**
 * book page + 섹션 마커를 받아서 pdftotext bodyLines + pdfjs stylePageBody 를
 * 동시에 추출. 두 레이어는 독립적으로 segmentation 되어 후속 블록 빌더가
 * 라인 대응 관계로 합성한다.
 *
 * @param {object} params
 * @param {string} params.pdfPath
 * @param {number} params.bookPage
 * @param {RegExp} params.sectionHeadingRegex
 * @param {RegExp} [params.endOfBlockRegex]
 * @param {string} [params.pdftotextCachePath]
 * @returns {Promise<{
 *   bookPage: number,
 *   headingLine: string,
 *   bodyLines: string[],
 *   stylePage: object,
 *   stylePageHeading: object,
 *   stylePageBody: object[],
 * }>}
 */
export async function extractSectionRegion({
  pdfPath,
  bookPage,
  sectionHeadingRegex,
  endOfBlockRegex,
  pdftotextCachePath,
}) {
  const stream = loadBookPageStream({ pdfPath, bookPage, pdftotextCachePath })
  const { headingLine, bodyLines } = extractPdftextSection(stream, {
    sectionHeadingRegex,
    endOfBlockRegex,
  })
  const stylePage = await loadStylePage({ pdfPath, bookPage })
  const { heading: stylePageHeading, body: stylePageBody } = extractStyledSection(stylePage, {
    sectionHeadingRegex,
    endOfBlockRegex,
  })
  return { bookPage, headingLine, bodyLines, stylePage, stylePageHeading, stylePageBody }
}

// ── Layer C: prose 블록 빌더 ────────────────────────────────────────────

/**
 * 다단락 prose 기도문용 블록 빌더 (concludingPrayer / alternative /
 * shortReading 기본형). pdftotext 의 시각적 wrap 라인을 단락 단위로
 * reflow 한 `para` block 과 단락 사이의 `divider` block 을 생성한다.
 *
 * 라인↔스타일 매칭: pdftotext 의 non-blank body line i 번째와 pdfjs 의
 * styleBody[i] 가 같은 라인을 가리킨다는 가정 (top-down 순서). 첫 10자
 * 일치로 검증하며 1-step fuzzy resync 으로 stray caption 을 건너뛴다.
 *
 * @param {object} params
 * @param {string[]} params.bodyLines
 * @param {object[]} params.stylePageBody
 * @returns {PrayerBlock[]}
 */
export function buildProseBlocks({ bodyLines, stylePageBody }) {
  const blocks = []
  const paragraphs = []
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
    if (styleIdx >= stylePageBody.length) {
      throw new Error(
        `[rich-builder] pdftotext body has more non-blank lines (${bodyLines.length}) than pdfjs styled body (${stylePageBody.length})`,
      )
    }
    const styled = stylePageBody[styleIdx]
    styleIdx++

    const styledText = styled.spans.map((s) => s.text).join('')
    const styledNorm = normaliseWhitespace(styledText).slice(0, 10)
    const bodyNorm = normaliseWhitespace(trimmed).slice(0, 10)
    if (styledNorm !== bodyNorm) {
      // One-step fuzzy resync for stray caption that pdftotext drops.
      if (
        styleIdx < stylePageBody.length &&
        normaliseWhitespace(stylePageBody[styleIdx].spans.map((s) => s.text).join('')).slice(0, 10) ===
          bodyNorm
      ) {
        styleIdx++
      }
    }

    current.lines.push(trimmed)
    current.styledLines.push(styled)
  }
  closeParagraph()

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

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === 'divider') {
    blocks.pop()
  }
  return blocks
}

// ── 영역별 고수준 API (concluding / shortReading) ──────────────────────

/**
 * prose 기도문(concluding / alternative / shortReading 기본형) 한 건을
 * book page + 섹션 마커로부터 rich AST 로 빌드한다.
 *
 * @param {object} params
 * @param {string} params.pdfPath
 * @param {number} params.bookPage
 * @param {RegExp} params.sectionHeadingRegex
 * @param {RegExp} [params.endOfBlockRegex]
 * @param {string} [params.originalText]       — 수용 게이트 비교용
 * @param {object} [params.source]             — 생성 AST 에 부착할 source 태그
 * @param {string} [params.pdftotextCachePath]
 * @returns {Promise<{
 *   blocks: PrayerBlock[],
 *   headingLine: string,
 *   bodyLines: string[],
 *   stylePage: object,
 *   pass: boolean | null,
 *   originalNorm?: string,
 *   reconstructedNorm?: string,
 *   firstDivergenceAt?: number,
 *   prayerText: { blocks: PrayerBlock[], page: number, source?: object },
 * }>}
 */
export async function buildProsePrayer({
  pdfPath,
  bookPage,
  sectionHeadingRegex,
  endOfBlockRegex,
  originalText,
  source,
  pdftotextCachePath,
}) {
  const region = await extractSectionRegion({
    pdfPath,
    bookPage,
    sectionHeadingRegex,
    endOfBlockRegex,
    pdftotextCachePath,
  })
  const blocks = buildProseBlocks({
    bodyLines: region.bodyLines,
    stylePageBody: region.stylePageBody,
  })

  let gate = { pass: null }
  if (typeof originalText === 'string' && originalText.length > 0) {
    gate = verifyPlainTextEquivalence(originalText, blocks)
  }

  const prayerText = {
    blocks,
    page: bookPage,
    ...(source ? { source } : {}),
  }
  return {
    blocks,
    headingLine: region.headingLine,
    bodyLines: region.bodyLines,
    stylePage: region.stylePage,
    ...gate,
    prayerText,
  }
}
