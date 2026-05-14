#!/usr/bin/env node
// Task #3 시각 검증 캡처 스크립트 — 사용자 directive (2026-05-14) 적용 후
// 시편 본문 refrain 가 까만색으로 렌더되는지 light + dark 모드 모두 확인.
//
// 사용: node scripts/capture-task3-refrain-screenshots.mjs
// 사전: dev server 가 http://localhost:3300 에서 실행 중이어야 함.

import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const BASE = 'http://localhost:3300'
const OUT_DIR = '.playwright-mcp'

// AC5 가 명시한 페이지들. Daniel 3 의 경우 OT Week 1 SUN Lauds 는
// Daniel 3:52-57 (단축형) 을 사용하므로 그것을 캡처. Revelation 19:1-7 은
// Sunday II Vespers — psalter Week 2 Saturday 의 vespers (다음 일요일의
// First Vespers) 또는 일반 Sunday Vespers. Psalm 24/46/136 은 각 시편이
// 등장하는 평일 lauds/vespers 페이지.
const SHOTS = [
  // Daniel 3:52-57 canticle (OT Wk1 SUN Lauds)
  { name: 'daniel3-canticle', url: `${BASE}/pray/2026-01-18/lauds`, label: 'Daniel 3:52-57' },
  // Psalm 24 (psalter Wk1 TUE Lauds — allowlist forced refrains)
  { name: 'psalm24', url: `${BASE}/pray/2026-01-13/lauds`, label: 'Psalm 24:1-10' },
  // Psalm 150 (Easter Wk4 SUN Lauds — denylist guard)
  { name: 'psalm150', url: `${BASE}/pray/2026-04-26/lauds`, label: 'Psalm 150:1-6' },
  // Psalm 118 (OT Wk1 SUN Lauds — legacy stanza-refrain path with 3 refrains)
  { name: 'psalm118', url: `${BASE}/pray/2026-01-18/lauds`, label: 'Psalm 118:1-16' },
  // Psalm 67 (psalter Wk3 TUE Lauds — allowlist forced refrains)
  { name: 'psalm67', url: `${BASE}/pray/2026-03-10/lauds`, label: 'Psalm 67:2-8' },
]

const MODES = ['light', 'dark']

async function run() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const mode of MODES) {
      const context = await browser.newContext({
        ...devices['Pixel 7'],
        colorScheme: mode === 'dark' ? 'dark' : 'light',
      })
      const page = await context.newPage()
      for (const shot of SHOTS) {
        console.log(`[${mode}] navigating to ${shot.url} (${shot.label})...`)
        await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 60_000 })
        // Apply dark/light via the app's data-theme attribute as fallback.
        if (mode === 'dark') {
          await page.evaluate(() => {
            document.documentElement.classList.add('dark')
          })
        } else {
          await page.evaluate(() => {
            document.documentElement.classList.remove('dark')
          })
        }
        // Find the target section and scroll it into view.
        const section = page.locator(`section[aria-label="${shot.label}"]`).first()
        if (await section.count() === 0) {
          console.warn(`  WARN: section ${shot.label} not found on ${shot.url}`)
          continue
        }
        await section.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)
        // Capture the section in isolation.
        const box = await section.boundingBox()
        if (!box) continue
        const path = `${OUT_DIR}/task3-${shot.name}-${mode}.png`
        await page.screenshot({
          path,
          clip: {
            x: Math.max(0, box.x - 8),
            y: Math.max(0, box.y - 8),
            width: Math.min(360, box.width + 16),
            height: Math.min(900, box.height + 16),
          },
        })
        // Also report the count of red-classed refrain elements (must be 0).
        const redCount = await section.locator(
          ':is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-700, :is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-400',
        ).count()
        const refrainCount = await section.locator(
          '[data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]',
        ).count()
        console.log(`  ${path}: ${refrainCount} refrain elements, ${redCount} with red class (must be 0)`)
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
