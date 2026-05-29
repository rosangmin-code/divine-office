import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Intercessions (Гуйлтын залбирал) role structure', () => {
  test.describe('API parsed fields', () => {
    test('psalter commons: lauds exposes refrain + petitions with responses', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinarySunday}/lauds`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(Array.isArray(intercessions.petitions)).toBe(true)
      expect(intercessions.petitions.length).toBeGreaterThan(0)
      expect(intercessions.refrain).toBeTruthy()
      // 도입부가 ":"로 끝나지 않는다
      if (intercessions.introduction) {
        expect(intercessions.introduction.trim().endsWith(':')).toBe(false)
      }
      // 최소 하나의 petition에 응답이 존재한다
      const withResponse = intercessions.petitions.filter((p: { response?: string }) => Boolean(p.response))
      expect(withResponse.length).toBeGreaterThan(0)
    })

    test('seasonal propers: Advent weekday vespers parses em-dash petitions', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.adventWeekday}/vespers`)
      expect(res.status()).toBe(200)

      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(intercessions.petitions.length).toBeGreaterThan(0)
      // advent 포맷은 refrain이 도입부와 같은 줄에 있으므로 분리되어 있어야 한다
      expect(intercessions.refrain).toBeTruthy()
      // 모든 petition에 versicle과 response가 있어야 한다 (em-dash 포맷)
      for (const p of intercessions.petitions) {
        expect(p.versicle).toBeTruthy()
        expect(p.response).toBeTruthy()
      }
    })

    test('raw items field is preserved for backwards compatibility', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions.items).toBeInstanceOf(Array)
      expect(intercessions.items.length).toBeGreaterThan(0)
    })

    // @fr FR-150
    // WI-52 regression (#50 diagnosis): the OT Week 4 Wednesday Vespers refrain
    // wraps across two source array elements. It used to truncate at
    // "...Таны дотор", dropping the tail (which polluted petition[0].versicle).
    test('psalter commons: multi-element wrapped refrain is accumulated end-to-end', async ({ request }) => {
      const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/vespers`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      const intercessions = body.sections.find((s: { type: string }) => s.type === 'intercessions')
      expect(intercessions).toBeTruthy()
      expect(intercessions.refrain).toBe(
        'Эзэн, Танд итгэж найддаг бүгд Таны дотор баясан цэнгэх болтугай.',
      )
      // the recovered tail must NOT leak into the first petition's versicle
      expect(intercessions.petitions[0].versicle).not.toContain('баясан цэнгэх болтугай')
    })
  })

  test.describe('UI rendering', () => {
    test('refrain is visually separated from petitions', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      await expect(page.getByText('Гуйлтын залбирал')).toBeVisible()

      const refrain = page.locator('[data-role="intercessions-refrain"]').first()
      await expect(refrain).toBeVisible()
    })

    test('each petition splits versicle and response into separate DOM nodes', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const petitions = page.locator('[data-role="intercessions-petition"]')
      const count = await petitions.count()
      expect(count).toBeGreaterThan(0)

      // 최소 하나의 petition이 응답 DOM 노드를 가진다
      const responseNodes = page.locator('[data-role="intercessions-response"]')
      const respCount = await responseNodes.count()
      expect(respCount).toBeGreaterThan(0)
    })

    test('response is prefixed with a red dash', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
      const responseNodes = page.locator('[data-role="intercessions-response"]')
      await expect(responseNodes.first()).toContainText('-')
    })

    // @fr FR-150
    // WI-52 user-facing regression: the wrapped refrain must render to
    // completion in the refrain box (OT Week 4 Wed Vespers — the user-reported
    // 2026-05-27 case shares this psalter-week-4 content).
    test('multi-element wrapped refrain renders to completion in the refrain box', async ({ page }) => {
      await page.goto(`/pray/${DATES.ordinaryWeekday}/vespers`)
      await expect(page.getByText('Гуйлтын залбирал')).toBeVisible()
      const refrain = page.locator('[data-role="intercessions-refrain"]').first()
      await expect(refrain).toBeVisible()
      // previously-dropped tail is now present, full refrain end-to-end
      await expect(refrain).toContainText('баясан цэнгэх болтугай')
      await expect(refrain).toHaveText(
        'Эзэн, Танд итгэж найддаг бүгд Таны дотор баясан цэнгэх болтугай.',
      )
    })
  })

  // Stage 6 확산 — intercessions rich overlay (propers 56/56 PASS). FR-153 의
  // Stage 6 범위로 관리. rich overlay 가 merge 된 seasonal propers (예: Advent
  // Week 1 THU Lauds, page 570) 에서 PrayerText AST 가 렌더된다.
  test.describe('Rich overlay — seasonal propers (FR-153 Stage 6)', () => {
    // @fr FR-153
    test('Advent weekday lauds uses rich overlay (single-node body, no data-role fallback)', async ({
      page,
    }) => {
      await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
      const section = page.locator('section[aria-label="Гуйлтын залбирал"]')
      await expect(section).toBeVisible()

      // Rich 경로는 RichContent 단일 컨테이너를 통해 렌더되며, 기존 구조화
      // data-role (refrain/petition/response) 을 부여하지 않는다. 반대로
      // legacy 경로는 data-role 을 단다. rich 경로가 활성화됐다는 증거.
      const legacyRefrain = section.locator('[data-role="intercessions-refrain"]')
      await expect(legacyRefrain).toHaveCount(0)

      // RichContent 래퍼 (`<div class="space-y-2">`) 가 적어도 하나 존재.
      const richWrapper = section.locator('div.space-y-2')
      await expect(richWrapper).toHaveCount(1)

      // 본문 내용 확인: Advent Week 1 Thursday Lauds intercessions 첫 문장.
      // 원문 JSON 의 items[0] 앞부분. 도입문이 ":" 으로 끝나는지도 검증.
      await expect(section).toContainText('Христ бол Тэнгэрбурханы')
      await expect(section).toContainText('залбирцгаая:')
    })

    // @fr FR-153
    test('rich response line renders muted rubric hyphen prefix (WI-62: 빨강→stone-500)', async ({ page }) => {
      await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
      const section = page.locator('section[aria-label="Гуйлтын залбирал"]')

      // 이 "- " 는 rich AST 에서 `kind:'rubric'` span 으로 author 되어 있어
      // RUBRIC_CLASS(text-stone-500, muted)로 렌더된다. WI-62 재스킨: 빨강 제거
      // (DESIGN.md "빨강은 절기 의미색으로만"). 명시적 response/versicle span
      // (plain/structured 경로)의 마커는 골드 악센트.
      const rubricDash = section.locator('span.text-stone-500', { hasText: /^-\s*$/ })
      await expect(rubricDash.first()).toBeVisible()
    })
  })
})
