/**
 * Regression guard for theme-toggle storage-blocked silent no-op
 * (GOAL #69 / WI-73). Root cause: when localStorage.setItem throws
 * (iOS private / in-app WebView), the old updateSettings swallowed the
 * throw inside try/catch so dispatchEvent(CHANGE_EVENT) never fired, and
 * getClientSnapshot read ONLY localStorage (no in-memory fallback) → the
 * snapshot never reflected the new theme → silent no-op (theme not
 * applied, radio aria-checked not updated).
 *
 * Fix contract (Step3 spec lock):
 *  1. module-level in-memory latest value
 *  2. writeSettings: compute next → always update in-memory →
 *     try{ setItem }catch{ keep } → dispatchEvent ALWAYS (outside try)
 *  3. getClientSnapshot: in-memory first (SoT after write), else
 *     localStorage; same reference when unchanged (useSyncExternalStore
 *     infinite-rerender guard)
 *  4. normal env no-regression
 *
 * Env note: vitest runs in node (no jsdom). We inject a minimal fake
 * `window` whose localStorage.setItem can be configured to throw, and a
 * dispatchEvent spy. Module state (in-memory/localStorage cache) is
 * module-level, so each test uses vi.resetModules() + dynamic import for
 * isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CHANGE_EVENT = 'loth-settings-change'
const STORAGE_KEY = 'loth-settings'

interface FakeWindow {
  localStorage: {
    getItem: (k: string) => string | null
    setItem: (k: string, v: string) => void
    removeItem: (k: string) => void
  }
  dispatchEvent: (e: Event) => boolean
  addEventListener: () => void
  removeEventListener: () => void
  matchMedia: () => {
    matches: boolean
    addEventListener: () => void
    removeEventListener: () => void
  }
  __events: string[]
  __store: Map<string, string>
}

function makeFakeWindow(opts: { throwOnSet?: boolean; seed?: string } = {}): FakeWindow {
  const store = new Map<string, string>()
  if (opts.seed !== undefined) store.set(STORAGE_KEY, opts.seed)
  const events: string[] = []
  return {
    localStorage: {
      getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k, v) => {
        if (opts.throwOnSet) throw new Error('QuotaExceededError: storage blocked')
        store.set(k, v)
      },
      removeItem: (k) => {
        store.delete(k)
      },
    },
    dispatchEvent: (e) => {
      events.push(e.type)
      return true
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    __events: events,
    __store: store,
  }
}

async function loadModule(win: FakeWindow) {
  vi.resetModules()
  ;(globalThis as unknown as { window: FakeWindow }).window = win
  return import('../settings')
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
  vi.resetModules()
})

describe('settings — storage-blocked theme toggle (WI-73 D1)', () => {
  let win: FakeWindow

  beforeEach(() => {
    win = makeFakeWindow({ throwOnSet: true })
  })

  it('snapshot reflects the new theme even when localStorage.setItem throws (in-memory fallback)', async () => {
    const mod = await loadModule(win)
    expect(mod.getClientSnapshot().theme).toBe('system') // DEFAULTS baseline

    mod.writeSettings({ theme: 'dark' })

    // in-memory is SoT after a write — survives the blocked storage.
    expect(mod.getClientSnapshot().theme).toBe('dark')
  })

  it('dispatches CHANGE_EVENT even when setItem throws (subscribers wake → re-render)', async () => {
    const mod = await loadModule(win)
    mod.writeSettings({ theme: 'dark' })

    expect(win.__events).toContain(CHANGE_EVENT)
    // exactly one event per write
    expect(win.__events.filter((t) => t === CHANGE_EVENT)).toHaveLength(1)
  })

  it('storage stays empty (write genuinely blocked) yet snapshot is correct', async () => {
    const mod = await loadModule(win)
    mod.writeSettings({ theme: 'dark' })

    // setItem threw → nothing persisted
    expect(win.__store.has(STORAGE_KEY)).toBe(false)
    // but the in-memory snapshot carries the new value
    expect(mod.getClientSnapshot().theme).toBe('dark')
  })

  it('getClientSnapshot returns a stable reference between writes (useSyncExternalStore guard)', async () => {
    const mod = await loadModule(win)
    mod.writeSettings({ theme: 'dark' })

    const a = mod.getClientSnapshot()
    const b = mod.getClientSnapshot()
    expect(a).toBe(b) // identical reference → no infinite re-render
  })
})

describe('settings — normal env no-regression (WI-73 D2)', () => {
  it('persists to localStorage AND dispatches CHANGE_EVENT when setItem succeeds', async () => {
    const win = makeFakeWindow({ throwOnSet: false })
    const mod = await loadModule(win)

    mod.writeSettings({ theme: 'dark' })

    expect(win.__store.get(STORAGE_KEY)).toContain('"theme":"dark"')
    expect(mod.getClientSnapshot().theme).toBe('dark')
    expect(win.__events.filter((t) => t === CHANGE_EVENT)).toHaveLength(1)
  })

  it('getClientSnapshot reads localStorage before any write (in-memory empty)', async () => {
    const win = makeFakeWindow({
      throwOnSet: false,
      seed: JSON.stringify({ version: 1, theme: 'dark', fontSize: 'lg' }),
    })
    const mod = await loadModule(win)

    // no write yet → falls through to localStorage
    const snap = mod.getClientSnapshot()
    expect(snap.theme).toBe('dark')
    expect(snap.fontSize).toBe('lg')
  })

  it('reflects subsequent writes (theme dark → light) via in-memory', async () => {
    const win = makeFakeWindow({ throwOnSet: false })
    const mod = await loadModule(win)

    mod.writeSettings({ theme: 'dark' })
    expect(mod.getClientSnapshot().theme).toBe('dark')

    mod.writeSettings({ theme: 'light' })
    expect(mod.getClientSnapshot().theme).toBe('light')
    expect(win.__store.get(STORAGE_KEY)).toContain('"theme":"light"')
    expect(win.__events.filter((t) => t === CHANGE_EVENT)).toHaveLength(2)
  })
})
