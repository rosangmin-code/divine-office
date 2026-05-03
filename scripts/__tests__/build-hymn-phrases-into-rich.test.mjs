/**
 * Unit tests for `scripts/build-hymn-phrases-into-rich.mjs`
 * (F-X3 Phase A pilot — task #249).
 *
 * The builder applies method (a2): phrase boundaries are detected from
 * sentence terminators (`. ! ? …`) and "Дахилт"-prefix refrain markers
 * inside `hymnRich.blocks` of `src/data/loth/prayers/hymns/{N}.rich.json`.
 *
 * Coverage:
 *   - terminator boundary closes a phrase at the line that owns the `.`/`!`/`?`
 *   - lone "Дахилт:" rubric line attaches to the next phrase (does NOT split)
 *   - first-line "Дахилт N:" propagates `role:'refrain'` to every phrase
 *   - all-text-no-terminator stanza falls back to a single covering phrase
 *   - injection is idempotent (re-running yields the same output)
 *   - injection preserves dividers + non-stanza blocks unchanged
 */
// @fr FR-161

import { describe, it, expect } from 'vitest'
import {
  planStanzaPhrases,
  injectPhrasesIntoHymnRich,
} from '../build-hymn-phrases-into-rich.mjs'

function line(text) {
  return { spans: [{ kind: 'text', text }], indent: 0 }
}
function stanza(...texts) {
  return { kind: 'stanza', lines: texts.map(line) }
}

describe('planStanzaPhrases — terminator detection', () => {
  it('closes a phrase at a line ending with `.`', () => {
    const phrases = planStanzaPhrases([line('Эзэн өршөөж байна'), line('Бид Тандаа найдъя.')])
    expect(phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])
  })

  it('emits separate phrases when multiple terminators appear in one stanza', () => {
    const phrases = planStanzaPhrases([
      line('Магтан дуулъя!'),
      line('Тэнгэрт байгаа Эзэн ээ?'),
      line('Бид Тандаа итгэнэ.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
  })

  it('falls back to one covering phrase when the stanza has no terminators', () => {
    const phrases = planStanzaPhrases([
      line('Энэ дэлхийн өгч чадахгүй'),
      line('Энэ дэлхийн ухаарч чадахгүй'),
      line('Амар тайвныг чамд өгье'),
    ])
    expect(phrases).toEqual([{ lineRange: [0, 2], indent: 0 }])
  })

  it('respects a tail without terminator after a closed phrase', () => {
    const phrases = planStanzaPhrases([
      line('Эхэнд Эзэн.'),
      line('Дараа нь дотор'),
      line('Гадна нь үргэлж'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 2], indent: 0 },
    ])
  })
})

describe('planStanzaPhrases — refrain detection', () => {
  it('propagates `role:refrain` to every phrase when first line opens with "Дахилт N:"', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт 1: Мөнх галаас биднийг'),
      line('Магад гарган авахаар'),
      line('Маныг аврах гэсэн юм.'),
      line('Маныг аврах гэсэн юм.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 2], indent: 0, role: 'refrain' },
      { lineRange: [3, 3], indent: 0, role: 'refrain' },
    ])
  })

  it('treats a lone "Дахилт:" rubric line as part of the next phrase, not a splitter', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт:'),
      line('Алдарт Эзэн Тандаа бид ариун бүхнээ зориулая'),
      line('Аврагч Эзэн Тандаа бид амьдралаа өргөе'),
    ])
    // No terminator anywhere → one covering phrase, refrain role.
    expect(phrases).toEqual([
      { lineRange: [0, 2], indent: 0, role: 'refrain' },
    ])
  })

  it('does NOT mark refrain when the first line is a verse number opener', () => {
    const phrases = planStanzaPhrases([
      line('1. Есүс бол миний найз'),
      line('Жинхэнэ хувиршгүй анд'),
    ])
    expect(phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])
  })
})

describe('injectPhrasesIntoHymnRich — block-level integration', () => {
  it('preserves dividers and writes phrases only on stanza blocks', () => {
    const hymnRich = {
      blocks: [
        stanza('Эзэний нэр.', 'Магтагдтугай.'),
        { kind: 'divider' },
        stanza('Аллэлуяа.'),
      ],
      page: 999,
    }
    const r = injectPhrasesIntoHymnRich(hymnRich)
    expect(r.ok).toBe(true)
    expect(r.data.blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ])
    expect(r.data.blocks[1]).toEqual({ kind: 'divider' })
    expect(r.data.blocks[2].phrases).toEqual([{ lineRange: [0, 0], indent: 0 }])
    // page survives untouched.
    expect(r.data.page).toBe(999)
  })

  it('is idempotent — re-injecting on already-annotated data yields identical phrases', () => {
    const hymnRich = { blocks: [stanza('Эхлэл.', 'Үргэлжлэл.')] }
    const first = injectPhrasesIntoHymnRich(hymnRich)
    const second = injectPhrasesIntoHymnRich(first.data)
    expect(second.ok).toBe(true)
    expect(second.data.blocks[0].phrases).toEqual(first.data.blocks[0].phrases)
  })

  it('reports an error for malformed input (no blocks array)', () => {
    expect(injectPhrasesIntoHymnRich(null).ok).toBe(false)
    expect(injectPhrasesIntoHymnRich({}).ok).toBe(false)
    expect(injectPhrasesIntoHymnRich({ blocks: 'oops' }).ok).toBe(false)
  })
})
