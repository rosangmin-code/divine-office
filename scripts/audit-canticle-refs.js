#!/usr/bin/env node
/**
 * Audit canticle entries across week-{1..4}.json psalter files.
 *
 * - Collects every entry with type === 'canticle'.
 * - Flags duplicate refs that appear in more than one (week, day, hour) slot
 *   (strong signal of a copy-paste bug).
 * - Verifies that each ref has a matching body in psalter-texts.json.
 *
 * Usage:
 *   node scripts/audit-canticle-refs.js            # human-readable report
 *   node scripts/audit-canticle-refs.js --json     # machine-readable JSON
 */

const fs = require('fs')
const path = require('path')

const BASE = path.join(__dirname, '..')
const PSALTER_DIR = path.join(BASE, 'src', 'data', 'loth', 'psalter')
const TEXTS_PATH = path.join(BASE, 'src', 'data', 'loth', 'psalter-texts.json')

const HOURS = ['officeOfReadings', 'lauds', 'vespers']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function collect(typeFilter) {
  const entries = []
  for (let w = 1; w <= 4; w++) {
    const file = path.join(PSALTER_DIR, `week-${w}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const day of DAYS) {
      const dayData = data.days?.[day]
      if (!dayData) continue
      for (const hour of HOURS) {
        const hourData = dayData[hour]
        if (!hourData?.psalms) continue
        hourData.psalms.forEach((p, index) => {
          if (!typeFilter || p.type === typeFilter) {
            entries.push({
              week: w,
              day,
              hour,
              position: index + 1,
              type: p.type,
              ref: p.ref,
              title: p.title || null,
              antiphon_key: p.antiphon_key || null,
              default_antiphon: p.default_antiphon || null,
              page: p.page || null,
            })
          }
        })
      }
    }
  }
  return entries
}

function findDuplicates(entries) {
  const byRef = new Map()
  for (const e of entries) {
    if (!byRef.has(e.ref)) byRef.set(e.ref, [])
    byRef.get(e.ref).push(e)
  }
  const dups = []
  for (const [ref, occ] of byRef) {
    if (occ.length > 1) {
      dups.push({ ref, occurrences: occ })
    }
  }
  return dups
}

function missingBodies(entries, texts) {
  const missing = []
  const seen = new Set()
  for (const e of entries) {
    if (seen.has(e.ref)) continue
    seen.add(e.ref)
    if (!texts[e.ref]) missing.push(e.ref)
  }
  return missing
}

function main() {
  const asJson = process.argv.includes('--json')
  const onlyCanticles = process.argv.includes('--canticles-only')
  const entries = collect(onlyCanticles ? 'canticle' : null)
  const texts = JSON.parse(fs.readFileSync(TEXTS_PATH, 'utf8'))
  const dups = findDuplicates(entries)
  const missing = missingBodies(entries, texts)

  if (asJson) {
    console.log(JSON.stringify({ entries, duplicates: dups, missing_bodies: missing }, null, 2))
    return
  }

  console.log(`Total canticle entries: ${entries.length}`)
  console.log(`Unique refs: ${new Set(entries.map((e) => e.ref)).size}`)
  console.log(`Duplicate refs (same ref in multiple slots): ${dups.length}`)
  console.log(`Refs with missing body in psalter-texts.json: ${missing.length}\n`)

  if (dups.length) {
    console.log('=== DUPLICATES (candidate bugs) ===')
    for (const d of dups) {
      console.log(`\n  ref: "${d.ref}"`)
      for (const o of d.occurrences) {
        console.log(`    W${o.week} ${o.day} ${o.hour} pos${o.position} (page ${o.page})`)
      }
    }
    console.log()
  }

  if (missing.length) {
    console.log('=== MISSING BODIES ===')
    for (const r of missing) console.log(`  ${r}`)
    console.log()
  }

  if (!onlyCanticles) {
    // Don't print full inventory when scanning everything (too noisy)
    if (dups.length > 0 || missing.length > 0) process.exitCode = 1
    return
  }

  console.log('=== FULL INVENTORY (W/day/hour/pos → ref) ===')
  for (const e of entries) {
    console.log(
      `  W${e.week} ${e.day} ${e.hour.padEnd(16)} pos${e.position} page=${String(e.page).padEnd(4)} ${e.ref}`,
    )
  }

  if (dups.length > 0) {
    process.exitCode = 1
  }
}

main()
