#!/usr/bin/env node
/**
 * verify-page-redirects.js
 *
 * FR-160-B PR-1 — schema gate for `HourPropers.pageRedirects` plus the
 * ordinarium-key-catalog itself.
 *
 * Validates:
 *   1. src/data/loth/ordinarium-key-catalog.json against the Zod schema
 *   2. every propers/sanctoral JSON's `pageRedirects` arrays
 *   3. every redirect's ordinariumKey is registered in the catalog
 *
 * PR-1 expectation: no propers carry the field yet, so the verifier
 * passes after only validating the catalog (build-time gate exists for
 * B3 marking).
 *
 * Read-only. Exits 0 on success, 1 on validation failure.
 */

const fs = require('fs')
const path = require('path')
const { z } = require('zod')

const ROOT = path.resolve(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'src/data/loth/ordinarium-key-catalog.json')

const ordinariumKeyEnum = z.enum([
  'benedictus',
  'magnificat',
  'nunc-dimittis',
  'dismissal-blessing',
  'compline-responsory',
  'common-prayers',
  'gloria-patri',
  'invitatory-psalms',
  'hymns',
])

const sectionEnum = z.enum([
  'invitatory',
  'hymn',
  'psalmody',
  'shortReading',
  'responsory',
  'gospelCanticle',
  'intercessions',
  'concludingPrayer',
  'dismissal',
])

const evidencePdfSchema = z.object({
  page: z.number().int().min(1),
  line: z.number().int().min(0).optional(),
  text: z.string().min(1),
})

const pageRedirectSchema = z.object({
  redirectId: z.string().min(1),
  ordinariumKey: ordinariumKeyEnum,
  page: z.number().int().min(1).max(969),
  label: z.string().min(1),
  appliesAt: sectionEnum,
  evidencePdf: evidencePdfSchema,
})

const catalogSchema = z.object({
  $comment: z.string().optional(),
  entries: z.record(
    ordinariumKeyEnum,
    z.object({
      kind: z.enum(['fixed', 'variable']),
      page: z.number().int().min(1).max(969),
      label: z.string().min(1),
      sourcePath: z.string().min(1).optional(),
    }),
  ),
})

const PROPERS_FILES = [
  'src/data/loth/propers/advent.json',
  'src/data/loth/propers/christmas.json',
  'src/data/loth/propers/lent.json',
  'src/data/loth/propers/easter.json',
  'src/data/loth/propers/ordinary-time.json',
]

const SANCTORAL_FILES = [
  'src/data/loth/sanctoral/solemnities.json',
  'src/data/loth/sanctoral/feasts.json',
  'src/data/loth/sanctoral/memorials.json',
  'src/data/loth/sanctoral/optional-memorials.json',
]

function loadCatalog(errors) {
  if (!fs.existsSync(CATALOG_PATH)) {
    errors.push({ file: 'ordinarium-key-catalog.json', locator: '(root)', message: 'catalog not found' })
    return null
  }
  const raw = fs.readFileSync(CATALOG_PATH, 'utf-8')
  let json
  try {
    json = JSON.parse(raw)
  } catch (err) {
    errors.push({ file: 'ordinarium-key-catalog.json', locator: '(root)', message: `JSON parse failed: ${err.message}` })
    return null
  }
  const result = catalogSchema.safeParse(json)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        file: 'ordinarium-key-catalog.json',
        locator: issue.path.join('.') || '(root)',
        message: issue.message,
      })
    }
    return null
  }
  return result.data.entries
}

function* iterRedirectArrays(node, locator) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* iterRedirectArrays(node[i], `${locator}[${i}]`)
    }
    return
  }
  for (const [key, val] of Object.entries(node)) {
    if (key === 'pageRedirects' && Array.isArray(val)) {
      yield { array: val, locator: `${locator}.pageRedirects` }
      continue
    }
    yield* iterRedirectArrays(val, `${locator}.${key}`)
  }
}

function checkFile(relPath, catalog, errors) {
  const full = path.join(ROOT, relPath)
  if (!fs.existsSync(full)) return { redirectCount: 0, fileFound: false }
  const raw = fs.readFileSync(full, 'utf-8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    errors.push({ file: relPath, locator: '(root)', message: `JSON parse failed: ${err.message}` })
    return { redirectCount: 0, fileFound: true }
  }
  let count = 0
  for (const { array, locator } of iterRedirectArrays(data, relPath)) {
    for (let i = 0; i < array.length; i++) {
      const result = pageRedirectSchema.safeParse(array[i])
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            file: relPath,
            locator: `${locator}[${i}].${issue.path.join('.') || '(root)'}`,
            message: issue.message,
          })
        }
      } else if (catalog) {
        const entry = catalog[result.data.ordinariumKey]
        if (!entry) {
          errors.push({
            file: relPath,
            locator: `${locator}[${i}].ordinariumKey`,
            message: `unknown ordinariumKey "${result.data.ordinariumKey}" — not in ordinarium-key-catalog`,
          })
        } else if (entry.kind === 'fixed' && result.data.page !== entry.page) {
          errors.push({
            file: relPath,
            locator: `${locator}[${i}].page`,
            message: `redirect.page ${result.data.page} != catalog.page ${entry.page} for fixed key "${result.data.ordinariumKey}"`,
          })
        }
      }
      count += 1
    }
  }
  return { redirectCount: count, fileFound: true }
}

function main() {
  const errors = []
  const catalog = loadCatalog(errors)
  let total = 0
  let scanned = 0
  for (const f of [...PROPERS_FILES, ...SANCTORAL_FILES]) {
    const { redirectCount, fileFound } = checkFile(f, catalog, errors)
    if (fileFound) scanned += 1
    total += redirectCount
  }

  if (errors.length > 0) {
    console.error(`[verify-page-redirects] ${errors.length} validation error(s):`)
    for (const e of errors.slice(0, 30)) {
      console.error(`  ${e.file} :: ${e.locator}`)
      console.error(`    ${e.message}`)
    }
    if (errors.length > 30) console.error(`  … and ${errors.length - 30} more`)
    process.exit(1)
  }
  console.log(
    `[verify-page-redirects] OK — catalog valid, ${scanned} file(s) scanned, ${total} PageRedirect entr(ies) validated`,
  )
}

main()
