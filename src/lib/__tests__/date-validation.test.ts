import { describe, it, expect } from 'vitest'
import { isValidDateStr } from '../date-validation'

describe('isValidDateStr', () => {
  it('accepts well-formed dates in the supported range', () => {
    expect(isValidDateStr('2026-04-19')).toBe(true)
    expect(isValidDateStr('2024-02-29')).toBe(true) // leap year
    expect(isValidDateStr('1900-01-01')).toBe(true)
    expect(isValidDateStr('2100-12-31')).toBe(true)
  })

  it('rejects wrong shape', () => {
    expect(isValidDateStr('abc')).toBe(false)
    expect(isValidDateStr('')).toBe(false)
    expect(isValidDateStr('2026/04/19')).toBe(false)
    expect(isValidDateStr('2026-4-19')).toBe(false)
    expect(isValidDateStr('26-04-19')).toBe(false)
  })

  it('rejects impossible calendar dates', () => {
    expect(isValidDateStr('2026-02-30')).toBe(false)
    expect(isValidDateStr('2026-04-31')).toBe(false)
    expect(isValidDateStr('2026-13-01')).toBe(false)
    expect(isValidDateStr('2025-02-29')).toBe(false) // non-leap
  })

  it('rejects out-of-range years', () => {
    expect(isValidDateStr('1899-12-31')).toBe(false)
    expect(isValidDateStr('2101-01-01')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isValidDateStr(20260419)).toBe(false)
    expect(isValidDateStr(null)).toBe(false)
    expect(isValidDateStr(undefined)).toBe(false)
  })
})
