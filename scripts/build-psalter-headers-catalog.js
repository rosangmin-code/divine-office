#!/usr/bin/env node
/**
 * build-psalter-headers-catalog.js — FR-160-C
 *
 * Convert scripts/out/psalter-headers-extract.json into the canonical
 * catalog at src/data/loth/prayers/commons/psalter-headers.rich.json.
 *
 * Per-ref: list of {kind, attribution, preface_text, page, source} so
 * the loader can return the appropriate header for the current
 * liturgical occurrence (multiple PDF positions for some psalms —
 * e.g. Psalm 51 appears 4 times across the 4-week cycle, each with
 * its own patristic/NT preface).
 *
 * Cross-reference with src/data/loth/psalter-texts.json (post-FR-160-D
 * dedup) to map "Psalm N" → canonical "Psalm N:A-B" key. Unmatched
 * psalms are recorded under `unmatched` (manual review).
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const EXTRACT_IN = resolve(REPO_ROOT, 'scripts/out/psalter-headers-extract.json')
const PSALTER_TEXTS = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const OUT = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-headers.rich.json',
)

async function main() {
  const extractRaw = await readFile(EXTRACT_IN, 'utf8')
  const extract = JSON.parse(extractRaw)
  const psalter = JSON.parse(await readFile(PSALTER_TEXTS, 'utf8'))
  const catalogKeys = Object.keys(psalter)

  // Map each "Psalm N" → list of canonical keys (verse ranges) in
  // psalter-texts.json. e.g. Psalm 67 → ['Psalm 67:2-8'].
  const refs = {}
  const unmatched = {}
  let totalEntries = 0
  for (const [psalmRef, blocks] of Object.entries(extract.refs)) {
    const psalmNumber = blocks[0].psalmNumber
    const matchingKeys = catalogKeys.filter(
      (k) =>
        k.startsWith(`Psalm ${psalmNumber}:`) ||
        k === `Psalm ${psalmNumber}`,
    )
    if (matchingKeys.length === 0) {
      unmatched[psalmRef] = blocks.map((b) => ({
        kind: b.kind,
        attribution: b.attribution,
        page: b.page,
      }))
      continue
    }
    // R1.5: per-block canonical-key resolution. When the anchor captured
    // a verse range (e.g. `Дуулал 116:1-9` → block.verseRange `'1-9'`),
    // attach the block ONLY to the exact canonical key (`Psalm 116:1-9`)
    // — preserves per-occurrence preface accuracy when the same psalm
    // appears under multiple verse-range keys with different prefaces.
    // Falls back to fan-out to all matchingKeys when:
    //   - block has no verseRange (plain `Дуулал N` anchor), OR
    //   - exact key not in catalog (verse range ≠ any psalter-texts key)
    for (const block of blocks) {
      const exactKey = block.verseRange
        ? `Psalm ${psalmNumber}:${block.verseRange}`
        : null
      const targetKeys =
        exactKey && matchingKeys.includes(exactKey)
          ? [exactKey]
          : matchingKeys
      for (const canonicalKey of targetKeys) {
        if (!refs[canonicalKey]) refs[canonicalKey] = { entries: [] }
        refs[canonicalKey].entries.push({
          kind: block.kind,
          attribution: block.attribution,
          preface_text: block.preface_text,
          page: block.page,
          source: 'extracted',
          evidence_line_range: block.evidence_line_range,
        })
        totalEntries++
      }
    }
  }

  const out = {
    _doc:
      'FR-160-C psalter-headers catalog. Patristic Father preface + NT typological citation that appear at psalm-header position in the Mongolian LOTH PDF (between "Дуулал N" title and the first verse). Loader: src/lib/prayers/rich-overlay.ts::loadPsalterHeaderRich(ref). Renderer: src/components/psalm-block.tsx — PsalterHeaderRich block above the psalm body. Multiple entries per ref are possible because the same psalm reappears in different liturgical positions (different PDF pages) with different patristic/typological prefaces. Source: scripts/extract-psalter-headers.js (raw-text pattern match against parsed_data/full_pdf.txt) → scripts/build-psalter-headers-catalog.js. PDF evidence: page + evidence_line_range[start,end] line numbers in parsed_data/full_pdf.txt. See PRD §12.1 FR-160-C, NFR-009h.',
    refs,
    unmatched,
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
  const refKeys = Object.keys(refs)
  const unmatchedKeys = Object.keys(unmatched)
  console.log(
    `[catalog] ${totalEntries} header entries across ${refKeys.length} canonical keys`,
  )
  if (unmatchedKeys.length > 0) {
    console.log(
      `[catalog] ${unmatchedKeys.length} unmatched (manual review): ${unmatchedKeys.join(', ')}`,
    )
  }
  console.log(`[catalog] OUT: ${OUT.replace(REPO_ROOT + '/', '')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
