#!/usr/bin/env node
/**
 * verify-no-page-noise.js — F-X7 / F-X7b regression guard.
 *
 * Asserts that the PDF page-header label 'Магтуу' does NOT leak as a
 * standalone token into either hymn render path. The page header sits
 * at the top of every PDF hymn page and historically got transcribed
 * into two distinct surfaces:
 *
 *   1. Rich render path — src/data/loth/prayers/hymns/{N}.rich.json
 *      Shapes:
 *        (A) a single-line stanza ['Магтуу'] sandwiched between dividers, or
 *        (B) the first line of an otherwise-real stanza.
 *      Closed by F-X7 (#299).
 *
 *   2. Plain-text / alt-pick render path — src/data/loth/ordinarium/hymns.json
 *      `text` field (a single string with `\n` separators) where the
 *      noise appears as a standalone token line. Surfaces when the user
 *      picks a non-default candidate via the '다른 찬миг ai' menu
 *      (`useRich` gate in hymn-section.tsx falls back to plain text).
 *      Closed by F-X7b (#317).
 *
 * Both shapes are surfaced as failures here. Anything else that contains
 * 'Магтуу' as a substring inside a longer line (e.g. an inflected form
 * like 'магтууг' / 'магтуунуудыг', or the case-distinct lowercase
 * 'магтуу' which is body content) is fine — only standalone uppercase
 * 'Магтуу' page noise is an error.
 *
 * Exits non-zero on any finding so CI can block re-introduction.
 *
 * Usage:
 *   node scripts/verify-no-page-noise.js
 */
const fs = require('node:fs')
const path = require('node:path')

const HYMN_DIR = 'src/data/loth/prayers/hymns'
const ORDINARIUM_HYMNS = 'src/data/loth/ordinarium/hymns.json'
const PAGE_LABEL = 'Магтуу'

function findRichFindings() {
  const out = []
  const files = fs
    .readdirSync(HYMN_DIR)
    .filter((f) => /^\d+\.rich\.json$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(HYMN_DIR, f), 'utf-8'))
    const blocks = data?.hymnRich?.blocks || []
    blocks.forEach((b, i) => {
      if (b.kind !== 'stanza') return
      const lines = b.lines || []
      lines.forEach((ln, j) => {
        const text = (ln.spans || []).map((s) => s.text || '').join('').trim()
        if (text === PAGE_LABEL) {
          out.push({
            scope: 'rich',
            file: `${HYMN_DIR}/${f}`,
            block: i,
            line: j,
            shape: lines.length === 1 ? 'A:single-line-stanza' : 'B:first-line-of-stanza',
          })
        }
      })
    })
  }
  return out
}

function findOrdinariumFindings() {
  const out = []
  const data = JSON.parse(fs.readFileSync(ORDINARIUM_HYMNS, 'utf-8'))
  for (const [id, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue
    const text = entry.text
    if (typeof text !== 'string' || !text.includes(PAGE_LABEL)) continue
    const lines = text.split('\n')
    lines.forEach((line, idx) => {
      if (line.trim() === PAGE_LABEL) {
        out.push({
          scope: 'ordinarium',
          file: ORDINARIUM_HYMNS,
          hymnId: id,
          line: idx,
          shape: 'A:standalone-text-line',
        })
      }
    })
  }
  return out
}

function main() {
  const rich = findRichFindings()
  const ord = findOrdinariumFindings()
  const hits = [...rich, ...ord]
  if (hits.length === 0) {
    console.log(`[verify-no-page-noise] OK — 0 occurrences of standalone '${PAGE_LABEL}' in:`)
    console.log(`  - ${HYMN_DIR} (rich)`)
    console.log(`  - ${ORDINARIUM_HYMNS} (plain-text)`)
    process.exit(0)
  }
  console.error(`[verify-no-page-noise] FAIL — ${hits.length} page-noise occurrences (PDF page header leaked into hymn body):`)
  for (const h of hits) {
    if (h.scope === 'rich') {
      console.error(`  [rich] ${h.file} block[${h.block}] line[${h.line}] shape=${h.shape}`)
    } else {
      console.error(`  [ordinarium] hymn[${h.hymnId}] line[${h.line}] shape=${h.shape}`)
    }
  }
  console.error(`\nFix:`)
  if (rich.length > 0) console.error(`  rich path  → \`node scripts/strip-hymn-magtuu-noise.mjs\` (F-X7)`)
  if (ord.length > 0)  console.error(`  plain path → \`node scripts/strip-ordinarium-magtuu-noise.mjs\` (F-X7b)`)
  process.exit(1)
}

main()
