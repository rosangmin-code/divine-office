/**
 * Unit tests for wi-002 / #208 — `GospelCanticleSection` antiphonRich render
 * branch. Rendered via `react-dom/server` (no jsdom) — matches the existing
 * pattern in `psalm-block-phrases.test.ts`. Structural-substring asserts —
 * NOT exact match — so cosmetic class re-ordering does not flake.
 *
 * Coverage:
 *   - antiphonRich absent → legacy plain `AntiphonBox` (no regression)
 *   - antiphonRich present + non-empty → rich path (data-render-mode="rich")
 *   - antiphonRich present but `blocks: []` → defensive legacy fallback
 *   - text-emphasis spans (italic / bold) → emphasis classes propagate
 *   - rubric span / rubric-line block → red + not-italic override (PDF
 *     rubric is red and upright; parent wrapper is italic)
 *   - versicle / response spans → "В. " / "Х. " prefixes (Mongolian)
 *   - stanza block → multi-line spans space-separated
 *   - divider block → skipped (no marker emitted)
 *   - rich-only entry (plain `antiphon` empty, antiphonRich present) →
 *     STILL renders (regressed gate fix: `(antiphon || hasRich)`)
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type React from 'react'
import { GospelCanticleSection } from '../gospel-canticle-section'
import type { HourSection, PrayerText } from '@/lib/types'

// Local type alias renamed to avoid shadowing the imported component value
// `GospelCanticleSection` (per #207 review fix #4 — `nit` rename).
type GospelCanticleSectionLike = Extract<HourSection, { type: 'gospelCanticle' }>

function makeSection(
  overrides: Partial<GospelCanticleSectionLike> = {},
): GospelCanticleSectionLike {
  return {
    type: 'gospelCanticle',
    canticle: 'nuncDimittis',
    antiphon:
      'Эзэн минь, биднийг сэрүүн байхад ч хамгаалж, унтаж байхад ч сахин хамгаална уу.',
    text: 'Эзэн минь, одоо Та зарцаа амар амгалан явуулна уу.',
    page: 515,
    bodyPage: 515,
    ...overrides,
  } as GospelCanticleSectionLike
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// @fr FR-161
describe('GospelCanticleSection — antiphonRich render branch (#208)', () => {
  it('renders legacy plain AntiphonBox when antiphonRich is absent (no regression)', () => {
    const section = makeSection() // no antiphonRich
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-role="antiphon"')
    expect(html).not.toContain('data-render-mode="rich"')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
    expect(html).toContain('Шад магтаал')
  })

  it('renders rich path when antiphonRich is present + non-empty', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            {
              kind: 'text',
              text: 'Эзэн минь, биднийг сэрүүн байхад ч хамгаалж, унтаж байхад ч сахин хамгаална уу.',
            },
          ],
        },
      ],
      page: 515,
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('data-role="antiphon"')
    expect(html).toContain('text-amber-800')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
    expect(html).toContain('Шад магтаал')
  })

  it('falls back to legacy when antiphonRich has zero blocks (defensive)', () => {
    const antiphonRich: PrayerText = { blocks: [] }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).not.toContain('data-render-mode="rich"')
    expect(html).toContain('data-role="antiphon"')
    expect(html).toContain('сэрүүн байхад ч хамгаалж')
  })

  it('rich path renders rubric span with red + not-italic override (#207 fix)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            { kind: 'text', text: 'Тэнгэрбурханы жигүүр дор ' },
            { kind: 'rubric', text: '(Аллэлуяа)' },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('text-red-700')
    expect(html).toContain('(Аллэлуяа)')
    // Rubric escapes parent italic via not-italic (PDF rubric is upright).
    expect(html).toMatch(
      /<span[^>]*class="[^"]*not-italic[^"]*text-red-700[^"]*"[^>]*>\(Аллэлуяа\)<\/span>/,
    )
  })

  it('rich path renders rubric-line block with red + not-italic override', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'rubric-line', text: 'Амилалтын улирал:' },
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'Эзэн амилсан, аллэлуяа.' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Амилалтын улирал:')
    expect(html).toMatch(
      /<span[^>]*class="[^"]*not-italic[^"]*text-red-700[^"]*"[^>]*>Амилалтын улирал:<\/span>/,
    )
    expect(html).toContain('Эзэн амилсан, аллэлуяа.')
  })

  it('rich path propagates text emphasis (italic + bold) classes', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [
            { kind: 'text', text: 'Эзэн ' },
            { kind: 'text', text: 'хүчирхэг', emphasis: ['bold'] },
            { kind: 'text', text: ' амилсан, ' },
            { kind: 'text', text: 'үнэхээр', emphasis: ['italic'] },
            { kind: 'text', text: ' амилсан.' },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('font-semibold')
    expect(html).toContain('хүчирхэг')
    // The italic emphasis class is emitted (visually a no-op since the
    // parent is italic, but semantic intent is preserved per renderer
    // contract).
    expect(html).toMatch(/<span[^>]*class="italic"[^>]*>үнэхээр<\/span>/)
  })

  it('rich path emits Mongolian V/R prefixes for versicle / response spans', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'versicle', text: 'Эзэн дэргэд байх болтугай.' }],
        },
        {
          kind: 'para',
          spans: [{ kind: 'response', text: 'Сүнс хамт байх болтугай.' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    // Cyrillic V (В.) / R (Х.) per Mongolian liturgical convention.
    expect(html).toMatch(/<span[^>]*>В\. <\/span>/)
    expect(html).toMatch(/<span[^>]*>Х\. <\/span>/)
    expect(html).toContain('Эзэн дэргэд байх болтугай.')
    expect(html).toContain('Сүнс хамт байх болтугай.')
  })

  it('rich path renders stanza-block lines with <br/> line breaks (#217 F-X1)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'stanza',
          lines: [
            { spans: [{ kind: 'text', text: 'Шад нэг' }], indent: 0 },
            { spans: [{ kind: 'text', text: 'Шад хоёр' }], indent: 0 },
          ],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Шад нэг')
    expect(html).toContain('Шад хоёр')
    // F-X1 (#217): inter-stanza-line break is now `<br/>` (was inline space
    // — flowed lines together inside the italic AntiphonBox wrapper).
    expect(html).toMatch(/Шад нэг[\s\S]*?<br\s*\/?>[\s\S]*?Шад хоёр/)
    expect(html).toContain('data-render-mode="rich"')
  })

  it('rich path inserts <br/> between blocks (#217 F-X1)', () => {
    // Multi-block antiphon AST (e.g. seasonal Eastertide overlay that
    // appends a parenthetical Alleluia rubric, or sanctoral propers
    // shipping a rubric-line + para combo) MUST render as visually
    // distinct rows. The pre-fix renderer flowed blocks together with
    // a single-space `<span>` separator — visible as run-on prose
    // inside the amber-italic AntiphonBox wrapper. The fix swaps the
    // separator for `<br/>`.
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'para', spans: [{ kind: 'text', text: 'Эхний хэсэг.' }] },
        { kind: 'para', spans: [{ kind: 'text', text: 'Хоёр дахь хэсэг.' }] },
        {
          kind: 'para',
          spans: [{ kind: 'rubric', text: '(Аллэлуяа!)' }],
        },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    // Expect two `<br/>` between three rendered blocks (block separator
    // is suppressed before the first emitted block).
    const brCount = (html.match(/<br\s*\/?>/g) ?? []).length
    expect(brCount).toBeGreaterThanOrEqual(2)
    // Adjacency: block N text followed by `<br/>` followed by block N+1.
    // Tolerant matcher — react-dom/server emits `</span><br/>` so we
    // span any intermediate close-tags via [\s\S]*?.
    expect(html).toMatch(/Эхний хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?Хоёр дахь хэсэг\./)
    expect(html).toMatch(/Хоёр дахь хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?\(Аллэлуяа!\)/)
  })

  it('rich path skips divider blocks (no marker emitted)', () => {
    const antiphonRich: PrayerText = {
      blocks: [
        { kind: 'para', spans: [{ kind: 'text', text: 'Эхний хэсэг.' }] },
        { kind: 'divider' },
        { kind: 'para', spans: [{ kind: 'text', text: 'Хоёр дахь хэсэг.' }] },
      ],
    }
    const section = makeSection({ antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('Эхний хэсэг.')
    expect(html).toContain('Хоёр дахь хэсэг.')
    // Divider should not insert any divider/aria-hidden marker — it
    // contributes an inter-block boundary that surfaces as the
    // `<br/>` separator before the next emitted block (#217 F-X1).
    expect(html).not.toContain('aria-hidden')
    expect(html).toMatch(/Эхний хэсэг\.[\s\S]*?<br\s*\/?>[\s\S]*?Хоёр дахь хэсэг\./)
  })

  it('renders rich path even when plain `antiphon` is empty (#207 gate fix)', () => {
    // Sanctoral / seasonal data may legitimately ship rich-only without
    // a plain string companion — the prior gate `section.antiphon &&`
    // would silently swallow this. After fix #2 the gate is
    // `section.antiphon || hasRich`.
    const antiphonRich: PrayerText = {
      blocks: [
        {
          kind: 'para',
          spans: [{ kind: 'text', text: 'Аллэлуяа, аллэлуяа.' }],
        },
      ],
    }
    const section = makeSection({ antiphon: '', antiphonRich })
    const html = render(createElement(GospelCanticleSection, { section }))
    expect(html).toContain('data-render-mode="rich"')
    expect(html).toContain('Аллэлуяа, аллэлуяа.')
    expect(html).toContain('Шад магтаал')
  })
})
