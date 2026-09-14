#!/usr/bin/env node
/**
 * verify-psalter-plain-rich-parity.js
 *
 * P0-6 (2026-09-14) — text-equivalence gate between the two psalter body
 * catalogs that MUST say the same thing:
 *
 *   - plain: src/data/loth/psalter-texts.json
 *            `{ [ref]: { stanzas: string[][], psalmPrayer?: string } }`
 *   - rich : src/data/loth/prayers/commons/psalter-texts.rich.json
 *            `{ [ref]: { stanzasRich: { blocks[] }, psalmPrayerRich?: { blocks[] } } }`
 *
 * The UI renders rich first (`src/components/psalm-block.tsx`) but the
 * plain catalog is still read by the loader fallback (`src/lib/hours/
 * loaders.ts`), by `audit-psalter-ref-consistency.js` and by the page
 * verifiers' stanza fingerprints. Before this gate existed, four PDF-
 * verified typo corrections (2026-05-10, #472/#480/#482/#484/#491) landed
 * in rich only and the plain catalog silently drifted for four months
 * (`docs/bug-reports/2026-09-13-verifier-red-and-plain-rich-drift.md` §B).
 *
 * What is compared (per ref key):
 *   1. key set equality (plain ⊆ rich and rich ⊆ plain);
 *   2. stanza body — plain `stanzas.flat()` with the leading-space indent
 *      convention stripped (`stripStanzaLeadingSpaces` in
 *      scripts/parsers/rich-builder.mjs) versus rich `stanza` blocks'
 *      `lines[].spans[].text` joined. Both sides are flattened to ONE
 *      whitespace-normalised string, so a line re-split (rich `lines` are
 *      1:1 with printed lines, plain lines are extractor lines) is NOT a
 *      difference — only characters are;
 *   3. psalm prayer — when BOTH `psalmPrayer` and `psalmPrayerRich` exist.
 *      A plain-only prayer is legal (psalm-block renders the plain
 *      fallback) and is reported as informational only.
 *
 * ALLOWED_EQUIVALENCES (punctuation-convention table) — applied to both
 * sides before comparing. Rule: ONLY glyph-convention pairs the rich
 * builder is known to normalise (see `normaliseForGate` in
 * scripts/parsers/rich-builder.mjs) may be listed; a WORD difference is
 * never an allowed equivalence, because it is exactly what this gate
 * exists to catch. The raw (table-free) diff count is always printed
 * next to the post-table count so the table's effect stays visible.
 *
 * History of the table:
 *   - 2026-09-14 first run (table empty): 5 keys / 8 tokens differed, all
 *     of them word-level (эвлэрүүлэхийг→эвлэрүүлснийг, бас→биш,
 *     Түүний буулгаж→Түүнийг буулган, Цаашаа→Цаашид, цуцлаач.→цуцлаач!,
 *     Далайнууд→Далайнуудад, хүүхдээс,→хүүхэд,) and ZERO glyph-convention
 *     differences (curly vs straight quotes, en/em-dash vs hyphen, NBSP
 *     are already identical in both catalogs). The table therefore
 *     starts EMPTY on purpose. Add an entry only with a concrete
 *     example + the builder rule that produces it.
 *
 * Read-only. CLI:
 *   node scripts/verify-psalter-plain-rich-parity.js           # report, exit 0
 *   node scripts/verify-psalter-plain-rich-parity.js --check   # exit 1 on any residual diff
 *   node scripts/verify-psalter-plain-rich-parity.js --raw     # ignore ALLOWED_EQUIVALENCES
 *   node scripts/verify-psalter-plain-rich-parity.js --ref "Psalm 135:1-12"
 *   node scripts/verify-psalter-plain-rich-parity.js --plain <p> --rich <p>
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_PLAIN = 'src/data/loth/psalter-texts.json'
const DEFAULT_RICH = 'src/data/loth/prayers/commons/psalter-texts.rich.json'

/**
 * Punctuation-convention equivalences. Each entry: `{ re, to, why }` —
 * `re` is applied with `String.prototype.replace` to BOTH sides.
 * Intentionally empty as of 2026-09-14 (see header). Keep glyph-only.
 */
const ALLOWED_EQUIVALENCES = [
  // Example of the ONLY acceptable shape (do not enable without evidence):
  // { re: /[“”]/g, to: '"', why: 'rich builder normaliseForGate: curly → straight double quote' },
]

function normaliseWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim()
}

// Mirrors `stripStanzaLeadingSpaces` in scripts/parsers/rich-builder.mjs —
// plain stanza lines encode indent as leading spaces ("  Би Таныг …").
function stripStanzaLeadingSpaces(s) {
  return String(s).replace(/^ +/, '')
}

function applyAllowedEquivalences(s, table) {
  let out = s
  for (const { re, to } of table) out = out.replace(re, to)
  return out
}

function flattenPlainStanzas(entry) {
  const stanzas = Array.isArray(entry?.stanzas) ? entry.stanzas : []
  return normaliseWhitespace(stanzas.flat().map(stripStanzaLeadingSpaces).join(' '))
}

function flattenRichBlocks(blocks) {
  const parts = []
  for (const block of blocks || []) {
    if (block.kind === 'stanza') {
      for (const line of block.lines || []) {
        parts.push((line.spans || []).map((sp) => sp.text ?? '').join(''))
      }
    } else if (block.kind === 'para') {
      parts.push((block.spans || []).map((sp) => sp.text ?? '').join(''))
    }
    // rubric-line / divider blocks carry no body text — skipped.
  }
  return normaliseWhitespace(parts.join(' '))
}

function flattenRichStanzas(entry) {
  return flattenRichBlocks(entry?.stanzasRich?.blocks)
}

function flattenRichPsalmPrayer(entry) {
  return flattenRichBlocks(entry?.psalmPrayerRich?.blocks)
}

function firstDivergence(a, b) {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[i] === b[i]) i++
  return i
}

function tokenDiff(a, b) {
  const ta = a.split(' ')
  const tb = b.split(' ')
  const out = []
  const max = Math.max(ta.length, tb.length)
  for (let i = 0; i < max; i++) {
    if (ta[i] !== tb[i]) {
      out.push({
        index: i,
        plain: ta.slice(Math.max(0, i - 2), i + 3).join(' '),
        rich: tb.slice(Math.max(0, i - 2), i + 3).join(' '),
      })
    }
  }
  return out
}

/**
 * Pure comparison. Returns { keyIssues, diffs, rawDiffs, stats }.
 *   - keyIssues: refs missing on one side
 *   - diffs    : residual differences AFTER the allowed table
 *   - rawDiffs : differences BEFORE the table (superset of diffs)
 */
function compareCatalogs({ plainData, richData, ref = null, table = ALLOWED_EQUIVALENCES }) {
  const plainKeys = Object.keys(plainData)
  const richKeys = Object.keys(richData)
  const richSet = new Set(richKeys)
  const plainSet = new Set(plainKeys)
  const keyIssues = []
  for (const k of plainKeys) if (!richSet.has(k)) keyIssues.push({ key: k, side: 'plain-only' })
  for (const k of richKeys) if (!plainSet.has(k)) keyIssues.push({ key: k, side: 'rich-only' })

  const keys = (ref ? [ref] : plainKeys).filter((k) => richSet.has(k) && plainSet.has(k))
  const rawDiffs = []
  const diffs = []
  const stats = { keysCompared: 0, prayersCompared: 0, prayerPlainOnly: 0, prayerRichOnly: 0 }

  function compareField(key, field, a, b) {
    if (a !== b) {
      rawDiffs.push({ key, field })
      const a2 = applyAllowedEquivalences(a, table)
      const b2 = applyAllowedEquivalences(b, table)
      if (a2 !== b2) {
        diffs.push({
          key,
          field,
          at: firstDivergence(a2, b2),
          plain: a2,
          rich: b2,
          tokens: tokenDiff(a2, b2),
        })
      }
    }
  }

  for (const key of keys) {
    const p = plainData[key]
    const r = richData[key]
    stats.keysCompared += 1
    compareField(key, 'stanzas', flattenPlainStanzas(p), flattenRichStanzas(r))

    const hasPlainPrayer = typeof p?.psalmPrayer === 'string' && p.psalmPrayer.trim() !== ''
    const hasRichPrayer = Array.isArray(r?.psalmPrayerRich?.blocks) && r.psalmPrayerRich.blocks.length > 0
    if (hasPlainPrayer && hasRichPrayer) {
      stats.prayersCompared += 1
      compareField(key, 'psalmPrayer', normaliseWhitespace(p.psalmPrayer), flattenRichPsalmPrayer(r))
    } else if (hasPlainPrayer) {
      stats.prayerPlainOnly += 1
    } else if (hasRichPrayer) {
      stats.prayerRichOnly += 1
    }
  }

  return { keyIssues, diffs, rawDiffs, stats }
}

function parseCliArgs(argv) {
  const args = { check: false, raw: false, ref: null, plain: DEFAULT_PLAIN, rich: DEFAULT_RICH }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--check') args.check = true
    else if (flag === '--raw') args.raw = true
    else if (flag === '--ref') args.ref = argv[++i] || null
    else if (flag === '--plain') args.plain = argv[++i] || null
    else if (flag === '--rich') args.rich = argv[++i] || null
    else if (flag === '--help' || flag === '-h') args.help = true
    else args.unknown = flag
  }
  return args
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/verify-psalter-plain-rich-parity.js [--check] [--raw] [--ref <key>] [--plain <p>] [--rich <p>]\n' +
      '\n' +
      'Compares psalter-texts.json (plain) against psalter-texts.rich.json (rich) body text.\n' +
      '  --check       exit 1 when any residual difference remains\n' +
      '  --raw         disable ALLOWED_EQUIVALENCES (show every character difference)\n' +
      "  --ref <key>   restrict to one ref (e.g. 'Psalm 135:1-12')\n" +
      `  --plain <p>   alternate plain catalog path (default: ${DEFAULT_PLAIN})\n` +
      `  --rich <p>    alternate rich catalog path (default: ${DEFAULT_RICH})\n`,
  )
}

function readJson(label, input) {
  const target = path.isAbsolute(input) ? input : path.join(ROOT, input)
  if (!fs.existsSync(target)) throw new Error(`${label} catalog not found: ${target}`)
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'))
  } catch (err) {
    throw new Error(`${label} JSON parse failed: ${err.message}`)
  }
}

function excerpt(s, at, before = 40, after = 60) {
  return `…${s.slice(Math.max(0, at - before), at + after)}…`
}

function main() {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return 0
  }
  if (args.unknown) {
    console.error(`[verify-psalter-plain-rich-parity] unknown argument: ${args.unknown}`)
    printHelp()
    return 1
  }

  let plainData
  let richData
  try {
    plainData = readJson('plain', args.plain)
    richData = readJson('rich', args.rich)
  } catch (err) {
    console.error(`[verify-psalter-plain-rich-parity] ${err.message}`)
    return 1
  }
  if (args.ref && !(args.ref in plainData)) {
    console.error(`[verify-psalter-plain-rich-parity] ref not found in plain catalog: ${args.ref}`)
    return 1
  }

  const table = args.raw ? [] : ALLOWED_EQUIVALENCES
  const { keyIssues, diffs, rawDiffs, stats } = compareCatalogs({
    plainData,
    richData,
    ref: args.ref,
    table,
  })

  const tag = '[verify-psalter-plain-rich-parity]'
  console.log(`${tag} plain=${Object.keys(plainData).length} keys, rich=${Object.keys(richData).length} keys`)
  console.log(
    `${tag} compared ${stats.keysCompared} stanza bod(ies), ${stats.prayersCompared} psalm prayer(s)` +
      ` (plain-only prayers: ${stats.prayerPlainOnly} [plain fallback renders them], rich-only: ${stats.prayerRichOnly})`,
  )
  console.log(
    `${tag} raw diffs (whitespace-only normalisation): ${rawDiffs.length}; ` +
      `after ALLOWED_EQUIVALENCES (${table.length} rule(s)): ${diffs.length}`,
  )

  for (const k of keyIssues) console.error(`  KEY ${k.side}: ${k.key}`)
  for (const d of diffs) {
    console.error(`\n  DIFF ${d.key} [${d.field}] first divergence @${d.at}`)
    console.error(`    plain: ${excerpt(d.plain, d.at)}`)
    console.error(`    rich : ${excerpt(d.rich, d.at)}`)
    for (const t of d.tokens.slice(0, 8)) {
      console.error(`    token#${t.index}: plain="${t.plain}" | rich="${t.rich}"`)
    }
    if (d.tokens.length > 8) console.error(`    … and ${d.tokens.length - 8} more token(s)`)
  }

  const failing = keyIssues.length + diffs.length
  if (failing === 0) {
    console.log(`${tag} OK — plain and rich psalter bodies are text-equivalent`)
    return 0
  }
  console.error(`\n${tag} ${failing} difference(s) (${keyIssues.length} key, ${diffs.length} body)`)
  if (!args.check) {
    console.error(`${tag} informational run — re-run with --check to fail`)
    return 0
  }
  console.error(`${tag} FAIL — sync plain to the PDF-verified side (see docs/data/source-typo-ledger.md)`)
  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  ALLOWED_EQUIVALENCES,
  compareCatalogs,
  flattenPlainStanzas,
  flattenRichStanzas,
  flattenRichPsalmPrayer,
  normaliseWhitespace,
}
