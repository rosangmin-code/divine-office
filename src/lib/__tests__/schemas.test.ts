import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  PsalterWeekSchema,
  SeasonPropersFileSchema,
  SanctoralFileSchema,
  HymnsFileSchema,
  HymnsIndexFileSchema,
  safeParse,
} from '../schemas'

function load(relPath: string): unknown {
  const full = path.join(process.cwd(), relPath)
  return JSON.parse(fs.readFileSync(full, 'utf-8'))
}

describe('schema acceptance against live data files', () => {
  it('accepts every psalter week file', () => {
    for (const week of [1, 2, 3, 4]) {
      const data = load(`src/data/loth/psalter/week-${week}.json`)
      const parsed = PsalterWeekSchema.safeParse(data)
      if (!parsed.success) {
        console.error(`week-${week}.json issues:`, parsed.error.issues.slice(0, 3))
      }
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts every season propers file', () => {
    const seasons = ['advent', 'christmas', 'lent', 'easter', 'ordinary-time']
    for (const season of seasons) {
      const data = load(`src/data/loth/propers/${season}.json`)
      const parsed = SeasonPropersFileSchema.safeParse(data)
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts sanctoral files', () => {
    for (const file of ['solemnities', 'feasts', 'memorials']) {
      const data = load(`src/data/loth/sanctoral/${file}.json`)
      const parsed = SanctoralFileSchema.safeParse(data)
      expect(parsed.success).toBe(true)
    }
  })

  it('accepts the hymns file', () => {
    const data = load('src/data/loth/ordinarium/hymns.json')
    const parsed = HymnsFileSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })

  it('accepts the hymns index file', () => {
    const data = load('src/data/loth/ordinarium/hymns-index.json')
    const parsed = HymnsIndexFileSchema.safeParse(data)
    expect(parsed.success).toBe(true)
  })
})

describe('safeParse failure contract', () => {
  it('returns null and logs when input violates the schema', () => {
    const errors: unknown[] = []
    const origError = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }
    try {
      const out = safeParse(
        PsalterWeekSchema,
        { week: 5, days: {} }, // week out of range, days missing required day keys
        'test fixture',
      )
      expect(out).toBeNull()
      expect(errors.length).toBeGreaterThan(0)
    } finally {
      console.error = origError
    }
  })
})
