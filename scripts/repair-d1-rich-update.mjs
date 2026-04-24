#!/usr/bin/env node
/**
 * Task #42 — targeted rich-catalog update for the 6 psalter-texts.json
 * entries repaired by `repair-d1-psalter-entries.js`. Running the full
 * `build-psalter-texts-rich.mjs` would wipe the `psalmPrayerRich` fields
 * (which live on the same catalog), so this script surgically rebuilds
 * `stanzasRich` for just the 6 target refs and leaves the rest
 * (including psalmPrayerRich) intact.
 *
 * Usage: node scripts/repair-d1-rich-update.mjs
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPsalterStanzasRich } from './parsers/rich-builder.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const SRC_IN = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const CATALOG = resolve(REPO_ROOT, 'src/data/loth/prayers/commons/psalter-texts.rich.json')

const TARGETS = [
  'Psalm 116:1-9',
  'Psalm 121:1-8',
  'Psalm 97:1-12',
  'Psalm 51:3-19',
  'Psalm 139:23-24',
  'Psalm 139:1-18',
]

async function main() {
  const src = JSON.parse(await readFile(SRC_IN, 'utf8'))
  const catalog = JSON.parse(await readFile(CATALOG, 'utf8'))

  let updated = 0
  for (const ref of TARGETS) {
    const entry = src[ref]
    if (!entry || !Array.isArray(entry.stanzas)) {
      console.error(`  [skip] ${ref}: no stanzas in source`)
      continue
    }
    const result = buildPsalterStanzasRich({ stanzas: entry.stanzas })
    if (!result.pass) {
      console.error(`  [FAIL] ${ref}: gate failed — skipping stanzasRich update`)
      continue
    }
    if (!catalog[ref]) catalog[ref] = {}
    catalog[ref].stanzasRich = {
      blocks: result.blocks,
      source: { kind: 'common', id: `psalter-text-${ref}` },
    }
    console.log(`  [ok] ${ref}: stanzasRich updated (${entry.stanzas.length} stanzas)`)
    updated++
  }

  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${CATALOG} — ${updated} stanzasRich entries updated.`)
}

main()
