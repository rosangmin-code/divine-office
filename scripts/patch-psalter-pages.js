#!/usr/bin/env node
/**
 * patch-psalter-pages.js
 *
 * Applies verified corrections from scripts/out/psalter-page-corrections.json
 * to src/data/loth/psalter/week-{1..4}.json. Safety: asserts each entry's
 * current (ref, page) matches the patch file's (ref, from) before mutating.
 *
 * Usage:
 *   node scripts/patch-psalter-pages.js              # apply
 *   node scripts/patch-psalter-pages.js --dry-run    # preview diff only
 *
 * Must be run after scripts/verify-psalter-pages.js has produced the patch
 * file. Exit 0 on success, 1 on any precondition mismatch.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PATCH_FILE = path.join(ROOT, 'scripts/out/psalter-page-corrections.json')

function parseLocator(locator) {
  // locator: "days.<DAY>.<hour>.psalms[<i>]"
  const m = locator.match(/^days\.([A-Z]+)\.([a-z]+)\.psalms\[(\d+)\]$/)
  if (!m) throw new Error(`Unparseable locator: ${locator}`)
  return { day: m[1], hour: m[2], idx: parseInt(m[3], 10) }
}

function resolveEntry(data, locator) {
  const { day, hour, idx } = parseLocator(locator)
  const hourData = data.days?.[day]?.[hour]
  if (!hourData || typeof hourData !== 'object') {
    throw new Error(`No hour data at days.${day}.${hour}`)
  }
  const psalms = hourData.psalms
  if (!Array.isArray(psalms) || idx >= psalms.length) {
    throw new Error(`No psalm at ${locator}`)
  }
  return psalms[idx]
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`=== patch-psalter-pages ${dryRun ? '(dry-run)' : ''} ===`)
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
    let fileChanged = false
    for (const entry of entries) {
      try {
        const target = resolveEntry(data, entry.locator)
        if (target.ref !== entry.ref) {
          console.error(`  FAIL ${relFile} ${entry.locator}: ref mismatch — expected "${entry.ref}", found "${target.ref}"`)
          failures++
          continue
        }
        if (target.page !== entry.from) {
          console.error(`  FAIL ${relFile} ${entry.locator} "${entry.ref}": page mismatch — expected ${entry.from}, found ${target.page}`)
          failures++
          continue
        }
        console.log(`  ${relFile}  ${entry.locator}  "${entry.ref}"  ${entry.from} → ${entry.to}`)
        target.page = entry.to
        applied++
        fileChanged = true
      } catch (e) {
        console.error(`  FAIL ${relFile} ${entry.locator}: ${e.message}`)
        failures++
      }
    }
    if (fileChanged) filesToWrite.push({ abs, relFile, data })
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
  process.exit(0)
}

main()
