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
