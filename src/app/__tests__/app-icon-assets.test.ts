import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (rel: string): Buffer => readFileSync(path.join(ROOT, rel))
const digest = (rel: string): string =>
  createHash('sha256').update(read(rel)).digest('hex')

// public/ 사본과 src/app/ 사본은 내용이 같아야 하지만 서빙 경로가 다르다:
//   src/app/icon.svg → App Router 규약. <link rel="icon"> 에 해시 쿼리
//                      (/icon.svg?icon.<hash>.svg) 로 삽입 — 브라우저 탭이 소비.
//   public/icon.svg  → 쿼리 없는 /icon.svg. manifest.ts 아이콘 레퍼런스와
//                      sw.js PRECACHE_URLS 가 소비 — 홈 화면/오프라인이 소비.
// 소비자가 다르므로 한쪽만 고치면 탭 파비콘과 홈 화면 아이콘이 조용히 갈라진다.
// GOAL #115 직전 커밋(f5bb35f^)에서 네 파일이 실제로 전부 어긋나 있었고,
// 그때는 이를 잡는 테스트가 없었다.
const MIRRORED_PAIRS = [
  ['public/icon.svg', 'src/app/icon.svg'],
  ['public/apple-icon.png', 'src/app/apple-icon.png'],
] as const

// Android 런처 maskable 크롭은 캔버스 중앙 80% 만 보장한다 (512 * 0.8 / 2).
const MASKABLE_SAFE_RADIUS = 205

/**
 * icon.svg 가 쓰는 직선 명령(M/H/h/V/v/L/l/Z)만 지원하는 최소 파서.
 * 곡선이 도입되면 unsupported 로 던져 safe-zone 검증이 조용히 무력화되는
 * 것을 막는다 — 그 경우 파서를 확장하라는 신호다.
 */
function pathPoints(d: string): Array<[number, number]> {
  const tokens = d.match(/[MmHhVvLlZz]|-?\d+(?:\.\d+)?/g) ?? []
  const points: Array<[number, number]> = []
  let x = 0
  let y = 0
  let i = 0

  while (i < tokens.length) {
    const command = tokens[i++]
    switch (command) {
      case 'M':
        x = Number(tokens[i++])
        y = Number(tokens[i++])
        break
      case 'm':
        x += Number(tokens[i++])
        y += Number(tokens[i++])
        break
      case 'L':
        x = Number(tokens[i++])
        y = Number(tokens[i++])
        break
      case 'l':
        x += Number(tokens[i++])
        y += Number(tokens[i++])
        break
      case 'H':
        x = Number(tokens[i++])
        break
      case 'h':
        x += Number(tokens[i++])
        break
      case 'V':
        y = Number(tokens[i++])
        break
      case 'v':
        y += Number(tokens[i++])
        break
      case 'Z':
      case 'z':
        continue
      default:
        throw new Error(`unsupported path command: ${command}`)
    }
    points.push([x, y])
  }

  return points
}

function parseTranslate(element: string): [number, number] {
  const match = element.match(
    /transform="translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)"/,
  )
  return match ? [Number(match[1]), Number(match[2])] : [0, 0]
}

describe('app icon assets', () => {
  // @fr FR-111
  it.each(MIRRORED_PAIRS)(
    '%s and %s are byte-identical (동기화 계약)',
    (publicCopy, appCopy) => {
      expect(existsSync(path.join(ROOT, publicCopy))).toBe(true)
      expect(existsSync(path.join(ROOT, appCopy))).toBe(true)
      expect(digest(publicCopy)).toBe(digest(appCopy))
    },
  )

  // @fr FR-111
  it('apple-icon.png is 180x180 with no alpha channel', () => {
    const png = read('public/apple-icon.png')

    // PNG signature(8) + IHDR length/type(8) → width@16, height@20,
    // bit depth@24, colour type@25.
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.readUInt32BE(16)).toBe(180)
    expect(png.readUInt32BE(20)).toBe(180)

    // iOS 홈 화면은 투명 픽셀을 검정으로 채운다. colour type 2(truecolour)
    // 또는 0(greyscale) 이어야 하며 tRNS 청크도 없어야 한다.
    expect([0, 2]).toContain(png[25])
    expect(png.includes(Buffer.from('tRNS'))).toBe(false)
  })

  // @fr FR-111
  it('icon.svg is full-bleed — an opaque rect covers the whole canvas', () => {
    const svg = read('public/icon.svg').toString('utf8')

    const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
    expect(viewBox, 'icon.svg must declare a square viewBox').not.toBeNull()
    const [width, height] = [Number(viewBox![1]), Number(viewBox![2])]
    expect(width).toBe(height)

    // 캔버스를 통째로 덮는 rect 가 있어야 투명 픽셀이 없다. 색상은 검증하지
    // 않는다 — 디자인 변경마다 깨지지 않도록 구조만 고정한다.
    const coverRect = new RegExp(
      `<rect[^>]*\\bwidth="${width}"[^>]*\\bheight="${height}"[^>]*>`,
    )
    expect(svg).toMatch(coverRect)

    // 라운드 코너(rx)를 두면 모서리가 투명해져 full-bleed 가 깨진다.
    // 런처/iOS 가 각자 마스크를 씌우므로 자산 쪽은 사각형을 유지한다.
    expect(svg).not.toMatch(/<rect[^>]*\brx=/)
    expect(svg).not.toMatch(/fill="none"/)
  })

  // @fr FR-111
  it('every icon.svg path stays inside the maskable safe circle', () => {
    const svg = read('public/icon.svg').toString('utf8')
    const centre = 512 / 2

    const elements = svg.match(/<path\b[^>]*>/g) ?? []
    expect(elements.length, 'icon.svg should contain at least one path').toBeGreaterThan(0)

    for (const element of elements) {
      const d = element.match(/\bd="([^"]+)"/)?.[1]
      expect(d, `path without a d attribute: ${element}`).toBeTruthy()

      const [dx, dy] = parseTranslate(element)
      for (const [x, y] of pathPoints(d!)) {
        const distance = Math.hypot(x + dx - centre, y + dy - centre)
        expect(
          distance,
          `point (${x + dx}, ${y + dy}) escapes the maskable safe circle`,
        ).toBeLessThanOrEqual(MASKABLE_SAFE_RADIUS)
      }
    }
  })

  // @fr FR-022
  it('manifest and service worker only reference icons that exist in public/', () => {
    const manifest = read('src/app/manifest.ts').toString('utf8')
    const sw = read('public/sw.js').toString('utf8')

    const manifestIcons = [
      ...manifest.matchAll(/src:\s*'(\/[^']+)'/g),
    ].map((match) => match[1])
    expect(manifestIcons.length).toBeGreaterThan(0)

    // PRECACHE_URLS 선언에서 리터럴 경로만 추출한다. cache.addAll 은 하나라도
    // 404 면 install 전체가 실패하므로 프리캐시 대상의 존재가 곧 계약이다.
    const precache = sw.match(/const PRECACHE_URLS = \[([^\]]*)\]/)?.[1] ?? ''
    const precacheUrls = [...precache.matchAll(/'(\/[^']+)'/g)].map(
      (match) => match[1],
    )

    for (const url of [...manifestIcons, ...precacheUrls]) {
      expect(
        existsSync(path.join(ROOT, 'public', url)),
        `${url} is referenced but missing from public/`,
      ).toBe(true)
    }
  })
})
