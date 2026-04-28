/**
 * capture-fr160b-pr9a-screenshots.mjs — FR-160-B PR-9a directive surface.
 *
 * Renders dates that trigger PR-2~7 marked conditionalRubrics so the
 * Layer 4.5 sectionOverrides surface (PR-9a) is observable:
 *
 *   case1: 2026-04-05 (Easter Sunday) Lauds
 *          — easter.json easterSunday lauds psalmody substitute fires
 *          (when: season=EASTER + predicate=isFirstHourOfDay)
 *   case2: 2026-05-24 (Pentecost) Lauds
 *          — easter.json pentecost lauds psalmody substitute fires
 *
 * Both cases should display a `data-role="conditional-rubric-directive"`
 * `data-mode="substitute"` notice in place of the psalmody body.
 */

import { chromium, devices } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp')

const PORT = process.env.SCREENSHOT_PORT || '3204'
const BASE_URL = `http://localhost:${PORT}`

const CASES = [
  {
    id: 'easter-sunday-lauds-psalmody-substitute',
    url: `${BASE_URL}/pray/2026-04-05/lauds`,
    desc: 'Easter Sunday Lauds — psalmody substitute',
  },
  {
    id: 'pentecost-lauds-psalmody-substitute',
    url: `${BASE_URL}/pray/2026-05-24/lauds`,
    desc: 'Pentecost Lauds — psalmody substitute',
  },
]

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()

  for (const c of CASES) {
    console.log(`[capture] ${c.id} → ${c.url}`)
    await page.goto(c.url, { waitUntil: 'networkidle' })
    // Wait for either a directive to render OR the regular psalmody to mount.
    await page.waitForSelector('[data-role="psalmody-section"], [data-role="conditional-rubric-directive"]', { timeout: 10_000 }).catch(() => {})

    const probe = await page.evaluate(() => {
      const dirs = Array.from(document.querySelectorAll('[data-role="conditional-rubric-directive"]'))
      return {
        directiveCount: dirs.length,
        modes: dirs.map((d) => d.getAttribute('data-mode')),
        rubricIds: dirs.map((d) => d.getAttribute('data-rubric-id')),
        firstText: dirs[0]?.textContent?.trim() ?? null,
      }
    })
    console.log(`  directives=${probe.directiveCount} modes=${probe.modes.join(',')}`)
    console.log(`  rubricIds=${probe.rubricIds.join(',')}`)
    if (probe.firstText) console.log(`  firstText="${probe.firstText.slice(0, 100)}…"`)

    const outPath = resolve(OUT_DIR, `fr160b-pr9a-${c.id}.png`)
    await page.screenshot({ path: outPath, fullPage: true })
    console.log(`  saved → ${outPath.replace(REPO_ROOT + '/', '')}`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
