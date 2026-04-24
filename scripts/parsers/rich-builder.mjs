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
 *    - `buildIntercessionsBlocks` — refrain/petition 구조.
 *    - `buildResponsoryBlocks` — V1 / V2 / R2 / V3 Glory Be / R3 5-block.
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
  // 좌측 헤더: `{page} {label...}` — psalter 의 `74 1 дүгээр долоо хоног`
  // 처럼 page 다음에 주차 숫자가 끼어드는 케이스도 포함하도록 optional
  // `(\s+\d+)?` 를 허용.
  if (/^\d{1,4}(?:\s+\d+)?(?:\s|\t)+[^\d]/.test(trimmed)) return true
  // 우측 헤더: `{label...} {page}` — 동일 이유로 page 직전에 추가 숫자가
  // 끼어드는 변형도 매치.
  if (/[^\d\s](?:\s|\t)+\d+(?:\s+\d+)?$/.test(trimmed)) return true
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

// ── Layer E: responsory 블록 빌더 ──────────────────────────────────────

// 몽골어 LOTH 전례 전반에 걸쳐 Glory Be (Doxology) 단축형 고정 문구.
// 6-part responsory 의 V3 위치에 항상 동일하게 삽입된다.
const RESPONSORY_GLORY_BE = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

/**
 * responsory 3-필드 소스 `{fullResponse, versicle, shortResponse}` 를
 * 5-block rich AST 로 전개한다. 6-part 전례 순서 중 R1 (fullResponse 첫
 * 반복) 은 convention 상 렌더러가 암묵 처리하므로 블록에서 생략, V1 / V2 /
 * R2 / V3 (Glory Be 고정) / R3 (= V1 반복) 의 5 para 만 출력한다. 기존
 * pilot `prayers/seasonal/ordinary-time/w1-SUN-lauds.rich.json` 의 스키마
 * 와 동일.
 *
 * @param {object} params
 * @param {string} params.fullResponse   — V1 / R1 / R3 본문
 * @param {string} params.versicle       — V2 본문
 * @param {string} params.shortResponse  — R2 본문
 * @returns {PrayerBlock[]}
 */
export function buildResponsoryBlocks({ fullResponse, versicle, shortResponse }) {
  const fr = (fullResponse ?? '').trim()
  const vr = (versicle ?? '').trim()
  const sr = (shortResponse ?? '').trim()
  if (!fr || !vr || !sr) {
    throw new Error(
      `[rich-builder] buildResponsoryBlocks: missing field(s) (full=${fr ? 'Y' : 'N'} vers=${vr ? 'Y' : 'N'} short=${sr ? 'Y' : 'N'})`,
    )
  }
  return [
    { kind: 'para', spans: [{ kind: 'response', text: fr }] },
    { kind: 'para', spans: [{ kind: 'versicle', text: vr }] },
    { kind: 'para', spans: [{ kind: 'response', text: sr }] },
    { kind: 'para', spans: [{ kind: 'text', text: RESPONSORY_GLORY_BE }] },
    { kind: 'para', spans: [{ kind: 'response', text: fr }] },
  ]
}

/**
 * responsory 전용 수용 게이트. 소스 3필드를 공백으로 join 한 문자열과
 * AST 의 core 3-block (V1 / V2 / R2) flatten 결과를 normaliseForGate 기준
 * byte-equal 비교한다. Glory Be (V3) 와 R3 은 convention 삽입이므로 게이트
 * 대상에서 제외.
 */
export function verifyResponsoryEquivalence(originalParts, blocks) {
  const originalJoined = [
    originalParts.fullResponse ?? '',
    originalParts.versicle ?? '',
    originalParts.shortResponse ?? '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
  const coreBlocks = blocks.slice(0, 3)
  const astPlain = flattenBlocksToPlainText(coreBlocks)
  const originalNorm = normaliseForGate(originalJoined)
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

/**
 * responsory 한 건을 소스 오브젝트 + book page 로부터 rich AST 로 빌드한다.
 * PDF 직접 접근 없이 소스 3-필드 구조만으로 AST 를 만든다 (buildIntercessions
 * 와 동일 계통).
 *
 * @param {object} params
 * @param {{ fullResponse: string, versicle: string, shortResponse: string }} params.responsory
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
export function buildResponsory({ responsory, bookPage, source }) {
  const blocks = buildResponsoryBlocks({
    fullResponse: responsory.fullResponse,
    versicle: responsory.versicle,
    shortResponse: responsory.shortResponse,
  })
  const gate = verifyResponsoryEquivalence(
    {
      fullResponse: responsory.fullResponse,
      versicle: responsory.versicle,
      shortResponse: responsory.shortResponse,
    },
    blocks,
  )
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

// ── shortReading 전용 헬퍼 ──────────────────────────────────────────────

/**
 * shortReading 전용 게이트 정규화. `normaliseForGate` (whitespace +
 * curly→ASCII + em→hyphen) 위에 추가로 dash 양쪽 공백 정규화를 한 번 더
 * 한다. JSON 캐논은 inline em-dash `—` 를 ` — ` 형태(앞뒤 공백 포함)로
 * 평탄화해 dialog 인용을 한 단락으로 표기하는 반면 PDF 는 줄머리 빨강
 * `-` 를 사용하므로 (예: `\n-Энэ`), `\s+→ ` 정규화 후에도 dash 뒤 공백
 * 유무가 어긋난다. `\s*-\s*` 를 ` - ` 로 통일해 동치 처리한다.
 */
export function normaliseForShortReadingGate(s) {
  return normaliseForGate(s)
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

function verifyShortReadingEquivalence(originalText, blocks) {
  const originalNorm = normaliseForShortReadingGate(originalText)
  const astPlain = flattenBlocksToPlainText(
    blocks.filter((b) => b.kind !== 'rubric-line'),
  )
  const reconstructedNorm = normaliseForShortReadingGate(astPlain)
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
 * shortReading 한 건을 book page 의 `Уншлага` 섹션에서 추출해 rich AST 로
 * 빌드한다. `buildProsePrayer` 와 다른 지점:
 *
 * 1. PDF 본문 첫 비공백 라인이 scripture ref (예: `Ром 13:11-14`) 이고,
 *    JSON 캐논의 `text` 필드에는 ref 가 포함되지 않으므로 pdftotext
 *    bodyLines 와 pdfjs stylePageBody 양쪽에서 첫 라인을 동시에 떼어낸다.
 *    두 소스가 1:1 라인 대응이라는 buildProseBlocks 가정을 유지하기 위해
 *    동기 제거가 필수.
 * 2. 게이트는 `verifyShortReadingEquivalence` (`-` 양쪽 공백 정규화 추가)
 *    를 사용해 inline em-dash dialog 인용 케이스를 동치 처리한다.
 *
 * @param {object} params
 * @param {string} params.pdfPath
 * @param {number} params.bookPage
 * @param {RegExp} [params.endOfBlockRegex]
 * @param {string} [params.originalText]
 * @param {object} [params.source]
 * @param {number} [params.maxExtraPages=1] — Уншлага 가 페이지 하단에서
 *   시작해 본문이 다음 페이지로 흘러가는 경우 (advent w1 WED p564→565 등)
 *   를 위해 기본 1 로 설정.
 * @param {Array<{from: string, to: string}>} [params.pdfCorrections]
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
// pdftotext-column-splitter 가 PDF 의 heading + 우측 정렬 ref (e.g.
// `Уншлага\t\t\t  Ром 13:11-14`) 를 한 라인으로 합쳐 내보낸다. 또한 pdfjs
// style overlay 는 small-cap 글리프를 lowercase `уншлага` 로 펼쳐 낸다.
// 두 소스 모두 매치되도록 케이스 비민감 + trailing 허용.
const SHORT_READING_HEADING = /^[Уу]ншлага(?:[\s\t]|$)/u
const SHORT_READING_END_OF_BLOCK = new RegExp(
  [
    // 가장 흔한 후속 섹션 — responsory.
    /^[Хх]ариу\s+залбирал/u,
    // Holy Week (LENT w6) 특수 마커: shortReading 끝, responsory 자리에
    // 별도 shad-dulal 지시문이 들어가는 케이스.
    /^[Хх]ариу\s+залбирлын\s+оронд/u,
    // 그 외 후속 섹션 헤더들 (시즌 propers/psalter commons 양쪽 출현).
    /^(?:Захариагийн|Мариагийн|Шад)\s+[Мм]агтаал/u,
    /^Шад\s+дуулал/u,
    /^[Гг]уйлтын\s+залбирал/u,
    /^Төгсгөлийн\s+даатгал\s+залбирал/u,
    /^(?:Уншлага|уншлага|Эсвэл|Сонголтот\s+залбирал)/u,
    /^(?:Ням|Да|Мя|Лха|Пү|Ба|Бя)\s+гарагийн/u,
    /^[А-ЯЁӨҮ][А-ЯЁӨҮ\s]{3,}$/u,
  ].map((p) => `(?:${p.source})`).join('|'),
  'u',
)

export async function buildShortReading({
  pdfPath,
  bookPage,
  endOfBlockRegex = SHORT_READING_END_OF_BLOCK,
  originalText,
  source,
  pdftotextCachePath,
  maxExtraPages = 1,
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

  // shortReading 은 캐논상 항상 단일 단락(prose). 그러나 PDF 일부 페이지는
  // 줄 간 시각적 spacing 을 pdftext 가 빈 라인으로 출력해 (e.g. p462)
  // buildProseBlocks 가 매 라인을 별도 단락으로 쪼갠다. 본문 단계에서 미리
  // 빈 라인을 제거해 항상 1 단락으로 reflow 되게 한다. pdfjs stylePageBody
  // 에는 빈 라인이 없으므로 그대로 둬도 1:1 라인 alignment 가 유지된다.
  const collapseBodyBlanks = (lines) =>
    lines.filter((l) => typeof l === 'string' && l.trim() !== '')

  // Pass 1: single-page 추출. PDF 의 heading 라인은 `Уншлага\t<ref>` 형태로
  // ref 가 같은 라인에 합쳐져 있으므로 (column splitter), bodyLines 의 첫
  // 라인은 이미 본문이다. 별도 ref-skip 처리가 필요하지 않다.
  let region = await extractSectionRegion({
    pdfPath,
    bookPage,
    sectionHeadingRegex: SHORT_READING_HEADING,
    endOfBlockRegex,
    pdftotextCachePath,
    maxExtraPages: 0,
  })
  let blocks = buildProseBlocks({
    bodyLines: applyCorrectionsToLines(collapseBodyBlanks(region.bodyLines)),
    stylePageBody: region.stylePageBody,
  })
  applyCorrections(blocks)

  let gate = { pass: null }
  if (typeof originalText === 'string' && originalText.length > 0) {
    gate = verifyShortReadingEquivalence(originalText, blocks)
  }

  // Pass 2: 본문이 캐논보다 현저히 짧으면 page-spanning 의심 → continuation.
  if (
    !gate.pass &&
    typeof originalText === 'string' &&
    originalText.length > 0 &&
    maxExtraPages > 0
  ) {
    const origLen = normaliseForShortReadingGate(originalText).length
    const reconLen = gate.reconstructedNorm?.length ?? 0
    const shortBy = origLen - reconLen
    // task #33 / ADVENT w1 MON lauds (p556): 이전 threshold `max(50, 10%)` 는
    // body tail 이 다음 book page 의 우측 컬럼으로 1~2줄 (~40 chars) 흘러가는
    // 케이스를 pass-2 continuation 에서 배제했다. `max(30, 7.5%)` 로 완화해
    // 작은 꼬리를 포착하면서도 "본문 내 다른 이유의 divergence" 는 여전히
    // 거른다 (pass 1 이 이미 PASS 한 122 entry 는 threshold 와 무관하게 pass-2
    // 에 진입하지 않으므로 회귀 불가).
    const threshold = Math.max(30, Math.floor(origLen * 0.075))
    if (shortBy >= threshold) {
      region = await extractSectionRegion({
        pdfPath,
        bookPage,
        sectionHeadingRegex: SHORT_READING_HEADING,
        endOfBlockRegex,
        pdftotextCachePath,
        maxExtraPages,
      })
      blocks = buildProseBlocks({
        bodyLines: applyCorrectionsToLines(collapseBodyBlanks(region.bodyLines)),
        stylePageBody: region.stylePageBody,
      })
      applyCorrections(blocks)
      gate = verifyShortReadingEquivalence(originalText, blocks)
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

// ── Layer F: psalter stanzas 블록 빌더 (FR-153f) ───────────────────────
//
// 시편 본문(`psalter-texts.json`) 의 `stanzas: string[][]` 구조를 `stanza`
// PrayerBlock 트리로 변환. **Source JSON only** 빌더 (PDF 재접근 없음).
//
// PDF 실측 결과 (2025 판 p58/60/64) — 시편 본문 내부 italic 0% / rubric 본문
// hit ≈ 0% (~3% 오검 샘플 모두 heading/title). 따라서 스타일 재현 이득이 낮고,
// 소스의 leading-space 를 indent 3-level 로 버킷팅 + 반복 라인을 refrain role
// 로 tagging 하는 것으로 충분. FR-153g (pilot 규격 재추출) 는 별건.
//
// ── indent 버킷 ─────────────────────────────────────────────────────────
// `0sp → 0` / `1-3sp → 1` / `≥4sp → 2`. main 은 0/2 만, pilot 은 0/2/3/5/6.
//
// ── refrain 검출 ────────────────────────────────────────────────────────
// 한 ref 내에서 trimmed-line (말미 구두점·대시 제거) 이 ≥3 회 반복되는
// 라인을 `role: 'refrain'` 으로 표기. Daniel 3 의 "Эзэнийг магтагтун" 류.
//
// ── 수용 게이트 2단계 ───────────────────────────────────────────────────
// (a) 텍스트 byte-equal: `normaliseForGate(source joined)` == rich flatten
// (b) 구조 동등성: stanza 수 + per-stanza line 수 + refrain 라인 수 일치

export function bucketStanzaIndent(leadingCount) {
  if (leadingCount <= 0) return 0
  if (leadingCount <= 3) return 1
  return 2
}

function stripStanzaLeadingSpaces(s) {
  return s.replace(/^ +/, '')
}

function refrainKey(line) {
  return stripStanzaLeadingSpaces(line).trim().replace(/[.,!–—-]+$/u, '')
}

export function detectRefrainLines(stanzas, { threshold = 3 } = {}) {
  const counts = new Map()
  for (const stanza of stanzas) {
    for (const line of stanza) {
      const key = refrainKey(line)
      if (!key) continue
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  const out = new Set()
  for (const [key, n] of counts) {
    if (n >= threshold) out.add(key)
  }
  return out
}

export function buildStanzasFromSource(stanzas, { refrains } = {}) {
  const refs = refrains || detectRefrainLines(stanzas)
  const blocks = []
  for (const stanza of stanzas) {
    const lines = stanza.map((raw) => {
      const leading = (raw.match(/^ */) || [''])[0].length
      const indent = bucketStanzaIndent(leading)
      const text = stripStanzaLeadingSpaces(raw)
      const out = { spans: [{ kind: 'text', text }], indent }
      if (refs.has(refrainKey(raw))) out.role = 'refrain'
      return out
    })
    blocks.push({ kind: 'stanza', lines })
  }
  return blocks
}

export function verifyStanzasTextEquivalence(stanzas, blocks) {
  const srcJoined = stanzas
    .flatMap((st) => st.map(stripStanzaLeadingSpaces))
    .join('\n')
  const richJoined = blocks
    .filter((b) => b.kind === 'stanza')
    .flatMap((b) =>
      (b.lines || []).map((ln) => (ln.spans || []).map((sp) => sp.text ?? '').join('')),
    )
    .join('\n')
  const a = normaliseForGate(srcJoined)
  const b = normaliseForGate(richJoined)
  return { pass: a === b, sourceLen: a.length, richLen: b.length }
}

export function verifyStanzasStructuralEquivalence(stanzas, blocks, refrains) {
  const stanzaBlocks = blocks.filter((b) => b.kind === 'stanza')
  const stanzaCountMatch = stanzas.length === stanzaBlocks.length
  const perStanza = []
  const maxLen = Math.max(stanzas.length, stanzaBlocks.length)
  for (let i = 0; i < maxLen; i++) {
    const src = stanzas[i] || []
    const blk = stanzaBlocks[i] || { lines: [] }
    perStanza.push({
      idx: i,
      source: src.length,
      rich: (blk.lines || []).length,
      ok: src.length === (blk.lines || []).length,
    })
  }
  const refs = refrains || detectRefrainLines(stanzas)
  const sourceRefrainCount = stanzas.flat().filter((ln) => refs.has(refrainKey(ln))).length
  const richRefrainCount = stanzaBlocks
    .flatMap((b) => b.lines || [])
    .filter((ln) => ln.role === 'refrain').length
  return {
    pass:
      stanzaCountMatch && perStanza.every((p) => p.ok) && sourceRefrainCount === richRefrainCount,
    stanzaCountMatch,
    perStanza,
    sourceRefrainCount,
    richRefrainCount,
  }
}

export function buildPsalterStanzasRich({ stanzas }) {
  if (!Array.isArray(stanzas)) {
    throw new Error('[rich-builder] buildPsalterStanzasRich: stanzas must be an array')
  }
  const refrains = detectRefrainLines(stanzas)
  const blocks = buildStanzasFromSource(stanzas, { refrains })
  const textGate = verifyStanzasTextEquivalence(stanzas, blocks)
  const structGate = verifyStanzasStructuralEquivalence(stanzas, blocks, refrains)
  return {
    blocks,
    refrains,
    textGate,
    structGate,
    pass: textGate.pass && structGate.pass,
  }
}
