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

/**
 * Gate 전용 정규화: `normaliseWhitespace` 에 추가로 타이포그래픽 변이
 * (curly quote / en-dash / non-breaking space) 를 ASCII 원형으로 통일.
 * JSON 원본이 ASCII 표기를, PDF 가 typographic 표기를 쓰는 경우에도
 * 수용 게이트가 "동일 텍스트" 로 인정하게 한다. 리치 AST 자체는 PDF 원형
 * 을 보존하므로 렌더링 품질은 유지.
 */
export function normaliseForGate(s) {
  return normaliseWhitespace(s)
    .replace(/[“”]/g, '"') // double curly → straight
    .replace(/[‘’]/g, "'") // single curly → straight
    .replace(/–/g, '-') // en-dash → hyphen
    .replace(/—/g, '-') // em-dash → hyphen
    .replace(/ /g, ' ') // NBSP → space (post-whitespace normalise)
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
  const originalNorm = normaliseForGate(originalText)
  const astPlain = flattenBlocksToPlainText(
    blocks.filter((b) => b.kind !== 'rubric-line'),
  )
  const reconstructedNorm = normaliseForGate(astPlain)
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
 * Running-header 검출: 2-up 레이아웃에서 splitColumns 가 잘라낸 각 컬럼의
 * 최상단 라인은 보통 "{book-page} {season-name}" (좌) 또는
 * "{season-name} {book-page}" (우) 형태의 페이지 헤더. continuation
 * (멀티페이지 이어읽기) 에서 본문으로 오염되지 않도록 스킵한다.
 */
function isRunningHeaderLine(trimmed) {
  if (!trimmed) return false
  if (/^\d{1,4}(?:\s|\t)+[^\d]/.test(trimmed)) return true
  if (/[^\d\s](?:\s|\t)+\d{1,4}$/.test(trimmed)) return true
  return false
}

/**
 * 좌측 스트림에 새어 들어온 우측 칼럼 bleed 를 판별한다. splitColumns 가
 * 탭 섞인 라인 등 gutter 해석이 모호한 케이스에서 라인 전체를 한쪽으로
 * 몰아 넣는 일이 있다. 좌측 스트림에서 라인의 leading whitespace 가
 * cutColumn 의 대부분을 차지하면 원본 우측 칼럼에서 넘어온 것으로 본다.
 */
function isRightColumnBleed(raw, bookPageStream) {
  if (bookPageStream.column !== 'left') return false
  if (raw.trim() === '') return false
  const cut = bookPageStream.cutColumn
  if (!Number.isFinite(cut) || cut <= 0) return false
  const leadingSpaces = raw.length - raw.trimStart().length
  const threshold = Math.max(30, Math.floor(cut * 0.8))
  return leadingSpaces >= threshold
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
  let endOfBlockMatched = false
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    if (isRightColumnBleed(raw, bookPageStream)) continue
    const trimmed = raw.trim()
    if (endOfBlockRegex && endOfBlockRegex.test(trimmed)) {
      endOfBlockMatched = true
      break
    }
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
  return { headingLine, bodyLines, endOfBlockMatched }
}

/**
 * pdftotext 스트림의 처음부터(헤더 찾지 않고) body 를 이어읽는다.
 * continuation 페이지용. 최상단 running header 1 줄은 스킵.
 */
function extractPdftextContinuation(bookPageStream, { endOfBlockRegex }) {
  const lines = bookPageStream.lines
  const bodyLines = []
  let sawBody = false
  let endOfBlockMatched = false
  let consumedTopHeader = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (isRightColumnBleed(raw, bookPageStream)) continue
    const trimmed = raw.trim()
    if (!sawBody && !consumedTopHeader && trimmed !== '' && isRunningHeaderLine(trimmed)) {
      consumedTopHeader = true
      continue
    }
    if (trimmed !== '') consumedTopHeader = true
    if (endOfBlockRegex && endOfBlockRegex.test(trimmed)) {
      endOfBlockMatched = true
      break
    }
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
  return { bodyLines, endOfBlockMatched }
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
  let endOfBlockMatched = false
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const text = flatten(lines[i])
    if (!text) continue
    if (endOfBlockRegex && endOfBlockRegex.test(text)) {
      endOfBlockMatched = true
      break
    }
    body.push(lines[i])
  }
  return { heading, body, endOfBlockMatched }
}

/**
 * pdfjs styled-line 스트림의 처음부터 body 를 이어읽는다. continuation 용.
 * 최상단 running header 1 줄은 스킵.
 */
function extractStyledContinuation(stylePage, { endOfBlockRegex }) {
  const lines = stylePage.lines
  const flatten = (line) => line.spans.map((s) => s.text).join('').trim()
  const body = []
  let endOfBlockMatched = false
  let consumedTopHeader = false
  for (let i = 0; i < lines.length; i++) {
    const text = flatten(lines[i])
    if (!text) continue
    if (!consumedTopHeader && isRunningHeaderLine(text)) {
      consumedTopHeader = true
      continue
    }
    consumedTopHeader = true
    if (endOfBlockRegex && endOfBlockRegex.test(text)) {
      endOfBlockMatched = true
      break
    }
    body.push(lines[i])
  }
  return { body, endOfBlockMatched }
}

/**
 * book page + 섹션 마커를 받아서 pdftotext bodyLines + pdfjs stylePageBody 를
 * 동시에 추출. 두 레이어는 독립적으로 segmentation 되어 후속 블록 빌더가
 * 라인 대응 관계로 합성한다.
 *
 * `maxExtraPages > 0` 이면 endOfBlock 에 도달하지 못한 경우 다음 book page
 * 에서 continuation body 를 이어 읽는다. concludingPrayer 처럼 페이지
 * 상단에서 시작하는 섹션은 0 으로 충분하지만, alternativeConcludingPrayer
 * 처럼 페이지 하단에서 시작해 다음 페이지로 흘러가는 섹션에는 1~2 가
 * 필요하다.
 *
 * @param {object} params
 * @param {string} params.pdfPath
 * @param {number} params.bookPage
 * @param {RegExp} params.sectionHeadingRegex
 * @param {RegExp} [params.endOfBlockRegex]
 * @param {string} [params.pdftotextCachePath]
 * @param {number} [params.maxExtraPages=0]
 * @returns {Promise<{
 *   bookPage: number,
 *   headingLine: string,
 *   bodyLines: string[],
 *   stylePage: object,
 *   stylePageHeading: object,
 *   stylePageBody: object[],
 *   spannedPages: number[],
 * }>}
 */
export async function extractSectionRegion({
  pdfPath,
  bookPage,
  sectionHeadingRegex,
  endOfBlockRegex,
  pdftotextCachePath,
  maxExtraPages = 0,
}) {
  const stream = loadBookPageStream({ pdfPath, bookPage, pdftotextCachePath })
  const { headingLine, bodyLines, endOfBlockMatched: pdfEnd0 } = extractPdftextSection(stream, {
    sectionHeadingRegex,
    endOfBlockRegex,
  })
  const stylePage = await loadStylePage({ pdfPath, bookPage })
  const {
    heading: stylePageHeading,
    body: stylePageBody,
    endOfBlockMatched: styleEnd0,
  } = extractStyledSection(stylePage, { sectionHeadingRegex, endOfBlockRegex })

  let pdfBody = bodyLines.slice()
  let styleBody = stylePageBody.slice()
  let pdfEnd = pdfEnd0
  let styleEnd = styleEnd0
  const spannedPages = [bookPage]

  for (let step = 1; step <= maxExtraPages && (!pdfEnd || !styleEnd); step++) {
    const nextBookPage = bookPage + step
    spannedPages.push(nextBookPage)
    if (!pdfEnd) {
      const nextStream = loadBookPageStream({ pdfPath, bookPage: nextBookPage })
      const cont = extractPdftextContinuation(nextStream, { endOfBlockRegex })
      if (pdfBody.length > 0 && cont.bodyLines.length > 0) pdfBody.push('')
      pdfBody = pdfBody.concat(cont.bodyLines)
      pdfEnd = cont.endOfBlockMatched
    }
    if (!styleEnd) {
      const nextStylePage = await loadStylePage({ pdfPath, bookPage: nextBookPage })
      const cont = extractStyledContinuation(nextStylePage, { endOfBlockRegex })
      styleBody = styleBody.concat(cont.body)
      styleEnd = cont.endOfBlockMatched
    }
  }

  if (pdfBody.length === 0) {
    throw new Error(
      `[rich-builder] no body lines after heading ${sectionHeadingRegex} on book ${bookPage}`,
    )
  }
  if (styleBody.length === 0) {
    throw new Error(
      `[rich-builder] no styled body lines after heading ${sectionHeadingRegex} on book ${bookPage}`,
    )
  }

  return {
    bookPage,
    headingLine,
    bodyLines: pdfBody,
    stylePage,
    stylePageHeading,
    stylePageBody: styleBody,
    spannedPages,
  }
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

// ── Layer D: intercessions 블록 빌더 ────────────────────────────────────

/**
 * intercessions 전용 대시 정규화. 소스 JSON 은 em-dash `—` (U+2014) 을
 * petition↔response 구분자로 쓰지만 PDF 원본은 `-` (U+002D, 루브릭 빨강)
 * 을 쓴다. 수용 게이트에서 이 둘을 동치로 본다.
 */
function normaliseDashes(s) {
  return s.replace(/[–—]/g, '-')
}

/**
 * intercessions 원문(`string[]`) 을 refrain/petition 구조의 PrayerBlock[] 로
 * 변환한다.
 *
 * 파싱 규약:
 * - `items[0]` 은 "도입문 ... залбирцгаая: refrain" 형태. 마지막 `:` 에서
 *   분리해 도입문 para + refrain para(indent=1) 로 전개.
 * - `items[1..]` 은 두 모드 중 하나:
 *   - **responsive**: em-dash `—` 가 petition↔response 구분자. 각 항목은
 *     `stanza` 로, line 0=petition / line 1=`- response` (루브릭 `-` + 본문).
 *   - **simple**: em-dash 없음 (예: 성 금요일). petition 별로 `para` 블록.
 * - refrain 이 비어있으면 refrain para 를 생략 (비표준이지만 방어적).
 *
 * @param {object} params
 * @param {string[]} params.items
 * @returns {PrayerBlock[]}
 */
export function buildIntercessionsBlocks({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('[rich-builder] buildIntercessionsBlocks: empty items')
  }
  const blocks = []

  // [0] = 도입문 + refrain, 마지막 `:` 에서 분리.
  const first = items[0].trim()
  const colonIdx = first.lastIndexOf(':')
  let intro = first
  let refrain = ''
  if (colonIdx > 0 && colonIdx < first.length - 1) {
    intro = first.slice(0, colonIdx + 1).trim()
    refrain = first.slice(colonIdx + 1).trim()
  }

  blocks.push({
    kind: 'para',
    spans: [{ kind: 'text', text: intro }],
  })
  if (refrain) {
    blocks.push({
      kind: 'para',
      indent: 1,
      spans: [{ kind: 'text', text: refrain }],
    })
  }

  // [1..] petitions.
  for (let i = 1; i < items.length; i++) {
    const raw = items[i].trim()
    if (!raw) continue
    blocks.push({ kind: 'divider' })

    const dashIdx = raw.indexOf('—')
    if (dashIdx > 0) {
      const petition = raw.slice(0, dashIdx).trim()
      const response = raw.slice(dashIdx + 1).trim()
      blocks.push({
        kind: 'stanza',
        lines: [
          { indent: 0, spans: [{ kind: 'text', text: petition }] },
          {
            indent: 1,
            spans: [
              { kind: 'rubric', text: '- ' },
              { kind: 'text', text: response },
            ],
          },
        ],
      })
    } else {
      blocks.push({
        kind: 'para',
        spans: [{ kind: 'text', text: raw }],
      })
    }
  }

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === 'divider') {
    blocks.pop()
  }
  return blocks
}

/**
 * intercessions 전용 수용 게이트. 소스 배열을 공백으로 join 한 문자열과
 * AST flatten 결과를 (whitespace + dash) 정규화 기준으로 byte-equal 비교.
 */
export function verifyIntercessionsEquivalence(originalItems, blocks) {
  const originalJoined = originalItems.map((s) => s.trim()).filter(Boolean).join(' ')
  const astPlain = flattenBlocksToPlainText(
    blocks.filter((b) => b.kind !== 'rubric-line'),
  )
  const originalNorm = normaliseWhitespace(normaliseDashes(originalJoined))
  const reconstructedNorm = normaliseWhitespace(normaliseDashes(astPlain))
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

/**
 * intercessions 한 건을 소스 배열 + book page 로부터 rich AST 로 빌드한다.
 * PDF 를 직접 읽지 않고 소스 배열의 구조적 지식만 사용 (refrain/petition
 * 경계가 이미 한 레벨 구조화되어 있음). PDF 연결은 `page` 필드로만 유지.
 *
 * @param {object} params
 * @param {string[]} params.items
 * @param {number} params.bookPage
 * @param {object} [params.source]
 * @returns {{
 *   blocks: PrayerBlock[],
 *   pass: boolean,
 *   originalNorm: string,
 *   reconstructedNorm: string,
 *   firstDivergenceAt: number,
 *   prayerText: { blocks: PrayerBlock[], page: number, source?: object },
 * }}
 */
export function buildIntercessions({ items, bookPage, source }) {
  const blocks = buildIntercessionsBlocks({ items })
  const gate = verifyIntercessionsEquivalence(items, blocks)
  const prayerText = {
    blocks,
    page: bookPage,
    ...(source ? { source } : {}),
  }
  return {
    blocks,
    ...gate,
    prayerText,
  }
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
  maxExtraPages = 0,
  pdfCorrections = [],
}) {
  const applyCorrectionsToLines = (lines) => {
    if (!Array.isArray(pdfCorrections) || pdfCorrections.length === 0) return lines
    return lines.map((line) => {
      if (typeof line !== 'string') return line
      let out = line
      for (const { from, to } of pdfCorrections) {
        if (typeof from === 'string' && typeof to === 'string') {
          out = out.split(from).join(to)
        }
      }
      return out
    })
  }
  // Line-level 치환이 잡지 못하는 단락 경계 넘는 교정을 위해 블록 text
  // 위에서도 한 번 더 적용. 동일 치환이 idempotent 하므로 이중 적용 안전.
  const applyCorrections = (blocks) => {
    if (!Array.isArray(pdfCorrections) || pdfCorrections.length === 0) return
    for (const block of blocks) {
      if (block.kind !== 'para' || !Array.isArray(block.spans)) continue
      for (const span of block.spans) {
        if (typeof span.text !== 'string') continue
        for (const { from, to } of pdfCorrections) {
          if (typeof from === 'string' && typeof to === 'string') {
            span.text = span.text.split(from).join(to)
          }
        }
      }
    }
  }

  // Pass 1: single-page 추출. 대부분의 concludingPrayer 는 한 페이지에
  // 완결되므로 continuation 을 기본값으로 돌리면 579 처럼 PDF 가 이미
  // doxology 로 닫혔는데도 다음 페이지의 후속 섹션을 끌고 와 regression
  // 을 유발한다.
  let region = await extractSectionRegion({
    pdfPath,
    bookPage,
    sectionHeadingRegex,
    endOfBlockRegex,
    pdftotextCachePath,
    maxExtraPages: 0,
  })
  let blocks = buildProseBlocks({
    bodyLines: applyCorrectionsToLines(region.bodyLines),
    stylePageBody: region.stylePageBody,
  })
  applyCorrections(blocks)

  let gate = { pass: null }
  if (typeof originalText === 'string' && originalText.length > 0) {
    gate = verifyPlainTextEquivalence(originalText, blocks)
  }

  // Pass 2: single-page 가 캐논보다 현저히 짧으면 (page boundary spanning)
  // maxExtraPages 만큼 continuation 시도. 길이가 이미 충분한데 divergence
  // 가 발생한 경우는 다른 유형(오탈자/구두점 차이) 이므로 재추출하지 않는다.
  if (
    !gate.pass &&
    typeof originalText === 'string' &&
    originalText.length > 0 &&
    maxExtraPages > 0
  ) {
    const origLen = normaliseForGate(originalText).length
    const reconLen = gate.reconstructedNorm?.length ?? 0
    const shortBy = origLen - reconLen
    // 임계값: 본문 길이가 최소 50자(또는 원본의 10%) 이상 부족하면 continuation.
    const threshold = Math.max(50, Math.floor(origLen * 0.1))
    if (shortBy >= threshold) {
      region = await extractSectionRegion({
        pdfPath,
        bookPage,
        sectionHeadingRegex,
        endOfBlockRegex,
        pdftotextCachePath,
        maxExtraPages,
      })
      blocks = buildProseBlocks({
        bodyLines: applyCorrectionsToLines(region.bodyLines),
        stylePageBody: region.stylePageBody,
      })
      applyCorrections(blocks)
      gate = verifyPlainTextEquivalence(originalText, blocks)
    }
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
