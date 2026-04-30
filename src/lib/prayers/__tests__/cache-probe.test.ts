import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { loadPsalterTextRich, __resetRichOverlayCache } from '../rich-overlay'

describe('FR-153f catalog mtime-cache probe', () => {
  it('reads catalog file once across many calls (mtime-cached)', () => {
    __resetRichOverlayCache()
    const origRead = fs.readFileSync
    const origStat = fs.statSync
    let catalogReads = 0
    let catalogStats = 0
    const fsMut = fs as unknown as {
      readFileSync: typeof fs.readFileSync
      statSync: typeof fs.statSync
    }
    fsMut.readFileSync = function (
      p: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) {
      if (typeof p === 'string' && p.endsWith('psalter-texts.rich.json')) catalogReads++
      return (origRead as (...a: unknown[]) => unknown).call(fs, p, ...rest)
    } as typeof fs.readFileSync
    fsMut.statSync = function (p: fs.PathLike, ...rest: unknown[]) {
      if (typeof p === 'string' && p.endsWith('psalter-texts.rich.json')) catalogStats++
      return (origStat as (...a: unknown[]) => unknown).call(fs, p, ...rest)
    } as typeof fs.statSync
    try {
      // 10 rapid calls across different refs
      const refs = [
        'Psalm 63:2-9',
        'Daniel 3:57-88, 56',
        'Psalm 149:1-9',
        'Psalm 110:1-5, 7',
        'Psalm 114:1-8',
        'Revelation 19:1-7',
        'Psalm 5:2-10, 12-13',
        '1 Chronicles 29:10-13',
        'Psalm 63:2-9', // repeat
        'Psalm 149:1-9', // repeat
      ]
      const results = refs.map((r) => loadPsalterTextRich(r))
      expect(results.every((r) => r && r.blocks && r.blocks.length > 0)).toBe(true)
      console.log(`[cache-probe] catalogReads=${catalogReads} catalogStats=${catalogStats} across ${refs.length} calls`)
      expect(catalogReads).toBe(1) // single parse
      expect(catalogStats).toBe(refs.length) // stat each call (mtime check)
    } finally {
      fsMut.readFileSync = origRead
      fsMut.statSync = origStat
    }
  })
})
