import { describe, expect, it } from 'vitest'
import {
  DEFAULTS,
  migrateSettings,
  parseStoredSettings,
  SETTINGS_VERSION,
} from '../settings'

describe('migrateSettings', () => {
  it('returns DEFAULTS for null/undefined input', () => {
    expect(migrateSettings(null)).toEqual(DEFAULTS)
    expect(migrateSettings(undefined)).toEqual(DEFAULTS)
  })

  it('returns DEFAULTS for non-object input', () => {
    expect(migrateSettings('string')).toEqual(DEFAULTS)
    expect(migrateSettings(42)).toEqual(DEFAULTS)
    expect(migrateSettings(true)).toEqual(DEFAULTS)
  })

  it('stamps current version on migrated output', () => {
    const v0 = { fontSize: 'md' }
    expect(migrateSettings(v0).version).toBe(SETTINGS_VERSION)
  })

  it('preserves valid fields from v0 (version-less) payload', () => {
    const v0 = {
      showPageRefs: true,
      fontSize: 'lg',
      fontFamily: 'serif',
      theme: 'dark',
      invitatoryCollapsed: false,
      invitatoryPsalmIndex: 2,
      psalmPrayerCollapsed: true,
    }
    expect(migrateSettings(v0)).toEqual({
      version: SETTINGS_VERSION,
      showPageRefs: true,
      fontSize: 'lg',
      fontFamily: 'serif',
      theme: 'dark',
      invitatoryCollapsed: false,
      invitatoryPsalmIndex: 2,
      psalmPrayerCollapsed: true,
    })
  })

  it('falls back to DEFAULT for drifted fontSize', () => {
    const drifted = { fontSize: 'nuclear' }
    expect(migrateSettings(drifted).fontSize).toBe(DEFAULTS.fontSize)
  })

  it('falls back to DEFAULT for drifted fontFamily', () => {
    expect(migrateSettings({ fontFamily: 'comic-sans' }).fontFamily).toBe(
      DEFAULTS.fontFamily,
    )
  })

  it('falls back to DEFAULT for drifted theme', () => {
    expect(migrateSettings({ theme: 'neon' }).theme).toBe(DEFAULTS.theme)
  })

  it('rejects out-of-range invitatoryPsalmIndex', () => {
    expect(migrateSettings({ invitatoryPsalmIndex: -1 }).invitatoryPsalmIndex).toBe(0)
    expect(migrateSettings({ invitatoryPsalmIndex: 4 }).invitatoryPsalmIndex).toBe(0)
    expect(migrateSettings({ invitatoryPsalmIndex: 1.5 }).invitatoryPsalmIndex).toBe(0)
    expect(migrateSettings({ invitatoryPsalmIndex: '2' }).invitatoryPsalmIndex).toBe(0)
  })

  it('rejects non-boolean toggle fields', () => {
    const bad = {
      showPageRefs: 'yes',
      invitatoryCollapsed: 1,
      psalmPrayerCollapsed: null,
    }
    const out = migrateSettings(bad)
    expect(out.showPageRefs).toBe(DEFAULTS.showPageRefs)
    expect(out.invitatoryCollapsed).toBe(DEFAULTS.invitatoryCollapsed)
    expect(out.psalmPrayerCollapsed).toBe(DEFAULTS.psalmPrayerCollapsed)
  })

  it('ignores unknown extra fields (forward-compat)', () => {
    const withExtras = { fontSize: 'sm', futureFlag: true, junk: [1, 2, 3] }
    const out = migrateSettings(withExtras) as unknown as Record<string, unknown>
    expect(out.fontSize).toBe('sm')
    expect(out.futureFlag).toBeUndefined()
    expect(out.junk).toBeUndefined()
  })

  it('partial payload merges with DEFAULTS', () => {
    const partial = { invitatoryPsalmIndex: 3 }
    const out = migrateSettings(partial)
    expect(out.invitatoryPsalmIndex).toBe(3)
    expect(out.theme).toBe(DEFAULTS.theme)
    expect(out.fontSize).toBe(DEFAULTS.fontSize)
  })
})

describe('parseStoredSettings', () => {
  it('returns DEFAULTS for null/empty string', () => {
    expect(parseStoredSettings(null)).toEqual(DEFAULTS)
    expect(parseStoredSettings('')).toEqual(DEFAULTS)
  })

  it('returns DEFAULTS for malformed JSON', () => {
    expect(parseStoredSettings('{invalid json')).toEqual(DEFAULTS)
    expect(parseStoredSettings('{"unterminated')).toEqual(DEFAULTS)
  })

  it('parses a v0 payload written by the legacy provider', () => {
    const legacy = JSON.stringify({
      showPageRefs: true,
      fontSize: 'lg',
      invitatoryPsalmIndex: 1,
    })
    const out = parseStoredSettings(legacy)
    expect(out.showPageRefs).toBe(true)
    expect(out.fontSize).toBe('lg')
    expect(out.invitatoryPsalmIndex).toBe(1)
    expect(out.version).toBe(SETTINGS_VERSION)
  })
})
