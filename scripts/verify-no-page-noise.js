#!/usr/bin/env node
/**
 * verify-no-page-noise.js — F-X7 (#299) regression guard.
 *
 * Asserts that the PDF page-header label 'Магтуу' does NOT leak as
 * standalone tokens into hymn rich.json bodies. The page header sits
 * at the top of every PDF hymn page and historically got transcribed
 * as either:
 *
 *   (A) a single-line stanza ['Магтуу'] sandwiched between dividers, or
 *   (B) the first line of an otherwise-real stanza.
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
const PAGE_LABEL = 'Магтуу'

function findings() {
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
            file: f,
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

function main() {
  const hits = findings()
  if (hits.length === 0) {
    console.log(`[verify-no-page-noise] OK — 0 occurrences of standalone '${PAGE_LABEL}' in ${HYMN_DIR}`)
    process.exit(0)
  }
  console.error(`[verify-no-page-noise] FAIL — ${hits.length} page-noise occurrences (PDF page header leaked into hymn body):`)
  for (const h of hits) {
    console.error(`  ${h.file} block[${h.block}] line[${h.line}] shape=${h.shape}`)
  }
  console.error(`\nFix: re-run \`node scripts/strip-hymn-magtuu-noise.mjs\` (F-X7).`)
  process.exit(1)
}

main()
