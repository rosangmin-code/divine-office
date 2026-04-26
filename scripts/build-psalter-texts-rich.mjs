/**
 * build-psalter-texts-rich.mjs — FR-153f 137 refs 확산 (T9 step 4).
 *
 * 입력: `src/data/loth/psalter-texts.json` (137 refs).
 *
 * 빌더 소스: **3A (Source JSON only)**. `rich-builder.mjs` Layer F
 * (`buildPsalterStanzasRich`) 재사용.
 *
 * 조건 (a) fail-fast: 수용 게이트가 단 1건이라도 FAIL 이면 **카탈로그 미생성**
 * + `psalter-rich-failures.md` 에 per-ref 진단 기록. 모든 refs 가 PASS 해야만
 * 카탈로그를 기록. 수기 조사 후 재실행.
 *
 * 조건 (b) stanza 분포 리포트: `psalter-rich-report.md` — refs 별 stanza 수
 * min/median/max · refrain 검출 요약.
 *
 * 조건 (c) pilot 3건 일관성: 이 빌더는 main source 만 처리. pilot 재추출본
 * (`psalter-texts.pilot.json`) 은 `.pilot.rich.json` 에 별도 보관되고 FR-153g
 * 의 입력으로 사용됨. 카탈로그에 포함 X.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPsalterStanzasRich } from './parsers/rich-builder.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const SRC_IN = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const DENYLIST_IN = resolve(REPO_ROOT, 'src/data/loth/refrain-denylist.json')
const CATALOG_OUT = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-texts.rich.json',
)
const REPORT_OUT = resolve(REPO_ROOT, 'scripts/out/psalter-rich-report.md')
const FAILURES_OUT = resolve(REPO_ROOT, 'scripts/out/psalter-rich-failures.md')

function loadRefrainDenylist() {
  // FR-160-A1: src/data/loth/refrain-denylist.json 의 entries[].ref 만 추출해 Set 으로 반환.
  // 파일 부재 시에만 빈 Set 반환 (pre-FR-160 동작). JSON parse/스키마 오류는 빌드를
  // 중단시켜야 함 — 같은 빌더가 카탈로그 parse 실패를 fail-hard 로 다루는 것과 일관.
  // (silent-fail 시 알려진 false-positive override 가 사라지고 잘못된 카탈로그가 ship 됨.)
  if (!existsSync(DENYLIST_IN)) return new Set()
  let raw
  try {
    raw = JSON.parse(readFileSync(DENYLIST_IN, 'utf8'))
  } catch (e) {
    console.error(`[build] failed to parse refrain-denylist: ${e.message}`)
    process.exit(1)
  }
  if (!Array.isArray(raw?.entries)) {
    console.error(
      `[build] refrain-denylist: missing or invalid 'entries' array (expected {entries: [{ref, ...}]})`,
    )
    process.exit(1)
  }
  const refs = new Set()
  for (const entry of raw.entries) {
    if (entry && typeof entry.ref === 'string') {
      const ref = entry.ref.trim()
      if (ref.length > 0) refs.add(ref)
    }
  }
  return refs
}

function median(nums) {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function main() {
  const srcRaw = await readFile(SRC_IN, 'utf8')
  const src = JSON.parse(srcRaw)
  const refs = Object.keys(src)
  const refrainDenylist = loadRefrainDenylist()

  // 기존 카탈로그 read-modify-write — 다른 빌더(예: psalmPrayer) 가 이미 채워둔
  // 필드(`psalmPrayerRich` 등) 를 보존하기 위해 from-scratch overwrite 대신
  // per-ref spread-merge 로 stanzasRich 만 갱신한다.
  let catalog = {}
  if (existsSync(CATALOG_OUT)) {
    try {
      catalog = JSON.parse(readFileSync(CATALOG_OUT, 'utf8')) ?? {}
    } catch (e) {
      console.error(`[build] failed to parse existing catalog: ${e.message}`)
      process.exit(1)
    }
  }
  const perRef = []
  const failures = []

  for (const ref of refs) {
    const entry = src[ref]
    if (!entry || !Array.isArray(entry.stanzas)) {
      failures.push({
        ref,
        reason: 'missing stanzas array',
        stanzasType: typeof entry?.stanzas,
      })
      continue
    }
    let result
    try {
      result = buildPsalterStanzasRich({
        stanzas: entry.stanzas,
        ref,
        denylist: refrainDenylist,
      })
    } catch (e) {
      failures.push({ ref, reason: `builder threw: ${e.message}` })
      continue
    }
    const stat = {
      ref,
      stanzaCount: entry.stanzas.length,
      lineCount: entry.stanzas.reduce((a, s) => a + s.length, 0),
      refrainKeyCount: result.refrains.size,
      refrainLineCount: result.structGate.sourceRefrainCount,
      pass: result.pass,
    }
    perRef.push(stat)

    if (!result.pass) {
      failures.push({
        ref,
        reason: 'gate failed',
        textGate: result.textGate,
        structGate: {
          stanzaCountMatch: result.structGate.stanzaCountMatch,
          sourceRefrainCount: result.structGate.sourceRefrainCount,
          richRefrainCount: result.structGate.richRefrainCount,
          mismatchedStanzas: result.structGate.perStanza.filter((p) => !p.ok),
        },
      })
      continue
    }
    const existing = catalog[ref] ?? {}
    catalog[ref] = {
      ...existing,
      stanzasRich: {
        blocks: result.blocks,
        source: { kind: 'common', id: `psalter-text-${ref}` },
      },
    }
  }

  // ── 실패 리포트 우선 작성 (카탈로그 쓰기 전) ───────────────────────
  if (failures.length > 0) {
    const md = []
    md.push('# psalter stanzasRich — 수용 게이트 실패 (FR-153f)')
    md.push('')
    md.push(`- 입력: \`${SRC_IN.replace(REPO_ROOT + '/', '')}\` (${refs.length} refs)`)
    md.push(`- 실패: **${failures.length}건** — 카탈로그 미생성 (자동 적용 차단)`)
    md.push(`- 수기 조사 후 소스 데이터 또는 빌더 수정 → 재실행`)
    md.push('')
    md.push('## per-ref 실패 진단')
    for (const f of failures) {
      md.push('')
      md.push(`### \`${f.ref}\``)
      md.push(`- reason: ${f.reason}`)
      if (f.textGate) {
        md.push(
          `- gate (a) 텍스트: ${f.textGate.pass ? 'PASS' : 'FAIL'} (src=${f.textGate.sourceLen}, rich=${f.textGate.richLen})`,
        )
      }
      if (f.structGate) {
        md.push(
          `- gate (b) 구조: stanza-match=${f.structGate.stanzaCountMatch} refrain src/rich=${f.structGate.sourceRefrainCount}/${f.structGate.richRefrainCount}`,
        )
        if (f.structGate.mismatchedStanzas?.length) {
          md.push(`  - stanza line-count 불일치:`)
          for (const p of f.structGate.mismatchedStanzas) {
            md.push(`    - stanza[${p.idx}]: src=${p.source}, rich=${p.rich}`)
          }
        }
      }
    }
    await writeFile(FAILURES_OUT, md.join('\n') + '\n', 'utf8')
    console.error(`[build] FAIL ${failures.length}/${refs.length} refs — 카탈로그 미생성`)
    console.error(`[build] 실패 리포트: ${FAILURES_OUT.replace(REPO_ROOT + '/', '')}`)
    process.exit(1)
  }

  // ── 전원 PASS: 카탈로그 + 분포 리포트 ──────────────────────────────
  await writeFile(CATALOG_OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  const stanzaCounts = perRef.map((r) => r.stanzaCount)
  const lineCounts = perRef.map((r) => r.lineCount)
  const refrainRefs = perRef.filter((r) => r.refrainKeyCount > 0)

  const md = []
  md.push('# psalter stanzasRich 확산 리포트 (FR-153f)')
  md.push('')
  md.push(`- 입력: \`${SRC_IN.replace(REPO_ROOT + '/', '')}\` (${refs.length} refs)`)
  md.push(`- 출력 카탈로그: \`${CATALOG_OUT.replace(REPO_ROOT + '/', '')}\``)
  md.push(`- 종합 gate: ✅ **${perRef.length}/${refs.length} PASS**`)
  md.push(`- 빌더: Layer F \`buildPsalterStanzasRich\` (3A Source JSON only)`)
  md.push('')
  md.push('## stanza 수 분포')
  md.push('')
  md.push(
    `- min = ${Math.min(...stanzaCounts)}, median = ${median(stanzaCounts)}, max = ${Math.max(...stanzaCounts)}`,
  )
  md.push(
    `- 1-stanza refs: ${perRef.filter((r) => r.stanzaCount === 1).length}건 (Ps 149 류 flat)`,
  )
  const histogram = new Map()
  for (const n of stanzaCounts) histogram.set(n, (histogram.get(n) || 0) + 1)
  const hist = [...histogram.entries()].sort((a, b) => a[0] - b[0])
  md.push('')
  md.push('| stanza 수 | refs |')
  md.push('|---:|---:|')
  for (const [n, count] of hist) md.push(`| ${n} | ${count} |`)
  md.push('')
  md.push('## 라인 수 분포')
  md.push('')
  md.push(
    `- min = ${Math.min(...lineCounts)}, median = ${median(lineCounts)}, max = ${Math.max(...lineCounts)}, sum = ${lineCounts.reduce((a, b) => a + b, 0)}`,
  )
  md.push('')
  md.push('## refrain 검출 요약')
  md.push('')
  md.push(`- refrain 보유 refs: **${refrainRefs.length}** / ${refs.length}`)
  if (refrainRefs.length > 0) {
    md.push('')
    md.push('| ref | refrain keys | refrain 라인 |')
    md.push('|:---|---:|---:|')
    refrainRefs.sort((a, b) => b.refrainLineCount - a.refrainLineCount)
    for (const r of refrainRefs) {
      md.push(`| \`${r.ref}\` | ${r.refrainKeyCount} | ${r.refrainLineCount} |`)
    }
  }
  md.push('')
  md.push('## FR-153g 재추출 우선순위 힌트')
  md.push('')
  md.push(
    'pilot (`psalter-texts.pilot.json`) 대비 main 이 stanza 분할이 coarse 한 refs. pilot 에서 Ps 63 은 main 2 → pilot 8, Dan 3 은 main 15 → pilot 19 로 세분화됨. FR-153g 은 다음 기준으로 우선순위:',
  )
  md.push('')
  md.push('- stanza 수 ≤ 2 이면서 라인 수 ≥ 20 → PDF 원형 대비 심히 coarse')
  md.push('- canticle (ref 가 Psalm 이외 book) → refrain 구조 풍부 예상')
  md.push('')
  const coarse = perRef.filter((r) => r.stanzaCount <= 2 && r.lineCount >= 20)
  const canticles = perRef.filter((r) => !/^Psalm /.test(r.ref))
  md.push(`- coarse refs (stanza≤2, line≥20): **${coarse.length}건**`)
  for (const r of coarse.slice(0, 30)) {
    md.push(`  - \`${r.ref}\` — stanza ${r.stanzaCount}, line ${r.lineCount}`)
  }
  if (coarse.length > 30) md.push(`  - … (${coarse.length - 30} 건 생략)`)
  md.push(`- non-Psalm canticles: **${canticles.length}건**`)
  for (const r of canticles.slice(0, 30)) {
    md.push(
      `  - \`${r.ref}\` — stanza ${r.stanzaCount}, line ${r.lineCount}, refrain ${r.refrainLineCount}`,
    )
  }
  if (canticles.length > 30) md.push(`  - … (${canticles.length - 30} 건 생략)`)

  await writeFile(REPORT_OUT, md.join('\n') + '\n', 'utf8')

  console.log(`[build] PASS ${perRef.length}/${refs.length} refs`)
  console.log(`[build] 카탈로그: ${CATALOG_OUT.replace(REPO_ROOT + '/', '')}`)
  console.log(`[build] 분포 리포트: ${REPORT_OUT.replace(REPO_ROOT + '/', '')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
