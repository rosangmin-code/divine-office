'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'

export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'sans' | 'serif'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Settings {
  version: 1
  showPageRefs: boolean
  fontSize: FontSize
  fontFamily: FontFamily
  theme: ThemeMode
  invitatoryCollapsed: boolean
  invitatoryPsalmIndex: number
  psalmPrayerCollapsed: boolean
}

export const SETTINGS_VERSION = 1

export const DEFAULTS: Settings = {
  version: SETTINGS_VERSION,
  showPageRefs: false,
  fontSize: 'md',
  fontFamily: 'sans',
  theme: 'system',
  invitatoryCollapsed: true,
  invitatoryPsalmIndex: 0,
  psalmPrayerCollapsed: false,
}

export const STORAGE_KEY = 'loth-settings'
const CHANGE_EVENT = 'loth-settings-change'
const INVITATORY_PSALM_COUNT = 4

const FONT_SIZES: readonly FontSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const FONT_FAMILIES: readonly FontFamily[] = ['sans', 'serif']
const THEMES: readonly ThemeMode[] = ['light', 'dark', 'system']

function isFontSize(v: unknown): v is FontSize {
  return typeof v === 'string' && (FONT_SIZES as readonly string[]).includes(v)
}
function isFontFamily(v: unknown): v is FontFamily {
  return (
    typeof v === 'string' && (FONT_FAMILIES as readonly string[]).includes(v)
  )
}
function isTheme(v: unknown): v is ThemeMode {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v)
}

export function migrateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULTS
  const data = raw as Record<string, unknown>

  const idx = data.invitatoryPsalmIndex
  const validIdx =
    typeof idx === 'number' &&
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < INVITATORY_PSALM_COUNT
      ? idx
      : DEFAULTS.invitatoryPsalmIndex

  return {
    version: SETTINGS_VERSION,
    showPageRefs:
      typeof data.showPageRefs === 'boolean'
        ? data.showPageRefs
        : DEFAULTS.showPageRefs,
    fontSize: isFontSize(data.fontSize) ? data.fontSize : DEFAULTS.fontSize,
    fontFamily: isFontFamily(data.fontFamily)
      ? data.fontFamily
      : DEFAULTS.fontFamily,
    theme: isTheme(data.theme) ? data.theme : DEFAULTS.theme,
    invitatoryCollapsed:
      typeof data.invitatoryCollapsed === 'boolean'
        ? data.invitatoryCollapsed
        : DEFAULTS.invitatoryCollapsed,
    invitatoryPsalmIndex: validIdx,
    psalmPrayerCollapsed:
      typeof data.psalmPrayerCollapsed === 'boolean'
        ? data.psalmPrayerCollapsed
        : DEFAULTS.psalmPrayerCollapsed,
  }
}

export function parseStoredSettings(raw: string | null): Settings {
  if (!raw) return DEFAULTS
  try {
    return migrateSettings(JSON.parse(raw))
  } catch {
    return DEFAULTS
  }
}

let snapshotRaw: string | null = null
let snapshotValue: Settings = DEFAULTS

function getClientSnapshot(): Settings {
  if (typeof window === 'undefined') return DEFAULTS
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshotValue = parseStoredSettings(raw)
  }
  return snapshotValue
}

function getServerSnapshot(): Settings {
  return DEFAULTS
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  updateSettings: () => {},
})

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.fontSize = settings.fontSize
    root.dataset.fontFamily = settings.fontFamily
    applyTheme(settings.theme)
  }, [settings.fontSize, settings.fontFamily, settings.theme])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme('system')
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [settings.theme])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings(patch) {
        const current = getClientSnapshot()
        const next: Settings = { ...current, ...patch, version: SETTINGS_VERSION }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          window.dispatchEvent(new Event(CHANGE_EVENT))
        } catch {
          /* ignore */
        }
      },
    }),
    [settings],
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  return useContext(SettingsContext)
}
