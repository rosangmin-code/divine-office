import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// H3 (app-review 2026-09-13 §3.3) — 커스텀 listbox 4곳의 ARIA·키보드 계약.
//
// 이전: `<li role="option">` 안에 `<button>` 중첩(option 의 자식은
// presentational 이어야 한다), 화살표/Home/End/Esc/바깥클릭 전무, 열려도
// 포커스가 목록으로 들어가지 않고 `aria-activedescendant` 없음.
//
// 네 곳(hymn / marian-antiphon / invitatory / gospel-canticle)이 이제
// `src/components/ui/listbox.tsx` 의 `useListbox` 한 훅을 쓴다. 여기서는
// 대표로 찬미가(Магтуу)·성모교송(Мариагийн дуу) 드롭다운의 실제 키보드
// 동작을 검증한다 — 훅이 공용이므로 나머지 두 곳도 같은 계약을 따른다.
//
// selector 축(CLAUDE.md): 기능 검증이므로 role/aria 로 잡고, 몽골어 문구는
// accessible name 매칭에만 쓴다(combobox 는 name-from-content 금지 역할이라
// aria-label 이 곧 계약이다).

const LAUDS = `/pray/${DATES.ordinaryWeekday}/lauds`
const COMPLINE = `/pray/${DATES.ordinaryWeekday}/compline`

test.describe('H3 공용 listbox — 키보드·ARIA', () => {
  // @fr FR-012
  test('찬미가 드롭다운: Enter 로 열고 ↓↓ 이동, Enter 로 선택, 포커스는 트리거로 복귀', async ({
    page,
  }) => {
    await page.goto(LAUDS)
    const trigger = page.getByRole('combobox', { name: /Бусад магтуу/ })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')

    const list = page.getByRole('listbox', { name: 'Магтуу сонгох' })
    await expect(list).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // 열리면 **현재 선택** 항목이 활성 — 트리거의 aria-activedescendant 가
    // 그 옵션 id 를 가리키고, 포커스도 그 옵션으로 들어간다(roving tabindex).
    const options = list.getByRole('option')
    const selectedIdx = await options.evaluateAll((els) =>
      els.findIndex((el) => el.getAttribute('aria-selected') === 'true'),
    )
    expect(selectedIdx).toBeGreaterThanOrEqual(0)
    const selectedId = await options.nth(selectedIdx).getAttribute('id')
    await expect(trigger).toHaveAttribute('aria-activedescendant', selectedId!)
    await expect(options.nth(selectedIdx)).toBeFocused()

    // Home → 첫 옵션, ↓ ↓ → 세 번째 옵션.
    await page.keyboard.press('Home')
    await expect(options.nth(0)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(options.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(options.nth(2)).toBeFocused()

    const chosen = (await options.nth(2).textContent())?.trim() ?? ''
    expect(chosen.length).toBeGreaterThan(0)
    await page.keyboard.press('Enter')

    // 선택 반영 + 목록 닫힘 + 포커스 트리거 복귀.
    await expect(list).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    const reopened = page.getByRole('listbox', { name: 'Магтуу сонгох' }).getByRole('option')
    await expect(reopened.nth(2)).toHaveAttribute('aria-selected', 'true')
  })

  // @fr FR-012
  test('찬미가 드롭다운: Home/End 이동, Esc 로 닫고 포커스 복원', async ({ page }) => {
    await page.goto(LAUDS)
    const trigger = page.getByRole('combobox', { name: /Бусад магтуу/ })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const options = page.getByRole('listbox', { name: 'Магтуу сонгох' }).getByRole('option')
    const count = await options.count()
    expect(count).toBeGreaterThan(1)

    await page.keyboard.press('End')
    await expect(options.nth(count - 1)).toBeFocused()
    await page.keyboard.press('Home')
    await expect(options.nth(0)).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox', { name: 'Магтуу сонгох' })).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  // @fr FR-012
  test('옵션은 중첩 버튼 없는 li[role=option] — id·aria-selected·tabindex roving', async ({
    page,
  }) => {
    await page.goto(LAUDS)
    await page.getByRole('combobox', { name: /Бусад магтуу/ }).click()
    const list = page.getByRole('listbox', { name: 'Магтуу сонгох' })
    await expect(list).toBeVisible()
    // option 안에 button 중첩 0 (option 의 자식은 presentational).
    await expect(list.locator('li[role="option"] button')).toHaveCount(0)
    const shapes = await list.locator('li[role="option"]').evaluateAll((els) =>
      els.map((el) => ({
        tag: el.tagName,
        id: el.getAttribute('id'),
        selected: el.getAttribute('aria-selected'),
        tabIndex: el.getAttribute('tabindex'),
      })),
    )
    expect(shapes.length).toBeGreaterThan(1)
    for (const s of shapes) {
      expect(s.tag).toBe('LI')
      expect(s.id).toBeTruthy()
      expect(s.selected === 'true' || s.selected === 'false').toBe(true)
    }
    // tab stop 은 정확히 하나 (roving tabindex).
    expect(shapes.filter((s) => s.tabIndex === '0')).toHaveLength(1)
  })

  // @fr FR-012
  test('바깥 클릭으로 닫힌다', async ({ page }) => {
    await page.goto(LAUDS)
    await page.getByRole('combobox', { name: /Бусад магтуу/ }).click()
    await expect(page.getByRole('listbox', { name: 'Магтуу сонгох' })).toBeVisible()
    await page.getByRole('heading', { level: 1 }).click()
    await expect(page.getByRole('listbox', { name: 'Магтуу сонгох' })).toHaveCount(0)
  })

  // @fr FR-130
  test('성모교송 드롭다운도 같은 키보드 계약을 따른다 (공용 훅)', async ({ page }) => {
    await page.goto(COMPLINE)
    const trigger = page.getByRole('combobox', { name: /Бусад дуу/ })
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    await trigger.focus()
    // 닫힌 combobox 에서 ↓ = 열기 + 현재 선택 활성화.
    await page.keyboard.press('ArrowDown')
    const options = page
      .getByRole('listbox', { name: 'Мариагийн дуу сонгох' })
      .getByRole('option')
    await expect(options).toHaveCount(4)
    await expect(options.nth(0)).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(options.nth(1)).toBeFocused()
    await page.keyboard.press(' ')
    await expect(page.getByRole('listbox', { name: 'Мариагийн дуу сонгох' })).toHaveCount(0)
    await expect(trigger).toBeFocused()
    // 2번째 후보(Аврагчийн хайрт эх)로 본문이 교체된다.
    await expect(page.getByText('Аврагчийн хайрт эх').first()).toBeVisible()
  })
})
