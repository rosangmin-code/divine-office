/**
 * build-psalter-texts-rich.pilot.mjs — FR-153f pilot (T9 step 1~3).
 *
 * 입력: `src/data/loth/psalter-texts.pilot.json` (3 refs — Psalm 63:2-9 / Daniel
 * 3:57-88, 56 / Psalm 149:1-9).
 *
 * 출력:
 *  - `src/data/loth/prayers/commons/psalter-texts.pilot.rich.json` — 3 refs × stanzasRich
 *  - `scripts/out/psalter-stanzas-rich-pilot.md` — 보고 리포트 (indent 분포,
 *    refrain 검출, 수용 게이트 2단계, PDF 스타일 hit rate)
 *
 * 빌더 소스: **3A (Source JSON only)**. pdftotext/pdfjs 재추출 없음.
 * leading-space → indent 3-level 버킷. refrain 은 repeat-detection
 * (한 ref 내에서 동일 trimmed-line 이 ≥3 회) 기반.
 *
 * 수용 게이트 2단계:
 *  (a) 텍스트 byte-equal: normaliseForGate(source joined) == normaliseForGate(rich flatten)
 *  (b) 구조 동등성: stanza 수 + per-stanza line 수 + refrain 라인 수 일치
 *
 * PDF 샘플 실측: extractStyleOverlay 로 p58/60/64 스캔 → italic % / rubric % / 페이지당 spans.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractStyleOverlay } from './parsers/pdfjs-style-overlay.mjs'
import { normaliseForGate } from './parsers/rich-builder.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const PILOT_IN = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.pilot.json')
const PILOT_OUT = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-texts.pilot.rich.json',
)
const REPORT_OUT = resolve(REPO_ROOT, 'scripts/out/psalter-stanzas-rich-pilot.md')
const PDF_PATH = resolve(REPO_ROOT, 'Four-Week psalter.- 2025.pdf')

const PILOT_PAGES = {
  'Psalm 63:2-9': 58,
  'Daniel 3:57-88, 56': 60,
  'Psalm 149:1-9': 64,
}

// ── indent 3-level 버킷 ─────────────────────────────────────────────────
// 0 spaces → 0 | 1-3 spaces → 1 | ≥4 spaces → 2
function bucketIndent(leading) {
  if (leading === 0) return 0
  if (leading <= 3) return 1
  return 2
}

function trimLeft(s) {
  return s.replace(/^ +/, '')
}

// ── refrain 검출: ref 내 중복 trimmed-line ≥3 회 ────────────────────────
function detectRefrainLines(stanzas) {
  const counts = new Map()
  for (const stanza of stanzas) {
    for (const line of stanza) {
      const key = trimLeft(line).trim().replace(/[.,!–—-]+$/u, '')
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  const refrains = new Set()
  for (const [key, n] of counts) {
    if (n >= 3 && key.length > 0) refrains.add(key)
  }
  return refrains
}

function lineMatchesRefrain(line, refrains) {
  const key = trimLeft(line).trim().replace(/[.,!–—-]+$/u, '')
  return refrains.has(key)
}

// ── 빌더: source stanzas → rich blocks ──────────────────────────────────
function buildStanzasRichFromSource(stanzas, refrains) {
  const blocks = []
  for (const stanza of stanzas) {
    const lines = stanza.map((raw) => {
      const leading = (raw.match(/^ */) || [''])[0].length
      const indent = bucketIndent(leading)
      const text = trimLeft(raw)
      const line = { spans: [{ kind: 'text', text }], indent }
      if (lineMatchesRefrain(raw, refrains)) line.role = 'refrain'
      return line
    })
    blocks.push({ kind: 'stanza', lines })
  }
  return { blocks }
}

// ── 수용 게이트 ─────────────────────────────────────────────────────────
function flattenRichText(rich) {
  const parts = []
  for (const block of rich.blocks || []) {
    if (block.kind !== 'stanza') continue
    for (const line of block.lines || []) {
      parts.push((line.spans || []).map((s) => s.text ?? '').join(''))
    }
  }
  return parts.join('\n')
}

function flattenSourceText(stanzas) {
  const parts = []
  for (const stanza of stanzas) {
    for (const line of stanza) parts.push(trimLeft(line))
  }
  return parts.join('\n')
}

function gateTextEqual(source, rich) {
  const a = normaliseForGate(flattenSourceText(source))
  const b = normaliseForGate(flattenRichText(rich))
  return { pass: a === b, aLen: a.length, bLen: b.length }
}

function gateStructural(source, rich, refrains) {
  const stanzaCountMatch =
    source.length === (rich.blocks || []).filter((b) => b.kind === 'stanza').length
  const perStanza = []
  for (let i = 0; i < source.length; i++) {
    const src = source[i]
    const blk = rich.blocks[i]
    const rich_n = (blk?.lines || []).length
    perStanza.push({ idx: i, source: src.length, rich: rich_n, ok: src.length === rich_n })
  }
  const sourceRefrainCount = source.flat().filter((ln) => lineMatchesRefrain(ln, refrains)).length
  const richRefrainCount = (rich.blocks || [])
    .filter((b) => b.kind === 'stanza')
    .flatMap((b) => b.lines)
    .filter((ln) => ln.role === 'refrain').length
  return {
    pass: stanzaCountMatch && perStanza.every((p) => p.ok) && sourceRefrainCount === richRefrainCount,
    stanzaCountMatch,
    perStanza,
    sourceRefrainCount,
    richRefrainCount,
  }
}

// ── indent 분포 로그 ────────────────────────────────────────────────────
function indentDistribution(stanzas) {
  const hist = { 0: 0, 1: 0, 2: 0 }
  const rawHist = new Map()
  for (const stanza of stanzas) {
    for (const line of stanza) {
      const leading = (line.match(/^ */) || [''])[0].length
      rawHist.set(leading, (rawHist.get(leading) || 0) + 1)
      hist[bucketIndent(leading)]++
    }
  }
  return { bucketed: hist, raw: Object.fromEntries([...rawHist].sort((a, b) => a[0] - b[0])) }
}

// ── PDF 샘플 실측 ───────────────────────────────────────────────────────
async function measurePdfStyles(refs) {
  const bookPages = Object.values(PILOT_PAGES)
  const pages = await extractStyleOverlay({ pdfPath: PDF_PATH, bookPages })
  const HEADING_RUBRIC_PATTERNS = [
    /^\d+\s*дүгээр\s+долоо\s+хоног/u, // running header
    /^(Ирэлтийн|Дөчин хоногийн|Амилалтын).*цаг улирал/u, // cross-ref labels
    /^(Дуулал|Магтаал)\s/u, // "Psalm N" / "Canticle N" heading
    /Ням гараг/u, // day cross-ref
    /^Магтаал\s*$/u,
  ]
  // 페이지 상단 ~120 px 를 heading zone 으로 간주
  function isHeadingZone(line, pageHeight) {
    return line.y != null && line.y > pageHeight - 130
  }
  const result = []
  const rubricSamples = []
  for (const p of pages) {
    let totalSpans = 0
    let italicSpans = 0
    let rubricSpans = 0
    let rubricInBody = 0 // body 안쪽 rubric (진짜 의미 있는 스타일 hit)
    let smallCapsSpans = 0
    for (const line of p.lines || []) {
      const inHeading = isHeadingZone(line, p.pageHeight || 1000)
      for (const sp of line.spans || []) {
        totalSpans++
        if (sp.isItalic) italicSpans++
        if (sp.isSmallCaps) smallCapsSpans++
        if (sp.fill === '#ff0000') {
          rubricSpans++
          const text = (sp.text || '').trim()
          const isHeadingText = HEADING_RUBRIC_PATTERNS.some((re) => re.test(text))
          const isMeta = inHeading || isHeadingText
          if (!isMeta) {
            rubricInBody++
            rubricSamples.push({ book: p.bookPage, text })
          }
        }
      }
    }
    result.push({
      book: p.bookPage,
      half: p.half,
      lines: (p.lines || []).length,
      totalSpans,
      italicSpans,
      rubricSpans,
      rubricInBody,
      smallCapsSpans,
      italicPct: totalSpans ? (italicSpans * 100) / totalSpans : 0,
      rubricPct: totalSpans ? (rubricSpans * 100) / totalSpans : 0,
      rubricInBodyPct: totalSpans ? (rubricInBody * 100) / totalSpans : 0,
    })
  }
  return { perPage: result, rubricSamples }
}

// ── 메인 ────────────────────────────────────────────────────────────────
async function main() {
  const pilotRaw = await readFile(PILOT_IN, 'utf8')
  const pilot = JSON.parse(pilotRaw)

  const output = {}
  const perRefReports = []
  let allGatesPassed = true

  for (const ref of Object.keys(pilot)) {
    const stanzas = pilot[ref].stanzas
    const refrains = detectRefrainLines(stanzas)
    const rich = buildStanzasRichFromSource(stanzas, refrains)
    const indent = indentDistribution(stanzas)
    const gateA = gateTextEqual(stanzas, rich)
    const gateB = gateStructural(stanzas, rich, refrains)

    output[ref] = { stanzasRich: rich }
    if (!gateA.pass || !gateB.pass) allGatesPassed = false

    perRefReports.push({
      ref,
      stanzaCount: stanzas.length,
      lineCount: stanzas.reduce((a, s) => a + s.length, 0),
      indent,
      refrainKeys: [...refrains],
      refrainLineCount: gateB.sourceRefrainCount,
      gateA,
      gateB,
    })
  }

  await writeFile(PILOT_OUT, JSON.stringify(output, null, 2) + '\n', 'utf8')

  // PDF 샘플 실측
  let pdfReport = null
  try {
    pdfReport = await measurePdfStyles(Object.keys(pilot))
  } catch (e) {
    pdfReport = { error: e.message }
  }

  // 리포트
  const md = []
  md.push('# FR-153f pilot — psalter stanzasRich (T9 step 1~3)')
  md.push('')
  md.push(`- 입력: \`${PILOT_IN.replace(REPO_ROOT + '/', '')}\` (${Object.keys(pilot).length} refs)`)
  md.push(`- 출력: \`${PILOT_OUT.replace(REPO_ROOT + '/', '')}\``)
  md.push(`- 빌더 소스: **3A (Source JSON only)**`)
  md.push(`- indent 버킷: 0 → 0 | 1-3 → 1 | ≥4 → 2`)
  md.push(`- refrain 검출: ref 내 중복 trimmed-line ≥3 회 → \`role: 'refrain'\``)
  md.push(`- 종합 gate: ${allGatesPassed ? '✅ PASS (3/3)' : '❌ FAIL'}`)
  md.push('')
  md.push('## per-ref 결과')
  for (const r of perRefReports) {
    md.push('')
    md.push(`### ${r.ref}`)
    md.push('')
    md.push(`- stanza ${r.stanzaCount} | line ${r.lineCount}`)
    md.push(
      `- indent (raw leading-space hist): ${Object.entries(r.indent.raw)
        .map(([k, v]) => `${k}sp×${v}`)
        .join(', ')}`,
    )
    md.push(
      `- indent (bucketed 0/1/2): ${r.indent.bucketed[0]}/${r.indent.bucketed[1]}/${r.indent.bucketed[2]}`,
    )
    md.push(`- refrain 검출 keys (≥3x): ${r.refrainKeys.length === 0 ? '(없음)' : ''}`)
    for (const k of r.refrainKeys) md.push(`  - \`${k}\``)
    md.push(`- refrain 라인 수: ${r.refrainLineCount}`)
    md.push(`- gate (a) 텍스트 byte-equal: ${r.gateA.pass ? '✅ PASS' : '❌ FAIL'} (len a/b = ${r.gateA.aLen}/${r.gateA.bLen})`)
    md.push(
      `- gate (b) 구조 동등성: ${r.gateB.pass ? '✅ PASS' : '❌ FAIL'} (stanza ${r.gateB.stanzaCountMatch ? 'OK' : 'DIFF'}; refrain src/rich=${r.gateB.sourceRefrainCount}/${r.gateB.richRefrainCount})`,
    )
    const perStanzaIssues = r.gateB.perStanza.filter((p) => !p.ok)
    if (perStanzaIssues.length) {
      md.push(`  - stanza line-count 불일치:`)
      for (const p of perStanzaIssues) md.push(`    - stanza[${p.idx}]: src=${p.source}, rich=${p.rich}`)
    }
  }
  md.push('')
  md.push('## PDF 샘플 실측 (pdfjs-style-overlay)')
  if (pdfReport && pdfReport.error) {
    md.push(`- ❌ 실측 실패: ${pdfReport.error}`)
  } else if (pdfReport && Array.isArray(pdfReport.perPage)) {
    md.push('')
    md.push('| book page | half | lines | spans | italic | rubric(all) | rubric(body) | italic % | rubric(all) % | rubric(body) % | smallCaps |')
    md.push('|---:|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
    let totSpans = 0, totItalic = 0, totRubric = 0, totRubricBody = 0
    for (const p of pdfReport.perPage) {
      md.push(
        `| ${p.book} | ${p.half} | ${p.lines} | ${p.totalSpans} | ${p.italicSpans} | ${p.rubricSpans} | ${p.rubricInBody} | ${p.italicPct.toFixed(2)}% | ${p.rubricPct.toFixed(2)}% | ${p.rubricInBodyPct.toFixed(2)}% | ${p.smallCapsSpans} |`,
      )
      totSpans += p.totalSpans
      totItalic += p.italicSpans
      totRubric += p.rubricSpans
      totRubricBody += p.rubricInBody
    }
    const italicPctTot = totSpans ? (totItalic * 100) / totSpans : 0
    const rubricPctTot = totSpans ? (totRubric * 100) / totSpans : 0
    const rubricBodyPctTot = totSpans ? (totRubricBody * 100) / totSpans : 0
    md.push('')
    md.push(
      `**합계 spans**: ${totSpans} | italic ${totItalic} (${italicPctTot.toFixed(2)}%) | rubric-all ${totRubric} (${rubricPctTot.toFixed(2)}%) | rubric-body ${totRubricBody} (${rubricBodyPctTot.toFixed(2)}%)`,
    )
    md.push('')
    md.push('### rubric(all) vs rubric(body) 분류')
    md.push('')
    md.push('`rubric(all)` 은 페이지 상의 모든 빨간색 span 을 포함한다. 여기에는:')
    md.push('')
    md.push('- 페이지 running header (예: `1 дүгээр долоо хоног`)')
    md.push('- 시편/찬가 ref heading (예: `Дуулал 63:2-9`, `Магтаал Даниел 3:57-88, 56`)')
    md.push('- 시편 subtitle (예: `Тэнгэрбурханаар цангаж буй сэтгэл`)')
    md.push('- 타 시즌 교차 사용 표시 (예: `Дөчин хоногийн цаг улирлын 1 дэх Ням гараг:`)')
    md.push('')
    md.push(
      '…이 모두 포함된다. 이들은 **본문 밖 metadata** 로 이미 `psalter/week-*.json` 의 `title` 및 카탈로그 상의 ref 라벨로 저장돼 있고, stanzasRich 의 범위가 아니다.',
    )
    md.push('')
    md.push('`rubric(body)` 는 heading-zone + heading-pattern 을 제외한 진짜 본문 내부 rubric span 수.')
    md.push('')
    md.push('#### rubric(body) 샘플')
    if (pdfReport.rubricSamples.length === 0) {
      md.push('- (없음)')
    } else {
      for (const s of pdfReport.rubricSamples.slice(0, 20)) {
        md.push(`- p${s.book}: \`${s.text}\``)
      }
    }
    md.push('')
    md.push('### 3A vs 3C 결정')
    const hit = Math.max(italicPctTot, rubricBodyPctTot)
    if (hit >= 5) {
      md.push(`- 본문 italic/rubric hit ${hit.toFixed(2)}% ≥ 5% → **3C 권장** (본문 스타일 보존 필요)`)
    } else {
      md.push(
        `- 본문 italic ${italicPctTot.toFixed(2)}% / rubric-body ${rubricBodyPctTot.toFixed(2)}% 모두 < 5% → **3A 확정** (3C 업그레이드 이득 낮음)`,
      )
    }
  }
  md.push('')
  md.push('## 중복 trimmed-line 상위 (refrain 후보)')
  for (const r of perRefReports) {
    if (r.refrainKeys.length === 0) continue
    md.push('')
    md.push(`- **${r.ref}**: ${r.refrainKeys.length} 종, 라인 ${r.refrainLineCount}개`)
    for (const k of r.refrainKeys) md.push(`  - \`${k}\``)
  }

  await writeFile(REPORT_OUT, md.join('\n') + '\n', 'utf8')

  console.log(`[pilot] wrote ${PILOT_OUT.replace(REPO_ROOT + '/', '')}`)
  console.log(`[pilot] wrote ${REPORT_OUT.replace(REPO_ROOT + '/', '')}`)
  console.log(`[pilot] gates: ${allGatesPassed ? 'PASS 3/3' : 'FAIL'}`)
  if (pdfReport && Array.isArray(pdfReport.perPage)) {
    let totSpans = 0, totItalic = 0, totRubric = 0, totRubricBody = 0
    for (const p of pdfReport.perPage) {
      totSpans += p.totalSpans
      totItalic += p.italicSpans
      totRubric += p.rubricSpans
      totRubricBody += p.rubricInBody
    }
    console.log(
      `[pilot] PDF styles: spans=${totSpans} italic=${totItalic} (${((totItalic * 100) / totSpans).toFixed(2)}%) rubric-all=${totRubric} (${((totRubric * 100) / totSpans).toFixed(2)}%) rubric-body=${totRubricBody} (${((totRubricBody * 100) / totSpans).toFixed(2)}%)`,
    )
  } else if (pdfReport?.error) {
    console.log(`[pilot] PDF measurement failed: ${pdfReport.error}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
