#!/usr/bin/env node
/**
 * build-intercessions-rich.mjs — Stage 6 확산 (T6).
 *
 * `src/data/loth/propers/{ordinary-time,advent,christmas,lent,easter}.json`
 * 의 모든 `intercessions` 문자열 배열을 PrayerText rich AST 로 변환해
 * `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json`
 * 에 `intercessionsRich` 필드로 merge.
 *
 * - rich-builder 의 `buildIntercessions` 를 반복 호출. PDF 직접 접근 없이
 *   소스 배열 구조(intro:refrain, petition — response) 만으로 AST 를 생성.
 * - 수용 게이트는 (whitespace + em-dash↔hyphen) 정규화 기준 byte-equal.
 *   통과 시에만 overlay merge.
 * - 기존 overlay 의 다른 rich 필드(concludingPrayerRich 등) 는 보존.
 *
 * 실행:
 *   node scripts/build-intercessions-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIntercessions } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/seasonal')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/intercessions-rich-failures.md')

const SEASONS = [
  { file: 'ordinary-time.json', season: 'ORDINARY_TIME', kebab: 'ordinary-time' },
  { file: 'advent.json', season: 'ADVENT', kebab: 'advent' },
  { file: 'christmas.json', season: 'CHRISTMAS', kebab: 'christmas' },
  { file: 'lent.json', season: 'LENT', kebab: 'lent' },
  { file: 'easter.json', season: 'EASTER', kebab: 'easter' },
]

const HOURS = ['lauds', 'vespers', 'compline']

async function main() {
  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  for (const def of SEASONS) {
    const propersPath = resolve(PROPERS_ROOT, def.file)
    if (!existsSync(propersPath)) {
      console.warn(`[intercessions] skip missing season file: ${def.file}`)
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
          const items = entry.intercessions
          const page = entry.intercessionsPage
          const id = `${def.season}/w${weekKey}/${dayKey}/${hour}`
          if (!Array.isArray(items) || items.length === 0) continue
          if (typeof page !== 'number') {
            skipped.push({ id, reason: 'no page' })
            continue
          }
          try {
            process.stdout.write(`[intercessions] ${id.padEnd(48)} p${String(page).padStart(4)} n=${String(items.length).padStart(2)} ... `)
            const result = buildIntercessions({
              items,
              bookPage: page,
              source: {
                kind: 'seasonal',
                season: def.season,
                weekKey,
                dayKey,
                hour,
              },
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
              const merged = { ...existing, intercessionsRich: result.prayerText }
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
                originalSnippet: (result.originalNorm ?? '').slice(
                  Math.max(0, result.firstDivergenceAt - 30),
                  result.firstDivergenceAt + 60,
                ),
                reconstructedSnippet: (result.reconstructedNorm ?? '').slice(
                  Math.max(0, result.firstDivergenceAt - 30),
                  result.firstDivergenceAt + 60,
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
      }
    }
  }

  const lines = []
  lines.push('# intercessions Rich 확산 결과')
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
  console.error('[intercessions] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
