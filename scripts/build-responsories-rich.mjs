#!/usr/bin/env node
/**
 * build-responsories-rich.mjs — Stage 6 확산 T5a (seasonal propers).
 *
 * `src/data/loth/propers/{advent,christmas,easter,lent,ordinary-time}.json`
 * 의 모든 `responsory` 오브젝트(`{fullResponse, versicle, shortResponse,
 * page}`) 를 PrayerText rich AST 로 변환해
 * `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json`
 * 에 `responsoryRich` 필드로 merge.
 *
 * - rich-builder 의 `buildResponsory` 를 반복 호출. PDF 직접 접근 없이 소스
 *   3-필드만으로 5-block AST (V1/V2/R2/V3 Glory Be/R3) 생성.
 * - 수용 게이트는 core 3-block flatten 결과와 원본 3필드 join 을
 *   normaliseForGate 기준 byte-equal. 통과 시에만 overlay merge.
 * - 기존 overlay 의 다른 rich 필드(concludingPrayerRich 등) 는 보존.
 * - psalter (T5b) / compline ordinarium (T5c) 은 이 스크립트 범위 밖.
 *
 * 실행:
 *   node scripts/build-responsories-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildResponsory } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/seasonal')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/responsories-rich-failures.md')

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
      console.warn(`[responsory] skip missing season file: ${def.file}`)
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
          const resp = entry.responsory
          const id = `${def.season}/w${weekKey}/${dayKey}/${hour}`
          if (!resp || typeof resp !== 'object') continue
          const page = resp.page
          if (typeof page !== 'number') {
            skipped.push({ id, reason: 'no page' })
            continue
          }
          const fr = (resp.fullResponse ?? '').trim()
          const vr = (resp.versicle ?? '').trim()
          const sr = (resp.shortResponse ?? '').trim()
          if (!fr || !vr || !sr) {
            skipped.push({
              id,
              reason: `empty field(s) full=${fr ? 'Y' : 'N'} vers=${vr ? 'Y' : 'N'} short=${sr ? 'Y' : 'N'}`,
            })
            continue
          }
          try {
            process.stdout.write(
              `[responsory] ${id.padEnd(44)} p${String(page).padStart(4)} ... `,
            )
            const result = buildResponsory({
              responsory: resp,
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
              const merged = { ...existing, responsoryRich: result.prayerText }
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
  lines.push('# responsory Rich 확산 결과 (T5a seasonal propers)')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- 성공: ${successes.length}`)
  lines.push(`- 실패: ${failures.length}`)
  lines.push(`- 스킵: ${skipped.length}`)
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
  console.error('[responsory] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
