import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * FR-152 — 응송(Хариу залбирал) 6행 구조의 남은 스펙.
 *
 * 6-part DOM 구조(헤더 1 + 본문 6 = `<p>` 7개) 는 legacy string-field 경로의
 * 계약이었으나, FR-153d (Stage 6 T5a/T5b/T5c) 에서 responsory 가 rich AST
 * (`[data-role="responsory"] > div.space-y-2 > p × 5`) 로 전환되면서 더는
 * 활성 코드 경로 아님. legacy DOM 계약을 고정하던 테스트 3건은 이 파일에서
 * 제거되었고, 같은 의미는 아래 FR-153d describe 의 rich-wrapper + 5-block
 * 계약으로 대체된다. 여기 FR-152 describe 에 남은 2건은 rich 경로와 독립
 * 적인 API 스키마 + data-role 마커 회귀 안전망만 담는다.
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
 * FR-153d — responsory Rich 확산 (Stage 6 T5a/T5b/T5c).
 *
 * 3 경로 커버리지 회귀 안전망:
 *   1) OT w1 SUN Lauds — psalter commons 카탈로그 rich (pilot 이관 후 seasonal
 *      에 responsoryRich 없음, commons 가 source of truth)
 *   2) OT 평일 Lauds — psalter commons 카탈로그 rich (weekday 주기 확인)
 *   3) SUN Compline — ordinarium commons 카탈로그 rich
 *
 * DOM 계약: `[data-role="responsory"] > div.space-y-2` 가 `<p>` 5개
 * (V1 response / V2 versicle / R2 response / V3 Glory Be / R3 response) 를
 * 포함. response kind (1·3·5 번째) / versicle kind (2 번째) 는 `В.` / `Х.`
 * 접두어를 `span.text-red-700` 으로 렌더한다.
 */
test.describe('Responsory rich overlay — commons catalogs (FR-153d)', () => {
  // @fr FR-153d
  test('OT w1 SUN Lauds — psalter commons renders 5-block rich AST', async ({
    page,
    request,
  }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    const richWrapper = responsory.locator('> div.space-y-2')
    await expect(richWrapper).toHaveCount(1)

    const blocks = richWrapper.locator('> p')
    await expect(blocks).toHaveCount(5)

    // 1·3·5 (index 0/2/4) 번째 = response kind → red Х. 접두어
    for (const idx of [0, 2, 4]) {
      await expect(blocks.nth(idx).locator('span.text-red-700').first()).toBeVisible()
    }
    // 2 (index 1) = versicle kind → red В. 접두어
    await expect(blocks.nth(1).locator('span.text-red-700').first()).toBeVisible()
    // 4 (index 3) = Glory Be plain text (접두어 없음 text kind)
    await expect(blocks.nth(3)).toContainText(GLORY_BE_MN)

    // API source tag 가 psalter commons 카탈로그에서 왔음을 확인
    const api = await request.get(`/api/loth/${DATES.otWeek1Sunday}/lauds`)
    expect(api.status()).toBe(200)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    expect(resp?.rich?.source?.id).toMatch(/^psalter-w\d+-sun-lauds-responsory$/)
  })

  // @fr FR-153d
  test('OT weekday Lauds — psalter commons rich (weekday periodization)', async ({
    page,
    request,
  }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    const richWrapper = responsory.locator('> div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(richWrapper.locator('> p')).toHaveCount(5)

    const api = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    // 2026-02-04 WED — psalterWeek 은 romcal 에 따라 달라지지만 day 는 항상 wed
    expect(resp?.rich?.source?.id).toMatch(/^psalter-w\d+-wed-lauds-responsory$/)
  })

  // @fr FR-153d
  test('Sunday Compline — ordinarium commons rich', async ({ page, request }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/compline`)
    const responsory = page.locator('[data-role="responsory"]').first()
    await expect(responsory).toBeVisible()

    const richWrapper = responsory.locator('> div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(richWrapper.locator('> p')).toHaveCount(5)

    const api = await request.get(`/api/loth/${DATES.otWeek1Sunday}/compline`)
    const body = await api.json()
    const resp = body.sections.find((s: { type: string }) => s.type === 'responsory')
    expect(resp?.rich?.source?.kind).toBe('common')
    expect(resp?.rich?.source?.id).toBe('compline-responsory')
  })
})
