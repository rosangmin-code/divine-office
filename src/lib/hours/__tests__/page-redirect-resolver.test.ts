import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyPageRedirects,
  hydrateRedirectBody,
  loadOrdinariumKeyCatalog,
  _resetOrdinariumCatalogCache,
  type OrdinariumIndex,
} from '../page-redirect-resolver'
import type { HourPropers, PageRedirect, PageRedirectOrdinariumKey } from '../../types'

beforeEach(() => {
  _resetOrdinariumCatalogCache()
})

describe('loadOrdinariumKeyCatalog', () => {
  // @fr FR-160-B-2
  it('loads the live catalog with 9 keys', () => {
    const catalog = loadOrdinariumKeyCatalog()
    const keys = Object.keys(catalog)
    expect(keys).toContain('benedictus')
    expect(keys).toContain('magnificat')
    expect(keys).toContain('nunc-dimittis')
    expect(keys).toContain('dismissal-blessing')
    expect(keys).toContain('compline-responsory')
    expect(keys).toContain('common-prayers')
    expect(keys).toContain('gloria-patri')
    expect(keys).toContain('invitatory-psalms')
    expect(keys).toContain('hymns')
    expect(keys.length).toBe(9)
  })

  // @fr FR-160-B-2
  it('caches across calls (mtime equality)', () => {
    const a = loadOrdinariumKeyCatalog()
    const b = loadOrdinariumKeyCatalog()
    expect(a).toBe(b)
  })
})

describe('applyPageRedirects — noop paths', () => {
  // @fr FR-160-B-2
  it('returns input untouched when pageRedirects is undefined', () => {
    const propers: HourPropers = { concludingPrayer: 'unchanged' }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.propers).toBe(propers)
    expect(out.redirectsApplied).toEqual([])
  })

  // @fr FR-160-B-2
  it('returns input untouched when pageRedirects is empty', () => {
    const propers: HourPropers = { pageRedirects: [] }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.propers).toBe(propers)
    expect(out.redirectsApplied).toEqual([])
  })
})

describe('applyPageRedirects — validation', () => {
  // @fr FR-160-B-2
  it('passes validation for redirects whose key is in the catalog', () => {
    const redirect: PageRedirect = {
      redirectId: 'sun-vespers-879',
      ordinariumKey: 'dismissal-blessing',
      page: 879,
      label: 'Магтуу: х. 879',
      appliesAt: 'dismissal',
      evidencePdf: { page: 879, text: 'Магтуу: х. 879' },
    }
    const propers: HourPropers = { pageRedirects: [redirect] }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.redirectsApplied.length).toBe(1)
    expect(out.redirectsApplied[0].redirectId).toBe('sun-vespers-879')
  })

  // @fr FR-160-B-2
  it('throws when ordinariumKey is missing from catalog', () => {
    const stubCatalog = {
      benedictus: { kind: 'fixed', page: 34, label: 'B' },
    } as unknown as OrdinariumIndex
    const redirect = {
      redirectId: 'unknown-key',
      ordinariumKey: 'magnificat',
      page: 40,
      label: 'M',
      appliesAt: 'gospelCanticle',
      evidencePdf: { page: 40, text: 'redirect line' },
    } as PageRedirect
    const propers: HourPropers = { pageRedirects: [redirect] }
    expect(() => applyPageRedirects(propers, stubCatalog)).toThrow(/unknown ordinariumKey/)
  })

  // @fr FR-160-B-2
  it('throws when fixed-key redirect.page differs from catalog.page', () => {
    const drifted: PageRedirect = {
      redirectId: 'benedictus-drift',
      ordinariumKey: 'benedictus', // catalog says page 34
      page: 35,
      label: 'Бенедиктус: х. 35',
      appliesAt: 'gospelCanticle',
      evidencePdf: { page: 35, text: 'wrong page' },
    }
    const propers: HourPropers = { pageRedirects: [drifted] }
    const catalog = loadOrdinariumKeyCatalog()
    expect(() => applyPageRedirects(propers, catalog)).toThrow(/page 35 but catalog \(kind=fixed\) is page 34/)
  })

  // @fr FR-160-B-2
  it('allows variable-key redirect.page to differ from catalog.page', () => {
    const variableTarget: PageRedirect = {
      redirectId: 'dismissal-880',
      ordinariumKey: 'dismissal-blessing', // catalog default 879, but variable
      page: 880,
      label: 'Магтуу: х. 880',
      appliesAt: 'dismissal',
      evidencePdf: { page: 880, text: 'Магтуу: х. 880' },
    }
    const propers: HourPropers = { pageRedirects: [variableTarget] }
    const catalog = loadOrdinariumKeyCatalog()
    expect(() => applyPageRedirects(propers, catalog)).not.toThrow()
  })

  // @fr FR-160-B-2
  it('PR-1: keeps propers byte-equal under valid redirects (existing fields preserved)', () => {
    const redirect: PageRedirect = {
      redirectId: 'r-1',
      ordinariumKey: 'benedictus',
      page: 34,
      label: 'Бенедиктус: х. 34',
      appliesAt: 'gospelCanticle',
      evidencePdf: { page: 34, text: 'Бенедиктус: х. 34' },
    }
    const propers: HourPropers = {
      hymn: 'still here',
      gospelCanticleAntiphon: 'antiphon body',
      pageRedirects: [redirect],
    }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.propers.hymn).toBe('still here')
    expect(out.propers.gospelCanticleAntiphon).toBe('antiphon body')
    expect(out.propers.pageRedirects).toBeDefined()
    expect(out.redirectsApplied.length).toBe(1)
  })
})

// FR-160-B PR-10 — inline body hydrate.
//
// Each ordinariumKey has a `sourcePath` in the catalog (e.g.
// `src/data/loth/ordinarium/canticles.json#benedictus`). The resolver
// loads the file once (mtime-cached), navigates the dot-pointer, and
// pins the resulting JSON value to `propers.pageRedirectBodies` so the
// assembler / e2e / audit can byte-equal verify the rendered section
// against the ordinarium source.

const REPO_ROOT = process.cwd()

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')) as T
}

function makeRedirect(
  key: PageRedirectOrdinariumKey,
  page: number,
  appliesAt: PageRedirect['appliesAt'] = 'gospelCanticle',
): PageRedirect {
  return {
    redirectId: `r-${key}`,
    ordinariumKey: key,
    page,
    label: `${key}: х. ${page}`,
    appliesAt,
    evidencePdf: { page, text: `${key} marker` },
  }
}

interface KeyExpectation {
  key: PageRedirectOrdinariumKey
  page: number
  appliesAt: PageRedirect['appliesAt']
  /** Resolves the canonical body from raw repo JSON for byte-equal compare */
  expectedBody: () => unknown
}

const KEY_EXPECTATIONS: KeyExpectation[] = [
  {
    key: 'benedictus',
    page: 34,
    appliesAt: 'gospelCanticle',
    expectedBody: () =>
      (readJson<Record<string, unknown>>('src/data/loth/ordinarium/canticles.json'))['benedictus'],
  },
  {
    key: 'magnificat',
    page: 40,
    appliesAt: 'gospelCanticle',
    expectedBody: () =>
      (readJson<Record<string, unknown>>('src/data/loth/ordinarium/canticles.json'))['magnificat'],
  },
  {
    key: 'nunc-dimittis',
    page: 515,
    appliesAt: 'gospelCanticle',
    expectedBody: () =>
      (readJson<Record<string, unknown>>('src/data/loth/ordinarium/canticles.json'))['nuncDimittis'],
  },
  {
    key: 'dismissal-blessing',
    page: 879,
    appliesAt: 'dismissal',
    expectedBody: () =>
      (readJson<Record<string, unknown>>('src/data/loth/ordinarium/common-prayers.json'))['dismissal'],
  },
  {
    key: 'compline-responsory',
    page: 515,
    appliesAt: 'responsory',
    expectedBody: () =>
      (readJson<Record<string, unknown>>('src/data/loth/ordinarium/compline.json'))['responsory'],
  },
  {
    key: 'common-prayers',
    page: 22,
    appliesAt: 'concludingPrayer',
    expectedBody: () => readJson('src/data/loth/ordinarium/common-prayers.json'),
  },
  {
    key: 'gloria-patri',
    page: 22,
    appliesAt: 'psalmody',
    expectedBody: () => {
      const ov = (readJson<Record<string, unknown>>('src/data/loth/ordinarium/common-prayers.json'))[
        'openingVersicle'
      ] as Record<string, unknown>
      return ov['gloryBe']
    },
  },
  {
    key: 'invitatory-psalms',
    page: 28,
    appliesAt: 'invitatory',
    expectedBody: () => readJson('src/data/loth/ordinarium/invitatory.json'),
  },
  {
    key: 'hymns',
    page: 883,
    appliesAt: 'hymn',
    expectedBody: () => readJson('src/data/loth/ordinarium/hymns.json'),
  },
]

describe('hydrateRedirectBody — single key resolution', () => {
  for (const exp of KEY_EXPECTATIONS) {
    // @fr FR-160-B-6
    it(`hydrates "${exp.key}" body byte-equal to ordinarium source`, () => {
      const catalog = loadOrdinariumKeyCatalog()
      const redirect = makeRedirect(exp.key, exp.page, exp.appliesAt)
      const hydrated = hydrateRedirectBody(redirect, catalog)
      expect(hydrated.ordinariumKey).toBe(exp.key)
      expect(hydrated.body).toEqual(exp.expectedBody())
      expect(hydrated.catalog.sourcePath).toMatch(/^src\/data\/loth\/ordinarium\//)
      expect(hydrated.catalog.kind).toMatch(/^(fixed|variable)$/)
    })
  }

  // @fr FR-160-B-6
  it('throws when sourcePath is missing from a catalog entry', () => {
    const stubCatalog: OrdinariumIndex = {
      ...loadOrdinariumKeyCatalog(),
      benedictus: { kind: 'fixed', page: 34, label: 'B' /* no sourcePath */ },
    }
    const redirect = makeRedirect('benedictus', 34)
    expect(() => hydrateRedirectBody(redirect, stubCatalog)).toThrow(
      /no sourcePath in catalog/,
    )
  })

  // @fr FR-160-B-6
  it('throws when sourcePath pointer references a missing object key', () => {
    const stubCatalog: OrdinariumIndex = {
      ...loadOrdinariumKeyCatalog(),
      benedictus: {
        kind: 'fixed',
        page: 34,
        label: 'B',
        sourcePath: 'src/data/loth/ordinarium/canticles.json#nonExistentKey',
      },
    }
    const redirect = makeRedirect('benedictus', 34)
    expect(() => hydrateRedirectBody(redirect, stubCatalog)).toThrow(
      /pointer segment "nonExistentKey" not found/,
    )
  })

  // @fr FR-160-B-6
  it('throws when sourcePath references a missing file', () => {
    const stubCatalog: OrdinariumIndex = {
      ...loadOrdinariumKeyCatalog(),
      benedictus: {
        kind: 'fixed',
        page: 34,
        label: 'B',
        sourcePath: 'src/data/loth/ordinarium/does-not-exist.json',
      },
    }
    const redirect = makeRedirect('benedictus', 34)
    expect(() => hydrateRedirectBody(redirect, stubCatalog)).toThrow(
      /ordinarium body file not found/,
    )
  })
})

describe('applyPageRedirects — body hydrate integration', () => {
  // @fr FR-160-B-6
  it('attaches hydrated bodies onto propers.pageRedirectBodies', () => {
    const redirects: PageRedirect[] = [
      makeRedirect('invitatory-psalms', 28, 'invitatory'),
      makeRedirect('dismissal-blessing', 877, 'dismissal'),
    ]
    const propers: HourPropers = { pageRedirects: redirects }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.bodiesHydrated.length).toBe(2)
    expect(out.propers.pageRedirectBodies?.length).toBe(2)
    expect(out.propers.pageRedirectBodies?.[0].ordinariumKey).toBe('invitatory-psalms')
    expect(out.propers.pageRedirectBodies?.[1].ordinariumKey).toBe('dismissal-blessing')
  })

  // @fr FR-160-B-6
  it('preserves existing propers fields untouched (additive write only)', () => {
    const propers: HourPropers = {
      concludingPrayer: 'cp body',
      hymn: 'hy body',
      gospelCanticleAntiphon: 'gca',
      pageRedirects: [makeRedirect('benedictus', 34)],
    }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.propers.concludingPrayer).toBe('cp body')
    expect(out.propers.hymn).toBe('hy body')
    expect(out.propers.gospelCanticleAntiphon).toBe('gca')
    expect(out.propers.pageRedirectBodies?.length).toBe(1)
  })

  // @fr FR-160-B-6
  it('returns referentially-equal propers when no redirects (no shallow-copy churn)', () => {
    const propers: HourPropers = { concludingPrayer: 'unchanged' }
    const catalog = loadOrdinariumKeyCatalog()
    const out = applyPageRedirects(propers, catalog)
    expect(out.propers).toBe(propers)
    expect(out.propers.pageRedirectBodies).toBeUndefined()
  })

  // @fr FR-160-B-6
  it('determinism: hydrating the same propers twice yields deep-equal results', () => {
    const propers: HourPropers = {
      pageRedirects: [
        makeRedirect('invitatory-psalms', 28, 'invitatory'),
        makeRedirect('dismissal-blessing', 879, 'dismissal'),
      ],
    }
    const catalog = loadOrdinariumKeyCatalog()
    const a = applyPageRedirects(propers, catalog)
    const b = applyPageRedirects(propers, catalog)
    expect(a.propers.pageRedirectBodies).toEqual(b.propers.pageRedirectBodies)
    expect(a.bodiesHydrated).toEqual(b.bodiesHydrated)
  })
})
