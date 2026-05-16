// WI #39 — Playwright visual verification: Магтуу section red_count=0
// 호출: node scripts/wi-39-visual-verify.mjs
// 출력: ~/.claude/pair-cowork/scratch/dvo/wi-39/{lauds|vespers|compline}-2026-05-15-hymn.png
//       + JSON report on stdout
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BASE = 'http://localhost:3201'
const OUT_DIR = join(homedir(), '.claude/pair-cowork/scratch/dvo/wi-39')

const HOURS = [
  { name: 'lauds', date: '2026-05-15' },
  { name: 'vespers', date: '2026-05-15' },
  { name: 'compline', date: '2026-05-15' },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } })
  const page = await ctx.newPage()

  const report = {}
  for (const hour of HOURS) {
    const url = `${BASE}/pray/${hour.date}/${hour.name}`
    await page.goto(url, { waitUntil: 'networkidle' })
    // wait until Магтуу section renders (or note absent)
    await page.waitForTimeout(300)

    const probe = await page.evaluate(() => {
      const sec = document.querySelector('[aria-label="Магтуу"]')
      if (!sec) return { present: false }
      const reds = sec.querySelectorAll('[class*="text-red"]')
      const refrains = sec.querySelectorAll('[data-role="psalm-phrase-refrain"]')
      return {
        present: true,
        redCount: reds.length,
        refrainCount: refrains.length,
        firstRedClasses: Array.from(reds).slice(0, 3).map((e) => e.getAttribute('class')),
        // heading <p> first child text
        headingText: sec.querySelector('p')?.textContent?.slice(0, 40) ?? null,
      }
    })

    if (probe.present) {
      const sec = await page.$('[aria-label="Магтуу"]')
      const shotPath = join(OUT_DIR, `wi-39-${hour.name}-${hour.date}-hymn.png`)
      await sec.screenshot({ path: shotPath })
      probe.screenshot = shotPath
    }

    report[hour.name] = probe
  }

  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
