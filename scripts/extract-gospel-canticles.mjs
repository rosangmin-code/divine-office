#!/usr/bin/env node
/**
 * extract-gospel-canticles.mjs — WI #37 (GOAL #35 sub-2).
 *
 * 성무일도 복음 성가(Gospel Canticle) 3종 — Benedictus(즈카르야의 노래,
 * 아침기도), Magnificat(성모찬송, 저녁기도), Nunc Dimittis(시므온의 노래,
 * 끝기도) — 의 본문 `verses[]` 를 `parsed_data/full_pdf.txt`(4주 시편집
 * 원본 SoT) 의 인쇄 본문 라인에서 **시편과 동일한 'Cyrillic 대문자 시작 =
 * 새 절' 규칙**으로 재분절한다.
 *
 * 배경 (WI #36 진단):
 *   시편 본문은 `psalter-texts.rich.json` 의 `stanzasRich.blocks[].lines[]`
 *   에 빌드타임 `regroupPhrasesByCapitalStart`(scripts/build-phrases-into-
 *   rich.mjs:194-223, 정규식 `/^[А-ЯЁӨҮ]/`) 를 적용해 절(phrase)을 묶는다.
 *   반면 Gospel Canticle 은 `src/data/loth/ordinarium/canticles.json` 의
 *   단순 `verses: string[]` 로 저장되며 이 규칙을 한 번도 통과하지 않아,
 *   PDF 의 대문자-시작 시행 구조와 무관하게 일관성 없이 병합·분리돼 있었다
 *   (사용자 보고: 'pdf 에서 대문자 시작하는 것으로 절구분 하는 것이
 *   구현이 안 되는 거'). 이 스크립트가 시편과 동일한 규칙을 차용(재사용)해
 *   그 불일치를 해소한다.
 *
 * 규칙 (시편 `regroupPhrasesByCapitalStart` 재사용 — IMPORT, 로직 복제 아님):
 *   - 각 Cyrillic 대문자 시작 라인(`/^[А-ЯЁӨҮ]/`, Ө/Ү 포함 몽골 키릴) = 새 verse.
 *   - 소문자/따옴표/숫자 시작 라인 = 직전 verse 에 공백 join(wrap-continuation 흡수).
 *
 * paragraphBoundaries (단락 구분):
 *   사용자 결정 = '절 구분만'(렌더 무변경, 시각 단락 spacing 변경 안 함).
 *   → PDF page-break 기반으로 재계산하면 단락 spacing 이 현재보다 sparse 해져
 *     사용자가 보던 화면이 바뀐다(scope 밖). 따라서 **현행 시각 단락 구조를
 *     보존**한다: 각 canticle 의 `paragraphAnchors`(단락을 시작하는 verse 의
 *     첫 PDF 라인 텍스트 — 현행 canticles.json paragraphBoundaries 를 텍스트
 *     앵커로 환산한 것, 전부 대문자-시작 라인이라 새 verses[] 인덱스로 무손실
 *     매핑됨) 를 생성된 verses[] 에서 찾아 그 인덱스를 paragraphBoundaries 로
 *     emit 한다. 즉 단락 grouping(어느 시행들이 한 단락인지)은 그대로 두고,
 *     단락 내부의 절 분할만 PDF 대문자 규칙대로 교정된다.
 *   근거: 사용자 scope='절 구분만'이므로 단락 spacing 변경은 scope 밖이다.
 *   현행 보존 = 최소 변경 = scope 충실(임의 단정 아님). page-break 기반 대안은
 *   단락 spacing 을 바꾸므로 채택하지 않음. (이 해석은 leader 에 통지 + 확인 요청함.)
 *
 * CLI:
 *   node scripts/extract-gospel-canticles.mjs            # dry-run: 생성 결과 출력
 *   node scripts/extract-gospel-canticles.mjs --write    # canticles.json 의 verses[]+paragraphBoundaries 갱신
 *   node scripts/extract-gospel-canticles.mjs --verify   # drift 가드: 생성 결과 ↔ canticles.json 비교, drift>0 → exit 1
 *   node scripts/extract-gospel-canticles.mjs --pdf <path>     # full_pdf.txt 경로 override (gitignore — worktree 에 없음)
 *   node scripts/extract-gospel-canticles.mjs --target <path>  # canticles.json 경로 override
 *
 * full_pdf.txt 는 .gitignore 대상이라 git worktree 에는 존재하지 않는다.
 * worktree 에서 검증할 때는 메인 체크아웃 경로를 명시:
 *   --pdf /home/min/myproject/divineoffice/parsed_data/full_pdf.txt
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { regroupPhrasesByCapitalStart } from './build-phrases-into-rich.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DEFAULT_PDF = join(ROOT, 'parsed_data', 'full_pdf.txt')
const DEFAULT_TARGET = join(ROOT, 'src', 'data', 'loth', 'ordinarium', 'canticles.json')

const PAGE_NUM_RE = /^\s*\d+\s*$/
// Running-header lines printed inside the body region of the 인쇄본
// (e.g. "Өглөөний даатгал залбирал" at the page35 break of Benedictus,
// "Шөнийн даатгал залбирал" before Nunc Dimittis body). They never carry
// canticle body content, so they are filtered from the body line stream.
const RUNNING_HEADER_RE = /даатгал залбирал\s*$/

/**
 * Per-canticle extraction config.
 *
 *  - key:            canticles.json top-level key.
 *  - firstBodyText:  exact text of the FIRST body line in full_pdf.txt
 *                    (the line right after the subtitle/rubric preamble).
 *                    Used as a robust start anchor instead of a hardcoded
 *                    line number (resilient to PDF line shifts).
 *  - lastBodyText:   exact text of the LAST body line. Collection stops at
 *                    (and includes) the first occurrence at/after the start
 *                    anchor. Needed because the doxology terminator is NOT
 *                    uniform: Benedictus/Nunc Dimittis end with a standalone
 *                    "Эцэг, Хүү, Ариун Сүнсэнд жавхланг…" Gloria line, but
 *                    Magnificat's doxology is folded into a following rubric
 *                    ("Өөр нэг заавар бичигдээгүй бол…магтаалуудын төгсгөлийн
 *                    үед Эцэг, Хүү…") with no standalone Gloria line — a
 *                    `^Эцэг` regex would miss it and over-collect the trailing
 *                    rubric block. An explicit last-line anchor bounds the
 *                    body precisely for all three.
 *  - paragraphAnchors: exact text of each body line that STARTS a paragraph
 *                    (a within-body paragraph gap renders before it). These
 *                    are the current canticles.json paragraphBoundaries
 *                    re-expressed as PDF-stable text anchors — every one is
 *                    a Cyrillic-capital-start line, so it survives as a
 *                    verse-start under the capital rule and maps losslessly
 *                    onto the new verses[] indices. Index 0 (body start) is
 *                    never an anchor.
 */
const CANTICLES = [
  {
    key: 'benedictus',
    firstBodyText: 'Израилийн Тэнгэрбурхан Эзэн магтагдах болтугай!',
    lastBodyText: 'хөтлөхийн тулд юм.',
    paragraphAnchors: [
      'Учир нь Тэр ард түмэндээ очиж,',
      'Мөн бидний төлөө авралын ид хүчийг',
      'Ариун эш үзүүлэгчдийнхээ амаар',
      'Биднийг өстөн дайснуудаасаа,',
      'Өвөг дээдэст маань өршөөл үзүүлэх хийгээд',
      'Энэ нь дайснуудын гараас',
      'Аяа, бяцхан хүү минь,',
      'Энэ нь Түүний замыг бэлдэх хийгээд',
      'Бидний Тэнгэрбурханы өршөөл энэрлээр',
    ],
  },
  {
    key: 'magnificat',
    firstBodyText: 'Сэтгэл минь Эзэнийг дээдэлнэ,',
    lastBodyText: 'Абрахамыг болоод үр удмыг нь үүрд өршөөнө',
    paragraphAnchors: [
      'Учир нь Хүчит Нэгэн',
      'Түүний өршөөл',
      'Удирдагчдыг сэнтийнээс нь буулган,',
      'Өлссөн хүмүүсийг сайнаар бялхуулж,',
    ],
  },
  {
    key: 'nuncDimittis',
    firstBodyText: 'Аяа Эзэн минь, Та урьд өгүүлсэнчлэн',
    lastBodyText: 'жавхлан юм.',
    paragraphAnchors: [
      'Учир нь миний нүд бүх ард түмний нүүрэн',
      'Энэ нь харь үндэстэнд илчлэгдэх гэгээн гэрэл,',
    ],
  },
]

/**
 * Collect the canticle body lines from the PDF text: starting at the
 * `firstBodyText` anchor, up to AND INCLUDING the first `lastBodyText`
 * occurrence at/after the start. Page-number lines, running-header lines,
 * and blank lines within the range are filtered out. Returns the trimmed
 * body lines in print order.
 *
 * @param {string[]} pdfLines
 * @param {string} firstBodyText
 * @param {string} lastBodyText
 * @returns {string[]}
 */
export function collectBodyLines(pdfLines, firstBodyText, lastBodyText) {
  const start = pdfLines.findIndex((l) => l.trim() === firstBodyText)
  if (start < 0) {
    throw new Error(`Body start anchor not found in PDF: "${firstBodyText}"`)
  }
  const body = []
  let sawLast = false
  for (let i = start; i < pdfLines.length; i++) {
    const trimmed = pdfLines[i].trim()
    if (trimmed === '') continue
    if (PAGE_NUM_RE.test(pdfLines[i])) continue
    if (RUNNING_HEADER_RE.test(trimmed)) continue
    body.push(trimmed)
    if (trimmed === lastBodyText) {
      sawLast = true
      break
    }
  }
  if (!sawLast) {
    throw new Error(
      `Body end anchor not found after start: "${lastBodyText}" (start anchor "${firstBodyText}")`,
    )
  }
  if (body.length === 0) {
    throw new Error(`No body lines collected after anchor: "${firstBodyText}"`)
  }
  return body
}

/**
 * Segment body lines into verses using the SHARED capital-start rule
 * (`regroupPhrasesByCapitalStart` imported from the psalter phrase
 * builder). Each phrase's lineRange [start,end] is joined with a single
 * space into one verse string.
 *
 * @param {string[]} bodyLines
 * @returns {string[]}
 */
export function segmentVerses(bodyLines) {
  // Wrap each PDF body line into the rich-line shape the psalter rule
  // expects ({spans:[{text}], indent}). indent is irrelevant here (we only
  // consume lineRange), so 0 throughout.
  const richLines = bodyLines.map((text) => ({ spans: [{ text }], indent: 0 }))
  const phrases = regroupPhrasesByCapitalStart(richLines)
  return phrases.map(({ lineRange: [s, e] }) =>
    bodyLines.slice(s, e + 1).join(' '),
  )
}

/**
 * Map paragraph anchors (PDF body line texts that start a paragraph) onto
 * indices into the generated verses[]. Each anchor must match the START of
 * exactly one verse (anchors are capital-start lines, so they always head a
 * verse). Throws if an anchor fails to resolve (fail-loud — a silent miss
 * would drop a paragraph gap the curator intended).
 *
 * @param {string[]} verses
 * @param {string[]} anchors
 * @returns {number[]}
 */
export function computeParagraphBoundaries(verses, anchors) {
  const out = []
  for (const anchor of anchors) {
    const idx = verses.findIndex((v) => v === anchor || v.startsWith(anchor + ' '))
    if (idx < 0) {
      throw new Error(`Paragraph anchor did not match any verse start: "${anchor}"`)
    }
    if (idx === 0) {
      throw new Error(`Paragraph anchor resolved to verse 0 (body start): "${anchor}"`)
    }
    out.push(idx)
  }
  // Stable ascending order; de-dup defensively.
  return [...new Set(out)].sort((a, b) => a - b)
}

/**
 * Build the regenerated {verses, paragraphBoundaries} for one canticle.
 *
 * @param {string[]} pdfLines
 * @param {{firstBodyText: string, paragraphAnchors: string[]}} cfg
 * @returns {{verses: string[], paragraphBoundaries: number[]}}
 */
export function buildCanticle(pdfLines, cfg) {
  const body = collectBodyLines(pdfLines, cfg.firstBodyText, cfg.lastBodyText)
  const verses = segmentVerses(body)
  const paragraphBoundaries = computeParagraphBoundaries(verses, cfg.paragraphAnchors)
  return { verses, paragraphBoundaries }
}

function parseArgs(argv) {
  const args = { pdf: DEFAULT_PDF, target: DEFAULT_TARGET, write: false, verify: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pdf') args.pdf = argv[++i]
    else if (a === '--target') args.target = argv[++i]
    else if (a === '--write') args.write = true
    else if (a === '--verify') args.verify = true
    else if (a === '--dry-run') {/* default */}
    else throw new Error(`Unknown arg: ${a}`)
  }
  if (args.write && args.verify) {
    throw new Error('--write and --verify are mutually exclusive.')
  }
  return args
}

function arrEq(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(args.pdf)) {
    console.error(
      `ERROR: PDF source not found: ${args.pdf}\n` +
        `(parsed_data/full_pdf.txt is .gitignored — pass --pdf <abs path to main checkout> when running from a worktree.)`,
    )
    process.exit(2)
  }
  const pdfLines = readFileSync(args.pdf, 'utf8').split(/\r?\n/)
  const target = JSON.parse(readFileSync(args.target, 'utf8'))

  const generated = {}
  for (const cfg of CANTICLES) {
    generated[cfg.key] = buildCanticle(pdfLines, cfg)
  }

  if (args.verify) {
    let drift = 0
    for (const cfg of CANTICLES) {
      const g = generated[cfg.key]
      const cur = target[cfg.key] || {}
      const vDrift = !arrEq(g.verses, cur.verses)
      const pDrift = !arrEq(g.paragraphBoundaries, cur.paragraphBoundaries)
      if (vDrift || pDrift) {
        drift++
        console.error(`DRIFT [${cfg.key}]:`)
        if (vDrift) {
          console.error(`  verses: generated=${g.verses.length} current=${(cur.verses || []).length}`)
          const max = Math.max(g.verses.length, (cur.verses || []).length)
          for (let i = 0; i < max; i++) {
            const gi = g.verses[i]
            const ci = (cur.verses || [])[i]
            if (gi !== ci) console.error(`    [${i}] generated=${JSON.stringify(gi)}\n        current=  ${JSON.stringify(ci)}`)
          }
        }
        if (pDrift) {
          console.error(`  paragraphBoundaries: generated=${JSON.stringify(g.paragraphBoundaries)} current=${JSON.stringify(cur.paragraphBoundaries)}`)
        }
      } else {
        console.log(`OK [${cfg.key}]: ${g.verses.length} verses, paragraphBoundaries=${JSON.stringify(g.paragraphBoundaries)}`)
      }
    }
    if (drift > 0) {
      console.error(`\n=== VERIFY FAILED: ${drift} canticle(s) drifted from PDF capital-start segmentation. ===`)
      process.exit(1)
    }
    console.log(`\n=== VERIFY OK: all ${CANTICLES.length} canticles match PDF capital-start segmentation. ===`)
    return
  }

  if (args.write) {
    for (const cfg of CANTICLES) {
      const g = generated[cfg.key]
      target[cfg.key].verses = g.verses
      target[cfg.key].paragraphBoundaries = g.paragraphBoundaries
    }
    writeFileSync(args.target, JSON.stringify(target, null, 2) + '\n', 'utf8')
    console.log(`Wrote ${args.target}`)
    for (const cfg of CANTICLES) {
      console.log(`  [${cfg.key}] ${generated[cfg.key].verses.length} verses, paragraphBoundaries=${JSON.stringify(generated[cfg.key].paragraphBoundaries)}`)
    }
    return
  }

  // dry-run (default): print generated result + before/after counts.
  for (const cfg of CANTICLES) {
    const g = generated[cfg.key]
    const cur = target[cfg.key] || {}
    console.log(`\n=== ${cfg.key} ===`)
    console.log(`verses: ${(cur.verses || []).length} → ${g.verses.length}`)
    console.log(`paragraphBoundaries: ${JSON.stringify(cur.paragraphBoundaries)} → ${JSON.stringify(g.paragraphBoundaries)}`)
    g.verses.forEach((v, i) => {
      const mark = g.paragraphBoundaries.includes(i) ? ' ¶' : '  '
      console.log(`${mark}[${i}] ${v}`)
    })
  }
}

if (process.argv?.[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
