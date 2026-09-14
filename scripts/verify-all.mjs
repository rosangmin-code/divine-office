#!/usr/bin/env node
/**
 * verify-all.mjs — one entry point for every READ-ONLY data verifier
 * (P0-6, 2026-09-14). Wired as `npm run verify:all` and into the CI
 * quality job (replacing the single "Phrase coverage gate" step, which is
 * now one of the entries below).
 *
 * Contract:
 *   - Runs every verifier in ORDER, never stops early, prints a summary
 *     table, exits 1 if ANY verifier failed. Exit 0 otherwise.
 *   - Verifiers tagged `sot: true` read the PDF source-of-truth dump
 *     `parsed_data/full_pdf.txt`. That file is gitignored (not on CI), so
 *     when it is absent they are reported as SKIP (SoT absent) and do NOT
 *     fail the run. Locally, with the dump present, they run for real.
 *   - Nothing here writes a tracked file. Verifiers that regenerate
 *     `scripts/out/*` artefacts are excluded on purpose: the six page
 *     verifiers (`verify-{psalter,psalter-body,hymn,compline,propers,
 *     sanctoral}-pages.js`) live under `npm run verify:pages` instead, and
 *     `audit-psalter-key-dedup.js` is invoked with `--no-write`.
 *     `verify-psalter-seasonal-antiphons.js` re-runs its extractor into the
 *     gitignored `scripts/output/` — acceptable.
 *
 * Adding a verifier: append to VERIFIERS with `sot: true` when it reads
 * `parsed_data/full_pdf.txt` (grep the script for `full_pdf`). Keep the
 * per-script `--check` flag when the script only fails with it.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SOT_PATH = resolve(ROOT, 'parsed_data/full_pdf.txt')

// Order: cheap structural gates first, PDF-anchored gates last.
const VERIFIERS = [
  { id: 'body-purity', args: ['scripts/verify-body-purity.js', '--check'] },
  { id: 'phrase-coverage', args: ['scripts/verify-phrase-coverage.js', '--check'] },
  { id: 'hymn-phrase-merge', args: ['scripts/verify-hymn-phrase-merge.js'] },
  { id: 'psalter-plain-rich-parity', args: ['scripts/verify-psalter-plain-rich-parity.js', '--check'] },
  { id: 'psalter-key-dedup', args: ['scripts/audit-psalter-key-dedup.js', '--check', '--no-write'] },
  { id: 'first-vespers-ref-coverage', args: ['scripts/verify-first-vespers-ref-coverage.js'] },
  { id: 'no-page-noise', args: ['scripts/verify-no-page-noise.js'] },
  { id: 'page-redirects', args: ['scripts/verify-page-redirects.js'] },
  { id: 'page-redirect-bodies', args: ['scripts/verify-page-redirect-bodies.js'] },
  { id: 'conditional-rubrics', args: ['scripts/verify-conditional-rubrics.js'] },
  { id: 'page-coverage', args: ['scripts/audit-page-coverage.js'] },
  // PDF-anchored (need parsed_data/full_pdf.txt):
  { id: 'conditional-rubric-coverage', args: ['scripts/verify-conditional-rubric-coverage.js'], sot: true },
  { id: 'psalter-seasonal-antiphons', args: ['scripts/verify-psalter-seasonal-antiphons.js'], sot: true },
  { id: 'psalter-ref-consistency', args: ['scripts/audit-psalter-ref-consistency.js'], sot: true },
]

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const quiet = process.argv.includes('--quiet')
const sotPresent = existsSync(SOT_PATH)

function hr(title) {
  const line = '─'.repeat(Math.max(0, 66 - title.length))
  console.log(`\n── ${title} ${line}`)
}

const results = []
const t0 = Date.now()
console.log(`[verify:all] ${VERIFIERS.length} verifier(s); SoT parsed_data/full_pdf.txt: ${sotPresent ? 'present' : 'ABSENT (PDF-anchored gates will be skipped)'}`)

for (const v of VERIFIERS) {
  if (only && v.id !== only) continue
  if (v.sot && !sotPresent) {
    results.push({ id: v.id, status: 'SKIP', note: 'SoT absent', ms: 0 })
    hr(`${v.id} — SKIP (SoT absent)`)
    continue
  }
  hr(`${v.id} — node ${v.args.join(' ')}`)
  const start = Date.now()
  const res = spawnSync(process.execPath, v.args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  })
  const ms = Date.now() - start
  const ok = res.status === 0
  if (quiet && !ok) {
    process.stdout.write(res.stdout || '')
    process.stderr.write(res.stderr || '')
  }
  if (res.error) console.error(`[verify:all] ${v.id}: spawn error — ${res.error.message}`)
  results.push({ id: v.id, status: ok ? 'PASS' : 'FAIL', note: ok ? '' : `exit ${res.status ?? 'signal'}`, ms })
}

hr('summary')
const pad = (s, n) => String(s).padEnd(n)
for (const r of results) {
  console.log(`  ${pad(r.status, 5)} ${pad(r.id, 30)} ${pad(r.ms ? `${(r.ms / 1000).toFixed(1)}s` : '', 7)} ${r.note}`)
}
const failed = results.filter((r) => r.status === 'FAIL')
const skipped = results.filter((r) => r.status === 'SKIP')
const passed = results.filter((r) => r.status === 'PASS')
console.log(
  `\n[verify:all] ${passed.length} PASS / ${failed.length} FAIL / ${skipped.length} SKIP` +
    ` in ${((Date.now() - t0) / 1000).toFixed(1)}s` +
    (failed.length ? ` — FAILED: ${failed.map((f) => f.id).join(', ')}` : ' — OK'),
)
process.exit(failed.length ? 1 : 0)
