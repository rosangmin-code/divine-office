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
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    const header = ps150.locator('[data-role="psalm-header-rich"]')
    await expect(header).toBeVisible()
    await expect(header).toHaveAttribute('data-kind', 'patristic_preface')
    await expect(header).toContainText('Хэсихиус')
  })

  // @fr FR-160
  test('Psalm 150:1-6 header carries rubric red colour', async ({ page }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const header = page
      .locator('section[aria-label="Psalm 150:1-6"]')
      .locator('[data-role="psalm-header-rich"]')
    await expect(header).toHaveClass(/text-red-700/)
  })

  // @fr FR-160
  test('Psalm 67:2-8 has an NT typological citation header (psalterWeek 3 TUE Lauds)', async ({
    page,
  }) => {
    // 2026-03-10 psalterWeek 3 TUE Lauds psalmody[2] = Psalm 67:2-8.
    // PDF header carries an NT typological citation pointing to Acts 28:28.
    await page.goto(`/pray/${DATES.psalterW3Tuesday}/lauds`)
    const ps67 = page.locator('section[aria-label="Psalm 67:2-8"]')
    const header = ps67.locator('[data-role="psalm-header-rich"]')
    await expect(header).toBeVisible()
    await expect(header).toHaveAttribute('data-kind', 'nt_typological')
    await expect(header).toContainText('Үйлс')
  })

  // @fr FR-160
  // Negative regression — psalms with no authored header should not
  // render the data-role marker. Daniel 3 (canticle) currently has no
  // header in the catalog (extractor scope = "Дуулал N" only).
  test('Daniel 3 canticle has no psalm-header-rich element (catalog gap)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const dan3 = page.locator('section[aria-label^="Daniel 3:"]').first()
    const header = dan3.locator('[data-role="psalm-header-rich"]')
    expect(await header.count()).toBe(0)
  })
})
