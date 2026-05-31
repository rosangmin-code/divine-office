import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * GOAL #130 — Psalm 63 Lauds caption reposition (body → post-title header).
 *
 * Step 4 RED tests (DOGFOODING). E2E screen-order layer (D1 user-facing
 * acceptance + D2 caption preserved in header slot + D3 /ordinarium
 * out-of-scope guard). Asserts the real rendered screen order on the
 * 2026-05-31 Lauds first psalm.
 *
 * 2026-05-31 is Trinity Sunday (movable SOLEMNITY) whose Lauds borrows the
 * Week-1 Sunday psalmody, so the first psalm is `Psalm 63:2-9`
 * (DATES.trinitySundayDay2026; week-1.json days.SUN.lauds.psalms[0]).
 *
 * RED before Step 6: the caption currently renders as the first psalm-body
 * phrase (no `psalm-header-rich` entry exists for Psalm 63), so the header
 * locator is absent and the first body phrase is the caption line. After
 * Step 6 the caption moves to the post-title header slot and the first body
 * phrase becomes the real body line.
 *
 * data-role / getByRole = 기능 검증; getByText = 몽골어 문구 정확성
 * (CLAUDE.md selector 축 분리). Kept in a dedicated new spec file to avoid
 * #105 merge conflict.
 */

const PS63_SECTION = 'section[aria-label="Psalm 63:2-9"]'
const PS63_BODY_FIRST_LINE = 'Тэнгэрбурхан, Та миний Тэнгэрбурхан'
const PS63_CAPTION_L1 = 'Гэм нүглийн харанхуйгаас салсан хэнбугай ч'
const PS63_TITLE = 'Тэнгэрбурханаар цангаж буй сэтгэл'

// @fr FR-160-C
test.describe('GOAL #130 — Psalm 63 Lauds caption reposition (screen order)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.trinitySundayDay2026}/lauds`)
  })

  // @fr FR-160-C
  test('[D2] caption renders in the post-title header slot (preserved, not deleted)', async ({
    page,
  }) => {
    const section = page.locator(PS63_SECTION)
    const header = section.locator('[data-role="psalm-header-rich"]')
    // RED before Step 6: no Psalm 63 header entry exists yet.
    await expect(header).toBeVisible()
    await expect(header).toHaveAttribute('data-kind', 'uncited_caption')
    await expect(header).toContainText(PS63_CAPTION_L1)
    // data/PDF spelling — no machine-translation correction.
    await expect(header).toContainText('тэмүүлнэ')
  })

  // @fr FR-160-C
  test('[D1] caption does NOT render as a psalm body line', async ({ page }) => {
    const section = page.locator(PS63_SECTION)
    // RED before Step 6: the caption is currently the first body phrase.
    await expect(
      section.locator('[data-role="psalm-phrase"]', { hasText: PS63_CAPTION_L1 }),
    ).toHaveCount(0)
    await expect(
      section.locator('[data-role="psalm-stanza"]', { hasText: PS63_CAPTION_L1 }),
    ).toHaveCount(0)
  })

  // @fr FR-160-C
  test('[D1] first psalm body line is the real body first line', async ({ page }) => {
    const section = page.locator(PS63_SECTION)
    const firstBody = section.locator('[data-role="psalm-phrase"]').first()
    // RED before Step 6: the first body phrase is the caption.
    await expect(firstBody).toContainText(PS63_BODY_FIRST_LINE)
  })

  // @fr FR-160-C
  test('[D1] vertical screen order is title → caption(header) → body first line', async ({
    page,
  }) => {
    const section = page.locator(PS63_SECTION)
    const title = section.getByText(PS63_TITLE, { exact: true })
    const header = section.locator('[data-role="psalm-header-rich"]')
    const firstBody = section.locator('[data-role="psalm-phrase"]').first()
    // RED before Step 6: header is absent so boundingBox() is null.
    await expect(header).toBeVisible()
    const titleBox = await title.boundingBox()
    const headerBox = await header.boundingBox()
    const bodyBox = await firstBody.boundingBox()
    expect(titleBox).not.toBeNull()
    expect(headerBox).not.toBeNull()
    expect(bodyBox).not.toBeNull()
    expect(titleBox!.y).toBeLessThan(headerBox!.y)
    expect(headerBox!.y).toBeLessThan(bodyBox!.y)
  })

  // @fr FR-160-C
  // D3 out-of-scope guard — the caption reposition only touches Psalm 63
  // psalter extraction/render; the /ordinarium reference page is unrelated.
  test('[D3] /ordinarium has no Psalm 63 caption side effect', async ({ page }) => {
    const res = await page.goto('/ordinarium')
    expect(res?.ok()).toBeTruthy()
    await expect(page.getByText(PS63_CAPTION_L1)).toHaveCount(0)
  })
})
