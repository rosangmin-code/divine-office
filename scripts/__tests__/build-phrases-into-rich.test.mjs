/**
 * Unit tests for `scripts/build-phrases-into-rich.mjs` (FR-161 R-2 builder).
 *
 * The builder takes phrase-extractor JSON (R-1 output) and injects
 * `phrases?: PhraseGroup[]` into matching `kind:'stanza'` blocks of a rich-AST
 * file (`psalter-texts.rich.json` shape). These tests exercise:
 *   - happy path: single-ref atomic inject
 *   - atomic gate: ANY ref issue → no inject (returned issues, original
 *     `richData` untouched)
 *   - idempotent: applying the same batch twice yields identical output
 *   - dry-run rendering: human-readable summary surfaces both pass + fail
 *   - line-count mismatch: extractor sees 2 wrap lines, rich.json has them
 *     pre-joined into 1 line → atomic rejection (NOT silent skip)
 *   - prefix-match tolerance: smart-quote vs straight-quote drift survives
 *
 * Test fixtures are built inline (no JSON files on disk) so the assertions
 * stay readable next to the input shape.
 */

import { describe, it, expect } from 'vitest'
import {
  injectPhrasesIntoRichData,
  planRefUpdates,
  renderDryRun,
  collectReviewQueue,
  isHeaderArtifact,
  isWrapContinuation,
} from '../build-phrases-into-rich.mjs'

// Helpers — build minimal rich-AST stanza blocks.
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
describe('planRefUpdates', () => {
  it('matches by exact first-line equality and respects line counts', () => {
    const richSlots = [
      { block: richStanzaBlock('ЭЗЭН миний Эзэнд', ['Хөлийн чинь гишгүүр']), blockIndex: 1 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['ЭЗЭН миний Эзэнд', 'Хөлийн чинь гишгүүр'],
        phrases: [{ lineRange: [0, 0], indent: 0 }, { lineRange: [1, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toEqual([
      {
        blockIndex: 1,
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
        ],
        // F-X11 (#408) — empty array when extractor stanza has no
        // `paragraphBoundaries` (this fixture has none).
        paragraphBoundaries: [],
        richFirstLine: 'ЭЗЭН миний Эзэнд',
      },
    ])
  })

  it('falls back to 12-char prefix match when typography drifts', () => {
    const richSlots = [
      { block: richStanzaBlock('“Би чиний дайснуудыг'), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['"Би чиний дайснуудыг'], // straight quote vs curly in rich
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
  })

  it('flags LINE_COUNT_MISMATCH when richBlock first line matches but later lines drift', () => {
    // rich block has 3 lines starting "Verse start"; extractor stream has
    // "Verse start" but the next line ("UNRELATED") is not what rich wants.
    const richSlots = [
      {
        block: richStanzaBlock('Verse start', ['Continuation A', 'Continuation B']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Verse start', 'UNRELATED other text'],
        phrases: [{ lineRange: [0, 0], indent: 0 }, { lineRange: [1, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.updates).toEqual([])
    expect(out.issues).toHaveLength(1)
    expect(out.issues[0]).toMatchObject({
      blockIndex: 0,
      kind: 'LINE_COUNT_MISMATCH',
      richLineCount: 3,
      extractorLineCount: 1, // only 'Verse start' matched before drift
    })
  })

  it('flags NO_MATCHING_EXTRACTOR_STANZA when the rich line is in extractor text but a later block already consumed the only window', () => {
    const richSlots = [
      { block: richStanzaBlock('Same prefix line'), blockIndex: 0 },
      { block: richStanzaBlock('Same prefix line'), blockIndex: 1 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Same prefix line'],
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Slot 0 consumes the only window; slot 1 sees the consumed-window
    // signal and reports NO_MATCHING_EXTRACTOR_STANZA.
    expect(out.updates).toHaveLength(1)
    expect(out.updates[0].blockIndex).toBe(0)
    expect(out.issues).toHaveLength(1)
    expect(out.issues[0]).toMatchObject({
      blockIndex: 1,
      kind: 'NO_MATCHING_EXTRACTOR_STANZA',
    })
  })

  it('flags NO_MATCHING_EXTRACTOR_STANZA when first line is not found', () => {
    const richSlots = [
      { block: richStanzaBlock('ЭЗЭН миний Эзэнд'), blockIndex: 0 },
    ]
    const ext = [
      { stanzaIndex: 0, lines: ['Other psalm content'], phrases: [] },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.updates).toEqual([])
    expect(out.issues[0].kind).toBe('NO_MATCHING_EXTRACTOR_STANZA')
  })

  it('successfully matches a rich block whose lines span MULTIPLE extractor mini-stanzas (Psalm 110-style join)', () => {
    // rich.json combines 2 verses into one stanza block; extractor splits
    // them on a blank into 2 stanzas. The window-based matcher must still
    // align them and translate phrase ranges to rich-relative indices.
    const richSlots = [
      {
        block: richStanzaBlock('Verse 1 line A', [
          'Verse 1 line B',
          'Verse 2 line A',
          'Verse 2 line B',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Verse 1 line A', 'Verse 1 line B'],
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      },
      {
        stanzaIndex: 1,
        lines: ['Verse 2 line A', 'Verse 2 line B'],
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Phrases translated to rich-relative indices: verse 1 spans [0,1],
    // verse 2 spans [2,3] in the rich block's combined lines array.
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 1], indent: 0 },
      { lineRange: [2, 3], indent: 0 },
    ])
  })
})

// @fr FR-161
describe('injectPhrasesIntoRichData — happy path', () => {
  it('injects phrases additively when every batch ref matches', () => {
    const richData = {
      'Psalm 110:1-5, 7': richRef([
        richStanzaBlock('ЭЗЭН миний Эзэнд', ['"Би чиний дайснуудыг']),
        richStanzaBlock('Баруун гар талд чинь Эзэн байна.'),
      ]),
    }
    const batches = [
      {
        ref: 'Psalm 110:1-5, 7',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['ЭЗЭН миний Эзэнд', '"Би чиний дайснуудыг'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
            ],
          },
          {
            stanzaIndex: 1,
            lines: ['Баруун гар талд чинь Эзэн байна.'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
          },
        ],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(true)
    const blocks = result.data['Psalm 110:1-5, 7'].stanzasRich.blocks
    expect(blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ])
    expect(blocks[1].phrases).toEqual([{ lineRange: [0, 0], indent: 0 }])
    // additive: existing lines untouched.
    expect(blocks[0].lines).toHaveLength(2)
    expect(blocks[0].lines[0].spans[0].text).toBe('ЭЗЭН миний Эзэнд')
  })
})

// @fr FR-161
describe('injectPhrasesIntoRichData — atomic gate', () => {
  it('REJECTS the entire batch when one ref has any issue', () => {
    const richData = {
      'Good Ref': richRef([richStanzaBlock('Match me')]),
      'Bad Ref': richRef([richStanzaBlock('Distinct rich text')]),
    }
    const batches = [
      {
        ref: 'Good Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Match me'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
          },
        ],
      },
      {
        ref: 'Bad Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Totally unrelated content'], // no match for 'Distinct rich text'
            phrases: [{ lineRange: [0, 0], indent: 0 }],
          },
        ],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(false)
    expect(result.issues).toBeDefined()
    expect(result.issues.length).toBeGreaterThan(0)
    // Original data MUST be untouched (no mutation).
    expect(richData['Good Ref'].stanzasRich.blocks[0].phrases).toBeUndefined()
    expect(richData['Bad Ref'].stanzasRich.blocks[0].phrases).toBeUndefined()
  })

  it('reports REF_NOT_FOUND when a batch ref is missing in richData', () => {
    const richData = { 'Existing Ref': richRef([richStanzaBlock('a')]) }
    const batches = [
      {
        ref: 'Missing Ref',
        stanzas: [{ stanzaIndex: 0, lines: ['x'], phrases: [] }],
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(false)
    expect(result.issues[0]).toMatchObject({
      ref: 'Missing Ref',
      error: 'REF_NOT_FOUND',
    })
  })

  it('reports INCOMPLETE_COVERAGE when extractor stanzas miss some rich blocks', () => {
    const richData = {
      'Two Stanzas': richRef([
        richStanzaBlock('Block A first line'),
        richStanzaBlock('Block B first line'),
      ]),
    }
    const batches = [
      {
        ref: 'Two Stanzas',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Block A first line'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
          },
        ], // Block B not covered
      },
    ]
    const result = injectPhrasesIntoRichData(richData, batches)
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.error === 'STANZA_PLAN_ISSUE')).toBe(true)
  })
})

// @fr FR-161
describe('injectPhrasesIntoRichData — idempotency', () => {
  it('produces identical output when applied twice with the same input', () => {
    const richData = {
      'Idem Ref': richRef([richStanzaBlock('Idem first', ['Idem second'])]),
    }
    const batch = {
      ref: 'Idem Ref',
      stanzas: [
        {
          stanzaIndex: 0,
          lines: ['Idem first', 'Idem second'],
          phrases: [{ lineRange: [0, 1], indent: 0 }],
        },
      ],
    }
    const first = injectPhrasesIntoRichData(richData, [batch])
    expect(first.ok).toBe(true)
    const second = injectPhrasesIntoRichData(first.data, [batch])
    expect(second.ok).toBe(true)
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data))
  })

  it('overwrites previously injected phrases when the input changes', () => {
    const richData = {
      'Update Ref': richRef([richStanzaBlock('a', ['b'])]),
    }
    const v1 = injectPhrasesIntoRichData(richData, [
      {
        ref: 'Update Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['a', 'b'],
            phrases: [{ lineRange: [0, 1], indent: 0 }],
          },
        ],
      },
    ])
    const v2 = injectPhrasesIntoRichData(v1.data, [
      {
        ref: 'Update Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['a', 'b'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
            ],
          },
        ],
      },
    ])
    expect(v2.data['Update Ref'].stanzasRich.blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
    ])
  })

  it('strips previously injected phrases when extractor now reports none', () => {
    const seeded = {
      'Strip Ref': richRef([
        { ...richStanzaBlock('only line'), phrases: [{ lineRange: [0, 0], indent: 0 }] },
      ]),
    }
    const result = injectPhrasesIntoRichData(seeded, [
      {
        ref: 'Strip Ref',
        stanzas: [{ stanzaIndex: 0, lines: ['only line'], phrases: [] }],
      },
    ])
    expect(result.ok).toBe(true)
    expect(result.data['Strip Ref'].stanzasRich.blocks[0].phrases).toBeUndefined()
  })
})

// @fr FR-161
// F-X11 (#408) — paragraphBoundaries injection. Builder must translate
// extractor-stanza-relative paragraph boundary indices into rich-block-
// relative indices via the same flat-stream window mapping the phrase
// translation already uses.
describe('injectPhrasesIntoRichData — F-X11 paragraphBoundaries', () => {
  it('translates within-stanza paragraph boundaries to rich-block-relative indices', () => {
    // Single rich stanza of 4 lines. Extractor reports the same 4 lines
    // with one within-stanza paragraph boundary at index 2 ("paragraph
    // break before line 2").
    const richData = {
      'PB Ref': richRef([
        richStanzaBlock('verse a', ['verse b', 'verse c', 'verse d']),
      ]),
    }
    const result = injectPhrasesIntoRichData(richData, [
      {
        ref: 'PB Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['verse a', 'verse b', 'verse c', 'verse d'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
              { lineRange: [2, 2], indent: 0 },
              { lineRange: [3, 3], indent: 0 },
            ],
            paragraphBoundaries: [2],
          },
        ],
      },
    ])
    expect(result.ok).toBe(true)
    const block = result.data['PB Ref'].stanzasRich.blocks[0]
    expect(block.paragraphBoundaries).toEqual([2])
  })

  it('translates boundaries across multi-stanza extractor flat stream (Psalm 110-style join)', () => {
    // Rich block holds 4 lines that span 2 extractor stanzas; the second
    // extractor stanza has a paragraph boundary at its line 1. The
    // boundary should appear at rich-block-relative index 3.
    const richData = {
      'Span Ref': richRef([
        richStanzaBlock('a', ['b', 'c', 'd']),
      ]),
    }
    const result = injectPhrasesIntoRichData(richData, [
      {
        ref: 'Span Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['a', 'b'],
            phrases: [{ lineRange: [0, 1], indent: 0 }],
          },
          {
            stanzaIndex: 1,
            lines: ['c', 'd'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
            ],
            paragraphBoundaries: [1], // before "d"
          },
        ],
      },
    ])
    expect(result.ok).toBe(true)
    const block = result.data['Span Ref'].stanzasRich.blocks[0]
    // Window is [a, b, c, d]; paragraph boundary "before d" sits at
    // window index 3.
    expect(block.paragraphBoundaries).toEqual([3])
  })

  it('drops paragraphBoundaries field when extractor now reports none', () => {
    const seeded = {
      'Strip PB Ref': richRef([
        {
          ...richStanzaBlock('a', ['b']),
          phrases: [{ lineRange: [0, 1], indent: 0 }],
          paragraphBoundaries: [1],
        },
      ]),
    }
    const result = injectPhrasesIntoRichData(seeded, [
      {
        ref: 'Strip PB Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['a', 'b'],
            phrases: [{ lineRange: [0, 1], indent: 0 }],
            // no paragraphBoundaries — must clear the previously-set field
          },
        ],
      },
    ])
    expect(result.ok).toBe(true)
    const block = result.data['Strip PB Ref'].stanzasRich.blocks[0]
    expect(block.paragraphBoundaries).toBeUndefined()
    // phrases still set (independent field).
    expect(block.phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])
  })

  it('idempotent under repeated apply with paragraphBoundaries', () => {
    const richData = {
      'Idem PB Ref': richRef([
        richStanzaBlock('a', ['b', 'c', 'd']),
      ]),
    }
    const batch = {
      ref: 'Idem PB Ref',
      stanzas: [
        {
          stanzaIndex: 0,
          lines: ['a', 'b', 'c', 'd'],
          phrases: [
            { lineRange: [0, 0], indent: 0 },
            { lineRange: [1, 1], indent: 0 },
            { lineRange: [2, 2], indent: 0 },
            { lineRange: [3, 3], indent: 0 },
          ],
          paragraphBoundaries: [2, 3],
        },
      ],
    }
    const first = injectPhrasesIntoRichData(richData, [batch])
    expect(first.ok).toBe(true)
    const second = injectPhrasesIntoRichData(first.data, [batch])
    expect(second.ok).toBe(true)
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data))
    expect(
      first.data['Idem PB Ref'].stanzasRich.blocks[0].paragraphBoundaries,
    ).toEqual([2, 3])
  })
})

// @fr FR-161
// F-X11 follow-up batch (#426 — review #419 M-1) — extractor `needsReview`
// flag must propagate from extractor stanzas to a curator review queue
// surfaced on the builder result. Pre-#426 the flag was silently dropped
// inside `injectPhrasesIntoRichData`; the production batch builder
// (`scripts/build-phrases-into-rich.mjs`) had 0 occurrences of
// `needsReview`, so the 124 deferred refs re-extraction would have shipped
// any Stage 1↔Stage 2 disagreements without curator visibility. The fix
// keeps the rich-AST schema unchanged (no `needsReview` field on stanza
// blocks) and emits a SEPARATE channel via `result.reviewQueue`; the CLI
// persists it to `.claude/scaffold/phrase-extract-review-queue.json`.
describe('collectReviewQueue + injectPhrasesIntoRichData — needsReview surfacing (#426 M-1)', () => {
  it('surfaces flagged stanzas as a queue with ref + first line + line count', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm Q',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['  ok line A', '  ok line B'],
            phrases: [{ lineRange: [0, 1], indent: 0 }],
            needsReview: false,
          },
          {
            stanzaIndex: 1,
            lines: ['  flagged line A', '  flagged line B', '  flagged line C'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
              { lineRange: [2, 2], indent: 0 },
            ],
            needsReview: true,
          },
        ],
      },
    ])
    expect(queue).toEqual([
      {
        ref: 'Psalm Q',
        stanzaIndex: 1,
        firstLine: 'flagged line A',
        lineCount: 3,
      },
    ])
  })

  it('returns an empty queue when no stanza is flagged', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm OK',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['line'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
            needsReview: false,
          },
        ],
      },
    ])
    expect(queue).toEqual([])
  })

  it('surfaces reviewQueue on the inject result alongside data (atomic gate PASS)', () => {
    const richData = {
      'PB Ref': richRef([richStanzaBlock('verse a', ['verse b', 'verse c'])]),
    }
    const result = injectPhrasesIntoRichData(richData, [
      {
        ref: 'PB Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['verse a', 'verse b', 'verse c'],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 1], indent: 0 },
              { lineRange: [2, 2], indent: 0 },
            ],
            needsReview: true,
          },
        ],
      },
    ])
    expect(result.ok).toBe(true)
    expect(result.reviewQueue).toEqual([
      {
        ref: 'PB Ref',
        stanzaIndex: 0,
        firstLine: 'verse a',
        lineCount: 3,
      },
    ])
    // The needsReview flag MUST NOT leak into rich.json.
    const block = result.data['PB Ref'].stanzasRich.blocks[0]
    expect(block.needsReview).toBeUndefined()
  })

  it('surfaces reviewQueue even when the atomic gate FAILS (curator still gets visibility)', () => {
    const richData = { 'Existing Ref': richRef([richStanzaBlock('a')]) }
    const result = injectPhrasesIntoRichData(richData, [
      {
        ref: 'Missing Ref', // triggers REF_NOT_FOUND
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['unmatched first line'],
            phrases: [{ lineRange: [0, 0], indent: 0 }],
            needsReview: true,
          },
        ],
      },
    ])
    expect(result.ok).toBe(false)
    expect(result.issues[0].error).toBe('REF_NOT_FOUND')
    // The queue still tells the curator which extractor stanza needed
    // attention even though no rich.json mutation happened.
    expect(result.reviewQueue).toEqual([
      {
        ref: 'Missing Ref',
        stanzaIndex: 0,
        firstLine: 'unmatched first line',
        lineCount: 1,
      },
    ])
  })
})

// @fr FR-161
// Curator queue bulk-hotfix (#447 — audit #446) — `collectReviewQueue`
// suppresses two classes of scan-noise that swamp the curator queue:
//   1. Header / section / page-title artifacts (Cat A-D from audit §2)
//      — page titles "Дуулал N", book section "Магтаал…", doxology
//      "Эцэг, Хүү, Ариун Сүнсэнд…", day/season/page headers, Roman
//      numeral dividers "I"/"II". 12/12 PDF spot-checks confirmed these
//      never correspond to an injected stanza, so suppressing them at
//      queue-collection time has zero rich.json impact.
//   2. (firstLine, lineCount) cross-ref dedupe — multi-page gather
//      surfaces the same column window from neighbouring pages multiple
//      times across refs (audit Cat E ~50 overlapping). Dedupe set is
//      shared across the whole `batches` input.
// Pre-#447 the curator queue was 206 entries / 96 distinct refs ≈ 2.15
// entries/ref; audit projects 60-75% reduction (206 → ~50-80) after the
// hotfix lands. The tests below pin the contract: each catalog regex
// branch is exercised, dedupe is verified, and two regression guards
// ensure body content is NOT silently dropped (false-positive surface).
describe('collectReviewQueue — header filter + dedupe (#447 bulk-hotfix, audit #446)', () => {
  // --- Catalog coverage: isHeaderArtifact unit tests --------------------
  // Every regex branch is exercised so a future tweak to one alternative
  // cannot silently drop the others.

  it('isHeaderArtifact: Cat A — "Дуулал N" page-title (any psalm number)', () => {
    expect(isHeaderArtifact('Дуулал 80')).toBe(true)
    expect(isHeaderArtifact('Дуулал 24')).toBe(true)
    expect(isHeaderArtifact('Дуулал 1')).toBe(true)
    expect(isHeaderArtifact('Дуулал 150')).toBe(true)
  })

  it('isHeaderArtifact: Cat B — "Магтаал" book-section (tab or space follows)', () => {
    expect(isHeaderArtifact('Магтаал\t\tхалдаа суун')).toBe(true)
    expect(isHeaderArtifact('Магтаал есдугаар')).toBe(true)
    // Negative — "Магтаал" with no following [\t ] (e.g. end-of-line) is
    // body usage, not the section header.
    expect(isHeaderArtifact('Магтаал')).toBe(false)
  })

  it('isHeaderArtifact: Cat C — doxology / prayer-name preambles', () => {
    expect(isHeaderArtifact('Эцэг, Хүү, Ариун Сүнсэнд алдар…')).toBe(true)
    expect(isHeaderArtifact('Оройн даатгал залбирал')).toBe(true)
    expect(isHeaderArtifact('Дууллын залбирал')).toBe(true)
    expect(isHeaderArtifact('Шад дуулал')).toBe(true)
    expect(isHeaderArtifact('Шад магтаал')).toBe(true)
  })

  it('isHeaderArtifact: Cat D — day / season / page / Roman headers', () => {
    expect(isHeaderArtifact('Бямба гарагийн орой')).toBe(true)
    expect(isHeaderArtifact('1 ДУГААР ДОЛОО ХОНОГ')).toBe(true)
    expect(isHeaderArtifact('3 ДУГААР ДОЛОО ХОНОГ')).toBe(true)
    expect(isHeaderArtifact('Ариун долоо хоног')).toBe(true)
    expect(isHeaderArtifact('Амилалтын улирал')).toBe(true)
    expect(isHeaderArtifact('Дөчин хоногийн мацаг')).toBe(true)
    expect(isHeaderArtifact('12 сарын 25')).toBe(true)
    // Roman numeral dividers — anchored at end-of-string so only bare
    // "I" or "II" lines match.
    expect(isHeaderArtifact('I')).toBe(true)
    expect(isHeaderArtifact('II')).toBe(true)
  })

  // --- Regression guard #1 (false-positive surface) ---------------------
  // The Roman divider branch is `I{1,2}$` — anchored at end-of-string.
  // Body content that happens to start with "I" must NOT be filtered.

  it('isHeaderArtifact: regression — body line starting with "I" is NOT filtered', () => {
    expect(isHeaderArtifact('I am a body line that starts with I')).toBe(false)
    expect(isHeaderArtifact('III')).toBe(false) // 3 Is — outside {1,2}
    expect(isHeaderArtifact('I.')).toBe(false) // trailing period — not bare divider
  })

  // --- Regression guard #2 (false-positive surface) ---------------------
  // Body content that does NOT match any catalog branch passes through.

  it('isHeaderArtifact: regression — normal body content is NOT filtered', () => {
    expect(isHeaderArtifact('Эзэн минь ээ,')).toBe(false)
    expect(isHeaderArtifact('Таны царайг хайн хайн')).toBe(false)
    expect(isHeaderArtifact('Үндэстнүүдийг хөөгөөд,')).toBe(false)
    expect(isHeaderArtifact('Шүүгчид нь хадны өөдөөс')).toBe(false)
    expect(isHeaderArtifact('')).toBe(false) // empty / falsy guard
    expect(isHeaderArtifact(null)).toBe(false)
    expect(isHeaderArtifact(undefined)).toBe(false)
  })

  // --- collectReviewQueue: filter integration ---------------------------
  // Each Cat A/B/C/D sample, when `needsReview: true`, is dropped at
  // queue-collection time. The queue should be empty for an all-header
  // batch.

  it('collectReviewQueue: drops every Cat A-D sample even when needsReview=true', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm 80:2-8, 15-20',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Дуулал 80', 'noise', 'noise', 'noise'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Tobit 13:1-8',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Магтаал\t\tаврагдсан', 'body'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Psalm 149:1-9',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Эцэг, Хүү, Ариун Сүнсэнд алдар', 'болтугай.'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Psalm 113:1-9',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['3 ДУГААР ДОЛОО ХОНОГ', 'noise'],
            phrases: [],
            needsReview: true,
          },
          {
            stanzaIndex: 1,
            lines: ['I'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
    ])
    expect(queue).toEqual([])
  })

  // --- collectReviewQueue: dedupe ---------------------------------------
  // Same (firstLine, lineCount) pair surfaced twice (cross-ref or
  // intra-ref) collapses to a single queue entry. The first occurrence
  // wins (its ref / stanzaIndex is recorded).

  it('collectReviewQueue: cross-ref (firstLine, lineCount) dedupe — same pair pushed once', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm 141:1-10',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Шүүгчид нь хадны өөдөөс', 'тэвчээр болж', 'мөн нэр алдартай'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Psalm 142:1-7',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Шүүгчид нь хадны өөдөөс', 'тэвчээр болж', 'мөн нэр алдартай'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
    ])
    // Only the FIRST occurrence is kept (Psalm 141, the cross-ref Psalm 142
    // duplicate is dropped — Cat E from audit §2).
    expect(queue).toEqual([
      {
        ref: 'Psalm 141:1-10',
        stanzaIndex: 0,
        firstLine: 'Шүүгчид нь хадны өөдөөс',
        lineCount: 3,
      },
    ])
  })

  // --- Regression guard #3: dedupe is (firstLine, lineCount) — NOT just firstLine ---
  // Different `lineCount` for the same `firstLine` represents a different
  // cap-window (potentially a different stanza shape) and must NOT collapse.

  it('collectReviewQueue: dedupe preserves entries with same firstLine but different lineCount', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm A',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['shared opener', 'L2', 'L3'], // lineCount=3
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Psalm B',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['shared opener', 'L2', 'L3', 'L4', 'L5'], // lineCount=5
            phrases: [],
            needsReview: true,
          },
        ],
      },
    ])
    // Both pass through — same firstLine but the (firstLine, lineCount)
    // tuples are distinct.
    expect(queue).toEqual([
      {
        ref: 'Psalm A',
        stanzaIndex: 0,
        firstLine: 'shared opener',
        lineCount: 3,
      },
      {
        ref: 'Psalm B',
        stanzaIndex: 0,
        firstLine: 'shared opener',
        lineCount: 5,
      },
    ])
  })

  // --- Regression guard #4 (false-negative surface) ---------------------
  // Normal body firstLine + needsReview=true MUST still reach the queue —
  // the filter must not silently swallow actionable curator-relevant
  // entries.

  it('collectReviewQueue: regression — normal body firstLine still surfaces (filter false-positive guard)', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Psalm Body',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Эзэн минь ээ,', 'би таныг хүсч байна', 'таны нэрийг'],
            phrases: [],
            needsReview: true,
          },
        ],
      },
    ])
    expect(queue).toEqual([
      {
        ref: 'Psalm Body',
        stanzaIndex: 0,
        firstLine: 'Эзэн минь ээ,',
        lineCount: 3,
      },
    ])
  })

  // --- Combined behaviour: header + dedupe + body in one batch ----------
  // End-to-end shape — the queue contains ONLY the body entry; the
  // header is filtered, the duplicate body is deduped.

  it('collectReviewQueue: combined — header filtered, duplicate body deduped, distinct body kept', () => {
    const queue = collectReviewQueue([
      {
        ref: 'Mixed Ref 1',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Дуулал 50', 'noise'], // header → filtered
            phrases: [],
            needsReview: true,
          },
          {
            stanzaIndex: 1,
            lines: ['Real body line', 'L2'], // body → kept
            phrases: [],
            needsReview: true,
          },
        ],
      },
      {
        ref: 'Mixed Ref 2',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: ['Real body line', 'L2'], // exact dup → deduped
            phrases: [],
            needsReview: true,
          },
        ],
      },
    ])
    expect(queue).toEqual([
      {
        ref: 'Mixed Ref 1',
        stanzaIndex: 1,
        firstLine: 'Real body line',
        lineCount: 2,
      },
    ])
  })
})

// @fr FR-161
describe('renderDryRun', () => {
  it('renders a PASS summary with per-ref phrase ranges', () => {
    const result = {
      ok: true,
      plan: [
        {
          ref: 'Psalm 110:1-5, 7',
          updates: [
            {
              blockIndex: 0,
              richFirstLine: 'ЭЗЭН миний Эзэнд',
              phrases: [
                { lineRange: [0, 1], indent: 0 },
                { lineRange: [2, 3], indent: 0 },
              ],
            },
          ],
        },
      ],
    }
    const text = renderDryRun(result)
    expect(text).toContain('atomic gate: PASS')
    expect(text).toContain('Psalm 110:1-5, 7')
    expect(text).toContain('block 0')
    expect(text).toContain('[0,1]')
    expect(text).toContain('[2,3]')
    expect(text).toContain('2 phrase(s)')
  })

  it('renders a FAIL summary listing every issue', () => {
    const result = {
      ok: false,
      issues: [
        {
          ref: 'Bad',
          error: 'STANZA_PLAN_ISSUE',
          blockIndex: 0,
          kind: 'LINE_COUNT_MISMATCH',
          richLineCount: 1,
          extractorLineCount: 2,
        },
      ],
    }
    const text = renderDryRun(result)
    expect(text).toContain('atomic gate: FAIL')
    expect(text).toContain('Bad')
    expect(text).toContain('STANZA_PLAN_ISSUE')
    expect(text).toContain('LINE_COUNT_MISMATCH')
  })
})

// @fr FR-161
// F-X11 WI-A2 (#452) — matcher-side wrap-tolerant comparison.
//
// Root cause (from #449 solver report): live extractor CLI produces
// `splitIntoStanzas` output where pdftotext column-break splits a logical
// line into 2+ physical stream rows (e.g. 'Гарыг' + 'минь дайтахад,'
// instead of the joined 'Гарыг минь дайтахад,'). rich.json carries the
// JOINED logical line; the pre-#452 matcher tried only 1-1 alignment with
// a 12-char prefix tolerance — which silently mis-aligned because the
// shorter stream fragment shared a 12-char prefix with the longer rich
// line, accidentally consuming 1 stream row when it should have consumed
// 2. The next rich line then de-synced against the wrap-continuation
// fragment and the whole window failed as LINE_COUNT_MISMATCH.
//
// Fix (this WI): when alignment at one rich line either fails OR the rich
// line is meaningfully longer than the stream line at the cursor, try
// absorbing 1-2 trailing wrap-continuation rows (lowercase-letter-leading,
// no opening punctuation, no leading digit) into the current rich line.
// Bridged rows do NOT contribute paragraph boundaries (they're intra-
// line continuations); phrases that straddle bridged rows collapse into
// a single rich-line phrase (windowIndex deduplicated).
//
// Tests below pin: positive bridge (2- and 3-row), capital/digit/quote
// negative guards, multi-block windows with bridges in the middle, phrase
// translation across bridges, paragraph boundary suppression on bridged
// rows, and the explicit Psalm 30:2-13 b1 reproduction (production-shape
// regression guard for the audit-2026-05-09 §3 WI-E small-drift residual).
describe('isWrapContinuation (#452 helper)', () => {
  it('accepts lowercase Cyrillic continuation', () => {
    expect(isWrapContinuation('минь дайтахад,')).toBe(true)
    expect(isWrapContinuation('бөгөөд')).toBe(true)
    expect(isWrapContinuation('би сэтгэл зовж байв.')).toBe(true)
  })

  it('accepts lowercase Latin continuation (defensive — mixed-script docs)', () => {
    expect(isWrapContinuation('and the rest')).toBe(true)
    expect(isWrapContinuation('continuation here')).toBe(true)
  })

  it('rejects capital-leading lines (new sentence / verse / proper noun)', () => {
    expect(isWrapContinuation('Минь дайтахад,')).toBe(false)
    expect(isWrapContinuation('ЭЗЭН минь')).toBe(false)
    expect(isWrapContinuation('Continuation here')).toBe(false)
  })

  it('rejects opening-quote / dash / paren leads (new sentence / dialog)', () => {
    expect(isWrapContinuation('«би хэзээ ч ганхахгүй» гэсэн.')).toBe(false)
    expect(isWrapContinuation('"continuation"')).toBe(false)
    expect(isWrapContinuation('— continuation')).toBe(false)
    expect(isWrapContinuation('(continuation)')).toBe(false)
  })

  it('rejects digit-leading lines (page numbers / page-footer residue)', () => {
    expect(isWrapContinuation('132')).toBe(false)
    expect(isWrapContinuation('1 дугаар долоо хоног')).toBe(false)
  })

  it('rejects empty / falsy input', () => {
    expect(isWrapContinuation('')).toBe(false)
    expect(isWrapContinuation('   ')).toBe(false)
    expect(isWrapContinuation(null)).toBe(false)
    expect(isWrapContinuation(undefined)).toBe(false)
  })
})

describe('planRefUpdates — F-X11 WI-A2 wrap-tolerant matcher (#452)', () => {
  // ── Positive: single bridge (most common shape) ───────────────────────
  // rich = ['Гарыг минь дайтахад,'] (1 joined line)
  // stream = ['Гарыг', 'минь дайтахад,'] (2 column-break-split rows)
  it('bridges 2 stream rows into one rich line when next stream is wrap continuation', () => {
    const richSlots = [
      { block: richStanzaBlock('Гарыг минь дайтахад,'), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Гарыг', 'минь дайтахад,'],
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Phrase that originally spanned 2 stream rows collapses to single
    // rich-line phrase at windowIndex 0.
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
    ])
  })

  // ── Positive: 3-row bridge (deeper wrap) ──────────────────────────────
  // rich = ['Маш урт нэг логик мөр энд байна,'] (1 joined line)
  // stream = ['Маш', 'урт нэг', 'логик мөр энд байна,'] (3 wrap rows)
  it('bridges 3 stream rows into one rich line via deeper lookahead', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Маш урт нэг логик мөр энд байна,'),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Маш', 'урт нэг', 'логик мөр энд байна,'],
        phrases: [{ lineRange: [0, 2], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
    ])
  })

  // ── Multi-block window: bridge in the middle preserves alignment ──────
  // rich = ['Эхний', 'Та Өөрийн нүүр царайг нуусанд би сэтгэл зовж байв.', 'Сүүлчийн']
  // stream = ['Эхний', 'Та Өөрийн нүүр царайг нуусанд', 'би сэтгэл зовж байв.', 'Сүүлчийн']
  // The middle rich line absorbs 2 stream rows; first / last align 1-1.
  it('bridges only the affected rich line within a multi-line window', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Эхний', [
          'Та Өөрийн нүүр царайг нуусанд би сэтгэл зовж байв.',
          'Сүүлчийн',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Эхний',
          'Та Өөрийн нүүр царайг нуусанд',
          'би сэтгэл зовж байв.',
          'Сүүлчийн',
        ],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Phrases translate to rich-relative indices: line 0 stays 0, the
    // wrap-bridged 2-stream phrase collapses to rich line 1, last line is 2.
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
  })

  // ── Negative: capital next-line is NOT wrap continuation ───────────────
  // Direct prefix-match would have succeeded (per pre-#452 behavior) but
  // the bridge attempt MUST refuse to absorb a capital-leading row.
  // We construct a case where bridge would WRONGLY succeed if the guard
  // were missing.
  it('does NOT bridge when next stream line starts with capital (new sentence)', () => {
    // rich line meaningfully longer than stream[0]; stream[1] is capital.
    // Bridge would have produced 'Гарыг Минь дайтахад,' which differs
    // from rich 'Гарыг минь дайтахад,' (case mismatch on М/м), so the
    // bridge would fail anyway; what we're really asserting is that the
    // is-wrap-continuation guard short-circuits BEFORE attempting the
    // concat (so a bridge can't succeed in any pathological case).
    const richSlots = [
      { block: richStanzaBlock('Гарыг минь дайтахад,'), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Гарыг', 'Минь дайтахад,'], // capital М on continuation
        phrases: [],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Direct match succeeds via 12-char prefix (stream='Гарыг' shares
    // 5 chars with rich='Гарыг минь дайтахад,'), but next rich line
    // doesn't exist (single line block), so we're done. The capital
    // next-line is left as residue in the stream — NOT absorbed.
    // Updates path = direct match (consumed 1 stream row).
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
  })

  // ── Negative: stream next-line is digit (page-footer residue) ─────────
  it('does NOT bridge across digit-leading rows (page-footer residue)', () => {
    const richSlots = [
      { block: richStanzaBlock('Эхний мөр'), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Эхний', '132', 'мөр'], // digit row between would-be bridge halves
        phrases: [],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Direct prefix match for 'Эхний' vs 'Эхний мөр' succeeds (5-char
    // prefix). Single-line rich block — done. Digit row never absorbed.
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
  })

  // ── Negative: bridge fails entirely → reports honest failure ──────────
  // No direct match, no valid bridge → the matcher must report
  // NO_MATCHING_EXTRACTOR_STANZA, not silently drop or false-pass.
  it('reports NO_MATCHING_EXTRACTOR_STANZA when bridge cannot reach the rich text', () => {
    const richSlots = [
      { block: richStanzaBlock('Эзэн миний Эзэнд тэмцэлдсэн'), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Огт', 'байхгүй', 'нэрс'], // unrelated content
        phrases: [],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.updates).toEqual([])
    expect(out.issues).toHaveLength(1)
    expect(out.issues[0].kind).toBe('NO_MATCHING_EXTRACTOR_STANZA')
  })

  // ── Paragraph boundaries: bridged rows do NOT introduce extra PB ──────
  // stream stanza paragraphBoundaries[1] would mark the second stream
  // row, but that row is BRIDGED into the same rich line as row 0.
  // The translated paragraphBoundaries must NOT contain the bridge row.
  it('suppresses paragraph boundaries that fall on bridged stream rows', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Гарыг минь дайтахад,', ['Сүүлчийн мөр']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Гарыг', 'минь дайтахад,', 'Сүүлчийн мөр'],
        phrases: [
          { lineRange: [0, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
        ],
        // PB at lineWithinStanza 1 (the wrap-continuation row) and 2
        // (the second rich line). The bridged row 1 must be SUPPRESSED;
        // only row 2 (which becomes rich line 1) survives.
        paragraphBoundaries: [1, 2],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // PB at rich-line 1 only (stream row 2 → rich line 1). Stream row 1
    // (the bridged wrap continuation) is intra-line, NOT a paragraph
    // break.
    expect(out.updates[0].paragraphBoundaries).toEqual([1])
  })

  // ── Production-shape regression: Psalm 30:2-13 b1 (audit §3 WI-E) ─────
  // The actual stream/rich line counts that produced gap=1 in the audit.
  // Pre-#452: 12-char prefix accidentally accepted stream[24] as the
  // joined rich[23], then desynced at rich[24] vs stream[25]='би сэтгэл
  // зовж байв.', producing LINE_COUNT_MISMATCH (extractorLineCount=24).
  // Post-#452: bridge absorbs stream[24]+stream[25] into rich[23], the
  // rest aligns 1-1, full window matches.
  it('Psalm 30:2-13 b1 production-shape regression: bridges joined wrap line', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Миний дайснуудыг надаас болж', [
          'Баярлуулаагүй учраас',
          'Би Таныг өргөмжилнө.',
          'Та Өөрийн нүүр царайг нуусанд би сэтгэл зовж байв.',
          'ЭЗЭН, Тан руу би хашхирч,',
          'ЭЗЭНд би гуйлтыг өргөсөн.–',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Миний дайснуудыг надаас болж',
          'Баярлуулаагүй учраас',
          'Би Таныг өргөмжилнө.',
          'Та Өөрийн нүүр царайг нуусанд', // wrap line A
          'би сэтгэл зовж байв.', //          wrap line B (bridged)
          'ЭЗЭН, Тан руу би хашхирч,',
          'ЭЗЭНд би гуйлтыг өргөсөн.–',
        ],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 4], indent: 0 }, // crosses the wrap
          { lineRange: [5, 5], indent: 0 },
          { lineRange: [6, 6], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // The wrap-bridged phrase collapses to rich line 3 (single index).
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
      { lineRange: [3, 3], indent: 0 }, // collapsed bridge
      { lineRange: [4, 4], indent: 0 },
      { lineRange: [5, 5], indent: 0 },
    ])
  })

  // ── F-X11 WI-A2-2 (#456) — REVERSE direction wrap-tolerant tests ──
  //
  // Mirror of the forward tests above: rich.json carries a phrase-split
  // (R-8 result — a logical line broken into 2-3 short rich lines, with
  // the trailing lines starting lowercase as wrap-continuation markers)
  // and the extractor has the same logical line wrap-MERGED into a
  // single physical row. Pre-#456 the matcher tried only forward bridge
  // (rich-merged ← ext-split); the symmetric prefix-trap on
  // `stanzaFirstLineMatches` collapsed the second rich line into the
  // first via 12-char prefix tolerance and silently de-synced the
  // remainder of the window. Post-#456 a `tryBridgeRich` mirror absorbs
  // 2-3 rich lines into a single ext stream row with the same
  // `isWrapContinuation` guard the forward direction uses (lowercase
  // start, no opening punctuation, no leading digit), and a
  // `bridgeMatch` length-similarity gate prevents the 12-char prefix
  // accepting wildly-mismatched concat lengths.

  // ── Positive: single reverse bridge (production-shape, Revelation
  // 4:11; 5:9-10, 12 b1 lines 14-15 mechanism) ──────────────────────
  // rich = ['Алдар ба', 'магтаалыг авах зохистой нь Тэр мөн.'] (2 lines,
  //        rich.0 short, rich.1 lowercase wrap continuation)
  // stream = ['Алдар ба магтаалыг авах зохистой нь Тэр мөн.'] (1 merged)
  it('bridges 2 rich lines into one stream row when next rich is wrap continuation', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Алдар ба', [
          'магтаалыг авах зохистой нь Тэр мөн.',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Алдар ба магтаалыг авах зохистой нь Тэр мөн.'],
        // ext phrase covering its single line maps to BOTH rich lines
        // via the reverse-bridge collapse.
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // The single ext line maps to BOTH rich windowIndices [0, 1] via
    // the reverse-bridge lookup duplication; phrase translation
    // collects all hits and produces a contiguous range [0, 1].
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 1], indent: 0 },
    ])
  })

  // ── Positive: 3-rich-line reverse bridge (deeper rich split) ─────────
  // rich = ['Эхний', 'дунд', 'төгсгөл.'] (3 short rich lines, two lowercase)
  // stream = ['Эхний дунд төгсгөл.'] (1 merged)
  it('bridges 3 rich lines into one stream row via deeper lookahead', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Эхний', ['дунд', 'төгсгөл.']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Эхний дунд төгсгөл.'],
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 2], indent: 0 },
    ])
  })

  // ── Negative: rich[N+1] is a new stanza first line (capital) ─────────
  // The reverse bridge MUST refuse to absorb a capital-leading rich line
  // even when stream is meaningfully longer than rich[N], so a new
  // sentence / verse / page-footer fragment cannot be silently merged
  // into the previous logical line.
  it('does NOT reverse-bridge when next rich is capital-leading (new stanza)', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Алдар ба', ['Магтаалыг авах зохистой.']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Алдар ба магтаалыг авах зохистой.'],
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Reverse bridge MUST refuse (capital М on rich.1 fails the
    // wrap-continuation guard). After refusal: direct-match on rich.0
    // vs ext.0 succeeds via 12-char prefix tolerance (both share
    // 'Алдар ба' as their leading 8 chars), consuming the single ext
    // line. rich.1 then has no ext partner — alignAtProbe returns null
    // at every probe, so the diagnostic falls through to
    // LINE_COUNT_MISMATCH (richLineCount=2, extractorLineCount=1, the
    // count of rich lines that 12-char-prefix-matched against the
    // single ext line). Both LINE_COUNT_MISMATCH and
    // NO_MATCHING_EXTRACTOR_STANZA are legitimate error surfaces here —
    // what matters is that the bridge did NOT silently absorb the
    // capital-leading rich.1.
    expect(out.updates).toEqual([])
    expect(out.issues).toHaveLength(1)
    expect(['LINE_COUNT_MISMATCH', 'NO_MATCHING_EXTRACTOR_STANZA']).toContain(
      out.issues[0].kind,
    )
  })

  // ── Negative: rich[N+1] is digit-leading (page-footer / verse-num) ───
  it('does NOT reverse-bridge when next rich is digit-leading', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Эхний мөр', ['132 хуудас']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Эхний мөр 132 хуудас'],
        phrases: [{ lineRange: [0, 0], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Same shape as the capital-leading case — reverse bridge refuses
    // on the digit guard, direct match consumes the single ext line,
    // rich.1 left without a partner. The diagnostic falls through to
    // LINE_COUNT_MISMATCH or NO_MATCHING_EXTRACTOR_STANZA depending on
    // whether the residue can be re-probed. The invariant under test
    // is "bridge refused"; either error is acceptable.
    expect(out.updates).toEqual([])
    expect(out.issues).toHaveLength(1)
    expect(['LINE_COUNT_MISMATCH', 'NO_MATCHING_EXTRACTOR_STANZA']).toContain(
      out.issues[0].kind,
    )
  })

  // ── Multi-block window: reverse bridge in the middle of a stanza ─────
  // rich = ['Эхний', 'Алдар ба', 'магтаалыг…', 'Сүүлчийн']
  // stream = ['Эхний', 'Алдар ба магтаалыг…', 'Сүүлчийн']
  // The middle two rich lines collapse into one stream row; first /
  // last align 1-1.
  it('reverse-bridges only the affected rich pair within a multi-line window', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Эхний', [
          'Алдар ба',
          'магтаалыг авах зохистой нь Тэр мөн.',
          'Сүүлчийн',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Эхний',
          'Алдар ба магтаалыг авах зохистой нь Тэр мөн.',
          'Сүүлчийн',
        ],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Phrase translation: ext line 0 → rich window 0; ext line 1 → rich
    // windows {1, 2} (reverse-bridged); ext line 2 → rich window 3.
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 2], indent: 0 }, // expanded across reverse pair
      { lineRange: [3, 3], indent: 0 },
    ])
  })

  // ── Forward + reverse mixed in one window ────────────────────────────
  // rich = ['Гарыг минь дайтахад,', 'Алдар ба', 'магтаалыг…']
  //        (rich.0 forward-bridged from 2 stream rows; rich.1+rich.2
  //         reverse-bridged into 1 stream row)
  // stream = ['Гарыг', 'минь дайтахад,', 'Алдар ба магтаалыг…']
  it('handles forward + reverse bridges in the same window', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Гарыг минь дайтахад,', [
          'Алдар ба',
          'магтаалыг авах зохистой нь Тэр мөн.',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Гарыг',
          'минь дайтахад,',
          'Алдар ба магтаалыг авах зохистой нь Тэр мөн.',
        ],
        phrases: [
          { lineRange: [0, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Forward phrase [0,1] (2 ext rows → rich window 0) collapses to
    // rich line 0; reverse phrase [2,2] (1 ext row → rich windows 1+2)
    // expands to [1,2].
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 2], indent: 0 },
    ])
  })

  // ── Paragraph boundaries on reverse-bridged groups ───────────────────
  // ext stanza paragraphBoundaries[1] marks "before ext line 1".
  // After reverse-bridge, ext line 1 maps to rich windows 1+2. Only the
  // FIRST (windowIndex 1) inherits the source's isParagraphStart; the
  // continuation (windowIndex 2) is suppressed. The translated PB list
  // therefore contains 1 (NOT 2) — semantic invariant: PB cannot fall
  // BETWEEN reverse-bridged rich lines (they're intra-source-line).
  it('suppresses isParagraphStart on reverse-bridge continuation rich lines', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Эхний', [
          'Алдар ба',
          'магтаалыг авах зохистой нь Тэр мөн.',
          'Сүүлчийн',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Эхний',
          'Алдар ба магтаалыг авах зохистой нь Тэр мөн.',
          'Сүүлчийн',
        ],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
        ],
        paragraphBoundaries: [1, 2],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // PB at ext line 1 maps to rich window 1 only (window 2 is the
    // reverse-bridge continuation, isParagraphStart suppressed). PB at
    // ext line 2 maps to rich window 3.
    expect(out.updates[0].paragraphBoundaries).toEqual([1, 3])
  })

  // ── Length-similarity guard (regression: Tobit 13:8-11 b8) ──────────
  // The 12-char prefix tolerance in `stanzaFirstLineMatches` would
  // accidentally accept a clearly-too-long reverse-bridged concat as
  // matching a short ext line whenever they share their leading 12
  // chars. The `bridgeMatch` length-similarity gate (delta ≤ max(4,
  // 0.15 × max-len)) rejects such cases so bridge failure cleanly
  // surfaces a real alignment failure (NO_MATCHING_EXTRACTOR_STANZA)
  // rather than silently accepting and de-syncing the next step.
  it('rejects reverse-bridge when concat length is wildly different from stream line', () => {
    // rich.0 ≈ 31 chars, rich.1 lowercase 16 chars. Concat ≈ 48 chars.
    // ext.0 ≈ 32 chars (single-char typography drift on 'Эзэний' suffix).
    // 12-char prefix would accept the bridge if used naively; bridgeMatch
    // delta=16 vs max-allowed=ceil(0.15 × 48)=8 rejects it.
    const richSlots = [
      {
        block: richStanzaBlock('Сэтгэл минь Эзэний, агуу Хааныг', [
          'ерөөн магтагтун.',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          'Сэтгэл минь Эзэнийг, агуу Хааныг',
          'ерөөн магтагтун.',
        ],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    // Reverse bridge correctly REJECTS (length delta > tolerance).
    // Direct 1-1 match succeeds via 12-char prefix on 'Сэтгэл минь '
    // (typography drift). rich.1 / ext.1 align exactly. PASSES.
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
  })

  // ── Production-shape regression: Revelation 4:11; 5:9-10, 12 b1 ─────
  // rich block 1 has 16 lines including the trailing pair
  // ('Алдар ба', 'магтаалыг авах зохистой нь Тэр мөн.'). The ext stream
  // has the same 16-element prefix but lines 14+15 are merged into a
  // single 'Алдар ба магтаалыг авах зохистой нь Тэр мөн.' (15 ext
  // lines total). Pre-#456 this reported rich=16 ext=15 / atomic gate
  // FAIL. Post-#456 the reverse bridge collapses the trailing rich pair.
  it('Revelation 4:11; 5:9-10, 12 b1 production-shape regression: bridges trailing rich-split pair', () => {
    const richTrailing = [
      'Эзэн болох Христ минь,',
      'Хуйлмал номыг авч,',
      'Лацнуудыг нь нээх зохистой нь Та мөн.',
      'Учир нь Та нядлуулсан бөгөөд',
      'Өөрийн цусаар бүх овог, хэл,',
      'Ард түмэн болон үндэстнүүдээс',
      'Тэнгэрбурханд ариун хүмүүсийг',
      'Арилжин авч өгсөн билээ.',
      'Та тэднийг Тэнгэрбурханы маань төлөөх',
      'Хаанчлал ба тахилч нар болгосон.',
      'Тэд дэлхий дээр хаанчлах болно.',
      'Нядлуулсан Хурга',
      'Хүч, баялаг, мэргэн ухаан,',
      'Сүр хүч, хүндэтгэл,',
      'Алдар ба',
      'магтаалыг авах зохистой нь Тэр мөн.',
    ]
    const richSlots = [
      {
        block: richStanzaBlock(richTrailing[0], richTrailing.slice(1)),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: [
          ...richTrailing.slice(0, 14),
          'Алдар ба магтаалыг авах зохистой нь Тэр мөн.',
        ],
        phrases: richTrailing
          .slice(0, 14)
          .map((_, i) => ({ lineRange: [i, i], indent: 0 }))
          .concat([{ lineRange: [14, 14], indent: 0 }]),
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Last phrase covers the merged pair: rich windows 14+15.
    const lastPhrase = out.updates[0].phrases[out.updates[0].phrases.length - 1]
    expect(lastPhrase).toEqual({ lineRange: [14, 15], indent: 0 })
  })

  // ── End-to-end via injectPhrasesIntoRichData (atomic gate path) ──────
  // The same shape but exercised through the production entry point used
  // by both `scripts/build-phrases-into-rich.mjs` CLI and
  // `scripts/dev/process-fx11-phase2-batch.mjs` batch processor.
  it('injectPhrasesIntoRichData PASSES the atomic gate when wrap-bridge resolves the only mismatch', () => {
    const richData = {
      'Wrap Ref': richRef([
        richStanzaBlock('Эхний', [
          'Та Өөрийн нүүр царайг нуусанд би сэтгэл зовж байв.',
          'Сүүлчийн',
        ]),
      ]),
    }
    const result = injectPhrasesIntoRichData(richData, [
      {
        ref: 'Wrap Ref',
        stanzas: [
          {
            stanzaIndex: 0,
            lines: [
              'Эхний',
              'Та Өөрийн нүүр царайг нуусанд',
              'би сэтгэл зовж байв.',
              'Сүүлчийн',
            ],
            phrases: [
              { lineRange: [0, 0], indent: 0 },
              { lineRange: [1, 2], indent: 0 },
              { lineRange: [3, 3], indent: 0 },
            ],
          },
        ],
      },
    ])
    expect(result.ok).toBe(true)
    const blocks = result.data['Wrap Ref'].stanzasRich.blocks
    expect(blocks[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
    ])
  })
})

// @fr FR-161 NFR-009j
//
// F-X11 Phase 2-D (#463) — translatePhrases() lineRange dedup.
//
// The fix lives inside the (un-exported) translatePhrases() helper, so
// the test exercises it through `planRefUpdates` (which feeds windowed
// entries to translatePhrases and returns the resulting phrases array).
//
// The two production-shape scenarios (Psalm 16:1-6 b0 and
// Psalm 137:1-6 b1) collapsed two extractor phrases onto the same
// rich-relative `[k, k]` after the upstream coord→windowIndex translation,
// surfacing as duplicate `{ lineRange: [3, 3] }` (resp. `[2, 2]`) entries
// in the injected phrases list. Pinning both shapes here guards against
// the user-visible NFR-009j 0-OVERLAP regression.
describe('translatePhrases lineRange dedup (F-X11 Phase 2-D #463)', () => {
  it('drops a duplicate single-line entry when two extractor phrases collapse onto the same rich line', () => {
    // Production-minimal shape: 4 rich lines + 5 extractor phrases where
    // phrases[3] and phrases[4] both target line index 3 (the same
    // single rich line). Without dedup the planner emits both as
    // `{ lineRange: [3, 3], ... }` — the renderer would print the line
    // twice. Mirrors the Psalm 16:1-6 b0 #457-flagged shape (phrases[3]
    // and phrases[4] both `[3, 3]`).
    const richSlots = [
      {
        block: richStanzaBlock('Намайг хамгаалаач', [
          'Учир нь би',
          'Би ЭЗЭНд',
          'Танаас өөр',
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Намайг хамгаалаач', 'Учир нь би', 'Би ЭЗЭНд', 'Танаас өөр'],
        // Two source phrases both terminating at line 3. The dedup pass
        // must keep the first survivor (in sorted order) and drop the
        // second.
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates).toHaveLength(1)
    // Critical invariant: every emitted lineRange tuple is unique.
    const ranges = out.updates[0].phrases.map((p) =>
      `${p.lineRange[0]}:${p.lineRange[1]}`,
    )
    expect(new Set(ranges).size).toBe(ranges.length)
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 2], indent: 0 },
      { lineRange: [3, 3], indent: 0 },
    ])
  })

  it('Psalm 16:1-6 b0 production shape — 4 rich lines + duplicate `[3, 3]` collapses to 4 unique phrases', () => {
    // Mirrors the dispatch's call-out: rich block has 4 lines and the
    // extractor produces 5 phrases where phrases[3] + phrases[4] both
    // map to line 3. The injected phrases list must carry exactly 4
    // unique entries with `[3, 3]` appearing once.
    const richSlots = [
      {
        block: richStanzaBlock('Line A', ['Line B', 'Line C', 'Line D']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Line A', 'Line B', 'Line C', 'Line D'],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toHaveLength(4)
    expect(out.updates[0].phrases.filter((p) => p.lineRange[0] === 3)).toHaveLength(1)
  })

  it('Psalm 137:1-6 b1 production shape — duplicate `[2, 2]` collapses to 4 unique phrases', () => {
    const richSlots = [
      {
        block: richStanzaBlock('Line A', ['Line B', 'Line C', 'Line D']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Line A', 'Line B', 'Line C', 'Line D'],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
          { lineRange: [3, 3], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toHaveLength(4)
    expect(out.updates[0].phrases.filter((p) => p.lineRange[0] === 2)).toHaveLength(1)
  })

  it('keeps multi-line phrases distinct from the single-line backfill of the same start index', () => {
    // Defensive: a multi-line phrase `[2, 3]` should NOT be dropped by a
    // later single-line `[2, 2]` extractor phrase — they have different
    // lineRange tuples even though they share start index 2.
    const richSlots = [
      {
        block: richStanzaBlock('Line A', ['Line B', 'Line C', 'Line D']),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Line A', 'Line B', 'Line C', 'Line D'],
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 3], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    // Three explicit phrases — none should be dedup'd. (No backfill
    // needed: lines 0..3 are all covered.)
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 0 },
      { lineRange: [1, 1], indent: 0 },
      { lineRange: [2, 3], indent: 0 },
    ])
  })
})

// @fr FR-161 NFR-009j
//
// F-X11 Phase 2-D (#463) — phrase.indent propagation from rich line.indent.
//
// Per dispatch-#463 §B (Psalm 30:2-13 indent fix): when a rich block's
// lines all carry `line.indent === 1` (e.g. an antiphon block sitting
// one visual-indent step above the column baseline), the extractor's
// own phrase.indent is 0 (because the extractor's per-column baseline
// detection silently absorbs the entire block's indent). The renderer
// then renders flush-left. The fix: when every rich line covered by a
// phrase shares one numeric `line.indent`, override `phrase.indent` to
// match.
describe('planRefUpdates phrase.indent propagation (F-X11 Phase 2-D #463)', () => {
  function richStanzaBlockWithIndents(linesAndIndents) {
    return {
      kind: 'stanza',
      lines: linesAndIndents.map(([text, indent]) => ({
        spans: [{ kind: 'text', text }],
        indent,
      })),
    }
  }

  it('overrides phrase.indent=0 to match the rich line.indent=1 when uniform across the phrase', () => {
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([
          ['Antiphon line A', 1],
          ['Antiphon line B', 1],
          ['Antiphon line C', 1],
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Antiphon line A', 'Antiphon line B', 'Antiphon line C'],
        // Extractor saw the whole block at its own baseline → indent 0.
        phrases: [
          { lineRange: [0, 0], indent: 0 },
          { lineRange: [1, 1], indent: 0 },
          { lineRange: [2, 2], indent: 0 },
        ],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    // After propagation every phrase should carry indent=1 — matching
    // the rich line's indent so the renderer's pl-12 path engages.
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 1 },
      { lineRange: [1, 1], indent: 1 },
      { lineRange: [2, 2], indent: 1 },
    ])
  })

  it('preserves a per-phrase per-line indent disagreement when rich lines mix indent values within one phrase', () => {
    // Mixed-indent phrase: don't silently widen. Keep the extractor's
    // value when uniformity check fails.
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([
          ['Mixed A', 1],
          ['Mixed B', 0],
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Mixed A', 'Mixed B'],
        // One phrase straddles two rich lines with different indents.
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toEqual([{ lineRange: [0, 1], indent: 0 }])
  })

  it('Psalm 30:2-13 b4 mixed-indent shape — every uniform phrase tracks its rich line.indent', () => {
    // 10-line block, indents [1,1,1,1,1,1,1,1,0,1]: 8 of 10 are at
    // indent 1, line 8 at indent 0, line 9 at indent 1. Each extractor
    // single-line phrase should propagate the matching line.indent.
    const linesAndIndents = [
      ['L0', 1], ['L1', 1], ['L2', 1], ['L3', 1], ['L4', 1],
      ['L5', 1], ['L6', 1], ['L7', 1], ['L8', 0], ['L9', 1],
    ]
    const richSlots = [
      { block: richStanzaBlockWithIndents(linesAndIndents), blockIndex: 0 },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: linesAndIndents.map(([t]) => t),
        phrases: linesAndIndents.map((_, i) => ({ lineRange: [i, i], indent: 0 })),
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    const expectedIndents = linesAndIndents.map(([, ind]) => ind)
    const actualIndents = out.updates[0].phrases.map((p) => p.indent)
    expect(actualIndents).toEqual(expectedIndents)
  })
})

// @fr FR-161 NFR-009j
//
// F-X11 Phase 2-F (#477) — skip-if-explicit guard for the propagation
// rule above. Phase 2-D (#463) introduced the rule to fix Pattern A
// (phrase.indent=0 + uniform line.indent=1 → propagate). Audit #475
// (docs/audit-indent-mismatch-2026-05-10.md) showed that the rule also
// silently flattens intentional non-zero phrase.indent values that
// disagree with the uniform line.indent — Pattern B (Roman 'I'/'II'
// centered section markers at line.indent=0 + phrase.indent=2) and
// Pattern C (short hanging-indent wrap-continuation at line.indent=0 +
// phrase.indent=1). The guard preserves these explicit non-zero values
// while still allowing Pattern A propagation and the equal-value no-op.
describe('planRefUpdates phrase.indent skip-if-explicit guard (F-X11 Phase 2-F #477)', () => {
  function richStanzaBlockWithIndents(linesAndIndents) {
    return {
      kind: 'stanza',
      lines: linesAndIndents.map(([text, indent]) => ({
        spans: [{ kind: 'text', text }],
        indent,
      })),
    }
  }

  it('Pattern B — preserves phrase.indent=2 when uniform line.indent=0 (Roman centered marker)', () => {
    // Pattern B: a single 'I'/'II' Roman section marker line — extractor
    // emits phrase.indent=2 (centered above column baseline) but the
    // rich line carries indent=0 (no rich-side indent applied to a
    // single marker token). Without the guard, the propagation rule
    // would overwrite phrase.indent to 0 → renderer flushes left → loses
    // the centered visual cue.
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([['I', 0]]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['I'],
        phrases: [{ lineRange: [0, 0], indent: 2 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 2 },
    ])
  })

  it('Pattern C — preserves phrase.indent=1 when uniform line.indent=0 (short hanging-indent wrap)', () => {
    // Pattern C: a wrap-continuation phrase that visually hangs one
    // step indented in the PDF but whose rich line stays at indent 0.
    // Without the guard, phrase.indent collapses to 0 and the renderer
    // loses the hanging visual.
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([['Continuation snippet', 0]]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Continuation snippet'],
        phrases: [{ lineRange: [0, 0], indent: 1 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 1 },
    ])
  })

  it('Pattern A — still propagates phrase.indent=0 → 1 when uniform line.indent=1 (regression check)', () => {
    // Pattern A is the original Phase 2-D #463 fix scenario. The Phase
    // 2-F guard MUST NOT regress this — Pattern A is the dominant
    // 96.4% (319/331) case in the audit and is the behavior the
    // 29-SAFE reinject relies on.
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([
          ['Body line A', 1],
          ['Body line B', 1],
        ]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Body line A', 'Body line B'],
        phrases: [{ lineRange: [0, 1], indent: 0 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 1], indent: 1 },
    ])
  })

  it('equal — keeps phrase.indent=1 when uniform line.indent=1 (no-op equivalent)', () => {
    // Sanity case: phrase.indent already equals line.indent. The guard
    // permits propagation (because phrase.indent === headIndent disables
    // the explicit-non-zero branch), and the propagation step is a
    // no-op. This ensures the guard does not introduce any side effect
    // for the most common already-aligned shape.
    const richSlots = [
      {
        block: richStanzaBlockWithIndents([['Aligned line', 1]]),
        blockIndex: 0,
      },
    ]
    const ext = [
      {
        stanzaIndex: 0,
        lines: ['Aligned line'],
        phrases: [{ lineRange: [0, 0], indent: 1 }],
      },
    ]
    const out = planRefUpdates(richSlots, ext)
    expect(out.issues).toEqual([])
    expect(out.updates[0].phrases).toEqual([
      { lineRange: [0, 0], indent: 1 },
    ])
  })
})
