/**
 * Shared page-annotation logic for firstVespers subtrees. Used by:
 *   - scripts/inject-first-vespers-pages.js (writes pages into src JSON)
 *   - scripts/verify-first-vespers.js, verify-solemnity-first-vespers.js,
 *     verify-movable-first-vespers.js (enriches the expected block so
 *     the byte-equal diff covers page fields too — task #36 / NFR-009d)
 *
 * Strategy per entry:
 *   1. If `psalterWeek` context is passed (1..4), use the static
 *      PSALTER_WEEK_PAGES map — the 52 Sunday First Vespers propers
 *      all delegate to the 4 psalter-week base blocks so their pages
 *      are identical across sibling entries. Fingerprint matching on
 *      shared texts like "Нар мандахаас жаргах хүртэл…" picks up
 *      false positives from unrelated PDF sections (task #36 injected
 *      15 psalter-1 shortReading pages as 571 and 12 psalter-3
 *      responsory pages as 541 — wrong; task #41 replaces with map).
 *   2. Otherwise (sanctoral / movable / non-psalter blocks) fall back
 *      to the fingerprint path (propers_full.txt + hymns_full.txt,
 *      then full_pdf.txt with safeAmbiguousMin=15).
 */

const path = require('path')
const fs = require('fs')
const {
  buildSourceIndex,
  buildSourceIndexMulti,
  buildFirstTokenIndex,
  lookupPage,
} = require('./page-fingerprint')

function buildPageIndex(root) {
  const PRIMARY = [
    path.join(root, 'parsed_data/propers/propers_full.txt'),
    path.join(root, 'parsed_data/hymns/hymns_full.txt'),
  ]
  const FALLBACK = path.join(root, 'parsed_data/full_pdf.txt')
  const primary = buildSourceIndexMulti(PRIMARY)
  const primaryFti = buildFirstTokenIndex(primary)
  let fallback = null
  if (fs.existsSync(FALLBACK)) {
    const fbTokens = buildSourceIndex(FALLBACK)
    fallback = { tokens: fbTokens, fti: buildFirstTokenIndex(fbTokens) }
  }
  return {
    primary: { tokens: primary, fti: primaryFti },
    fallback,
  }
}

function lookupWithFallback(text, idx) {
  if (!text) return null
  const p = lookupPage(text, idx.primary.tokens, idx.primary.fti)
  if (p !== null) return p
  if (!idx.fallback) return null
  return lookupPage(text, idx.fallback.tokens, idx.fallback.fti, { safeAmbiguousMin: 15 })
}

/**
 * Static page map for the 4-week psalter First Vespers cycle. Derived
 * from `parsed_data/full_pdf.txt` by walking the "Хариу залбирал" /
 * "Шад дуулал" / "Уншлага" markers within each psalter-week block
 * (task #41 audit — see PRD FR-156). These pages are authoritative
 * for every propers/*.json Sunday firstVespers that maps to the
 * corresponding psalter week via the season → week mapping:
 *
 *   advent: 1→1, 2→2, 3→3, 4→4
 *   lent: 1→1, 2→2, 3→3, 4→4, 5→1, 6→2
 *   easter: 2→2, 3→3, 4→4, 5→1, 6→2, 7→3
 *   christmas: holyFamily→1, baptism→1
 *   ordinary-time: week i → ((i-1) % 4) + 1
 *
 * NOT applied to sanctoral/*.json entries (solemnities/feasts) nor to
 * movable keys (ascension/pentecost/trinitySunday/corpusChristi/
 * sacredHeart/christTheKing) — those have PDF-specific page sections
 * and fingerprint matching works correctly for them.
 */
const PSALTER_WEEK_PAGES = {
  1: { psalm0: 49, psalm1: 51, psalm2: 53, shortReading: 55, responsory: 55 },
  2: { psalm0: 166, psalm1: 168, psalm2: 170, shortReading: 171, responsory: 172 },
  3: { psalm0: 287, psalm1: 289, psalm2: 290, shortReading: 292, responsory: 292 },
  4: { psalm0: 398, psalm1: 400, psalm2: 401, shortReading: 402, responsory: 403 },
}

/**
 * Mutate a firstVespers block in-place, adding page fields.
 *
 * When `psalterWeek` (1..4) is provided, the psalm[0..2] / shortReading /
 * responsory pages come from PSALTER_WEEK_PAGES (authoritative) —
 * other fields (concludingPrayer / GC antiphon / alt prayer /
 * intercessions) still use the fingerprint path because they're
 * per-Sunday-distinct and not delegated to the psalter block.
 *
 * Without `psalterWeek`, every field uses the fingerprint path.
 *
 * Existing page values are overwritten when a new page is resolved —
 * callers that want to preserve prior values should skip this call.
 */
function annotatePagesInPlace(fv, idx, psalterWeek = null) {
  if (!fv || typeof fv !== 'object') return
  const psalterMap = psalterWeek && PSALTER_WEEK_PAGES[psalterWeek]

  const PROSE_PAIRS = [
    ['concludingPrayer', 'concludingPrayerPage'],
    ['alternativeConcludingPrayer', 'alternativeConcludingPrayerPage'],
    ['gospelCanticleAntiphon', 'gospelCanticleAntiphonPage'],
  ]
  for (const [textKey, pageKey] of PROSE_PAIRS) {
    const text = fv[textKey]
    if (typeof text !== 'string' || !text.trim()) continue
    const page = lookupWithFallback(text, idx)
    if (page !== null) fv[pageKey] = page
  }

  if (Array.isArray(fv.intercessions) && fv.intercessions.length > 0) {
    const first = fv.intercessions[0]
    if (typeof first === 'string') {
      const page = lookupWithFallback(first, idx)
      if (page !== null) fv.intercessionsPage = page
    }
  }

  if (fv.shortReading && typeof fv.shortReading === 'object' && !Array.isArray(fv.shortReading)) {
    const sr = fv.shortReading
    if (psalterMap) {
      sr.page = psalterMap.shortReading
    } else {
      const candidate = typeof sr.text === 'string' && sr.text.trim() ? sr.text : sr.ref
      if (typeof candidate === 'string' && candidate.trim()) {
        const page = lookupWithFallback(candidate, idx)
        if (page !== null) sr.page = page
      }
    }
  }

  if (fv.responsory && typeof fv.responsory === 'object' && !Array.isArray(fv.responsory)) {
    const r = fv.responsory
    if (psalterMap) {
      r.page = psalterMap.responsory
    } else {
      const full = typeof r.fullResponse === 'string' ? r.fullResponse.trim() : ''
      const v = typeof r.versicle === 'string' ? r.versicle.trim() : ''
      const short = typeof r.shortResponse === 'string' ? r.shortResponse.trim() : ''
      const tries = []
      if (full && v) tries.push(`${full} ${v}`)
      if (full) tries.push(full)
      if (v && short) tries.push(`${v} ${short}`)
      if (v) tries.push(v)
      if (short) tries.push(short)
      let page = null
      for (const t of tries) {
        page = lookupWithFallback(t, idx)
        if (page !== null) break
      }
      if (page !== null) r.page = page
    }
  }

  if (Array.isArray(fv.psalms)) {
    for (let i = 0; i < fv.psalms.length; i++) {
      const p = fv.psalms[i]
      if (!p || typeof p !== 'object') continue
      if (psalterMap) {
        // Map index 0/1/2 → psalm0/psalm1/psalm2. Skip higher indices
        // (shouldn't occur in psalter blocks which always have 3 slots).
        const key = `psalm${i}`
        if (psalterMap[key] !== undefined) {
          p.page = psalterMap[key]
          continue
        }
      }
      const candidate = typeof p.default_antiphon === 'string' && p.default_antiphon.trim()
        ? p.default_antiphon
        : p.ref
      if (typeof candidate !== 'string' || !candidate.trim()) continue
      const page = lookupWithFallback(candidate, idx)
      if (page !== null) p.page = page
    }
  }
}

/**
 * Season → weekKey → psalterWeek. Mirror of the MAPPINGS constant in
 * scripts/verify-first-vespers.js. Used by the injector and the
 * verifier to map a propers/*.json Sunday entry back to its psalter
 * cycle number so `annotatePagesInPlace(fv, idx, psalterWeek)` can
 * apply PSALTER_WEEK_PAGES.
 *
 * Sanctoral files (solemnities/feasts) and movable special keys
 * (ascension/pentecost/trinitySunday/corpusChristi/sacredHeart/
 * christTheKing) are NOT in this map — they use fingerprint.
 */
const PSALTER_WEEK_MAPPING = {
  advent: { 1: 1, 2: 2, 3: 3, 4: 4 },
  lent: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 1, 6: 2 },
  easter: { 2: 2, 3: 3, 4: 4, 5: 1, 6: 2, 7: 3 },
  christmas: { holyFamily: 1, baptism: 1 },
  'ordinary-time': Object.fromEntries(
    Array.from({ length: 34 }, (_, i) => [String(i + 1), ((i) % 4) + 1]),
  ),
}

function getPsalterWeekFromMapping(season, weekKey) {
  const m = PSALTER_WEEK_MAPPING[season]
  if (!m) return null
  return m[weekKey] ?? null
}

module.exports = {
  buildPageIndex,
  annotatePagesInPlace,
  lookupWithFallback,
  PSALTER_WEEK_PAGES,
  PSALTER_WEEK_MAPPING,
  getPsalterWeekFromMapping,
}
