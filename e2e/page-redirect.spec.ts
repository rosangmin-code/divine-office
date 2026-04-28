import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { DATES } from './fixtures/dates'

// FR-160-B PR-9b — PageRedirect e2e coverage.
//
// 40 PageRedirect entries across 6 files (advent/christmas/lent/easter
// propers + sanctoral feasts/solemnities). PR-1 (B1) shipped the
// validate-against-catalog gate (`applyPageRedirects` fail-hards on
// unknown ordinariumKey or fixed-kind page drift); the assembler stage
// hydration of ordinarium body content is deferred to a later PR (the
// catalog declares `sourcePath` so future hydrate can byte-equal copy
// from `src/data/loth/ordinarium/canticles.json`, common-prayers.json,
// etc.).
//
// E2E coverage scope — what's testable today:
//   1. Pages with pageRedirects render successfully (no fail-hard from
//      unknown key)
//   2. Catalog cross-validation: every ordinariumKey used in the data is
//      present in `ordinarium-key-catalog.json`; every fixed-kind redirect's
//      `page` matches the catalog page (byte-equal contract)
//   3. Specific date with multi-redirect (Pentecost lauds: 2 redirects —
//      invitatory + dismissal) — both succeed
//   4. `kind: variable` entries (dismissal-blessing) accept per-celebration
//      page differences (christmas dec25 = 879, easter pentecost = 877)
//
// Mongolian Cyrillic labels in the catalog are spot-checked to surface
// PDF-original strings (NFR-002 — no English leakage in user-facing
// metadata).

interface CatalogEntry {
  kind: 'fixed' | 'variable'
  page: number
  label: string
  sourcePath?: string
}
interface CatalogFile {
  entries: Record<string, CatalogEntry>
}
interface PageRedirect {
  redirectId: string
  ordinariumKey: string
  page: number
  label: string
  appliesAt: string
}

const REPO_ROOT = path.resolve(__dirname, '..')

function readCatalog(): CatalogFile {
  const p = path.join(REPO_ROOT, 'src', 'data', 'loth', 'ordinarium-key-catalog.json')
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')) as T
}

function collectPageRedirects(node: unknown, out: PageRedirect[] = []): PageRedirect[] {
  if (Array.isArray(node)) {
    for (const item of node) collectPageRedirects(item, out)
    return out
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (Array.isArray(obj.pageRedirects)) {
      for (const r of obj.pageRedirects as PageRedirect[]) out.push(r)
    }
    for (const v of Object.values(obj)) collectPageRedirects(v, out)
  }
  return out
}

const PROPER_FILES = [
  'src/data/loth/propers/advent.json',
  'src/data/loth/propers/christmas.json',
  'src/data/loth/propers/lent.json',
  'src/data/loth/propers/easter.json',
  'src/data/loth/sanctoral/feasts.json',
  'src/data/loth/sanctoral/solemnities.json',
]

test.describe('FR-160-B PR-9b — PageRedirect catalog + cross-validation', () => {
  // @fr FR-160-B-5b
  test('catalog declares all 9 ordinariumKey enum values with kind + page + label', () => {
    const catalog = readCatalog()
    const expectedKeys = [
      'benedictus',
      'common-prayers',
      'compline-responsory',
      'dismissal-blessing',
      'gloria-patri',
      'hymns',
      'invitatory-psalms',
      'magnificat',
      'nunc-dimittis',
    ]
    for (const key of expectedKeys) {
      const entry = catalog.entries[key]
      expect(entry, `catalog must declare ${key}`).toBeDefined()
      expect(['fixed', 'variable']).toContain(entry.kind)
      expect(entry.page).toBeGreaterThan(0)
      expect(entry.label.length).toBeGreaterThan(0)
    }
    expect(Object.keys(catalog.entries).sort()).toEqual(expectedKeys.sort())
  })

  // @fr FR-160-B-5b
  test('every PageRedirect across data files validates against catalog (fixed-kind byte-equal page)', () => {
    const catalog = readCatalog()
    const allRedirects: PageRedirect[] = []
    for (const file of PROPER_FILES) {
      const data = readJson(file)
      collectPageRedirects(data, allRedirects)
    }
    // Sanity: at least the 40 redirects this PR was scoped against.
    expect(allRedirects.length).toBeGreaterThanOrEqual(40)

    for (const redirect of allRedirects) {
      const entry = catalog.entries[redirect.ordinariumKey]
      expect(entry, `unknown ordinariumKey: ${redirect.ordinariumKey} (${redirect.redirectId})`).toBeDefined()
      if (entry.kind === 'fixed') {
        expect(redirect.page, `${redirect.redirectId}: fixed-kind page must equal catalog page`).toBe(
          entry.page,
        )
      }
      // Variable kind (dismissal-blessing, hymns) allows per-celebration
      // page drift — only validate the key is registered.
    }
  })

  // @fr FR-160-B-5b
  test('Pentecost Sunday lauds (2 pageRedirects: invitatory + dismissal) renders without fail-hard', async ({
    request,
  }) => {
    // easter.json weeks.pentecost.SUN.lauds.pageRedirects holds 2
    // redirects (invitatory-psalms 28 + dismissal-blessing 877). The
    // applyPageRedirects gate must not throw — the response must be
    // 200 OK with all expected sections.
    const res = await request.get(`/api/loth/${DATES.pentecostDay2026}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const sectionTypes = (body.sections as { type: string }[]).map((s) => s.type)
    // Both target sections must be assembled (the redirect doesn't hide
    // them — it points the reader to a specific ordinarium page).
    expect(sectionTypes).toContain('invitatory')
    expect(sectionTypes).toContain('dismissal')
  })

  // @fr FR-160-B-5b
  test('dismissal-blessing variable-kind entry surfaces in multiple seasons with different pages', () => {
    // Variable-kind invariant: multiple PageRedirect entries can declare
    // the same ordinariumKey with different pages. Verifies the catalog
    // contract that variable keys are NOT page-locked.
    const allRedirects: PageRedirect[] = []
    for (const file of PROPER_FILES) {
      const data = readJson(file)
      collectPageRedirects(data, allRedirects)
    }
    const dismissals = allRedirects.filter((r) => r.ordinariumKey === 'dismissal-blessing')
    expect(dismissals.length).toBeGreaterThan(1)
    const pages = new Set(dismissals.map((r) => r.page))
    expect(
      pages.size,
      'dismissal-blessing variable-kind must span ≥2 distinct pages across seasons',
    ).toBeGreaterThan(1)
    // Catalog declares variable kind for dismissal-blessing.
    const catalog = readCatalog()
    expect(catalog.entries['dismissal-blessing'].kind).toBe('variable')
  })

  // @fr FR-160-B-5b
  test('Pentecost lauds dismissal smoke: ordinarium-assembled body present (independent of PageRedirect, proxy only)', async ({
    request,
  }) => {
    // SMOKE / PROXY (not true AC-4 hydrate coverage — peer R2 review):
    // `buildDismissal` (src/lib/hours/builders/versicle.ts) assembles
    // the dismissal body from `common-prayers.json` REGARDLESS of the
    // PageRedirect entry. So this test proves the section renders
    // with full content, but does NOT prove the PageRedirect itself
    // injects/replaces body — that hydrate path is a future PR. AC-4
    // ('PageRedirect hydrate 후 본문 byte-equal') is therefore
    // PARTIALLY_MET via catalog-cross-validation (ordinariumKey enum
    // closed + fixed-kind page byte-equal + variable-kind multi-season
    // span) plus this dismissal smoke; true hydrate-driven byte-equal
    // awaits the body-injection wiring (separate PR).
    const res = await request.get(`/api/loth/${DATES.pentecostDay2026}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    interface DismissalSection {
      type: 'dismissal'
      priest?: {
        greeting: { versicle: string; response: string }
        blessing: { text: string; response: string }
        dismissalVersicle: { versicle: string; response: string }
      }
      individual?: { versicle: string; response: string }
      directives?: unknown[]
    }
    const dismissal = (body.sections as { type: string }[]).find(
      (s) => s.type === 'dismissal',
    ) as DismissalSection | undefined
    expect(dismissal, 'dismissal section assembled from ordinarium').toBeTruthy()
    // priest path of 4 strings + individual path of 2 strings — these
    // come from `common-prayers.json#dismissal` (catalog sourcePath).
    expect(dismissal?.priest?.greeting.versicle.length).toBeGreaterThan(0)
    expect(dismissal?.priest?.greeting.response.length).toBeGreaterThan(0)
    expect(dismissal?.priest?.blessing.text.length).toBeGreaterThan(0)
    expect(dismissal?.individual?.versicle.length).toBeGreaterThan(0)
    expect(dismissal?.individual?.response.length).toBeGreaterThan(0)
    // No conditional-rubric directive expected on this section for
    // Pentecost lauds (no skip/substitute rubric authored on dismissal).
    expect(dismissal?.directives ?? []).toEqual([])
  })

  // @fr FR-160-B-5b
  test('Mongolian Cyrillic labels: catalog labels are PDF-original (NFR-002)', () => {
    // Spot-check a sample of catalog labels for Mongolian Cyrillic. No
    // English leakage in user-facing metadata.
    const catalog = readCatalog()
    const labels = Object.values(catalog.entries).map((e) => e.label)
    // Cyrillic block (U+0400..U+04FF) presence — PDF-source attribution.
    const cyrillicLabels = labels.filter((l) => /[Ѐ-ӿ]/.test(l))
    expect(
      cyrillicLabels.length,
      'majority of ordinarium labels must be Mongolian Cyrillic',
    ).toBeGreaterThanOrEqual(Math.floor(labels.length * 0.6))
    // Spot-check expected canonical labels.
    expect(catalog.entries['benedictus'].label).toContain('Бенедиктус')
    expect(catalog.entries['magnificat'].label).toContain('Магнификат')
    expect(catalog.entries['dismissal-blessing'].label).toContain('Магтуу')
    expect(catalog.entries['invitatory-psalms'].label).toContain('Урих')
  })
})
