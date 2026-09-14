import { test, expect, type Page } from '@playwright/test'
import { DATES } from './fixtures/dates'

// 2026-09-14 — 홈이 월 캘린더 리스트(FR-145 / GOAL #4) 로 재설계되고 pray
// 페이지 hero 가 WI-62 재스킨(#54) 되면서 옛 DOM 이 사라졌다:
//   - 홈: `.border-liturgical-*` 카드 / `h2.text-liturgical-*` 제목 없음.
//     행은 `[data-testid="calendar-row"]` 이고 절기명은
//     `calendar-row-header`(요일 약칭 + 일 + 월) / `calendar-row-default`
//     (기본 축일·절기명) 에, 시편주간은 펼친 행의 body 에 렌더된다. 홈에는
//     절기 의미색이 없고 대축일·축일(SOLEMNITY/FEAST) 만 골드 악센트다.
//   - pray: 절기색은 `<header>` 좌측 accent rule(`border-l-2
//     ${BORDER_COLOR_CLASSES[color]}`) 로만 남았고 h1 은 ink 색이다.
//     날짜·요일·시편주간은 header 의 마지막 <p> 한 줄에 합쳐졌다.
// 검증 의도(절기 라벨 + 절기색 + 시편주간 + 성인 대축일 이름 치환)는 그대로
// 두고 셀렉터만 현재 구조로 옮겼다. 기능 검증은 data-testid / role, 몽골어
// 문구는 텍스트에 의도적으로 결합(CLAUDE.md selector 원칙).

/** Home month-list row for `date` (kind=date; excludes the today-anchor). */
function homeRow(page: Page, date: string) {
  return page.locator(
    `[data-testid="calendar-row"][data-row-kind="date"][data-date="${date}"]`,
  )
}

/** pray page hero header — the page's single <header> (sits inside the
 *  layout <main>, so it has no implicit banner role). */
function prayHeader(page: Page) {
  return page.locator('header').first()
}

test.describe('Liturgical calendar seasons and colors', () => {
  test('Ordinary Time: green color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(
      homeRow(page, DATES.ordinaryWeekday).getByTestId('calendar-row-default'),
    ).toContainText('Жирийн цаг улирлын')

    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-green/)
  })

  test('Advent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.adventWeekday}`)
    await expect(
      homeRow(page, DATES.adventWeekday).getByTestId('calendar-row-default'),
    ).toContainText('Ирэлтийн цаг улирлын')

    await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-violet/)
  })

  test('Christmas: white color', async ({ page }) => {
    // WHITE renders as the stone-400 accent rule (pure white is invisible
    // on the light surface) — see BORDER_COLOR_CLASSES.
    await page.goto(`/pray/${DATES.christmasDay}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-stone-400/)
  })

  test('Lent: violet color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.lentWeekday}`)
    await expect(
      homeRow(page, DATES.lentWeekday).getByTestId('calendar-row-default'),
    ).toContainText('Дөч хоногийн цаг улирлын')

    await page.goto(`/pray/${DATES.lentWeekday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-violet/)
  })

  test('Easter: white color, correct season', async ({ page }) => {
    await page.goto(`/?date=${DATES.easterSunday}`)
    await expect(
      homeRow(page, DATES.easterSunday).getByTestId('calendar-row-default'),
    ).toContainText('Дээгүүр өнгөрөх цаг улирлын')

    await page.goto(`/pray/${DATES.easterSunday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-stone-400/)
  })

  test('season transition: Ordinary Time → Advent boundary', async ({ page }) => {
    // Both boundary dates fall in the same month, so one home load shows
    // the last OT Saturday row and the first Advent Sunday row together.
    await page.goto(`/?date=${DATES.lastOTSaturday}`)
    await expect(
      homeRow(page, DATES.lastOTSaturday).getByTestId('calendar-row-default'),
    ).toContainText('Жирийн цаг улирлын')
    await expect(
      homeRow(page, DATES.firstAdventSunday).getByTestId('calendar-row-default'),
    ).toContainText('Ирэлтийн цаг улирлын')

    // Last OT Saturday → green
    await page.goto(`/pray/${DATES.lastOTSaturday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-green/)

    // First Advent Sunday → violet
    await page.goto(`/pray/${DATES.firstAdventSunday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-violet/)
  })
})

test.describe('Liturgical day heading details (home)', () => {
  test('heading merges season + week; psalter week on its own line', async ({ page }) => {
    // OT Week 4 Wednesday → psalter week 4 (IV). `?date=` pre-expands the
    // row (FR-145 AC5) so the psalter-week caption in the row body is shown.
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    const row = homeRow(page, DATES.ordinaryWeekday)
    await expect(row.getByTestId('calendar-row-default')).toHaveText(
      'Жирийн цаг улирлын 4-р долоо хоног',
    )
    await expect(row.getByTestId('calendar-row-body')).toBeVisible()
    await expect(row.getByText('Дуулалтын IV', { exact: true })).toBeVisible()
  })

  test('card shows gregorian date + weekday line (Mongolian)', async ({ page }) => {
    // 2026-02-04 Wednesday → row header "Лха 4 2-р сар" (3-char Mongolian
    // weekday + day-of-month + month). NFR-002: Cyrillic only.
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(
      homeRow(page, DATES.ordinaryWeekday).getByTestId('calendar-row-header'),
    ).toHaveText('Лха 4 2-р сар')
  })

  test('heading text tinted with season color class', async ({ page }) => {
    // Home rows no longer tint by season (DESIGN.md: accent is gold only,
    // reserved for SOLEMNITY/FEAST). A plain weekday row must therefore
    // NOT carry the gold accent; the season color itself lives on the
    // pray-page header accent rule.
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(
      homeRow(page, DATES.ordinaryWeekday).getByTestId('calendar-row-default'),
    ).not.toHaveClass(/liturgical-gold/)
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-green/)

    await page.goto(`/?date=${DATES.adventWeekday}`)
    await expect(
      homeRow(page, DATES.adventWeekday).getByTestId('calendar-row-default'),
    ).not.toHaveClass(/liturgical-gold/)
    await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-liturgical-violet/)
  })

  test('WHITE season uses gold text class on heading (not white)', async ({ page }) => {
    // Christmas Day is WHITE + SOLEMNITY → the home row's celebration
    // line uses the readable gold accent, and the pray-page header uses
    // stone-400 for the rule + gold for the kicker — never a white class.
    await page.goto(`/?date=${DATES.christmasDay}`)
    const line = homeRow(page, DATES.christmasDay).getByTestId('calendar-row-default')
    await expect(line).toHaveClass(/text-liturgical-gold/)
    await expect(line).not.toHaveClass(/text-white/)

    await page.goto(`/pray/${DATES.christmasDay}/lauds`)
    const header = prayHeader(page)
    await expect(header).toHaveClass(/border-stone-400/)
    await expect(header).not.toHaveClass(/border-white/)
    await expect(header.locator('p').first()).toHaveClass(/text-liturgical-gold/)
  })

  test('color label (Ногоон/Нил ягаан/…) is no longer displayed', async ({ page }) => {
    // After commit 56b2914 the explicit color word was removed from the subtitle
    await page.goto(`/?date=${DATES.ordinaryWeekday}`)
    await expect(page.getByText('Ногоон', { exact: true })).toHaveCount(0)
  })

  test('sanctoral solemnity replaces generic day name (St. Joseph)', async ({ page }) => {
    await page.goto(`/?date=${DATES.stJoseph}`)
    const line = homeRow(page, DATES.stJoseph).getByTestId('calendar-row-default')
    // celebration line should NOT fall back to "{season-GEN} N-р долоо хоног"
    await expect(line).not.toHaveText(/долоо хоног/)
    await expect(line).toHaveText('Гэгээн Иосеф')
    // SOLEMNITY → gold accent on the home row
    await expect(line).toHaveClass(/text-liturgical-gold/)

    // And the color border should be WHITE (rendered as stone-400)
    await page.goto(`/pray/${DATES.stJoseph}/lauds`)
    await expect(prayHeader(page)).toHaveClass(/border-stone-400/)
  })

  test('Easter Octave psalter week is clamped to I (not V)', async ({ page }) => {
    // romcal returns psalterWeek=5 for the octave; calendar.ts clamps to 1
    await page.goto(`/?date=${DATES.easterFriday}`)
    await expect(page.getByText(/Дуулалтын I\b/)).toBeVisible()
    await expect(page.getByText(/Дуулалтын V/)).toHaveCount(0)
  })
})

test.describe('Liturgical day heading details (pray page)', () => {
  test('pray page header shows gregorian date + weekday', async ({ page }) => {
    // Date · weekday · psalter week share one caption line — substring match.
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(prayHeader(page)).toContainText('2026.02.04 Лхагва')
  })

  test('pray page header merges season + week and shows psalter week line', async ({ page }) => {
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    const header = prayHeader(page)
    await expect(header).toContainText('Жирийн цаг улирлын 4-р долоо хоног')
    await expect(header).toContainText('Дуулалтын IV')
  })

  test('pray page hour heading is tinted with season color', async ({ page }) => {
    // WI-62 (#54): the h1 is ink; the season color is the header's
    // left accent rule. Assert the tinted header wraps the hour heading.
    await page.goto(`/pray/${DATES.adventWeekday}/lauds`)
    const header = prayHeader(page)
    await expect(header).toHaveClass(/border-liturgical-violet/)
    await expect(header.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('pray page header shows liturgical day name in subtitle', async ({ page }) => {
    // 2026-02-04 is OT week 4 Wednesday
    await page.goto(`/pray/${DATES.ordinaryWeekday}/lauds`)
    await expect(
      page.getByText('Жирийн цаг улирлын 4-р долоо хоног').first(),
    ).toBeVisible()
  })
})
