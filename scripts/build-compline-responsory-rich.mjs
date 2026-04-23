#!/usr/bin/env node
/**
 * build-compline-responsory-rich.mjs — Stage 6 확산 T5c (ordinarium compline).
 *
 * `src/data/loth/ordinarium/compline.json` 의 최상위 공통 `responsory`
 * (요일 무관 단일 엔트리) 를 PrayerText rich AST 로 변환해
 * `src/data/loth/prayers/commons/compline/{DAY}.rich.json` 7개 파일에
 * 동일 `responsoryRich` 필드로 배포.
 *
 * - 데이터상 compline responsory 는 요일 무관 공통 1건. 그러나 loader
 *   `loadComplineCommonsRichOverlay(day)` 가 요일 파라미터를 받는 형태로
 *   이미 선반영되어 있어 (shortReading/concludingPrayer 의 요일별 오버레이
 *   일관성), responsoryRich 는 7개 파일에 동일 내용으로 복제 배포.
 * - source: `{ kind: 'common', id: 'compline-responsory' }` — 요일 무관이므로
 *   id 는 요일 접미사 없이 단일.
 *
 * 실행:
 *   node scripts/build-compline-responsory-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildResponsory } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const COMPLINE_JSON = resolve(REPO_ROOT, 'src/data/loth/ordinarium/compline.json')
const OUT_ROOT = resolve(REPO_ROOT, 'src/data/loth/prayers/commons/compline')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/compline-responsory-rich-failures.md')

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

async function main() {
  const startedAt = Date.now()
  const data = JSON.parse(readFileSync(COMPLINE_JSON, 'utf-8'))
  const resp = data?.responsory
  if (!resp || typeof resp !== 'object') {
    throw new Error('[compline] no top-level responsory in compline.json')
  }
  const page = resp.page
  if (typeof page !== 'number') {
    throw new Error('[compline] responsory.page missing')
  }
  const fr = (resp.fullResponse ?? '').trim()
  const vr = (resp.versicle ?? '').trim()
  const sr = (resp.shortResponse ?? '').trim()
  if (!fr || !vr || !sr) {
    throw new Error(
      `[compline] empty field(s) full=${fr ? 'Y' : 'N'} vers=${vr ? 'Y' : 'N'} short=${sr ? 'Y' : 'N'}`,
    )
  }

  process.stdout.write(`[compline] build responsory p${page} ... `)
  const result = buildResponsory({
    responsory: resp,
    bookPage: page,
    source: {
      kind: 'common',
      id: 'compline-responsory',
    },
  })
  if (result.pass !== true) {
    console.log(`FAIL (div@${result.firstDivergenceAt})`)
    const lines = []
    lines.push('# compline responsory Rich 확산 결과 (T5c ordinarium)')
    lines.push('')
    lines.push(`- 생성: ${new Date().toISOString()}`)
    lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
    lines.push(`- 성공: 0`)
    lines.push(`- 실패: 1`)
    lines.push('')
    lines.push('## 실패')
    lines.push(`- first divergence at: ${result.firstDivergenceAt}`)
    lines.push(
      `- orig:  \`${(result.originalNorm ?? '').slice(Math.max(0, result.firstDivergenceAt - 30), result.firstDivergenceAt + 60)}\``,
    )
    lines.push(
      `- recon: \`${(result.reconstructedNorm ?? '').slice(Math.max(0, result.firstDivergenceAt - 30), result.firstDivergenceAt + 60)}\``,
    )
    mkdirSync(dirname(FAILURES_OUT), { recursive: true })
    writeFileSync(FAILURES_OUT, lines.join('\n'), 'utf-8')
    process.exitCode = 2
    return
  }
  console.log('PASS')

  // Distribute identical responsoryRich to 7 per-day catalog files.
  let writtenCount = 0
  for (const day of DAYS) {
    const overlayPath = resolve(OUT_ROOT, `${day}.rich.json`)
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
    writtenCount++
    console.log(`[compline] wrote ${day}.rich.json`)
  }

  const lines = []
  lines.push('# compline responsory Rich 확산 결과 (T5c ordinarium)')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- 성공: 1 확산, ${writtenCount} 요일 파일에 배포`)
  lines.push(`- 실패: 0`)
  lines.push('')
  mkdirSync(dirname(FAILURES_OUT), { recursive: true })
  writeFileSync(FAILURES_OUT, lines.join('\n'), 'utf-8')

  console.log('')
  console.log(`=== done ===`)
  console.log(`distributed 1 responsory → ${writtenCount} day files`)
  console.log(`report: ${FAILURES_OUT}`)
}

main().catch((err) => {
  console.error('[compline] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
