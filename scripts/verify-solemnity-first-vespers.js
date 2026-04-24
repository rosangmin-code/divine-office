#!/usr/bin/env node
/**
 * FR-156 Phase 3b verifier. Re-runs the PDF extraction, rebuilds the
 * expected firstVespers payload, and diffs it against the injected
 * sanctoral/{solemnities,feasts}.json entries. Exits 1 on any
 * byte-level mismatch, missing key, or unexpected key (NFR-009c
 * pattern, mirrors scripts/verify-first-vespers.js).
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { buildPageIndex, annotatePagesInPlace } = require('./lib/first-vespers-page-annotator')

const ROOT = path.resolve(__dirname, '..')
const EXTRACTOR_PATH = path.join(ROOT, 'scripts', 'extract-solemnity-first-vespers.js')
const EXTRACTED_PATH = path.join(ROOT, 'scripts', 'output', 'solemnity-first-vespers-extracted.json')
const SANCTORAL_DIR = path.join(ROOT, 'src', 'data', 'loth', 'sanctoral')

function buildExpectedFirstVespers(block, antiphonKeyPrefix) {
  const typeKey = ['ps1', 'ps2', 'cant']
  const fv = {}
  if (block.psalms && block.psalms.length > 0) {
    fv.psalms = block.psalms.map((p, i) => {
      const entry = {
        type: p.type === 'canticle' ? 'canticle' : 'psalm',
        ref: p.ref || null,
        antiphon_key: `${antiphonKeyPrefix}-${typeKey[i] || `slot${i}`}`,
        default_antiphon: p.default_antiphon,
        gloria_patri: true,
      }
      if (p.seasonal_antiphons && Object.keys(p.seasonal_antiphons).length > 0) {
        entry.seasonal_antiphons = p.seasonal_antiphons
      }
      return entry
    })
  }
  if (block.shortReading) fv.shortReading = block.shortReading
  if (block.responsory) fv.responsory = block.responsory
  if (block.gospelCanticleAntiphon) fv.gospelCanticleAntiphon = block.gospelCanticleAntiphon
  if (block.intercessions && block.intercessions.length > 0) fv.intercessions = block.intercessions
  if (block.concludingPrayer) fv.concludingPrayer = block.concludingPrayer
  if (block.alternativeConcludingPrayer) fv.alternativeConcludingPrayer = block.alternativeConcludingPrayer
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
  console.log('[verify-solemnity-fv] re-running extractor…')
  const r = spawnSync('node', [EXTRACTOR_PATH], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) {
    console.error('[verify-solemnity-fv] extractor failed')
    process.exit(r.status ?? 1)
  }
  const extracted = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))
  const solemnities = JSON.parse(fs.readFileSync(path.join(SANCTORAL_DIR, 'solemnities.json'), 'utf8'))
  const feasts = JSON.parse(fs.readFileSync(path.join(SANCTORAL_DIR, 'feasts.json'), 'utf8'))

  // Task #36 / NFR-009d — enrich expected with fingerprinted pages so
  // the diff detects page drift on firstVespers fields.
  console.log('[verify-solemnity-fv] building page index…')
  const pageIdx = buildPageIndex(ROOT)

  let mismatchCount = 0
  let missingCount = 0
  let unexpectedCount = 0
  const allIssues = []

  for (const [key, block] of Object.entries(extracted.fixed)) {
    const { _meta, ...data } = block
    const rank = _meta?.rank ?? 'SOLEMNITY'
    const prefix = `${rank === 'FEAST' ? 'feast' : 'solemnity'}-${key}`
    const expected = buildExpectedFirstVespers(data, prefix)
    annotatePagesInPlace(expected, pageIdx)

    // Find actual in either sanctoral file.
    const sEntry = solemnities[key]
    const fEntry = feasts[key]
    const actualContainer = sEntry?.firstVespers ? { source: 'solemnities', fv: sEntry.firstVespers }
      : fEntry?.firstVespers ? { source: 'feasts', fv: fEntry.firstVespers }
      : null

    if (!actualContainer) {
      missingCount++
      allIssues.push({ key, type: 'missing-firstVespers' })
      continue
    }

    const issues = diff(expected, actualContainer.fv, `${actualContainer.source}.${key}.firstVespers`)
    for (const iss of issues) {
      if (iss.type === 'missing-in-actual') missingCount++
      else if (iss.type === 'unexpected-in-actual') unexpectedCount++
      else mismatchCount++
    }
    allIssues.push(...issues)
  }

  console.log(`\n[verify-solemnity-fv] results:`)
  console.log(`  mismatch:   ${mismatchCount}`)
  console.log(`  missing:    ${missingCount}`)
  console.log(`  unexpected: ${unexpectedCount}`)

  if (allIssues.length > 0) {
    console.log(`\n[verify-solemnity-fv] first 20 issues:`)
    for (const iss of allIssues.slice(0, 20)) {
      console.log('  ', JSON.stringify(iss))
    }
    process.exit(1)
  }
  console.log('[verify-solemnity-fv] PASS — all solemnity/feast firstVespers entries match PDF extraction byte-for-byte.')
}

main()
