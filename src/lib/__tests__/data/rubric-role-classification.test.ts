/**
 * WI #24 — Opt C: rubric/rubric-line `role` field classification.
 *
 * Two dimensions are exercised here:
 *
 *  1. **Data integrity**: production `compline.json` ':'-terminated
 *     rubric-line entries carry `role: "season-cue"` (backfill landed,
 *     stayed). Today there are 2 such entries: eastertideOctave and
 *     eastertide seasonalResponsory.
 *
 *  2. **Render invariance** (additive contract): the renderer ignores
 *     `role` — HTML output of a rubric-line/rubric span with `role`
 *     attached is **byte-identical** to the same entry without `role`.
 *     This is the structural acceptance criterion (`role` is
 *     non-rendering metadata, not a style hook).
 *
 * Why these two: the data test prevents future authoring drift (a new
 * editor strips `role` to "clean up"), and the render-invariance test
 * prevents a future renderer from accidentally branching on `role`
 * (which would break the Opt C contract that promised zero visual
 * regression for WI #24).
 *
 * Background:
 *   - WI #21 stripped red color from `:`-terminated rubric-line spans
 *     after the user clarified the marker is a SEASON cue, not a
 *     liturgical instruction.
 *   - WI #23 (research) recommended Opt C (additive `role` field).
 *   - This WI (#24) lands the schema + the 2 backfilled entries.
 *   - Future WIs may use `role` to drive selective styling — at that
 *     point THIS test needs an explicit update (it currently asserts
 *     byte-identical output). The update should be a deliberate
 *     decision documented in that WI's plan, not a silent regression.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import complineData from '../../../data/loth/ordinarium/compline.json'
import { GospelCanticleSection } from '../../../components/prayer-sections/gospel-canticle-section'
import type { HourSection, PrayerText, RubricRole } from '../../../lib/types'

type GospelCanticleSectionLike = Extract<HourSection, { type: 'gospelCanticle' }>

// Minimal structural mirror of compline.json — only the keys this test reads.
type ComplineFile = {
  seasonalResponsory?: Record<
    string,
    {
      rich?: {
        blocks: Array<{ kind: string; text?: string; role?: RubricRole }>
      }
    }
  >
}

const COMPLINE = complineData as unknown as ComplineFile

function makeSection(antiphonRich: PrayerText): GospelCanticleSectionLike {
  return {
    type: 'gospelCanticle',
    canticle: 'nuncDimittis',
    antiphon: '',
    text: '',
    antiphonRich,
  } as GospelCanticleSectionLike
}

// @fr FR-easter-NEW
describe('WI #24 — rubric role classification (Opt C)', () => {
  describe('data integrity — compline.json :-terminated rubric-line backfill', () => {
    it('eastertideOctave responsory: rubric-line "Амилалтын Найман хоногийн доторх өдрүүдэд:" carries role="season-cue"', () => {
      const blocks =
        COMPLINE.seasonalResponsory?.eastertideOctave?.rich?.blocks ?? []
      const rubricLines = blocks.filter((b) => b.kind === 'rubric-line')
      expect(rubricLines.length).toBeGreaterThan(0)
      // Every ':'-terminated rubric-line entry MUST carry role="season-cue"
      // (research #23 finding: production has 0 other-role candidates).
      for (const rl of rubricLines) {
        if (rl.text && rl.text.trim().endsWith(':')) {
          expect(rl.role).toBe('season-cue')
        }
      }
    })

    it('eastertide responsory: rubric-line "Амилалтын улирал:" carries role="season-cue"', () => {
      const blocks =
        COMPLINE.seasonalResponsory?.eastertide?.rich?.blocks ?? []
      const rubricLines = blocks.filter((b) => b.kind === 'rubric-line')
      expect(rubricLines.length).toBeGreaterThan(0)
      for (const rl of rubricLines) {
        if (rl.text && rl.text.trim().endsWith(':')) {
          expect(rl.role).toBe('season-cue')
        }
      }
    })
  })

  describe('render invariance — role is non-rendering metadata', () => {
    it('rubric-line block: with role="season-cue" renders byte-identical to without role', () => {
      // Baseline: legacy rubric-line WITHOUT role.
      const richNoRole: PrayerText = {
        blocks: [
          { kind: 'rubric-line', text: 'Амилалтын улирал:' },
          {
            kind: 'para',
            spans: [{ kind: 'text', text: 'Эзэн амилсан, аллэлуяа.' }],
          },
        ],
      }
      // Same data, role:"season-cue" attached.
      const richWithRole: PrayerText = {
        blocks: [
          {
            kind: 'rubric-line',
            text: 'Амилалтын улирал:',
            role: 'season-cue',
          },
          {
            kind: 'para',
            spans: [{ kind: 'text', text: 'Эзэн амилсан, аллэлуяа.' }],
          },
        ],
      }
      const htmlNoRole = renderToStaticMarkup(
        createElement(GospelCanticleSection, { section: makeSection(richNoRole) }),
      )
      const htmlWithRole = renderToStaticMarkup(
        createElement(GospelCanticleSection, { section: makeSection(richWithRole) }),
      )
      // BYTE-identical — Opt C promise.
      expect(htmlWithRole).toBe(htmlNoRole)
    })

    it('rubric span: with role="refrain-prefix" renders byte-identical to without role', () => {
      // Baseline: rubric span WITHOUT role (the "- " refrain-prefix shape).
      const richNoRole: PrayerText = {
        blocks: [
          {
            kind: 'para',
            spans: [
              { kind: 'rubric', text: '- ' },
              { kind: 'text', text: 'Эзэн биднийг сонсооч.' },
            ],
          },
        ],
      }
      const richWithRole: PrayerText = {
        blocks: [
          {
            kind: 'para',
            spans: [
              { kind: 'rubric', text: '- ', role: 'refrain-prefix' },
              { kind: 'text', text: 'Эзэн биднийг сонсооч.' },
            ],
          },
        ],
      }
      const htmlNoRole = renderToStaticMarkup(
        createElement(GospelCanticleSection, { section: makeSection(richNoRole) }),
      )
      const htmlWithRole = renderToStaticMarkup(
        createElement(GospelCanticleSection, { section: makeSection(richWithRole) }),
      )
      expect(htmlWithRole).toBe(htmlNoRole)
    })

    it('all four RubricRole enum values are accepted as valid by the type system', () => {
      // Structural compile-time check materialized as a runtime probe: each
      // enum literal must round-trip through the renderer with no error and
      // no visual change. Renderer ignores all role values today.
      const roles: RubricRole[] = [
        'instruction',
        'season-cue',
        'refrain-prefix',
        'acclamation',
      ]
      for (const role of roles) {
        const rich: PrayerText = {
          blocks: [
            { kind: 'rubric-line', text: 'Test cue:', role },
          ],
        }
        const html = renderToStaticMarkup(
          createElement(GospelCanticleSection, { section: makeSection(rich) }),
        )
        // Renders the text — role attached doesn't suppress or transform.
        expect(html).toContain('Test cue:')
        // No role-derived class / data attribute leaks into output.
        expect(html).not.toContain(`data-role="${role}"`)
        expect(html).not.toMatch(new RegExp(`class="[^"]*${role}[^"]*"`))
      }
    })
  })
})
