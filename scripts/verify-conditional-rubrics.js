#!/usr/bin/env node
/**
 * verify-conditional-rubrics.js
 *
 * FR-160-B PR-1 — schema gate for `HourPropers.conditionalRubrics`.
 *
 * Walks every propers JSON (5 seasons + 4 sanctoral) and validates each
 * `conditionalRubrics` array against the Zod schema. PR-1 expectation:
 * no propers carry the field yet, so the verifier exits 0 with
 * "no rubrics found" (build-time gate exists for B3 marking).
 *
 * Read-only. Exits 0 on success, 1 on validation failure.
 */

const fs = require('fs')
const path = require('path')
const { z } = require('zod')

const ROOT = path.resolve(__dirname, '..')

const MMDD_RE = /^\d{2}-\d{2}$/

const evidencePdfSchema = z.object({
  page: z.number().int().min(1),
  line: z.number().int().min(0).optional(),
  text: z.string().min(1),
})

const whenSchema = z
  .object({
    season: z
      .array(z.enum(['ADVENT', 'CHRISTMAS', 'LENT', 'EASTER', 'ORDINARY_TIME']))
      .min(1)
      .optional(),
    dayOfWeek: z
      .array(z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']))
      .min(1)
      .optional(),
    dateRange: z
      .object({
        from: z.string().regex(MMDD_RE),
        to: z.string().regex(MMDD_RE),
      })
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

const targetSchema = z.object({
  ref: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  textRich: z.unknown().optional(),
  ordinariumKey: ordinariumKeyEnum.optional(),
})

const sectionEnum = z.enum([
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

const conditionalRubricSchema = z
  .object({
    rubricId: z.string().min(1),
    when: whenSchema,
    action: z.enum(['skip', 'substitute', 'prepend', 'append']),
    target: targetSchema.optional(),
    appliesTo: z.object({
      section: sectionEnum,
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

function* iterRubricArrays(node, locator) {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* iterRubricArrays(node[i], `${locator}[${i}]`)
    }
    return
  }
  for (const [key, val] of Object.entries(node)) {
    if (key === 'conditionalRubrics' && Array.isArray(val)) {
      yield { array: val, locator: `${locator}.conditionalRubrics` }
      continue
    }
    yield* iterRubricArrays(val, `${locator}.${key}`)
  }
}

function checkFile(relPath, errors) {
  const full = path.join(ROOT, relPath)
  if (!fs.existsSync(full)) return { rubricCount: 0, fileFound: false }
  const raw = fs.readFileSync(full, 'utf-8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    errors.push({ file: relPath, locator: '(root)', message: `JSON parse failed: ${err.message}` })
    return { rubricCount: 0, fileFound: true }
  }
  let count = 0
  for (const { array, locator } of iterRubricArrays(data, relPath)) {
    for (let i = 0; i < array.length; i++) {
      const result = conditionalRubricSchema.safeParse(array[i])
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            file: relPath,
            locator: `${locator}[${i}].${issue.path.join('.') || '(root)'}`,
            message: issue.message,
          })
        }
      }
      count += 1
    }
  }
  return { rubricCount: count, fileFound: true }
}

function main() {
  const errors = []
  let total = 0
  let scanned = 0
  for (const f of [...PROPERS_FILES, ...SANCTORAL_FILES]) {
    const { rubricCount, fileFound } = checkFile(f, errors)
    if (fileFound) scanned += 1
    total += rubricCount
  }

  if (errors.length > 0) {
    console.error(`[verify-conditional-rubrics] ${errors.length} validation error(s):`)
    for (const e of errors.slice(0, 30)) {
      console.error(`  ${e.file} :: ${e.locator}`)
      console.error(`    ${e.message}`)
    }
    if (errors.length > 30) console.error(`  … and ${errors.length - 30} more`)
    process.exit(1)
  }
  console.log(
    `[verify-conditional-rubrics] OK — ${scanned} file(s) scanned, ${total} ConditionalRubric entr(ies) validated`,
  )
}

main()
