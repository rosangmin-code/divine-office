// FR-160-B PR-1 — Layer 4.5 page-redirect resolution.
//
// `HourPropers.pageRedirects` declares "the assembled section's content
// is printed at PDF page N" — e.g. "Магтуу: х. 879" pointing the
// dismissal-blessing to a specific ordinarium page. This helper:
//
//   1. validates each redirect's `ordinariumKey` exists in the
//      ordinarium-key-catalog (closed enum + catalog-existence check)
//   2. PR-1 marker scope: records which redirects matched but defers
//      body-inlining to PR-8 (B4) when the assembler stage merges
//      with the rendered output. PR-1 must be byte-equal to "no
//      redirects" path until JSON marking lands in B3.
//
// The `ordinarium-key-catalog.json` ships in `src/data/loth/`. We keep
// a module-level cache (mtime-aware) so repeated assembleHour calls
// during a single dev session don't re-parse JSON on each request.

import fs from 'node:fs'
import path from 'node:path'
import {
  OrdinariumKeyCatalogSchema,
  safeParse,
} from '../schemas'
import type {
  HourPropers,
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
}

interface CacheEntry {
  mtimeMs: number
  index: OrdinariumIndex
}

let _cache: CacheEntry | null = null

const CATALOG_PATH = path.join(
  process.cwd(),
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
  if (_cache && _cache.mtimeMs === stat.mtimeMs) return _cache.index

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
  _cache = { mtimeMs: stat.mtimeMs, index }
  return index
}

/** Clear the in-memory cache; intended for unit tests. */
export function _resetOrdinariumCatalogCache(): void {
  _cache = null
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
 * Layer 4.5 entry point for page redirects. PR-1 scope: validate each
 * redirect against the catalog and surface the list to the caller.
 * Actual body-inlining (e.g. write `concludingPrayer` from
 * `common-prayers.json`) is part of B4 (PR-8).
 */
export function applyPageRedirects(
  propers: HourPropers,
  catalog: OrdinariumIndex,
): ApplyPageRedirectsResult {
  const redirects = propers.pageRedirects
  if (!redirects || redirects.length === 0) {
    return { propers, redirectsApplied: [] }
  }

  for (const redirect of redirects) {
    validateRedirect(redirect, catalog)
  }

  // PR-1 noop: keep propers byte-equal until B4 hydration lands. The
  // applied list is still surfaced so callers can wire telemetry /
  // verifier coverage gates without waiting for full hydration.
  return { propers, redirectsApplied: redirects.slice() }
}
