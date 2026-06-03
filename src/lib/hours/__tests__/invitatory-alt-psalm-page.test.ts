import { describe, it, expect } from 'vitest'
import { buildInvitatory } from '../builders/invitatory'
import { loadOrdinarium } from '../loaders'

/**
 * GOAL #273 Feature 2 / RCA #268 (2차 원인) — the alternate invitatory psalms
 * (Psalm 100 / 67 / 24) must carry their canonical book page so the page-ref
 * renders when the user selects one. Originally only Psalm 95 had `page: 28`;
 * the alternates had no `page` key, so the component's activePage resolved to
 * `undefined` and `<PageRef page={activePage} />` rendered nothing.
 *
 * Page values verified directly against parsed_data/full_pdf.txt page markers
 * (page header = standalone number line; the psalm's "Дуулал NNN" header that
 * follows a marker fixes its start page):
 *   - Psalm 95  "Дуулал 95"  @L840  → between marker 28 (L830) and 29 (L871) → 28
 *   - Psalm 100 "Дуулал 100" @L915  → between marker 30 (L910) and 31 (L945) → 30
 *   - Psalm 67  "Дуулал 67"  @L938  → between marker 30 (L910) and 31 (L945) → 30
 *   - Psalm 24  "Дуулал 24"  @L969  → between marker 31 (L945) and 32 (L980) → 31
 *
 * This mirrors the component's activePage resolution
 * (src/components/invitatory-section.tsx):
 *   const activePage = candidates ? candidates[psalmIndex]?.page : section.page
 */
describe('invitatory alternate-psalm page data (GOAL #273 F2)', () => {
  const section = buildInvitatory(loadOrdinarium(), 'Test antiphon')
  // buildInvitatory returns the HourSection union; `candidates` lives only on
  // the invitatory variant and is optional there. Narrow the variant AND
  // assert candidates present so `candidates` is strongly typed without a
  // non-null assertion — `npx tsc --noEmit` (CI quality gate) rejects the `!`.
  if (section.type !== 'invitatory' || !section.candidates) {
    throw new Error('expected an invitatory section with candidates')
  }
  const candidates = section.candidates

  it('exposes all four invitatory psalm candidates in book order', () => {
    expect(candidates).toHaveLength(4)
    expect(candidates.map((c) => c.ref)).toEqual([
      'Psalm 95:1-11',
      'Psalm 100:1-5',
      'Psalm 67:2-8',
      'Psalm 24:1-10',
    ])
  })

  it('Psalm 95 (default, index 0) carries page 28', () => {
    expect(candidates[0].page).toBe(28)
  })

  // The regression target: selecting an alternate psalm (invitatoryPsalmIndex
  // 1/2/3) must resolve a truthy activePage equal to its verified book page.
  it.each([
    [1, 'Psalm 100:1-5', 30],
    [2, 'Psalm 67:2-8', 30],
    [3, 'Psalm 24:1-10', 31],
  ])(
    'alternate psalm index %i (%s) resolves a truthy activePage = %i',
    (idx, ref, page) => {
      expect(candidates[idx as number].ref).toBe(ref)
      // activePage resolution exactly as in invitatory-section.tsx
      const activePage = candidates[idx as number]?.page
      expect(activePage).toBeTruthy()
      expect(activePage).toBe(page)
    },
  )
})
