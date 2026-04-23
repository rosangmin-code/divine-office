import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import type { PrayerText } from '../../types'
import { resolveRichOverlay } from '../resolver'
import { __resetRichOverlayCache, loadHymnRichOverlay } from '../rich-overlay'

// File contents keyed by suffix — the resolver uses process.cwd()-prefixed
// absolute paths, so we match by endsWith to stay cwd-agnostic.
let fileContents: Record<string, string> = {}

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  const matchSuffix = (filePath: string): string | null => {
    for (const suffix of Object.keys(fileContents)) {
      if (filePath.endsWith(suffix)) return suffix
    }
    return null
  }
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: ((filePath: string) => {
        const suffix = matchSuffix(filePath)
        if (suffix) return fileContents[suffix]
        const err = new Error(`ENOENT: no such file, open '${filePath}'`) as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      }) as typeof fs.readFileSync,
      statSync: ((filePath: string) => {
        if (!matchSuffix(filePath)) {
          const err = new Error(`ENOENT: no such file, stat '${filePath}'`) as NodeJS.ErrnoException
          err.code = 'ENOENT'
          throw err
        }
        // Constant mtime so the mtime-based cache treats repeat reads as hits.
        return { mtimeMs: 1 } as unknown as fs.Stats
      }) as typeof fs.statSync,
    },
  }
})

function makePrayer(label: string): PrayerText {
  return {
    blocks: [{ kind: 'para', spans: [{ kind: 'text', text: label }] }],
    page: 100,
  }
}

beforeEach(() => {
  fileContents = {}
  __resetRichOverlayCache()
})

describe('resolveRichOverlay', () => {
  it('returns empty object when no rich files exist', () => {
    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'SUN',
      hour: 'lauds',
    })
    expect(overlay).toEqual({})
  })

  it('returns seasonal overlay content when only seasonal file exists', () => {
    const seasonal = {
      concludingPrayerRich: makePrayer('seasonal concluding'),
      intercessionsRich: makePrayer('seasonal intercessions'),
    }
    fileContents['seasonal/ordinary-time/w1-SUN-lauds.rich.json'] = JSON.stringify(seasonal)

    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'SUN',
      hour: 'lauds',
    })

    expect(overlay.concludingPrayerRich).toEqual(seasonal.concludingPrayerRich)
    expect(overlay.intercessionsRich).toEqual(seasonal.intercessionsRich)
  })

  it('sanctoral overrides seasonal for the same field', () => {
    fileContents['seasonal/ordinary-time/w1-SUN-lauds.rich.json'] = JSON.stringify({
      concludingPrayerRich: makePrayer('seasonal concluding'),
    })
    fileContents['sanctoral/06-29-lauds.rich.json'] = JSON.stringify({
      concludingPrayerRich: makePrayer('sanctoral concluding'),
    })

    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'SUN',
      hour: 'lauds',
      sanctoralKey: '06-29',
    })

    expect(overlay.concludingPrayerRich?.blocks[0]).toMatchObject({
      kind: 'para',
      spans: [{ kind: 'text', text: 'sanctoral concluding' }],
    })
  })

  it('merges disjoint fields from seasonal and sanctoral', () => {
    fileContents['seasonal/ordinary-time/w2-MON-vespers.rich.json'] = JSON.stringify({
      concludingPrayerRich: makePrayer('seasonal concluding only'),
    })
    fileContents['sanctoral/08-15-vespers.rich.json'] = JSON.stringify({
      intercessionsRich: makePrayer('sanctoral intercessions only'),
    })

    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '2',
      day: 'MON',
      hour: 'vespers',
      sanctoralKey: '08-15',
    })

    expect(overlay.concludingPrayerRich?.blocks[0]).toMatchObject({
      spans: [{ kind: 'text', text: 'seasonal concluding only' }],
    })
    expect(overlay.intercessionsRich?.blocks[0]).toMatchObject({
      spans: [{ kind: 'text', text: 'sanctoral intercessions only' }],
    })
  })

  it('falls back to psalter commons when seasonal lacks the field', () => {
    fileContents['commons/psalter/w2-WED-lauds.rich.json'] = JSON.stringify({
      shortReadingRich: makePrayer('psalter commons reading'),
    })

    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '15',
      day: 'WED',
      hour: 'lauds',
      psalterWeek: '2',
    })

    expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
      spans: [{ kind: 'text', text: 'psalter commons reading' }],
    })
  })

  it('seasonal overrides psalter commons for the same field', () => {
    fileContents['commons/psalter/w1-SUN-lauds.rich.json'] = JSON.stringify({
      shortReadingRich: makePrayer('psalter commons reading'),
    })
    fileContents['seasonal/advent/w1-SUN-lauds.rich.json'] = JSON.stringify({
      shortReadingRich: makePrayer('advent seasonal reading'),
    })

    const overlay = resolveRichOverlay({
      season: 'ADVENT',
      weekKey: '1',
      day: 'SUN',
      hour: 'lauds',
      psalterWeek: '1',
    })

    expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
      spans: [{ kind: 'text', text: 'advent seasonal reading' }],
    })
  })

  it('loads compline commons only for hour=compline', () => {
    fileContents['commons/compline/MON.rich.json'] = JSON.stringify({
      shortReadingRich: makePrayer('compline mon reading'),
    })

    const complineOverlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'MON',
      hour: 'compline',
    })
    expect(complineOverlay.shortReadingRich?.blocks[0]).toMatchObject({
      spans: [{ kind: 'text', text: 'compline mon reading' }],
    })

    // Same path is NOT consulted for non-compline hours.
    const laudsOverlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'MON',
      hour: 'lauds',
    })
    expect(laudsOverlay.shortReadingRich).toBeUndefined()
  })

  it('skips psalter commons when hour=compline (compline commons takes that slot)', () => {
    fileContents['commons/psalter/w1-MON-compline.rich.json'] = JSON.stringify({
      shortReadingRich: makePrayer('should not be loaded'),
    })

    const overlay = resolveRichOverlay({
      season: 'ORDINARY_TIME',
      weekKey: '1',
      day: 'MON',
      hour: 'compline',
      psalterWeek: '1',
    })

    expect(overlay.shortReadingRich).toBeUndefined()
  })
})

describe('loadHymnRichOverlay', () => {
  it('returns null when the hymn catalog file is missing', () => {
    expect(loadHymnRichOverlay(42)).toBeNull()
  })

  it('reads hymnRich from the central hymn catalog by number', () => {
    const hymnRich = makePrayer('hymn 1 stanza')
    fileContents['prayers/hymns/1.rich.json'] = JSON.stringify({ hymnRich })

    const result = loadHymnRichOverlay(1)
    expect(result).toEqual(hymnRich)
  })

  it('accepts string hymn numbers (for map-style lookups)', () => {
    const hymnRich = makePrayer('hymn 12 stanza')
    fileContents['prayers/hymns/12.rich.json'] = JSON.stringify({ hymnRich })

    expect(loadHymnRichOverlay('12')).toEqual(hymnRich)
  })

  it('returns null when the file exists but has no hymnRich field', () => {
    fileContents['prayers/hymns/99.rich.json'] = JSON.stringify({
      concludingPrayerRich: makePrayer('wrong field'),
    })
    expect(loadHymnRichOverlay(99)).toBeNull()
  })
})
