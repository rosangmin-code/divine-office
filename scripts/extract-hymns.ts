/**
 * One-time script: Extract hymn lyrics from divine-office-reader's parsed data
 * and generate hymns.json for the divine office app.
 *
 * Source: ../divine-office-reader/public/data/content/hymns.json
 * Output: ../src/data/loth/ordinarium/hymns.json
 */

import * as fs from 'fs'
import * as path from 'path'

const READER_HYMNS = path.resolve(__dirname, '../../divine-office-reader/public/data/content/hymns.json')
const HYMNS_INDEX = path.resolve(__dirname, '../src/data/loth/ordinarium/hymns-index.json')
const OUTPUT = path.resolve(__dirname, '../src/data/loth/ordinarium/hymns.json')

// Patterns to remove from hymn content (artifacts from PDF parsing)
const DATE_REF_RE = /^\d{1,2}\s*д[үу]г[аэ]+р\s+сарын\s+\d{1,2}.*$/
const HYMN_NUM_REF_RE = /^\d{1,3}\.\s+[А-ЯЁа-яёA-Za-z]/ // "31. Бүү ай" style references
const HEADER_RE = /^Магтуу\s*$/
const PAGE_HEADER_RE = /^\d{3}\s*$/  // standalone page numbers like "874"
const SEASON_HEADER_RE = /^(Жирийн|Ирэлтийн|Амилалтын|Дөчин|Эзэний)\s+цаг\s+улирал/i

function cleanHymnContent(raw: string): string {
  const lines = raw.split('\n')
  const cleaned: string[] = []

  for (const line of lines) {
    const s = line.trim()
    if (!s) {
      cleaned.push('')
      continue
    }
    // Skip artifacts
    if (DATE_REF_RE.test(s)) continue
    if (HEADER_RE.test(s)) continue
    if (PAGE_HEADER_RE.test(s)) continue
    if (SEASON_HEADER_RE.test(s)) continue
    // Skip lines that are just hymn number references (e.g., "31. Бүү ай")
    // But NOT the actual hymn being defined (we handle that by checking length context)
    if (HYMN_NUM_REF_RE.test(s) && s.length < 80) {
      // This could be a reference OR an actual verse line starting with a number
      // References tend to be short standalone lines listing other hymn titles
      // Actual lyrics don't usually match "N. Title" pattern exactly
      // We'll be conservative: only skip if it matches known hymn titles
      continue
    }

    cleaned.push(line)
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function main() {
  // Load reader hymns data
  const readerData: Record<string, { title: string; titleMn: string; content: string }> =
    JSON.parse(fs.readFileSync(READER_HYMNS, 'utf-8'))

  // Load hymns index for canonical titles
  const indexData = JSON.parse(fs.readFileSync(HYMNS_INDEX, 'utf-8'))
  const titleMap = new Map<number, string>()
  for (const h of indexData.hymns) {
    titleMap.set(h.number, h.title)
  }

  // Extract hymns keyed by number
  const output: Record<string, { title: string; text: string }> = {}

  // Initialize all 122 hymns from index
  for (const h of indexData.hymns) {
    output[String(h.number)] = { title: h.title, text: '' }
  }

  // Fill in lyrics from reader data
  let filledCount = 0
  for (const [key, value] of Object.entries(readerData)) {
    if (!key.startsWith('hymns-')) continue

    // Extract hymn number from key (e.g., "hymns-89" → 89)
    const numStr = key.replace('hymns-', '')
    const num = parseInt(numStr, 10)
    if (isNaN(num)) continue

    const cleaned = cleanHymnContent(value.content)

    // Only use if substantial content remains after cleaning
    if (cleaned.length > 30) {
      const title = titleMap.get(num) || value.title.replace(/^\d+\.\s*/, '')
      output[String(num)] = { title, text: cleaned }
      filledCount++
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

  // Stats
  const total = Object.keys(output).length
  const withText = Object.values(output).filter(h => h.text.length > 0).length
  const empty = total - withText

  console.log(`Done!`)
  console.log(`  Total hymns: ${total}`)
  console.log(`  With lyrics: ${withText}`)
  console.log(`  Empty (no lyrics): ${empty}`)
  console.log(`  Output: ${OUTPUT}`)

  // Show a sample
  const sample = output['15']
  if (sample) {
    console.log(`\n  Sample (#15 "${sample.title}"):`)
    console.log(`    ${sample.text.slice(0, 150)}...`)
  }
}

main()
