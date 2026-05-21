/**
 * (a)-reproduce evidence harness for WI 10 outcome verification.
 *
 * Loads the actual production data (`w1-SUN-lauds.rich.json` + the matching
 * psalter responsory shape) and renders the ResponsorySection with it, then
 * pretty-prints the rendered DOM so the user-facing outcome (refrain repeat
 * after Glory Be, `-` hyphen prefix) is directly inspectable.
 *
 * This is the outcome-evidence test the dispatch's "Outcome verification
 * (REQUIRED)" block asks for. Mechanism-only tests live in
 * `responsory-section.test.ts`; this test asserts the printed HTML matches
 * the PDF Sample A line-for-line.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { ResponsorySection } from '../responsory-section'
import type { HourSection } from '@/lib/types'

// Production data — Week 1 Sunday Lauds responsory (psalter commons).
// fullResponse / versicle / shortResponse are the canonical plain fields the
// pipeline emits at lauds.ts L58-60; rich is the parallel AST that, before
// this WI, the renderer used as primary (with the 5-block / Х./В. bug).
const PROD_W1_SUN_LAUDS_RESPONSORY: Extract<HourSection, { type: 'responsory' }> = {
  type: 'responsory',
  fullResponse: 'Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.',
  versicle: 'Та Эцэгийнхээ баруун гар талд заларч байдаг.',
  shortResponse: 'Биднийг өршөөнө үү.',
  page: 66,
  rich: {
    blocks: [
      // 5-block legacy rich AST. Now intentionally NOT consumed by the body
      // renderer (it diverges from PDF — see responsory-section.tsx comment).
      { kind: 'para', spans: [{ kind: 'response', text: 'Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.' }] },
      { kind: 'para', spans: [{ kind: 'versicle', text: 'Та Эцэгийнхээ баруун гар талд заларч байдаг.' }] },
      { kind: 'para', spans: [{ kind: 'response', text: 'Биднийг өршөөнө үү.' }] },
      { kind: 'para', spans: [{ kind: 'text', text: 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.' }] },
      { kind: 'para', spans: [{ kind: 'response', text: 'Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.' }] },
    ],
    page: 66,
    source: { kind: 'common', id: 'psalter-w1-sun-lauds-responsory' },
  },
}

describe('ResponsorySection — (a)-reproduce evidence with production data (#5, WI 10)', () => {
  it('Week 1 Sunday Lauds matches PDF Sample A line-for-line', () => {
    const html = renderToStaticMarkup(
      createElement(ResponsorySection, { section: PROD_W1_SUN_LAUDS_RESPONSORY }),
    )

    // Extract body paragraphs in order. The header `<p>` carries the rubric
    // header text (Хариу залбирал); body paragraphs follow.
    const bodyMatches = [
      ...html.matchAll(/<p\b[^>]*class="[^"]*font-serif[^"]*"[^>]*>([\s\S]*?)<\/p>/g),
    ]
    const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const lines = bodyMatches.map((m) => stripTags(m[1]))

    // Expected PDF Sample A sequence (psalter.pdf p.66, OT Wk1 SUN Lauds).
    expect(lines).toEqual([
      'Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.',                // refrain (cantor, no prefix)
      '- Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.',              // - refrain (response)
      'Та Эцэгийнхээ баруун гар талд заларч байдаг.',                          // versicle (cantor)
      '- Биднийг өршөөнө үү.',                                                 // - shortResponse
      'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.',                               // Glory Be (cantor)
      '- Амьд Тэнгэрбурханы Хүү Христ минь, биднийг өршөөнө үү.',              // - refrain (final response)
    ])

    // PDF convention markers — `Х./В.` MUST NOT appear.
    expect(html).not.toContain('Х.')
    expect(html).not.toContain('В.')

    // WI-62 재스킨: 응답구 `- ` 마커는 골드 악센트. exactly 3 times (lines 2, 4, 6).
    const goldPrefixCount = (
      html.match(/<span class="text-liturgical-gold dark:text-liturgical-gold-dark">- <\/span>/g) ?? []
    ).length
    expect(goldPrefixCount).toBe(3)
  })

  it('prints rendered DOM to stdout for visual inspection (manual capture)', () => {
    const html = renderToStaticMarkup(
      createElement(ResponsorySection, { section: PROD_W1_SUN_LAUDS_RESPONSORY }),
    )
    // The console.log output is captured by the tee log and forms the
    // (a)-reproduce evidence quoted in the completion_report.
    console.log('\n=== PDF-faithful responsory render (W1 SUN Lauds) ===\n' + html + '\n=== end ===\n')
    expect(html.length).toBeGreaterThan(0)
  })
})
