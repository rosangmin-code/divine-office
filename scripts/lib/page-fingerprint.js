/**
 * page-fingerprint.js
 *
 * Shared utilities for matching Mongolian Cyrillic text fragments against a
 * page-marked PDF extraction. Used by extract-{propers,hymn,psalter,sanctoral}-pages.js
 * and audit-page-coverage.js.
 *
 * Source format: a UTF-8 text file where bare integer lines (1-4 digits)
 * mark the page break for everything that follows, until the next bare
 * integer line.
 */

const fs = require('fs')

function tokenize(s) {
  if (!s) return []
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function buildSourceIndex(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)
  let currentPage = null
  const tokens = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\d{1,4}$/.test(trimmed)) {
      currentPage = parseInt(trimmed, 10)
      continue
    }
    const lineTokens = tokenize(trimmed)
    for (const t of lineTokens) {
      tokens.push({ token: t, page: currentPage })
    }
  }
  return tokens
}

/**
 * Build a flat token stream from MULTIPLE source files. Page numbering
 * resets per file (each file is an independent PDF section).
 */
function buildSourceIndexMulti(filePaths) {
  const tokens = []
  for (const fp of filePaths) {
    const sub = buildSourceIndex(fp)
    for (const t of sub) tokens.push(t)
  }
  return tokens
}

function buildFirstTokenIndex(tokens) {
  const map = new Map()
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].token
    if (!map.has(t)) map.set(t, [])
    map.get(t).push(i)
  }
  return map
}

function findAllPagesForFingerprint(needle, tokens, firstTokenIndex) {
  if (needle.length === 0) return []
  const candidates = firstTokenIndex.get(needle[0])
  if (!candidates) return []
  const pages = []
  outer: for (const start of candidates) {
    if (start + needle.length > tokens.length) continue
    for (let j = 1; j < needle.length; j++) {
      if (tokens[start + j].token !== needle[j]) continue outer
    }
    pages.push(tokens[start].page)
  }
  return pages
}

/**
 * Match `text` against the indexed source. Returns the matched page number,
 * or null if ambiguous/not found.
 *
 * Algorithm:
 *  - Try a long fingerprint (up to 25 tokens). Shrink one token at a time.
 *  - Stop at the first length that yields any match.
 *  - If that match resolves to a single distinct page → return it.
 *  - If multiple distinct pages but the fingerprint is long (≥ SAFE_AMBIGUOUS_MIN):
 *    - With `preferNearPage` hint → return the page closest to the hint
 *      (tie → earlier). Used when callers know a *declared* page and want
 *      to validate whether it matches.
 *    - Without hint → return the earliest page (current default behaviour).
 *  - For short ambiguous matches, with a hint → pick the nearest page within
 *    `nearWindow`; otherwise null.
 *
 * Body-fingerprint mode: when `bodyOffsets` includes offsets > 0, the matcher
 * also attempts mid-body token windows. This resists false positives from
 * generic openers ("Тэр үед...", "Ах дүү нар маань...") that recur across
 * many Bible passages — the deeper window carries distinctive tokens that
 * disambiguate.
 *
 * Options:
 *  - safeAmbiguousMin  - fingerprint length threshold for "trust earliest/nearest"
 *  - maxFingerprint, minFingerprint - length bounds
 *  - preferNearPage    - when ambiguous, pick the page closest to this hint
 *  - nearWindow        - distance ceiling for short-ambiguous fallback (default 3)
 *  - bodyOffsets       - start offsets to attempt; default [0]
 */
function lookupPage(text, tokens, firstTokenIndex, options = {}) {
  const SAFE_AMBIGUOUS_MIN = options.safeAmbiguousMin ?? 10
  const maxFingerprint = options.maxFingerprint ?? 25
  const minFingerprint = options.minFingerprint ?? 3
  const preferNearPage = options.preferNearPage ?? null
  const nearWindow = options.nearWindow ?? 3
  const bodyOffsets = options.bodyOffsets ?? [0]

  const all = tokenize(text)
  if (all.length === 0) return null

  function pickNearest(distinct) {
    if (preferNearPage == null) return Math.min(...distinct)
    return [...distinct].sort((a, b) => {
      const da = Math.abs(a - preferNearPage)
      const db = Math.abs(b - preferNearPage)
      return da !== db ? da - db : a - b
    })[0]
  }

  function tryFrom(offset) {
    const slice = all.slice(offset)
    const maxLen = Math.min(slice.length, maxFingerprint)
    for (let len = maxLen; len >= minFingerprint; len--) {
      if (len > slice.length) continue
      const pages = findAllPagesForFingerprint(slice.slice(0, len), tokens, firstTokenIndex)
      if (pages.length === 0) continue
      const distinct = [...new Set(pages.filter(p => p !== null))]
      if (distinct.length === 0) continue
      if (distinct.length === 1) return distinct[0]
      if (len >= SAFE_AMBIGUOUS_MIN) return pickNearest(distinct)
      if (preferNearPage != null) {
        const near = distinct.filter(p => Math.abs(p - preferNearPage) <= nearWindow)
        if (near.length > 0) return pickNearest(near)
      }
      return null
    }
    return null
  }

  const candidates = []
  for (const off of bodyOffsets) {
    const m = tryFrom(off)
    if (m !== null) candidates.push(m)
  }
  if (candidates.length === 0) return null
  if (preferNearPage != null) return pickNearest([...new Set(candidates)])
  return candidates[0]
}

/**
 * Count all `page`/`*Page` numeric fields anywhere in a JSON tree.
 * Used by audit-page-coverage.js to report current state.
 */
function countPageFields(node, counter = { total: 0, byKey: {} }) {
  if (Array.isArray(node)) {
    for (const item of node) countPageFields(item, counter)
    return counter
  }
  if (!node || typeof node !== 'object') return counter
  for (const [k, v] of Object.entries(node)) {
    if ((k === 'page' || k.endsWith('Page')) && typeof v === 'number') {
      counter.total++
      counter.byKey[k] = (counter.byKey[k] || 0) + 1
    }
    if (v && typeof v === 'object') countPageFields(v, counter)
  }
  return counter
}

module.exports = {
  tokenize,
  buildSourceIndex,
  buildSourceIndexMulti,
  buildFirstTokenIndex,
  findAllPagesForFingerprint,
  lookupPage,
  countPageFields,
}
