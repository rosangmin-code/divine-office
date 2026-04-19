import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

test.describe('Lauds (Morning Prayer) page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
  })

  test('has correct header with hour name and liturgical info', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
    // Date line uses dotted ISO format (2026.02.04) followed by the Mongolian weekday
    await expect(page.getByText(DATES.ordinaryWeekday.replaceAll('-', '.'))).toBeVisible()
  })

  test('has core sections: invitatory, hymn, psalmody, benedictus, ourFather, dismissal', async ({ page }) => {
    // Invitatory (first hour of day) — replaces the opening versicle per GILH §266
    await expect(page.locator('[aria-label="Урих дуудлага"]')).toBeVisible()

    // Opening Versicle (Удиртгал) is paired as a collapse fallback — visible
    // by default since invitatoryCollapsed defaults to true
    await expect(page.locator('[aria-label="Удиртгал"]')).toBeVisible()

    // Hymn
    await expect(page.locator('[aria-label="Магтуу"]')).toBeVisible()

    // Psalmody (antiphon markers around psalm blocks)
    await expect(page.locator('[data-role="antiphon"]').first()).toBeVisible()

    // Gospel Canticle - Benedictus
    await expect(page.locator('[aria-label="Захариагийн магтаал"]')).toBeVisible()

    // Our Father (always present for lauds)
    await expect(page.getByText('Эзэний даатгал залбирал', { exact: true })).toBeVisible()

    // Dismissal
    await expect(page.locator('[aria-label="Төгсгөл"]')).toBeVisible()
  })

  test('invitatory has versicle and response', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const invitatory = body.sections.find((s: { type: string }) => s.type === 'invitatory')
    expect(invitatory).toBeTruthy()
    expect(invitatory.versicle).toBeTruthy()
    expect(invitatory.response).toBeTruthy()
  })

  test('openingVersicle is paired with invitatory (collapse fallback, GILH §266)', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const types = body.sections.map((s: { type: string }) => s.type)
    expect(types[0]).toBe('invitatory')
    expect(types[1]).toBe('openingVersicle')
    const ov = body.sections.find((s: { type: string }) => s.type === 'openingVersicle')
    expect(ov.pairedWithInvitatory).toBe(true)
  })

  test('back link navigates to homepage with date', async ({ page }) => {
    const backLink = page.getByText('← Бүх цагийн залбирал')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })

  test('has intercessions section', async ({ page }) => {
    await expect(page.getByText('Гуйлтын залбирал')).toBeVisible()
  })

  test('has concluding prayer section', async ({ page }) => {
    await expect(page.getByText('Төгсгөлийн даатгал залбирал')).toBeVisible()
  })

  test('bottom back button navigates to homepage', async ({ page }) => {
    const backBtn = page.getByRole('link', { name: 'Буцах', exact: true })
    await expect(backBtn).toBeVisible()
    await expect(backBtn).toHaveAttribute('href', `/?date=${DATES.ordinaryWeekday}`)
  })
})

test.describe('Invitatory collapse toggle', () => {
  test('초대송은 기본적으로 접혀 있다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await expect(section).toBeVisible()
    await expect(section.locator('#invitatory-body')).toHaveCount(0)
    const toggle = section.getByRole('button', { name: 'Урих дуудлага дэлгэх' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('토글 클릭 시 초대송 본문이 펼쳐진다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await section.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await expect(section.locator('#invitatory-body')).toBeVisible()
    await expect(section.getByRole('button', { name: 'Урих дуудлага хураах' })).toHaveAttribute('aria-expanded', 'true')
    await expect(section.getByText(/Дуулал/)).toBeVisible()
  })

  test('새로고침 후에도 펼침 상태가 유지된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await page
      .locator('[aria-label="Урих дуудлага"]')
      .getByRole('button', { name: 'Урих дуудлага дэлгэх' })
      .click()
    await page.reload()
    const section = page.locator('[aria-label="Урих дуудлага"]')
    await expect(section.locator('#invitatory-body')).toBeVisible()
    await expect(section.getByRole('button', { name: 'Урих дуудлага хураах' })).toHaveAttribute('aria-expanded', 'true')
  })

  test('초대송이 접혀 있을 때 Удиртгал(도입부)이 대체 표시된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(page.locator('[aria-label="Удиртгал"]')).toBeVisible()
  })

  test('초대송을 펼치면 Удиртгал이 숨겨지고, 다시 접으면 돌아온다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    const opening = page.locator('[aria-label="Удиртгал"]')

    await expect(opening).toBeVisible()

    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await expect(opening).toHaveCount(0)

    await invitatory.getByRole('button', { name: 'Урих дуудлага хураах' }).click()
    await expect(opening).toBeVisible()
  })
})

test.describe('Invitatory psalm selection (FR-151)', () => {
  test('API가 4개 초대송 시편을 candidates로 노출한다', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    const body = await res.json()
    const invitatory = body.sections.find((s: { type: string }) => s.type === 'invitatory')
    expect(invitatory).toBeTruthy()
    expect(Array.isArray(invitatory.candidates)).toBe(true)
    expect(invitatory.candidates).toHaveLength(4)
    expect(invitatory.candidates[0].ref).toBe('Psalm 95:1-11')
    expect(invitatory.candidates[1].ref).toBe('Psalm 100:1-5')
    expect(invitatory.candidates[2].ref).toBe('Psalm 67:2-8')
    expect(invitatory.candidates[3].ref).toBe('Psalm 24:1-10')
    expect(invitatory.selectedIndex).toBe(0)
  })

  test('초대송을 펼치면 시편 제목 옆에 드롭다운 토글이 즉시 보인다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()

    const toggle = invitatory.getByTestId('invitatory-psalm-menu-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toContainText('Бусад дуулал (4)')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    // 드롭다운은 시편 본문(첫 stanza) 위에 배치되어야 한다
    const toggleBox = await toggle.boundingBox()
    const firstStanza = invitatory.locator('.pl-2').first()
    const stanzaBox = await firstStanza.boundingBox()
    expect(toggleBox).not.toBeNull()
    expect(stanzaBox).not.toBeNull()
    expect(toggleBox!.y).toBeLessThan(stanzaBox!.y)
  })

  test('드롭다운 열면 4개 시편 옵션이 listbox로 노출된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await invitatory.getByTestId('invitatory-psalm-menu-toggle').click()

    const listbox = invitatory.getByRole('listbox', { name: 'Дуулал сонгох' })
    await expect(listbox).toBeVisible()
    const options = listbox.getByRole('option')
    await expect(options).toHaveCount(4)
    await expect(options.nth(0)).toContainText('Дуулал 95:1-11')
    await expect(options.nth(1)).toContainText('Дуулал 100:1-5')
    await expect(options.nth(2)).toContainText('Дуулал 67:2-8')
    await expect(options.nth(3)).toContainText('Дуулал 24:1-10')
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')
  })

  test('Psalm 100 선택 시 본문·제목·PDF 페이지 참조가 교체된다', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()

    // 기본 Psalm 95 렌더 확인
    await expect(invitatory.getByText('Дуулал 95:1-11')).toBeVisible()
    await expect(invitatory.getByText(/Ирэгтүн! ЭЗЭНд баясалтайгаар дуулцгаан/)).toBeVisible()

    // Psalm 100 선택
    await invitatory.getByTestId('invitatory-psalm-menu-toggle').click()
    await invitatory.getByRole('option', { name: /Дуулал 100:1-5/ }).click()

    // 본문 교체 검증
    await expect(invitatory.getByText('Дуулал 100:1-5')).toBeVisible()
    await expect(invitatory.getByText(/Бүх газар дэлхий, ЭЗЭНд баясалтайгаар хашхирагтун/)).toBeVisible()
    await expect(invitatory.getByText(/Ирэгтүн! ЭЗЭНд баясалтайгаар дуулцгаан/)).toHaveCount(0)

    // 드롭다운 닫힘
    await expect(invitatory.getByRole('listbox', { name: 'Дуулал сонгох' })).toHaveCount(0)
  })

  test('선택한 시편은 새로고침 후에도 유지된다 (localStorage 지속성)', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const invitatory = page.locator('[aria-label="Урих дуудлага"]')
    await invitatory.getByRole('button', { name: 'Урих дуудлага дэлгэх' }).click()
    await invitatory.getByTestId('invitatory-psalm-menu-toggle').click()
    await invitatory.getByRole('option', { name: /Дуулал 67:2-8/ }).click()

    await page.reload()

    const reloaded = page.locator('[aria-label="Урих дуудлага"]')
    await expect(reloaded.getByText('Дуулал 67:2-8')).toBeVisible()

    // localStorage에 invitatoryPsalmIndex=2 저장 확인
    const stored = await page.evaluate(() => localStorage.getItem('loth-settings'))
    expect(stored).toContain('"invitatoryPsalmIndex":2')
  })
})
