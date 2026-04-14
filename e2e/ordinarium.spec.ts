import { test, expect } from '@playwright/test'

test.describe('Ordinarium page (дэг жаяг)', () => {
  test('renders title and TOC with both major sections', async ({ page }) => {
    await page.goto('/ordinarium')

    await expect(
      page.getByRole('heading', { name: 'Залбиралт цагийн ёслолын дэг жаяг', exact: true })
    ).toBeVisible()

    const toc = page.getByRole('navigation', { name: 'Гарчиг' })
    await expect(toc).toBeVisible()
    await expect(toc.getByText('Өглөөний даатгал залбирал', { exact: true })).toBeVisible()
    await expect(toc.getByText('Оройн даатгал залбирал', { exact: true })).toBeVisible()
  })

  test('TOC click navigates to invitatory psalms anchor', async ({ page }) => {
    await page.goto('/ordinarium')

    const toc = page.getByRole('navigation', { name: 'Гарчиг' })
    await toc.getByText('Урих дуудлагын дуулал', { exact: false }).first().click()

    await expect(page).toHaveURL(/.*#morning-invitatory-psalms/)
    await expect(page.locator('#morning-invitatory-psalms')).toBeInViewport()
  })

  test('Psalm 95 opening stanza is rendered', async ({ page }) => {
    await page.goto('/ordinarium')

    await expect(
      page
        .locator('#morning-invitatory-psalms')
        .getByText('Ирэгтүн! ЭЗЭНд баясалтайгаар дуулцгаан', { exact: false })
    ).toBeVisible()
  })

  test('rubric instructions use red styling', async ({ page }) => {
    await page.goto('/ordinarium')

    const rubric = page
      .locator('[data-block="rubric"]')
      .filter({ hasText: 'Дөчин хоногийн цаг улиралд' })
      .first()
    await expect(rubric).toBeVisible()
    await expect(rubric).toHaveClass(/text-red-700\/80/)
  })

  test('evening section contains Magnificat first stanza', async ({ page }) => {
    await page.goto('/ordinarium')

    await expect(page.locator('#evening-magnificat')).toBeVisible()
    await expect(
      page
        .locator('#evening-magnificat')
        .getByText('Сэтгэл минь Эзэнийг дээдэлнэ', { exact: false })
    ).toBeVisible()
  })

  test('homepage has ordinarium link that navigates to /ordinarium', async ({ page }) => {
    await page.goto('/')

    const link = page.getByRole('link', { name: /Залбиралт цагийн ёслолын дэг жаяг/ })
    await expect(link).toBeVisible()

    await link.click()
    await expect(page).toHaveURL(/\/ordinarium$/)
    await expect(
      page.getByRole('heading', { name: 'Залбиралт цагийн ёслолын дэг жаяг', exact: true })
    ).toBeVisible()
  })

  test('back link returns to homepage', async ({ page }) => {
    await page.goto('/ordinarium')

    await page.getByText('← Нүүр хуудас').click()
    await expect(page).toHaveURL('/')
  })
})
