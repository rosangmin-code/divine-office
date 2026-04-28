#!/usr/bin/env node
/**
 * mark-conditional-rubrics.js
 *
 * FR-160-B PR-2..7 — applies the canonical mapping at
 * `scripts/data/conditional-rubric-mapping.json` to the propers / sanctoral
 * JSON files. Add-only: existing fields are untouched. Idempotent: re-running
 * with the same mapping produces no diff once entries are already written
 * (matched by rubricId / redirectId).
 *
 * Flags:
 *   --season=<advent|christmas|lent|easter|ordinary-time|sanctoral|all>
 *                              filter mapping entries by `scope`.
 *                              `all` (default) processes every entry.
 *   --dry-run                  print planned writes without modifying files.
 *   --verify                   after writing, run the schema verifiers
 *                              (verify-conditional-rubrics + verify-page-redirects).
 *   --mapping=<path>           override the mapping JSON path (default
 *                              scripts/data/conditional-rubric-mapping.json).
 *   -h, --help                 show this message
 *
 * The tool refuses to write if any planned entry fails the PR-1 Zod schema
 * (verify-conditional-rubrics + verify-page-redirects equivalents are
 * embedded here so a dry-run reports the same gate that build-time would).
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { z } = require('zod')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_MAPPING = path.join(ROOT, 'scripts/data/conditional-rubric-mapping.json')
const CATALOG_PATH = path.join(ROOT, 'src/data/loth/ordinarium-key-catalog.json')

const SCOPES = new Set([
  'advent',
  'christmas',
  'lent',
  'easter',
  'ordinary-time',
  'sanctoral',
  'all',
])

function parseArgs(argv) {
  const args = {
    season: 'all',
    dryRun: false,
    verify: false,
    mapping: DEFAULT_MAPPING,
    help: false,
  }
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--verify') args.verify = true
    else if (a === '-h' || a === '--help') args.help = true
    else if (a.startsWith('--season=')) args.season = a.slice('--season='.length)
    else if (a.startsWith('--mapping=')) args.mapping = path.resolve(a.slice('--mapping='.length))
    else throw new Error(`unknown argument: ${a}`)
  }
  if (!SCOPES.has(args.season)) {
    throw new Error(
      `--season must be one of ${Array.from(SCOPES).join(', ')} (got "${args.season}")`,
    )
  }
  return args
}

function printHelp() {
  console.log(`Usage: node scripts/mark-conditional-rubrics.js [options]

Options:
  --season=SEASON           one of: advent, christmas, lent, easter,
                            ordinary-time, sanctoral, all (default: all)
  --dry-run                 print planned writes without modifying files
  --verify                  run verify-conditional-rubrics +
                            verify-page-redirects after writing
  --mapping=PATH            override mapping JSON path
                            (default: scripts/data/conditional-rubric-mapping.json)
  -h, --help                show this message`)
}

// ---------------------------------------------------------------------------
// Embedded Zod schemas (parity with PR-1 verifiers — keeps the rewrite tool
// self-contained so a dry-run reports the same gate that build-time would).
// ---------------------------------------------------------------------------

const MMDD_RE = /^\d{2}-\d{2}$/

const evidencePdfSchema = z.object({
  page: z.number().int().min(1),
  line: z.number().int().min(0).optional(),
  text: z.string().min(1),
})

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

const conditionalSectionEnum = z.enum([
  'invitatory',
  'openingVersicle',
  'hymn',
  'psalmody',
  'shortReading',
  'responsory',
  'gospelCanticle',
  'intercessions',
  'concludingPrayer',
  'dismissal',
])

const redirectSectionEnum = z.enum([
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

const whenSchema = z
  .object({
    season: z.array(z.enum(['ADVENT', 'CHRISTMAS', 'LENT', 'EASTER', 'ORDINARY_TIME'])).min(1).optional(),
    dayOfWeek: z.array(z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])).min(1).optional(),
    dateRange: z
      .object({ from: z.string().regex(MMDD_RE), to: z.string().regex(MMDD_RE) })
      .optional(),
    predicate: z.enum(['isFirstHourOfDay', 'isVigil', 'isObligatoryMemorial']).optional(),
  })
  .refine(
    (when) =>
      when.season != null ||
      when.dayOfWeek != null ||
      when.dateRange != null ||
      when.predicate != null,
    { message: 'when must specify at least one match field' },
  )

const targetSchema = z.object({
  ref: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  textRich: z.unknown().optional(),
  ordinariumKey: ordinariumKeyEnum.optional(),
})

const conditionalRubricSchema = z
  .object({
    rubricId: z.string().min(1),
    when: whenSchema,
    action: z.enum(['skip', 'substitute', 'prepend', 'append']),
    target: targetSchema.optional(),
    appliesTo: z.object({
      section: conditionalSectionEnum,
      index: z.number().int().min(0).optional(),
    }),
    evidencePdf: evidencePdfSchema,
    liturgicalBasis: z.string().min(1).optional(),
  })
  .refine(
    (rubric) =>
      rubric.action === 'skip' ||
      (rubric.target != null &&
        (rubric.target.ref != null ||
          rubric.target.text != null ||
          rubric.target.textRich != null ||
          rubric.target.ordinariumKey != null)),
    { message: 'non-skip actions require target with at least one resolvable field' },
  )

const pageRedirectSchema = z.object({
  redirectId: z.string().min(1),
  ordinariumKey: ordinariumKeyEnum,
  page: z.number().int().min(1).max(969),
  label: z.string().min(1),
  appliesAt: redirectSectionEnum,
  evidencePdf: evidencePdfSchema,
})

const mappingEntrySchema = z.object({
  id: z.string().min(1),
  scope: z.enum(['advent', 'christmas', 'lent', 'easter', 'ordinary-time', 'sanctoral']),
  target: z.object({
    file: z.string().min(1),
    path: z.string().regex(/^\$\./, { message: 'target.path must be a JSONPath starting with "$."' }),
  }),
  kind: z.enum(['conditionalRubric', 'pageRedirect']),
  data: z.unknown(),
})

const mappingSchema = z.object({
  $comment: z.string().optional(),
  version: z.string().min(1),
  entries: z.array(mappingEntrySchema),
})

// ---------------------------------------------------------------------------

// Load ordinarium-key-catalog so we can run the SAME catalog/fixed-page
// cross-check that scripts/verify-page-redirects.js performs. Embedding
// this here keeps the dry-run gate byte-equal with build-time validation.
let catalogCache = null
function loadCatalog(errors) {
  if (catalogCache !== null) return catalogCache
  if (!fs.existsSync(CATALOG_PATH)) {
    errors.push(`ordinarium-key-catalog not found at ${CATALOG_PATH}`)
    catalogCache = {}
    return catalogCache
  }
  const raw = fs.readFileSync(CATALOG_PATH, 'utf-8')
  const json = JSON.parse(raw)
  // Catalog schema mirrors verify-page-redirects.js (kind/page/label/sourcePath).
  catalogCache = json.entries ?? {}
  return catalogCache
}

function validateMappingEntry(entry, errors) {
  const ent = mappingEntrySchema.safeParse(entry)
  if (!ent.success) {
    for (const issue of ent.error.issues) {
      errors.push(`mapping[${entry.id ?? '?'}].${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    return null
  }
  const validatedShell = ent.data
  if (validatedShell.kind === 'conditionalRubric') {
    const r = conditionalRubricSchema.safeParse(validatedShell.data)
    if (!r.success) {
      for (const issue of r.error.issues) {
        errors.push(
          `mapping[${validatedShell.id}].data.${issue.path.join('.') || '(root)'}: ${issue.message}`,
        )
      }
      return null
    }
  } else {
    const r = pageRedirectSchema.safeParse(validatedShell.data)
    if (!r.success) {
      for (const issue of r.error.issues) {
        errors.push(
          `mapping[${validatedShell.id}].data.${issue.path.join('.') || '(root)'}: ${issue.message}`,
        )
      }
      return null
    }
    // Catalog cross-check parity with verify-page-redirects.js:145-158:
    // unknown ordinariumKey OR (kind=fixed AND page mismatch) → reject
    // BEFORE writing so the tool never emits a redirect that the
    // build-time verifier would later reject.
    const catalog = loadCatalog(errors)
    const catEntry = catalog[r.data.ordinariumKey]
    if (!catEntry) {
      errors.push(
        `mapping[${validatedShell.id}].data.ordinariumKey: unknown key "${r.data.ordinariumKey}" — not in ordinarium-key-catalog`,
      )
      return null
    }
    if (catEntry.kind === 'fixed' && r.data.page !== catEntry.page) {
      errors.push(
        `mapping[${validatedShell.id}].data.page: redirect.page ${r.data.page} != catalog.page ${catEntry.page} for fixed key "${r.data.ordinariumKey}"`,
      )
      return null
    }
  }
  return validatedShell
}

// JSONPath resolver (subset: $.a.b.c — dotted only, used by mapping)
function resolveJsonPath(root, jsonpath) {
  if (!jsonpath.startsWith('$.')) {
    throw new Error(`unsupported JSONPath (must start with "$."): ${jsonpath}`)
  }
  const segments = jsonpath.slice(2).split('.')
  let node = root
  for (const seg of segments) {
    if (node == null || typeof node !== 'object') {
      throw new Error(`JSONPath ${jsonpath}: cannot descend into non-object at segment "${seg}"`)
    }
    if (!(seg in node)) {
      throw new Error(`JSONPath ${jsonpath}: missing segment "${seg}"`)
    }
    node = node[seg]
  }
  if (node == null || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(`JSONPath ${jsonpath} did not resolve to an object cell`)
  }
  return node
}

function normaliseSeason(rawSeason) {
  return rawSeason === 'ordinaryTime' ? 'ordinary-time' : rawSeason
}

function loadMapping(mappingPath, errors) {
  if (!fs.existsSync(mappingPath)) {
    errors.push(`mapping file not found: ${mappingPath}`)
    return null
  }
  const raw = fs.readFileSync(mappingPath, 'utf-8')
  let json
  try {
    json = JSON.parse(raw)
  } catch (err) {
    errors.push(`mapping JSON parse failed: ${err.message}`)
    return null
  }
  const result = mappingSchema.safeParse(json)
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`mapping.${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    return null
  }
  return result.data
}

function planAndApply(args) {
  const errors = []
  const mapping = loadMapping(args.mapping, errors)
  if (errors.length) return { errors, plan: [], filesChanged: [] }

  const filteredEntries = mapping.entries.filter((e) => {
    const scope = normaliseSeason(e.scope)
    return args.season === 'all' || scope === args.season
  })

  // Validate every entry's payload BEFORE touching files.
  const validated = []
  for (const e of filteredEntries) {
    const v = validateMappingEntry(e, errors)
    if (v) validated.push(v)
  }
  if (errors.length) return { errors, plan: [], filesChanged: [] }

  // Group by target.file so we read+write each file at most once.
  const byFile = new Map()
  for (const e of validated) {
    const list = byFile.get(e.target.file) ?? []
    list.push(e)
    byFile.set(e.target.file, list)
  }

  const plan = []
  const filesChanged = []

  for (const [relPath, entries] of byFile) {
    const fullPath = path.join(ROOT, relPath)
    if (!fs.existsSync(fullPath)) {
      errors.push(`target file not found: ${relPath}`)
      continue
    }
    const original = fs.readFileSync(fullPath, 'utf-8')
    const data = JSON.parse(original)

    let dirty = false
    for (const e of entries) {
      let cell
      try {
        cell = resolveJsonPath(data, e.target.path)
      } catch (err) {
        errors.push(`${relPath} :: ${e.id}: ${err.message}`)
        continue
      }
      const arrayKey = e.kind === 'conditionalRubric' ? 'conditionalRubrics' : 'pageRedirects'
      const idKey = e.kind === 'conditionalRubric' ? 'rubricId' : 'redirectId'
      // Add-only safety: if the cell already has a value at arrayKey that
      // is NOT an array, refuse rather than silently overwrite. Matches
      // the "additive only" contract from FR-160-B plan §3.2.
      if (cell[arrayKey] !== undefined && !Array.isArray(cell[arrayKey])) {
        errors.push(
          `${relPath} :: ${e.id}: target cell already has non-array "${arrayKey}" field — refusing to overwrite (add-only safety)`,
        )
        continue
      }
      if (!Array.isArray(cell[arrayKey])) cell[arrayKey] = []
      const existingIdx = cell[arrayKey].findIndex((x) => x && x[idKey] === e.data[idKey])
      if (existingIdx >= 0) {
        plan.push({ entryId: e.id, file: relPath, action: 'skip-already-present' })
        continue
      }
      cell[arrayKey].push(e.data)
      plan.push({ entryId: e.id, file: relPath, action: 'append', kind: e.kind })
      dirty = true
    }

    if (dirty && !args.dryRun) {
      // Trailing newline parity with original file.
      const trailing = original.endsWith('\n') ? '\n' : ''
      const next = JSON.stringify(data, null, 2) + trailing
      fs.writeFileSync(fullPath, next, 'utf-8')
      filesChanged.push(relPath)
    } else if (dirty && args.dryRun) {
      filesChanged.push(relPath)
    }
  }

  return { errors, plan, filesChanged }
}

function runVerifiers() {
  const verifiers = [
    'scripts/verify-conditional-rubrics.js',
    'scripts/verify-page-redirects.js',
  ]
  for (const v of verifiers) {
    process.stdout.write(`[mark-conditional-rubrics] running ${v} ... `)
    try {
      const out = execFileSync('node', [path.join(ROOT, v)], { encoding: 'utf-8' })
      process.stdout.write('OK\n')
      if (out.trim()) console.log('  ' + out.trim().split('\n').join('\n  '))
    } catch (err) {
      process.stdout.write('FAIL\n')
      console.error(err.stdout?.toString() ?? err.message)
      console.error(err.stderr?.toString() ?? '')
      throw new Error(`verifier ${v} failed`)
    }
  }
}

function main() {
  let args
  try {
    args = parseArgs(process.argv)
  } catch (err) {
    console.error(`[mark-conditional-rubrics] ${err.message}`)
    printHelp()
    process.exit(2)
  }
  if (args.help) {
    printHelp()
    return
  }
  console.log('mark-conditional-rubrics (FR-160-B PR-2..7)')
  console.log('-'.repeat(60))
  console.log(`mode:       ${args.dryRun ? 'dry-run' : 'write'}`)
  console.log(`scope:      ${args.season}`)
  console.log(`mapping:    ${path.relative(ROOT, args.mapping)}`)

  const { errors, plan, filesChanged } = planAndApply(args)

  if (errors.length) {
    console.error('')
    console.error(`[mark-conditional-rubrics] ${errors.length} error(s):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }

  if (plan.length === 0) {
    console.log('')
    console.log('no entries matched scope — nothing to do.')
    return
  }

  const appended = plan.filter((p) => p.action === 'append')
  const skipped = plan.filter((p) => p.action === 'skip-already-present')

  console.log('')
  console.log(`planned:    ${plan.length} entr(ies)`)
  console.log(`  append:        ${appended.length}`)
  console.log(`  already-present (no-op): ${skipped.length}`)
  if (filesChanged.length) {
    console.log(`files:      ${filesChanged.length}`)
    for (const f of filesChanged) console.log(`  ${f}`)
  }

  if (appended.length) {
    console.log('')
    for (const p of appended) {
      console.log(`  ${p.file} :: ${p.entryId} (${p.kind})`)
    }
  }

  if (args.dryRun) {
    console.log('')
    console.log('Dry run — no files were modified.')
    return
  }

  if (args.verify) {
    console.log('')
    runVerifiers()
  }

  console.log('')
  console.log(`Done — ${appended.length} entr(ies) appended, ${filesChanged.length} file(s) modified.`)
}

main()
