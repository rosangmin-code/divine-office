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
  splitMagtuuPhrasesOnCapitalBoundaries,
  mergeLowercaseWraps,
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

// ─── F-X8 (#300) — Магтуу 줄바꿈 규칙 (capital=verse, lower=wrap) ────────────
//
// Pass A (`splitMagtuuPhrasesOnCapitalBoundaries`) and Pass B
// (`mergeLowercaseWraps`) together implement the user spec:
//   - capital line → new verse boundary
//   - lowercase line → wrap continuation, attach to prior verse
//   - no indent (rendering side; data side keeps indent: 0)
// These tests pin Pass A intra-phrase split, Pass B cross-phrase merge,
// and the integration cases (refrain role propagation, idempotency).
// @fr FR-161

describe('splitMagtuuPhrasesOnCapitalBoundaries — Pass A intra-phrase split', () => {
  it('splits a single covering phrase at every capital-line boundary', () => {
    // Hymn 12 b0 shape — 13 capital lines, all in one a2_fallback phrase.
    const lines = [
      line('Аниргүй шөнө Ариун шөнө'),
      line('Амгалан дэлхий нойрсож байна'),
      line('Энхрий жаахан хүү минь ээ'),
    ]
    const planned = [{ lineRange: [0, 2], indent: 0 }]
    const { phrases, splitCount } = splitMagtuuPhrasesOnCapitalBoundaries(lines, planned)
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
    expect(splitCount).toBe(2) // 3 sub-phrases means 2 new boundaries
  })

  it('keeps lowercase wrap line attached to the prior capital sub-phrase', () => {
    // Hymn 91 b6 shape — capital, capital, capital, capital, capital, lowercase wrap, capital, ...
    const lines = [
      line('2. Та биднийг авралд дуудсан'),
      line('Гэмээс Та чөлөөлсөн'),
      line('Танд бүх алдрыг өргөн, бүх магтаалын танд'),
      line('өргөе'), // lowercase wrap of L2
      line('Та миний агуу их Эзэн'),
    ]
    const planned = [{ lineRange: [0, 4], indent: 0 }]
    const { phrases } = splitMagtuuPhrasesOnCapitalBoundaries(lines, planned)
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 3], indent: 0 }, // wrap absorbed
      { lineRange: [4, 4], indent: 0 },
    ])
  })

  it('inherits the parent phrase role on every sub-phrase (refrain propagation)', () => {
    const lines = [
      line('Дахилт: Эзэн Бурхан'),
      line('Бид Танд итгэнэ'),
      line('Магтан дуулъя'),
    ]
    const planned = [{ lineRange: [0, 2], indent: 0, role: 'refrain' }]
    const { phrases } = splitMagtuuPhrasesOnCapitalBoundaries(lines, planned)
    expect(phrases).toEqual([
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
      { lineRange: [1, 1], indent: 0, role: 'refrain' },
      { lineRange: [2, 2], indent: 0, role: 'refrain' },
    ])
  })

  it('passes through single-line phrases unchanged (no inner boundaries possible)', () => {
    const lines = [line('Аллэлуяа.'), line('Магтан дуулъя.'), line('Эзэн Бурхан.')]
    const planned = [
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ]
    const { phrases, splitCount } = splitMagtuuPhrasesOnCapitalBoundaries(lines, planned)
    expect(phrases).toEqual(planned)
    expect(splitCount).toBe(0)
  })

  it('is idempotent — re-splitting already-split phrases yields the same shape', () => {
    const lines = [
      line('Эхний бадаг'),
      line('хоёр дахь мөр'), // lowercase wrap
      line('Гурав дахь бадаг'),
    ]
    const once = splitMagtuuPhrasesOnCapitalBoundaries(lines, [{ lineRange: [0, 2], indent: 0 }])
    const twice = splitMagtuuPhrasesOnCapitalBoundaries(lines, once.phrases)
    expect(twice.phrases).toEqual(once.phrases)
    expect(twice.splitCount).toBe(0)
  })

  it('does not mutate the input phrases array', () => {
    const planned = [{ lineRange: [0, 2], indent: 0 }]
    const snapshot = JSON.stringify(planned)
    splitMagtuuPhrasesOnCapitalBoundaries(
      [line('А'), line('Б'), line('в')],
      planned,
    )
    expect(JSON.stringify(planned)).toBe(snapshot)
  })
})

describe('mergeLowercaseWraps — Pass B cross-phrase wrap absorption', () => {
  it('merges a lowercase-opening phrase into the prior capital phrase', () => {
    // Hymn 11 b0 shape (b2_layer1) — per-line phrases planned, line 8 wraps.
    const lines = [
      line('Халуун хайр халуун хайр халуун хайрыг'),
      line('чамд өгье'), // lowercase wrap of line 0
      line('Баяр баясгаланг'),
    ]
    const planned = [
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ]
    const { phrases, mergedCount } = mergeLowercaseWraps(lines, planned)
    expect(phrases).toEqual([
      { lineRange: [0, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
    expect(mergedCount).toBe(1)
  })

  it('preserves the prior phrase role/indent through the merge', () => {
    const lines = [line('Эзэн Бурхан'), line('бидний хайр')]
    const planned = [
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
      { lineRange: [1, 1], indent: 0 },
    ]
    const { phrases } = mergeLowercaseWraps(lines, planned)
    expect(phrases).toEqual([{ lineRange: [0, 1], indent: 0, role: 'refrain' }])
  })

  it('leaves a leading lowercase phrase untouched (no prior phrase to merge into)', () => {
    // Edge case — hymn 1 b4 / hymn 44 b4 cross-stanza wrap shape.
    const lines = [line('бидний хаан'), line('Магтан дуулъя.')]
    const planned = [
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ]
    const { phrases, mergedCount } = mergeLowercaseWraps(lines, planned)
    expect(phrases).toEqual(planned)
    expect(mergedCount).toBe(0)
  })

  it('is idempotent — re-merging already-merged phrases yields the same list', () => {
    const lines = [line('Капитал'), line('lowercase wrap'), line('Шинэ бадаг')]
    const planned = [
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ]
    const once = mergeLowercaseWraps(lines, planned)
    const twice = mergeLowercaseWraps(lines, once.phrases)
    expect(twice.phrases).toEqual(once.phrases)
    expect(twice.mergedCount).toBe(0)
  })

  it('returns a single-phrase input untouched', () => {
    const lines = [line('Эхэн'), line('хоёр')]
    const planned = [{ lineRange: [0, 1], indent: 0 }]
    const { phrases, mergedCount } = mergeLowercaseWraps(lines, planned)
    expect(phrases).toEqual(planned)
    expect(mergedCount).toBe(0)
  })

  it('does not mutate the input phrases array', () => {
    const planned = [
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ]
    const snapshot = JSON.stringify(planned)
    mergeLowercaseWraps([line('Эзэн'), line('бид')], planned)
    expect(JSON.stringify(planned)).toBe(snapshot)
  })
})

describe('injectPhrasesIntoHymnRich — F-X8 integration (split + merge)', () => {
  it('splits a 13-line capital-only stanza into per-verse phrases (hymn 12 b0 shape)', () => {
    const hymnRich = {
      blocks: [
        stanza(
          'Аниргүй шөнө Ариун шөнө',
          'Амгалан дэлхий нойрсож байна',
          'Энхрий жаахан хүү минь ээ',
          'Энх амрыг чи өгнө',
        ),
      ],
    }
    const r = injectPhrasesIntoHymnRich(hymnRich)
    expect(r.ok).toBe(true)
    expect(r.data.blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
      { lineRange: [3, 3], indent: 0 },
    ])
    // Telemetry — Pass A fired (4 sub-phrases from 1 input → 3 new boundaries).
    expect(r.decisions[0].splitFired).toBe(3)
    expect(r.decisions[0].wrapMerged).toBe(0)
  })

  it('absorbs a lowercase wrap line within an a2_fallback covering phrase (hymn 91 b6 shape)', () => {
    const hymnRich = {
      blocks: [
        stanza(
          'Танд бүх алдрыг өргөн, бүх магтаалын танд',
          'өргөе', // lowercase wrap of line 0
          'Та миний агуу их Эзэн',
        ),
      ],
    }
    const r = injectPhrasesIntoHymnRich(hymnRich)
    expect(r.ok).toBe(true)
    expect(r.data.blocks[0].phrases).toEqual([
      { lineRange: [0, 1], indent: 0 }, // wrap absorbed
      { lineRange: [2, 2], indent: 0 },
    ])
  })

  it('preserves refrain role across capital-line splits within a refrain stanza', () => {
    const hymnRich = {
      blocks: [
        stanza(
          'Дахилт: Эзэн Бурхан',
          'Бид Танд итгэнэ',
          'Магтан дуулъя',
        ),
      ],
    }
    const r = injectPhrasesIntoHymnRich(hymnRich)
    expect(r.ok).toBe(true)
    // refrain prefix opens the stanza → planner emits one [0,2] phrase
    // with role:refrain; F-X8 split breaks it into 3 sub-phrases that
    // each retain the refrain role.
    expect(r.data.blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0, role: 'refrain' },
      { lineRange: [1, 1], indent: 0, role: 'refrain' },
      { lineRange: [2, 2], indent: 0, role: 'refrain' },
    ])
  })

  it('is byte-identical on second invocation (split + merge are idempotent)', () => {
    const hymnRich = {
      blocks: [
        stanza(
          'Халуун хайрыг чамд өгье',
          'Энэ дэлхийн өгч чадахгүй',
          'Халуун хайр халуун хайр халуун хайрыг',
          'чамд өгье',
        ),
      ],
    }
    const first = injectPhrasesIntoHymnRich(hymnRich)
    const second = injectPhrasesIntoHymnRich(first.data)
    expect(second.ok).toBe(true)
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data))
  })
})
