/**
 * Shared page-annotation logic for firstVespers subtrees. Used by:
 *   - scripts/inject-first-vespers-pages.js (writes pages into src JSON)
 *   - scripts/verify-first-vespers.js, verify-solemnity-first-vespers.js,
 *     verify-movable-first-vespers.js (enriches the expected block so
 *     the byte-equal diff covers page fields too — task #36 / NFR-009d)
 *
 * Uses the same fingerprint strategy as `extract-propers-pages.js`:
 * primary source index first, fallback to `full_pdf.txt` with a tighter
 * safeAmbiguousMin.
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
 * Mutate a firstVespers block in-place, adding page fields for every
 * text field that resolves to a page via fingerprint. Leaves missed
 * fields alone (no page key inserted). Existing page values are
 * overwritten when a match is found.
 */
function annotatePagesInPlace(fv, idx) {
  if (!fv || typeof fv !== 'object') return

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
    const candidate = typeof sr.text === 'string' && sr.text.trim() ? sr.text : sr.ref
    if (typeof candidate === 'string' && candidate.trim()) {
      const page = lookupWithFallback(candidate, idx)
      if (page !== null) sr.page = page
    }
  }

  if (fv.responsory && typeof fv.responsory === 'object' && !Array.isArray(fv.responsory)) {
    const r = fv.responsory
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

  if (Array.isArray(fv.psalms)) {
    for (const p of fv.psalms) {
      if (!p || typeof p !== 'object') continue
      const candidate = typeof p.default_antiphon === 'string' && p.default_antiphon.trim()
        ? p.default_antiphon
        : p.ref
      if (typeof candidate !== 'string' || !candidate.trim()) continue
      const page = lookupWithFallback(candidate, idx)
      if (page !== null) p.page = page
    }
  }
}

module.exports = {
  buildPageIndex,
  annotatePagesInPlace,
  lookupWithFallback,
}
