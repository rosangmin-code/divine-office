import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyPageRedirects,
  loadOrdinariumKeyCatalog,
  _resetOrdinariumCatalogCache,
  type OrdinariumIndex,
} from '../page-redirect-resolver'
import type { HourPropers, PageRedirect } from '../../types'

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
  it('PR-1: keeps propers byte-equal under valid redirects (deferred hydration)', () => {
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
