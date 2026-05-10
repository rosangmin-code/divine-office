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
import { parseArgs } from '../process-fx11-phase2-batch.mjs'

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
