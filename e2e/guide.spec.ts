import { test, expect } from '@playwright/test'

test.describe('Guide page (GILH)', () => {
  test('renders table of contents with all major sections', async ({ page }) => {
    await page.goto('/guide')

    // Title
    await expect(
      page.getByRole('heading', { name: 'Залбиралт цагийн заавар', exact: true })
    ).toBeVisible()
    await expect(page.getByText('General Instruction of the Liturgy of the Hours')).toBeVisible()

    // TOC nav
    const toc = page.getByRole('navigation', { name: 'Гарчиг' })
    await expect(toc).toBeVisible()

    // 3 major sections in TOC
    await expect(toc.getByText('Өмнөтгөл үг')).toBeVisible()
    await expect(toc.getByText('Танилцуулга')).toBeVisible()
    await expect(toc.getByText('Залбиралт цагийг ёслон тэмдэглэх заавар')).toBeVisible()

    // Footnotes in TOC
    await expect(toc.getByText('Зүүлт тайлбар')).toBeVisible()
  })

  test('clicking TOC item navigates to section via anchor', async ({ page }) => {
    await page.goto('/guide')

    // Click the rubrics TOC link
    const toc = page.getByRole('navigation', { name: 'Гарчиг' })
    await toc.getByText('Залбиралт цагийг ёслон тэмдэглэх заавар').click()

    // URL should have anchor
    await expect(page).toHaveURL(/.*#rubrics/)
  })

  test('foreword section displays paragraphs', async ({ page }) => {
    await page.goto('/guide')

    // Foreword heading
    const forewordHeading = page.locator('#foreword')
    await expect(forewordHeading).toBeVisible()

    // Contains key foreword text
    await expect(
      page.getByText('Ариун Сүнсний дотор Христ Эзэн Католик', { exact: false })
    ).toBeVisible()
  })

  test('introduction subsections display with § numbers', async ({ page }) => {
    await page.goto('/guide')

    // §1 section
    await expect(page.locator('#intro-1')).toBeVisible()
    await expect(page.getByText('§1').first()).toBeVisible()

    // §5 section
    await expect(page.locator('#intro-5')).toBeVisible()

    // §11 section
    await expect(page.locator('#intro-11')).toBeVisible()

    // Key introduction text — scope to the §1 section paragraph to avoid
    // matching the TOC link and the subsection heading.
    await expect(
      page
        .locator('#intro-1')
        .getByRole('paragraph')
        .filter({ hasText: 'Тэнгэрбурханы ард түмний нийтийн болон' })
        .first()
    ).toBeVisible()
  })

  test('rubrics section displays prayer structure elements', async ({ page }) => {
    await page.goto('/guide')

    // Rubrics heading
    const rubricsSection = page.locator('#rubrics')
    await expect(rubricsSection).toBeVisible()

    // Morning/Evening prayer subsection
    await expect(page.locator('#rubrics-lauds-vespers')).toBeVisible()

    // Compline subsection
    await expect(page.locator('#rubrics-compline')).toBeVisible()

    // Key rubric text - opening versicle
    await expect(
      page.getByText('Эзэн, уруулыг минь нээгээч', { exact: false })
    ).toBeVisible()
  })

  test('footnotes section displays with back-references', async ({ page }) => {
    await page.goto('/guide')

    // Footnotes heading
    const footnotesSection = page.locator('#footnotes')
    await expect(footnotesSection).toBeVisible()

    // Check a specific footnote exists
    await expect(page.locator('#fn-1')).toBeVisible()
    await expect(
      footnotesSection.getByText('Харьцуул. Үйлс 1:14', { exact: false })
    ).toBeVisible()

    // Back-reference link exists
    const backRef = page.locator('#fn-1 a[href="#fnref-1"]')
    await expect(backRef).toBeVisible()
  })

  test('homepage has link to guide page', async ({ page }) => {
    await page.goto('/')

    // Target by accessible name to avoid matching Next.js Link prefetch DOM
    const guideLink = page.getByRole('link', { name: /Залбиралт цагийн заавар/ })
    await expect(guideLink).toBeVisible()

    // Click and verify navigation
    await guideLink.click()
    await expect(page).toHaveURL(/\/guide/)
    await expect(
      page.getByRole('heading', { name: 'Залбиралт цагийн заавар', exact: true })
    ).toBeVisible()
  })

  test('guide page has back link to homepage', async ({ page }) => {
    await page.goto('/guide')

    const backLink = page.getByText('← Нүүр хуудас')
    await expect(backLink).toBeVisible()

    await backLink.click()
    await expect(page).toHaveURL('/')
  })

  test('page numbers (х.N) are displayed in TOC and sections', async ({ page }) => {
    await page.goto('/guide')

    // TOC shows page numbers — some pages appear on both a section and its
    // first subsection, so use .first() to allow multiple matches.
    const toc = page.getByRole('navigation', { name: 'Гарчиг' })
    await expect(toc.getByText('х.8').first()).toBeVisible()
    await expect(toc.getByText('х.11').first()).toBeVisible()
    await expect(toc.getByText('х.18').first()).toBeVisible()

    // Section headings show page numbers
    await expect(page.locator('#foreword').getByText('х.8')).toBeVisible()
  })
})
