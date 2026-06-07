/**
 * GOAL #48 (#48-sub-1) — psalter-fallback notice placement.
 *
 * USER REQUEST (2026-06-07): on a solemnity that borrows its psalms +
 * canticles from psalter Week 1 Sunday (Corpus Christi etc.), the notice
 * "Дууллууд ба магтаалыг 1 дүгээр долоо хоногийн Ням гарагаас татаж авна.
 * х. 58." currently renders AFTER the psalms (inside the psalmody section).
 * It should instead render at the very TOP of the prayer body — after the
 * title header, immediately BEFORE the first section (УДИРТГАЛ /
 * openingVersicle aria-label "Удиртгал") — because the solemnity is
 * special and the user should be told up-front.
 *
 * The notice is exactly the `bodyInlined` psalmody-`substitute` directive
 * (the only override flag set when a psalmody substitute carries a
 * structured `target.psalterRef` — conditional-rubric-resolver.ts
 * `rubricToOverride`). Non-bodyInlined substitutes (note-only, body
 * hidden — late-Advent / All Souls' eve), skip / append / prepend
 * directives, and plain days are NOT hoisted (AC D2 — no regression).
 *
 * Render harness: `react-dom/server` renderToStaticMarkup (no jsdom),
 * matching gospel-canticle-section.test.ts. `PrayerRenderer` reads
 * `useSettings()` via the SettingsContext DEFAULT value (no provider
 * needed; invitatoryCollapsed defaults true so the openingVersicle is
 * rendered). Position asserts are substring-index comparisons.
 *
 * @fr FR-160-B
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type React from 'react'
import { PrayerRenderer } from '@/components/prayer-renderer'
import type { AssembledHour, AssembledPsalm, HourSection, SectionOverride } from '@/lib/types'

// Byte-verbatim SoT notice (solemnities.json:365 / ordinary-time.json
// Corpus Christi / easter.json). MUST NOT be altered — this WI moves the
// notice's POSITION only, never its text.
const NOTICE =
  'Дууллууд ба магтаалыг 1 дүгээр долоо хоногийн Ням гарагаас татаж авна. х. 58.'

// УДИРТГАЛ — the openingVersicle section's aria-label is "Удиртгал"
// (opening-versicle-section.tsx:23). This is the first section of Vespers
// in the user's screenshot; the notice must precede it.
const UDIRTGAL_MARKER = 'aria-label="Удиртгал"'
const PSALMODY_MARKER = 'data-role="psalmody-section"'

function makePsalm(): AssembledPsalm {
  return {
    psalmType: 'psalm',
    reference: 'Дуулал 109',
    antiphon: 'Эзэн айлдсан нь.',
    verses: [{ verse: 1, text: 'Эзэн миний Эзэнд айлдсан нь.' }],
    gloriaPatri: true,
  }
}

function makeOpeningVersicle(): HourSection {
  return {
    type: 'openingVersicle',
    versicle: 'Тэнгэрбурхан минь, намайг авраач.',
    response: 'Эзэн минь, надад туслахаар яаравчлаач.',
    gloryBe: 'Эцэг, Хүү, Ариун Сүнсэнд алдар хүндэтгэл байх болтугай.',
  }
}

function makeHymn(): HourSection {
  return { type: 'hymn', text: 'МАГТУУ — баярын дуулал.' }
}

function makePsalmody(directives?: SectionOverride[]): HourSection {
  return { type: 'psalmody', psalms: [makePsalm()], directives }
}

/**
 * Build a minimal AssembledHour. PrayerRenderer only reads
 * `hour.sections`, `hour.date`, `hour.hourType` — liturgicalDay /
 * psalterWeek are not touched, so the cast is safe (mirrors the
 * fixture-cast pattern in gospel-canticle-section.test.ts).
 */
function makeHour(sections: HourSection[]): AssembledHour {
  return {
    hourType: 'vespers',
    date: '2026-06-07',
    sections,
  } as AssembledHour
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

function count(haystack: string, needle: string): number {
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    n++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return n
}

// The psalterFrom solemnity notice = a bodyInlined psalmody substitute.
const PSALTER_FROM_NOTICE: SectionOverride = {
  rubricId: 'ot-corpus-sun-vespers2-psalmody-substitute',
  mode: 'substitute',
  text: NOTICE,
  bodyInlined: true,
}

describe('GOAL #48 — psalter-fallback notice placement (D1)', () => {
  it('hoists the bodyInlined psalmody-substitute notice ABOVE the УДИРТГАЛ section', () => {
    const hour = makeHour([
      makeOpeningVersicle(),
      makeHymn(),
      makePsalmody([PSALTER_FROM_NOTICE]),
    ])
    const html = render(createElement(PrayerRenderer, { hour }))

    const noticeIdx = html.indexOf(NOTICE)
    const udirtgalIdx = html.indexOf(UDIRTGAL_MARKER)
    const psalmodyIdx = html.indexOf(PSALMODY_MARKER)

    expect(noticeIdx).toBeGreaterThanOrEqual(0)
    expect(udirtgalIdx).toBeGreaterThanOrEqual(0)
    expect(psalmodyIdx).toBeGreaterThanOrEqual(0)

    // D1: notice must come BEFORE the first section (УДИРТГАЛ), which in
    // turn comes before the psalmody. RED before fix: notice renders inside
    // psalmody → noticeIdx > psalmodyIdx > udirtgalIdx.
    expect(noticeIdx).toBeLessThan(udirtgalIdx)
    expect(udirtgalIdx).toBeLessThan(psalmodyIdx)
  })

  it('renders the notice exactly once (no duplicate between top and psalmody)', () => {
    const hour = makeHour([
      makeOpeningVersicle(),
      makeHymn(),
      makePsalmody([PSALTER_FROM_NOTICE]),
    ])
    const html = render(createElement(PrayerRenderer, { hour }))
    expect(count(html, NOTICE)).toBe(1)
  })

  it('still renders the borrowed psalm body (hoist must not hide the psalms)', () => {
    const hour = makeHour([
      makeOpeningVersicle(),
      makeHymn(),
      makePsalmody([PSALTER_FROM_NOTICE]),
    ])
    const html = render(createElement(PrayerRenderer, { hour }))
    // psalm body still present (bodyInlined substitute keeps psalms visible)
    expect(html).toContain('Дуулал 109')
    expect(html).toContain(PSALMODY_MARKER)
  })
})

describe('GOAL #48 — no regression for non-psalterFrom cases (D2)', () => {
  it('does NOT hoist a note-only substitute (bodyInlined absent) — stays in place', () => {
    // Late-Advent / All Souls' eve: substitute WITHOUT bodyInlined → body
    // hidden, note rendered in-section (legacy surface). Must NOT move to top.
    const noteOnly: SectionOverride = {
      rubricId: 'note-only-substitute',
      mode: 'substitute',
      text: 'ЭНЭ БОЛ note-only substitute.',
    }
    const hour = makeHour([
      makeOpeningVersicle(),
      makeHymn(),
      makePsalmody([noteOnly]),
    ])
    const html = render(createElement(PrayerRenderer, { hour }))

    const noteIdx = html.indexOf('ЭНЭ БОЛ note-only substitute.')
    const udirtgalIdx = html.indexOf(UDIRTGAL_MARKER)
    expect(noteIdx).toBeGreaterThanOrEqual(0)
    expect(udirtgalIdx).toBeGreaterThanOrEqual(0)
    // note stays AFTER the first section (not hoisted to top)
    expect(noteIdx).toBeGreaterThan(udirtgalIdx)
  })

  it('plain day (no directives): no top notice, section order unchanged', () => {
    const hour = makeHour([
      makeOpeningVersicle(),
      makeHymn(),
      makePsalmody(),
    ])
    const html = render(createElement(PrayerRenderer, { hour }))

    expect(html).not.toContain('data-role="conditional-rubric-directive"')
    const udirtgalIdx = html.indexOf(UDIRTGAL_MARKER)
    const psalmodyIdx = html.indexOf(PSALMODY_MARKER)
    expect(udirtgalIdx).toBeGreaterThanOrEqual(0)
    expect(udirtgalIdx).toBeLessThan(psalmodyIdx)
  })
})
