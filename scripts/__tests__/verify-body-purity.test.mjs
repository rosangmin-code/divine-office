/**
 * Fixture tests for scripts/verify-body-purity.js (GOAL #172 D3).
 *
 * The live catalogs intentionally still fail until D1/D2 land. These tests
 * keep this verifier green by exercising synthetic clean/dirty inputs.
 */

import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const verifier = require('../verify-body-purity.js')
const { checkCatalogs } = verifier

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = resolve(__dirname, '..', 'verify-body-purity.js')

function plainRef(stanzas) {
  return { stanzas }
}

function richLine(text, extras = {}) {
  return {
    spans: [{ kind: 'text', text }],
    indent: 0,
    ...extras,
  }
}

function richRef(stanzas) {
  return {
    stanzasRich: {
      blocks: stanzas.map((lines) => ({
        kind: 'stanza',
        lines: lines.map((line) =>
          typeof line === 'string' ? richLine(line) : richLine(line.text, line),
        ),
      })),
    },
  }
}

function runCheck(plainData, richData = {}) {
  return checkCatalogs({ plainData, richData }).violations
}

describe('verify-body-purity — Class A contamination fixtures', () => {
  it('flags concluding-prayer/doxology tail leaked into plain body', () => {
    const violations = runCheck({
      'Psalm dirty': plainRef([
        ['Тантай, Ариун Сүнсний нэгдэлтэй, үүрд мөнх оршин хаанчилдаг.'],
      ]),
    })

    expect(violations.map((v) => v.code)).toContain('A_DOXOLOGY_TAIL')
  })

  it('flags rubric/page directives leaked into body', () => {
    const violations = runCheck({
      'Psalm dirty': plainRef([
        ['Төгсгөлийг дэг жаягийн дагуу дуусгана, х. 38.'],
      ]),
    })

    expect(violations.map((v) => v.code)).toContain('A_RUBRIC_PAGE_DIRECTIVE')
  })

  it('flags section headers leaked into rich body', () => {
    const violations = runCheck(
      {},
      {
        'Psalm dirty': richRef([['ОРОЙН ДААТГАЛ ЗАЛБИРАЛ', 'Биеийн мөр.']]),
      },
    )

    expect(violations.map((v) => v.code)).toContain('A_SECTION_HEADER')
  })

  it('flags uncited epigraph lines such as the Psalm 5 header leak', () => {
    const violations = runCheck({
      'Psalm 5:2-10, 12-13': plainRef([
        [
          'Үгийг зүрх сэтгэлийнхээ зочин болгон, хүлээн авдаг тэдгээр нь цаглашгүй баяр баясгаланг эдлэх болно',
          'ЭЗЭН, үгэнд минь чих тавьж,',
        ],
      ]),
    })

    expect(violations.map((v) => v.code)).toContain('A_UNQUOTED_EPIGRAPH')
  })
})

describe('verify-body-purity — Class B broken-body fixtures', () => {
  it('flags a lowercase first body line as a mid-verse start signal', () => {
    const violations = runCheck({
      'Psalm 147:12-20': plainRef([
        ['хөндлүүдийг бэхжүүлэн', 'Та нарын дундах хөвгүүдийг чинь ерөөж байна.'],
      ]),
    })

    expect(violations.map((v) => v.code)).toContain('B_LOWERCASE_FIRST_LINE')
  })

  it('flags one-token uppercase orphan after a non-terminal line', () => {
    const violations = runCheck(
      {},
      {
        '1 Chronicles 29:10-13': richRef([
          [
            'Бидний эцэг өвөг Израилийн Тэнгэрбурхан',
            'ЭЗЭН,',
            'Та мөнхийн мөнхөд магтагдах болтугай.',
          ],
        ]),
      },
    )

    expect(violations.map((v) => v.code)).toContain('B_UPPERCASE_ORPHAN')
  })
})

describe('verify-body-purity — clean and allowlist fixtures', () => {
  it('passes clean plain + rich body lines', () => {
    const violations = runCheck(
      {
        'Psalm clean': plainRef([
          ['ЭЗЭН, үгэнд минь чих тавьж,', 'Ёолохыг минь анхаараач.'],
        ]),
      },
      {
        'Psalm clean': richRef([
          ['ЭЗЭН, үгэнд минь чих тавьж,', 'Ёолохыг минь анхаараач.'],
        ]),
      },
    )

    expect(violations).toEqual([])
  })

  it('does not flag Revelation 19 or Daniel refrain/acclamation lines', () => {
    const violations = runCheck(
      {
        'Revelation 19:1-7': plainRef([
          ['Аллэлуяа!', 'Тэнгэрбурханд аврал нигүүлсэл, хүчин чадал'],
        ]),
        'Daniel 3:57-88, 56': plainRef([
          ['Эзэний хамаг бүтээлүүд ээ,', 'Эзэнийг магтагтун.'],
        ]),
      },
      {
        'Revelation 19:1-7': {
          stanzasRich: {
            blocks: [
              {
                kind: 'stanza',
                lines: [
                  richLine('Аллэлуяа!', { role: 'refrain' }),
                  richLine('Тэнгэрбурханд аврал нигүүлсэл, хүчин чадал'),
                ],
              },
            ],
          },
        },
        'Daniel 3:57-88, 56': {
          stanzasRich: {
            blocks: [
              {
                kind: 'stanza',
                lines: [
                  richLine('Эзэний хамаг бүтээлүүд ээ,'),
                  richLine('Эзэнийг магтагтун.', { role: 'refrain' }),
                  richLine('Түүнийг магтаж,', { role: 'refrain' }),
                  richLine('бүгдийн дээр үүрд мөнх өргөмжлөгтүн.', {
                    role: 'refrain',
                  }),
                ],
              },
            ],
          },
        },
      },
    )

    expect(violations).toEqual([])
  })
})

describe('verify-body-purity — CLI smoke', () => {
  function withFixtureFiles(plainData, richData, fn) {
    const base = resolve(process.cwd(), '.body-purity-test')
    mkdirSync(base, { recursive: true })
    const dir = mkdtempSync(join(base, 'fixture-'))
    try {
      const plainPath = join(dir, 'plain.json')
      const richPath = join(dir, 'rich.json')
      writeFileSync(plainPath, JSON.stringify(plainData), 'utf8')
      writeFileSync(richPath, JSON.stringify(richData), 'utf8')
      return fn({ plainPath, richPath })
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(base, { recursive: true, force: true })
    }
  }

  it('exits 1 with --check details for dirty fixtures', () => {
    withFixtureFiles(
      { 'Psalm dirty': plainRef([['хөндлүүдийг бэхжүүлэн']]) },
      {},
      ({ plainPath, richPath }) => {
        const result = spawnSync(
          process.execPath,
          [SCRIPT_PATH, '--plain', plainPath, '--rich', richPath, '--check'],
          { encoding: 'utf8' },
        )

        expect(result.status).toBe(1)
        expect(result.stderr).toContain('[verify-body-purity] FAIL')
        expect(result.stderr).toContain('B_LOWERCASE_FIRST_LINE')
      },
    )
  })

  it('exits 0 for clean fixtures', () => {
    withFixtureFiles(
      { 'Psalm clean': plainRef([['ЭЗЭН, үгэнд минь чих тавьж.']]) },
      {},
      ({ plainPath, richPath }) => {
        const result = spawnSync(
          process.execPath,
          [SCRIPT_PATH, '--plain', plainPath, '--rich', richPath],
          { encoding: 'utf8' },
        )

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('[verify-body-purity] OK')
      },
    )
  })
})
