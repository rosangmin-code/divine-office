#!/usr/bin/env node
/**
 * patch-sanctoral-pages.js
 *
 * Applies scripts/out/sanctoral-page-corrections.json to
 * src/data/loth/sanctoral/*.json. Same locator/targetField protocol as
 * patch-propers-pages.js.
 *
 * Usage: node scripts/patch-sanctoral-pages.js [--dry-run]
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PATCH_FILE = path.join(ROOT, 'scripts/out/sanctoral-page-corrections.json')

function parseSegments(locator) {
  const out = []
  for (const part of locator.split('.')) {
    const m = part.match(/^([^\[]+)(\[(\d+)\])?$/)
    if (!m) throw new Error(`bad segment "${part}" in "${locator}"`)
    out.push(m[1])
    if (m[2] !== undefined) out.push(parseInt(m[3], 10))
  }
  return out
}

function walk(data, segments) {
  let node = data
  for (const seg of segments) {
    if (node == null) throw new Error(`null before segment ${seg}`)
    node = node[seg]
  }
  return node
}

function applyEntry(data, entry) {
  const segs = parseSegments(entry.locator)
  if (entry.targetField === 'page') {
    const node = walk(data, segs)
    if (!node || typeof node !== 'object') throw new Error(`not an object at ${entry.locator}`)
    if (node.page !== entry.from) throw new Error(`expected ${entry.from}, found ${node.page}`)
    node.page = entry.to
    return
  }
  const lastKey = segs.pop()
  const parent = walk(data, segs)
  if (!parent || typeof parent !== 'object') throw new Error(`no parent for ${entry.locator}`)
  if (parent[lastKey] !== entry.from) throw new Error(`expected ${entry.from}, found ${parent[lastKey]}`)
  parent[lastKey] = entry.to
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`=== patch-sanctoral-pages ${dryRun ? '(dry-run)' : ''} ===`)
  console.log(`patch file: ${path.relative(ROOT, PATCH_FILE)}`)

  const patch = JSON.parse(fs.readFileSync(PATCH_FILE, 'utf8'))
  if (patch.version !== 1) { console.error(`FAIL: unknown patch version ${patch.version}`); process.exit(1) }

  const filesToWrite = []
  let applied = 0
  let failures = 0

  for (const [relFile, entries] of Object.entries(patch.files || {})) {
    const abs = path.join(ROOT, relFile)
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'))
    let changed = false
    for (const entry of entries) {
      try {
        applyEntry(data, entry)
        console.log(`  ${relFile}  ${entry.locator}  ${entry.from} → ${entry.to}`)
        applied++
        changed = true
      } catch (e) {
        console.error(`  FAIL ${relFile} ${entry.locator}: ${e.message}`)
        failures++
      }
    }
    if (changed) filesToWrite.push({ abs, data })
  }

  if (failures > 0) { console.error(`\n${failures} precondition failure(s) — refusing to write.`); process.exit(1) }
  if (dryRun) { console.log(`\ndry-run: ${applied} correction(s); nothing written.`); process.exit(0) }
  for (const { abs, data } of filesToWrite) {
    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  console.log(`\napplied ${applied} correction(s).`)
}

main()
