#!/usr/bin/env node
/**
 * verify-hymn-pages.js
 *
 * Validates `page` values on src/data/loth/ordinarium/hymns.json against
 * parsed_data/full_pdf.txt (fallback: parsed_data/hymns/hymns_full.txt).
 *
 * Dual-anchor evidence (adapted from NFR-009c for hymns — no antiphon marker):
 *   - Anchor H (hard): "<num>. <title>" phrase (hymn body section numbers each entry)
 *   - Anchor S (hard): first 3 body lines fingerprint
 *
 * Correction accepted only when, within {declared-1, declared, declared+1},
 * exactly one page p_h satisfies H ∧ (S on p_h or p_h+1), and p_h != declared.
 * Otherwise → manual-review.
 *
 * Read-only. Emits:
 *   scripts/out/hymn-page-corrections.json  (verified bucket)
 *   scripts/out/hymn-page-review.json       (manual-review bucket with diag)
 */

const fs = require('fs')
const path = require('path')
const {
  tokenize,
  buildSourceIndex,
  buildFirstTokenIndex,
  findAllPagesForFingerprint,
} = require('./lib/page-fingerprint')

const ROOT = path.resolve(__dirname, '..')
const FULL_PDF = path.join(ROOT, 'parsed_data/full_pdf.txt')
const FALLBACK_SRC = path.join(ROOT, 'parsed_data/hymns/hymns_full.txt')
const SOURCE = fs.existsSync(FULL_PDF) ? FULL_PDF : FALLBACK_SRC
const TARGET = path.join(ROOT, 'src/data/loth/ordinarium/hymns.json')
const OUT_DIR = path.join(ROOT, 'scripts/out')
const OUT_CORRECTIONS = path.join(OUT_DIR, 'hymn-page-corrections.json')
const OUT_REVIEW = path.join(OUT_DIR, 'hymn-page-review.json')

function firstBodyLines(text, n) {
  if (typeof text !== 'string') return ''
  const out = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t) out.push(t)
    if (out.length >= n) break
  }
  return out.join(' ')
}

function pagesMatching(needleTokens, srcTokens, firstTokenIndex) {
  if (needleTokens.length === 0) return new Set()
  return new Set(findAllPagesForFingerprint(needleTokens, srcTokens, firstTokenIndex).filter(p => p !== null))
}

function classify(num, entry, ctx) {
  const declared = entry.page
  if (typeof declared !== 'number') {
    return { status: 'manual-review', reason: 'no-declared-page' }
  }
  const title = typeof entry.title === 'string' ? entry.title.trim() : ''
  const body3 = firstBodyLines(entry.text, 3)

  const headerText = `${num}. ${title}`
  const headerTokens = tokenize(headerText)
  const stanzaTokens = tokenize(body3).slice(0, 10) // cap fingerprint length
  if (headerTokens.length < 2) return { status: 'manual-review', reason: 'header-too-short' }
  if (stanzaTokens.length < 4) return { status: 'manual-review', reason: 'body-too-short' }

  const window = [declared - 1, declared, declared + 1]
  const headerPages = pagesMatching(headerTokens, ctx.srcTokens, ctx.firstTokenIndex)
  const stanzaPages = pagesMatching(stanzaTokens, ctx.srcTokens, ctx.firstTokenIndex)

  const hCandidates = window.filter(p => headerPages.has(p))
  const hsMatches = hCandidates.filter(p => stanzaPages.has(p) || stanzaPages.has(p + 1))

  if (hsMatches.length === 0) {
    return {
      status: 'manual-review',
      reason: 'no-HS-in-window',
      diag: {
        headerAll: [...headerPages].sort((a, b) => a - b),
        stanzaAll: [...stanzaPages].sort((a, b) => a - b),
        window,
      },
    }
  }
  if (hsMatches.length > 1) {
    return { status: 'manual-review', reason: 'multiple-HS-in-window', diag: { hsMatches } }
  }
  const pStar = hsMatches[0]
  const evidence = {
    header: { tokens: headerTokens, page: pStar },
    stanza: { tokens: stanzaTokens, page: stanzaPages.has(pStar) ? pStar : pStar + 1 },
  }
  if (pStar === declared) return { status: 'agree', pStar, evidence }
  return { status: 'verified-correction', pStar, evidence }
}

function main() {
  console.log('=== verify-hymn-pages ===')
  console.log(`source: ${path.relative(ROOT, SOURCE)}`)

  const srcTokens = buildSourceIndex(SOURCE)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)
  console.log(`source tokens: ${srcTokens.length.toLocaleString()}  unique firsts: ${firstTokenIndex.size.toLocaleString()}`)

  const data = JSON.parse(fs.readFileSync(TARGET, 'utf8'))
  const relTarget = path.relative(ROOT, TARGET)

  const corrections = {
    version: 1,
    generated: new Date().toISOString(),
    source: path.relative(ROOT, SOURCE),
    files: {},
  }
  const review = { version: 1, generated: corrections.generated, entries: [] }

  const freq = { 'declared-1': 0, declared: 0, 'declared+1': 0, other: 0, 'no-HS': 0 }
  const statusCounts = { agree: 0, 'verified-correction': 0, 'manual-review': 0 }

  for (const [num, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.page !== 'number') continue
    const result = classify(num, entry, { srcTokens, firstTokenIndex })

    if (result.pStar != null) {
      if (result.pStar === entry.page - 1) freq['declared-1']++
      else if (result.pStar === entry.page) freq['declared']++
      else if (result.pStar === entry.page + 1) freq['declared+1']++
      else freq['other']++
    } else {
      freq['no-HS']++
    }

    if (result.status === 'agree') { statusCounts.agree++; continue }
    if (result.status === 'verified-correction') {
      statusCounts['verified-correction']++
      if (!corrections.files[relTarget]) corrections.files[relTarget] = []
      corrections.files[relTarget].push({
        num,
        title: entry.title,
        locator: num,
        from: entry.page,
        to: result.pStar,
        evidence: result.evidence,
      })
      continue
    }
    statusCounts['manual-review']++
    review.entries.push({
      file: relTarget,
      num,
      title: entry.title,
      declared: entry.page,
      reason: result.reason,
      diag: result.diag,
    })
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_CORRECTIONS, JSON.stringify(corrections, null, 2) + '\n')
  fs.writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2) + '\n')

  console.log('')
  console.log('--- ±1 frequency (H∧S p_h relative to declared) ---')
  for (const [k, v] of Object.entries(freq)) console.log(`  ${k.padEnd(12)}: ${v}`)

  console.log('')
  console.log('--- Status counts ---')
  for (const [k, v] of Object.entries(statusCounts)) console.log(`  ${k.padEnd(30)}: ${v}`)

  console.log('')
  console.log(`corrections: ${path.relative(ROOT, OUT_CORRECTIONS)} (${statusCounts['verified-correction']} entries)`)
  console.log(`review     : ${path.relative(ROOT, OUT_REVIEW)} (${review.entries.length} entries)`)
}

main()
