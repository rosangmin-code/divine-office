#!/usr/bin/env node
/**
 * verify-page-redirect-bodies.js
 *
 * FR-160-B PR-10 — build-time gate for the PageRedirect inline body
 * hydrate path. Iterates the ordinarium-key catalog and asserts each
 * `sourcePath` resolves to existing JSON + a non-null pointer target.
 * Catches catalog→ordinarium drift before runtime hits it (Layer 4.5
 * fail-hard).
 *
 * Read-only. Exits 0 on success, 1 on validation failure.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'src/data/loth/ordinarium-key-catalog.json')

function parseSourcePath(sourcePath) {
  const hashIdx = sourcePath.indexOf('#')
  if (hashIdx < 0) return { file: sourcePath, pointer: [] }
  const file = sourcePath.slice(0, hashIdx)
  const fragment = sourcePath.slice(hashIdx + 1)
  const pointer = fragment.length === 0 ? [] : fragment.split('.')
  return { file, pointer }
}

function resolvePointer(root, pointer) {
  let cur = root
  for (const segment of pointer) {
    if (cur == null || typeof cur !== 'object') return { ok: false, hit: segment }
    if (!Object.prototype.hasOwnProperty.call(cur, segment)) {
      return { ok: false, hit: segment, available: Object.keys(cur).slice(0, 8) }
    }
    cur = cur[segment]
  }
  return { ok: true, value: cur }
}

function main() {
  const errors = []
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`[verify-page-redirect-bodies] catalog not found at ${CATALOG_PATH}`)
    process.exit(1)
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'))
  const entries = catalog.entries || {}
  const keys = Object.keys(entries)
  if (keys.length !== 9) {
    errors.push(`expected 9 catalog keys, found ${keys.length}: ${keys.join(',')}`)
  }

  let totalHydrated = 0
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry.sourcePath) {
      errors.push(`${key}: catalog entry has no sourcePath (PR-10 hydrate would fail)`)
      continue
    }
    const { file, pointer } = parseSourcePath(entry.sourcePath)
    const abs = path.join(ROOT, file)
    if (!fs.existsSync(abs)) {
      errors.push(`${key}: sourcePath file does not exist (${file})`)
      continue
    }
    let data
    try {
      data = JSON.parse(fs.readFileSync(abs, 'utf-8'))
    } catch (err) {
      errors.push(`${key}: sourcePath file JSON parse failed (${file}): ${err.message}`)
      continue
    }
    const result = resolvePointer(data, pointer)
    if (!result.ok) {
      const ctx = result.available ? ` (available: ${result.available.join(', ')})` : ''
      errors.push(
        `${key}: pointer "${pointer.join('.')}" unresolved at segment "${result.hit}" in ${file}${ctx}`,
      )
      continue
    }
    if (result.value == null) {
      errors.push(`${key}: pointer resolved to null/undefined at ${entry.sourcePath}`)
      continue
    }
    totalHydrated += 1
  }

  if (errors.length > 0) {
    console.error(`[verify-page-redirect-bodies] ${errors.length} error(s):`)
    for (const e of errors) console.error(`  ${e}`)
    process.exit(1)
  }
  console.log(
    `[verify-page-redirect-bodies] OK — ${totalHydrated}/${keys.length} ordinariumKey bodies hydrate cleanly`,
  )
}

main()
