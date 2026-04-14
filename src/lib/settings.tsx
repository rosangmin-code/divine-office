'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FontFamily = 'sans' | 'serif'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Settings {
  showPageRefs: boolean
  fontSize: FontSize
  fontFamily: FontFamily
  theme: ThemeMode
  invitatoryCollapsed: boolean
}

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const DEFAULTS: Settings = {
  showPageRefs: false,
  fontSize: 'md',
  fontFamily: 'sans',
  theme: 'system',
  invitatoryCollapsed: true,
}
const STORAGE_KEY = 'loth-settings'

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
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) })
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const root = document.documentElement
    root.dataset.fontSize = settings.fontSize
    root.dataset.fontFamily = settings.fontFamily
    applyTheme(settings.theme)
  }, [hydrated, settings.fontSize, settings.fontFamily, settings.theme])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme('system')
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [settings.theme])

  function updateSettings(patch: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const value = { settings: hydrated ? settings : DEFAULTS, updateSettings }

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  return useContext(SettingsContext)
}
