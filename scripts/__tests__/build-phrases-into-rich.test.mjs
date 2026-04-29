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
