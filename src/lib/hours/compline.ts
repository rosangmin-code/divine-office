import type { HourSection, HourPropers, LiturgicalSeason, MarianAntiphonCandidate } from '../types'
import type { ComplineData } from '../psalter-loader'
import type { HourAssembler } from './types'
import { buildOpeningVersicle, resolveShortReading, resolveGospelCanticle, attachSectionDirectives } from './shared'

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
 * Merge compline-specific defaults from complineData into propers
 * when not already overridden by season or sanctoral propers.
 */
export function mergeComplineDefaults(
  mergedPropers: HourPropers,
  complineData: ComplineData,
): HourPropers {
  const result = { ...mergedPropers }

  if (!result.shortReading && complineData.shortReading) {
    result.shortReading = complineData.shortReading
  }
  if (!result.responsory && complineData.responsory) {
    result.responsory = complineData.responsory
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
  if (ctx.mergedPropers.concludingPrayer || ctx.mergedPropers.concludingPrayerRich) {
    sections.push({
      type: 'concludingPrayer',
      text: ctx.mergedPropers.concludingPrayer ?? '',
      page: ctx.mergedPropers.concludingPrayerPage ?? ctx.complineData?.concludingPrayer?.page,
      alternateText: ctx.mergedPropers.alternativeConcludingPrayer ?? ctx.complineData?.concludingPrayer?.alternate,
      textRich: ctx.mergedPropers.concludingPrayerRich,
      alternateTextRich: ctx.mergedPropers.alternativeConcludingPrayerRich,
    })
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
