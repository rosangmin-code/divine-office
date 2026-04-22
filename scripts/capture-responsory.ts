import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } })

  // 1. Ordinary weekday Lauds — 6-part
  await page.goto('http://localhost:3200/pray/2026-02-04/lauds')
  const resp = page.locator('[data-role="responsory"]')
  await resp.waitFor({ state: 'visible', timeout: 10_000 })
  await resp.scrollIntoViewIfNeeded()
  await resp.screenshot({ path: '.playwright-mcp/responsory-6part-lauds.png' })

  // 2. Advent 1st Sunday Vespers — seasonal propers responsory (different fullResponse + real versicle)
  await page.goto('http://localhost:3200/pray/2025-11-30/vespers')
  const resp2 = page.locator('[data-role="responsory"]')
  await resp2.waitFor({ state: 'visible', timeout: 10_000 })
  await resp2.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await resp2.screenshot({ path: '.playwright-mcp/responsory-6part-advent.png' })

  // 3. Mobile viewport — ordinary weekday Vespers
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } })
  await mobile.goto('http://localhost:3200/pray/2026-02-04/vespers', { waitUntil: 'networkidle' })
  const respMobile = mobile.locator('[data-role="responsory"]')
  await respMobile.waitFor({ state: 'visible', timeout: 10_000 })
  await respMobile.scrollIntoViewIfNeeded()
  await mobile.waitForTimeout(600)
  await respMobile.screenshot({ path: '.playwright-mcp/responsory-6part-mobile.png' })

  await browser.close()
  console.log('saved 3 screenshots')
}

main().catch((e) => { console.error(e); process.exit(1) })
