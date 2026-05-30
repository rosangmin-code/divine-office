import type {
  GospelCanticleAntiphonCandidate,
  HourSection,
  HourType,
  PrayerText,
} from '../../types'
import { parseScriptureRef } from '../../scripture-ref-parser'
import { lookupRef } from '../../bible-loader'

// FR-168 (GOAL #90) — clamp an arbitrary selectedIndex into a valid
// candidate index. Non-integer / out-of-range (incl. NaN) → 0 (option 1).
// Single source of truth shared with the renderer's clamp so the
// assembled `antiphon` (plain string) and the dropdown's default
// selection never disagree (peer-corrected "safeIdx 일관").
function clampCandidateIndex(idx: number | undefined, len: number): number {
  if (len <= 0) return 0
  return Number.isInteger(idx) && (idx as number) >= 0 && (idx as number) < len
    ? (idx as number)
    : 0
}

/**
 * Resolve the gospel canticle (Benedictus, Magnificat, or Nunc Dimittis).
 *
 * `antiphonRich` (FR-161 C-3a/wi-001) — optional rich overlay for the
 * seasonal antiphon. Passed straight through to the returned HourSection so
 * the renderer (C-3b/wi-002) can prefer the AST over the plain `antiphon`
 * string. `undefined` is the legacy path (plain antiphon only).
 *
 * `paragraphBoundaries` (WI #35) — optional within-canticle paragraph
 * boundary markers for the `verses[]` body. 0-based verses indices at
 * which a paragraph break should render (before-line semantics — same
 * convention as the psalm F-X11 #408 stanza paragraphBoundaries). Passed
 * straight through to the returned HourSection so the renderer can
 * inject `mt-3` at those indices. Absent → legacy uniform spacing.
 */
export function resolveGospelCanticle(
  hour: HourType,
  canticlesData: Record<
    string,
    {
      ref: string
      titleMn: string
      verses?: string[]
      doxology?: string
      page?: number
      paragraphBoundaries?: number[]
    }
  >,
  antiphon: string,
  page?: number,
  antiphonRich?: PrayerText,
  // FR-168 (GOAL #90) — optional multi-candidate Benedictus antiphon
  // (saturday-mary). Passed through verbatim to the HourSection; when
  // present + non-empty, the section's plain `antiphon` is the selected
  // candidate's text so legacy consumers (and the seasonal-antiphon path)
  // keep working unchanged. Absent → legacy single-antiphon behaviour.
  candidates?: GospelCanticleAntiphonCandidate[],
  selectedIndex?: number,
  rubric?: string,
): HourSection | null {
  let canticleKey: 'benedictus' | 'magnificat' | 'nuncDimittis'

  if (hour === 'lauds') canticleKey = 'benedictus'
  else if (hour === 'vespers') canticleKey = 'magnificat'
  else if (hour === 'compline') canticleKey = 'nuncDimittis'
  else return null

  const canticleInfo = canticlesData[canticleKey]
  if (!canticleInfo) return null

  // FR-168 — resolve the effective antiphon + candidate passthrough. When
  // candidates are present, the plain `antiphon` becomes the selected
  // option's text (clamped) so the assembled section stays self-consistent
  // (unit test: section.antiphon === candidates[selectedIndex].text).
  const hasCandidates = Array.isArray(candidates) && candidates.length > 0
  const safeIdx = hasCandidates
    ? clampCandidateIndex(selectedIndex, candidates!.length)
    : 0
  const effectiveAntiphon = hasCandidates
    ? (candidates![safeIdx]?.text ?? antiphon)
    : antiphon
  const candidateFields = hasCandidates
    ? { candidates, selectedIndex: selectedIndex ?? 0, rubric }
    : {}

  // `page` is the seasonal antiphon page (from propers); `bodyPage` is the
  // fixed ordinarium page where the canticle verses are printed (same every
  // day). Prior to this split, `page` alone was attached to the canticle
  // heading in the UI, which made it look as though the Magnificat body was
  // printed on the daily propers page. See task #11.
  const bodyPage = typeof canticleInfo.page === 'number' ? canticleInfo.page : undefined

  if (canticleInfo.verses && canticleInfo.verses.length > 0) {
    return {
      type: 'gospelCanticle',
      canticle: canticleKey,
      antiphon: effectiveAntiphon || '',
      text: canticleInfo.verses.join('\n'),
      verses: canticleInfo.verses,
      doxology: canticleInfo.doxology,
      page,
      bodyPage,
      antiphonRich,
      // WI #35 — passthrough within-canticle paragraph boundaries. Absent
      // in source data → undefined → renderer uses legacy uniform spacing.
      paragraphBoundaries: canticleInfo.paragraphBoundaries,
      // FR-168 — multi-candidate dropdown fields (absent → {} spread).
      ...candidateFields,
    }
  }

  const refs = parseScriptureRef(canticleInfo.ref)
  let text = ''
  for (const ref of refs) {
    const result = lookupRef(ref)
    if (result) {
      text += result.texts.map((v) => v.text).join('\n')
    }
  }

  return {
    type: 'gospelCanticle',
    canticle: canticleKey,
    antiphon: effectiveAntiphon || '',
    text,
    page,
    bodyPage,
    antiphonRich,
    // FR-168 — multi-candidate dropdown fields (absent → {} spread).
    ...candidateFields,
  }
}
