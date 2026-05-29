import { test, expect, type Page } from '@playwright/test'

// Root-cause regression for GOAL #80 — PDF "번갈아 가면서 까맣게".
//
// Root cause (dvo-sol #66/#68 investigation): the PDF page reading column had
// no background of its own, so it inherited the app container's
// `dark:bg-neutral-950` (#1a1510). Whenever the canvas is `invisible`
// (status !== 'ready' — i.e. loading / error / mid-navigation) the dark
// container showed through as a *black page* in dark mode. Additionally, the
// 2-up cover spread (book page 1) produced a canvas taller than the iOS
// Safari ~4096px limit at high dpr, failing the render (→ also black).
//
// Fix (WI-81): (1) the page surface (`pdf-canvas-frame`) is a theme-independent
// "paper" background in every state; (2) the device-pixel render scale is
// clamped so the backing store stays within mobile-safe canvas limits.
//
// These assertions read the COMPOSITED page-surface color (computed style of a
// real <div>, which IS painted — unlike the canvas backing-store getImageData
// that misled the v1 analysis) and the canvas backing dimensions directly.

const PAPER = 'rgb(255, 253, 249)' // --color-white #fffdf9 (theme-independent)
const FRAME = '[data-role="pdf-canvas-frame"]'
const CANVAS = '[data-role="pdf-canvas"]'
const MAX_CANVAS_DIM = 4096
const MAX_CANVAS_AREA = 16_777_216

function frameBg(page: Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? getComputedStyle(el).backgroundColor : null
  }, FRAME)
}
function canvasState(page: Page) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel) as HTMLCanvasElement | null
    return c
      ? { w: c.width, h: c.height, invisible: c.className.includes('invisible') }
      : null
  }, CANVAS)
}

// ── D1: page surface stays paper in dark mode across ALL render states ──
test.describe('PDF page surface is theme-independent paper (dark mode) [#80]', () => {
  test.use({ colorScheme: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

  test('ready: page surface is paper, not the dark container', async ({ page }) => {
    await page.goto('/pdf/7')
    await expect(page.locator(CANVAS)).not.toHaveClass(/invisible/, { timeout: 9000 })
    expect(await frameBg(page)).toBe(PAPER)
  })

  test('loading (canvas invisible): page surface is paper, NOT black', async ({ page }) => {
    // Stall the PDF fetch so the canvas stays invisible (status === 'loading').
    await page.route('**/psalter.pdf', async (route) => {
      await new Promise((r) => setTimeout(r, 5000))
      await route.continue()
    })
    await page.goto('/pdf/7')
    await page.waitForTimeout(1000)
    const st = await canvasState(page)
    expect(st?.invisible).toBe(true) // we are genuinely in the non-ready path
    expect(await frameBg(page)).toBe(PAPER) // and the surface is paper, not (26,21,16)
  })

  test('error (render failed): page surface is paper, NOT black', async ({ page }) => {
    await page.route('**/psalter.pdf', (route) => route.abort())
    await page.goto('/pdf/7')
    await expect(page.locator('[data-role="pdf-error"]')).toBeVisible({ timeout: 9000 })
    const st = await canvasState(page)
    expect(st?.invisible).toBe(true)
    expect(await frameBg(page)).toBe(PAPER) // error backdrop is paper, not (34,21,16)
  })
})

// ── D2: canvas backing store clamped to mobile-safe limits at high dpr ──
for (const dpr of [3, 3.5, 4]) {
  test.describe(`PDF canvas backing-store clamp @ dpr=${dpr} [#80]`, () => {
    test.use({ colorScheme: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr })

    test('book page 1 (tallest 2-up spread) stays within iOS canvas limits', async ({ page }) => {
      await page.goto('/pdf/1')
      await expect(page.locator(CANVAS)).not.toHaveClass(/invisible/, { timeout: 9000 })
      const st = await canvasState(page)
      expect(st).not.toBeNull()
      expect(st!.w).toBeLessThanOrEqual(MAX_CANVAS_DIM)
      expect(st!.h).toBeLessThanOrEqual(MAX_CANVAS_DIM)
      expect(st!.w * st!.h).toBeLessThanOrEqual(MAX_CANVAS_AREA)
    })
  })
}

// ── D3: light mode unchanged (no regression) ──
test.describe('PDF page surface in light mode (no regression) [#80]', () => {
  test.use({ colorScheme: 'light', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })

  test('ready: page surface is paper and canvas renders', async ({ page }) => {
    await page.goto('/pdf/7')
    await expect(page.locator(CANVAS)).not.toHaveClass(/invisible/, { timeout: 9000 })
    expect(await frameBg(page)).toBe(PAPER)
    const st = await canvasState(page)
    expect(st!.w).toBeGreaterThan(0)
    expect(st!.h).toBeGreaterThan(0)
  })
})
