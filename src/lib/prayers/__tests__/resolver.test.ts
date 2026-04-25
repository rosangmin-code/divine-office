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

  // Task #54 — symmetric wk1 fallback for seasonal rich overlay.
  //
  // Bug: rich-overlay.ts L76-90 was asymmetric with propers-loader.ts L134.
  // Easter weeks 2-7 weekdays use weeks['1'] propers (PDF p.700 octave) for
  // JSON ref/body, but the rich overlay file `easter/wN-DAY-hour.rich.json`
  // does not exist for N>1. The resolver loaded null for seasonal, then
  // psalter-commons rich filled in body — producing JSON ref + psalter body
  // mismatch. Fix mirrors propers-loader's `weeks['1']` fallback.
  describe('seasonal wk1 fallback (task #54)', () => {
    it('Easter wk3 SAT lauds — falls back to easter/w1-SAT-lauds.rich.json (Easter Octave)', () => {
      fileContents['seasonal/easter/w1-SAT-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Бидний хэн нь ч өөрийнхөө төлөө амьдрахгүй'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '3',
        day: 'SAT',
        hour: 'lauds',
        celebrationName: 'Saturday of the Third Week of Easter',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'Бидний хэн нь ч өөрийнхөө төлөө амьдрахгүй' }],
      })
    })

    it('Easter wk2 MON lauds — falls back to easter/w1-MON-lauds.rich.json', () => {
      fileContents['seasonal/easter/w1-MON-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('easter octave Monday reading'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '2',
        day: 'MON',
        hour: 'lauds',
        celebrationName: 'Monday of the Second Week of Easter',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'easter octave Monday reading' }],
      })
    })

    it('Lent wk3 WED lauds — falls back to lent/w1-WED-lauds.rich.json', () => {
      fileContents['seasonal/lent/w1-WED-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('lent week 1 wed reading'),
      })

      const overlay = resolveRichOverlay({
        season: 'LENT',
        weekKey: '3',
        day: 'WED',
        hour: 'lauds',
        celebrationName: 'Wednesday of the Third Week of Lent',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'lent week 1 wed reading' }],
      })
    })

    it('Advent wk2 TUE vespers — falls back to advent/w1-TUE-vespers.rich.json', () => {
      fileContents['seasonal/advent/w1-TUE-vespers.rich.json'] = JSON.stringify({
        intercessionsRich: makePrayer('advent week 1 tue intercessions'),
      })

      const overlay = resolveRichOverlay({
        season: 'ADVENT',
        weekKey: '2',
        day: 'TUE',
        hour: 'vespers',
        celebrationName: 'Tuesday of the Second Week of Advent',
      })

      expect(overlay.intercessionsRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'advent week 1 tue intercessions' }],
      })
    })

    it('exact week match takes precedence over wk1 fallback (Lent wk6 SAT lauds)', () => {
      fileContents['seasonal/lent/w1-SAT-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('lent w1 SAT (must NOT be picked)'),
      })
      fileContents['seasonal/lent/w6-SAT-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Holy Saturday reading'),
      })

      const overlay = resolveRichOverlay({
        season: 'LENT',
        weekKey: '6',
        day: 'SAT',
        hour: 'lauds',
        celebrationName: 'Holy Saturday',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'Holy Saturday reading' }],
      })
    })

    it('Ordinary Time wk3 SAT lauds — no seasonal weekday rich; psalter commons handles body', () => {
      // OT only authors Sunday rich files; weekdays go through psalter cycle.
      // wk1 fallback would otherwise mistakenly pick a wk1 file if it existed.
      fileContents['commons/psalter/w3-SAT-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('psalter week 3 SAT lauds'),
      })
      // No `seasonal/ordinary-time/w1-SAT-lauds.rich.json` written — fallback
      // returns null, psalter commons spreads through.

      const overlay = resolveRichOverlay({
        season: 'ORDINARY_TIME',
        weekKey: '3',
        day: 'SAT',
        hour: 'lauds',
        psalterWeek: '3',
        celebrationName: 'Saturday of the Third Week in Ordinary Time',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'psalter week 3 SAT lauds' }],
      })
    })

    it('Easter Ascension SUN — special-key guard prevents wk1 fallback (no rich applied)', () => {
      // wascension-SUN-lauds.rich.json exists on disk but is NOT loaded by the
      // current seasonal path; the wk1 fallback MUST NOT substitute Easter
      // Sunday's rich (which would mismatch the Ascension JSON propers).
      fileContents['seasonal/easter/w1-SUN-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Easter Sunday rich (must NOT bleed into Ascension)'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '7',
        day: 'SUN',
        hour: 'lauds',
        celebrationName: 'Ascension of the Lord',
      })

      expect(overlay.shortReadingRich).toBeUndefined()
    })

    it('Easter Pentecost SUN — special-key guard prevents wk1 fallback', () => {
      fileContents['seasonal/easter/w1-SUN-vespers.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Easter Sunday rich (must NOT bleed into Pentecost)'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '8',
        day: 'SUN',
        hour: 'vespers',
        celebrationName: 'Pentecost Sunday',
      })

      expect(overlay.shortReadingRich).toBeUndefined()
    })

    it('OT Christ the King SUN — special-key guard prevents wk1 fallback', () => {
      fileContents['seasonal/ordinary-time/w1-SUN-vespers.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('OT week 1 Sunday rich (must NOT bleed)'),
      })

      const overlay = resolveRichOverlay({
        season: 'ORDINARY_TIME',
        weekKey: '34',
        day: 'SUN',
        hour: 'vespers',
        celebrationName: 'Our Lord Jesus Christ, King of the Universe',
      })

      expect(overlay.shortReadingRich).toBeUndefined()
    })
  })

  // Task #57 — Tier 1 special-key file loading.
  //
  // wascension/weasterSunday/wpentecost (EASTER) and the OT special-key
  // rich files exist on disk but were not consulted before this change.
  // The resolver now matches `resolveSpecialKey(season, celebrationName)`
  // first and tries `seasonal/{season}/w{specialKey}-{day}-{hour}.rich.json`
  // before falling through to the numeric weekKey path.
  describe('seasonal special-key load (task #57)', () => {
    it('Easter Ascension SUN — loads wascension-SUN-lauds rich when disk file exists', () => {
      fileContents['seasonal/easter/wascension-SUN-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('ascension reading'),
      })
      // wk1 SUN rich also present — must NOT be picked since special-key wins.
      fileContents['seasonal/easter/w1-SUN-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Easter Sunday rich (must NOT win)'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '7',
        day: 'SUN',
        hour: 'lauds',
        celebrationName: 'Ascension of the Lord',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'ascension reading' }],
      })
    })

    it('Easter Easter Sunday lauds — loads weasterSunday-SUN-lauds rich', () => {
      fileContents['seasonal/easter/weasterSunday-SUN-lauds.rich.json'] = JSON.stringify({
        intercessionsRich: makePrayer('easterSunday intercessions'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '1',
        day: 'SUN',
        hour: 'lauds',
        celebrationName: 'Easter Sunday',
      })

      expect(overlay.intercessionsRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'easterSunday intercessions' }],
      })
    })

    it('Easter Pentecost SUN vespers — loads wpentecost-SUN-vespers rich', () => {
      fileContents['seasonal/easter/wpentecost-SUN-vespers.rich.json'] = JSON.stringify({
        concludingPrayerRich: makePrayer('pentecost vespers prayer'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '8',
        day: 'SUN',
        hour: 'vespers',
        celebrationName: 'Pentecost Sunday',
      })

      expect(overlay.concludingPrayerRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'pentecost vespers prayer' }],
      })
    })

    it('OT Trinity Sunday — loads wtrinitySunday rich when disk file exists (currently absent on disk; logic verified)', () => {
      fileContents['seasonal/ordinary-time/wtrinitySunday-SUN-lauds.rich.json'] = JSON.stringify({
        intercessionsRich: makePrayer('trinity intercessions'),
      })

      const overlay = resolveRichOverlay({
        season: 'ORDINARY_TIME',
        weekKey: '5',
        day: 'SUN',
        hour: 'lauds',
        celebrationName: 'The Most Holy Trinity',
      })

      expect(overlay.intercessionsRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'trinity intercessions' }],
      })
    })

    it('regression — Easter wk3 SAT lauds (no special-key match) still uses wk1 fallback', () => {
      // #54 fix preserved: special-key path doesn't match for plain weekday
      // celebrations, so Tier 1 falls through to Tier 2/3 (wk1 fallback).
      fileContents['seasonal/easter/w1-SAT-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Бидний хэн нь...'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '3',
        day: 'SAT',
        hour: 'lauds',
        celebrationName: 'Saturday of the Third Week of Easter',
      })

      expect(overlay.shortReadingRich?.blocks[0]).toMatchObject({
        spans: [{ kind: 'text', text: 'Бидний хэн нь...' }],
      })
    })

    it('regression — Easter Ascension SUN with special-key file MISSING returns null (no wk1 bleed)', () => {
      // No wascension-SUN-lauds.rich.json in fileContents. wk1 SUN rich
      // present must NOT be loaded — the #54 guard is preserved by the
      // explicit `return null` after Tier 1 tries the special-key file.
      fileContents['seasonal/easter/w1-SUN-lauds.rich.json'] = JSON.stringify({
        shortReadingRich: makePrayer('Easter Sunday rich (must NOT bleed)'),
      })

      const overlay = resolveRichOverlay({
        season: 'EASTER',
        weekKey: '7',
        day: 'SUN',
        hour: 'lauds',
        celebrationName: 'Ascension of the Lord',
      })

      expect(overlay.shortReadingRich).toBeUndefined()
    })
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
