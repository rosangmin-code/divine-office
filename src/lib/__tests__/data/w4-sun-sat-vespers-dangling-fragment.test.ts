import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import fs from 'fs'
import path from 'path'
import { parseIntercessions } from '../../hours/intercessions'
import { IntercessionsSection } from '../../../components/prayer-sections/intercessions-section'
import type { HourSection } from '../../types'

/**
 * GOAL #202 [#202-sub-2] — W4 SUN/SAT Vespers dangling "дамжуулан тэднийг" fragment.
 *
 * DEFECT (parsed_data/full_pdf.txt:14570-14586, page boundary 421->422):
 *   The final (for-the-dead) petition's response was fractured by the book's
 *   page-break + column layout. The SoT prints the four pieces out of reading
 *   order:
 *     L14579  "- Христ Хүүгээрээ"
 *     L14580  "амилалтаар адисална уу."
 *     L14582  "дамжуулан"
 *     L14584  "тэднийг"
 *   The extraction preserved that visual order, so week-4.json carried the two
 *   displaced words as STANDALONE array elements AFTER the response terminal:
 *     "амласан амлалтаа биелүүлж, - Христ Хүүгээрээ",
 *     "амилалтаар адисална уу.",
 *     "дамжуулан",            <-- stranded
 *     "тэднийг",              <-- stranded
 *     "“Тэнгэр дэх Эцэг минь ээ...”"
 *   parseIntercessions flushed the response at "…адисална уу." (sentence end),
 *   then turned "дамжуулан" + "тэднийг" into a SPURIOUS versicle-only petition
 *   rendered as a bare plain block between the intercessions and the Lord's
 *   Prayer (user screenshot Screenshot_20260623_213332).
 *
 * FIX (surgical, source-faithful — every PDF word byte-preserved, only the
 *   page-break-fractured order restored into reading order; MT/추측 금지 per the
 *   loth-text-data-fix mental model "고침 절차" §2):
 *     "амласан амлалтаа биелүүлж, - Христ Хүүгээрээ",
 *     "дамжуулан тэднийг амилалтаар адисална уу.",
 *     "“Тэнгэр дэх Эцэг минь ээ...”"
 *   The postposition "дамжуулан" binds to the preceding instrumental noun
 *   "Хүүгээрээ" (the idiom "Хүүгээр дамжуулан" appears verbatim at
 *   week-4.json line 893), and "тэднийг" is the lone accusative
 *   object of "адисална" — exactly one grammatical arrangement, yielding the
 *   response "Христ Хүүгээрээ дамжуулан тэднийг амилалтаар адисална уу."
 *
 * Both W4 SUN vespers (Second Vespers) and W4 SAT vespers (First Vespers of the
 * following Sunday) reuse this identical intercession block. week-4.json is the
 * single app-consumed source (psalter intercessions have no rich mirror).
 *
 * @fr NFR-009 (book-faithful Mongolian body text)
 */
const REPO_ROOT = process.cwd()
const WEEK4_PATH = path.join(REPO_ROOT, 'src/data/loth/psalter/week-4.json')

// The merged response element (replaces the two stranded bare elements).
const MERGED_RESPONSE_ELEMENT = 'дамжуулан тэднийг амилалтаар адисална уу.'
// The full reconstructed response after parseIntercessions joins the wrap.
const EXPECTED_DEAD_RESPONSE =
  'Христ Хүүгээрээ дамжуулан тэднийг амилалтаар адисална уу.'
const CLOSING_INCIPIT = 'Тэнгэр дэх Эцэг'

interface Vespers {
  intercessions: string[]
}
interface Week4 {
  days: Record<string, { vespers: Vespers }>
}

const week4 = JSON.parse(fs.readFileSync(WEEK4_PATH, 'utf-8')) as Week4

describe('GOAL #202 — W4 SUN/SAT vespers dangling "дамжуулан тэднийг" fragment', () => {
  for (const day of ['SUN', 'SAT'] as const) {
    describe(`${day}/vespers`, () => {
      const ic = week4.days[day].vespers.intercessions

      it('no longer carries the two stranded bare fragment elements', () => {
        expect(ic).not.toContain('дамжуулан')
        expect(ic).not.toContain('тэднийг')
      })

      it('carries the merged response element (PDF words, reading order)', () => {
        expect(ic).toContain(MERGED_RESPONSE_ELEMENT)
      })

      it('parses to a clean petition set with NO spurious "дамжуулан тэднийг" petition', () => {
        const parsed = parseIntercessions(ic)
        // The pre-fix bug produced a versicle-only petition whose versicle was
        // exactly the stranded fragment.
        const strays = parsed.petitions.filter(
          (p) => p.versicle.trim() === 'дамжуулан тэднийг' && !p.response,
        )
        expect(strays).toHaveLength(0)
      })

      it('reconstructs the for-the-dead petition response in full', () => {
        const parsed = parseIntercessions(ic)
        const last = parsed.petitions[parsed.petitions.length - 1]
        expect(last.versicle).toContain('нойрсон буй хүмүүст')
        expect(last.response).toBe(EXPECTED_DEAD_RESPONSE)
      })

      it('ends with the Lord’s Prayer closing incipit (not the fragment)', () => {
        const parsed = parseIntercessions(ic)
        expect(parsed.closing).toBeDefined()
        expect(parsed.closing).toContain(CLOSING_INCIPIT)
      })

      // DV1 render-boundary check — render the production IntercessionsSection
      // with the real parsed data and inspect the actual DOM the user sees.
      // Pre-fix, the renderer emitted a bare `<div>дамжуулан тэднийг</div>`
      // versicle block (no response) AND the dead-petition response rendered
      // truncated as "Христ Хүүгээрээ амилалтаар адисална уу."; both are gone.
      it('renders the merged response and NO bare "дамжуулан тэднийг" block (real DOM)', () => {
        const parsed = parseIntercessions(ic)
        const section = {
          type: 'intercessions',
          intro: '',
          items: ic,
          introduction: parsed.introduction,
          refrain: parsed.refrain,
          petitions: parsed.petitions,
          closing: parsed.closing,
        } as Extract<HourSection, { type: 'intercessions' }>
        const markup = renderToStaticMarkup(
          createElement(IntercessionsSection, { section }),
        )
        // The full reconstructed response is present in the rendered DOM.
        expect(markup).toContain(EXPECTED_DEAD_RESPONSE)
        // The fragment never appears as a standalone versicle div.
        expect(markup).not.toContain(`<div>${MERGED_RESPONSE_ELEMENT}</div>`)
        expect(markup).not.toContain('<div>дамжуулан тэднийг</div>')
      })
    })
  }
})
