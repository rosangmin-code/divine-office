#!/usr/bin/env node
/**
 * patch-compline-pages.js
 *
 * Applies scripts/out/compline-page-corrections.json to
 * src/data/loth/ordinarium/compline.json. Uses a small dotted+bracket
 * path walker to support compline's mixed locator shapes:
 *   examen, days.SUN.psalms[0], days.SUN.shortReading,
 *   days.SUN.concludingPrayer, responsory, nuncDimittis, blessing,
 *   anteMarian.salveRegina, anteMarian.alternatives[0]
 *
 * Each leaf object has a `.page` property to replace.
 *
 * Usage: node scripts/patch-compline-pages.js [--dry-run]
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PATCH_FILE = path.join(ROOT, 'scripts/out/compline-page-corrections.json')

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
    if (node == null) throw new Error(`null encountered before segment ${seg}`)
    node = node[seg]
  }
  if (!node || typeof node !== 'object') {
    throw new Error(`final node is not an object`)
  }
  return node
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`=== patch-compline-pages ${dryRun ? '(dry-run)' : ''} ===`)
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
        const node = walk(data, parseSegments(entry.locator))
        if (node.page !== entry.from) {
          console.error(`  FAIL ${relFile} ${entry.locator}: expected ${entry.from}, found ${node.page}`)
          failures++
          continue
        }
        console.log(`  ${relFile}  ${entry.locator}  ${entry.from} → ${entry.to}`)
        node.page = entry.to
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
