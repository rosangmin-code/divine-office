/**
 * capture-fr153f-screenshots.mjs — FR-153f 렌더 회귀 baseline.
 *
 * 3 대표 케이스 × 스크린샷 + DOM probe:
 *   case1: Psalm 63:2-9 (serial psalm, stanza 여러 개 + Gloria Patri)
 *   case2: Daniel 3:57-88, 56 (refrain canticle — role='refrain' 빨간색)
 *   case3: Psalm 149:1-9 (simple single-stanza flat)
 *
 * 모두 `/pray/2026-01-18/lauds` (Ordinary Time Week 1 SUN Lauds) 에서 발견됨.
 */

import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(REPO_ROOT, '.playwright-mcp')
// 2026-02-08 = OT 5th Sunday lauds with psalterWeek=1 → Ps 63 + Dan 3:57-88 + Ps 149
const URL = 'http://localhost:3200/pray/2026-02-08/lauds'

const CASES = [
  {
    id: 'case1-psalm63-serial',
    ref: 'Psalm 63:2-9',
    ariaLabel: 'Psalm 63:2-9',
  },
  {
    id: 'case2-daniel3-refrain',
    ref: 'Daniel 3:57-88, 56',
    ariaLabel: 'Daniel 3:57-88, 56',
  },
  {
    id: 'case3-psalm149-simple',
    ref: 'Psalm 149:1-9',
    ariaLabel: 'Psalm 149:1-9',
  },
]

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1400 },
  })
  const page = await context.newPage()

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-role="psalm-stanza"]')

  // 전체 stanza/refrain DOM probe 요약
  const summary = await page.evaluate(() => {
    const stanzas = document.querySelectorAll('[data-role="psalm-stanza"]')
    const refrains = document.querySelectorAll('[data-role="psalm-stanza-refrain"]')
    const redRefrains = Array.from(refrains).filter((el) =>
      (el.className || '').includes('text-red-700'),
    )
    return {
      stanzaCount: stanzas.length,
      refrainLineCount: refrains.length,
      redRefrainCount: redRefrains.length,
    }
  })
  console.log(
    `[probe] stanzas=${summary.stanzaCount} refrain-lines=${summary.refrainLineCount} red=${summary.redRefrainCount}`,
  )

  for (const c of CASES) {
    const section = page.locator(`section[aria-label="${c.ariaLabel}"]`).first()
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    const outPath = resolve(OUT_DIR, `fr153f-${c.id}.png`)
    await section.screenshot({ path: outPath })

    const local = await section.evaluate((el) => {
      const stanzas = el.querySelectorAll('[data-role="psalm-stanza"]')
      const refrains = el.querySelectorAll('[data-role="psalm-stanza-refrain"]')
      return {
        stanzaCount: stanzas.length,
        stanzaLineCounts: Array.from(stanzas).map((s) => s.querySelectorAll('span').length),
        refrainLineCount: refrains.length,
        refrainTexts: Array.from(refrains)
          .slice(0, 3)
          .map((r) => (r.textContent || '').trim()),
      }
    })
    console.log(
      `[${c.id}] ref=${c.ref} stanzas=${local.stanzaCount} lines=${local.stanzaLineCounts.join(',')} refrains=${local.refrainLineCount} samples=${JSON.stringify(local.refrainTexts)}`,
    )
    console.log(`[${c.id}] → ${outPath.replace(REPO_ROOT + '/', '')}`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
