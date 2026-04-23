#!/usr/bin/env node
/**
 * build-alt-concluding-prayers-rich.mjs — Stage 6 확산 (T4).
 *
 * `src/data/loth/propers/{ordinary-time,advent,christmas,lent,easter}.json`
 * 의 모든 alternativeConcludingPrayer 문자열을 PrayerText rich AST 로
 * 변환해 `src/data/loth/prayers/seasonal/{season-kebab}/w{weekKey}-{DAY}-{hour}.rich.json`
 * 에 `alternativeConcludingPrayerRich` 필드로 merge.
 *
 * prose builder (`buildProsePrayer`) 는 T3 concludingPrayer 와 동일하게
 * 재사용한다. 차이는 섹션 헤더뿐:
 *
 *   SECTION_HEADING = /Сонголтот\s+залбирал/i
 *
 * END_OF_BLOCK 은 T3 와 동일한 union 집합을 재사용 (alternative 섹션
 * 이후에 나타나는 헤더는 concluding 과 동일). 단 `^Сонголтот\s+залбирал`
 * 자체는 시작 헤더이므로 union 에서 제거.
 *
 * 실행:
 *   node scripts/build-alt-concluding-prayers-rich.mjs
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
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/alt-concluding-rich-failures.md')

const SEASONS = [
  { file: 'ordinary-time.json', season: 'ORDINARY_TIME', kebab: 'ordinary-time' },
  { file: 'advent.json', season: 'ADVENT', kebab: 'advent' },
  { file: 'christmas.json', season: 'CHRISTMAS', kebab: 'christmas' },
  { file: 'lent.json', season: 'LENT', kebab: 'lent' },
  { file: 'easter.json', season: 'EASTER', kebab: 'easter' },
]

const SECTION_HEADING = /Сонголтот\s+залбирал/i
// End-of-block heuristic: alternativeConcludingPrayer 본문이 끝나는 지점으로
// 감지할 후속 섹션/라벨 패턴. T3 concludingPrayer 빌더의 union 과 동일하되
// `Сонголтот` 은 본 섹션의 시작 헤더이므로 제외.
const END_OF_BLOCK_PATTERNS = [
  /^Эсвэл/,
  /^(?:\d+\s+(?:дугаар|дэх|дахь|дүгээр)\s+)?(?:Оройн|Өглөөний)\s+даатгал\s+залбирал/,
  /^(?:Ням|Да|Мя|Лха|Пү|Ба|Бя)\s+гарагийн/,
  /^(?:Мариагийн|Захариагийн|Шад)\s+магтаал/,
  /^Дууллын\s+залбирал/,
  /^(?:Уншлага|Хариу\s+залбирал|Гуйлтын\s+залбирал)/,
  /^Төгсгөлийн\s+даатгал\s+залбирал/,
  /^Сонголтот\s+залбирал/,
  // 후속 rubric/섹션 — concluding 쪽에서는 `Төгсгөлийн` 뒤가 대체로
  // `Сонголтот` 이지만 alt-concluding 뒤에는 다음 시간대의 헤더
  // (`Урих дуудлага`, `Дараах төгсгөлийн үгийг хэлнэ`) 나 특수 축일
  // rubric (`Талархал-магтаал...`) 이 이어진다. 각각의 leading token 을
  // 커버하는 최소 패턴으로 추가.
  /^Урих\s+дуудлага/,
  /^Шад\s+дуулал\b/,
  /^Талархал/,
  /^Дараах\s+төгсгөлийн/,
  /^[А-ЯЁӨҮ][А-ЯЁӨҮ\s]{3,}$/,
]
const END_OF_BLOCK = new RegExp(
  END_OF_BLOCK_PATTERNS.map((p) => `(?:${p.source})`).join('|'),
  'u',
)

// PDF 원문 오탈자 (스캔/조판 오류) 보정 — bookPage → [{from,to}].
// concluding 과 동일한 정책: rich AST 가 캐논(JSON) 텍스트와 일치하도록
// PDF 본문에 있는 문자 수준의 오류만 교정. 의미 변형은 없음.
const PDF_CORRECTIONS_BY_PAGE = {
  // w3/SUN/vespers: "жавхланг" → "жавхлангийг" (accusative suffix)
  755: [{ from: 'жавхланг далдлахгүй', to: 'жавхлангийг далдлахгүй' }],
  // w7/SUN/vespers: PDF 에 잉여 "тулд" 삽입.
  763: [{ from: 'сонсоход тулд бидний', to: 'сонсоход бидний' }],
  // w13/SUN/vespers: 공백이 period 로 대체.
  775: [{ from: 'бид.Таны', to: 'бид Таны' }],
  // wbaptism/SUN/lauds: 쉼표가 period 로 대체.
  617: [{ from: 'даган явж. дэлхийн', to: 'даган явж, дэлхийн' }],
  // LENT w1/SUN/lauds: 소문자 "а" → 대문자 "А" 로 오조판. "Амин" 이 한 줄
  // 끝에, "амьсгалыг" 이 다음 줄에 있어 line-level 치환에 유리하도록
  // context (", Амин" 줄 끝부분) 기준.
  620: [{ from: ', Амин', to: ', амин' }],
}

const HOURS = ['lauds', 'vespers', 'compline']

async function main() {
  if (!existsSync(PDF_PATH)) {
    console.error(`[alt-concluding] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }

  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  for (const def of SEASONS) {
    const propersPath = resolve(PROPERS_ROOT, def.file)
    if (!existsSync(propersPath)) {
      console.warn(`[alt-concluding] skip missing season file: ${def.file}`)
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
          const prayer = entry.alternativeConcludingPrayer
          const page = entry.alternativeConcludingPrayerPage
          const id = `${def.season}/w${weekKey}/${dayKey}/${hour}`
          if (typeof prayer !== 'string' || prayer.trim() === '') continue
          if (typeof page !== 'number') {
            skipped.push({ id, reason: 'no page' })
            continue
          }
          try {
            process.stdout.write(`[alt-concluding] ${id.padEnd(48)} p${String(page).padStart(4)} ... `)
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
              // alt-concluding 은 페이지 하단에서 시작해 다음 페이지로 이어지는
              // 케이스가 대부분이므로 continuation 을 2페이지까지 허용.
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
              const merged = { ...existing, alternativeConcludingPrayerRich: result.prayerText }
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

  const lines = []
  lines.push('# alternativeConcludingPrayer Rich 확산 결과')
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
  console.error('[alt-concluding] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
