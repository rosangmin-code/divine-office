#!/usr/bin/env node
/**
 * build-psalter-prayers-rich.mjs — Stage 6 확산 (FR-153h).
 *
 * `src/data/loth/psalter-texts.json` 의 각 ref 에 딸린 `psalmPrayer` 문자열을
 * PrayerText rich AST 로 변환해 기존 stanzasRich 카탈로그
 * `src/data/loth/prayers/commons/psalter-texts.rich.json` 의 같은 ref entry
 * 에 `psalmPrayerRich` 필드로 merge.
 *
 * - rich-builder 의 `buildProsePrayer` 를 반복 호출 (prose 단일 builder).
 * - psalmPrayerPage 가 없는 entry 는 skip. psalmPrayer 가 중복 텍스트
 *   (이미 직전에 성공한 것과 동일) 이어도 ref entry 별로 동일 rich 를 병합 —
 *   resolver 는 ref 단위로 조회하므로 중복 메모리 비용은 무시할만.
 * - 수용 게이트(normalised byte-equal) 통과 시에만 overlay merge. 실패는
 *   `scripts/out/psalter-prayers-rich-failures.md` 로 기록.
 * - 기존 overlay 파일의 다른 rich 필드 (stanzasRich) 는 보존 (spread-merge).
 *
 * 실행:
 *   node scripts/build-psalter-prayers-rich.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProsePrayer } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const SRC_IN = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const CATALOG_OUT = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/psalter-prayers-rich-failures.md')

// PDF 원문 상에서 psalmPrayer 섹션의 시작을 여는 머리글. psalter-fulltext
// 기준 "Дууллыг төгсгөх залбирал" 한 패턴만 확인됨.
const SECTION_HEADING = /Дууллыг\s+төгсгөх\s+залбирал/i

// End-of-block: psalmPrayer 본문이 끝나는 다음 블록 시작 패턴.
// 다음 시편/찬가 본문 헤더, 차기 시간과(Hour) 섹션 헤더, 전부 대문자
// Cyrillic 블록 헤더 등을 union 으로.
const END_OF_BLOCK_PATTERNS = [
  /^Антифон/,
  /^Ант\./,
  /^Дуулал\s+\d+/,
  /^Магтаал/,
  /^Дууллын\s+залбирал/,
  /^Дууллыг\s+төгсгөх\s+залбирал/,
  /^(?:Гуйлтын|Төгсгөлийн|Уншлага|Хариу)\s+(?:даатгал\s+)?залбирал/,
  // short reading 본문 시작 마커 — 대소문자 + tab boundary + optional
  // trailing `а` 누락 (task #35 pdftotext 컬럼 분할 artifact 및 p437 PDF glyph
  // 절단) 까지 커버. \b 는 ASCII-word 기준이라 Cyrillic 경계에서 오동작하므로
  // explicit `(?:[\s\t]|$)` boundary 사용. task #33/#35 에서 shortReading
  // HEADING 용으로 검증된 패턴을 END_OF_BLOCK 검출에도 동일 적용해 pdftotext
  // 본문(대문자 헤딩) 과 pdfjs styled(soft-small-cap 소문자) 양쪽 정지점을
  // 일치시킨다. 이 비대칭이 과거 FR-153h 잔여 22건의 alignment 실패
  // (`pdftotext body has more non-blank lines` 예외) 근본 원인.
  /^[Уу]ншлаг[аА]?(?:[\s\t]|$)/u,
  // pdftotext 컬럼 분할이 `Уншлага` 헤더의 **앞부분 문자를 잘라먹은** 케이스
  // (task #35 / task #38 p251 "лага", p371 "шлага"). 실제 헤더 line 은
  // `<truncated-prefix>\t<scripture-ref>` 구조로 출력되므로 뒤에 tab 경계를
  // 요구해 body 의 일반 Mongolian 단어와 충돌 방지. task #35 shortReading
  // 빌더는 pdfjs fallback 으로 해결했지만 psalmPrayer 빌더는 heading 이 정상
  // 검출된 뒤의 END_OF_BLOCK 단계에서 이 artifact 를 만나므로 여기서 직접
  // 매치해 body 조기 종료.
  /^(?:шлага|лага)\t/u,
  /^(?:\d+\s+(?:дугаар|дэх|дахь|дүгээр)\s+)?(?:Оройн|Өглөөний|Өдрийн|Шөнийн)\s+даатгал\s+залбирал/,
  /^(?:Мариагийн|Захариагийн|Шад)\s+магтаал/,
  // "Шад дуулал 2" 등 차기 canticle 블록 헤더 (магтаал 외에 дуулал 표기 혼용).
  /^(?:Мариагийн|Захариагийн|Шад)\s+дуулал/,
  // 시즌 분기 헤더 — "Ирэлтийн цаг улирал:", "Амилалтын улирал:",
  // "Дөчин хоногийн цаг улиралд ..." 등 격/격지 없이 "... улир..." 매칭.
  // 한두 단어의 season 이름 + 선택적 "цаг" + 핵심 "улир..." 어근.
  /^[А-ЯЁӨҮа-яёөү]+(?:\s+[а-яёөү]+){0,2}\s+улир[а-яёөү]*/u,
  /^[А-ЯЁӨҮ][А-ЯЁӨҮ\s]{3,}$/,
]
const END_OF_BLOCK = new RegExp(
  END_OF_BLOCK_PATTERNS.map((p) => `(?:${p.source})`).join('|'),
  'u',
)

function refSlug(ref) {
  return ref
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  if (!existsSync(PDF_PATH)) {
    console.error(`[psalmPrayer] PDF not found: ${PDF_PATH}`)
    process.exit(1)
  }
  if (!existsSync(SRC_IN)) {
    console.error(`[psalmPrayer] source not found: ${SRC_IN}`)
    process.exit(1)
  }

  const src = JSON.parse(readFileSync(SRC_IN, 'utf-8'))
  let catalog = {}
  if (existsSync(CATALOG_OUT)) {
    try {
      catalog = JSON.parse(readFileSync(CATALOG_OUT, 'utf-8')) ?? {}
    } catch (e) {
      console.error(`[psalmPrayer] failed to parse existing catalog: ${e.message}`)
      process.exit(1)
    }
  }

  const successes = []
  const failures = []
  const skipped = []
  const startedAt = Date.now()

  const refs = Object.keys(src)
  const eligible = refs.filter((ref) => {
    const entry = src[ref]
    return (
      entry &&
      typeof entry.psalmPrayer === 'string' &&
      entry.psalmPrayer.trim() !== '' &&
      typeof entry.psalmPrayerPage === 'number'
    )
  })

  console.log(
    `[psalmPrayer] refs total=${refs.length} eligible(psalmPrayer+page)=${eligible.length}`,
  )

  for (const ref of eligible) {
    const entry = src[ref]
    const prayer = entry.psalmPrayer
    const page = entry.psalmPrayerPage
    try {
      process.stdout.write(
        `[psalmPrayer] ${ref.padEnd(32)} p${String(page).padStart(4)} ... `,
      )
      const result = await buildProsePrayer({
        pdfPath: PDF_PATH,
        bookPage: page,
        sectionHeadingRegex: SECTION_HEADING,
        endOfBlockRegex: END_OF_BLOCK,
        originalText: prayer,
        source: {
          kind: 'common',
          id: `psalter-text-${refSlug(ref)}-psalm-prayer`,
        },
        // 일부 psalmPrayer 가 book page 경계를 넘어가는 경우 대비. 4 페이지까지 허용 —
        // 2단 조판의 psalter 에서 페이지 역진행 시 continuation 이 3+ 페이지 필요한
        // edge case 관찰됨.
        maxExtraPages: 4,
      })
      if (result.pass === true) {
        const existing = catalog[ref] ?? {}
        catalog[ref] = { ...existing, psalmPrayerRich: result.prayerText }
        successes.push({ ref, page })
        console.log('PASS')
      } else {
        failures.push({
          ref,
          page,
          reason: 'acceptance gate failed',
          firstDivergenceAt: result.firstDivergenceAt,
          originalSnippet: (result.originalNorm ?? '').slice(
            Math.max(0, (result.firstDivergenceAt ?? 0) - 30),
            (result.firstDivergenceAt ?? 0) + 80,
          ),
          reconstructedSnippet: (result.reconstructedNorm ?? '').slice(
            Math.max(0, (result.firstDivergenceAt ?? 0) - 30),
            (result.firstDivergenceAt ?? 0) + 80,
          ),
        })
        console.log(`FAIL (div@${result.firstDivergenceAt})`)
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err)
      failures.push({ ref, page, reason: 'exception', error: msg })
      console.log(`ERROR (${msg.slice(0, 80)})`)
    }
  }
  for (const ref of refs) {
    if (!eligible.includes(ref)) {
      const entry = src[ref]
      const reason =
        !entry?.psalmPrayer || String(entry.psalmPrayer).trim() === ''
          ? 'no psalmPrayer'
          : 'no psalmPrayerPage'
      skipped.push({ ref, reason })
    }
  }

  // 카탈로그 기록 — 부분 성공도 반영해 iterative dev 가능.
  mkdirSync(dirname(CATALOG_OUT), { recursive: true })
  writeFileSync(CATALOG_OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf-8')

  // 실패 리포트.
  const lines = []
  lines.push('# psalmPrayer Rich 확산 결과 (FR-153h)')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push(`- 소요: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  lines.push(`- refs total: ${refs.length}`)
  lines.push(`- eligible (psalmPrayer + page): ${eligible.length}`)
  lines.push(`- 성공: ${successes.length}`)
  lines.push(`- 실패: ${failures.length}`)
  lines.push(`- 스킵 (page/본문 없음): ${skipped.length}`)
  lines.push(`- 커버리지(성공/eligible): ${eligible.length ? ((successes.length / eligible.length) * 100).toFixed(1) : '0.0'}%`)
  lines.push('')
  if (failures.length > 0) {
    lines.push('## 실패 엔트리')
    lines.push('')
    for (const f of failures) {
      lines.push(`### ${f.ref} (page ${f.page})`)
      lines.push(`- reason: ${f.reason}`)
      if (f.error) lines.push(`- error: ${f.error}`)
      if (f.firstDivergenceAt !== undefined && f.firstDivergenceAt !== null) {
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
    for (const s of skipped) lines.push(`- ${s.ref}: ${s.reason}`)
    lines.push('')
  }
  mkdirSync(dirname(FAILURES_OUT), { recursive: true })
  writeFileSync(FAILURES_OUT, lines.join('\n'), 'utf-8')

  console.log('')
  console.log(`=== done ===`)
  console.log(
    `success=${successes.length} failure=${failures.length} skipped=${skipped.length} eligible=${eligible.length}`,
  )
  console.log(`catalog: ${CATALOG_OUT}`)
  console.log(`report : ${FAILURES_OUT}`)
  // 커버리지 기준 (85%) 미달 시 exit=2 로 CI 경고.
  const coverage = eligible.length ? successes.length / eligible.length : 0
  if (coverage < 0.85) process.exitCode = 2
}

main().catch((err) => {
  console.error('[psalmPrayer] fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
