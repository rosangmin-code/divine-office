/**
 * Tests for `scripts/verify-hymn-phrase-merge.js` (NFR-009m).
 *
 * The МАГТУУ orphan-suspect guard. Closes the detection gap from
 * `docs/bug-reports/2026-06-30-magtuu-hymn-linebreak-phrase-heuristic.md`:
 * verify-phrase-coverage.js proves phrases TILE lines[] but a wrap-orphan
 * `[0,0],[1,1]` tiles perfectly, so coverage passes it green. This guard
 * asserts merge CORRECTNESS instead, across the whole hymn corpus.
 *
 * Two axes, both stable (no flip when the X.897 fix merges):
 *   - PRECISION / RECALL on synthetic fixtures mirroring the real data
 *     patterns (X.897 orphan flagged; anaphora / refrain / terminated /
 *     long-line / no-wrap NOT flagged).
 *   - X.897 (hymn 21) + X.912 (hymn 42) LIVE regression: hymn 42 stays
 *     clean; hymn 21's "Их Эзэнийг" orphan is detected while present and
 *     clean once the fix lands (adaptive — green before AND after merge).
 *   - allowlist gate: X.897 is NOT allowlisted (always surfaces as the
 *     active flag); the deferred baseline IS suppressed.
 *
 * @fr FR-161
 * Guard identity: NFR-009m (hymn phrase-merge correctness) — sibling of the
 * NFR-009j coverage guard, both under the FR-161 phrase-unit architecture.
 * Tag follows the verify-phrase-coverage.test.mjs convention (@fr FR-161;
 * the NFR-009x number lives in matrix prose, the .mjs scanner only walks
 * *.test.ts so this tag is documentary).
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const guard = require('../verify-hymn-phrase-merge.js')
const { findOrphanSuspects, scanCorpus, loadAllowlist, allowlistKey } = guard

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = resolve(__dirname, '..', 'verify-hymn-phrase-merge.js')
const HYMNS_DIR = resolve(__dirname, '..', '..', 'src/data/loth/prayers/hymns')
const ALLOWLIST_PATH = resolve(__dirname, '..', 'data/hymn-phrase-orphan-allowlist.json')

// ─── synthetic stanza builder (mirrors verify-phrase-coverage.test.mjs) ───

function line(text) {
  return { spans: [{ kind: 'text', text }], indent: 0 }
}
function stanza(texts, phrases) {
  return { kind: 'stanza', lines: texts.map(line), phrases }
}
function hymnData(blocks) {
  return { hymnRich: { blocks, page: 900 } }
}
function loadHymn(n) {
  const p = join(HYMNS_DIR, `${n}.rich.json`)
  return JSON.parse(readFileSync(p, 'utf-8'))
}

// ─── PRECISION / RECALL — synthetic fixtures ──────────────────────────────

describe('verify-hymn-phrase-merge — findOrphanSuspects rule', () => {
  it('RECALL: flags the X.897-shaped orphan (short capital line, prev open, wrap in stanza)', () => {
    // Real hymn 21 shape: line0 wraps into "Их Эзэнийг"; line2 wraps into
    // "мэт" (correctly merged as [2,3]) — that [2,3] is the wrap evidence.
    const s = stanza(
      [
        'Баярлан магтан хүндэтгэцгээе сүр жавхлантай',
        'Их Эзэнийг',
        'Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг',
        'мэт',
      ],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
    )
    const out = findOrphanSuspects(s)
    expect(out.length).toBe(1)
    expect(out[0].phraseIndex).toBe(1)
    expect(out[0].text).toBe('Их Эзэнийг')
  })

  it('PRECISION: does NOT flag anaphora — every phrase single-line, no wrap evidence', () => {
    // hymn 101/5 pattern: each "Хайр ..." line is its own verse. No phrase
    // wraps → condition 4 (wrap evidence) fails → clean.
    const s = stanza(
      ['Хайр бол тэвчээртэй', 'Хайр атаархдаггүй', 'Хайр өөрийнхийг'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 2] }],
    )
    expect(findOrphanSuspects(s)).toEqual([])
  })

  it('PRECISION: does NOT flag when previous line ends a sentence', () => {
    const s = stanza(
      ['Эзэн магтагдтугай.', 'Их', 'Дараагийн урт мөр энд байна', 'үргэлжлэл'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
    )
    expect(findOrphanSuspects(s)).toEqual([])
  })

  it('PRECISION: does NOT flag a long single-line phrase (over maxWords)', () => {
    const s = stanza(
      ['Баярлан магтан хүндэтгэцгээе сүр жавхлантай', 'Гэрлээ бидэнд тусган өглөө хувиршгүй Их Эзэн', 'урт мөр', 'сүүл'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
    )
    // phrase[1] is 7 words > maxWords=2 → not an orphan.
    expect(findOrphanSuspects(s).some((x) => x.phraseIndex === 1)).toBe(false)
  })

  it('PRECISION: does NOT flag a refrain repetition of the previous line', () => {
    const s = stanza(
      ['Намайг өөрчлөөч', 'Намайг өөрчлөөч', 'урт мөр энд', 'сүүл'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
    )
    expect(findOrphanSuspects(s)).toEqual([])
  })

  it('PRECISION: the first phrase can never be an orphan (no predecessor)', () => {
    const s = stanza(
      ['Их', 'дараагийн урт мөр', 'сүүл'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 2] }],
    )
    expect(findOrphanSuspects(s).some((x) => x.phraseIndex === 0)).toBe(false)
  })

  it('--max-words widens recall to 3-word tails', () => {
    const s = stanza(
      ['Эзэн Таныг бид магтъя', 'Авран хамгаалахаар миний', 'дараагийн урт мөр', 'сүүл'],
      [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
    )
    expect(findOrphanSuspects(s, { maxWords: 2 })).toEqual([]) // 3 words, default skips
    expect(findOrphanSuspects(s, { maxWords: 3 }).length).toBe(1) // widened catches it
  })
})

// ─── X.897 / X.912 LIVE regression (the named bug-report cases) ────────────

describe('verify-hymn-phrase-merge — X.897 / X.912 live regression', () => {
  it('X.912 (hymn 42) is clean — 12 complete verse lines, no wrap-orphan', () => {
    // Bug report §0: hymn 42 data is correct (no orphan); the X.912 symptom
    // is a render-perception issue, not a data orphan. Lock that it stays
    // clean so a future builder run cannot silently introduce one.
    const suspects = guard.scanHymnData(loadHymn(42))
    expect(suspects).toEqual([])
  })

  it('X.897 (hymn 21): guard detects the "Их Эзэнийг" orphan while present, clean after the fix merges', () => {
    // Adaptive — green BOTH before and after the GOAL #4 fix. Before:
    // phrase[1]=[1,1] "Их Эзэнийг" present → detection MUST fire. After
    // dvo-sol merges the [0,1] merge, the orphan is gone → MUST be clean.
    const data = loadHymn(21)
    const blocks = data.hymnRich?.blocks ?? []
    const text = (b, li) =>
      (b.lines[li]?.spans ?? []).map((s) => s.text ?? '').join('').trim()
    const orphanStillPresent = blocks.some(
      (b) =>
        b.kind === 'stanza' &&
        Array.isArray(b.phrases) &&
        b.phrases.some(
          (p, idx) =>
            idx > 0 &&
            p.lineRange[0] === p.lineRange[1] &&
            text(b, p.lineRange[0]) === 'Их Эзэнийг',
        ),
    )
    const suspects = guard.scanHymnData(data)
    const flagged = suspects.some((s) => s.text === 'Их Эзэнийг')
    expect(flagged).toBe(orphanStillPresent)
  })
})

// ─── allowlist gate ───────────────────────────────────────────────────────

describe('verify-hymn-phrase-merge — allowlist baseline gate', () => {
  it('X.897 (hymn 21 / "Их Эзэнийг") is NOT allowlisted — always surfaces as active', () => {
    const set = loadAllowlist(ALLOWLIST_PATH)
    expect(set.has(allowlistKey('21.rich.json', 'Их Эзэнийг'))).toBe(false)
  })

  it('the deferred baseline IS allowlisted (e.g. hymn 48)', () => {
    const set = loadAllowlist(ALLOWLIST_PATH)
    expect(set.has(allowlistKey('48.rich.json', 'Алгадуулан өшиглүүлэн'))).toBe(true)
  })

  it('live corpus scan: no allowlisted hymn (48/69/93) appears in the ACTIVE list', () => {
    const set = loadAllowlist(ALLOWLIST_PATH)
    const { active } = scanCorpus(HYMNS_DIR, set)
    const deferred = new Set(['48.rich.json', '69.rich.json', '93.rich.json'])
    expect(active.filter((s) => deferred.has(s.hymn))).toEqual([])
  })
})

// ─── CLI subprocess (deterministic fixture, both exit paths) ───────────────

describe('verify-hymn-phrase-merge — CLI', () => {
  function writeFixtureDir(blocks) {
    const dir = mkdtempSync(join(tmpdir(), 'hymn-merge-'))
    mkdirSync(join(dir, 'hymns'), { recursive: true })
    writeFileSync(join(dir, 'hymns', '1.rich.json'), JSON.stringify(hymnData(blocks)))
    writeFileSync(join(dir, 'allowlist.json'), JSON.stringify({ entries: [] }))
    return dir
  }

  it('exits 1 and names the orphan when an active suspect is present', () => {
    const dir = writeFixtureDir([
      stanza(
        ['Баярлан магтан хүндэтгэцгээе сүр жавхлантай', 'Их Эзэнийг', 'урт мөр энд байна', 'сүүл'],
        [{ lineRange: [0, 0] }, { lineRange: [1, 1] }, { lineRange: [2, 3] }],
      ),
    ])
    const r = spawnSync(
      'node',
      [SCRIPT_PATH, '--hymns-dir', join(dir, 'hymns'), '--allowlist', join(dir, 'allowlist.json')],
      { encoding: 'utf-8' },
    )
    expect(r.status).toBe(1)
    expect(r.stderr).toMatch(/Их Эзэнийг/)
  })

  it('exits 0 on a clean corpus', () => {
    const dir = writeFixtureDir([
      stanza(
        ['Хайр бол тэвчээртэй', 'Хайр атаархдаггүй'],
        [{ lineRange: [0, 0] }, { lineRange: [1, 1] }],
      ),
    ])
    const r = spawnSync(
      'node',
      [SCRIPT_PATH, '--hymns-dir', join(dir, 'hymns'), '--allowlist', join(dir, 'allowlist.json')],
      { encoding: 'utf-8' },
    )
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/0 active orphan-suspect/)
  })

  it('runs over the live hymn corpus without crashing (scans every file)', () => {
    expect(existsSync(HYMNS_DIR)).toBe(true)
    const r = spawnSync('node', [SCRIPT_PATH], { encoding: 'utf-8' })
    expect([0, 1]).toContain(r.status)
    const out = r.stdout + r.stderr
    expect(out).toMatch(/files scanned|hymn file\(s\) scanned/)
  }, 20_000)
})
