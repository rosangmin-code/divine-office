import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Compline (Night Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/compline`)
  })

  test('has correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Шөнийн даатгал залбирал' })).toBeVisible()
  })

  test('does NOT have invitatory', async ({ page }) => {
    await expect(page.getByText('Нээлтийн залбирал')).not.toBeVisible()
  })

  test('has Nunc Dimittis gospel canticle', async ({ page }) => {
    await expect(page.getByText('Сайнмэдээний айлдлын магтаал')).toBeVisible()
  })

  test('does NOT have intercessions', async ({ page }) => {
    await expect(page.getByText('Гуйлтын залбирал')).not.toBeVisible()
  })

  test('does NOT have Our Father', async ({ page }) => {
    await expect(page.getByText('Эзэний даатгал залбирал')).not.toBeVisible()
  })

  test('has hymn, psalmody, blessing', async ({ page }) => {
    await expect(page.getByText('Магтуу', { exact: true })).toBeVisible()
    await expect(page.locator('text=Дуулал').first()).toBeVisible()
    // Compline uses "Адислал" (blessing) instead of standard dismissal
    await expect(page.getByText('Адислал')).toBeVisible()
  })

  test('fixed weekly cycle: same day-of-week has same psalms across different psalter weeks', async ({ page }) => {
    // Get psalm references from one Wednesday.
    // NFR-002: 이전 selector (`h4.text-sm.font-semibold.text-stone-600` +
    // 영문 'Psalm' 필터)는 현재 마크업과 맞지 않아 빈 배열끼리 비교하며
    // 공허하게 통과하던 상태 → 원본 키 `data-ref` 로 이관 + 비어 있지 않음 단언.
    const collectPsalmRefs = async () => {
      const blocks = page.locator('[data-role="psalm-block"][data-ref^="Psalm "]')
      const refs: string[] = []
      for (let i = 0; i < (await blocks.count()); i++) {
        refs.push((await blocks.nth(i).getAttribute('data-ref')) ?? '')
      }
      return refs
    }
    const psalmRefs1 = await collectPsalmRefs()
    expect(psalmRefs1.length).toBeGreaterThan(0)

    // Navigate to another Wednesday in a different psalter week
    await page.goto(`/pray/${DATES.lentWeekday}/compline`)
    const psalmRefs2 = await collectPsalmRefs()

    expect(psalmRefs1).toEqual(psalmRefs2)
  })
})
