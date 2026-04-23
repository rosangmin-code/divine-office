#!/usr/bin/env node
/**
 * build-psalter-responsories-rich.mjs — Stage 6 확산 T5b (psalter commons).
 *
 * `src/data/loth/psalter/week-{1..4}.json` 의 요일×시과 responsory 를
 * PrayerText rich AST 로 변환해 시즌 중립 카탈로그
 * `src/data/loth/prayers/commons/psalter/w{N}-{DAY}-{hour}.rich.json`
 * 에 `responsoryRich` 필드로 기록.
 *
 * - psalter 스토어의 스키마: `{ week: N, days: { SUN..SAT: { lauds, vespers } } }`.
 *   compline 은 ordinarium/compline.json 이 별도로 맡는다 (T5c).
 * - source: `{ kind: 'common', id: 'psalter-w{N}-{day-lower}-{hour}-responsory' }`.
 *   types.ts 의 PrayerSource union 은 'psalter' kind 가 없으므로 common 사용.
 * - loader 는 `loadPsalterCommonsRichOverlay(psalterWeek, day, hour)` 로 이미
 *   선반영 (src/lib/prayers/rich-overlay.ts). seasonal 보다 우선순위 낮음.
 *
 * 추가 후처리: pilot 편의상 seasonal 경로에 들어가 있던
 * `src/data/loth/prayers/seasonal/ordinary-time/w1-SUN-lauds.rich.json` 의
 * `responsoryRich` 필드를 제거 — 이번 카탈로그가 source of truth 가 되고
 * 두 군데 중복으로 resolver 가 꼬이는 것을 방지한다.
 *
 * 실행:
 *   node scripts/build-psalter-responsories-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildResponsory } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PSALTER_ROOT = resolve(REPO_ROOT, 'src/data/loth/psalter')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/commons/psalter')
const PILOT_SEASONAL_PATH = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/seasonal/ordinary-time/w1-SUN-lauds.rich.json',
)
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/psalter-responsories-rich-failures.md')

const WEEKS = [1, 2, 3, 4]
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const HOURS = ['lauds', 'vespers']

function dayLower(day) {
  return day.toLowerCase()
}

async function main() {
  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  for (const week of WEEKS) {
    const weekPath = resolve(PSALTER_ROOT, `week-${week}.json`)
    if (!existsSync(weekPath)) {
      console.warn(`[psalter] skip missing week file: week-${week}.json`)
      continue
    }
    const data = JSON.parse(readFileSync(weekPath, 'utf-8'))
    const days = data?.days ?? {}
    for (const day of DAYS) {
      const dayData = days[day]
      if (!dayData || typeof dayData !== 'object') continue
      for (const hour of HOURS) {
        const hourData = dayData[hour]
        if (!hourData || typeof hourData !== 'object') continue
        const resp = hourData.responsory
        const id = `psalter/w${week}/${day}/${hour}`
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
            `[psalter] ${id.padEnd(32)} p${String(page).padStart(4)} ... `,
          )
          const result = buildResponsory({
            responsory: resp,
            bookPage: page,
            source: {
              kind: 'common',
              id: `psalter-w${week}-${dayLower(day)}-${hour}-responsory`,
            },
          })
          if (result.pass === true) {
            const overlayPath = resolve(
              OUT_ROOT,
              `w${week}-${day}-${hour}.rich.json`,
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

  // Pilot 이관: seasonal/ordinary-time/w1-SUN-lauds.rich.json 의
  // responsoryRich 를 삭제. 카탈로그가 source of truth 가 된다.
  let pilotCleaned = false
  if (existsSync(PILOT_SEASONAL_PATH)) {
    try {
      const overlay = JSON.parse(readFileSync(PILOT_SEASONAL_PATH, 'utf-8')) ?? {}
      if (overlay && typeof overlay === 'object' && 'responsoryRich' in overlay) {
        delete overlay.responsoryRich
        writeFileSync(PILOT_SEASONAL_PATH, JSON.stringify(overlay, null, 2) + '\n', 'utf-8')
        pilotCleaned = true
        console.log(
          `[psalter] pilot cleanup: removed responsoryRich from ${PILOT_SEASONAL_PATH.replace(REPO_ROOT + '/', '')}`,
        )
      } else {
        console.log('[psalter] pilot cleanup: no responsoryRich field — nothing to do')
      }
    } catch (err) {
      console.error('[psalter] pilot cleanup failed:', err && err.message ? err.message : err)
    }
  }

  const lines = []
  lines.push('# psalter responsory Rich 확산 결과 (T5b commons)')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- 성공: ${successes.length}`)
  lines.push(`- 실패: ${failures.length}`)
  lines.push(`- 스킵: ${skipped.length}`)
  lines.push(`- pilot 이관 처리: ${pilotCleaned ? 'YES' : 'NO (no-op)'}`)
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
  console.error('[psalter] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
