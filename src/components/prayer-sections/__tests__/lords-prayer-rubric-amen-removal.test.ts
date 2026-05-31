/**
 * GOAL #115 (Step 4 — #115-sub-4) — RED component tests for:
 *   [D1] Remove the Lord's-Prayer guidance cue after the intercessions
 *        (BOTH render paths: structured `«closing»` AND legacy `items[]`).
 *   [D2] Drop the trailing "Амэн." from the Lord's Prayer body.
 *   [D3] Regression guards (what must NOT change).
 *
 * Blueprint:
 *   - MM:        docs/design/mental-models/goal115-lords-prayer-rubric-amen-removal.md
 *   - Scenarios: docs/research/GOAL115-scenarios.md ([D1]/[D2]/[D3], legacy 3-page escalation)
 *   - Spec lock: docs/research/GOAL115-spec.md (§1 C2.2/C2.3/C3, §2 D3 a-d, §4 test inputs)
 *
 * ⚠️ RED — authored BEFORE the Step-6 fix. The [D1]/[D2] assertions describe
 * the POST-FIX user-observable outcome (cue gone / Амэн gone), so they MUST
 * FAIL now (the cue + Амэн still render). The [D3] entries are regression
 * GUARDS — they are GREEN now and must STAY GREEN after the fix.
 *
 * Selector-axis discipline (CLAUDE.md): structure via data-role / section
 * shape; Mongolian-text accuracy via the verbatim Cyrillic incipit prefix
 * (`Тэнгэр дэх Эцэг`) and the amen token (`Амэн`, Cyrillic э — NOT `Амен`).
 *
 * @fr FR-169  (provisional — GOAL #115; implementer confirms/assigns the
 *              final FR number at Step 6 per GOAL115-spec §5. PRD max in main
 *              is FR-167; FR-168 is GOAL #90, unmerged.)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { IntercessionsSection } from '../intercessions-section'
import { OurFatherSection } from '../our-father-section'
import type { HourSection } from '@/lib/types'

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(node)
}

// Verbatim source strings (NFR-002 — Mongolian Cyrillic).
// CLOSING_PREFIX (src/lib/hours/intercessions.ts:27) — the Lord's-Prayer
// incipit cue. Both render paths surface a string beginning with this prefix.
const INCIPIT_PREFIX = 'Тэнгэр дэх Эцэг'
// Full incipit cue as it appears in psalter data (smart quotes preserved).
const INCIPIT_CUE = '“Тэнгэр дэх Эцэг минь ээ...”'
// The Lord's-Prayer trailing token to be removed (Cyrillic э, not е).
const AMEN = 'Амэн'

function makeLegacy(items: string[]): Extract<
  HourSection,
  { type: 'intercessions' }
> {
  return { type: 'intercessions', intro: '', items }
}

function makeStructured(args: {
  petitions: { versicle: string; response?: string }[]
  introduction?: string
  refrain?: string
  closing?: string
  items?: string[]
}): Extract<HourSection, { type: 'intercessions' }> {
  return {
    type: 'intercessions',
    intro: '',
    // items MUST be non-empty or the renderer's "no items" early-return fires
    // before the petitions check (intercessions-section.tsx:61).
    items: args.items ?? ['__structured_stub__'],
    introduction: args.introduction,
    refrain: args.refrain,
    petitions: args.petitions,
    closing: args.closing,
  }
}

// @fr FR-169
describe('GOAL #115 [D1] — Lord\'s-Prayer guidance cue removed after intercessions', () => {
  it('[D1-structured] structured path: NO «closing» incipit cue is rendered (RED until fix)', () => {
    // Real-shape Sunday Lauds (week-1 SUN): petitions + a closing incipit.
    // Per spec C2.2 the `{section.closing && («closing»)}` block is deleted,
    // so the cue must not appear. Currently it renders → this FAILS (RED).
    const section = makeStructured({
      introduction: 'Бүгдээрээ Эзэнд хандан залбирцгаая:',
      refrain: 'Эзэн, биднийг сонсооч.',
      petitions: [
        {
          versicle: 'Дэлхийн энх тайвны төлөө гуйя.',
          response: 'Эзэн, биднийг сонсооч.',
        },
      ],
      closing: INCIPIT_CUE,
    })
    const out = html(createElement(IntercessionsSection, { section }))
    // [D1] outcome: the guidance cue (incipit prefix) must be absent.
    expect(out).not.toContain(INCIPIT_PREFIX)
    // …and the guillemet wrapper specifically must be gone.
    expect(out).not.toContain('«')
    // [D3-a] regression guard (GREEN now + after fix): petitions still render.
    expect(out).toContain('data-role="intercessions-petition"')
    expect(out).toContain('Дэлхийн энх тайвны төлөө гуйя.')
    expect(out).toContain('data-role="intercessions-response"')
  })

  it('[D1-legacy] legacy items[] path: trailing incipit bullet is filtered out (RED until fix)', () => {
    // The 3 real legacy+incipit blocks (week-3 SUN lauds, week-4 SUN lauds,
    // week-4 MON vespers) route here (petitions===0). Per spec C2.3 the
    // closing incipit item is filtered before render. Currently it renders as
    // a `— "Тэнгэр дэх Эцэг..."` bullet → this FAILS (RED).
    const section = makeLegacy([
      'Бид Эзэнд хандан залбирцгаая:',
      'Эзэн, биднийг сонсооч.',
      'Дэлхийн энх тайвны төлөө гуйя.',
      INCIPIT_CUE, // ← must be filtered out (trailing incipit)
    ])
    const out = html(createElement(IntercessionsSection, { section }))
    // [D1] outcome: incipit bullet absent.
    expect(out).not.toContain(INCIPIT_PREFIX)
    // [edge / D3-a] the surviving (non-incipit) bullets still render…
    expect(out).toContain('Бид Эзэнд хандан залбирцгаая:')
    expect(out).toContain('Эзэн, биднийг сонсооч.')
    expect(out).toContain('Дэлхийн энх тайвны төлөө гуйя.')
    // …exactly 3 bullets remain (4 input − 1 incipit). RED now: 4 render.
    expect(out.match(/<li[ >]/g)?.length).toBe(3)
    // [D3-a] refrain italic heuristic still applies to the survivor after a
    // залбирцгаая trigger (filter must not break the look-back).
    expect(out).toContain('data-role="intercessions-refrain"')
  })
})

// @fr FR-169
describe('GOAL #115 [D2] — Lord\'s Prayer ends without "Амэн."', () => {
  it('[D2] OurFatherSection output does NOT contain "Амэн" (RED until fix)', () => {
    const out = html(createElement(OurFatherSection))
    // [D2] outcome: the trailing amen token is gone.
    expect(out).not.toContain(AMEN)
    // [D3-b] regression guard: the body is otherwise intact.
    expect(out).toContain('Тэнгэр дэх Эцэг минь ээ') // opening
    expect(out).toContain('гэтэлгэн соёрхоно уу') // final sentence (sans Амэн)
    // The heading is unchanged.
    expect(out).toContain('Эзэний даатгал залбирал')
  })
})

// @fr FR-169
describe('GOAL #115 [D3] — regression guards (must NOT change)', () => {
  it('[D3-c] /ordinarium reference Lord\'s Prayer KEEPS its standalone "Амэн." (out of scope)', () => {
    // The render-layer fix touches no data files; loaders.ts does not load
    // top-level ordinarium.json, and OurFatherSection does not read
    // common-prayers.json. The standalone reference prayer must still end in
    // Амэн. (GREEN now and after the fix — guards against accidental data edit.)
    const cpPath = fileURLToPath(
      new URL(
        '../../../data/loth/ordinarium/common-prayers.json',
        import.meta.url,
      ),
    )
    const raw = readFileSync(cpPath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    const serialized = JSON.stringify(data)
    // The reference page's Lord's Prayer (an entry containing the incipit)
    // must still carry its liturgically-correct trailing Амэн.
    expect(serialized).toContain('Тэнгэр дэх Эцэг минь ээ')
    expect(serialized).toContain('Амэн')
  })

  // [D3-d] Compline unaffected — Compline assembles neither `intercessions`
  // nor `ourFather` (asserted by src/lib/__tests__/hours/compline.test.ts:90-93).
  // Not duplicated here to avoid test bloat; that existing suite is the guard.
})
