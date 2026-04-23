#!/usr/bin/env node
/**
 * build-hymns-rich.mjs — Stage 6 확산 (T8) 중앙 hymn 카탈로그 생성.
 *
 * `src/data/loth/ordinarium/hymns.json` 의 hymn text 를 PrayerText AST 로
 * 구조화해 `src/data/loth/prayers/hymns/{number}.rich.json` 에 저장.
 *
 * 현 단계는 **text-only rich** — hymn text 를 stanza/refrain 마커로
 * segmentation 해 `{ kind: 'stanza' }` blocks 로 묶는다. PDF 루브릭/이탤릭
 * 색 복원은 범위 밖 (후속 PDF-from-scratch 작업에서).
 *
 * Stanza 경계 감지:
 *  - 빈 줄 (text 에 embed 된 '\n\n')
 *  - 라인 시작 "N." (stanza 번호) — 현재 stanza 에 이미 content 있으면 break
 *  - 라인 시작 "Дахилт" / "Дахилт N:" / "Нийтээр:" — 같은 조건
 *
 * hymn text 가 빈 문자열인 entry (예: #93) 는 스킵하고 empty-text 리포트.
 *
 * seasonal overlay 의 `hymnRich` 필드 wiring 은 본 스크립트 범위 밖.
 * 중앙 카탈로그를 먼저 생성하고, loader 확장은 별도 커밋에서.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const HYMNS_JSON = resolve(REPO_ROOT, 'src/data/loth/ordinarium/hymns.json')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/hymns')
const REPORT_OUT = resolve(REPO_ROOT, 'scripts/out/hymns-rich-report.md')

const STANZA_START_RE = /^(?:\d{1,3}\.|Дахилт(?:\s+\d+)?\s*:|Нийтээр\s*:)/u

function buildHymnBlocks(text) {
  const blocks = []
  let current = { kind: 'stanza', lines: [] }

  const flushStanza = () => {
    if (current.lines.length > 0) {
      if (blocks.length > 0) blocks.push({ kind: 'divider' })
      blocks.push(current)
    }
    current = { kind: 'stanza', lines: [] }
  }

  const rawLines = text.split('\n')
  for (const raw of rawLines) {
    const line = raw.trim()
    if (line === '') {
      flushStanza()
      continue
    }
    if (STANZA_START_RE.test(line) && current.lines.length > 0) {
      flushStanza()
    }
    current.lines.push({
      spans: [{ kind: 'text', text: line }],
      indent: 0,
    })
  }
  flushStanza()

  while (blocks.length > 0 && blocks[blocks.length - 1].kind === 'divider') {
    blocks.pop()
  }
  return blocks
}

function main() {
  if (!existsSync(HYMNS_JSON)) {
    console.error(`[hymns-rich] not found: ${HYMNS_JSON}`)
    process.exit(1)
  }

  const hymns = JSON.parse(readFileSync(HYMNS_JSON, 'utf-8'))
  const numbers = Object.keys(hymns).sort((a, b) => Number(a) - Number(b))

  mkdirSync(OUT_ROOT, { recursive: true })

  const written = []
  const skippedEmpty = []
  const skippedNoPage = []

  for (const num of numbers) {
    const entry = hymns[num]
    const title = entry?.title ?? ''
    const text = typeof entry?.text === 'string' ? entry.text : ''
    const page = typeof entry?.page === 'number' ? entry.page : null

    if (text.trim() === '') {
      skippedEmpty.push({ num, title })
      continue
    }
    if (page == null) {
      // 이 시점에서 모든 hymn 이 page 를 가져야 정상 (T8 선행 patch 완료).
      skippedNoPage.push({ num, title })
      continue
    }

    const blocks = buildHymnBlocks(text)
    if (blocks.length === 0) {
      skippedEmpty.push({ num, title, reason: 'no blocks after parsing' })
      continue
    }

    const hymnRich = {
      blocks,
      page,
      source: {
        kind: 'common',
        id: `hymn-${num}`,
      },
    }
    const outPath = resolve(OUT_ROOT, `${num}.rich.json`)
    writeFileSync(outPath, JSON.stringify({ hymnRich }, null, 2) + '\n', 'utf-8')
    written.push({ num, title, page, blocks: blocks.length })
  }

  const lines = []
  lines.push('# hymn rich 확산 리포트')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 총 hymn entry: ${numbers.length}`)
  lines.push(`- rich 파일 생성: ${written.length}`)
  lines.push(`- 스킵 (빈 text): ${skippedEmpty.length}`)
  lines.push(`- 스킵 (page 없음): ${skippedNoPage.length}`)
  lines.push('')
  if (skippedEmpty.length > 0) {
    lines.push('## 빈 text 로 스킵된 hymn')
    lines.push('')
    for (const s of skippedEmpty) {
      lines.push(`- ${s.num}: ${s.title}${s.reason ? ` (${s.reason})` : ''}`)
    }
    lines.push('')
  }
  if (skippedNoPage.length > 0) {
    lines.push('## page 필드 없어 스킵된 hymn')
    lines.push('')
    for (const s of skippedNoPage) lines.push(`- ${s.num}: ${s.title}`)
    lines.push('')
  }
  // Block-count distribution
  const byBlocks = {}
  for (const w of written) byBlocks[w.blocks] = (byBlocks[w.blocks] || 0) + 1
  lines.push('## 블록 개수 분포')
  lines.push('')
  lines.push('| blocks | count |')
  lines.push('|---:|---:|')
  for (const [b, n] of Object.entries(byBlocks).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    lines.push(`| ${b} | ${n} |`)
  }
  lines.push('')
  mkdirSync(dirname(REPORT_OUT), { recursive: true })
  writeFileSync(REPORT_OUT, lines.join('\n'), 'utf-8')

  console.log(
    `[hymns-rich] written=${written.length} skipped_empty=${skippedEmpty.length} skipped_no_page=${skippedNoPage.length}`,
  )
  console.log(`[hymns-rich] output: ${OUT_ROOT}`)
  console.log(`[hymns-rich] report: ${REPORT_OUT}`)
}

main()
