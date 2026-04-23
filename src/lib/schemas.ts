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
