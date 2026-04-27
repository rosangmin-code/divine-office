#!/usr/bin/env node
/**
 * dedup-psalter-keys.js — FR-160-D
 *
 * Read scripts/out/psalter-key-dedup-audit.json and apply the canonical
 * mapping:
 *   1) For every redundant_key → canonical_key pair, walk all *.json
 *      under src/data/loth/{psalter,propers,sanctoral} + ordinarium
 *      and rewrite quoted occurrences "<redundant>" to "<canonical>".
 *   2) Same rewrite across e2e/**\/*.{ts,tsx,spec.ts}.
 *   3) Delete the redundant entries from src/data/loth/psalter-texts.json
 *      (in-place, alphabetical key order preserved per existing layout).
 *   4) The .rich.json catalog is regenerated separately by
 *      build-psalter-texts-rich.mjs (caller runs it after this script).
 *
 * Atomic A4 amendment: if `--amend-allowlist` is passed, also rewrite
 * src/data/loth/refrain-allowlist.json keys (entries[i].ref) per the
 * same map. Required when an allowlist entry's ref becomes redundant
 * — its canonical replaces it so the allowlist consult continues to
 * fire after dedup.
 *
 * Flags:
 *   --dry-run             — print rewrites without modifying files
 *   --amend-allowlist     — also rewrite refrain-allowlist.json refs
 *   --check               — exit 1 if redundant > 0 (CI uniqueness gate)
 */

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const AUDIT_JSON = resolve(REPO_ROOT, 'scripts/out/psalter-key-dedup-audit.json')
const PSALTER_TEXTS = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const ALLOWLIST = resolve(REPO_ROOT, 'src/data/loth/refrain-allowlist.json')
const SCAN_DIRS = [
  resolve(REPO_ROOT, 'src/data/loth/psalter'),
  resolve(REPO_ROOT, 'src/data/loth/propers'),
  resolve(REPO_ROOT, 'src/data/loth/sanctoral'),
  resolve(REPO_ROOT, 'src/data/loth/ordinarium'),
  resolve(REPO_ROOT, 'src/data/loth/prayers'),
  resolve(REPO_ROOT, 'e2e'),
  resolve(REPO_ROOT, 'src/lib/__tests__'),
]
const SCAN_EXTS = ['.json', '.ts', '.tsx']

function* walkFiles(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = resolve(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      yield* walkFiles(full)
    } else if (SCAN_EXTS.some((e) => name.endsWith(e))) {
      yield full
    }
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const amendAllowlist = args.has('--amend-allowlist')
  const checkMode = args.has('--check')

  if (!existsSync(AUDIT_JSON)) {
    console.error(`[dedup] missing audit: ${AUDIT_JSON}. Run audit-psalter-key-dedup.js first.`)
    process.exit(1)
  }
  const audit = JSON.parse(await readFile(AUDIT_JSON, 'utf8'))

  if (checkMode) {
    if (audit.redundantKeyCount === 0) {
      console.log('[dedup --check] OK — no redundant keys.')
      process.exit(0)
    }
    console.error(`[dedup --check] FAIL — ${audit.redundantKeyCount} redundant keys across ${audit.duplicateGroupCount} groups (run audit-psalter-key-dedup.js for details).`)
    process.exit(1)
  }

  // Build redundant → canonical map
  const renameMap = new Map()
  for (const g of audit.groups) {
    for (const r of g.redundant) renameMap.set(r, g.canonical)
  }
  console.log(`[dedup] ${renameMap.size} redundant keys to redirect across ${audit.groups.length} groups`)

  // 1) Walk + rewrite external files (NOT psalter-texts.json itself —
  //    that's handled in step 3 by entry deletion). Allowlist file is
  //    explicitly added when --amend-allowlist is set (its parent dir
  //    is not in SCAN_DIRS to avoid scanning the catalog itself).
  let totalReplacements = 0
  const filesTouched = []
  const filesToScan = new Set()
  for (const dir of SCAN_DIRS) {
    for (const f of walkFiles(dir)) filesToScan.add(f)
  }
  if (amendAllowlist && existsSync(ALLOWLIST)) filesToScan.add(ALLOWLIST)
  for (const f of filesToScan) {
    if (f === PSALTER_TEXTS) continue // skip catalog itself
    const content = readFileSync(f, 'utf8')
    let out = content
    let fileReplacements = 0
    for (const [redundant, canonical] of renameMap) {
      // match exact quoted string
      const re = new RegExp(`"${escapeRegex(redundant)}"`, 'g')
      const before = out
      out = out.replace(re, `"${canonical}"`)
      if (out !== before) {
        const count = (before.match(re) || []).length
        fileReplacements += count
      }
    }
    if (fileReplacements > 0) {
      filesTouched.push({ path: f, replacements: fileReplacements })
      totalReplacements += fileReplacements
      if (!dryRun) writeFileSync(f, out, 'utf8')
    }
  }
  console.log(`[dedup] external rewrites: ${totalReplacements} occurrences across ${filesTouched.length} files`)
  for (const t of filesTouched) {
    console.log(`  ${t.path.replace(REPO_ROOT + '/', '')}  (×${t.replacements})`)
  }

  // 2) Delete redundant entries from psalter-texts.json
  const catalogRaw = await readFile(PSALTER_TEXTS, 'utf8')
  const catalog = JSON.parse(catalogRaw)
  let deleted = 0
  for (const redundant of renameMap.keys()) {
    if (Object.prototype.hasOwnProperty.call(catalog, redundant)) {
      delete catalog[redundant]
      deleted++
    }
  }
  console.log(`[dedup] psalter-texts.json: deleted ${deleted} redundant entries`)
  if (!dryRun) {
    // preserve formatting (4-space indent, trailing newline)
    writeFileSync(PSALTER_TEXTS, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  }

  if (dryRun) {
    console.log('[dedup] DRY RUN — no files were written.')
  } else {
    console.log('[dedup] DONE. Re-run scripts/build-psalter-texts-rich.mjs to regenerate the rich catalog.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
