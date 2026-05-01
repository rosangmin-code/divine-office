import type { HourSection, HourPropers, LiturgicalSeason, MarianAntiphonCandidate, DayOfWeek } from '../types'
import { isCommonSource } from '../types'
import type {
  ComplineData,
  SeasonalComplineResponsoryMap,
  SeasonalComplineResponsoryVariant,
} from '../psalter-loader'
import type { HourAssembler } from './types'
import { buildOpeningVersicle, resolveShortReading, resolveGospelCanticle, attachSectionDirectives } from './shared'
import { shouldUseAlternateConcludingPrayer, buildConcludingPrayerFields } from './concluding-prayer'

/**
 * Pick a season-appropriate Marian antiphon index from the compline
 * candidates list (FR-easter-3, task #205).
 *
 * Western tradition assigns one of four anthems to each liturgical
 * season; the Mongolian LOTH publishes them as the `salveRegina`
 * (default) plus three `alternatives` (see
 * `src/data/loth/ordinarium/compline.json` `anteMarian`). Before this
 * helper landed, compline always picked index 0 (Salve Regina) — even
 * during Easter when the data carries Regina Caeli ("Тэнгэрийн Хатан")
 * at index 2. Reported by users as "후렴이 연중시기" during Eastertide.
 *
 * Selection (case-insensitive `includes` match against `title`):
 *   EASTER           → "Тэнгэрийн Хатан" | "Regina Caeli" | "Аллэлуяа"
 *   ADVENT|CHRISTMAS → "Аврагчийн хайрт эх" | "Alma"
 *   LENT             → "Ave Regina"
 *   ORDINARY_TIME / unmatched / undefined → 0 (Salve Regina default)
 *
 * Returns 0 (Salve Regina) when no candidate matches so a season whose
 * proper anthem is not yet authored degrades gracefully. The Mongolian
 * LOTH PDF as of 2026 does not publish an Ave Regina translation, so
 * Lent currently falls through to 0 — that is intentional until the
 * data ships (out-of-scope per dispatch C-2).
 */
export function selectSeasonalMarianIndex(
  season: LiturgicalSeason | undefined,
  candidates: ReadonlyArray<MarianAntiphonCandidate> | undefined,
): number {
  if (!candidates || candidates.length === 0) return 0

  const titles = candidates.map((c) => (c.title ?? '').toLowerCase())

  const findFirstMatch = (needles: string[]): number => {
    for (const needle of needles) {
      const n = needle.toLowerCase()
      const idx = titles.findIndex((t) => t.includes(n))
      if (idx >= 0) return idx
    }
    return -1
  }

  let idx = -1
  if (season === 'EASTER') {
    idx = findFirstMatch(['Тэнгэрийн Хатан', 'Regina Caeli', 'Аллэлуяа'])
  } else if (season === 'ADVENT' || season === 'CHRISTMAS') {
    idx = findFirstMatch(['Аврагчийн хайрт эх', 'Alma'])
  } else if (season === 'LENT') {
    idx = findFirstMatch(['Ave Regina'])
  }

  return idx >= 0 ? idx : 0
}

/**
 * Pick the season-appropriate compline responsory variant from the
 * `seasonalResponsory` map (F-1, task #210).
 *
 * Two PDF-authored variants exist (PDF physical p.258 / book p.515 right
 * column):
 *   - `eastertideOctave` — PDF rubric "Амилалтын Найман хоногийн
 *     доторх өдрүүдэд:" (For days within Easter Octave). Single-line
 *     replacement: "Энэ нь Эзэний бүтээсэн өдөр тул үүнд хөгжилдөн
 *     баярлацгаая. Аллэлуяа!" (Ps 118:24, "This is the day the Lord has
 *     made"). Active for the 8 days of Easter Octave.
 *   - `eastertide` — PDF rubric "Амилалтын улирал:" (Easter season).
 *     Latin double-Alleluia full V/R structure. Active for the rest of
 *     Eastertide (post-Octave through Pentecost).
 *
 * Easter Octave detection — calendar.ts assigns `weekOfSeason: 1` for
 * Easter Sunday + the 6 weekdays of Easter week, and `weekOfSeason: 2`
 * starts on the following Sunday (Octave Sunday / Divine Mercy Sunday,
 * which IS the closing day of the Octave). The Octave thus spans:
 *   - week 1, any day, OR
 *   - week 2, SUN
 * Both branches map to `eastertideOctave`. All other Easter days
 * (week 2 MON..SAT through week 7 SAT) map to `eastertide`.
 *
 * Returns `null` for non-Easter seasons OR when the requested variant
 * is not authored — caller falls back to the default (`complineData.responsory`).
 */
export function selectSeasonalCompResponsory(
  map: SeasonalComplineResponsoryMap | null | undefined,
  season: LiturgicalSeason | undefined,
  dayOfWeek: DayOfWeek | undefined,
  weekOfSeason: number | undefined,
): SeasonalComplineResponsoryVariant | null {
  if (!map) return null
  if (season !== 'EASTER') return null
  if (typeof weekOfSeason !== 'number' || !dayOfWeek) return null

  const isOctave =
    weekOfSeason === 1 || (weekOfSeason === 2 && dayOfWeek === 'SUN')

  if (isOctave) {
    return map.eastertideOctave ?? map.eastertide ?? null
  }
  return map.eastertide ?? null
}

/**
 * Merge compline-specific defaults from complineData into propers
 * when not already overridden by season or sanctoral propers.
 *
 * `liturgicalDay` and `dayOfWeek` are optional for backward compat with
 * legacy callers (tests / pre-F-1 wiring) — when absent, only the
 * season-agnostic defaults apply (the legacy behavior). When present,
 * `selectSeasonalCompResponsory` runs to substitute the Easter Octave /
 * Eastertide responsory variant before falling back to the default.
 */
export function mergeComplineDefaults(
  mergedPropers: HourPropers,
  complineData: ComplineData,
  liturgicalDay?: { season: LiturgicalSeason; weekOfSeason: number },
  dayOfWeek?: DayOfWeek,
): HourPropers {
  const result = { ...mergedPropers }

  if (!result.shortReading && complineData.shortReading) {
    result.shortReading = complineData.shortReading
  }
  if (!result.responsory) {
    // Try seasonal Easter / Octave variant first; fall back to ordinarium default.
    const seasonal = selectSeasonalCompResponsory(
      complineData.seasonalResponsory,
      liturgicalDay?.season,
      dayOfWeek,
      liturgicalDay?.weekOfSeason,
    )
    if (seasonal) {
      result.responsory = {
        fullResponse: seasonal.fullResponse,
        versicle: seasonal.versicle,
        shortResponse: seasonal.shortResponse,
        page: seasonal.page,
      }
      // Layer rich overlay so the renderer can emit PDF-faithful AST
      // (skipping the standard Glory Be cue + final response repeat that
      // the responsory shape always synthesizes for the legacy 3-part
      // path).
      //
      // Source-aware guard (#212, post-#211 review):
      //   Layer-4 rich-overlay (loth-service.ts) runs BEFORE this merge
      //   step and unconditionally seeds `responsoryRich` from
      //   `commons/compline/{DAY}.rich.json` for every Compline assembly.
      //   That default rich carries `source.id === 'compline-responsory'`.
      //   The previous `!result.responsoryRich` check therefore never
      //   evaluated true in production — the Easter Octave / Eastertide
      //   variants silently lost the overwrite race and the renderer
      //   showed default (non-Easter) blocks even when plain text was
      //   correctly substituted (#211 AC-5 NOT_MET).
      //
      // Replace ONLY when the slot is empty OR the seeded rich is the
      // common compline-responsory default. Real overrides
      // (sanctoral / seasonal JSON / per-day propers) carry a different
      // `source.id` and continue to win — priority preserved.
      if (seasonal.rich) {
        const existing = result.responsoryRich
        const existingSource = existing?.source
        const isComplineCommonsDefault =
          isCommonSource(existingSource) &&
          existingSource.id === 'compline-responsory'
        if (!existing || isComplineCommonsDefault) {
          result.responsoryRich = seasonal.rich
        }
      }
    } else if (complineData.responsory) {
      result.responsory = complineData.responsory
    }
  }
  if (!result.gospelCanticleAntiphon && complineData.nuncDimittisAntiphon) {
    result.gospelCanticleAntiphon = complineData.nuncDimittisAntiphon
  }
  if (!result.concludingPrayer && complineData.concludingPrayer) {
    result.concludingPrayer = complineData.concludingPrayer.primary
  }

  return result
}

export const assembleCompline: HourAssembler = (ctx) => {
  const sections: HourSection[] = []

  // 1. Opening Versicle (Deus, in adiutorium)
  sections.push(attachSectionDirectives(buildOpeningVersicle(ctx.ordinarium, ctx.liturgicalDay.season), ctx.mergedPropers))

  // 2. Examen of Conscience
  if (ctx.complineData?.examen) {
    sections.push({ type: 'examen', text: ctx.complineData.examen, page: ctx.complineData.examenPage })
  }

  // 3. Hymn
  sections.push({ type: 'hymn', text: ctx.mergedPropers.hymn ?? '', page: ctx.mergedPropers.hymnPage, candidates: ctx.hymnCandidates, selectedIndex: ctx.hymnSelectedIndex, textRich: ctx.mergedPropers.hymnRich })

  // 3. Psalmody
  if (ctx.assembledPsalms.length > 0) {
    sections.push(attachSectionDirectives({ type: 'psalmody', psalms: ctx.assembledPsalms }, ctx.mergedPropers))
  }

  // 4. Short Reading
  const reading = resolveShortReading(ctx.mergedPropers)
  if (reading) {
    if (ctx.mergedPropers.shortReadingRich) {
      sections.push({ ...reading, textRich: ctx.mergedPropers.shortReadingRich })
    } else {
      sections.push(reading)
    }
  }

  // 5. Responsory
  if (ctx.mergedPropers.responsory) {
    sections.push({
      type: 'responsory',
      fullResponse: ctx.mergedPropers.responsory.fullResponse,
      versicle: ctx.mergedPropers.responsory.versicle,
      shortResponse: ctx.mergedPropers.responsory.shortResponse,
      page: ctx.mergedPropers.responsory.page,
      rich: ctx.mergedPropers.responsoryRich,
    })
  }

  // 6. Gospel Canticle (Nunc Dimittis)
  const canticle = resolveGospelCanticle(
    'compline',
    ctx.ordinarium.canticles,
    ctx.mergedPropers.gospelCanticleAntiphon ?? '',
    ctx.mergedPropers.gospelCanticleAntiphonPage,
    ctx.mergedPropers.gospelCanticleAntiphonRich,
  )
  if (canticle) sections.push(canticle)

  // 7. Concluding Prayer
  // F-2 (#214) — PDF rubric "Эсвэл: Ням гарагт үл тохиох Их баярын өдөр"
  // (Or: Solemnity not on Sunday) auto-swaps primary↔alternate so the
  // alternate prayer becomes the default on weekday Solemnities. Easter
  // Octave keeps the primary per the parallel Sunday/Octave rubric — see
  // `shouldUseAlternateConcludingPrayer` for the full rubric mapping.
  if (ctx.mergedPropers.concludingPrayer || ctx.mergedPropers.concludingPrayerRich) {
    const swap = shouldUseAlternateConcludingPrayer(ctx.liturgicalDay, ctx.dayOfWeek)
    const fields = buildConcludingPrayerFields({
      primaryText: ctx.mergedPropers.concludingPrayer,
      primaryRich: ctx.mergedPropers.concludingPrayerRich,
      primaryPage: ctx.mergedPropers.concludingPrayerPage ?? ctx.complineData?.concludingPrayer?.page,
      alternateText:
        ctx.mergedPropers.alternativeConcludingPrayer ?? ctx.complineData?.concludingPrayer?.alternate,
      alternateRich: ctx.mergedPropers.alternativeConcludingPrayerRich,
      alternatePage: ctx.mergedPropers.alternativeConcludingPrayerPage,
    }, swap)
    sections.push({ type: 'concludingPrayer', ...fields })
  }

  // 8. Blessing
  if (ctx.complineData?.blessing) {
    sections.push({
      type: 'blessing',
      text: ctx.complineData.blessing.text,
      response: ctx.complineData.blessing.response,
      page: ctx.complineData.blessingPage,
    })
  }

  // 9. Marian Antiphon — season-aware default selection (FR-easter-3, #205).
  // Eastertide uses Regina Caeli ("Тэнгэрийн Хатан"), Advent/Christmas use
  // Alma Redemptoris ("Аврагчийн хайрт эх"); other seasons fall back to
  // Salve Regina (idx 0). Users still pick alternatives via the renderer.
  if (ctx.complineData?.marianAntiphon && ctx.complineData.marianAntiphon.length > 0) {
    const idx = selectSeasonalMarianIndex(
      ctx.liturgicalDay.season,
      ctx.complineData.marianAntiphon,
    )
    const marian = ctx.complineData.marianAntiphon[idx]
    sections.push({
      type: 'marianAntiphon',
      title: marian.title,
      text: marian.text,
      page: (marian as { title: string; text: string; page?: number }).page,
      candidates: ctx.complineData.marianAntiphon,
      selectedIndex: idx,
    })
  }

  return sections
}
