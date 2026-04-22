#!/usr/bin/env node
/**
 * audit-psalter-ref-consistency.js
 *
 * For each psalm/canticle entry in src/data/loth/psalter/week-{1..4}.json,
 * verifies that the first-stanza fingerprint of `ref` (looked up in
 * psalter-texts.json) actually appears near the declared `page`.
 *
 * Catches the bug shape where `ref` disagrees with what the book prints
 * at `page` — e.g. week-4 SAT vespers psalms[1] declared `Psalm 116:10-19`
 * at page 401, but the PDF actually prints Psalm 130 there. A
 * `missing-body` audit cannot detect this because the wrong ref (Ps 116)
 * does have a body, just the wrong one.
 *
 * Logic:
 *   For each entry with a numeric `page`:
 *     1. If `psalter-texts.json[ref]` has no first-stanza → skip (other
 *        audits cover missing bodies).
 *     2. Tokenize first ~6 stanza tokens.
 *     3. Find all PDF pages where that fingerprint matches.
 *     4. Distance = min( |match - declared| for match in matches ).
 *     5. If distance > WINDOW_RADIUS → flag as suspect.
 *
 * Exit code: 1 when at least one suspect is found OR a data IO error.
 *
 * Usage:
 *   node scripts/audit-psalter-ref-consistency.js            # human report
 *   node scripts/audit-psalter-ref-consistency.js --json     # JSON report
 */

const fs = require('fs')
const path = require('path')
const {
  tokenize,
  buildSourceIndex,
  buildFirstTokenIndex,
  findAllPagesForFingerprint,
} = require('./lib/page-fingerprint')

const BASE = path.join(__dirname, '..')
const PSALTER_DIR = path.join(BASE, 'src/data/loth/psalter')
const TEXTS_PATH = path.join(BASE, 'src/data/loth/psalter-texts.json')
const SRC_PATH = path.join(BASE, 'parsed_data/full_pdf.txt')

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const HOURS = ['lauds', 'vespers']
const WINDOW_RADIUS = 2  // declared ±2 accepted (absorbs spread-layout + cross-refs)
const STANZA_TOKEN_COUNT = 6

function firstStanzaTokens(ref, psalmTexts) {
  const entry = psalmTexts[ref]
  if (!entry) return { status: 'no-entry' }
  const stanza = entry.stanzas?.[0]
  if (!Array.isArray(stanza) || stanza.length === 0) return { status: 'empty-stanza' }
  const toks = tokenize(stanza.join(' ')).slice(0, STANZA_TOKEN_COUNT)
  if (toks.length < 4) return { status: 'too-short-stanza' }
  return { status: 'ok', tokens: toks }
}

function collect(psalmTexts, srcTokens, firstTokenIndex) {
  const suspects = []
  const skipped = { noEntry: 0, emptyStanza: 0, tooShort: 0, noPage: 0 }
  let checked = 0

  for (let w = 1; w <= 4; w++) {
    const file = path.join(PSALTER_DIR, `week-${w}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const day of DAYS) {
      const dayData = data.days?.[day]
      if (!dayData) continue
      for (const hour of HOURS) {
        const hourData = dayData[hour]
        if (!hourData?.psalms) continue
        hourData.psalms.forEach((p, i) => {
          const loc = `week-${w} ${day} ${hour} psalms[${i}]`
          if (typeof p.page !== 'number') {
            skipped.noPage++
            return
          }
          const fp = firstStanzaTokens(p.ref, psalmTexts)
          if (fp.status !== 'ok') {
            if (fp.status === 'no-entry') skipped.noEntry++
            else if (fp.status === 'empty-stanza') skipped.emptyStanza++
            else skipped.tooShort++
            return
          }
          checked++
          const matches = findAllPagesForFingerprint(fp.tokens, srcTokens, firstTokenIndex)
            .filter(x => x !== null)
          if (matches.length === 0) {
            suspects.push({ kind: 'no-stanza-match', loc, ref: p.ref, declared: p.page, tokens: fp.tokens })
            return
          }
          const distance = Math.min(...matches.map(m => Math.abs(m - p.page)))
          if (distance > WINDOW_RADIUS) {
            const nearest = matches.reduce((a, b) => Math.abs(b - p.page) < Math.abs(a - p.page) ? b : a)
            suspects.push({
              kind: 'ref-page-mismatch',
              loc,
              ref: p.ref,
              declared: p.page,
              stanzaFoundAt: matches.slice().sort((a, b) => a - b),
              nearestMatch: nearest,
              distance,
              tokens: fp.tokens,
            })
          }
        })
      }
    }
  }
  return { suspects, skipped, checked }
}

function main() {
  const asJson = process.argv.includes('--json')
  const psalmTexts = JSON.parse(fs.readFileSync(TEXTS_PATH, 'utf8'))
  const srcTokens = buildSourceIndex(SRC_PATH)
  const firstTokenIndex = buildFirstTokenIndex(srcTokens)

  const { suspects, skipped, checked } = collect(psalmTexts, srcTokens, firstTokenIndex)

  if (asJson) {
    console.log(JSON.stringify({ checked, skipped, suspects }, null, 2))
    process.exitCode = suspects.length > 0 ? 1 : 0
    return
  }

  console.log('=== audit-psalter-ref-consistency ===')
  console.log(`source : ${path.relative(BASE, SRC_PATH)}`)
  console.log(`checked: ${checked}`)
  console.log(`skipped: no-entry=${skipped.noEntry} empty-stanza=${skipped.emptyStanza} too-short=${skipped.tooShort} no-page=${skipped.noPage}`)
  console.log(`suspects: ${suspects.length}\n`)

  if (suspects.length === 0) {
    console.log('OK — every checked entry\'s first-stanza fingerprint is within ±2 pages of its declared page.')
    return
  }

  for (const s of suspects) {
    console.log(`[${s.kind}] ${s.loc}`)
    console.log(`  ref     : ${s.ref}`)
    console.log(`  declared: p.${s.declared}`)
    if (s.kind === 'no-stanza-match') {
      console.log(`  tokens  : [${s.tokens.join(' ')}]   (not found anywhere in full_pdf.txt)`)
    } else {
      console.log(`  stanzaAt: ${s.stanzaFoundAt.join(', ')}`)
      console.log(`  nearest : p.${s.nearestMatch}  (distance ${s.distance})`)
    }
    console.log()
  }

  process.exitCode = 1
}

main()
