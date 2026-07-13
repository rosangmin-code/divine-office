import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import GuidePage from '../guide/page'
import OrdinariumPage from '../ordinarium/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('guide and ordinarium reading-font contract', () => {
  it('renders guide prose and versicle rows with font-reading, never font-serif', () => {
    const html = renderToStaticMarkup(createElement(GuidePage))

    expect(html).toMatch(/<p class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<p class="font-reading text-base text-stone-800/)
    expect(html).toMatch(/<p class="text-sm font-semibold text-stone-600/)
    expect(html).not.toMatch(/<(?:p|div|ul)[^>]*class="[^"]*font-serif/)
  })

  it('uses font-reading for ordinarium body blocks while retaining its serif heading', () => {
    const html = renderToStaticMarkup(createElement(OrdinariumPage))

    expect(html).toMatch(/<p class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<div class="font-reading text-base leading-relaxed/)
    expect(html).toMatch(/<ul class="mt-1 space-y-1 font-reading text-base/)
    expect(html).toMatch(/<p data-block="rubric" class="text-sm leading-relaxed/)
    expect(html).not.toMatch(/<p data-block="rubric" class="[^"]*font-(?:serif|reading)/)
    expect(html).not.toMatch(/<(?:p|div|ul)[^>]*class="[^"]*font-serif/)
    expect(html).toMatch(/<h4 class="font-serif text-base font-semibold/)
  })
})
