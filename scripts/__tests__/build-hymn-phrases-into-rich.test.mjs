/**
 * Unit tests for `scripts/build-hymn-phrases-into-rich.mjs`
 * (F-X3 Phase A pilot — task #249, b2 strict — task #291).
 *
 * The builder applies method (a2): phrase boundaries are detected from
 * sentence terminators (`. ! ? …`) and "Дахилт"-prefix refrain markers
 * inside `hymnRich.blocks` of `src/data/loth/prayers/hymns/{N}.rich.json`.
 *
 * Method (b2 strict, task #291) extends the empty-phrases fallback path
 * with two strict gates that emit per-line phrases when the stanza is
 * parallel-epithet or a numbered uniform list. flowing-prose stanzas
 * still take the (a2) single-covering fallback.
 *
 * Coverage:
 *   - terminator boundary closes a phrase at the line that owns the `.`/`!`/`?`
 *   - lone "Дахилт:" rubric line attaches to the next phrase (does NOT split)
 *   - first-line "Дахилт N:" propagates `role:'refrain'` to every phrase
 *   - all-text-no-terminator stanza falls back to a single covering phrase
 *   - injection is idempotent (re-running yields the same output)
 *   - injection preserves dividers + non-stanza blocks unchanged
 *   - b2 Layer 1 (parallel-epithet detect) — 3-codepoint-prefix repeat ≥3 + ≥40%
 *   - b2 Layer 2 (numbered+uniform) — `\d+\.` opener + length CV<0.4 + no-short-tail
 *   - b2 negative — flowing-prose hymn 21 shape + numbered high-CV + numbered short-tail
 *   - decision tagging round-trip (a2_terminator / a2_refrain / a2_fallback / b2_*)
 *   - `--dry-run` flag does not write files (CLI behavioral contract)
 */
// @fr FR-161

import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  planStanzaPhrases,
  planStanzaPhrasesWithDecision,
  detectB2Strict,
  injectPhrasesIntoHymnRich,
} from '../build-hymn-phrases-into-rich.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BUILDER = resolve(HERE, '..', 'build-hymn-phrases-into-rich.mjs')

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

  // R3 (review #257) — explicit assertions for `Дахилт N:` numbered variants
  // already covered by REFRAIN_PREFIX_RE (`/Дахилт(\s*\d+)?\s*:/`) but lacking
  // direct tests. Without these, a regex change could silently regress refrain
  // detection on hymns 35, 76, etc. that use `Дахилт 2:` / `Дахилт 3:` openers.
  it('propagates `role:refrain` when first line opens with "Дахилт 2:" (numbered)', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт 2: Алдарт Эзэн дахин ирээд'),
      line('Бидэнд хайр өршөөл хайрла.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 1], indent: 0, role: 'refrain' },
    ])
  })

  it('propagates `role:refrain` when first line opens with "Дахилт 3:" (numbered)', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт 3: Аврагч маань ирэв.'),
      line('Магтан дуулъя.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
      { lineRange: [1, 1], indent: 0, role: 'refrain' },
    ])
  })

  // R3 — no-space variant `Дахилт:<text>` (corpus has 1 instance: hymn body
  // line "Дахилт:Үнэн итгэл хай"). Regex tolerates `\s*` so it matches; this
  // test pins behavior so a future tightening doesn't silently drop it.
  it('propagates `role:refrain` when "Дахилт:" has no space after the colon', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт:Үнэн итгэл хай'),
      line('Эзэндээ найдъя.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 1], indent: 0, role: 'refrain' },
    ])
  })

  // R1 (review #257) — refrain prefix family extended to cover congregational
  // response ("Нийтээр:" — hymn 1 block[2], hymns 44/95/114/115) and
  // alternate refrain ("Эсвэл:" — hymns 49/50/106; "Эсвэл нийтээр:" —
  // hymns 114/115). All three propagate `role:'refrain'` to every phrase
  // in the stanza.
  it('propagates `role:refrain` when first line opens with "Нийтээр:" (congregational response)', () => {
    const phrases = planStanzaPhrases([
      line('Нийтээр: Нялх хүүхдийн туйлын хайртай хаан,'),
    ])
    // Single-line stanza ending with comma → one covering phrase + refrain role.
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
    ])
  })

  it('propagates `role:refrain` when first line opens with "Эсвэл:" (alternate refrain)', () => {
    const phrases = planStanzaPhrases([
      line('Эсвэл: Аж сайхан төрүүлж'),
      line('Аврагчаа магтан дуулъя.'),
    ])
    expect(phrases).toEqual([
      { lineRange: [0, 1], indent: 0, role: 'refrain' },
    ])
  })

  it('propagates `role:refrain` when first line opens with "Эсвэл нийтээр:" (composite alternate)', () => {
    const phrases = planStanzaPhrases([
      line('Эсвэл нийтээр: Аллэлуяа, Аллэлуяа, Аллэлуяа!'),
    ])
    // Trailing `!` closes the phrase at line 0.
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
    ])
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

// ─── b2 strict heuristic — task #291 ────────────────────────────────────────
//
// Method (b2) extends the empty-phrases fallback path with two strict
// gates that emit per-line phrases when the stanza is parallel-epithet
// or a numbered uniform list. flowing-prose stanzas (hymn 21 shape)
// must still take the (a2) single-covering fallback. These tests pin
// the gate semantics so a future tuning round can't silently drift.

describe('detectB2Strict — Layer 1 (parallel-epithet detect)', () => {
  it('activates Layer 1 when 3 lines share the same 3-codepoint prefix at ≥40%', () => {
    // hymn 49 block 2 — "Маш" × 3/4 = 75%
    const lines = [
      line('1. Маш сайхан цэвэр'),
      line('Маш бат журамт'),
      line('Маш түвшин хичээлт'),
      line('Маш үнэн шударгуу'),
    ]
    const r = detectB2Strict(lines)
    expect(r).not.toBeNull()
    expect(r.layer).toBe(1)
    expect(r.reason).toMatch(/parallel-epithet/)
    expect(r.reason).toMatch(/Маш/)
  })

  it('activates Layer 1 on hymn 90-style 11/16 "Та" repetition', () => {
    const lines = [
      line('Та миний дорой байх үед хүч'),
      line('Та миний шаналах үед хайр'),
      line('Та миний баяртай үед итгэл'),
      line('Та миний мөргөл санаа'),
      line('Та хэдийгээр битгий'),
      line('Танд хайртай байна'),
      line('Та цаг үргэлж амгалан'),
      line('Та хэдийнээ ивээгээч'),
      line('Татан буулгаж'),
      line('Та хэдийнээ намайг'),
      line('Та хэдийнээ багшилж'),
      line('Бид Танд итгэе'),
      line('Бид магтан дуулъя'),
      line('Бид Тандаа найдъя'),
      line('Бид Танаас өргөе'),
      line('Бид Танд бүгд бид'),
    ]
    const r = detectB2Strict(lines)
    expect(r).not.toBeNull()
    expect(r.layer).toBe(1)
    expect(r.reason).toMatch(/Та /)
  })

  it('does NOT activate Layer 1 on flowing-prose hymn 21 shape (max prefix repeats <3)', () => {
    // PDF hymn 21 block 0 verbatim — wrap continuations break prefix
    // repetition. Layer 1 must NOT fire. Layer 2 numbered opener also
    // absent. → null.
    const lines = [
      line('Баярлан магтан хүндэтгэцгээе сүр жавхлантай'),
      line('Их Эзэнийг'),
      line('Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг'),
      line('мэт'),
      line('Гэм ба зовлонг оргүй арилгаж эргэлзэх зүйлийг'),
      line('сарниулаад'),
      line('Гэрлээ бидэнд тусган өглөө хувиршгүй Их Эзэн'),
      line('Газар тэнгэрийн хамаг бүхэн Эзэний чадлыг'),
      line('илэрхийлж'),
      line('Гараг одод элч нарын дуу тасралтгүйгээр'),
      line('цуурайтна'),
    ]
    expect(detectB2Strict(lines)).toBeNull()
  })

  it('does NOT activate Layer 1 on a 2-line stanza (lines<3 → too small)', () => {
    expect(
      detectB2Strict([line('Эзэн минь'), line('Эзэн өршөөж байна')]),
    ).toBeNull()
  })
})

describe('detectB2Strict — Layer 2 (numbered+uniform)', () => {
  it('activates Layer 2 on 1./2./3. opener with low CV + no-short-tail', () => {
    // length CV < 0.4, last/mean ≥ 0.8 → both conditions met.
    const lines = [
      line('1. Эзэн миний Эзэн'),
      line('Бидний хайр'),
      line('Аврагч маань'),
      line('Магтан дуулъя'),
    ]
    const r = detectB2Strict(lines)
    if (r) expect(r.layer).toBe(2)
    // Either fires Layer 1 (if same prefix dominates) or Layer 2.
    // The relevant assertion: detectB2Strict should NOT return null.
    expect(r).not.toBeNull()
  })

  it('does NOT activate Layer 2 when length CV ≥ 0.4 (high variance)', () => {
    // Mix of short + long lines → CV high → Layer 2 rejected.
    // First line numbered to hit Layer 2 entry; prefixes diverse
    // enough to stay below Layer 1.
    const lines = [
      line('1. Аа'),
      line('Бид Тандаа найдан амьдарч ирлээ нөхрөө дайгаар'),
      line('Жаахан'),
      line('Хайр өршөөл хайрлаж бүхнийг өргөе'),
    ]
    expect(detectB2Strict(lines)).toBeNull()
  })

  it('does NOT activate Layer 2 when last line is a short tail (<80% mean)', () => {
    // Numbered opener + low CV among first 3 lines, but trailing
    // short-tail line drops the no-short-tail gate.
    const lines = [
      line('1. Эзэн минь Тандаа найдъя'),
      line('Бидний дотор оршигч хайрлагч'),
      line('Аврагч хүчирхэг ивээгч'),
      line('амэн'),
    ]
    expect(detectB2Strict(lines)).toBeNull()
  })

  it('does NOT activate Layer 2 without numbered opener even if uniform', () => {
    // Three roughly-equal-length non-numbered lines — Layer 2
    // requires the explicit `\d+\.` opener, so detectB2Strict
    // returns null. (Layer 1 also fails because prefixes differ.)
    const lines = [
      line('Эзэний хайр оршино'),
      line('Бидний дотор амьдран'),
      line('Аврагч маань ирэх'),
    ]
    expect(detectB2Strict(lines)).toBeNull()
  })
})

describe('planStanzaPhrasesWithDecision — b2 emits per-line phrases', () => {
  it('parallel-epithet stanza emits one phrase per line (Layer 1)', () => {
    const lines = [
      line('1. Маш сайхан цэвэр'),
      line('Маш бат журамт'),
      line('Маш түвшин хичээлт'),
      line('Маш үнэн шударгуу'),
    ]
    const { phrases, decision } = planStanzaPhrasesWithDecision(lines)
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
      { lineRange: [3, 3], indent: 0 },
    ])
    expect(decision.kind).toBe('b2_layer1')
    expect(decision.reason).toMatch(/parallel-epithet/)
  })

  it('flowing-prose stanza falls back to a2 single covering phrase', () => {
    // hymn 21 block 0 trimmed — Layer 1/2 both reject → a2_fallback.
    const lines = [
      line('Баярлан магтан хүндэтгэцгээе сүр жавхлантай'),
      line('Их Эзэнийг'),
      line('Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг'),
      line('мэт'),
      line('Гэм ба зовлонг оргүй арилгаж эргэлзэх зүйлийг'),
      line('сарниулаад'),
    ]
    const { phrases, decision } = planStanzaPhrasesWithDecision(lines)
    expect(phrases).toEqual([{ lineRange: [0, 5], indent: 0 }])
    expect(decision.kind).toBe('a2_fallback')
  })

  it('terminator-driven stanza tags decision a2_terminator (no b2 entry)', () => {
    const lines = [
      line('Магтан дуулъя!'),
      line('Бид Тандаа найдъя.'),
    ]
    const { phrases, decision } = planStanzaPhrasesWithDecision(lines)
    expect(phrases.length).toBe(2)
    expect(decision.kind).toBe('a2_terminator')
  })

  it('refrain stanza tags decision a2_refrain even when b2 pattern would match', () => {
    // Refrain wins regardless of inner shape — preserves existing
    // (a2) refrain semantics. Inner lines repeat "Маш" which would
    // otherwise activate Layer 1.
    const lines = [
      line('Дахилт: Маш сайхан'),
      line('Маш бат'),
      line('Маш түвшин'),
    ]
    const { decision } = planStanzaPhrasesWithDecision(lines)
    expect(decision.kind).toBe('a2_refrain')
  })

  it('refrain + b2 split: per-line phrases all carry role:refrain', () => {
    // Refrain opener that ALSO matches b2 layer 1 — opener with
    // "Дахилт:" body, then 3 "Маш" lines. The split is per-line
    // (b2 fires) AND every emitted phrase carries role:'refrain'.
    const lines = [
      line('Дахилт: Маш сайхан'),
      line('Маш бат журамт'),
      line('Маш түвшин хичээлт'),
      line('Маш үнэн шударгуу'),
    ]
    const { phrases, decision } = planStanzaPhrasesWithDecision(lines)
    expect(decision.kind).toBe('a2_refrain')
    // refrain absorbs the decision tag, but b2 split is preserved
    // when the inner shape qualifies.
    for (const p of phrases) expect(p.role).toBe('refrain')
  })
})

describe('planStanzaPhrases — regression (a2 path byte-identical)', () => {
  it('preserves the legacy a2 phrase shape on terminator-only stanzas', () => {
    // The (a2) path output must be unchanged from the pre-#291
    // builder. A stanza with one terminator → 1 phrase covering all
    // lines from open to terminator.
    const phrases = planStanzaPhrases([
      line('Эзэн өршөөж байна'),
      line('Бид Тандаа найдъя.'),
    ])
    expect(phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])
  })

  it('preserves the legacy a2 lone-Дахилт + refrain semantics', () => {
    const phrases = planStanzaPhrases([
      line('Дахилт:'),
      line('Алдарт Эзэн Тандаа бид ариун бүхнээ зориулая'),
      line('Аврагч Эзэн Тандаа бид амьдралаа өргөе'),
    ])
    // No terminator; lone-Дахилт rubric attaches to the stanza body.
    // Layer 1 prefixes "Алд", "Авр" different → no b2 → fallback +
    // refrain role propagation.
    expect(phrases).toEqual([
      { lineRange: [0, 2], indent: 0, role: 'refrain' },
    ])
  })
})

describe('CLI --dry-run + --decisions (no file write)', () => {
  it('runs without writing files; reports decision tally', () => {
    // Build a minimal hymn fixture, run the CLI in --dry-run, then
    // assert the file content is byte-identical to the seed input.
    const tmp = mkdtempSync(join(tmpdir(), 'hymn-b2-cli-'))
    try {
      const seed = {
        hymnRich: {
          blocks: [
            {
              kind: 'stanza',
              lines: [
                { spans: [{ kind: 'text', text: '1. Маш сайхан цэвэр' }], indent: 0 },
                { spans: [{ kind: 'text', text: 'Маш бат журамт' }], indent: 0 },
                { spans: [{ kind: 'text', text: 'Маш түвшин хичээлт' }], indent: 0 },
                { spans: [{ kind: 'text', text: 'Маш үнэн шударгуу' }], indent: 0 },
              ],
            },
          ],
          page: 999,
        },
      }
      const seedJson = JSON.stringify(seed, null, 2) + '\n'
      const filePath = join(tmp, '999.rich.json')
      writeFileSync(filePath, seedJson, 'utf-8')
      const out = execFileSync(
        process.execPath,
        [BUILDER, '--ids', '999', '--hymn-dir', tmp, '--dry-run', '--decisions'],
        { encoding: 'utf-8' },
      )
      // File must be unchanged (dry-run = no write).
      const after = readFileSync(filePath, 'utf-8')
      expect(after).toBe(seedJson)
      // Decision summary line + JSON line for the b2_layer1 hit.
      expect(out).toMatch(/decisions — total_hymn=1/)
      expect(out).toMatch(/b2_layer1=1/)
      expect(out).toMatch(/"decision":"b2_layer1"/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
