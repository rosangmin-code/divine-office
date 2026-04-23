#!/usr/bin/env node
/**
 * build-short-readings-rich.mjs — Stage 6 확산 (T7).
 *
 * shortReading 의 3개 소스 (seasonal propers / psalter commons / compline
 * commons) 를 모두 PDF rich AST 로 변환해 overlay JSON 에 merge.
 *
 * 저장 경로:
 *  - propers/{season}.json → src/data/loth/prayers/seasonal/{kebab}/w{N}-{DAY}-{hour}.rich.json
 *  - psalter/week-{N}.json → src/data/loth/prayers/commons/psalter/w{N}-{DAY}-{hour}.rich.json
 *  - ordinarium/compline.json → src/data/loth/prayers/commons/compline/{DAY}.rich.json
 *
 * - rich-builder 의 `buildShortReading` 을 반복 호출. PDF 본문 첫 줄(scripture
 *   ref)은 자동 skip, 게이트는 dash 양쪽 공백 정규화로 inline em-dash dialog
 *   인용을 동치 처리.
 * - shortReading.page 가 없는 entry 는 스킵.
 * - 수용 게이트 통과 시에만 overlay merge. 실패는
 *   `scripts/out/short-reading-rich-failures.md` 로 큐잉.
 * - 기존 overlay 파일의 다른 rich 필드는 보존 (spread-merge).
 *
 * 실행:
 *   node scripts/build-short-readings-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildShortReading } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const PSALTER_ROOT = resolve(REPO_ROOT, 'src/data/loth/psalter')
const COMPLINE_PATH = resolve(REPO_ROOT, 'src/data/loth/ordinarium/compline.json')
const SEASONAL_OUT = resolve(REPO_ROOT, 'src/data/loth/prayers/seasonal')
const PSALTER_OUT = resolve(REPO_ROOT, 'src/data/loth/prayers/commons/psalter')
const COMPLINE_OUT = resolve(REPO_ROOT, 'src/data/loth/prayers/commons/compline')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/short-reading-rich-failures.md')

const SEASONS = [
  { file: 'advent.json', season: 'ADVENT', kebab: 'advent' },
  { file: 'christmas.json', season: 'CHRISTMAS', kebab: 'christmas' },
  { file: 'easter.json', season: 'EASTER', kebab: 'easter' },
  { file: 'lent.json', season: 'LENT', kebab: 'lent' },
  { file: 'ordinary-time.json', season: 'ORDINARY_TIME', kebab: 'ordinary-time' },
]

const HOURS = ['lauds', 'vespers', 'vespers2', 'compline']

// PDF 원문 스캔/렌더 오탈자 (페이지별). pdftotext + pdfjs 가 동일하게
// 잃는 구두점 뒤 공백 등 명백한 typo 만. 키는 데이터에 선언된 page 값
// (continuation 페이지의 typo 도 같은 키로 등록 — applyCorrectionsToLines
// 가 단일+continuation bodyLines 전체에 적용).
const PDF_CORRECTIONS_BY_PAGE = {
  // p553 (continuation p554): `байна.Юунд` — period 다음 공백 손실.
  553: [{ from: 'байна.Юунд', to: 'байна. Юунд' }],
  // p586 (continuation p587 도 무관): `Ааба,Аав` — comma 다음 공백 손실.
  586: [{ from: 'Ааба,Аав', to: 'Ааба, Аав' }],
  // p630 LENT w1 TUE lauds (Иоел 2:12-13): `тасчигтун”` — reading 내
  // 열린 인용 부호 없이 닫힌 curly quote(U+201D) 만 등장 (parsed_data/full_pdf.txt
  // line 21818). 고아 닫힌 인용 부호 → 마침표로 정정. JSON canon 은 `.` 로 보존.
  630: [{ from: 'тасчигтун”', to: 'тасчигтун.' }],
  // p639 LENT w1 THU lauds (Хаадын дээд 8:51-53а): continuation p640 에서
  // reading 이 `тусгаарласан шүү дээ,` 로 comma 종료 후 바로
  // `Хариу залбирал` 섹션 헤딩 (parsed_data/full_pdf.txt line 22175~22176).
  // 섹션 경계 직전 trailing comma 는 PDF typo — 마침표로 정정.
  639: [{ from: 'тусгаарласан шүү дээ,', to: 'тусгаарласан шүү дээ.' }],
}

function mergeOverlay(overlayPath, fields) {
  let existing = {}
  if (existsSync(overlayPath)) {
    try {
      existing = JSON.parse(readFileSync(overlayPath, 'utf-8')) ?? {}
    } catch {
      existing = {}
    }
  }
  const merged = { ...existing, ...fields }
  mkdirSync(dirname(overlayPath), { recursive: true })
  writeFileSync(overlayPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
}

async function processEntry({ id, sr, source, overlayPath, successes, failures, skipped }) {
  const page = sr?.page
  const text = sr?.text
  if (typeof page !== 'number') {
    skipped.push({ id, reason: 'no page' })
    return
  }
  if (typeof text !== 'string' || text.trim() === '') {
    skipped.push({ id, reason: 'no text' })
    return
  }
  try {
    process.stdout.write(`[shortReading] ${id.padEnd(56)} p${String(page).padStart(4)} ... `)
    const result = await buildShortReading({
      pdfPath: PDF_PATH,
      bookPage: page,
      originalText: text,
      source,
      pdfCorrections: PDF_CORRECTIONS_BY_PAGE[page] ?? [],
    })
    if (result.pass === true) {
      mergeOverlay(overlayPath, { shortReadingRich: result.prayerText })
      successes.push({ id, page })
      console.log('PASS')
    } else {
      failures.push({
        id,
        page,
        reason: 'acceptance gate failed',
        firstDivergenceAt: result.firstDivergenceAt,
        originalSnippet: (result.originalNorm ?? '').slice(
          Math.max(0, result.firstDivergenceAt - 30),
          result.firstDivergenceAt + 80,
        ),
        reconstructedSnippet: (result.reconstructedNorm ?? '').slice(
          Math.max(0, result.firstDivergenceAt - 30),
          result.firstDivergenceAt + 80,
        ),
      })
      console.log(`FAIL (div@${result.firstDivergenceAt})`)
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    failures.push({ id, page, reason: 'exception', error: msg })
    console.log(`ERROR (${msg.slice(0, 80)})`)
  }
}

async function main() {
  if (!existsSync(PDF_PATH)) {
    console.error(`[shortReading] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }

  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  // ── 1) Seasonal propers ────────────────────────────────────────────────
  for (const def of SEASONS) {
    const propersPath = resolve(PROPERS_ROOT, def.file)
    if (!existsSync(propersPath)) {
      console.warn(`[shortReading] skip missing season file: ${def.file}`)
      continue
    }
    const propers = JSON.parse(readFileSync(propersPath, 'utf-8'))
    const weeks = propers?.weeks ?? {}
    for (const weekKey of Object.keys(weeks)) {
      const week = weeks[weekKey] ?? {}
      for (const dayKey of Object.keys(week)) {
        const day = week[dayKey] ?? {}
        for (const hour of HOURS) {
          const entry = day[hour]
          if (!entry || typeof entry !== 'object') continue
          const sr = entry.shortReading
          if (!sr) continue
          const id = `${def.season}/w${weekKey}/${dayKey}/${hour}`
          const overlayPath = resolve(
            SEASONAL_OUT,
            def.kebab,
            `w${weekKey}-${dayKey}-${hour}.rich.json`,
          )
          await processEntry({
            id,
            sr,
            source: { kind: 'seasonal', season: def.season, weekKey, dayKey, hour },
            overlayPath,
            successes,
            failures,
            skipped,
          })
        }
      }
    }
  }

  // ── 2) Psalter commons (4 weeks × 7 days × hours) ──────────────────────
  for (const wk of ['1', '2', '3', '4']) {
    const psalterPath = resolve(PSALTER_ROOT, `week-${wk}.json`)
    if (!existsSync(psalterPath)) {
      console.warn(`[shortReading] skip missing psalter week: ${wk}`)
      continue
    }
    const j = JSON.parse(readFileSync(psalterPath, 'utf-8'))
    const days = j?.days ?? {}
    for (const dayKey of Object.keys(days)) {
      const day = days[dayKey] ?? {}
      for (const hour of ['lauds', 'vespers', 'vespers2']) {
        const entry = day[hour]
        if (!entry || typeof entry !== 'object') continue
        const sr = entry.shortReading
        if (!sr) continue
        const id = `PSALTER/w${wk}/${dayKey}/${hour}`
        const overlayPath = resolve(PSALTER_OUT, `w${wk}-${dayKey}-${hour}.rich.json`)
        await processEntry({
          id,
          sr,
          source: { kind: 'psalter-commons', psalterWeek: wk, dayKey, hour },
          overlayPath,
          successes,
          failures,
          skipped,
        })
      }
    }
  }

  // ── 3) Compline commons ───────────────────────────────────────────────
  if (existsSync(COMPLINE_PATH)) {
    const c = JSON.parse(readFileSync(COMPLINE_PATH, 'utf-8'))
    const days = c?.days ?? {}
    for (const dayKey of Object.keys(days)) {
      const sr = days[dayKey]?.shortReading
      if (!sr) continue
      const id = `COMPLINE/${dayKey}`
      const overlayPath = resolve(COMPLINE_OUT, `${dayKey}.rich.json`)
      await processEntry({
        id,
        sr,
        source: { kind: 'compline-commons', dayKey },
        overlayPath,
        successes,
        failures,
        skipped,
      })
    }
  }

  // ── Report ────────────────────────────────────────────────────────────
  const lines = []
  lines.push('# shortReading Rich 확산 결과')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- 성공: ${successes.length}`)
  lines.push(`- 실패: ${failures.length}`)
  lines.push(`- 스킵 (page/text 없음): ${skipped.length}`)
  lines.push('')
  if (failures.length > 0) {
    lines.push('## 실패 엔트리')
    lines.push('')
    for (const f of failures) {
      lines.push(`### ${f.id} (page ${f.page})`)
      lines.push(`- reason: ${f.reason}`)
      if (f.error) lines.push(`- error: ${f.error}`)
      if (f.firstDivergenceAt !== undefined) {
        lines.push(`- first divergence at: ${f.firstDivergenceAt}`)
        lines.push(`- orig:  \`${f.originalSnippet}\``)
        lines.push(`- recon: \`${f.reconstructedSnippet}\``)
      }
      lines.push('')
    }
  }
  if (skipped.length > 0) {
    lines.push('## 스킵 엔트리')
    lines.push('')
    for (const s of skipped) lines.push(`- ${s.id}: ${s.reason}`)
    lines.push('')
  }
  mkdirSync(dirname(FAILURES_OUT), { recursive: true })
  writeFileSync(FAILURES_OUT, lines.join('\n'), 'utf-8')

  console.log('')
  console.log(`=== done ===`)
  console.log(`success=${successes.length} failure=${failures.length} skipped=${skipped.length}`)
  console.log(`report: ${FAILURES_OUT}`)
  if (failures.length > 0) process.exitCode = 2
}

main().catch((err) => {
  console.error('[shortReading] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
