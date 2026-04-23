#!/usr/bin/env node
// Temporary pilot screenshot: /pray/2026-01-18/lauds concludingPrayer section.
// Captures the rendered concluding prayer block and saves to scripts/out/pilot-lauds-concluding.png
// so the user can visually compare against PDF book page 753.

import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const OUT_FULL = resolve(ROOT, 'scripts/out/pilot-lauds-full.png')
const OUT_CROP = resolve(ROOT, 'scripts/out/pilot-lauds-concluding.png')

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 420, height: 1800 } })
const page = await context.newPage()

const url = 'http://localhost:3200/pray/2026-01-18/lauds'
process.stderr.write(`[pilot-shot] loading ${url}\n`)
const response = await page.goto(url, { waitUntil: 'networkidle' })
if (!response || !response.ok()) {
  process.stderr.write(`[pilot-shot] non-OK status ${response?.status()}\n`)
}

await page.screenshot({ path: OUT_FULL, fullPage: true })
process.stderr.write(`[pilot-shot] full page -> ${OUT_FULL}\n`)

const section = page.locator('section[aria-label="Төгсгөлийн даатгал залбирал"]').first()
if (await section.count() > 0) {
  await section.screenshot({ path: OUT_CROP })
  process.stderr.write(`[pilot-shot] concluding prayer crop -> ${OUT_CROP}\n`)
} else {
  process.stderr.write('[pilot-shot] concluding-prayer section not found\n')
}

const responsory = page.locator('section[aria-label="Хариу залбирал"]').first()
const OUT_RESP = resolve(ROOT, 'scripts/out/pilot-lauds-responsory.png')
if (await responsory.count() > 0) {
  await responsory.screenshot({ path: OUT_RESP })
  process.stderr.write(`[pilot-shot] responsory crop -> ${OUT_RESP}\n`)
} else {
  process.stderr.write('[pilot-shot] responsory section not found\n')
}

await browser.close()
