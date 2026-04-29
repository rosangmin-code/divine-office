// Runtime schemas for data loaders. Runs at the JSON -> typed-object
// boundary so a malformed or partially-shipped file fails fast with a
// readable path (e.g. "days.MON.lauds.psalms[3].gloria_patri: expected
// boolean") instead of crashing a UI component later.
//
// Each schema is permissive on unknown fields (.loose()) because the
// data files carry extra metadata we do not consume. We only verify the
// keys the application actually reads.

import { z } from 'zod'

// --- Primitives ---

const PageSchema = z.number().int().nonnegative().optional()

const ShortReadingSchema = z
  .object({
    ref: z.string(),
    text: z.string(),
    page: PageSchema,
  })
  .loose()

const ResponsorySchema = z
  .object({
    fullResponse: z.string(),
    versicle: z.string(),
    shortResponse: z.string(),
    page: PageSchema,
  })
  .loose()

// --- Psalter ---

const PsalmEntrySchema = z
  .object({
    type: z.enum(['psalm', 'canticle']),
    ref: z.string(),
    antiphon_key: z.string(),
    default_antiphon: z.string(),
    title: z.string().optional(),
    gloria_patri: z.boolean(),
    page: PageSchema,
    seasonal_antiphons: z
      .object({
        easter: z.string().optional(),
        easterAlt: z.string().optional(),
        advent: z.string().optional(),
        adventDec17_23: z.string().optional(),
        adventDec24: z.string().optional(),
        // Per-Sunday override maps. Keys are `weekOfSeason` numbers (3..7
        // for easter, 1..5 for lent) but z.record enforces only string
        // keys at runtime — JavaScript object keys stringify numeric
        // values automatically, so callers can write { 3: "…", 4: "…" }.
        easterSunday: z.record(z.string(), z.string()).optional(),
        lentSunday: z.record(z.string(), z.string()).optional(),
        lentPassionSunday: z.string().optional(),
      })
      .loose()
      .optional(),
  })
  .loose()

const HourPsalmodyLooseSchema = z
  .object({
    psalms: z.array(PsalmEntrySchema),
    shortReading: ShortReadingSchema.optional(),
    responsory: ResponsorySchema.optional(),
    gospelCanticleAntiphon: z.string().optional(),
    gospelCanticleAntiphonPage: PageSchema,
    intercessions: z.array(z.string()).optional(),
    intercessionsPage: PageSchema,
    concludingPrayer: z.string().optional(),
    concludingPrayerPage: PageSchema,
  })
  .loose()

const PsalterDaySchema = z
  .object({
    lauds: HourPsalmodyLooseSchema,
    vespers: HourPsalmodyLooseSchema,
  })
  .loose()

export const PsalterWeekSchema = z
  .object({
    week: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    days: z.object({
      SUN: PsalterDaySchema,
      MON: PsalterDaySchema,
      TUE: PsalterDaySchema,
      WED: PsalterDaySchema,
      THU: PsalterDaySchema,
      FRI: PsalterDaySchema,
      SAT: PsalterDaySchema,
    }),
  })
  .loose()

// --- Propers (season + sanctoral) ---
//
// These files accept a much wider variety of fields across seasons/ranks,
// so the schema only asserts the top-level "weeks" object exists. Finer
// detail lives in DayPropers downstream; enforcing it here would block
// legitimate data edits and slow iteration.

export const SeasonPropersFileSchema = z
  .object({
    weeks: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

export const SanctoralFileSchema = z.record(z.string(), z.unknown())

export const OptionalMemorialsFileSchema = z.record(z.string(), z.unknown())

export const HymnsFileSchema = z.record(
  z.string(),
  z
    .object({
      title: z.string(),
      text: z.string(),
      page: PageSchema,
    })
    .loose(),
)

export const HymnsIndexFileSchema = z
  .object({
    hymns: z.array(
      z.object({ number: z.number(), title: z.string() }).loose(),
    ),
    seasonalAssignments: z.record(z.string(), z.record(z.string(), z.array(z.number()))),
  })
  .loose()

// --- FR-160-B: Conditional rubric + page redirect ---

const MMDD_RE = /^\d{2}-\d{2}$/

const ConditionalRubricSectionEnum = z.enum([
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

const PageRedirectSectionEnum = z.enum([
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

export const PageRedirectOrdinariumKeyEnum = z.enum([
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

const EvidencePdfSchema = z.object({
  page: z.number().int().min(1),
  line: z.number().int().min(0).optional(),
  text: z.string().min(1),
})

const ConditionalRubricWhenSchema = z
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
        from: z.string().regex(MMDD_RE, 'MM-DD format required'),
        to: z.string().regex(MMDD_RE, 'MM-DD format required'),
      })
      .optional(),
    predicate: z
      .enum(['isFirstHourOfDay', 'isVigil', 'isObligatoryMemorial'])
      .optional(),
  })
  .refine(
    (when) =>
      when.season != null ||
      when.dayOfWeek != null ||
      when.dateRange != null ||
      when.predicate != null,
    { message: 'when must specify at least one match field' },
  )

const ConditionalRubricTargetSchema = z.object({
  ref: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  textRich: z.unknown().optional(),
  ordinariumKey: PageRedirectOrdinariumKeyEnum.optional(),
})

const ConditionalRubricLocatorSchema = z.object({
  section: ConditionalRubricSectionEnum,
  index: z.number().int().min(0).optional(),
})

export const ConditionalRubricSchema = z
  .object({
    rubricId: z.string().min(1),
    when: ConditionalRubricWhenSchema,
    action: z.enum(['skip', 'substitute', 'prepend', 'append']),
    target: ConditionalRubricTargetSchema.optional(),
    appliesTo: ConditionalRubricLocatorSchema,
    evidencePdf: EvidencePdfSchema,
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

export const PageRedirectSchema = z.object({
  redirectId: z.string().min(1),
  ordinariumKey: PageRedirectOrdinariumKeyEnum,
  page: z.number().int().min(1).max(969),
  label: z.string().min(1),
  appliesAt: PageRedirectSectionEnum,
  evidencePdf: EvidencePdfSchema,
})

export const ConditionalRubricArraySchema = z.array(ConditionalRubricSchema)
export const PageRedirectArraySchema = z.array(PageRedirectSchema)

// Ordinarium catalog: closed-enum key → PDF page mapping. Build-time
// validated; runtime hydration trusts the parsed shape.
//
// `kind` distinguishes ordinarium sections whose body lives at one
// canonical page (fixed — Benedictus, Magnificat, Nunc Dimittis,
// Compline responsory, common prayers, Gloria Patri) from those whose
// body is laid out across many pages keyed by celebration / hymn
// number / season (variable — dismissal-blessing "Магтуу: х. NNN",
// hymns 883–961, invitatory-psalms 95/94/100). For fixed keys, both
// the verifier and runtime resolver enforce `redirect.page ===
// entry.page` so a typo in a marked redirect is caught instead of
// silently surfacing a wrong page in the UI.
export const OrdinariumKeyCatalogSchema = z.object({
  entries: z.record(
    PageRedirectOrdinariumKeyEnum,
    z.object({
      kind: z.enum(['fixed', 'variable']),
      page: z.number().int().min(1).max(969),
      label: z.string().min(1),
      sourcePath: z.string().min(1).optional(),
    }),
  ),
})

// --- FR-161 R-3 PhraseGroup (rich AST phrase grouping) ---
//
// `PrayerBlock` `kind: 'stanza'` 위에 얹는 `phrases?: PhraseGroup[]` 의
// 런타임 검증용 스키마. types.ts 의 `PhraseGroup` 와 1:1 정합.
// Loader 가 rich JSON 을 파싱할 때 phrase 메타데이터의 형태를 검증하기 위해 사용.
// 자세한 의미는 docs/fr-161-phrase-unit-pivot-plan.md §4 (Option B) 참조.

export const PhraseGroupSchema = z
  .object({
    // Tuple of two non-negative integers — inclusive both ends, indexes into the parent stanza's lines[].
    lineRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
    // Phrase 자체의 visual indent (lines[].indent 와 별개 차원).
    indent: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    // line.role 와 정합 필요 시 phrase 로 격상.
    role: z.enum(['refrain', 'doxology']).optional(),
  })
  .loose()

export const PhraseGroupArraySchema = z.array(PhraseGroupSchema)

// --- Helpers ---

/**
 * Parse an unknown JSON blob with the given schema. On failure, log the
 * formatted issues and return null so loaders can decide how to degrade
 * (typically: skip caching, return empty, let the next call retry).
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  input: unknown,
  context: string,
): T | null {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const issues = result.error.issues
    .slice(0, 5)
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  console.error(
    `[schemas] ${context} failed validation (${result.error.issues.length} issues):\n${issues}`,
  )
  return null
}
