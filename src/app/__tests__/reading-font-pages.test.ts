import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import GuidePage from '../guide/page'
import OrdinariumPage from '../ordinarium/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('guide and ordinarium reading-font contract', () => {
  it('renders guide prose, versicles, and rubric-like rows with font-reading', () => {
    const html = renderToStaticMarkup(createElement(GuidePage))

    expect(html).toMatch(/<p class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<p class="font-reading text-base text-stone-800/)
    expect(html).toMatch(/<p class="font-reading text-sm font-semibold text-stone-600/)
    expect(html).not.toContain('font-serif')
  })

  it('uses font-reading for every ordinarium block role, including headings and rubrics', () => {
    const html = renderToStaticMarkup(createElement(OrdinariumPage))

    expect(html).toMatch(/<p class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<div class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<ul class="mt-1 space-y-1 font-reading text-base/)
    expect(html).toMatch(/<p data-block="rubric" class="font-reading text-sm leading-relaxed/)
    expect(html).toMatch(/<h4 class="font-reading text-base font-semibold/)
    expect(html).not.toContain('font-serif')
  })
})
