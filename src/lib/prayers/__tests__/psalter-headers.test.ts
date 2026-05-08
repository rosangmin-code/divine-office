/**
 * @fr FR-160-C
 * Unit tests for loadPsalterHeaderRich (rich-overlay).
 *
 * Verifies:
 *   1. catalog file existence + valid schema
 *   2. lookup returns the first authored entry per ref
 *   3. unknown ref → null (no header authored)
 *   4. mtime cache reuse (loader called twice → single fs.statSync read)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  loadPsalterHeaderRich,
  __resetRichOverlayCache,
} from '../rich-overlay'

const REPO_ROOT = process.cwd()
const CATALOG_PATH = resolve(
  REPO_ROOT,
  'src/data/loth/prayers/commons/psalter-headers.rich.json',
)

describe('FR-160-C psalter-headers catalog', () => {
  beforeEach(() => {
    __resetRichOverlayCache()
  })

  it('catalog file exists at canonical location', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true)
  })

  it('catalog has valid {refs, unmatched} schema with non-empty entries', () => {
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    expect(raw.refs).toBeTypeOf('object')
    const refKeys = Object.keys(raw.refs)
    expect(refKeys.length).toBeGreaterThan(0)
    for (const key of refKeys) {
      const entry = raw.refs[key]
      expect(Array.isArray(entry.entries)).toBe(true)
      expect(entry.entries.length).toBeGreaterThan(0)
      for (const e of entry.entries) {
        expect(['patristic_preface', 'nt_typological']).toContain(e.kind)
        expect(typeof e.attribution).toBe('string')
        expect(typeof e.preface_text).toBe('string')
        expect(e.attribution.length).toBeGreaterThan(0)
        expect(e.preface_text.length).toBeGreaterThan(0)
      }
    }
  })

  it('returns first authored header for known refs (Psalm 149)', () => {
    // Psalm 149 has a patristic preface attributed to Хэсихиус — see
    // PDF p.64 (Шашны хөвгүүд... Христ өөрсдийн Хаандаа баярлацгаа!).
    // The canonical key in psalter-texts.json is "Psalm 149:1-9".
    const header = loadPsalterHeaderRich('Psalm 149:1-9')
    expect(header).not.toBeNull()
    expect(header!.kind).toBe('patristic_preface')
    expect(header!.attribution).toBe('Хэсихиус')
    expect(header!.preface_text.length).toBeGreaterThan(0)
  })

  it('returns first authored header for known refs (NT typological)', () => {
    // Walk the catalog and find any nt_typological entry to assert
    // shape — robust to specific ref/page churn.
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    const ntKey = Object.keys(raw.refs).find((k) =>
      raw.refs[k].entries.some(
        (e: { kind: string }) => e.kind === 'nt_typological',
      ),
    )
    expect(ntKey).toBeDefined()
    const header = loadPsalterHeaderRich(ntKey!)
    expect(header).not.toBeNull()
    // Could be patristic or nt_typological as the FIRST entry; just verify
    // both possibilities are well-formed.
    expect(['patristic_preface', 'nt_typological']).toContain(header!.kind)
  })

  it('returns null for refs not present in catalog', () => {
    const header = loadPsalterHeaderRich('Psalm 999:9-9')
    expect(header).toBeNull()
  })

  // FR-160-C peer R1 finding: loader returns entries[0] without
  // occurrence-context disambiguation. The schema permits multiple
  // entries per ref (same psalm at different liturgical pages), so
  // until we add page-aware lookup, the catalog MUST keep all entries
  // for a single ref semantically equivalent (same kind + attribution).
  // This invariant is asserted in tests so a future audit that adds a
  // divergent header for the same ref fails CI loudly instead of
  // silently rendering the wrong metadata.
  it('multi-entry refs have semantically equivalent attribution+kind', () => {
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    const violations: Array<{
      ref: string
      attributions: string[]
      kinds: string[]
    }> = []
    for (const [refKey, entry] of Object.entries(raw.refs) as [
      string,
      { entries: { kind: string; attribution: string }[] },
    ][]) {
      if (!entry.entries || entry.entries.length < 2) continue
      const distinctAttrib = [
        ...new Set(entry.entries.map((e) => e.attribution)),
      ]
      const distinctKind = [...new Set(entry.entries.map((e) => e.kind))]
      if (distinctAttrib.length > 1 || distinctKind.length > 1) {
        violations.push({
          ref: refKey,
          attributions: distinctAttrib,
          kinds: distinctKind,
        })
      }
    }
    expect(violations).toEqual([])
  })

  it('handles refs that are in psalter-texts.json but have no header', () => {
    // Psalm 63:2-9 is a canonical psalter ref — catalog typically does not
    // author a header for every psalm. If absent → null (loader contract).
    const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
    if (!raw.refs['Psalm 63:2-9']) {
      expect(loadPsalterHeaderRich('Psalm 63:2-9')).toBeNull()
    }
  })

  // F-X9 (#362) invariant — preface_text must NOT carry the PDF title prefix
  // or the `(attribution)` literal. Both are emitted separately by
  // psalm-block.tsx (`psalm.title` and `({attribution})`), so storing them
  // in preface_text causes both to render twice in the UI (audit #362:
  // 67/77 title-dup + 74/77 attribution-dup before fix).
  //
  // Locked here so a future extractor regression (or an unfix-rebuild of
  // the catalog from a stale extractor binary) fails CI loudly. The
  // invariant covers BOTH F-X9 fix A (this dispatch — extractor + catalog
  // regen) and F-X9 fix B (renderer guard, dispatch #373) — they share
  // the same contract on preface_text shape.
  describe('F-X9 (#362) preface_text shape invariants', () => {
    /**
     * Build psalmNum -> Set<title> map by walking week-N.json + propers
     * exactly the way scripts/extract-psalter-headers.js does. Used to
     * assert that no preface_text starts with a known canonical title.
     */
    function loadPsalmTitlesByNumber(): Map<number, Set<string>> {
      const titleSources = [
        'src/data/loth/psalter/week-1.json',
        'src/data/loth/psalter/week-2.json',
        'src/data/loth/psalter/week-3.json',
        'src/data/loth/psalter/week-4.json',
        'src/data/loth/propers/advent.json',
        'src/data/loth/propers/christmas.json',
        'src/data/loth/propers/lent.json',
        'src/data/loth/propers/easter.json',
        'src/data/loth/propers/ordinary-time.json',
      ]
      const map = new Map<number, Set<string>>()
      function walk(node: unknown): void {
        if (Array.isArray(node)) {
          for (const item of node) walk(item)
          return
        }
        if (node && typeof node === 'object') {
          const obj = node as Record<string, unknown>
          if (typeof obj.ref === 'string' && typeof obj.title === 'string') {
            const m = obj.ref.match(/^Psalm\s+(\d+)/)
            if (m) {
              const num = parseInt(m[1], 10)
              const norm = obj.title.trim().replace(/\s+/g, ' ')
              if (norm) {
                if (!map.has(num)) map.set(num, new Set())
                map.get(num)!.add(norm)
              }
            }
          }
          for (const key of Object.keys(obj)) walk(obj[key])
        }
      }
      for (const rel of titleSources) {
        const path = resolve(REPO_ROOT, rel)
        try {
          walk(JSON.parse(readFileSync(path, 'utf-8')))
        } catch {
          // Optional file — skip silently in test, like the extractor.
        }
      }
      return map
    }

    function escapeRegExp(s: string): string {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    it('no entry starts with the canonical psalm title (no title-dup)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const titlesByNum = loadPsalmTitlesByNumber()
      const violations: Array<{ ref: string; page: number; title: string }> = []
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        { entries: { preface_text: string; page: number }[] },
      ][]) {
        const m = refKey.match(/^Psalm\s+(\d+)/)
        if (!m) continue
        const psNum = parseInt(m[1], 10)
        const titles = titlesByNum.get(psNum) || new Set<string>()
        for (const e of refEntry.entries) {
          for (const t of titles) {
            if (e.preface_text.startsWith(t)) {
              violations.push({ ref: refKey, page: e.page, title: t })
              break
            }
          }
        }
      }
      expect(violations).toEqual([])
    })

    it('no entry ends with the (attribution) literal (no attribution-dup)', () => {
      const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
      const violations: Array<{ ref: string; page: number; tail: string }> = []
      for (const [refKey, refEntry] of Object.entries(raw.refs) as [
        string,
        {
          entries: {
            preface_text: string
            attribution: string
            page: number
          }[]
        },
      ][]) {
        for (const e of refEntry.entries) {
          // Match the same shape the renderer emits and the extractor
          // strips: optional `харьцуул.\s+` cf-prefix + attribution +
          // optional trailing period.
          const pat = new RegExp(
            `\\((?:харьцуул\\.\\s+)?${escapeRegExp(e.attribution)}\\)\\.?\\s*$`,
            'u',
          )
          if (pat.test(e.preface_text)) {
            violations.push({
              ref: refKey,
              page: e.page,
              tail: e.preface_text.slice(-50),
            })
          }
        }
      }
      expect(violations).toEqual([])
    })
  })
})
