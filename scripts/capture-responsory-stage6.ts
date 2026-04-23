/**
 * capture-responsory-stage6.ts — FR-153d (responsory Rich 확산) 회귀 증빙.
 *
 * 3개 경로 모두 실제 브라우저에서 rich overlay 가 반영되는지 확인.
 *   1) 2026-01-18 OT w1 SUN Lauds — seasonal + psalter commons + hymn 카탈로그
 *      (FR-153 pilot 날짜) 전 경로 경유
 *   2) 2026-02-04 WED Lauds — psalter commons 만 활성 (OT 평일)
 *   3) 2026-01-18 SUN Compline — ordinarium commons 활성
 *
 * 각 경로에서 `[data-role="responsory"]` 가 아닌 `.rich-content` 분기가
 * 렌더되는지 screenshot + DOM probe 로 교차 확인. dev server 는 port 3200
 * 에서 이미 실행 중이어야 함.
 */

import { chromium, type Page } from '@playwright/test'

const BASE = 'http://localhost:3200'
const OUT = '.playwright-mcp'

async function probeResponsory(page: Page, label: string) {
  const respRoot = page.locator('[data-role="responsory"]').first()
  const richWrapper = respRoot.locator('> div.space-y-2')
  const hasRich = (await richWrapper.count()) > 0
  const paragraphCount = hasRich ? await richWrapper.locator('> p').count() : 0
  // 1·3·5 번째 p 는 response kind → Х. 접두어 span (text-red-700)
  let redPrefixesOnResponseLines = 0
  if (hasRich) {
    for (const idx of [0, 2, 4]) {
      const p = richWrapper.locator('> p').nth(idx)
      const redSpan = p.locator('span.text-red-700').first()
      if ((await redSpan.count()) > 0) redPrefixesOnResponseLines++
    }
  }
  // 2 번째 p 는 versicle kind → В. 접두어 span
  let versicleRedPrefix = 0
  if (hasRich) {
    const p = richWrapper.locator('> p').nth(1)
    const redSpan = p.locator('span.text-red-700').first()
    if ((await redSpan.count()) > 0) versicleRedPrefix = 1
  }
  const glorySeen = await page.getByText('Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.').count()
  console.log(
    `[${label}] data-role=responsory:${await respRoot.count()} rich-wrapper:${hasRich ? 1 : 0} blocks=${paragraphCount} red-on-responses(1/3/5)=${redPrefixesOnResponseLines}/3 red-on-versicle(2)=${versicleRedPrefix}/1 glorySeen=${glorySeen}`,
  )
}

async function captureCase(
  page: Page,
  label: string,
  url: string,
  outPath: string,
) {
  await page.goto(url, { waitUntil: 'networkidle' })
  const anchor = page.locator('text=Хариу залбирал').first()
  await anchor.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  await anchor.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(500)
  await probeResponsory(page, label)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`[${label}] saved → ${outPath}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } })

  // Case 1 — 2026-01-18 OT w1 SUN Lauds (pilot 날짜, 전 경로)
  await captureCase(
    page,
    'CASE1 pilot OT w1 SUN Lauds',
    `${BASE}/pray/2026-01-18/lauds`,
    `${OUT}/fr153d-case1-ot-w1-sun-lauds.png`,
  )

  // Case 2 — 2026-02-04 WED Lauds (psalter commons only)
  await captureCase(
    page,
    'CASE2 OT weekday (2026-02-04) Lauds',
    `${BASE}/pray/2026-02-04/lauds`,
    `${OUT}/fr153d-case2-ot-weekday-lauds.png`,
  )

  // Case 3 — 2026-01-18 SUN Compline (ordinarium commons)
  await captureCase(
    page,
    'CASE3 SUN Compline',
    `${BASE}/pray/2026-01-18/compline`,
    `${OUT}/fr153d-case3-sun-compline.png`,
  )

  await browser.close()
  console.log('\nAll 3 screenshots saved under', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
