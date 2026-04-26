/**
 * Unit tests for FR-160-A1: detectRefrainLines + buildPsalterStanzasRich
 * denylist consultation.
 *
 * detectRefrainLines (rich-builder.mjs Layer F) accepts an optional
 * `{ ref, denylist }` pair. When `ref` is in `denylist`, NO line is
 * tagged as a refrain — the threshold-based auto-detection is bypassed
 * entirely. This protects refs like Psalm 150:1-6 whose verse-ending
 * repeated phrase is rendered in plain (black) body text by the PDF
 * source, not as a rubric refrain.
 */

import { describe, it, expect } from 'vitest'
import {
  detectRefrainLines,
  buildPsalterStanzasRich,
} from '../parsers/rich-builder.mjs'

// PDF p449-450 Psalm 150 text — 6 stanzas, each ending with the
// repeated phrase "Түүнийг магтагтун!". Without denylist consult,
// detectRefrainLines auto-fires (threshold=3, hits 6) → false-positive.
const PSALM_150_STANZAS = [
  ['ЭЗЭНийг магтагтун!', 'Тэнгэрбурханыг ариун газарт нь магтагтун!'],
  ['Түүнийг хүчирхэг огторгуйд нь магтагтун!', 'Хүчит үйлсийнх нь төлөө', 'Түүнийг магтагтун!'],
  ['Эрхэм аугаагийнх нь дагуу', 'Түүнийг магтагтун!'],
  ['Бүрээн дуугаар Түүнийг магтагтун!', 'Босоо ятгаар, ятгаар', 'Түүнийг магтагтун!'],
  ['Хэнгэргээр, бүжгээр', 'Түүнийг магтагтун!', 'Чавхдаст ятгаар, лимбээр', 'Түүнийг магтагтун!'],
  ['Эгшиглэнт цангалаар', 'Түүнийг магтагтун!', 'Цангинасан цангалаар', 'Түүнийг магтагтун!'],
]

// Daniel 3-style canticle with a clear authentic refrain ("Эзэнийг магтагтун")
// repeated ≥3x — must remain detected when ref is NOT denylisted.
const DAN3_LIKE_STANZAS = [
  ['ЭЗЭНий бүх бүтээл, ЭЗЭНий магтан дуул', 'Эзэнийг магтагтун'],
  ['Тэнгэр элчүүд, ЭЗЭНий магтан дуул', 'Эзэнийг магтагтун'],
  ['Тэнгэрүүд, ЭЗЭНий магтан дуул', 'Эзэнийг магтагтун'],
  ['Усны дээрх ус, ЭЗЭНий магтан дуул', 'Эзэнийг магтагтун'],
]

// @fr FR-160
describe('FR-160-A1 detectRefrainLines denylist consult', () => {
  // @fr FR-160
  it('returns empty Set when ref is in denylist (Set form)', () => {
    const denylist = new Set(['Psalm 150:1-6'])
    const refrains = detectRefrainLines(PSALM_150_STANZAS, {
      ref: 'Psalm 150:1-6',
      denylist,
    })
    expect(refrains.size).toBe(0)
  })

  it('returns empty Set when ref is in denylist (Array form)', () => {
    const refrains = detectRefrainLines(PSALM_150_STANZAS, {
      ref: 'Psalm 150:1-6',
      denylist: ['Psalm 150:1-6'],
    })
    expect(refrains.size).toBe(0)
  })

  it('falls through to threshold-based detection when ref is NOT in denylist', () => {
    // Same stanzas, different ref → denylist miss → threshold detection fires.
    const denylist = new Set(['Psalm 150:1-6'])
    const refrains = detectRefrainLines(PSALM_150_STANZAS, {
      ref: 'Psalm 999:9-9',
      denylist,
    })
    expect(refrains.has('Түүнийг магтагтун')).toBe(true)
  })

  it('preserves authentic refrain detection on non-denylisted refs (Daniel 3-like)', () => {
    const denylist = new Set(['Psalm 150:1-6'])
    const refrains = detectRefrainLines(DAN3_LIKE_STANZAS, {
      ref: 'Daniel 3:57-88',
      denylist,
    })
    expect(refrains.has('Эзэнийг магтагтун')).toBe(true)
  })

  it('threshold-based detection unchanged when ref/denylist not supplied (backward compat)', () => {
    // Pre-FR-160 callers with no ref/denylist must observe identical behavior.
    const refrains = detectRefrainLines(PSALM_150_STANZAS)
    expect(refrains.has('Түүнийг магтагтун')).toBe(true)
  })

  it('handles ref provided but denylist null (no-op gate)', () => {
    const refrains = detectRefrainLines(PSALM_150_STANZAS, {
      ref: 'Psalm 150:1-6',
      denylist: null,
    })
    expect(refrains.has('Түүнийг магтагтун')).toBe(true)
  })

  it('handles denylist provided but ref null (no-op gate)', () => {
    const refrains = detectRefrainLines(PSALM_150_STANZAS, {
      ref: null,
      denylist: new Set(['Psalm 150:1-6']),
    })
    expect(refrains.has('Түүнийг магтагтун')).toBe(true)
  })
})

// @fr FR-160
describe('FR-160-A1 buildPsalterStanzasRich denylist propagation', () => {
  it('produces 0 refrain-tagged lines when ref is denylisted', () => {
    const denylist = new Set(['Psalm 150:1-6'])
    const result = buildPsalterStanzasRich({
      stanzas: PSALM_150_STANZAS,
      ref: 'Psalm 150:1-6',
      denylist,
    })
    const refrainLines = result.blocks
      .filter((b) => b.kind === 'stanza')
      .flatMap((b) => b.lines || [])
      .filter((ln) => ln.role === 'refrain')
    expect(refrainLines.length).toBe(0)
    expect(result.refrains.size).toBe(0)
    expect(result.pass).toBe(true) // text + structural gates still pass
  })

  it('produces refrain-tagged lines when denylist does not include ref', () => {
    const result = buildPsalterStanzasRich({
      stanzas: DAN3_LIKE_STANZAS,
      ref: 'Daniel 3:57-88',
      denylist: new Set(['Psalm 150:1-6']),
    })
    const refrainLines = result.blocks
      .filter((b) => b.kind === 'stanza')
      .flatMap((b) => b.lines || [])
      .filter((ln) => ln.role === 'refrain')
    expect(refrainLines.length).toBeGreaterThanOrEqual(3)
    expect(result.pass).toBe(true)
  })

  it('backward compatible — no ref/denylist arguments preserve threshold behavior', () => {
    const result = buildPsalterStanzasRich({ stanzas: PSALM_150_STANZAS })
    expect(result.refrains.size).toBeGreaterThanOrEqual(1)
    expect(result.pass).toBe(true)
  })
})
