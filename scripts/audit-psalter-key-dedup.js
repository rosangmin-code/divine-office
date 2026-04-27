#!/usr/bin/env node
/**
 * audit-psalter-key-dedup.js — FR-160-D
 *
 * Detect duplicate-content groups in src/data/loth/psalter-texts.json.
 * Two keys belong to the same group when their `stanzas` arrays produce
 * an identical normalized fingerprint (whitespace-collapsed line join).
 *
 * For each group, emit a `canonical` recommendation by policy
 * (revised per peer R1 feedback — externalRefs first to minimise
 * redirect churn and honour de-facto usage):
 *   1) prefer the key with the most external refs (propers/sanctoral/
 *      psalter/e2e). Stable references win — minimises rewrite scope.
 *   2) tiebreaker: widest verse range (parse "Psalm N:A-B" → span=B-A;
 *      no colon → treat as MAX, i.e. whole psalm)
 *   3) tiebreaker: presence of explicit `page` field
 *   4) tiebreaker: numeric verse order — start asc, then end asc.
 *      (Lexical sort would put "11-19" before "2-10"; numeric is
 *      intuitive for the orphan-group case.)
 *
 * Output JSON to scripts/out/psalter-key-dedup-audit.json + Markdown
 * summary to scripts/out/psalter-key-dedup-audit.md.
 *
 * Read-only — does NOT mutate any data file.
 *
 * Flag:
 *   --check — exit 1 when any redundant key remains (NFR-009g CI gate).
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

const SRC = resolve(REPO_ROOT, 'src/data/loth/psalter-texts.json')
const PROPERS_DIR = resolve(REPO_ROOT, 'src/data/loth/propers')
const SANCTORAL_DIR = resolve(REPO_ROOT, 'src/data/loth/sanctoral')
const PSALTER_DIR = resolve(REPO_ROOT, 'src/data/loth/psalter')
const E2E_DIR = resolve(REPO_ROOT, 'e2e')
const OUT_JSON = resolve(REPO_ROOT, 'scripts/out/psalter-key-dedup-audit.json')
const OUT_MD = resolve(REPO_ROOT, 'scripts/out/psalter-key-dedup-audit.md')

function fingerprint(stanzas) {
  if (!Array.isArray(stanzas)) return null
  return stanzas
    .map((s) => (Array.isArray(s) ? s.map((l) => String(l).replace(/\s+/g, ' ').trim()).join('\n') : ''))
    .join('\n\n')
}

function parseVerseOrder(key) {
  // Extract the first verse-range fragment after ":" for tie-break order.
  // Returns {start, end} (Number.MAX_SAFE_INTEGER for "Psalm N" no colon).
  if (!key.includes(':')) return { start: Number.MAX_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER }
  const m = key.match(/:\s*(\d+)\s*[a-zA-Z]?\s*[-–—]\s*(\d+)\s*[a-zA-Z]?/)
  if (!m) {
    // bare verse "Psalm N:M" — treat both as M
    const single = key.match(/:\s*(\d+)/)
    if (single) {
      const n = parseInt(single[1], 10)
      return { start: n, end: n }
    }
    return { start: Number.MAX_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER }
  }
  return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
}

function rangeWidth(key) {
  // Strip everything before the first ":" so that bare "Psalm 117" returns
  // MAX_SAFE_INTEGER (whole psalm). Then sum every "<digits><alpha?>-<digits><alpha?>"
  // fragment as (b-a). Alphabetical suffixes (e.g. "27b") strip to digits.
  if (!key.includes(':')) return Number.MAX_SAFE_INTEGER
  const fragments = [
    ...key.matchAll(/(\d+)\s*[a-zA-Z]?\s*[-–—]\s*(\d+)\s*[a-zA-Z]?/g),
  ]
  if (fragments.length === 0) return 0
  return fragments.reduce((acc, p) => {
    const a = parseInt(p[1], 10)
    const b = parseInt(p[2], 10)
    return acc + (Number.isFinite(a) && Number.isFinite(b) ? b - a : 0)
  }, 0)
}

function* walkFiles(dir, exts) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      yield* walkFiles(full, exts)
    } else if (exts.some((e) => name.endsWith(e))) {
      yield full
    }
  }
}

function countRefOccurrencesAcrossFiles(key, files) {
  let count = 0
  // exact key match inside JSON string values OR inline source
  // (matches both "ref": "Psalm 118:1-14" and similar contexts)
  const needle = JSON.stringify(key).slice(1, -1) // unwrap quotes for substring
  for (const f of files) {
    const content = readFileSync(f, 'utf8')
    const re = new RegExp(`"${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')
    const m = content.match(re)
    if (m) count += m.length
  }
  return count
}

async function main() {
  const srcRaw = await readFile(SRC, 'utf8')
  const src = JSON.parse(srcRaw)
  const keys = Object.keys(src)

  // 1) group by fingerprint
  const groups = new Map() // fp → [keys]
  for (const k of keys) {
    const entry = src[k]
    if (!entry || !Array.isArray(entry.stanzas)) continue
    const fp = fingerprint(entry.stanzas)
    if (!fp) continue
    if (!groups.has(fp)) groups.set(fp, [])
    groups.get(fp).push(k)
  }

  const dupGroups = [...groups.entries()].filter(([, ks]) => ks.length >= 2)

  // 2) collect ref usage frequency from external files
  const externalFiles = [
    ...walkFiles(PROPERS_DIR, ['.json']),
    ...walkFiles(SANCTORAL_DIR, ['.json']),
    ...walkFiles(PSALTER_DIR, ['.json']),
    ...walkFiles(E2E_DIR, ['.ts', '.tsx']),
  ]

  // 3) per-group canonical recommendation
  const report = []
  let totalRedundant = 0
  for (const [fp, ks] of dupGroups) {
    const sortedKeys = [...ks].sort()
    const enriched = sortedKeys.map((k) => {
      const entry = src[k]
      return {
        key: k,
        rangeWidth: rangeWidth(k),
        stanzaCount: entry?.stanzas?.length ?? 0,
        lineCount: (entry?.stanzas ?? []).reduce((a, s) => a + (Array.isArray(s) ? s.length : 0), 0),
        hasPage: typeof entry?.page === 'number' && entry.page > 0,
        hasPsalmPrayer: typeof entry?.psalmPrayer === 'string' && entry.psalmPrayer.length > 0,
        externalRefs: countRefOccurrencesAcrossFiles(k, externalFiles),
      }
    })
    // Canonical pick policy (peer R1 revision):
    enriched.sort((a, b) => {
      // 1) most external refs wins (de-facto usage stability)
      if (a.externalRefs !== b.externalRefs) return b.externalRefs - a.externalRefs
      // 2) widest range
      if (a.rangeWidth !== b.rangeWidth) return b.rangeWidth - a.rangeWidth
      // 3) explicit page
      if (a.hasPage !== b.hasPage) return a.hasPage ? -1 : 1
      // 4) numeric verse order — start ascending, then end ascending.
      //    Falls back to lexical when numeric parse fails.
      const av = parseVerseOrder(a.key)
      const bv = parseVerseOrder(b.key)
      if (av.start !== bv.start) return av.start - bv.start
      if (av.end !== bv.end) return av.end - bv.end
      return a.key.localeCompare(b.key)
    })
    const canonical = enriched[0].key
    const redundant = enriched.slice(1).map((e) => e.key)
    totalRedundant += redundant.length
    // psalmPrayer preservation guard — if non-canonical key uniquely
    // carries psalmPrayer/psalmPrayerPage that the canonical lacks,
    // flag for manual review.
    const canonicalEntry = src[canonical]
    const losesPsalmPrayer = redundant.some((rk) => {
      const re = src[rk]
      const canonHasPp = typeof canonicalEntry?.psalmPrayer === 'string' && canonicalEntry.psalmPrayer.length > 0
      const otherHasPp = typeof re?.psalmPrayer === 'string' && re.psalmPrayer.length > 0
      return otherHasPp && !canonHasPp
    })
    report.push({
      canonical,
      redundant,
      memberCount: enriched.length,
      members: enriched,
      stanzaCount: enriched[0].stanzaCount,
      lineCount: enriched[0].lineCount,
      losesPsalmPrayerWarning: losesPsalmPrayer,
    })
  }

  // sort report by canonical for deterministic output
  report.sort((a, b) => a.canonical.localeCompare(b.canonical))

  const summary = {
    totalKeys: keys.length,
    duplicateGroupCount: report.length,
    redundantKeyCount: totalRedundant,
    uniqueSignatureCount: keys.length - totalRedundant,
    groups: report,
  }

  await writeFile(OUT_JSON, JSON.stringify(summary, null, 2), 'utf8')

  // Markdown summary
  const md = []
  md.push('# psalter-texts.json key dedup audit (FR-160-D)')
  md.push('')
  md.push(`총 keys: **${summary.totalKeys}**, duplicate-content groups: **${summary.duplicateGroupCount}**, redundant keys: **${summary.redundantKeyCount}**, unique signatures: **${summary.uniqueSignatureCount}**`)
  md.push('')
  md.push('## Canonical 정책 (peer R1 revision)')
  md.push('1. propers/sanctoral/psalter/e2e 외부 참조 빈도 높은 키 우선 (de-facto 안정성)')
  md.push('2. 가장 넓은 verse range (rangeWidth = sum of (b-a))')
  md.push('3. `page` 필드 보유 우선')
  md.push('4. numeric verse order tie-break (start asc, then end asc)')
  md.push('')
  md.push('## Groups')
  md.push('')
  for (const g of report) {
    const flag = g.losesPsalmPrayerWarning ? ' ⚠️ MANUAL_REVIEW (psalmPrayer 손실 위험)' : ''
    md.push(`### ${g.canonical}${flag}`)
    md.push(`stanza=${g.stanzaCount}, line=${g.lineCount}`)
    md.push('')
    md.push('| key | rangeWidth | externalRefs | hasPage | hasPsalmPrayer | role |')
    md.push('|---|---|---|---|---|---|')
    for (const m of g.members) {
      const role = m.key === g.canonical ? '**canonical**' : 'redundant'
      md.push(`| \`${m.key}\` | ${m.rangeWidth} | ${m.externalRefs} | ${m.hasPage ? 'Y' : 'N'} | ${m.hasPsalmPrayer ? 'Y' : 'N'} | ${role} |`)
    }
    md.push('')
  }
  await writeFile(OUT_MD, md.join('\n'), 'utf8')

  console.log(`[audit] groups=${summary.duplicateGroupCount} redundant=${summary.redundantKeyCount} unique=${summary.uniqueSignatureCount}/${summary.totalKeys}`)
  console.log(`[audit] JSON: scripts/out/psalter-key-dedup-audit.json`)
  console.log(`[audit] MD: scripts/out/psalter-key-dedup-audit.md`)

  // NFR-009g CI gate — fail on any redundant key.
  if (process.argv.includes('--check')) {
    if (summary.redundantKeyCount === 0) {
      console.log('[audit --check] OK — psalter-texts.json keys are unique by stanza fingerprint.')
      process.exit(0)
    }
    console.error(`[audit --check] FAIL — ${summary.redundantKeyCount} redundant keys across ${summary.duplicateGroupCount} groups (NFR-009g). See scripts/out/psalter-key-dedup-audit.md for details.`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
