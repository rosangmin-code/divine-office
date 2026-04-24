#!/usr/bin/env node
/**
 * Task #39 audit helper — for each of the 17 manual-review entries in
 * scripts/out/psalter-page-review.json, extract the diagnostic
 * (headerAll/stanzaAll/window) and classify:
 *   - A: verifier-false-positive (declared correct, verifier too strict)
 *   - C: part-II-candidate (header on p-1 or p-2, body on declared)
 *   - D: ref/body data mismatch (stanza body doesn't exist near declared)
 *   - E: short-stanza fingerprint failure (stanza too small to fingerprint)
 *   - F: doxology-as-stanza (stanza[0] is Gloria Patri, not body)
 *
 * Output: per-entry row with category verdict + rationale.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const REVIEW = path.join(ROOT, 'scripts/out/psalter-page-review.json')
const TEXTS = path.join(ROOT, 'src/data/loth/psalter-texts.json')

const review = JSON.parse(fs.readFileSync(REVIEW, 'utf8'))
const psalmTexts = JSON.parse(fs.readFileSync(TEXTS, 'utf8'))

const ROMAN_RE = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/
const DOXOLOGY_MARKERS = [/^Тантай, Ариун Сүнсний/, /^Эцэг, Хүү,? Ариун Сүнсэнд/]

function tokenize(s) {
  return (s || '').toLowerCase().replace(/[''"«»""„…]/g, '').split(/[\s.,!?;:\-—]+/).filter(x => x.length > 0)
}

const entries = review.entries.filter(e => e.reason !== 'cross-reference-skipped' && e.reason !== 'part-II-skipped')
console.log(`Analyzing ${entries.length} manual-review entries (excluding ${review.entries.length - entries.length} already-skipped):\n`)

const byCategory = { A: [], C: [], D: [], E: [], F: [], X: [] }

for (const e of entries) {
  const data = psalmTexts[e.ref]
  const s0 = data?.stanzas?.[0]
  const s1 = data?.stanzas?.[1]
  const toks0 = Array.isArray(s0) ? tokenize(s0.join(' ')) : []
  const toks1 = Array.isArray(s1) ? tokenize(s1.join(' ')) : []
  const firstLine = Array.isArray(s0) ? s0[0] : ''

  const isRoman = ROMAN_RE.test((firstLine || '').trim())
  const isDoxology = DOXOLOGY_MARKERS.some(re => re.test((firstLine || '').trim()))
  const tooShort = toks0.length < 4

  const diag = e.diag || {}
  const headerAll = diag.headerAll || []
  const stanzaAll = diag.stanzaAll || []
  const window = diag.window || [e.declared - 1, e.declared, e.declared + 1]

  let category, rationale

  if (e.reason === 'multiple-HS-in-window') {
    const hsMatches = diag.hsMatches || []
    if (hsMatches.includes(e.declared)) {
      category = 'A'
      rationale = `multiple-HS includes declared ${e.declared} (hsMatches=[${hsMatches.join(',')}]). Declared is correct; verifier tiebreaker would promote.`
    } else {
      category = 'X'
      rationale = `multiple-HS excludes declared ${e.declared} (hsMatches=[${hsMatches.join(',')}]). Needs manual check.`
    }
  } else if (isRoman) {
    category = 'C'
    rationale = `stanza[0] is Roman numeral "${firstLine}" — Part II split psalm. Header (${headerAll.join(',')}) + body (${stanzaAll.join(',')}) straddle Part I→II page. Declared ${e.declared} likely correct. Add to PART_II_SKIPS.`
  } else if (isDoxology) {
    category = 'F'
    rationale = `stanza[0] is doxology "${(firstLine || '').slice(0,40)}..." — psalter-texts.json data issue. Real psalm body is elsewhere in stanzas[]. Verifier should try stanza[1] fallback or skip doxology.`
  } else if (tooShort) {
    category = 'E'
    rationale = `stanza[0] has only ${toks0.length} tokens: "${firstLine}". Verifier should try stanza[1] fallback (${toks1.length} tokens).`
  } else if (headerAll.length > 0 && stanzaAll.length > 0) {
    // Header + stanza both found but outside window.
    const nearest = Math.min(...headerAll.map(h => Math.abs(h - e.declared)))
    if (nearest <= 2 && headerAll.some(h => stanzaAll.includes(h) || stanzaAll.includes(h + 1))) {
      category = 'C'
      rationale = `header on ${headerAll.join(',')}, stanza on ${stanzaAll.join(',')} — declared ${e.declared} is continuation page (Part II candidate). Distance ${nearest} from nearest header.`
    } else {
      category = 'D'
      rationale = `header on ${headerAll.join(',')}, stanza on ${stanzaAll.join(',')}, but no (H∧S) alignment near declared ${e.declared}. Possible ref/body mismatch or misdeclared page.`
    }
  } else if (headerAll.length === 0) {
    category = 'D'
    rationale = `header not found anywhere (CANTICLE_HEADERS may be missing or ref unparseable). For canticle refs, CANTICLE_HEADERS["${e.ref.split(/\s+\d/)[0]}"] may be missing.`
  } else {
    category = 'D'
    rationale = `stanza fingerprint not found anywhere in PDF. Ref/body mismatch — need separate fix.`
  }

  byCategory[category].push(e)
  console.log(`[${category}] ${e.file.split('/').pop()} ${e.locator}`)
  console.log(`    ref=${e.ref} declared=${e.declared} reason=${e.reason}`)
  console.log(`    rationale: ${rationale}`)
  if (!isRoman && !isDoxology && toks0.length >= 4) {
    console.log(`    fingerprint tokens: [${toks0.slice(0,6).join(',')}]`)
  }
  console.log('')
}

console.log('\n=== Summary ===')
console.log(`A (auto-promote via tiebreaker):     ${byCategory.A.length}`)
console.log(`C (add to PART_II_SKIPS):            ${byCategory.C.length}`)
console.log(`D (ref/body data mismatch — new task): ${byCategory.D.length}`)
console.log(`E (short-stanza fingerprint):        ${byCategory.E.length}`)
console.log(`F (doxology stanza[0]):              ${byCategory.F.length}`)
console.log(`X (other):                           ${byCategory.X.length}`)
