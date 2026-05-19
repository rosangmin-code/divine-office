import { test, expect } from '@playwright/test'

// FR-153 PDF 원형 재현: Rich Prayer Content AST overlay.
// Pilot 대상: Ordinary Time Week 1 SUN Lauds (2026-01-18).
// 검증 범위는 "rich overlay 가 반영된 결과가 기대대로 렌더되고, 기존
// 경로와 시각적·구조적으로 회귀 없는가" — 본문 정확성 전수 검증은
// vitest 측 resolver 테스트 및 Stage 3a/3b diff 리포트가 담당한다.

const PILOT_URL = '/pray/2026-01-18/lauds'

test.describe('FR-153 PDF fidelity — pilot (Week 1 SUN Lauds)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PILOT_URL)
  })

  // @fr FR-153
  test('concluding prayer renders rich overlay without duplicating the section heading', async ({
    page,
  }) => {
    const section = page.locator('section[aria-label="Төгсгөлийн даатгал залбирал"]')
    await expect(section).toBeVisible()

    // 헤더 텍스트는 섹션 내부에서 정확히 한 번만 등장해야 한다. rich AST
    // builder 가 섹션 헤더 rubric-line 을 blocks 에 넣으면 렌더에서 두 번
    // 나오는 회귀가 발생한다 — 이 regression 을 직접 잡는다.
    const headings = section.getByText('Төгсгөлийн даатгал залбирал', { exact: true })
    await expect(headings).toHaveCount(1)

    // 본문이 reflow-friendly 하게 한 문단으로 렌더되는지 확인. 기존 legacy
    // 경로(`<p>`) 와 rich 경로(`<RichContent>` 내부 단일 `<p>`) 모두
    // 단일 단락이므로 섹션 내부의 본문 `<p>` 개수는 1이어야 한다.
    //    - RichContent 는 `<div class="space-y-2">` 래퍼 안에 `<p>` 를 낳는다
    //    - Legacy 는 바로 `<p>` 를 낳는다
    // 둘 다 "본문 para 1개" 로 수렴.
    const bodyParagraphs = section.locator(':scope > div > p, :scope > p').filter({
      hasText: 'Аяа, хайрын Эцэг минь',
    })
    await expect(bodyParagraphs).toHaveCount(1)
  })

  // @fr FR-153
  test('responsory uses PDF "-" hyphen markers (not Х./В.)', async ({ page }) => {
    const section = page.locator('section[aria-label="Хариу залбирал"]')
    await expect(section).toBeVisible()

    // #5 (WI 10, 2026-05-19) — PDF 본문은 `-` 하이픈만 사용한다. 과거
    // rich overlay path 가 자체적으로 부여하던 `Х.` (response) / `В.`
    // (versicle) 키릴 약어는 PDF 와 불일치라 제거되었고, 본문은 plain
    // 3-필드 경로로 deterministic 6-line emission 한다.
    //   - line 2/4/6 (response 행) 에 red `- ` prefix
    //   - line 1/3/5 (cantor 행: refrain / versicle / Glory Be) 에는 prefix 없음
    // Week 1 SUN Lauds 의 universal 6-line 패턴 → red `- ` prefix 3 회.
    await expect(section.getByText('В.', { exact: false })).toHaveCount(0)
    await expect(section.getByText('Х.', { exact: false })).toHaveCount(0)
    // `- ` prefix 가 정확히 3 회 (line 2/4/6) 등장.
    const redHyphenPrefixes = section.locator('span.text-red-700').filter({ hasText: /^-\s+$/ })
    await expect(redHyphenPrefixes).toHaveCount(3)
  })

  // @fr FR-153
  test('no silent regression on non-rich sections (core structure intact)', async ({ page }) => {
    // Rich overlay 가 없는 섹션(invitatory / hymn / psalmody / benedictus /
    // ourFather / dismissal) 은 기존 경로로 그대로 렌더돼야 한다. 아주
    // 얕은 smoke — 깊은 검증은 prayer-lauds.spec.ts 가 담당.
    await expect(page.locator('[aria-label="Урих дуудлага"]')).toBeVisible()
    await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()
    await expect(page.locator('[aria-label="Захариагийн магтаал"]')).toBeVisible()
    await expect(page.locator('[aria-label="Төгсгөл"]')).toBeVisible()
  })
})
