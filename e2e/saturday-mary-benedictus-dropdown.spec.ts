import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * FR-168 / WI #94 ([#90-sub-4]) — saturday-mary Benedictus 후렴 6옵션 드롭다운
 * + 안내 루브릭 — **사용자-지각(user-facing) e2e RED 테스트**.
 *
 * 블루프린트(MM): docs/design/mental-models/goal90-saturday-mary-benedictus-dropdown.md
 *   Observable outcome:
 *     - saturday-mary Lauds → Benedictus 후렴 = 옵션1(평일과 byte 불일치).
 *     - 드롭다운에서 옵션2~6 선택 → 화면 후렴 즉시 교체.
 *     - 드롭다운 위/옆에 안내 지시문(루브릭).
 *     - 날짜 이동/새로고침 → 옵션1 리셋(다른 날짜로 새지 않음).
 *     - 모든 후렴·루브릭 = authentic 몽골어 키릴(영어 0).
 * 설계 lock: docs/research/GOAL90-sub3-spec.md §3(ephemeral+날짜리셋), §4(루브릭/clamp),
 *   §4c hook: data-role="canticle-antiphon-dropdown"/"canticle-antiphon-rubric",
 *   role="combobox", aria-selected.
 * 시나리오: docs/research/GOAL90-sub2-scenarios.md D1·D2(H1-H3,E1-E5)·D3·D4.
 *
 * ⚠️ RED — 구현(#96) 전이므로 드롭다운/루브릭 hook 이 DOM 에 없어 본 spec 은
 * 전부 FAIL 한다(평일 가드 D3-E1 제외). 실행에는 dev 서버가 필요하다
 * (playwright.config.ts webServer: npm run dev --port 3200).
 *
 * selector 축 분리(CLAUDE.md): 기능(드롭다운/combobox/data-role/날짜리셋) =
 * 색상·로케일 독립 anchor; 몽골어 문구 정확성(D4) = getByText 의도적 결합.
 */

const OT_SATURDAY = '2026-05-30' // OT Saturday → saturday-mary
const OT_SATURDAY_2 = '2026-06-20' // 두 번째 free OT Saturday(cross-date 리셋 검증)
const PLAIN_WEEKDAY = '2026-06-15' // OT Monday → 성모 옵션 없음

const BENEDICTUS = '[aria-label="Захариагийн магтаал"]'
const DROPDOWN = '[data-role="canticle-antiphon-dropdown"]'
const RUBRIC_ROLE = '[data-role="canticle-antiphon-rubric"]'
const ANTIPHON = '[data-role="antiphon"]'

const FERIAL_BENEDICTUS = 'Эзэн минь, Та биднийг амар амгалангийн зам мөрөөр'
const RUBRIC_TEXT = 'Дараах шад магтаалуудын дундаас аль нэгийг сонгож болно:'
// 6개 옵션 고유 지문 (getByText).
const OPT = [
  'Төгс жаргалт Цэвэр Охин Мариагийн дурсахуйд', // 옵션1
  'Дээдийн дээд Эзэн Тэнгэрбурхан энэ дэлхий', // 옵션2
  'дэлхийн Аврагчийг төрүүлсэн', // 옵션3
  'Таныг эмэгтэйчүүдийн дундаас адисалсан билээ. Аллэлуяа!', // 옵션4
  'магтах үгсийг хэрхэн олох вэ', // 옵션5
  'Израилийн баяр хөөр, Йерусалимын цог жавхлан', // 옵션6
]

function benedictus(page: Page): Locator {
  return page.locator(BENEDICTUS)
}

async function gotoMaryLauds(page: Page, date: string): Promise<void> {
  await page.goto(`/pray/${date}/lauds?celebration=saturday-mary`)
  await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
}

// 드롭다운(combobox)으로 옵션N(0-based) 선택. 구현 hook(role=combobox/option)에
// 의존 — 미구현 시 이 헬퍼에서 RED(타임아웃).
async function selectOption(page: Page, optionUniqueText: string): Promise<void> {
  const section = benedictus(page)
  await section.getByRole('combobox').click()
  await page.getByRole('option', { name: new RegExp(escapeRe(optionUniqueText)) }).click()
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('FR-168 saturday-mary Benedictus 후렴 드롭다운 + 루브릭', () => {
  // @fr FR-168
  test('[D1] saturday-mary Lauds Benedictus 후렴 = 옵션1, 평일과 다름', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    await expect(section).toBeVisible()
    // 후렴 본문 = 옵션1 (getByText 키릴, NFR-002). 안티폰은 헤딩 아래 +
    // 본문 아래 recap 으로 2회 렌더(#29) → .first() 로 strict-mode 회피.
    await expect(section.getByText(OPT[0], { exact: false }).first()).toBeVisible()
    // 평일 ferial 후렴이 표시되지 않는다.
    await expect(section.getByText(FERIAL_BENEDICTUS, { exact: false })).toHaveCount(0)
  })

  // @fr FR-168
  test('[D2] 드롭다운(combobox) 노출 + 옵션3 선택 → 후렴 교체', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    await expect(section.locator(DROPDOWN)).toBeVisible()
    await expect(section.getByRole('combobox')).toBeVisible()
    await selectOption(page, OPT[2]) // 옵션3
    await expect(section.locator(ANTIPHON).getByText(OPT[2], { exact: false }).first()).toBeVisible()
  })

  // @fr FR-168
  test('[D2-H3] 동일 mount 내 옵션 선택 후 유지 (같은 화면)', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    await selectOption(page, OPT[3]) // 옵션4
    // 같은 mount(네비/리로드 없음) — 선택 유지.
    await expect(section.locator(ANTIPHON).getByText(OPT[3], { exact: false }).first()).toBeVisible()
    await expect(section.getByText(OPT[0], { exact: false })).toHaveCount(0)
  })

  // @fr FR-168
  test('[D2-E5] 새로고침 시 옵션1 리셋 (ephemeral, carry-over 없음)', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    await selectOption(page, OPT[2]) // 옵션3
    await expect(section.locator(ANTIPHON).getByText(OPT[2], { exact: false }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
    // 리로드 후 default(옵션1) 복귀.
    await expect(benedictus(page).getByText(OPT[0], { exact: false }).first()).toBeVisible()
    await expect(benedictus(page).getByText(OPT[2], { exact: false })).toHaveCount(0)
  })

  // @fr FR-168
  test('[D2-E5] 다른 날짜(saturday-mary)로 이동 시 옵션1 리셋 (cross-date 누수 없음)', async ({
    page,
  }) => {
    // 주: prayer-renderer 의 index-keying(key={i}) cross-date 인스턴스 재사용
    // 누수는 #93 §3 날짜-안정 key 로 차단. 여기서는 관찰 가능한 결과(다른
    // 날짜 → 옵션1)를 검증한다. 엄밀한 client <Link> 재사용 경로는 #96/#97
    // 가 in-app 네비로 추가 확인.
    await gotoMaryLauds(page, OT_SATURDAY)
    await selectOption(page, OPT[2]) // 옵션3
    await gotoMaryLauds(page, OT_SATURDAY_2)
    await expect(benedictus(page).getByText(OPT[0], { exact: false }).first()).toBeVisible()
    await expect(benedictus(page).getByText(OPT[2], { exact: false })).toHaveCount(0)
  })

  // @fr FR-168
  test('[D3] 안내 루브릭이 후렴 본문과 분리되어 표시 + 드롭다운 동반', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    const rubric = section.locator(RUBRIC_ROLE)
    await expect(rubric).toBeVisible()
    // 루브릭 원문(getByText 키릴, NFR-002).
    await expect(rubric.getByText(RUBRIC_TEXT, { exact: false })).toBeVisible()
    // 드롭다운 동반(루브릭 단독 금지).
    await expect(section.locator(DROPDOWN)).toBeVisible()
    // 루브릭이 후렴 본문(antiphon) 안에 혼입되지 않음.
    await expect(section.locator(ANTIPHON).getByText(RUBRIC_TEXT, { exact: false })).toHaveCount(0)
  })

  // @fr FR-168
  test('[D3-E1] 평일 Lauds 는 드롭다운/루브릭 미표시 (legacy 단일 후렴)', async ({ page }) => {
    await page.goto(`/pray/${PLAIN_WEEKDAY}/lauds`)
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()
    const section = benedictus(page)
    await expect(section.locator(DROPDOWN)).toHaveCount(0)
    await expect(section.locator(RUBRIC_ROLE)).toHaveCount(0)
  })

  // @fr FR-168
  test('[D4] 6개 후렴 모두 breviary 원문(키릴), 영어 fallback 0', async ({ page }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const section = benedictus(page)
    // 드롭다운 열기 → 6개 옵션 모두 원문 지문 노출.
    await section.getByRole('combobox').click()
    for (const phrase of OPT) {
      await expect(page.getByText(phrase, { exact: false }).first()).toBeVisible()
    }
    // 드롭다운/루브릭 영역에 라틴 문자(영어) 혼입 0 (NFR-002).
    const dropdownText = (await section.locator(DROPDOWN).innerText()) ?? ''
    expect(dropdownText).not.toMatch(/[A-Za-z]/)
    const rubricText = (await section.locator(RUBRIC_ROLE).innerText()) ?? ''
    expect(rubricText).not.toMatch(/[A-Za-z]/)
    // 맞춤법 빈출 오타 부재.
    expect(dropdownText + ' ' + rubricText).not.toContain('Гүйлтын')
  })

  // @fr FR-168
  test('[D3-E4] a11y — combobox 에 몽골어 accessible name(영어 fallback 없음)', async ({
    page,
  }) => {
    await gotoMaryLauds(page, OT_SATURDAY)
    const combo = benedictus(page).getByRole('combobox')
    await expect(combo).toBeVisible()
    const label =
      (await combo.getAttribute('aria-label')) ?? (await combo.innerText()) ?? ''
    // accessible name 은 몽골어 키릴, 영어 fallback 없음(NFR-002).
    expect(label).toMatch(/[Ѐ-ӿ]/)
    expect(label).not.toMatch(/[A-Za-z]/)
    // aria-selected 는 열린 listbox 옵션 속성(커스텀 listbox — component SSR
    // 닫힘 상태엔 부재 → 상호작용으로 검증). 기본 선택 = 옵션1.
    await combo.click()
    const selectedOpt = benedictus(page).getByRole('option', { selected: true })
    await expect(selectedOpt).toHaveCount(1)
    await expect(selectedOpt).toContainText(OPT[0])
  })
})
