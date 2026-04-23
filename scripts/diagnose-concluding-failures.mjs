#!/usr/bin/env node
/**
 * diagnose-concluding-failures.mjs — Task #10 진단용.
 *
 * concluding-rich-failures.md 의 21 건 실패 케이스 각각에 대해
 * original (JSON) / reconstructed (PDF→rich→flatten) 두 문자열을 전부 덤프.
 * 스크롤 출력은 `scripts/out/concluding-failure-diagnose.md` 로 저장.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildProsePrayer,
  normaliseWhitespace,
  flattenBlocksToPlainText,
} from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const OUT = resolve(REPO_ROOT, 'scripts/out/concluding-failure-diagnose.md')

const SECTION_HEADING = /Төгсгөлийн\s+даатгал\s+залбирал/i
const END_OF_BLOCK_PATTERNS = [
  /^Эсвэл/,
  /^Сонголтот\s+залбирал/,
  /^(?:\d+\s+(?:дугаар|дэх|дахь|дүгээр)\s+)?(?:Оройн|Өглөөний)\s+даатгал\s+залбирал/,
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

const TARGETS = [
  ['ORDINARY_TIME', 'ordinary-time.json', '7', 'SUN', 'lauds'],
  ['ORDINARY_TIME', 'ordinary-time.json', '7', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '19', 'SUN', 'lauds'],
  ['ORDINARY_TIME', 'ordinary-time.json', '19', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '23', 'SUN', 'lauds'],
  ['ORDINARY_TIME', 'ordinary-time.json', '23', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '32', 'SUN', 'lauds'],
  ['ORDINARY_TIME', 'ordinary-time.json', '32', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'dec25', 'SUN', 'lauds'],
  ['CHRISTMAS', 'christmas.json', 'octave', 'SUN', 'lauds'],
  ['CHRISTMAS', 'christmas.json', 'octave', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'jan1', 'SUN', 'lauds'],
  ['CHRISTMAS', 'christmas.json', 'jan1', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'baptism', 'SUN', 'lauds'],
  ['CHRISTMAS', 'christmas.json', 'baptism', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'epiphanyWeek', 'SUN', 'lauds'],
  ['CHRISTMAS', 'christmas.json', 'epiphanyWeek', 'SUN', 'vespers'],
  ['LENT', 'lent.json', '1', 'THU', 'lauds'],
  ['LENT', 'lent.json', '1', 'THU', 'vespers'],
  ['LENT', 'lent.json', '6', 'THU', 'vespers'],
  ['EASTER', 'easter.json', '1', 'SAT', 'lauds'],
]

function showDiff(origNorm, reconNorm, divIdx) {
  const windowStart = Math.max(0, divIdx - 30)
  const windowEnd = Math.min(
    Math.max(origNorm.length, reconNorm.length),
    divIdx + 60,
  )
  return {
    origWindow: origNorm.slice(windowStart, windowEnd),
    reconWindow: reconNorm.slice(windowStart, windowEnd),
    origChar: origNorm[divIdx] ?? '(eof)',
    reconChar: reconNorm[divIdx] ?? '(eof)',
    origCode: origNorm.codePointAt(divIdx),
    reconCode: reconNorm.codePointAt(divIdx),
    origLen: origNorm.length,
    reconLen: reconNorm.length,
  }
}

async function main() {
  const lines = []
  lines.push('# Concluding Prayer Rich 실패 21건 진단')
  lines.push('')
  lines.push(`- 생성: ${new Date().toISOString()}`)
  lines.push('')

  for (const [season, file, weekKey, dayKey, hour] of TARGETS) {
    const propers = JSON.parse(readFileSync(resolve(PROPERS_ROOT, file), 'utf-8'))
    const entry = propers?.weeks?.[weekKey]?.[dayKey]?.[hour]
    const prayer = entry?.concludingPrayer
    const page = entry?.concludingPrayerPage
    const id = `${season}/w${weekKey}/${dayKey}/${hour}`
    lines.push(`## ${id} (page ${page})`)
    lines.push('')
    if (typeof prayer !== 'string') {
      lines.push('- original 없음')
      lines.push('')
      continue
    }
    try {
      const result = await buildProsePrayer({
        pdfPath: PDF_PATH,
        bookPage: page,
        sectionHeadingRegex: SECTION_HEADING,
        endOfBlockRegex: END_OF_BLOCK,
        originalText: prayer,
      })
      if (result.pass === true) {
        lines.push('- PASS (이미 통과?)')
        lines.push('')
        continue
      }
      const origNorm = result.originalNorm
      const reconNorm = result.reconstructedNorm
      const divIdx = result.firstDivergenceAt
      const diag = showDiff(origNorm, reconNorm, divIdx)
      lines.push('```')
      lines.push(`ORIG (len=${diag.origLen}):`)
      lines.push(origNorm)
      lines.push('')
      lines.push(`RECON (len=${diag.reconLen}):`)
      lines.push(reconNorm)
      lines.push('')
      lines.push(
        `DIVERGE @${divIdx}  orig[${divIdx}]=${JSON.stringify(diag.origChar)} (U+${(diag.origCode || 0).toString(16).toUpperCase()})  recon[${divIdx}]=${JSON.stringify(diag.reconChar)} (U+${(diag.reconCode || 0).toString(16).toUpperCase()})`,
      )
      lines.push(`  orig window: ${JSON.stringify(diag.origWindow)}`)
      lines.push(`  recon window: ${JSON.stringify(diag.reconWindow)}`)
      lines.push('```')
      lines.push('')
      lines.push('### bodyLines (pdftotext)')
      lines.push('```')
      for (const bl of result.bodyLines) lines.push(bl)
      lines.push('```')
      lines.push('')
    } catch (err) {
      lines.push('```')
      lines.push('EXCEPTION:')
      lines.push(err && err.message ? err.message : String(err))
      lines.push('```')
      lines.push('')
      lines.push('### original JSON')
      lines.push('```')
      lines.push(prayer)
      lines.push('```')
      lines.push('')
    }
  }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, lines.join('\n'), 'utf-8')
  console.log(`wrote ${OUT}`)
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
