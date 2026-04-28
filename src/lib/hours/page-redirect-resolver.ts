// FR-160-B PR-1+PR-10 — Layer 4.5 page-redirect resolution.
//
// `HourPropers.pageRedirects` declares "the assembled section's content
// is printed at PDF page N" — e.g. "Магтуу: х. 879" pointing the
// dismissal-blessing to a specific ordinarium page. This helper:
//
//   1. validates each redirect's `ordinariumKey` exists in the
//      ordinarium-key-catalog (closed enum + catalog-existence check
//      + fixed-kind page byte-equal gate)
//   2. PR-10: inline-hydrates the ordinarium body referenced by the
//      catalog `sourcePath`, attaching it to `propers.pageRedirectBodies`
//      so downstream consumers (assembler / e2e / audit) can verify the
//      rendered section is byte-equal to the ordinarium source without
//      re-loading. Existing section builders are unaffected — they
//      continue to load from the ordinarium index directly. The hydrated
//      body is additive metadata.
//
// The `ordinarium-key-catalog.json` ships in `src/data/loth/`. We keep
// module-level mtime-aware caches for both the catalog and the
// ordinarium body files so repeated assembleHour calls during a single
// dev session don't re-parse JSON on each request.

import fs from 'node:fs'
import path from 'node:path'
import {
  OrdinariumKeyCatalogSchema,
  safeParse,
} from '../schemas'
import type {
  HourPropers,
  HydratedPageRedirect,
  PageRedirect,
  PageRedirectOrdinariumKey,
} from '../types'

export interface OrdinariumCatalogEntry {
  kind: 'fixed' | 'variable'
  page: number
  label: string
  sourcePath?: string
}

export type OrdinariumIndex = Record<PageRedirectOrdinariumKey, OrdinariumCatalogEntry>

export interface ApplyPageRedirectsResult {
  propers: HourPropers
  redirectsApplied: PageRedirect[]
  bodiesHydrated: HydratedPageRedirect[]
}

interface CatalogCacheEntry {
  mtimeMs: number
  index: OrdinariumIndex
}

interface BodyCacheEntry {
  mtimeMs: number
  data: unknown
}

let _catalogCache: CatalogCacheEntry | null = null
const _bodyFileCache = new Map<string, BodyCacheEntry>()

const REPO_ROOT = process.cwd()
const CATALOG_PATH = path.join(
  REPO_ROOT,
  'src',
  'data',
  'loth',
  'ordinarium-key-catalog.json',
)

/**
 * Load and cache the ordinarium-key-catalog. Throws on schema failure
 * so build-time gates (`scripts/verify-page-redirects.js`) and runtime
 * hydration share the same fail-hard contract.
 */
export function loadOrdinariumKeyCatalog(catalogPath: string = CATALOG_PATH): OrdinariumIndex {
  let stat: fs.Stats
  try {
    stat = fs.statSync(catalogPath)
  } catch (err) {
    throw new Error(
      `[page-redirect-resolver] ordinarium-key-catalog not found at ${catalogPath}: ${(err as Error).message}`,
    )
  }
  if (_catalogCache && _catalogCache.mtimeMs === stat.mtimeMs) return _catalogCache.index

  const raw = fs.readFileSync(catalogPath, 'utf-8')
  const json = JSON.parse(raw)
  const parsed = safeParse(
    OrdinariumKeyCatalogSchema,
    json,
    `ordinarium-key-catalog (${catalogPath})`,
  )
  if (!parsed) {
    throw new Error(
      `[page-redirect-resolver] ordinarium-key-catalog failed schema validation; see prior log lines`,
    )
  }
  const index = parsed.entries as OrdinariumIndex
  _catalogCache = { mtimeMs: stat.mtimeMs, index }
  return index
}

/** Clear in-memory caches; intended for unit tests. */
export function _resetOrdinariumCatalogCache(): void {
  _catalogCache = null
  _bodyFileCache.clear()
}

/**
 * Validate a redirect's ordinariumKey is registered in the catalog.
 * Throws (fail-hard) when the key is unknown, since this indicates a
 * schema-or-data drift that should not silently degrade.
 *
 * For `kind: 'fixed'` entries the redirect's `page` MUST match the
 * catalog's canonical page — fixed sections (Benedictus, Magnificat,
 * etc.) have one printed location and any drift is a typo. Variable
 * entries (dismissal-blessing "Магтуу: х. NNN", hymns) intentionally
 * span many pages, so per-celebration drift is allowed.
 */
function validateRedirect(
  redirect: PageRedirect,
  catalog: OrdinariumIndex,
): void {
  const entry = catalog[redirect.ordinariumKey]
  if (!entry) {
    throw new Error(
      `[page-redirect-resolver] redirect ${redirect.redirectId} references unknown ordinariumKey "${redirect.ordinariumKey}"`,
    )
  }
  if (entry.kind === 'fixed' && redirect.page !== entry.page) {
    throw new Error(
      `[page-redirect-resolver] redirect ${redirect.redirectId} (ordinariumKey="${redirect.ordinariumKey}") declares page ${redirect.page} but catalog (kind=fixed) is page ${entry.page}`,
    )
  }
}

/**
 * Parse a catalog `sourcePath` like
 *   `src/data/loth/ordinarium/canticles.json#benedictus`
 * into a `{ file, pointer }` pair. The pointer is a dot-separated path
 * inside the JSON (empty when the whole file is the body).
 *
 * Examples:
 *   `…canticles.json#benedictus`               → pointer = ['benedictus']
 *   `…common-prayers.json#openingVersicle.gloryBe` → ['openingVersicle','gloryBe']
 *   `…invitatory.json`                         → pointer = []
 */
function parseSourcePath(sourcePath: string): { file: string; pointer: string[] } {
  const hashIdx = sourcePath.indexOf('#')
  if (hashIdx < 0) return { file: sourcePath, pointer: [] }
  const file = sourcePath.slice(0, hashIdx)
  const fragment = sourcePath.slice(hashIdx + 1)
  const pointer = fragment.length === 0 ? [] : fragment.split('.')
  return { file, pointer }
}

/**
 * Walk a JSON value with a dot-pointer. Throws on missing segment so
 * a stale catalog → ordinarium drift fails fast (matches the resolver's
 * fail-hard contract).
 */
function resolvePointer(root: unknown, pointer: string[], context: string): unknown {
  let cur: unknown = root
  for (const segment of pointer) {
    if (cur == null || typeof cur !== 'object') {
      throw new Error(
        `[page-redirect-resolver] ${context}: pointer segment "${segment}" reached non-object value`,
      )
    }
    const obj = cur as Record<string, unknown>
    if (!Object.prototype.hasOwnProperty.call(obj, segment)) {
      throw new Error(
        `[page-redirect-resolver] ${context}: pointer segment "${segment}" not found (available: ${Object.keys(obj).slice(0, 8).join(', ') || '∅'})`,
      )
    }
    cur = obj[segment]
  }
  return cur
}

/**
 * Load and (mtime-aware) cache the JSON content of an ordinarium source
 * file. Repo-root relative paths only (catalog convention). Throws on
 * missing file or parse failure.
 */
function loadOrdinariumFile(relativeFile: string): unknown {
  const absPath = path.join(REPO_ROOT, relativeFile)
  let stat: fs.Stats
  try {
    stat = fs.statSync(absPath)
  } catch (err) {
    throw new Error(
      `[page-redirect-resolver] ordinarium body file not found at ${absPath}: ${(err as Error).message}`,
    )
  }
  const cached = _bodyFileCache.get(absPath)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data

  const raw = fs.readFileSync(absPath, 'utf-8')
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `[page-redirect-resolver] ordinarium body parse failed at ${relativeFile}: ${(err as Error).message}`,
    )
  }
  _bodyFileCache.set(absPath, { mtimeMs: stat.mtimeMs, data })
  return data
}

/**
 * Inline-hydrate the ordinarium body referenced by a single redirect.
 * Returns a `HydratedPageRedirect` snapshot. Throws when the catalog
 * entry has no `sourcePath`, or when `sourcePath` resolves to a missing
 * file/pointer — these indicate catalog vs ordinarium drift that must
 * not silently degrade.
 */
export function hydrateRedirectBody(
  redirect: PageRedirect,
  catalog: OrdinariumIndex,
): HydratedPageRedirect {
  const entry = catalog[redirect.ordinariumKey]
  if (!entry) {
    throw new Error(
      `[page-redirect-resolver] redirect ${redirect.redirectId}: unknown ordinariumKey "${redirect.ordinariumKey}"`,
    )
  }
  if (!entry.sourcePath || entry.sourcePath.length === 0) {
    throw new Error(
      `[page-redirect-resolver] redirect ${redirect.redirectId}: ordinariumKey "${redirect.ordinariumKey}" has no sourcePath in catalog`,
    )
  }
  const { file, pointer } = parseSourcePath(entry.sourcePath)
  const root = loadOrdinariumFile(file)
  const body = resolvePointer(
    root,
    pointer,
    `redirect ${redirect.redirectId} (ordinariumKey="${redirect.ordinariumKey}", sourcePath="${entry.sourcePath}")`,
  )
  return {
    redirectId: redirect.redirectId,
    ordinariumKey: redirect.ordinariumKey,
    page: redirect.page,
    label: redirect.label,
    appliesAt: redirect.appliesAt,
    catalog: {
      kind: entry.kind,
      page: entry.page,
      label: entry.label,
      sourcePath: entry.sourcePath,
    },
    body,
  }
}

/**
 * Layer 4.5 entry point for page redirects.
 *
 * PR-1: validate each redirect against the catalog (closed-enum + fixed
 * kind page gate).
 * PR-10: inline-hydrate the ordinarium body for each validated redirect
 * and attach it to `propers.pageRedirectBodies` for byte-equal audit
 * downstream. The propers fields used by section builders remain
 * untouched — adding `pageRedirectBodies` is additive and the no-op
 * paths (no redirects) preserve referential equality.
 */
export function applyPageRedirects(
  propers: HourPropers,
  catalog: OrdinariumIndex,
): ApplyPageRedirectsResult {
  const redirects = propers.pageRedirects
  if (!redirects || redirects.length === 0) {
    return { propers, redirectsApplied: [], bodiesHydrated: [] }
  }

  for (const redirect of redirects) {
    validateRedirect(redirect, catalog)
  }

  const bodiesHydrated: HydratedPageRedirect[] = redirects.map((r) =>
    hydrateRedirectBody(r, catalog),
  )

  // Additive write: shallow-copy propers so the caller's reference is
  // not mutated. Existing fields (concludingPrayer/hymn/etc.) are
  // preserved byte-equal — the section builders, not this resolver,
  // own those slots.
  const next: HourPropers = { ...propers, pageRedirectBodies: bodiesHydrated }

  return {
    propers: next,
    redirectsApplied: redirects.slice(),
    bodiesHydrated,
  }
}
