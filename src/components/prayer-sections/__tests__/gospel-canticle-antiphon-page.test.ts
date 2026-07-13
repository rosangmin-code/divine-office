import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type React from 'react'
import type { HourPsalmody } from '@/lib/types'
import { extractPsalterCommons } from '@/lib/psalter-loader'
import { resolveGospelCanticle } from '@/lib/hours/shared'
import { GospelCanticleSection } from '../gospel-canticle-section'

vi.mock('@/lib/settings', async () => {
  const actual = await vi.importActual<typeof import('@/lib/settings')>(
    '@/lib/settings',
  )
  return {
    ...actual,
    useSettings: () => ({
      settings: { ...actual.DEFAULTS, showPageRefs: true },
      updateSettings: vi.fn(),
    }),
  }
})

const CANTICLES = {
  benedictus: {
    ref: 'Luke 1:68-79',
    titleMn: 'Захариагийн магтаал',
    verses: ['Израилийн Тэнгэрбурхан Эзэн магтагдах болтугай.'],
  },
}

function resolveFromPsalterHour(hourEntry: HourPsalmody) {
  const commons = extractPsalterCommons(hourEntry)
  const section = resolveGospelCanticle(
    'lauds',
    CANTICLES,
    commons.gospelCanticleAntiphon ?? '',
    commons.gospelCanticleAntiphonPage,
  )
  if (!section || section.type !== 'gospelCanticle') {
    throw new Error('expected a resolved gospel canticle section')
  }
  return section
}

function renderFromPsalterHour(hourEntry: HourPsalmody): string {
  const section = resolveFromPsalterHour(hourEntry)
  return renderToStaticMarkup(
    createElement(GospelCanticleSection, { section }) as React.ReactElement,
  )
}

describe('gospel canticle antiphon page reference', () => {
  it('propagates a verified psalter-week page onto the Шад магтаал row', () => {
    const hourEntry: HourPsalmody = {
      psalms: [],
      gospelCanticleAntiphon: 'Бидний Тэнгэрбурхан биднийг эргэн ирлээ.',
      gospelCanticleAntiphonPage: 777,
    }
    const section = resolveFromPsalterHour(hourEntry)
    expect(section.antiphonPage).toBe(777)

    const html = renderFromPsalterHour(hourEntry)

    const antiphonRows = html.match(
      /<div[^>]*data-role="antiphon"[^>]*>[\s\S]*?<\/div>/g,
    )
    expect(antiphonRows).not.toBeNull()
    expect(antiphonRows).toHaveLength(2)
    for (const row of antiphonRows ?? []) {
      expect(row).toContain('Шад магтаал:')
      expect(row).toContain('(х. 777)')
      expect(row).toContain('data-role="page-ref-link"')
      expect(row).toContain('whitespace-nowrap')
    }
  })

  it('renders no page reference when the psalter-week page is absent', () => {
    const hourEntry: HourPsalmody = {
      psalms: [],
      gospelCanticleAntiphon: 'Бидний Тэнгэрбурхан биднийг эргэн ирлээ.',
    }
    const section = resolveFromPsalterHour(hourEntry)
    expect(section.antiphonPage).toBeUndefined()

    const html = renderFromPsalterHour(hourEntry)

    expect(html).toContain('data-role="antiphon"')
    expect(html).not.toContain('data-role="page-ref-link"')
    expect(html).not.toContain('(х.')
  })
})
