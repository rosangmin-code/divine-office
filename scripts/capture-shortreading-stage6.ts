/**
 * capture-shortreading-stage6.ts — FR-153e (shortReading Rich 확산) 회귀 증빙.
 *
 * 3개 경로 모두 실제 브라우저에서 rich overlay 가 반영되는지 확인.
 *   1) 2025-11-30 Advent w1 SUN Lauds — seasonal propers shortReadingRich
 *      (Ром 13:11-14, prayers/seasonal/advent/w1-SUN-lauds.rich.json)
 *   2) 2026-02-04 OT w4 WED Lauds — psalter commons shortReadingRich
 *      (Дэд хууль 4:39-40а, prayers/commons/psalter/w4-WED-lauds.rich.json)
 *   3) 2026-01-18 SUN Compline — compline commons shortReadingRich
 *      (Илчлэл 22:4-5, prayers/commons/compline/SUN.rich.json)
 *
 * 각 경로에서 `<RichContent>` 단일 컨테이너 (`div.space-y-2 > p × 1`) 가
 * 렌더되고 legacy `<sup>` 절 번호가 없는지 DOM probe + screenshot.
 * dev server 는 port 3200 에서 이미 실행 중이어야 함.
 *
 * 출력 PNG 는 `.playwright-mcp/` (gitignore) 에 저장 — 본 스크립트만 커밋,
 * 이미지는 로컬 증빙. T5 capture-responsory-stage6.ts 와 동일 패턴.
 */

import { chromium, type Page } from '@playwright/test'

const BASE = 'http://localhost:3200'
const OUT = '.playwright-mcp'

async function probeShortReading(page: Page, label: string) {
  const section = page.locator('section[aria-label="Уншлага"]').first()
  const sectionCount = await section.count()
  const richWrapper = section.locator('div.space-y-2')
  const hasRich = (await richWrapper.count()) > 0
  const paragraphCount = hasRich ? await richWrapper.locator('> p').count() : 0
  // legacy 분기는 verses[].verse > 0 일 때 `<sup>` 절 번호를 표시.
  // rich 분기는 verses[] 자체를 우회하므로 sup 0 개여야 함.
  const supCount = await section.locator('sup').count()
  console.log(
    `[${label}] section[aria-label=Уншлага]:${sectionCount} rich-wrapper:${hasRich ? 1 : 0} paragraphs=${paragraphCount} legacy-sup=${supCount}`,
  )
}

async function captureCase(
  page: Page,
  label: string,
  url: string,
  outPath: string,
) {
  await page.goto(url, { waitUntil: 'networkidle' })
  const anchor = page.locator('section[aria-label="Уншлага"]').first()
  await anchor.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  await anchor.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(500)
  await probeShortReading(page, label)
  await anchor.screenshot({ path: outPath })
  console.log(`[${label}] saved → ${outPath}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } })

  // Case 1 — 2025-11-30 Advent w1 SUN Lauds (seasonal propers 분기)
  await captureCase(
    page,
    'CASE1 seasonal Advent w1 SUN Lauds',
    `${BASE}/pray/2025-11-30/lauds`,
    `${OUT}/fr153e-case1-seasonal-advent-w1-sun-lauds.png`,
  )

  // Case 2 — 2026-02-04 OT w4 WED Lauds (psalter commons 분기)
  await captureCase(
    page,
    'CASE2 psalter commons OT w4 WED Lauds',
    `${BASE}/pray/2026-02-04/lauds`,
    `${OUT}/fr153e-case2-psalter-commons-ot-wed-lauds.png`,
  )

  // Case 3 — 2026-01-18 SUN Compline (compline commons 분기)
  await captureCase(
    page,
    'CASE3 compline commons SUN Compline',
    `${BASE}/pray/2026-01-18/compline`,
    `${OUT}/fr153e-case3-compline-commons-sun.png`,
  )

  await browser.close()
  console.log('\nAll 3 screenshots saved under', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
