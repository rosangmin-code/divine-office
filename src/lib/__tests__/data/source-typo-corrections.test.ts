import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import week1 from '../../../data/loth/psalter/week-1.json'
import solemnities from '../../../data/loth/sanctoral/solemnities.json'
import gilh from '../../../data/loth/gilh.json'

const repoRoot = process.cwd()

describe('GOAL #128 D3 source-typo and fidelity correction guards', () => {
  // @fr FR-NEW (#128 D3)
  // 2026-10-15: GOAL #128 filed this as a data-entry divergence (B1), but the
  // printed page (book p.140) reads «туд» — it is a book typo the data
  // corrects, now ledgered as STC-007.
  it('corrects the Week 1 Thursday Vespers concluding prayer book typo «туд» to "Тиймийн тул"', () => {
    const prayer = week1.days.THU.vespers.concludingPrayer

    expect(prayer).toContain('Тиймийн тул өглөө болоход')
    expect(prayer).not.toContain('Тиймийн туд')
  })

  // @fr FR-NEW (#128 D3)
  it('restores Assumption and Immaculate Conception Magnificat antiphons to "Харагтун"', () => {
    const data = solemnities as Record<
      string,
      { vespers?: { gospelCanticleAntiphon?: string } }
    >
    const assumption = data['08-15'].vespers!.gospelCanticleAntiphon!
    const immaculateConception = data['12-08'].vespers!.gospelCanticleAntiphon!

    expect(assumption).toContain('Харагтун, энэ цагаас хойш')
    expect(immaculateConception).toContain('Харагтун, энэ цагаас хойш')
    expect(assumption).not.toContain('Харагтүн')
    expect(immaculateConception).not.toContain('Харагтүн')
  })

  // @fr FR-NEW (#128 D3)
  it('records only PDF-deviation rows in the ledger: B1 «туд» is one (printed p.140), B2 «Харагтүн» is not', () => {
    const ledger = readFileSync(
      resolve(repoRoot, 'docs/data/source-typo-ledger.md'),
      'utf-8',
    )

    expect(ledger).toContain('STC-002')
    expect(ledger).toContain('psalter-headers.rich.json')
    expect(ledger).toContain('Гэнгэрбурханд')
    expect(ledger).toContain('Тэнгэрбурханд')
    // B1 was reclassified 2026-10-15 from the printed page: the book itself
    // prints «туд», so the week-1 correction is a PDF deviation (STC-007).
    expect(ledger).toContain('STC-007')
    expect(ledger).toContain('Тиймийн / туд')
    // B2 stays a fidelity restore — the book prints «Харагтун» (pp.833, 842).
    // (The file name `solemnities.json` is no proxy for B2 any more: STC-019
    // records a different deviation in that file.)
    expect(ledger).not.toContain('Харагтүн')
  })

  // @fr FR-NEW (#128 D3)
  it('keeps C1 gilh Rom 8:26 "ёолон" unchanged and records the KEEP verdict', () => {
    function findSection(
      node: unknown,
      id: string,
    ): { id: string; paragraphs?: string[] } | undefined {
      if (!node || typeof node !== 'object') return undefined
      const obj = node as {
        id?: string
        paragraphs?: string[]
        sections?: unknown[]
        subsections?: unknown[]
      }
      if (obj.id === id) return obj as { id: string; paragraphs?: string[] }
      for (const child of [...(obj.sections ?? []), ...(obj.subsections ?? [])]) {
        const found = findSection(child, id)
        if (found) return found
      }
      return undefined
    }

    const intro8 = findSection(gilh, 'intro-8')
    if (!intro8?.paragraphs) throw new Error('expected GILH intro-8 paragraphs')
    const paragraph = intro8.paragraphs.join('\n')
    const candidates = readFileSync(
      resolve(repoRoot, 'docs/research/goal128-typo-sweep-candidates.md'),
      'utf-8',
    )

    expect(paragraph).toContain('ёолон бидний төлөө зуучлан гуйдаг')
    expect(candidates).toContain('| C1 | `ёолон` |')
    expect(candidates).toContain('**KEEP**')
    expect(candidates).toContain('ёолох')
  })
})

describe('GOAL #191 PDF-origin space-drop concatenation guards', () => {
  // Recursively collect the raw text of every JSON file under src/data/loth so
  // the guard catches a reintroduced concatenation ANYWHERE in the data bundle,
  // not only in the files corrected by wi-191-003.
  function collectJsonText(dir: string): string {
    let text = ''
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        text += collectJsonText(full)
      } else if (entry.name.endsWith('.json')) {
        text += readFileSync(full, 'utf-8') + '\n'
      }
    }
    return text
  }

  const allData = collectJsonText(resolve(repoRoot, 'src/data/loth'))

  function countOf(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1
  }

  // @fr FR-NEW (#191)
  it('has zero reintroduced PDF-origin space-drop concatenations in src/data', () => {
    // S1: өвчтөнүүдийг + тайвшруулж ; S2: чамайг + ойлгох
    expect(allData).not.toContain('өвчтөнүүдийгтайвшруулж')
    expect(allData).not.toContain('чамайгойлгох')
  })

  // @fr FR-NEW (#191)
  it('keeps the corrected split forms present (S1 12×, S2 2×)', () => {
    expect(countOf(allData, 'өвчтөнүүдийг тайвшруулж')).toBe(12)
    expect(countOf(allData, 'чамайг ойлгох')).toBe(2)
  })

  // @fr FR-NEW (#191)
  it('records both PDF-origin space-drop deviations in the ledger', () => {
    const ledger = readFileSync(
      resolve(repoRoot, 'docs/data/source-typo-ledger.md'),
      'utf-8',
    )
    expect(ledger).toContain('STC-003')
    expect(ledger).toContain('STC-004')
    expect(ledger).toContain('өвчтөнүүдийг тайвшруулж')
    expect(ledger).toContain('чамайг ойлгох')
  })
})

describe('2026-10-29 book typos corrected in the app (STC-025 to STC-028)', () => {
  // The 2026-10-28 errata sheet to the book's editor listed these; the user
  // had the app fixed without waiting for the next printing.
  function collectJsonText(dir: string): string {
    let out = ''
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) out += collectJsonText(full)
      else if (entry.name.endsWith('.json')) out += readFileSync(full, 'utf-8')
    }
    return out
  }
  const allData = collectJsonText(resolve(repoRoot, 'src/data/loth'))
  const countOf = (needle: string) => allData.split(needle).length - 1

  const FIXES: [typo: string, fixed: string, count: number][] = [
    // STC-025 — canticle Rev 11–12, one shared copy (plain + rich)
    ['Тандаа бид бид талархал', 'Тандаа бид талархал өргөе', 2],
    // STC-026 — Psalm 47 header (p.112)
    ['баруун баруунтаа', 'Эцэгийн баруунтаа суудаг', 1],
    ['хаанчлал хаанчлал', 'түүний хаанчлал эцэс', 1],
    // STC-027 — Bible references in two headers (pp.316, 361)
    ['Илчлэл 15,4', 'Илчлэл 15:4', 1],
    ['Илчлэл 22, 12', 'Илчлэл 22:12', 1],
    // STC-028 — missing space after a comma or colon
    ['Есүс Христ,Та', 'Сүр жавхлангийн Хаан Есүс Христ, Та бидний', 1],
    ['Тэнгэрбурхан Эзэн,Та', 'Тэнгэрбурхан Эзэн, Та', 2],
    ['Эзэн минь,Та', 'үл татгалзсан тул - Эзэн минь, Та ерөөлтэй', 1],
    ['болж,Тэнгэрбурхан', 'болж, Тэнгэрбурхан', 1],
    // the Christmas propers (plain + rich) already had the space
    ['Ааба,Аав', 'Ааба, Аав', 3],
    ['Дахилт:Үнэн', 'Дахилт: Үнэн', 6],
    ['Дахилт:Их Эзэн', 'Дахилт: Их Эзэн', 6],
  ]

  it.each(FIXES)('«%s» is gone and «%s» appears %i×', (typo, fixed, count) => {
    expect(countOf(typo)).toBe(0)
    expect(countOf(fixed)).toBe(count)
  })

  it('records the four rows in the ledger', () => {
    const ledger = readFileSync(resolve(repoRoot, 'docs/data/source-typo-ledger.md'), 'utf-8')
    for (const id of ['STC-025', 'STC-026', 'STC-027', 'STC-028']) expect(ledger).toContain(`| ${id} |`)
  })
})
