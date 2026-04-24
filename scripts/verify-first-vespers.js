#!/usr/bin/env node
/**
 * FR-156 Phase 2 verifier. Re-runs the PDF extraction and diffs the
 * output against the firstVespers entries currently injected into
 * propers/{season}.json. Exits 1 on any byte-level mismatch, missing
 * key, or unexpected key (NFR-009c pattern).
 *
 * Usage: node scripts/verify-first-vespers.js
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { buildPageIndex, annotatePagesInPlace } = require('./lib/first-vespers-page-annotator')

const ROOT = path.resolve(__dirname, '..')
const EXTRACTED_PATH = path.join(ROOT, 'scripts', 'output', 'first-vespers-extracted.json')
const EXTRACTOR_PATH = path.join(ROOT, 'scripts', 'extract-first-vespers.js')
const PROPERS_DIR = path.join(ROOT, 'src', 'data', 'loth', 'propers')
const INJECT_PATH = path.join(ROOT, 'scripts', 'inject-first-vespers.js')

// Season → seasonWeek → psalter week — must match inject script.
const MAPPINGS = {
  advent: { '1': 1, '2': 2, '3': 3, '4': 4 },
  lent: { '1': 1, '2': 2, '3': 3, '4': 4, '5': 1, '6': 2 },
  easter: { '2': 2, '3': 3, '4': 4, '5': 1, '6': 2, '7': 3 },
  christmas: { holyFamily: 1, baptism: 1 },
  'ordinary-time': Object.fromEntries(
    Array.from({ length: 34 }, (_, i) => [String(i + 1), ((i) % 4) + 1]),
  ),
}

function buildExpectedFirstVespers(block, psalterWeek) {
  const typeKey = ['ps1', 'ps2', 'cant']
  const psalms = block.psalms.map((p, i) => {
    const entry = {
      type: p.type === 'canticle' ? 'canticle' : 'psalm',
      ref: p.ref || null,
      antiphon_key: `fv-w${psalterWeek}-sun-${typeKey[i] || `slot${i}`}`,
      default_antiphon: p.default_antiphon,
      gloria_patri: true,
    }
    if (p.seasonal_antiphons && Object.keys(p.seasonal_antiphons).length > 0) {
      entry.seasonal_antiphons = p.seasonal_antiphons
    }
    return entry
  })
  const fv = { psalms }
  if (block.shortReading) fv.shortReading = block.shortReading
  if (block.responsory) fv.responsory = block.responsory
  if (block.gospelCanticleAntiphon) fv.gospelCanticleAntiphon = block.gospelCanticleAntiphon
  if (block.intercessions && block.intercessions.length > 0) fv.intercessions = block.intercessions
  if (block.concludingPrayer) fv.concludingPrayer = block.concludingPrayer
  return fv
}

function diff(expected, actual, pathPrefix) {
  const issues = []
  if (typeof expected !== typeof actual) {
    issues.push({ path: pathPrefix, type: 'type-mismatch', expected: typeof expected, actual: typeof actual })
    return issues
  }
  if (expected === null || typeof expected !== 'object') {
    if (expected !== actual) {
      issues.push({ path: pathPrefix, type: 'value-mismatch', expected, actual })
    }
    return issues
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      issues.push({ path: pathPrefix, type: 'expected-array', actual: typeof actual })
      return issues
    }
    if (expected.length !== actual.length) {
      issues.push({ path: pathPrefix, type: 'length-mismatch', expected: expected.length, actual: actual.length })
    }
    const N = Math.max(expected.length, actual.length)
    for (let i = 0; i < N; i++) {
      issues.push(...diff(expected[i], actual[i], `${pathPrefix}[${i}]`))
    }
    return issues
  }
  // object
  const eKeys = new Set(Object.keys(expected))
  const aKeys = new Set(Object.keys(actual))
  for (const k of eKeys) {
    if (!aKeys.has(k)) {
      issues.push({ path: `${pathPrefix}.${k}`, type: 'missing-in-actual' })
    } else {
      issues.push(...diff(expected[k], actual[k], `${pathPrefix}.${k}`))
    }
  }
  for (const k of aKeys) {
    if (!eKeys.has(k)) {
      issues.push({ path: `${pathPrefix}.${k}`, type: 'unexpected-in-actual', actualValue: actual[k] })
    }
  }
  return issues
}

function main() {
  console.log('[verify-fv] re-running extractor…')
  const r = spawnSync('node', [EXTRACTOR_PATH], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) {
    console.error('[verify-fv] extractor failed')
    process.exit(r.status ?? 1)
  }
  const extracted = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))

  // Task #36 / NFR-009d — build the shared page-fingerprint index so
  // the expected block carries `*Page` fields alongside text, letting
  // the existing diff loop detect page drift in firstVespers subtrees.
  console.log('[verify-fv] building page index…')
  const pageIdx = buildPageIndex(ROOT)

  let mismatchCount = 0
  let missingCount = 0
  let unexpectedCount = 0
  const allIssues = []

  for (const [seasonFile, mapping] of Object.entries(MAPPINGS)) {
    const propersPath = path.join(PROPERS_DIR, `${seasonFile}.json`)
    const json = JSON.parse(fs.readFileSync(propersPath, 'utf8'))

    for (const [weekKey, psalterWeek] of Object.entries(mapping)) {
      const block = extracted[String(psalterWeek)]
      if (!block) continue
      const expected = buildExpectedFirstVespers(block, psalterWeek)
      annotatePagesInPlace(expected, pageIdx)
      const actual = json.weeks?.[weekKey]?.SUN?.firstVespers
      if (!actual) {
        missingCount++
        allIssues.push({ season: seasonFile, weekKey, type: 'missing-firstVespers' })
        continue
      }
      const issues = diff(expected, actual, `${seasonFile}.weeks[${weekKey}].SUN.firstVespers`)
      for (const iss of issues) {
        if (iss.type === 'missing-in-actual') missingCount++
        else if (iss.type === 'unexpected-in-actual') unexpectedCount++
        else mismatchCount++
      }
      allIssues.push(...issues)
    }
  }

  console.log(`\n[verify-fv] results:`)
  console.log(`  mismatch:   ${mismatchCount}`)
  console.log(`  missing:    ${missingCount}`)
  console.log(`  unexpected: ${unexpectedCount}`)

  if (allIssues.length > 0) {
    console.log(`\n[verify-fv] first 20 issues:`)
    for (const iss of allIssues.slice(0, 20)) {
      console.log('  ', JSON.stringify(iss))
    }
    process.exit(1)
  }
  console.log('[verify-fv] PASS — all firstVespers entries match PDF extraction byte-for-byte.')
}

main()
