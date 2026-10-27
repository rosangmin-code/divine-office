/**
 * 시편 블록 끝의 영광송 줄 — 세 갈래.
 *
 *   - gloriaPatri true                      → 영광송 전문
 *   - gloriaPatri false (Benedicite)        → «…уншихгүй» 생략 루브릭 (FR-128)
 *   - gloriaPatri false + continuesInNextPart → 아무것도 없음
 *     분할 시편 앞 부(I부). 책은 I부 끝에 영광송도 루브릭도 싣지 않고 바로 II부
 *     후렴으로 넘어간다 (2026-10-27,
 *     docs/bug-reports/2026-10-25-split-psalm-prayer-placement.md §6).
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm } from '@/lib/types'

const GLORIA = 'Эхэн цагт байсан мэт аливаа цагт болготугай'
const OMIT_RUBRIC = 'уншихгүй'

function render(overrides: Partial<AssembledPsalm>): string {
  const psalm: AssembledPsalm = {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: '',
    verses: [],
    stanzas: [['Мөр нэг.']],
    gloriaPatri: true,
    ...overrides,
  }
  return renderToStaticMarkup(createElement(SettingsProvider, null, createElement(PsalmBlock, { psalm })))
}

// @fr FR-037
describe('PsalmBlock — Gloria Patri line', () => {
  it('renders the full Gloria when gloriaPatri is true', () => {
    const html = render({ gloriaPatri: true })
    expect(html).toContain(GLORIA)
    expect(html).not.toContain(OMIT_RUBRIC)
  })

  it('renders the omission rubric for gloriaPatri false (Benedicite)', () => {
    const html = render({ psalmType: 'canticle', gloriaPatri: false })
    expect(html).not.toContain(GLORIA)
    expect(html).toContain(OMIT_RUBRIC)
  })

  it('renders neither for a split psalm Part I (continuesInNextPart)', () => {
    const html = render({ gloriaPatri: false, continuesInNextPart: true })
    expect(html).not.toContain(GLORIA)
    expect(html).not.toContain(OMIT_RUBRIC)
    expect(html).toContain('Мөр нэг.')
  })
})
