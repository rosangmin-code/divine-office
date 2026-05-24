import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (event: unknown) => void

interface SwHarness {
  listeners: Map<string, Listener>
  fakeCaches: {
    open: ReturnType<typeof vi.fn>
    match: ReturnType<typeof vi.fn>
    keys: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  fakeCache: {
    addAll: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
    match: ReturnType<typeof vi.fn>
  }
  fakeFetch: ReturnType<typeof vi.fn>
  skipWaiting: ReturnType<typeof vi.fn>
  claim: ReturnType<typeof vi.fn>
  // 현재 활성 캐시 버전 (public/sw.js 의 CACHE_VERSION 에서 파싱).
  // 하드코딩 대신 소스에서 읽어 bump 마다 테스트가 깨지는 회귀를 차단한다.
  cacheVersion: string
}

function loadSw(): SwHarness {
  const source = readFileSync(
    path.join(process.cwd(), 'public/sw.js'),
    'utf8',
  )

  // CACHE_VERSION 을 소스에서 직접 파싱한다. const 선언이라 vm context
  // 전역에 노출되지 않으므로 정규식으로 읽는다. 기대값 하드코딩을 없애
  // bump(v40→v41→v42 …) 마다 install/activate 테스트가 깨지는 패턴을 막는다.
  const cacheVersionMatch = source.match(/const CACHE_VERSION = '([^']+)'/)
  if (!cacheVersionMatch) {
    throw new Error(
      'sw.test.ts: public/sw.js 에서 CACHE_VERSION 을 파싱하지 못했습니다',
    )
  }
  const cacheVersion = cacheVersionMatch[1]

  const listeners = new Map<string, Listener>()
  const fakeCache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
  }
  const fakeCaches = {
    open: vi.fn().mockResolvedValue(fakeCache),
    match: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  }
  const fakeFetch = vi.fn()
  const skipWaiting = vi.fn()
  const claim = vi.fn()

  const fakeSelf = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting,
    clients: { claim },
    location: { origin: 'http://localhost:3200' },
  }

  const context = vm.createContext({
    self: fakeSelf,
    caches: fakeCaches,
    fetch: fakeFetch,
    URL,
    Promise,
    console,
  })
  vm.runInContext(source, context)

  return {
    listeners,
    fakeCaches,
    fakeCache,
    fakeFetch,
    skipWaiting,
    claim,
    cacheVersion,
  }
}

interface FakeRequest {
  url: string
  method: string
  mode?: string
  destination?: string
}

function makeEvent(request: FakeRequest) {
  const respondWith = vi.fn()
  const waitUntil = vi.fn((p) => p)
  return { request, respondWith, waitUntil }
}

describe('public/sw.js — service worker contract', () => {
  let sw: SwHarness

  beforeEach(() => {
    sw = loadSw()
  })

  describe('install', () => {
    it('precaches /offline.html and /icon.svg then calls skipWaiting', async () => {
      const handler = sw.listeners.get('install')!
      const event = { waitUntil: vi.fn((p) => p) }
      handler(event)

      await event.waitUntil.mock.calls[0][0]

      expect(sw.fakeCaches.open).toHaveBeenCalledWith(sw.cacheVersion)
      expect(sw.fakeCache.addAll).toHaveBeenCalledWith([
        '/offline.html',
        '/icon.svg',
      ])
      expect(sw.skipWaiting).toHaveBeenCalled()
    })
  })

  describe('activate', () => {
    it('deletes stale cache versions and claims clients', async () => {
      // 현재 버전 번호를 파싱해 v1..(현재-1) 의 stale 캐시 목록을 동적
      // 생성한다. bump 가 일어나도 직전 버전이 자동으로 stale 삭제 대상이
      // 되므로 테스트를 다시 손볼 필요가 없다 (#17 회귀 차단).
      const currentNum = Number(sw.cacheVersion.match(/v(\d+)$/)![1])
      const staleVersionKeys = Array.from(
        { length: currentNum - 1 },
        (_, i) => `divine-office-v${i + 1}`,
      )
      const staleKeys = [...staleVersionKeys, 'unrelated-cache']
      // keys() 목록에는 stale 키 + 현재 버전 키를 함께 넣어, 현재 버전은
      // 보존되고 나머지는 전부 삭제되는지 검증한다.
      sw.fakeCaches.keys.mockResolvedValue([...staleKeys, sw.cacheVersion])

      const handler = sw.listeners.get('activate')!
      const event = { waitUntil: vi.fn((p) => p) }
      handler(event)

      await event.waitUntil.mock.calls[0][0]

      for (const key of staleKeys) {
        expect(sw.fakeCaches.delete).toHaveBeenCalledWith(key)
      }
      // 현재 활성 버전은 삭제되어선 안 된다.
      expect(sw.fakeCaches.delete).not.toHaveBeenCalledWith(sw.cacheVersion)
      expect(sw.claim).toHaveBeenCalled()
    })
  })

  describe('fetch — bypass cases', () => {
    it('ignores non-GET requests entirely', () => {
      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/api/calendar/today',
        method: 'POST',
      })
      handler(event)
      expect(event.respondWith).not.toHaveBeenCalled()
    })

    it('ignores cross-origin requests', () => {
      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'https://cdn.example.com/font.woff2',
        method: 'GET',
        destination: 'font',
      })
      handler(event)
      expect(event.respondWith).not.toHaveBeenCalled()
    })

    it('does not intercept arbitrary GET fetches (destination empty)', () => {
      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/api/loth/2026-02-04/lauds',
        method: 'GET',
        mode: 'cors',
        destination: '',
      })
      handler(event)
      expect(event.respondWith).not.toHaveBeenCalled()
    })
  })

  describe('fetch — navigation (HTML) must be network-only', () => {
    it('calls fetch once and never puts navigation response into cache', async () => {
      const navResponse = { ok: true, clone: vi.fn() }
      sw.fakeFetch.mockResolvedValue(navResponse)

      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/pray/2026-02-04/lauds',
        method: 'GET',
        mode: 'navigate',
      })
      handler(event)

      expect(event.respondWith).toHaveBeenCalledTimes(1)
      const result = await event.respondWith.mock.calls[0][0]
      expect(result).toBe(navResponse)
      expect(sw.fakeFetch).toHaveBeenCalledTimes(1)
      expect(sw.fakeCache.put).not.toHaveBeenCalled()
      expect(navResponse.clone).not.toHaveBeenCalled()
    })

    // WI #19 / FR-163 — ?month=YYYY-MM URL (GOAL #4 의 신규 month-mode
    // 라우팅) 은 정상적인 navigation request 이므로 기존 network-only
    // 분기를 그대로 타야 한다. 별도 path 매칭 없이 `request.mode ===
    // 'navigate'` 만으로 분기되는지 회귀 가드.
    it('?month= URL (FR-163) routes through network-only path (no cache.put)', async () => {
      const navResponse = { ok: true, clone: vi.fn() }
      sw.fakeFetch.mockResolvedValue(navResponse)

      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/?month=2026-05',
        method: 'GET',
        mode: 'navigate',
      })
      handler(event)

      expect(event.respondWith).toHaveBeenCalledTimes(1)
      const result = await event.respondWith.mock.calls[0][0]
      expect(result).toBe(navResponse)
      expect(sw.fakeFetch).toHaveBeenCalledTimes(1)
      // navigation 은 cache 에 절대 put 되지 않음 — ?month= 도 동일.
      expect(sw.fakeCache.put).not.toHaveBeenCalled()
      expect(navResponse.clone).not.toHaveBeenCalled()
    })

    it('falls back to cached /offline.html when network is unreachable', async () => {
      const offline = { body: 'offline', ok: true }
      sw.fakeFetch.mockRejectedValue(new Error('net down'))
      sw.fakeCaches.match.mockResolvedValue(offline)

      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/',
        method: 'GET',
        mode: 'navigate',
      })
      handler(event)

      const result = await event.respondWith.mock.calls[0][0]
      expect(sw.fakeCaches.match).toHaveBeenCalledWith('/offline.html')
      expect(result).toBe(offline)
      expect(sw.fakeCache.put).not.toHaveBeenCalled()
    })
  })

  describe('fetch — static assets are cache-first', () => {
    it.each([['script'], ['style'], ['font'], ['image']])(
      'serves %s from cache when present, without hitting network',
      async (destination) => {
        const cached = { body: 'from-cache', ok: true }
        sw.fakeCaches.match.mockResolvedValue(cached)

        const handler = sw.listeners.get('fetch')!
        const event = makeEvent({
          url: `http://localhost:3200/assets/${destination}.bin`,
          method: 'GET',
          destination,
        })
        handler(event)

        const result = await event.respondWith.mock.calls[0][0]
        expect(result).toBe(cached)
        expect(sw.fakeFetch).not.toHaveBeenCalled()
        expect(sw.fakeCache.put).not.toHaveBeenCalled()
      },
    )

    it('fetches + caches when asset is missing from cache and response is ok', async () => {
      sw.fakeCaches.match.mockResolvedValue(undefined)
      const networkResponse = { ok: true, clone: vi.fn(() => 'cloned') }
      sw.fakeFetch.mockResolvedValue(networkResponse)

      const handler = sw.listeners.get('fetch')!
      const req: FakeRequest = {
        url: 'http://localhost:3200/_next/static/chunks/main.js',
        method: 'GET',
        destination: 'script',
      }
      const event = makeEvent(req)
      handler(event)

      const result = await event.respondWith.mock.calls[0][0]
      expect(sw.fakeFetch).toHaveBeenCalledTimes(1)
      expect(result).toBe(networkResponse)

      // wait for async cache.put chain
      await new Promise((r) => setTimeout(r, 0))
      expect(sw.fakeCache.put).toHaveBeenCalledWith(req, 'cloned')
    })

    it('does NOT cache a non-ok response', async () => {
      sw.fakeCaches.match.mockResolvedValue(undefined)
      const badResponse = { ok: false, clone: vi.fn() }
      sw.fakeFetch.mockResolvedValue(badResponse)

      const handler = sw.listeners.get('fetch')!
      const event = makeEvent({
        url: 'http://localhost:3200/broken.png',
        method: 'GET',
        destination: 'image',
      })
      handler(event)

      await event.respondWith.mock.calls[0][0]
      await new Promise((r) => setTimeout(r, 0))
      expect(sw.fakeCache.put).not.toHaveBeenCalled()
      expect(badResponse.clone).not.toHaveBeenCalled()
    })
  })
})
