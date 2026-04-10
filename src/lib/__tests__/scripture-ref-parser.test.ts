import { describe, it, expect } from 'vitest'
import { parseScriptureRef } from '../scripture-ref-parser'

describe('parseScriptureRef', () => {
  it('returns empty array for empty input', () => {
    expect(parseScriptureRef('')).toEqual([])
  })

  it('parses simple psalm reference', () => {
    const refs = parseScriptureRef('Psalm 63:2-9')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('psalm')
    expect(refs[0].chapter).toBe(63)
    expect(refs[0].verses[0].num).toBe(2)
    expect(refs[0].verses[refs[0].verses.length - 1].num).toBe(9)
  })

  it('parses verse suffix (a/b/c)', () => {
    const refs = parseScriptureRef('Psalm 51:3-11a')
    expect(refs).toHaveLength(1)
    const lastVerse = refs[0].verses[refs[0].verses.length - 1]
    expect(lastVerse.num).toBe(11)
    expect(lastVerse.suffix).toBe('a')
  })

  it('parses start suffix', () => {
    const refs = parseScriptureRef('Psalm 119:105b-112')
    expect(refs).toHaveLength(1)
    expect(refs[0].verses[0].num).toBe(105)
    expect(refs[0].verses[0].suffix).toBe('b')
  })

  it('parses NT reference', () => {
    const refs = parseScriptureRef('Luke 1:68-79')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('luke')
    expect(refs[0].chapter).toBe(1)
    expect(refs[0].verses).toHaveLength(12)
  })

  it('parses multi-segment with semicolons (shared book)', () => {
    const refs = parseScriptureRef('Psalm 63:2-9; 3:1-5')
    expect(refs).toHaveLength(2)
    expect(refs[0].book).toBe('psalm')
    expect(refs[0].chapter).toBe(63)
    expect(refs[1].book).toBe('psalm')
    expect(refs[1].chapter).toBe(3)
  })

  it('parses cross-chapter reference', () => {
    const refs = parseScriptureRef('Isaiah 38:10-14,17-20')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('isaiah')
    // Verses 10-14 and 17-20
    const nums = refs[0].verses.map((v) => v.num)
    expect(nums).toContain(10)
    expect(nums).toContain(14)
    expect(nums).toContain(17)
    expect(nums).toContain(20)
    expect(nums).not.toContain(15)
  })

  it('parses numbered book (1 Corinthians)', () => {
    const refs = parseScriptureRef('1 Corinthians 13:1-7')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('1-corinthians')
    expect(refs[0].chapter).toBe(13)
  })

  it('parses single-chapter book (Philemon)', () => {
    const refs = parseScriptureRef('Philemon 4-7')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('philemon')
    expect(refs[0].chapter).toBe(1)
  })

  it('parses "and" as comma separator', () => {
    const refs = parseScriptureRef('Psalm 150:1 and 2 and 6')
    expect(refs).toHaveLength(1)
    const nums = refs[0].verses.map((v) => v.num)
    expect(nums).toEqual([1, 2, 6])
  })

  it('handles deuterocanonical books', () => {
    const refs = parseScriptureRef('Sirach 1:1-10')
    expect(refs).toHaveLength(1)
    expect(refs[0].book).toBe('sirach')
  })

  it('deduplicates overlapping verse ranges', () => {
    const refs = parseScriptureRef('Psalm 1:1-3,2-4')
    expect(refs).toHaveLength(1)
    const nums = refs[0].verses.map((v) => v.num)
    // Should be 1,2,3,4 without duplicates
    expect(nums).toEqual([1, 2, 3, 4])
  })
})
