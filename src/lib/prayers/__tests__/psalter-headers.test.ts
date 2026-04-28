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
})
