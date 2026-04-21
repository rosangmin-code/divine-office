#!/usr/bin/env node
/**
 * patch-psalter-body-pages.js
 *
 * Applies verified corrections from scripts/out/psalter-body-page-corrections.json
 * to src/data/loth/psalter/week-{1..4}.json. Patches shortReading.page,
 * responsory.page, intercessionsPage, concludingPrayerPage.
 *
 * Safety: asserts current value matches `from` before mutating.
 *
 * Usage:
 *   node scripts/patch-psalter-body-pages.js
 *   node scripts/patch-psalter-body-pages.js --dry-run
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PATCH_FILE = path.join(ROOT, 'scripts/out/psalter-body-page-corrections.json')

function parseLocator(locator) {
  const m = locator.match(/^days\.([A-Z]+)\.([a-z]+)\.(shortReading|responsory|intercessionsPage|concludingPrayerPage)$/)
  if (!m) throw new Error(`Unparseable locator: ${locator}`)
  return { day: m[1], hour: m[2], field: m[3] }
}

function readCurrent(data, loc) {
  const hour = data.days?.[loc.day]?.[loc.hour]
  if (!hour || typeof hour !== 'object') {
    throw new Error(`No hour at days.${loc.day}.${loc.hour}`)
  }
  if (loc.field === 'shortReading' || loc.field === 'responsory') {
    const obj = hour[loc.field]
    if (!obj || typeof obj !== 'object') throw new Error(`No ${loc.field} at days.${loc.day}.${loc.hour}`)
    return { get: () => obj.page, set: v => { obj.page = v } }
  }
  // parallel keys
  return { get: () => hour[loc.field], set: v => { hour[loc.field] = v } }
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`=== patch-psalter-body-pages ${dryRun ? '(dry-run)' : ''} ===`)
  console.log(`patch file: ${path.relative(ROOT, PATCH_FILE)}`)

  const patch = JSON.parse(fs.readFileSync(PATCH_FILE, 'utf8'))
  if (patch.version !== 1) {
    console.error(`FAIL: unknown patch version ${patch.version}`)
    process.exit(1)
  }

  const filesToWrite = []
  let applied = 0
  let failures = 0

  for (const [relFile, entries] of Object.entries(patch.files || {})) {
    const abs = path.join(ROOT, relFile)
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'))
    let changed = false
    for (const entry of entries) {
      try {
        const loc = parseLocator(entry.locator)
        const ref = readCurrent(data, loc)
        const current = ref.get()
        if (current !== entry.from) {
          console.error(`  FAIL ${relFile} ${entry.locator}: expected ${entry.from}, found ${current}`)
          failures++
          continue
        }
        console.log(`  ${relFile}  ${entry.locator}  ${entry.from} → ${entry.to}`)
        ref.set(entry.to)
        applied++
        changed = true
      } catch (e) {
        console.error(`  FAIL ${relFile} ${entry.locator}: ${e.message}`)
        failures++
      }
    }
    if (changed) filesToWrite.push({ abs, data })
  }

  if (failures > 0) {
    console.error(`\n${failures} precondition failure(s) — refusing to write.`)
    process.exit(1)
  }
  if (dryRun) {
    console.log(`\ndry-run: ${applied} correction(s) across ${filesToWrite.length} file(s); nothing written.`)
    process.exit(0)
  }
  for (const { abs, data } of filesToWrite) {
    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  console.log(`\napplied ${applied} correction(s) across ${filesToWrite.length} file(s).`)
}

main()
