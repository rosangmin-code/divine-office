import { test, expect } from '@playwright/test'
import { DATES, ALL_HOURS } from './fixtures/dates'

// @fr FR-XXX  (placeholder — task #8 머지 시 실제 FR 번호로 일괄 교체)
//
// SUPERSEDED BY FR-163 (GOAL #4 / wi-001..wi-007 merges #13-#19) —
// the calendar-list `/` route was rewritten from the "today-centric
// infinite scroll" iter 1 (this file's contract) to "month-mode + URL
// `?month=YYYY-MM`" iter 2. All 9 tests below use the pre-GOAL-#4
// data-role attributes ("liturgical-calendar-list", "calendar-entry",
// "today-auto-label") that the current implementation no longer emits
// (current testids: "calendar-row", "calendar-row-toggle",
// "calendar-row-body", data-row-kind="date"|"today-anchor").
//
// Per wi-008 (#20) the dispatched scope is the new
// calendar-list-month.spec.ts (which already covers the iter 2
// contract via current testids). Re-authoring this file's selectors
// belongs to wi-009 (#21 — GOAL #4 통합 검증). Each test is wrapped
// with .skip + TODO(wi-009) below to keep `npx playwright test` PASS
// while preserving the obsolete source for refresh.
//
// task #7 plan + task #8 통합 구현 (P1+P2+P4+P5) 의 e2e 사양.
// 본 파일은 구현이 in_flight 인 상태에서 contract 를 미리 동결하는 spec 이며,
// task #8 머지 직후 dvo-rev-cl 가 그대로 plug-in 가능하다. CLAUDE.md
// selector 규약대로 기능 검증은 data-role / data-attr, 몽골어 텍스트는
// spelling 검증에만 사용한다.
//
// 확정 사용자 결정 (task #8 dispatch 동일):
//   - General Roman calendar, no transfer
//   - PDF-authored data only (마티아 5/14 미노출, Ascension 표시)
//   - Auto default = romcal 추천
//   - 무한 스크롤 + 오늘 중심 + 인라인 hour cards 펼침
//   - Pre-empted feast: PDF 에 데이터 없으면 미노출
//   - 색상: mappings.ts RED 룰 그대로 (SOLEMNITY+RED → text-liturgical-red)
//   - Missing propers 옵션 미노출

// 5/14 = Ascension Thursday (SOLEMNITY, WHITE — 흰 색상 룰).
// 5/24 = Pentecost Sunday (SOLEMNITY, RED — 빨간 색상 룰 확인용 표적).
const TODAY = DATES.ascensionDay2026                   // 2026-05-14
const ASCENSION_EVE = DATES.ascensionEve2026            // 2026-05-13
const PENTECOST = DATES.pentecostDay2026                // 2026-05-24
const OT_WEEKDAY = DATES.ordinaryWeekday                // 2026-02-04 (WEEKDAY)

test.describe.skip('Liturgical calendar list — 첫 화면 렌더 (P1)', () => {
  test('list container with anchor-centered entries is visible on /', async ({ page }) => {
    await page.goto(`/?date=${TODAY}`)

    const list = page.locator('[data-role="liturgical-calendar-list"]')
    await expect(list).toBeVisible()

    // Multiple entries around the anchor (≥ 5 — implementation default
    // window is ±N days; the exact N is task #8 scope but ≥ 5 is a safe
    // floor for the regression guard).
    const entries = list.locator('[data-role="calendar-entry"]')
    expect(await entries.count()).toBeGreaterThanOrEqual(5)
  })

  test('anchor date entry carries data-is-today + Today (Automatic) label', async ({ page }) => {
    await page.goto(`/?date=${TODAY}`)

    const todayRow = page
      .locator('[data-role="calendar-entry"]')
      .filter({ has: page.locator(`[data-date="${TODAY}"]`) })
      .or(page.locator(`[data-role="calendar-entry"][data-date="${TODAY}"]`))
      .first()
    await expect(todayRow).toBeVisible()
    await expect(todayRow).toHaveAttribute('data-is-today', 'true')

    // The "Today (Automatic)" label is shown only on the anchor row.
    // Mongolian translation is task #8 decision — assert via data-role only
    // (per CLAUDE.md selector 규약: 기능 검증은 data-attr-first).
    const todayLabel = todayRow.locator('[data-role="today-auto-label"]')
    await expect(todayLabel).toBeVisible()
    const labelText = (await todayLabel.textContent())?.trim() ?? ''
    expect(labelText.length).toBeGreaterThan(0)

    // Non-anchor rows must NOT carry the auto-label or the today flag.
    const otherEntries = page
      .locator('[data-role="calendar-entry"]')
      .locator(`:not([data-date="${TODAY}"])`)
    const otherCount = await otherEntries.count()
    if (otherCount > 0) {
      // Sample the first non-anchor entry.
      const first = otherEntries.first()
      await expect(first).not.toHaveAttribute('data-is-today', 'true')
      await expect(first.locator('[data-role="today-auto-label"]')).toHaveCount(0)
    }
  })

  test('SOLEMNITY entry carries the mappings.ts liturgical color class', async ({ page }) => {
    // Pentecost (2026-05-24) is SOLEMNITY+RED — exercises the RED rule.
    // Anchor at Pentecost so the window contains the row.
    await page.goto(`/?date=${PENTECOST}`)

    const pentecostRow = page
      .locator(`[data-role="calendar-entry"][data-date="${PENTECOST}"]`)
      .first()
    await expect(pentecostRow).toBeVisible()
    await expect(pentecostRow).toHaveAttribute('data-rank', 'SOLEMNITY')

    // mappings.ts → TEXT_COLOR_CLASSES['RED'] = 'text-liturgical-red dark:text-liturgical-red-dark'
    // The accent element (entry name / rank chip / icon — any) MUST carry
    // a class containing 'liturgical-red' OR 'text-red-' to prove the
    // RED color rule was applied. We don't pin to a specific element so
    // task #8 styling decisions remain flexible.
    const classAttr = await pentecostRow.evaluate((el) => el.outerHTML)
    expect(classAttr).toMatch(/liturgical-red|text-red-/)
  })

  test('plain weekday entry does NOT carry the RED solemnity treatment', async ({ page }) => {
    await page.goto(`/?date=${OT_WEEKDAY}`)

    const weekdayRow = page
      .locator(`[data-role="calendar-entry"][data-date="${OT_WEEKDAY}"]`)
      .first()
    await expect(weekdayRow).toBeVisible()
    await expect(weekdayRow).toHaveAttribute('data-rank', 'WEEKDAY')

    const html = await weekdayRow.evaluate((el) => el.outerHTML)
    // OT weekday is GREEN — no red treatment on the row.
    expect(html).not.toMatch(/liturgical-red|text-red-/)
  })
})

test.describe.skip('Liturgical calendar list — 인터랙션 (P2 inline expand)', () => {
  test('row click toggles inline hour cards without route change', async ({ page }) => {
    await page.goto(`/?date=${TODAY}`)

    const row = page
      .locator(`[data-role="calendar-entry"][data-date="${TODAY}"]`)
      .first()
    await expect(row).toBeVisible()

    // Inline hours block is collapsed by default (or only visible on the
    // anchor; either contract is acceptable — we verify by toggling).
    const hoursBlock = row.locator('[data-role="calendar-entry-hours"]')

    // Click the row toggle target (the row itself or an explicit
    // [data-role="calendar-entry-toggle"]; we click the row to cover both).
    const initialUrl = page.url()
    await row.click()
    expect(page.url()).toBe(initialUrl) // no route change

    await expect(hoursBlock).toBeVisible()

    // Hours block contains a link per active hour (count varies — Mon-Fri
    // anchors expose 3 hours, Sundays 5, Sat 1 per #230 F-X5). Assert ≥ 1.
    const hourLinks = hoursBlock.locator('a[href*="/pray/"]')
    expect(await hourLinks.count()).toBeGreaterThanOrEqual(1)
  })

  test('clicking an hour link inside the inline block navigates to /pray/[date]/[hour]', async ({
    page,
  }) => {
    await page.goto(`/?date=${TODAY}`)

    const row = page
      .locator(`[data-role="calendar-entry"][data-date="${TODAY}"]`)
      .first()
    await row.click()

    const hoursBlock = row.locator('[data-role="calendar-entry-hours"]')
    const firstHourLink = hoursBlock.locator('a[href*="/pray/"]').first()
    const href = await firstHourLink.getAttribute('href')
    expect(href).toMatch(new RegExp(`/pray/${TODAY}/(${ALL_HOURS.join('|')})`))

    await firstHourLink.click()
    await expect(page).toHaveURL(new RegExp(`/pray/${TODAY}/`))
  })

  test('back link from pray page restores list view at the same anchor + selection', async ({
    page,
  }) => {
    // Enter via list → row → hour → pray page, then press back link.
    await page.goto(`/?date=${TODAY}`)
    const row = page
      .locator(`[data-role="calendar-entry"][data-date="${TODAY}"]`)
      .first()
    await row.click()
    const firstHourLink = row.locator('[data-role="calendar-entry-hours"] a[href*="/pray/"]').first()
    await firstHourLink.click()
    await expect(page).toHaveURL(new RegExp(`/pray/${TODAY}/`))

    // Back link on the pray page → returns to / with the anchor preserved.
    // The existing prayer pages use a back link with aria-label /Бүх цагийн залбирлууд руу буцах/.
    const back = page.getByRole('link', { name: /Бүх цагийн залбирлууд руу буцах|Буцах/ }).first()
    const backHref = await back.getAttribute('href')
    expect(backHref).toMatch(new RegExp(`/(\\?|$)`))
    // The anchor date must survive the round-trip — either via ?date= or
    // because the home page is the unconditional landing.
    if (backHref && backHref.includes('?')) {
      expect(backHref).toContain(`date=${TODAY}`)
    }
    await back.click()
    await expect(page.locator('[data-role="liturgical-calendar-list"]')).toBeVisible()
  })
})

test.describe.skip('Liturgical calendar list — 무한 스크롤 (P4)', () => {
  test('scrolling to the bottom appends more calendar entries', async ({ page }) => {
    await page.goto(`/?date=${TODAY}`)

    const list = page.locator('[data-role="liturgical-calendar-list"]')
    await expect(list).toBeVisible()

    const before = await list.locator('[data-role="calendar-entry"]').count()
    expect(before).toBeGreaterThanOrEqual(5)

    // Scroll the list (or window) to the bottom; the implementation may
    // listen on either window scroll or list-internal scroll — task #8
    // decides. We try window scroll first, then a wheel event on the list.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(400)

    const after = await list.locator('[data-role="calendar-entry"]').count()
    expect(after).toBeGreaterThan(before)
  })
})

test.describe.skip('Liturgical calendar list — "or" alternative (P5 pre-empted feast)', () => {
  test('5/13 Ascension eve row has no PDF-authored alternative → no "or" indicator', async ({
    page,
  }) => {
    // Per task #8 dispatch decision #5 (Pre-empted feasts: PDF 데이터 없으면
    // 미노출): 2026-05-13 카탈로그에 별도 alt PDF entry 가 없는 한 "or"
    // indicator 는 노출되지 않는다. 본 케이스는 PDF-only 정책 회귀 가드.
    await page.goto(`/?date=${ASCENSION_EVE}`)

    const row = page
      .locator(`[data-role="calendar-entry"][data-date="${ASCENSION_EVE}"]`)
      .first()
    await expect(row).toBeVisible()
    await expect(row.locator('[data-role="calendar-entry-alt-option"]')).toHaveCount(0)
  })

  // PDF 에 별도 alternative 가 author 된 일자가 카탈로그에 추가되면 활성화.
  // 현재 시점 (2026-05-14) 의 sanctoral/feasts.json + propers/easter.json
  // 에는 동일 일자에 PDF-authored alternative 가 없으므로 fixme.
  test.fixme(
    'on a date with PDF-authored alternative, the row exposes [data-role="calendar-entry-alt-option"] linking to ?celebration=<alt-id>',
    async () => {
      // 활성화 시 다음 패턴으로 작성:
      //   await page.goto(`/?date=<DATE_WITH_PDF_ALT>`)
      //   const row = page.locator(`[data-role="calendar-entry"][data-date="<DATE>"]`)
      //   const alt = row.locator('[data-role="calendar-entry-alt-option"]')
      //   await expect(alt).toBeVisible()
      //   await expect(alt).toContainText(/эсвэл|or/i)
      //   const altHref = await alt.locator('a').first().getAttribute('href')
      //   expect(altHref).toMatch(/celebration=/)
    },
  )
})
