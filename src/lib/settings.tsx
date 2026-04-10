'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface Settings {
  showPageRefs: boolean
}

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const DEFAULTS: Settings = { showPageRefs: false }
const STORAGE_KEY = 'loth-settings'

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  updateSettings: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) })
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const value = { settings: hydrated ? settings : DEFAULTS, updateSettings }

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings() {
  return useContext(SettingsContext)
}
