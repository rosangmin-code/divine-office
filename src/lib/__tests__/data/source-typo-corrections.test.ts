import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import week1 from '../../../data/loth/psalter/week-1.json'
import solemnities from '../../../data/loth/sanctoral/solemnities.json'
import gilh from '../../../data/loth/gilh.json'

const repoRoot = process.cwd()

describe('GOAL #128 D3 source-typo and fidelity correction guards', () => {
  // @fr FR-NEW (#128 D3)
  it('restores Week 1 Thursday Vespers concluding prayer to PDF-fidelity "Тиймийн тул"', () => {
    const prayer = (week1 as {
      days: Record<string, { vespers: { concludingPrayer: string } }>
    }).days.THU.vespers.concludingPrayer

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
  it('records only PDF-deviation rows in the ledger, not B1/B2 fidelity restores', () => {
    const ledger = readFileSync(
      resolve(repoRoot, 'docs/data/source-typo-ledger.md'),
      'utf-8',
    )

    expect(ledger).toContain('STC-002')
    expect(ledger).toContain('psalter-headers.rich.json')
    expect(ledger).toContain('Гэнгэрбурханд')
    expect(ledger).toContain('Тэнгэрбурханд')
    expect(ledger).not.toContain('week-1.json')
    expect(ledger).not.toContain('solemnities.json')
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
    const paragraph = intro8?.paragraphs.join('\n') ?? ''
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
