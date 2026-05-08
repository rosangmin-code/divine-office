/**
 * F-X9 fix B (#373) — defensive guard tests for the FR-160-C psalter-headers
 * renderer. Covers the unit-level `sanitizePsalmHeaderPreface` helper across:
 *
 *   - clean data (NOP)            — guard must not mangle body-only preface_text
 *   - title-prefix dirty data     — strip `psalm.title` prefix + separator punct
 *   - attribution-suffix dirty   — strip trailing `(attribution)` / `(attrib).`
 *   - both dirty                  — combined strip
 *   - regex-meta safety           — escapeRegExp guards `(`, `.`, `:` in attrib
 *   - empty/null edge cases       — no crash on empty title/preface
 *
 * Plus 2 integration-level renderer asserts via `react-dom/server` proving
 * the rendered `<p data-role="psalm-header-rich">` does not double-emit
 * the title or attribution after the guard.
 *
 * Pattern adapted from existing `psalm-block-phrases.test.ts`.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PsalmBlock, sanitizePsalmHeaderPreface } from '../psalm-block'
import { SettingsProvider } from '@/lib/settings'
import type { AssembledPsalm, PsalterHeaderRich } from '@/lib/types'

function makePsalm(overrides: Partial<AssembledPsalm> = {}): AssembledPsalm {
  return {
    psalmType: 'psalm',
    reference: 'Psalm test',
    antiphon: '',
    verses: [],
    gloriaPatri: false,
    ...overrides,
  }
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(createElement(SettingsProvider, null, node))
}

// @fr FR-160-C
describe('sanitizePsalmHeaderPreface — F-X9 defensive guard (unit)', () => {
  it('clean data — NOP when preface_text is body-only', () => {
    const result = sanitizePsalmHeaderPreface(
      'Иймээс…та нар мэдэгтүн',
      'Бүх үндэстний дундах хүмүүс Эзэнд мөргөх болно',
      'Үйлс 28:28',
    )
    expect(result).toBe('Иймээс…та нар мэдэгтүн')
  })

  it('strips title prefix when preface_text starts with psalm.title', () => {
    // Psalm 149 spot-check (handoff §1.1): preface starts with title-line.
    const result = sanitizePsalmHeaderPreface(
      'Тэнгэрбурханы ариун ард түмний баяр хөөр Шашны хөвгүүд, шинэ ард түмний хүүхдүүд ээ',
      'Тэнгэрбурханы ариун ард түмний баяр хөөр',
      'Хэсихиус',
    )
    expect(result).toBe('Шашны хөвгүүд, шинэ ард түмний хүүхдүүд ээ')
  })

  it('strips title prefix + separator period (Psalm 11 shape)', () => {
    // Psalm 11 spot-check (handoff §1.1): preface starts with `title.` then body.
    const result = sanitizePsalmHeaderPreface(
      'Тэнгэрбурхан бол зөв шударга хүний хөрвөшгүй бат түшиг мөн. Зөвт хүн цатгагдах болно',
      'Тэнгэрбурхан бол зөв шударга хүний хөрвөшгүй бат түшиг мөн',
      'Матай 5:6',
    )
    expect(result).toBe('Зөвт хүн цатгагдах болно')
  })

  it('strips trailing `(attribution)` suffix', () => {
    // Psalm 149 with attribution-only suffix (no period).
    const result = sanitizePsalmHeaderPreface(
      'Шашны хөвгүүд… Хаандаа баярлацгаа! (Хэсихиус)',
      'Тэнгэрбурханы ариун ард түмний баяр хөөр',
      'Хэсихиус',
    )
    expect(result).toBe('Шашны хөвгүүд… Хаандаа баярлацгаа!')
  })

  it('strips trailing `(attribution).` suffix (period after closing paren)', () => {
    // Psalm 114 spot-check (handoff §1.1): suffix has period after `)`.
    const result = sanitizePsalmHeaderPreface(
      'Ариун угаалын… Египетээс гарсан юм (Гэгээн Августин).',
      'Израильчууд Египетийн боолчлолоос чөлөөлөгдсөн байна',
      'Гэгээн Августин',
    )
    expect(result).toBe('Ариун угаалын… Египетээс гарсан юм')
  })

  it('strips BOTH title prefix and attribution suffix in one call', () => {
    // Psalm 67 spot-check (handoff §1.1): both quirks on the same entry.
    const result = sanitizePsalmHeaderPreface(
      'Бүх үндэстний дундах хүмүүс Эзэнд мөргөх болно Иймээс… та нар мэдэгтүн (Үйлс 28:28).',
      'Бүх үндэстний дундах хүмүүс Эзэнд мөргөх болно',
      'Үйлс 28:28',
    )
    expect(result).toBe('Иймээс… та нар мэдэгтүн')
  })

  it('escapeRegExp guards attribution containing regex meta-characters', () => {
    // Bible refs use `:` (regex-safe) but defensive: hypothetical attribution
    // with `(`, `.`, `+` must not break the regex.
    const result = sanitizePsalmHeaderPreface(
      'Some body. (Лук 1.1+ (alt))',
      undefined,
      'Лук 1.1+ (alt)',
    )
    expect(result).toBe('Some body.')
  })

  it('does NOT strip when preface_text does not start with title (no false-positive)', () => {
    const result = sanitizePsalmHeaderPreface(
      'Some unrelated body text',
      'Тэнгэрбурханы ариун ард түмний баяр хөөр',
      'Хэсихиус',
    )
    expect(result).toBe('Some unrelated body text')
  })

  it('handles empty / undefined title without crashing', () => {
    expect(sanitizePsalmHeaderPreface('Body only.', undefined, 'Хэсихиус')).toBe(
      'Body only.',
    )
    expect(sanitizePsalmHeaderPreface('Body only.', '', 'Хэсихиус')).toBe(
      'Body only.',
    )
    // Whitespace-only title — trimmed to '', so guard skips title strip.
    expect(sanitizePsalmHeaderPreface('Body only.', '   ', 'Хэсихиус')).toBe(
      'Body only.',
    )
  })

  it('handles empty preface_text without crashing', () => {
    expect(sanitizePsalmHeaderPreface('', 'Some title', 'Some attrib')).toBe('')
  })
})

// @fr FR-160-C
describe('PsalmBlock renderer — F-X9 fix B integration (#373)', () => {
  function makeHeaderRich(overrides: Partial<PsalterHeaderRich> = {}): PsalterHeaderRich {
    return {
      kind: 'patristic_preface',
      attribution: 'Хэсихиус',
      preface_text: 'Body text',
      ...overrides,
    }
  }

  it('does NOT double-emit psalm.title when catalog has title-prefix in preface_text', () => {
    const psalm = makePsalm({
      title: 'Тэнгэрбурханы ариун ард түмний баяр хөөр',
      headerRich: makeHeaderRich({
        preface_text:
          'Тэнгэрбурханы ариун ард түмний баяр хөөр Шашны хөвгүүд, шинэ ард түмний хүүхдүүд ээ Христ өөрсдийн Хаандаа баярлацгаа! (Хэсихиус)',
      }),
    })
    const html = render(createElement(PsalmBlock, { psalm }))
    // Title appears exactly once in rendered HTML (in the dedicated <p> at line
    // 24-26, NOT as a prefix inside `data-role="psalm-header-rich"`).
    const titleOccurrences = (
      html.match(/Тэнгэрбурханы ариун ард түмний баяр хөөр/g) ?? []
    ).length
    expect(titleOccurrences).toBe(1)
  })

  it('does NOT double-emit attribution when catalog has trailing `(attribution)`', () => {
    const psalm = makePsalm({
      title: 'Some title',
      headerRich: makeHeaderRich({
        preface_text: 'Body sentence ending. (Хэсихиус)',
      }),
    })
    const html = render(createElement(PsalmBlock, { psalm }))
    // Attribution string appears exactly once (inside the dedicated
    // <span data-role="psalm-header-attribution">), NOT a second time inside
    // the body text portion.
    const attribOccurrences = (html.match(/Хэсихиус/g) ?? []).length
    expect(attribOccurrences).toBe(1)
    // The dedicated attribution span is still rendered.
    expect(html).toContain('data-role="psalm-header-attribution"')
  })

  it('clean data still renders correctly (NOP path — body + (attribution) once each)', () => {
    const psalm = makePsalm({
      title: 'Some title',
      headerRich: makeHeaderRich({
        preface_text: 'Body sentence ending.',
        attribution: 'Хэсихиус',
      }),
    })
    const html = render(createElement(PsalmBlock, { psalm }))
    expect(html).toContain('Body sentence ending.')
    expect(html).toContain('data-role="psalm-header-attribution"')
    // Single attribution emit.
    expect((html.match(/Хэсихиус/g) ?? []).length).toBe(1)
    // Single title emit.
    expect((html.match(/Some title/g) ?? []).length).toBe(1)
  })
})
