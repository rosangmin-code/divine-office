import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * FR-152 — 응송(Хариу залбирал) 6행 구조의 남은 스펙.
 *
 * #5 (WI 10, 2026-05-19) — responsory 본문은 plain 3-필드 (fullResponse /
 * versicle / shortResponse) 의 deterministic 6-line emission 으로 통일.
 * 과거 rich AST 본문 path (`<div class="space-y-2">` 5-block 래퍼 + Х./В.
 * 키릴 prefix) 는 PDF 본문 (`-` hyphen-only universal 6-line pattern) 과
 * 불일치라 제거되었다 — 본 파일의 FR-153d describe 는 그 PDF 정합 계약을
 * 고정한다.
 *
 * Triduum 간소화 form(Holy Thursday/Friday/Saturday)은 렌더러에 구현되어
 * 있으나 propers 데이터에 성삼일 responsory 자체가 빈 필드 상태이므로
 * psalter commons 로 폴백된다. 간소화 분기의 유닛 테스트는 별도 스코프.
 */

const GLORY_BE_MN = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

test.describe('Responsory API + data-role contract (FR-152)', () => {
  // @fr FR-152
  test('API exposes new 3-field responsory shape (fullResponse, versicle, shortResponse)', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp).toBeTruthy()
    expect(typeof resp.fullResponse).toBe('string')
    expect(typeof resp.versicle).toBe('string')
    expect(typeof resp.shortResponse).toBe('string')
    expect(resp.fullResponse.length).toBeGreaterThan(0)
    expect(resp.versicle.length).toBeGreaterThan(0)
    expect(resp.shortResponse.length).toBeGreaterThan(0)
    // 구 필드가 남아 있으면 안 됨 — 스키마 회귀 방지
    expect(resp.response).toBeUndefined()
  })

  // @fr FR-152
  test('responsory section carries data-role marker for decoupled selectors', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(page.locator('[data-role="responsory"]')).toHaveCount(1)
  })
})

/**
 * FR-153d — responsory 본문 PDF 6-line emission (post-#5).
 *
 * PDF universal 6-line 패턴 (Sample: 시편 commons / compline commons):
 *   1. fullResponse (cantor, NO `-` prefix)
 *   2. - fullResponse (response)
 *   3. versicle (cantor, NO `-` prefix)
 *   4. - shortResponse (response)
 *   5. Glory Be ("Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.", NO `-` prefix)
 *   6. - fullResponse (response)
 *
 * DOM 계약: `[data-role="responsory"] > p` 헤더 1 + body `<p>` 6 (총 7 개,
 * rich.blocks 에 rubric-line 가 있으면 +N — 부활 시즌 instruction 등).
 * 응답구 prefix 는 line 2/4/6 (response 행) 에만 `<span class="text-liturgical-gold">- </span>`
 * 로 등장 (WI-62 재스킨: 골드 악센트).
 *
 * 검증 경로 3종:
 *   1) OT w1 SUN Lauds — psalter commons 카탈로그 (pilot 이관 후 seasonal
 *      에 responsoryRich 없음, commons 가 source of truth)
 *   2) OT 평일 Lauds — psalter commons 카탈로그 (weekday 주기 확인)
 *   3) SUN Compline — ordinarium commons 카탈로그
 */
test.describe('Responsory body — PDF 6-line emission (FR-153d, post-#5)', () => {
  // @fr FR-153d
  test('OT w1 SUN Lauds — PDF 6-line emission', async ({ page, request }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    // 본문 6 `<p>` (헤더 제외) — body paragraphs 만 카운트.
    //   :scope > p:not(:first-child) — header 가 항상 첫 `<p>`.
    // psalter commons rich 에는 rubric-line 이 없으므로 정확히 6 행.
    const bodyParagraphs = responsory.locator(':scope > p:not(:first-child):not([data-role="responsory-rubric-line"])')
    await expect(bodyParagraphs).toHaveCount(6)

    // WI-62 재스킨: 응답구 `-` 하이픈 prefix 는 골드 악센트. line 2/4/6 (인덱스 1/3/5).
    for (const idx of [1, 3, 5]) {
      const prefix = bodyParagraphs.nth(idx).locator('span.text-liturgical-gold').first()
      await expect(prefix).toBeVisible()
      await expect(prefix).toHaveText('- ')
    }

    // Glory Be 는 5번째 (index 4) 본문 행.
    await expect(bodyParagraphs.nth(4)).toContainText(GLORY_BE_MN)

    // 과거 rich AST 마커 (Х./В.) 가 더 이상 등장하지 않아야 한다.
    await expect(responsory.getByText('Х.', { exact: false })).toHaveCount(0)
    await expect(responsory.getByText('В.', { exact: false })).toHaveCount(0)

    // API source tag 가 psalter commons 카탈로그에서 왔음을 확인 (rich.source
    // 자체는 API 응답에 여전히 노출 — 렌더가 본문을 plain 으로 처리할 뿐).
    const api = await request.get(`/api/loth/${DATES.otWeek1Sunday}/lauds`)
    expect(api.status()).toBe(200)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    expect(resp?.rich?.source?.id).toMatch(/^psalter-w\d+-sun-lauds-responsory$/)
  })

  // @fr FR-153d
  test('OT weekday Lauds — PDF 6-line emission (weekday periodization)', async ({
    page,
    request,
  }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    const bodyParagraphs = responsory.locator(':scope > p:not(:first-child):not([data-role="responsory-rubric-line"])')
    await expect(bodyParagraphs).toHaveCount(6)

    await expect(responsory.getByText('Х.', { exact: false })).toHaveCount(0)
    await expect(responsory.getByText('В.', { exact: false })).toHaveCount(0)

    const api = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    // 2026-02-04 WED — psalterWeek 은 romcal 에 따라 달라지지만 day 는 항상 wed
    expect(resp?.rich?.source?.id).toMatch(/^psalter-w\d+-wed-lauds-responsory$/)
  })

  // @fr FR-153d
  test('Sunday Compline — PDF 6-line emission (ordinarium commons)', async ({ page, request }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/compline`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    const bodyParagraphs = responsory.locator(':scope > p:not(:first-child):not([data-role="responsory-rubric-line"])')
    await expect(bodyParagraphs).toHaveCount(6)

    await expect(responsory.getByText('Х.', { exact: false })).toHaveCount(0)
    await expect(responsory.getByText('В.', { exact: false })).toHaveCount(0)

    const api = await request.get(`/api/loth/${DATES.otWeek1Sunday}/compline`)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    expect(resp?.rich?.source?.id).toBe('compline-responsory')
  })
})
