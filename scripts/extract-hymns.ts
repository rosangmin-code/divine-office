/**
 * Extract hymn lyrics from divine-office-reader's parsed data and generate
 * `src/data/loth/ordinarium/hymns.json` for the divine office app.
 *
 * Source: ../divine-office-reader/public/data/content/hymns.json
 * Output: src/data/loth/ordinarium/hymns.json
 *
 * Parsing is delegated to `scripts/parsers/hymn-parser.ts`, which implements
 * the structure-specific cleanup (preamble / TOC stripping, refrain handling).
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseHymn } from './parsers/hymn-parser.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const READER_HYMNS = path.resolve(__dirname, '../../divine-office-reader/public/data/content/hymns.json')
const HYMNS_INDEX = path.resolve(__dirname, '../src/data/loth/ordinarium/hymns-index.json')
const OUTPUT = path.resolve(__dirname, '../src/data/loth/ordinarium/hymns.json')

interface IndexEntry { number: number; title: string }
interface ReaderEntry { title: string; titleMn?: string; content: string }

function main() {
  const readerData: Record<string, ReaderEntry> = JSON.parse(fs.readFileSync(READER_HYMNS, 'utf-8'))
  const indexData: { hymns: IndexEntry[] } = JSON.parse(fs.readFileSync(HYMNS_INDEX, 'utf-8'))

  const output: Record<string, { title: string; text: string }> = {}
  const knownTitles = new Set<string>()
  for (const h of indexData.hymns) {
    output[String(h.number)] = { title: h.title, text: '' }
    knownTitles.add(h.title)
  }

  const warnings: string[] = []
  let filled = 0

  for (const [key, value] of Object.entries(readerData)) {
    if (!key.startsWith('hymns-')) continue
    const num = parseInt(key.slice('hymns-'.length), 10)
    if (isNaN(num)) continue

    const entry = output[String(num)]
    if (!entry) continue

    const parsed = parseHymn(value.content, { knownTitles })
    if (parsed.value) {
      entry.text = parsed.value.text
      filled++
    } else {
      const diag = parsed.diagnostics.map(d => d.message).join('; ')
      warnings.push(`#${num} (${entry.title}): ${diag}`)
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8')

  const total = Object.keys(output).length
  console.log('Done.')
  console.log(`  Total hymns:   ${total}`)
  console.log(`  With lyrics:   ${filled}`)
  console.log(`  Empty (no lyrics): ${total - filled}`)
  console.log(`  Output:        ${OUTPUT}`)
  if (warnings.length) {
    console.log(`\n  Hymns with no body detected (${warnings.length}):`)
    for (const w of warnings) console.log('    - ' + w)
  }
}

main()
