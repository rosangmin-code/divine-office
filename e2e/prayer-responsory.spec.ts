import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * FR-152 — 응송(Хариу залбирал) 6행 구조 렌더링
 *
 * Golden path: 일반 평일 Lauds 응송이 (fullResponse leader + `-` people)
 *   → versicle → `-` shortResponse → Glory Be → `-` fullResponse 의 6개
 *   문단으로 렌더된다.
 * Regression guard: API 응답이 신 3필드(fullResponse/versicle/shortResponse)
 *   를 노출하고 구 `response` 키는 제거되었다.
 *
 * Triduum 간소화 form(Holy Thursday/Friday/Saturday)은 렌더러에 구현되어
 * 있으나 romcal 의 weekOfSeason 이 성삼일을 week 1 로 반환하는 반면
 * lent.json propers 는 week "6" 아래에만 Triduum 을 저장하여 현재
 * lookup 단계에서 psalter commons 로 폴백된다. 렌더러 간소화 분기의
 * 유닛 테스트는 별도 스쿱(out of scope for this spec).
 */

const GLORY_BE_MN = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

test.describe('Responsory 6-part rendering (FR-152)', () => {
  // @fr FR-152
  test('ordinary weekday Lauds responsory renders all 6 paragraphs', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)

    const responsory = page.locator('[data-role="responsory"]')
    await expect(responsory).toBeVisible()

    // 헤더(Хариу залбирал) + 6개 본문 문단 = <p> 7개
    const paragraphs = responsory.locator('p')
    await expect(paragraphs).toHaveCount(7)

    // 2번째(leader) / 3번째(people) 문단 텍스트가 동일(`- ` 접두 제외) — 전체 응답 중복
    const pLead = ((await paragraphs.nth(1).textContent()) ?? '').trim()
    const pPeople = ((await paragraphs.nth(2).textContent()) ?? '').replace(/^-\s*/, '').trim()
    expect(pLead.length).toBeGreaterThan(0)
    expect(pPeople).toBe(pLead)

    // Glory Be 한 줄이 반드시 포함
    await expect(responsory.getByText(GLORY_BE_MN)).toBeVisible()
  })

  // @fr FR-152
  test('final people response equals fullResponse (closes with repeated antiphon)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]')
    const paragraphs = responsory.locator('p')

    const pLead = ((await paragraphs.nth(1).textContent()) ?? '').trim()
    const pFinal = ((await paragraphs.nth(6).textContent()) ?? '').replace(/^-\s*/, '').trim()
    expect(pFinal).toBe(pLead)
  })

  // @fr FR-152
  test('Glory Be precedes the final repeated full response', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const responsory = page.locator('[data-role="responsory"]')
    const paragraphs = responsory.locator('p')

    // 5번째 index = Glory Be; 6번째 index = `- fullResponse`
    const gloryText = ((await paragraphs.nth(5).textContent()) ?? '').trim()
    expect(gloryText).toBe(GLORY_BE_MN)
  })

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
