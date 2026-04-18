import { describe, it, expect } from 'vitest'
import { getPsalterCommons } from '../psalter-loader'

describe('getPsalterCommons — page propagation', () => {
  it('exposes shortReading.page when set in psalter JSON', () => {
    // Week 1 SUN lauds: shortReading.page is 65 (verified hand-annotation)
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(commons?.shortReading?.page).toBe(65)
  })

  it('exposes responsory.page when set', () => {
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(commons?.responsory?.page).toBe(66)
  })

  it('exposes intercessionsPage parallel key when present', () => {
    // Week 1 SUN lauds: intercessionsPage was injected by extract-psalter-pages.js
    const commons = getPsalterCommons(1, 'SUN', 'lauds')
    expect(typeof commons?.intercessionsPage).toBe('number')
  })

  it('returns undefined for fields not present', () => {
    // Office of Readings has no shortReading/responsory in week-1 SUN
    const commons = getPsalterCommons(1, 'SUN', 'officeOfReadings')
    expect(commons?.shortReading).toBeUndefined()
    expect(commons?.responsory).toBeUndefined()
  })

  it('returns null for compline (separate cycle)', () => {
    expect(getPsalterCommons(1, 'SUN', 'compline')).toBeNull()
  })

  it('week 3 SUN lauds matches page-mapping.json reference', () => {
    // Cross-check that hand-annotated values still match (regression guard).
    const commons = getPsalterCommons(3, 'SUN', 'lauds')
    expect(commons?.shortReading?.page).toBe(302)
    expect(commons?.responsory?.page).toBe(303)
  })
})
