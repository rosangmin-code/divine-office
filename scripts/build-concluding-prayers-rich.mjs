#!/usr/bin/env node
/**
 * build-concluding-prayers-rich.mjs — Stage 6 확산 (T3).
 *
 * `src/data/loth/propers/{ordinary-time,advent,christmas,lent,easter}.json`
 * 의 모든 concludingPrayer 문자열을 PrayerText rich AST 로 변환해
 * `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json`
 * 에 `concludingPrayerRich` 필드로 merge.
 *
 * - rich-builder 의 `buildProsePrayer` 를 반복 호출 (prose 단일 builder).
 * - concludingPrayerPage 가 없는 entry 는 스킵 (인벤토리 기준 100% 커버지만
 *   누락 대비).
 * - 수용 게이트(normalised byte-equal) 통과 시에만 overlay merge. 실패는
 *   `scripts/out/concluding-rich-failures.md` 로 큐잉.
 * - 기존 overlay 파일의 다른 rich 필드(예: pilot 의 `responsoryRich`) 는
 *   보존 (spread-merge).
 *
 * 실행:
 *   node scripts/build-concluding-prayers-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProsePrayer } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/seasonal')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/concluding-rich-failures.md')

const SEASONS = [
  { file: 'ordinary-time.json', season: 'ORDINARY_TIME', kebab: 'ordinary-time' },
  { file: 'advent.json', season: 'ADVENT', kebab: 'advent' },
  { file: 'christmas.json', season: 'CHRISTMAS', kebab: 'christmas' },
  { file: 'lent.json', season: 'LENT', kebab: 'lent' },
  { file: 'easter.json', season: 'EASTER', kebab: 'easter' },
]

const SECTION_HEADING = /Төгсгөлийн\s+даатгал\s+залбирал/i
// End-of-block heuristic: concludingPrayer 본문이 끝나는 지점으로 감지할
// 후속 섹션/라벨 패턴. pdftotext 에서 관찰된 실제 라벨 + 전부 대문자
// Cyrillic 헤더 (시즌/주차 밴드) 을 union 으로.
const END_OF_BLOCK_PATTERNS = [
  /^Эсвэл/,
  /^Сонголтот\s+залбирал/,
  /^(?:\d+\s+(?:дугаар|дэх|дахь|дүгээр)\s+)?(?:Оройн|Өглөөний)\s+даатгал\s+залбирал/,
  // "Ням гарагийн 2 дугаар Оройн даатгал залбирлын..." 같이 요일 전치사로
  // 시작하는 Subscript note (LENT w6/THU/vespers). 기도문 종료 후 다음
  // 블록으로 넘어가는 이정표로 사용.
  /^(?:Ням|Да|Мя|Лха|Пү|Ба|Бя)\s+гарагийн/,
  /^(?:Мариагийн|Захариагийн|Шад)\s+магтаал/,
  /^Дууллын\s+залбирал/,
  /^(?:Уншлага|Хариу\s+залбирал|Гуйлтын\s+залбирал)/,
  /^Төгсгөлийн\s+даатгал\s+залбирал/,
  /^[А-ЯЁӨҮ][А-ЯЁӨҮ\s]{3,}$/,
]
const END_OF_BLOCK = new RegExp(
  END_OF_BLOCK_PATTERNS.map((p) => `(?:${p.source})`).join('|'),
  'u',
)

// PDF 원문 오탈자 (스캔/조판 오류) 보정 — bookPage → [{from,to}].
// JSON 캐논 텍스트가 "올바른" 형태이고 PDF 에 철자/구두점 오류가 있는 경우
// rich AST 를 캐논과 일치시키기 위한 1:1 치환. 확산 범위가 concludingPrayer
// 뿐이라 여기 지역화. 새 오탈자가 발견되면 페이지번호와 함께 append.
const PDF_CORRECTIONS_BY_PAGE = {
  763: [{ from: 'нүдинй', to: 'нүдний' }],
  795: [{ from: 'хайрлаж.', to: 'хайрлаж,' }],
}

const HOURS = ['lauds', 'vespers', 'compline']

async function main() {
  if (!existsSync(PDF_PATH)) {
    console.error(`[concluding] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }

  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  for (const def of SEASONS) {
    const propersPath = resolve(PROPERS_ROOT, def.file)
    if (!existsSync(propersPath)) {
      console.warn(`[concluding] skip missing season file: ${def.file}`)
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
          const prayer = entry.concludingPrayer
          const page = entry.concludingPrayerPage
          const id = `${def.season}/w${weekKey}/${dayKey}/${hour}`
          if (typeof prayer !== 'string' || prayer.trim() === '') continue
          if (typeof page !== 'number') {
            skipped.push({ id, reason: 'no page' })
            continue
          }
          try {
            process.stdout.write(`[concluding] ${id.padEnd(48)} p${String(page).padStart(4)} ... `)
            const result = await buildProsePrayer({
              pdfPath: PDF_PATH,
              bookPage: page,
              sectionHeadingRegex: SECTION_HEADING,
              endOfBlockRegex: END_OF_BLOCK,
              originalText: prayer,
              source: {
                kind: 'seasonal',
                season: def.season,
                weekKey,
                dayKey,
                hour,
              },
              // 일부 concludingPrayer 가 book page 경계를 넘어 다음 페이지로
              // 흘러가는 경우 (솔렘니티 / 특정 주일) 대응. 2 페이지까지 허용.
              maxExtraPages: 2,
              pdfCorrections: PDF_CORRECTIONS_BY_PAGE[page] ?? [],
            })
            if (result.pass === true) {
              const overlayPath = resolve(
                OUT_ROOT,
                def.kebab,
                `w${weekKey}-${dayKey}-${hour}.rich.json`,
              )
              let existing = {}
              if (existsSync(overlayPath)) {
                try {
                  existing = JSON.parse(readFileSync(overlayPath, 'utf-8')) ?? {}
                } catch {
                  existing = {}
                }
              }
              const merged = { ...existing, concludingPrayerRich: result.prayerText }
              mkdirSync(dirname(overlayPath), { recursive: true })
              writeFileSync(overlayPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
              successes.push({ id, page })
              console.log('PASS')
            } else {
              failures.push({
                id,
                page,
                reason: 'acceptance gate failed',
                firstDivergenceAt: result.firstDivergenceAt,
                originalSnippet: (result.originalNorm ?? '').slice(0, 160),
                reconstructedSnippet: (result.reconstructedNorm ?? '').slice(0, 160),
              })
              console.log(`FAIL (div@${result.firstDivergenceAt})`)
            }
          } catch (err) {
            const msg = err && err.message ? err.message : String(err)
            failures.push({ id, page, reason: 'exception', error: msg })
            console.log(`ERROR (${msg.slice(0, 80)})`)
          }
        }
      }
    }
  }

  // Summary + failures report.
  const lines = []
  lines.push('# concludingPrayer Rich 확산 결과')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- 성공: ${successes.length}`)
  lines.push(`- 실패: ${failures.length}`)
  lines.push(`- 스킵 (page 없음): ${skipped.length}`)
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
    lines.push('## 스킵 엔트리 (page 필드 없음)')
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
  console.error('[concluding] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
