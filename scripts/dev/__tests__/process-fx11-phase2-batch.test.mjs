/**
 * Integration tests for the F-X11 Phase 2-B batch processor
 * (`scripts/dev/process-fx11-phase2-batch.mjs`).
 *
 * The batch processor is a CLI entry-point with no exported pure functions
 * to unit-test in isolation; its core matcher path runs through
 * `scripts/build-phrases-into-rich.mjs`'s `injectPhrasesIntoRichData` (the
 * SAME entry point the production CLI uses). These tests therefore pin
 * the **integration contract** — the BATCH SHAPE that `processOne` builds
 * (`{ ref, stanzas: extractorStanzas }`) must successfully traverse the
 * wrap-tolerant matcher (#452) and surface PASS where pre-#452 it
 * surfaced LINE_COUNT_MISMATCH due to cross-column wrap.
 *
 * F-X11 WI-A2 (#452) — root cause: `splitIntoStanzas` (the live extractor
 * column-aware path) emits a logical line as 2 stream rows when pdftotext
 * sees a column-break wrap. rich.json carries the JOINED line. Pre-#452
 * the matcher's 12-char prefix tolerance silently mis-aligned — the fix
 * absorbs lowercase-leading wrap continuations into the previous logical
 * line so the joined rich line matches.
 *
 * Tests below construct the same `(richData, batches)` shape that
 * `process-fx11-phase2-batch.mjs:processOne` builds and verify:
 *
 *   1. PRODUCTION-SHAPE PASS — Psalm 30:2-13 b1 from the audit-2026-05-09
 *      §3 WI-E small-drift residual list. Pre-#452 verdict =
 *      DRIFT_LINE_COUNT (gap=1); post-#452 = PASS.
 *   2. NO REGRESSION — a clean 1-1 alignment ref still PASSes (the bridge
 *      doesn't false-fire on non-wrap shapes).
 *   3. ATOMIC GATE PROPAGATION — even one DRIFT ref blocks the batch
 *      (the wrap-fix doesn't change atomicity guarantees).
 */

import { describe, it, expect } from 'vitest'
import { injectPhrasesIntoRichData } from '../../build-phrases-into-rich.mjs'
import {
  parseArgs,
  processOne,
  shouldEscalateDepth,
} from '../process-fx11-phase2-batch.mjs'

// Helper to build a minimal rich-AST stanza block (mirrors the helper in
// `scripts/__tests__/build-phrases-into-rich.test.mjs` to keep the
// integration tests self-contained).
function richStanzaBlock(firstLineText, additionalLineTexts = []) {
  return {
    kind: 'stanza',
    lines: [firstLineText, ...additionalLineTexts].map((text) => ({
      spans: [{ kind: 'text', text }],
      indent: 0,
    })),
  }
}

function richRef(blocks) {
  return { stanzasRich: { blocks } }
}

// @fr FR-161
describe('process-fx11-phase2-batch — integration with wrap-tolerant matcher (#452)', () => {
  // ── Production-shape regression (Psalm 30:2-13 b1) ───────────────────
  // The exact stream/rich line counts that produced gap=1 (audit §3 WI-E).
  // The BATCH SHAPE is what processOne builds: {ref, stanzas:[...]} from
  // the multi-page gather (here the relevant stanza is hand-constructed).
  it('Psalm 30:2-13 b1 batch passes the atomic gate post-#452', () => {
    const richData = {
      'Psalm 30:2-13': richRef([
        // Block 0 — single-line antiphon (matches stream 1-1).
        richStanzaBlock('ЭЗЭН, Та намайг дээшээ өргөж,'),
        // Block 1 — the 6-line subset that contains the wrap.
        // Pre-#452 production-shape: line 3 is the JOINED wrap. Pre-fix
        // verdict = DRIFT_LINE_COUNT.
        richStanzaBlock('Миний дайснуудыг надаас болж', [
          'Баярлуулаагүй учраас',
          'Би Таныг өргөмжилнө.',
          'Та Өөрийн нүүр царайг нуусанд би сэтгэл зовж байв.',
          'ЭЗЭН, Тан руу би хашхирч,',
          'ЭЗЭНд би гуйлтыг өргөсөн.–',
        ]),
      ]),
    }
    // The extractor-shape input that processOne forwards to
    // injectPhrasesIntoRichData. The wrap-line is split into stream rows
    // 4 & 5 (column-break artefact); everything else is 1-1.
    const batches = [
      {
        ref: 'Psalm 30:2-13',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['ЭЗЭН, Та намайг дээшээ өргөж,'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
          },
          {
            stanzaIndex: 1,
            lines: [
              'Миний дайснуудыг надаас болж',
              'Баярлуулаагүй учраас',
              'Би Таныг өргөмжилнө.',
              'Та Өөрийн нүүр царайг нуусанд', // wrap A
              'би сэтгэл зовж байв.', //          wrap B (bridged)
              'ЭЗЭН, Тан руу би хашхирч,',
              'ЭЗЭНд би гуйлтыг өргөсөн.–',
            ],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
              { lineRange: [2, 2], indent: 0 },
              { lineRange: [3, 4], indent: 0 }, // crosses wrap
              { lineRange: [5, 5], indent: 0 },
              { lineRange: [6, 6], indent: 0 },
            ],
          },
        ],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(true)
    expect(result.issues).toBeUndefined()
    // The wrap-bridged phrase collapses to a single rich-line phrase.
    const blocks = result.data['Psalm 30:2-13'].stanzasRich.blocks
    expect(blocks[1].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
      { lineRange: [3, 3], indent: 0 }, // collapsed bridge
      { lineRange: [4, 4], indent: 0 },
      { lineRange: [5, 5], indent: 0 },
    ])
  })

  // ── Regression guard: clean 1-1 batch unchanged by the wrap-fix ──────
  // The bridge code path adds NO behaviour to refs whose lines align 1-1
  // with the stream. This guard asserts the wrap-fix doesn't false-fire
  // on the common shape (≥ 95% of refs in the production batch).
  it('clean 1-1 batch still PASSes without bridging (regression guard)', () => {
    const richData = {
      'Clean Ref': richRef([
        richStanzaBlock('Эхний мөр', ['Хоёр дахь', 'Гурав дахь']),
      ]),
    }
    const batches = [
      {
        ref: 'Clean Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Эхний мөр', 'Хоёр дахь', 'Гурав дахь'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
              { lineRange: [2, 2], indent: 0 },
            ],
          },
        ],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(true)
    const blocks = result.data['Clean Ref'].stanzasRich.blocks
    expect(blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
  })

  // ── Atomic gate propagation (atomicity is unchanged) ──────────────────
  // A genuinely-unrecoverable ref (no bridge can fix it) still blocks the
  // whole batch — the wrap-fix doesn't relax the atomic gate.
  it('atomic gate still blocks the batch when one ref is genuinely unrecoverable', () => {
    const richData = {
      'Wrap Ref': richRef([richStanzaBlock('Гарыг минь дайтахад,')]),
      // Unrecoverable: rich first line is long enough that the 12-char
      // prefix tolerance can't accidentally accept the stream's first
      // line; the bridge can't help either because the next stream line
      // starts with capital ('Бүрэн' — proper noun start, NOT lowercase
      // wrap continuation).
      'Unrecoverable Ref': richRef([
        richStanzaBlock('Эзэн миний Эзэнд тэмцэлдсэн нэгэн өдөр'),
      ]),
    }
    const batches = [
      {
        ref: 'Wrap Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Гарыг', 'минь дайтахад,'],
            phrases: [{ lineRange: [0, 1], indent: 0 }],
          },
        ],
      },
      {
        ref: 'Unrecoverable Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            // Different content, capital next-line so bridge can't fire.
            lines: ['Огт хамаарал байхгүй', 'Бүрэн өөр текст'],
            phrases: [],
          },
        ],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    // The Wrap Ref is plannable on its own (post-#452); only the
    // Unrecoverable Ref produces an issue. Atomic gate still blocks the
    // batch — neither ref's data is mutated.
    const issuedRefs = result.issues.map((i) => i.ref)
    expect(issuedRefs).toContain('Unrecoverable Ref')
    expect(richData['Wrap Ref'].stanzasRich.blocks[0].phrases).toBeUndefined()
  })
})

// @fr FR-161
describe('process-fx11-phase2-batch — parseArgs --only fail-open fix (#474 MAJOR-1)', () => {
  // ── Positive: --only=value (equals form, NEW in #474) ────────────────
  // Pre-#474 the parser ignored `=` so `--only=Psalm 16:1-6` produced
  // args['only=Psalm 16:1-6']=true with args.only undefined → the
  // typeof guard at line 345/459 silently bypassed the allow-list and
  // ALL 124 PASS refs got re-injected (fail-open). Post-#474 the same
  // input correctly populates args.only with the ref string.
  it('--only=Psalm 16:1-6 (equals form) parses to args.only string', () => {
    const args = parseArgs(['--only=Psalm 16:1-6'])
    expect(args.only).toBe('Psalm 16:1-6')
  })

  // ── Positive: --only value (space form, pre-existing behaviour) ──────
  // Regression guard — the equals-form addition must not break the
  // already-working space-separated invocation.
  it('--only Psalm 16:1-6 (space form) parses to args.only string', () => {
    const args = parseArgs(['--only', 'Psalm 16:1-6'])
    expect(args.only).toBe('Psalm 16:1-6')
  })

  // ── Positive: --only=multi-value with the `|` separator ──────────────
  // The CLI's allow-list semantics (line 346) split on `|` to support
  // multi-ref injection batches. The equals-form must preserve the
  // pipe-separated payload verbatim — the splitter is downstream.
  it('--only=A|B|C (equals + multi-value) preserves pipe-separated payload', () => {
    const args = parseArgs(['--only=Psalm 16:1-6|Psalm 137:1-6'])
    expect(args.only).toBe('Psalm 16:1-6|Psalm 137:1-6')
  })

  // ── Negative: --only (bare) ─────────────────────────────────────────
  // Pre-#474 this fell into the `else` branch and set args.only=true
  // (boolean). The typeof guard then bypassed the allow-list →
  // unintended broad-scope re-inject. Post-#474 throws a fail-loud
  // ParseArgsError BEFORE any data mutation can begin.
  it('--only (bare, no value) throws ParseArgsError', () => {
    expect(() => parseArgs(['--only'])).toThrow(/--only requires a non-empty value/)
  })

  // ── Negative: --only "" (empty string value) ────────────────────────
  // Pre-#474 the next-arg falsiness check (`next && !next.startsWith
  // ('--')`) treated '' as missing → args.only=true. Post-#474 the
  // length check fires.
  it('--only "" (empty string value) throws ParseArgsError', () => {
    expect(() => parseArgs(['--only', ''])).toThrow(/--only requires a non-empty value/)
  })

  // ── Negative: --only --inject (next is a flag) ──────────────────────
  // Pre-#474 the `!next.startsWith('--')` branch sent --only to true
  // and then re-consumed --inject normally — silently swallowing the
  // user's intent for both flags. Post-#474 the prefix check throws
  // BEFORE --inject is touched.
  it('--only --inject (next starts with --) throws ParseArgsError', () => {
    expect(() => parseArgs(['--only', '--inject'])).toThrow(
      /--only requires a non-empty value/,
    )
  })

  // ── Regression: existing flags unaffected ───────────────────────────
  // The fail-loud path is scoped to `VALUE_REQUIRED_KEYS`; boolean and
  // optional-value flags must keep working exactly as pre-#474.
  it('existing flags (--inject, --json out.json) parse unchanged', () => {
    const a = parseArgs(['--inject'])
    expect(a.inject).toBe(true)

    const b = parseArgs(['--json', 'out.json'])
    expect(b.json).toBe('out.json')

    const c = parseArgs(['--inject', '--json', 'out.json'])
    expect(c.inject).toBe(true)
    expect(c.json).toBe('out.json')

    // --inject (bare) followed by --json (bare, no value) → both true.
    // Pre-#474 behaviour preserved because neither key is in
    // VALUE_REQUIRED_KEYS.
    const d = parseArgs(['--inject', '--json'])
    expect(d.inject).toBe(true)
    expect(d.json).toBe(true)
  })
})

// @fr FR-161
describe('process-fx11-phase2-batch — shouldEscalateDepth predicate (#481 G4)', () => {
  // ── PASS — never escalate ────────────────────────────────────────────
  it('PASS verdict → no escalation', () => {
    expect(shouldEscalateDepth({ verdict: 'PASS' }, { ok: true }, 'X')).toBe(false)
  })

  // ── DRIFT_NO_MATCH — pre-#481 already escalates (regression guard) ───
  it('DRIFT_NO_MATCH verdict → escalate (pre-#481 behaviour preserved)', () => {
    expect(
      shouldEscalateDepth(
        { verdict: 'DRIFT_NO_MATCH' },
        { ok: false, issues: [{ ref: 'X', kind: 'NO_MATCHING_EXTRACTOR_STANZA' }] },
        'X',
      ),
    ).toBe(true)
  })

  // ── INCOMPLETE_COVERAGE — pre-#481 already escalates (regression guard) ──
  it('INCOMPLETE_COVERAGE verdict → escalate (pre-#481 behaviour preserved)', () => {
    expect(
      shouldEscalateDepth(
        { verdict: 'INCOMPLETE_COVERAGE' },
        { ok: false, issues: [{ ref: 'X', error: 'INCOMPLETE_COVERAGE' }] },
        'X',
      ),
    ).toBe(true)
  })

  // ── DRIFT_LINE_COUNT under-gather (NEW post-#481) — escalate ─────────
  // The Psalm 118:1-16 b3 root cause: rich=2 ext=1 means the stanza
  // spilled past the gathered window. One more page forward could close
  // the gap, so the predicate continues.
  it('DRIFT_LINE_COUNT (ext < rich) → escalate (NEW post-#481, Psalm 118 b3 shape)', () => {
    expect(
      shouldEscalateDepth(
        { verdict: 'DRIFT_LINE_COUNT' },
        {
          ok: false,
          issues: [
            {
              ref: 'X',
              kind: 'LINE_COUNT_MISMATCH',
              richLineCount: 2,
              extractorLineCount: 1,
            },
          ],
        },
        'X',
      ),
    ).toBe(true)
  })

  // ── DRIFT_LINE_COUNT over-gather — DO NOT escalate ───────────────────
  // gatherStanzas is monotone-additive in `depth`: deeper iterations only
  // ever ADD more stream stanzas. If we already have ext > rich, deeper
  // gives even more lines — escalation cannot help.
  it('DRIFT_LINE_COUNT (ext > rich) → no escalation (over-gather guard)', () => {
    expect(
      shouldEscalateDepth(
        { verdict: 'DRIFT_LINE_COUNT' },
        {
          ok: false,
          issues: [
            {
              ref: 'X',
              kind: 'LINE_COUNT_MISMATCH',
              richLineCount: 2,
              extractorLineCount: 5,
            },
          ],
        },
        'X',
      ),
    ).toBe(false)
  })

  // ── DRIFT_LINE_COUNT exact-but-mismatch — DO NOT escalate ────────────
  // ext == rich means counts match but content doesn't — adding more
  // pages would only push us into over-gather territory.
  it('DRIFT_LINE_COUNT (ext == rich) → no escalation', () => {
    expect(
      shouldEscalateDepth(
        { verdict: 'DRIFT_LINE_COUNT' },
        {
          ok: false,
          issues: [
            {
              ref: 'X',
              kind: 'LINE_COUNT_MISMATCH',
              richLineCount: 3,
              extractorLineCount: 3,
            },
          ],
        },
        'X',
      ),
    ).toBe(false)
  })

  // ── DRIFT_LINE_COUNT with no matching ref issue → no escalation ──────
  // Defensive: if the issue list doesn't carry the expected counts (e.g.
  // a different ref's issue surfaced), default to NOT escalating rather
  // than spinning the loop on missing data.
  it('DRIFT_LINE_COUNT with missing issue counts → no escalation (defensive)', () => {
    expect(
      shouldEscalateDepth({ verdict: 'DRIFT_LINE_COUNT' }, { ok: false, issues: [] }, 'X'),
    ).toBe(false)
  })

  // ── REF_NOT_FOUND / OTHER → no escalation ────────────────────────────
  it('REF_NOT_FOUND → no escalation', () => {
    expect(shouldEscalateDepth({ verdict: 'REF_NOT_FOUND' }, { ok: false }, 'X')).toBe(
      false,
    )
  })
  it('OTHER (e.g. EMPTY_RICH_LINE) → no escalation', () => {
    expect(shouldEscalateDepth({ verdict: 'OTHER' }, { ok: false }, 'X')).toBe(false)
  })
})

// @fr FR-161
describe('process-fx11-phase2-batch — processOne depth-progression loop (#481 G4)', () => {
  // Helpers — keep test fixtures inline so the integration intent is
  // readable in one place.
  function richBlock(...texts) {
    return {
      kind: 'stanza',
      lines: texts.map((text) => ({ spans: [{ kind: 'text', text }], indent: 0 })),
    }
  }
  function extStanza(stanzaIndex, ...texts) {
    return {
      stanzaIndex,
      lines: texts,
      phrases: texts.map((_, i) => ({ lineRange: [i, i], indent: 0 })),
    }
  }

  // ── Production-shape regression: Psalm 118:1-16 b3 (#479 audit §3 CAT-T5) ──
  // The exact under-gather shape from the audit:
  //   rich = 2 lines, ext = 1 line at depth=0/1 (stanza spilled past
  //   the gathered window), depth=2 produces ext = 2 → PASS.
  //
  // Pre-#481 the loop broke at depth=0 with DRIFT_LINE_COUNT and
  // surfaced the same verdict at the end (the depth=2 success was
  // never reached). Post-#481 the loop escalates and reaches PASS.
  it('Psalm 118:1-16 b3 production-shape: depth=0/1 under-gather → depth=2 PASS', () => {
    const ref = 'Psalm 118:1-16'
    const richData = {
      [ref]: {
        stanzasRich: {
          blocks: [
            // b0 — antiphon (1 line, always matches)
            richBlock('Эзэний нэр алдраар ирэгч нь ерөөлтэй еэ!'),
            // b3 — the under-gather target (2 lines)
            richBlock('Эзэн миний хүчирхэг нөмөр болон', 'Эзэн надад аврал болсон.'),
          ],
        },
      },
    }
    const gatherCalls = []
    const gatherStub = (_pdf, _page, depth) => {
      gatherCalls.push(depth)
      if (depth < 2) {
        // Under-gather: b3 ext stanza only has the FIRST line. The
        // second line lives on the next physical page that hasn't been
        // gathered yet. Wrap-tolerant matcher (#452) cannot bridge a
        // missing line, so this surfaces LINE_COUNT_MISMATCH ext=1
        // rich=2.
        return [
          extStanza(0, 'Эзэний нэр алдраар ирэгч нь ерөөлтэй еэ!'),
          extStanza(1, 'Эзэн миний хүчирхэг нөмөр болон'),
        ]
      }
      // depth >= 2: forward-page gather captures the second line.
      return [
        extStanza(0, 'Эзэний нэр алдраар ирэгч нь ерөөлтэй еэ!'),
        extStanza(1, 'Эзэн миний хүчирхэг нөмөр болон', 'Эзэн надад аврал болсон.'),
      ]
    }
    const result = processOne(ref, 175, '/dummy/pdf', richData, {
      gatherStanzas: gatherStub,
    })
    expect(result.verdict).toBe('PASS')
    // Loop walked depths 0 → 1 → 2; first PASS hit at depth=2 broke out.
    expect(gatherCalls).toEqual([0, 1, 2])
  })

  // ── Negative: exhaust max-depth on persistent under-gather ───────────
  // A genuinely-unrecoverable under-gather must terminate at MULTI_PAGE_DEPTH
  // and surface DRIFT_LINE_COUNT (no infinite loop). The MULTI_PAGE_DEPTH
  // constant is 4 (script line 49) — the loop iterates 0..4 inclusive
  // (5 calls).
  it('persistent under-gather exhausts MULTI_PAGE_DEPTH then reports DRIFT_LINE_COUNT', () => {
    const ref = 'Persistent Under-gather Ref'
    const richData = {
      [ref]: {
        stanzasRich: {
          blocks: [richBlock('Line one', 'Line two missing forever')],
        },
      },
    }
    const gatherCalls = []
    const gatherStub = (_pdf, _page, depth) => {
      gatherCalls.push(depth)
      // Always return ext=1, rich=2 — under-gather at every depth.
      return [extStanza(0, 'Line one')]
    }
    const result = processOne(ref, 999, '/dummy/pdf', richData, {
      gatherStanzas: gatherStub,
    })
    expect(result.verdict).toBe('DRIFT_LINE_COUNT')
    // Loop walked all 5 depths (0..4 inclusive — MULTI_PAGE_DEPTH + 1).
    expect(gatherCalls).toEqual([0, 1, 2, 3, 4])
  })

  // ── Regression guard: depth=0 PASS short-circuits the loop ───────────
  // Clean refs (≥ 95% of production batch) match at depth=0; the new
  // escalation branch must NOT keep iterating past PASS.
  it('depth=0 PASS short-circuits: gather called exactly once', () => {
    const ref = 'Clean Ref'
    const richData = {
      [ref]: { stanzasRich: { blocks: [richBlock('Line A', 'Line B')] } },
    }
    const gatherCalls = []
    const gatherStub = (_pdf, _page, depth) => {
      gatherCalls.push(depth)
      return [extStanza(0, 'Line A', 'Line B')]
    }
    const result = processOne(ref, 100, '/dummy/pdf', richData, {
      gatherStanzas: gatherStub,
    })
    expect(result.verdict).toBe('PASS')
    expect(gatherCalls).toEqual([0])
  })

  // ── Regression guard: non-escalating verdict short-circuits the loop ──
  // REF_NOT_FOUND (the dispatched batch references a key absent from
  // richData) is a fundamentally unrecoverable verdict — gathering more
  // pages cannot conjure the missing rich entry. The loop must respect
  // shouldEscalateDepth's `false` and break at depth=0.
  it('REF_NOT_FOUND at depth=0 does not escalate (non-escalating verdict)', () => {
    const ref = 'Nonexistent Ref'
    const richData = {} // ref is absent — inject reports REF_NOT_FOUND
    const gatherCalls = []
    const gatherStub = (_pdf, _page, depth) => {
      gatherCalls.push(depth)
      return [extStanza(0, 'Anything')]
    }
    const result = processOne(ref, 300, '/dummy/pdf', richData, {
      gatherStanzas: gatherStub,
    })
    expect(result.verdict).toBe('REF_NOT_FOUND')
    // Loop broke at depth=0 — non-escalating verdict short-circuits.
    expect(gatherCalls).toEqual([0])
  })
})
