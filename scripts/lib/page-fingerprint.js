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
 *  - If multiple distinct pages but the fingerprint is long (≥ SAFE_AMBIGUOUS_MIN)
 *    → return the earliest page (genuinely repeated PDF text, not prefix collision).
 *  - Otherwise (short ambiguous match) → return null (refuse to guess).
 */
function lookupPage(text, tokens, firstTokenIndex, options = {}) {
  const SAFE_AMBIGUOUS_MIN = options.safeAmbiguousMin ?? 10
  const maxFingerprint = options.maxFingerprint ?? 25
  const minFingerprint = options.minFingerprint ?? 3

  const all = tokenize(text)
  if (all.length === 0) return null

  const maxLen = Math.min(all.length, maxFingerprint)
  for (let len = maxLen; len >= minFingerprint; len--) {
    if (len > all.length) continue
    const pages = findAllPagesForFingerprint(all.slice(0, len), tokens, firstTokenIndex)
    if (pages.length === 0) continue
    const distinct = [...new Set(pages.filter(p => p !== null))]
    if (distinct.length === 0) continue
    if (distinct.length === 1) return distinct[0]
    if (len >= SAFE_AMBIGUOUS_MIN) return Math.min(...distinct)
    return null
  }
  return null
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
