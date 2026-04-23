#!/usr/bin/env node
/**
 * diagnose-alt-concluding-failures.mjs — alt-concluding 실패 full-dump.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProsePrayer } from './parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const PDF_PATH = resolve(REPO_ROOT, 'public', 'psalter.pdf')
const PROPERS_ROOT = resolve(REPO_ROOT, 'src/data/loth/propers')
const OUT = resolve(REPO_ROOT, 'scripts/out/alt-concluding-failure-diagnose.md')

const SECTION_HEADING = /Сонголтот\s+залбирал/i
const END_OF_BLOCK = /(?:^Эсвэл)|(?:^(?:\d+\s+(?:дугаар|дэх|дахь|дүгээр)\s+)?(?:Оройн|Өглөөний)\s+даатгал\s+залбирал)|(?:^(?:Ням|Да|Мя|Лха|Пү|Ба|Бя)\s+гарагийн)|(?:^(?:Мариагийн|Захариагийн|Шад)\s+магтаал)|(?:^Дууллын\s+залбирал)|(?:^(?:Уншлага|Хариу\s+залбирал|Гуйлтын\s+залбирал))|(?:^Төгсгөлийн\s+даатгал\s+залбирал)|(?:^Сонголтот\s+залбирал)|(?:^[А-ЯЁӨҮ][А-ЯЁӨҮ\s]{3,}$)/u

const TARGETS = [
  ['ORDINARY_TIME', 'ordinary-time.json', '3', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '7', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '12', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '13', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '15', 'SUN', 'vespers'],
  ['ORDINARY_TIME', 'ordinary-time.json', '25', 'SUN', 'vespers'],
  ['ADVENT', 'advent.json', '1', 'SUN', 'lauds'],
  ['ADVENT', 'advent.json', '1', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'dec25', 'SUN', 'vespers'],
  ['CHRISTMAS', 'christmas.json', 'baptism', 'SUN', 'lauds'],
  ['LENT', 'lent.json', '1', 'SUN', 'lauds'],
  ['EASTER', 'easter.json', '1', 'SUN', 'lauds'],
  ['EASTER', 'easter.json', '1', 'SUN', 'vespers'],
  ['EASTER', 'easter.json', 'easterSunday', 'SUN', 'lauds'],
  ['EASTER', 'easter.json', 'easterSunday', 'SUN', 'vespers'],
  ['EASTER', 'easter.json', 'pentecost', 'SUN', 'vespers'],
]

async function main() {
  const lines = []
  lines.push('# alt-concluding 실패 16건 진단')
  lines.push('')
  for (const [season, file, weekKey, dayKey, hour] of TARGETS) {
    const propers = JSON.parse(readFileSync(resolve(PROPERS_ROOT, file), 'utf-8'))
    const entry = propers?.weeks?.[weekKey]?.[dayKey]?.[hour]
    const prayer = entry?.alternativeConcludingPrayer
    const page = entry?.alternativeConcludingPrayerPage
    const id = `${season}/w${weekKey}/${dayKey}/${hour}`
    lines.push(`## ${id} (page ${page})`)
    lines.push('')
    if (typeof prayer !== 'string') {
      lines.push('- original 없음'); lines.push(''); continue
    }
    try {
      const r = await buildProsePrayer({
        pdfPath: PDF_PATH, bookPage: page,
        sectionHeadingRegex: SECTION_HEADING,
        endOfBlockRegex: END_OF_BLOCK,
        originalText: prayer,
        maxExtraPages: 2,
      })
      if (r.pass === true) { lines.push('- PASS'); lines.push(''); continue }
      const o = r.originalNorm, c = r.reconstructedNorm, d = r.firstDivergenceAt
      const winStart = Math.max(0, d - 30)
      const winEnd = Math.min(Math.max(o.length, c.length), d + 60)
      lines.push('```')
      lines.push(`ORIG (len=${o.length}):`)
      lines.push(o)
      lines.push('')
      lines.push(`RECON (len=${c.length}):`)
      lines.push(c)
      lines.push('')
      lines.push(`DIVERGE @${d}  orig=${JSON.stringify(o[d]||'(eof)')} recon=${JSON.stringify(c[d]||'(eof)')}`)
      lines.push(`  orig win: ${JSON.stringify(o.slice(winStart,winEnd))}`)
      lines.push(`  recon win: ${JSON.stringify(c.slice(winStart,winEnd))}`)
      lines.push('```')
      lines.push('')
    } catch (err) {
      lines.push('```'); lines.push('EXCEPTION: ' + (err?.message || err)); lines.push('```')
      lines.push('### original'); lines.push('```'); lines.push(prayer); lines.push('```')
      lines.push('')
    }
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, lines.join('\n'), 'utf-8')
  console.log('wrote', OUT)
}
main().catch(e=>{console.error(e); process.exit(1)})
