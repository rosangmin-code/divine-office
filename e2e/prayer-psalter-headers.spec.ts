import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160
test.describe('Psalter header preface rendering (FR-160-C)', () => {
  // FR-160-C surfaces patristic Father preface + NT typological citation
  // metadata that appears at the psalm-header position in the PDF (between
  // "Дуулал N" title and the first verse). UI renders as a small italic
  // red line under the psalm title — `data-role="psalm-header-rich"`
  // with a `data-kind` attribute carrying "patristic_preface" or
  // "nt_typological".

  // @fr FR-160
  test('Psalm 150:1-6 has a patristic preface header (Easter Wk4 SUN Lauds)', async ({
    page,
  }) => {
    // 2026-04-26 Easter Wk4 SUN Lauds psalmody[2] = Psalm 150:1-6.
    // PDF header attributes the antiphonal preface to "Хэсихиус"
    // (patristic Father).
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const ps150 = page.locator('[data-role="psalm-block"][data-ref="Psalm 150:1-6"]')
    const header = ps150.locator('[data-role="psalm-header-rich"]')
    await expect(header).toBeVisible()
    await expect(header).toHaveAttribute('data-kind', 'patristic_preface')
    await expect(header).toContainText('Хэсихиус')
  })

  // @fr FR-160
  test('Psalm 150:1-6 header carries muted preface colour (WI-62: 빨강→stone-500)', async ({ page }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const header = page
      .locator('[data-role="psalm-block"][data-ref="Psalm 150:1-6"]')
      .locator('[data-role="psalm-header-rich"]')
    await expect(header).toHaveClass(/text-stone-500/)
  })

  // @fr FR-160
  test('Psalm 67:2-8 has an NT typological citation header (psalterWeek 3 TUE Lauds)', async ({
    page,
  }) => {
    // 2026-03-10 psalterWeek 3 TUE Lauds psalmody[2] = Psalm 67:2-8.
    // PDF header carries an NT typological citation pointing to Acts 28:28.
    await page.goto(`/pray/${DATES.psalterW3Tuesday}/lauds`)
    const ps67 = page.locator('[data-role="psalm-block"][data-ref="Psalm 67:2-8"]')
    const header = ps67.locator('[data-role="psalm-header-rich"]')
    await expect(header).toBeVisible()
    await expect(header).toHaveAttribute('data-kind', 'nt_typological')
    await expect(header).toContainText('Үйлс')
  })

  // @fr FR-160
  // Negative regression — a psalm the book prints without a header must
  // not render the data-role marker. The Sunday Vespers canticle
  // Revelation 19:1-7 has none in the book (`header: null` at pp.71/189 in
  // docs/research/psalm-header-audit/header-book.json). Daniel 3 used to
  // be the example here, but the 2026-10-27 header audit (`30558f6`)
  // added the headers the book prints for the Daniel 3 canticles.
  test('Revelation 19 canticle has no psalm-header-rich element (none in the book)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/vespers`)
    const rev19 = page.locator('[data-role="psalm-block"][data-ref^="Revelation 19:"]').first()
    await expect(rev19).toBeVisible()
    expect(await rev19.locator('[data-role="psalm-header-rich"]').count()).toBe(0)
  })

  // @fr FR-160
  test('Daniel 3:52-57 shows the header the book prints (Easter Wk4 SUN Lauds)', async ({
    page,
  }) => {
    // Printed p.409 (psalter week 4 Sunday); checked on the page render in
    // the 2026-10-27 header audit.
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const header = page
      .locator('[data-role="psalm-block"][data-ref="Daniel 3:52-57"]')
      .locator('[data-role="psalm-header-rich"]')
    await expect(header).toHaveCount(1)
    await expect(header).toContainText('Тэнгэрбурхан бол үүрд магтагдах Бүтээгч мөн')
    await expect(header).toContainText('Ром 1:25')
  })
})
