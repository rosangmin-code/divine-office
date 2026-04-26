/**
 * Unit tests for FR-160-A4: detectRefrainLines + buildPsalterStanzasRich
 * allowlist consultation.
 *
 * detectRefrainLines (rich-builder.mjs Layer F) accepts an optional
 * `{ ref, allowlist }` pair. When `ref` is in `allowlist`, the
 * `forced_lines` (PDF/GILH evidence-based authentic refrain lines) are
 * unioned into the threshold-based detection result. This catches
 * authentic 2-rep refrains that fail the threshold=3 over-cautious gate.
 *
 * allowlist accepts:
 *   - Map<string, string[]>      (build script form)
 *   - Map<string, Set<string>>   (variant)
 *   - Record<string, string[]>   (test convenience / plain object)
 *
 * denylist takes precedence — denylisted refs never reach allowlist eval.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  detectRefrainLines,
  buildPsalterStanzasRich,
} from '../parsers/rich-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const ALLOWLIST_PATH = resolve(REPO_ROOT, 'src/data/loth/refrain-allowlist.json')

// PDF p.93 Psalm 24:1-10 vv 7-10 antiphonal Q&A — three forced lines
// repeating in a 2-stanza Q&A structure. Pre-FR-160-A4: threshold=3
// missed all 3 (each line appears exactly 2x). After allowlist consult:
// all 3 forced lines tagged role=refrain.
const PSALM_24_STANZAS = [
  [
    'Гулдан хаалганууд аа, толгойгоо өргөж,',
    'Мөнхийн үүднүүд ээ, өргөгдөгтүн!',
    'Сүр жавхлангийн энэ Хаан хэн бэ?',
    'ЭЗЭН бол сүр жавхлангийн Хаан мөн.',
  ],
  [
    'Гулдан хаалганууд аа, толгойгоо өргөж,',
    'Мөнхийн үүднүүд ээ, өргөгдөгтүн!',
    'Сүр жавхлангийн энэ Хаан хэн бэ?',
    'Түмэн цэргийн ЭЗЭН бол',
    'сүр жавхлангийн Хаан мөн.',
  ],
]

// Same pattern but ref NOT in allowlist — verifies allowlist is opt-in.
const NEGATIVE_REF = 'Psalm 999:9-9'

describe('FR-160-A4 detectRefrainLines allowlist consult', () => {
  it('unions forced_lines into detection when ref is in allowlist (Map<ref, string[]>)', () => {
    const allowlist = new Map([
      [
        'Psalm 24:1-10',
        [
          'Гулдан хаалганууд аа, толгойгоо өргөж',
          'Мөнхийн үүднүүд ээ, өргөгдөгтүн',
          'Сүр жавхлангийн энэ Хаан хэн бэ?',
        ],
      ],
    ])
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: 'Psalm 24:1-10',
      allowlist,
    })
    expect(refrains.has('Гулдан хаалганууд аа, толгойгоо өргөж')).toBe(true)
    expect(refrains.has('Мөнхийн үүднүүд ээ, өргөгдөгтүн')).toBe(true)
    expect(refrains.has('Сүр жавхлангийн энэ Хаан хэн бэ?')).toBe(true)
  })

  it('accepts Map<ref, Set<string>> form', () => {
    const allowlist = new Map([
      [
        'Psalm 24:1-10',
        new Set([
          'Гулдан хаалганууд аа, толгойгоо өргөж',
          'Мөнхийн үүднүүд ээ, өргөгдөгтүн',
          'Сүр жавхлангийн энэ Хаан хэн бэ?',
        ]),
      ],
    ])
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: 'Psalm 24:1-10',
      allowlist,
    })
    expect(refrains.size).toBe(3)
  })

  it('accepts plain Record<ref, string[]> form (test convenience)', () => {
    const allowlist = {
      'Psalm 24:1-10': [
        'Гулдан хаалганууд аа, толгойгоо өргөж',
        'Мөнхийн үүднүүд ээ, өргөгдөгтүн',
        'Сүр жавхлангийн энэ Хаан хэн бэ?',
      ],
    }
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: 'Psalm 24:1-10',
      allowlist,
    })
    expect(refrains.size).toBe(3)
  })

  it('does not union when ref is NOT in allowlist', () => {
    const allowlist = new Map([['Psalm 24:1-10', ['some line']]])
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: NEGATIVE_REF,
      allowlist,
    })
    // No threshold hits in PSALM_24_STANZAS (each line appears ≤2x) and
    // ref not in allowlist → empty result.
    expect(refrains.size).toBe(0)
  })

  it('does nothing when allowlist is null (backward compat)', () => {
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: 'Psalm 24:1-10',
      allowlist: null,
    })
    expect(refrains.size).toBe(0)
  })

  it('does nothing when ref is null (no-op gate)', () => {
    const allowlist = new Map([['Psalm 24:1-10', ['line']]])
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: null,
      allowlist,
    })
    expect(refrains.size).toBe(0)
  })

  it('denylist takes precedence over allowlist (defensive)', () => {
    // If a ref appears in both denylist and allowlist (logical error /
    // data drift), denylist wins → empty Set. Prevents allowlist from
    // re-introducing a documented false-positive.
    const denylist = new Set(['Psalm 24:1-10'])
    const allowlist = new Map([
      [
        'Psalm 24:1-10',
        ['Гулдан хаалганууд аа, толгойгоо өргөж'],
      ],
    ])
    const refrains = detectRefrainLines(PSALM_24_STANZAS, {
      ref: 'Psalm 24:1-10',
      denylist,
      allowlist,
    })
    expect(refrains.size).toBe(0)
  })

  it('threshold-based detection still merges with allowlist union (additive)', () => {
    // Stanza repeats line 'X' 3x AND has a forced_line 'Y' from allowlist
    // → result has both X (threshold) and Y (allowlist).
    const stanzas = [
      ['Repeated', 'Forced'],
      ['Repeated'],
      ['Repeated', 'Other'],
    ]
    const allowlist = new Map([['ref-X', ['Forced']]])
    const refrains = detectRefrainLines(stanzas, {
      ref: 'ref-X',
      allowlist,
    })
    expect(refrains.has('Repeated')).toBe(true)
    expect(refrains.has('Forced')).toBe(true)
  })

  it('forced_line normalization matches threshold detection (refrainKey trim/punctuation strip)', () => {
    // forced_lines may be authored without trailing punctuation, but
    // detection uses refrainKey() which strips ".,!–—-" — both branches
    // must use the same normalization so set keys match.
    const stanzas = [
      ['Хариу!', 'Бусад'],
      ['Хариу.', 'Бусад'],
    ]
    // forced_line uses different trailing punctuation than stanza lines.
    const allowlist = new Map([['ref-Y', ['Хариу,']]])
    const refrains = detectRefrainLines(stanzas, {
      ref: 'ref-Y',
      allowlist,
    })
    // refrainKey strips trailing punct → all collapse to 'Хариу'.
    expect(refrains.has('Хариу')).toBe(true)
  })
})

describe('FR-160-A4 buildPsalterStanzasRich allowlist propagation', () => {
  it('produces forced refrain-tagged lines in stanza output', () => {
    const allowlist = new Map([
      [
        'Psalm 24:1-10',
        [
          'Гулдан хаалганууд аа, толгойгоо өргөж',
          'Мөнхийн үүднүүд ээ, өргөгдөгтүн',
          'Сүр жавхлангийн энэ Хаан хэн бэ?',
        ],
      ],
    ])
    const result = buildPsalterStanzasRich({
      stanzas: PSALM_24_STANZAS,
      ref: 'Psalm 24:1-10',
      allowlist,
    })
    const refrainLines = result.blocks
      .filter((b) => b.kind === 'stanza')
      .flatMap((b) => b.lines || [])
      .filter((ln) => ln.role === 'refrain')
    // 3 forced lines × 2 stanza occurrences = 6 tagged lines.
    expect(refrainLines.length).toBe(6)
    expect(result.pass).toBe(true)
  })

  it('passes through both denylist and allowlist concurrently', () => {
    // Different refs — denylist for one, allowlist for another. Same
    // builder invocation only affects the one matching its ref.
    const denylist = new Set(['Psalm 150:1-6'])
    const allowlist = new Map([
      ['Psalm 24:1-10', ['Гулдан хаалганууд аа, толгойгоо өргөж']],
    ])
    const result = buildPsalterStanzasRich({
      stanzas: PSALM_24_STANZAS,
      ref: 'Psalm 24:1-10',
      denylist,
      allowlist,
    })
    expect(result.refrains.size).toBeGreaterThan(0)
    expect(result.pass).toBe(true)
  })
})

describe('FR-160-A4 refrain-allowlist.json schema validation', () => {
  it('exists at canonical location', () => {
    expect(existsSync(ALLOWLIST_PATH)).toBe(true)
  })

  it('has valid schema — entries[].{ref, forced_lines, evidence_pdf, liturgical_basis, classified_at}', () => {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
    expect(Array.isArray(raw.entries)).toBe(true)
    expect(raw.entries.length).toBeGreaterThanOrEqual(6)
    for (const entry of raw.entries) {
      expect(typeof entry.ref).toBe('string')
      expect(entry.ref.length).toBeGreaterThan(0)
      expect(Array.isArray(entry.forced_lines)).toBe(true)
      expect(entry.forced_lines.length).toBeGreaterThanOrEqual(1)
      for (const line of entry.forced_lines) {
        expect(typeof line).toBe('string')
        expect(line.length).toBeGreaterThan(0)
      }
      expect(typeof entry.evidence_pdf).toBe('string')
      expect(typeof entry.liturgical_basis).toBe('string')
      expect(typeof entry.classified_at).toBe('string')
    }
  })

  it('contains all 6 task #120 confirmed entries', () => {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
    const refs = new Set(raw.entries.map((e) => e.ref))
    for (const expected of [
      'Psalm 24:1-10',
      'Psalm 116:10-19',
      'Psalm 8:1-10',
      'Psalm 42:2-6',
      'Psalm 67:2-8',
      'Psalm 99:1-9',
    ]) {
      expect(refs.has(expected)).toBe(true)
    }
  })
})
