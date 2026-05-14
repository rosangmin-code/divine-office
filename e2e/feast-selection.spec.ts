import { test, expect } from '@playwright/test'

// Dates derived from the romcal 2026 output used in unit tests.
const OT_SATURDAY = '2026-05-30'   // FERIA, OT Saturday → default + saturday-mary
const PLAIN_WEEKDAY = '2026-06-15'  // FERIA, OT Monday → default only
const FEAST_DAY = '2026-06-13'      // FEAST (Immaculate Heart) → default only

// Task #48 removed all PDF-외 optional memorials (04-17 Benedict Joseph Labre,
// 06-13 Anthony of Padua, 10-04 Francis of Assisi) — `optional-memorials.json`
// is now `{}`. The "registered optional memorial on its MM-DD" assertion is
// obsolete; the surviving multi-option case is covered by the Saturday-Mary
// votive memorial tests above.

test.describe('Feast / memorial selection', () => {
  test('home page shows a picker on an OT Saturday and offers the saturday-mary option', async ({ page }) => {
    await page.goto(`/?date=${OT_SATURDAY}`)

    const picker = page.getByTestId('celebration-picker').first()
    await expect(picker).toBeVisible()

    const maryOption = picker.locator('[data-celebration-id="saturday-mary"]').first()
    await expect(maryOption).toBeVisible()

    // Default is the romcal Saturday weekday.
    const defaultOption = picker.locator('[data-celebration-id="default"]').first()
    await expect(defaultOption).toBeVisible()
    await expect(defaultOption).toHaveAttribute('aria-checked', 'true')
  })

  test('selecting saturday-mary updates the URL and propagates to hour card links', async ({ page }) => {
    await page.goto(`/?date=${OT_SATURDAY}`)

    const picker = page.getByTestId('celebration-picker').first()
    await picker.locator('[data-celebration-id="saturday-mary"]').first().click()

    await expect(page).toHaveURL(/celebration=saturday-mary/)

    const laudsLink = page.getByRole('link', { name: /Өглөөний даатгал залбирал/ }).first()
    const href = await laudsLink.getAttribute('href')
    expect(href).toContain('celebration=saturday-mary')
  })

  test('plain weekday hides the picker when only the default option exists', async ({ page }) => {
    await page.goto(`/?date=${PLAIN_WEEKDAY}`)
    await expect(page.getByTestId('celebration-picker')).toHaveCount(0)
  })

  test('feast day hides the picker', async ({ page }) => {
    await page.goto(`/?date=${FEAST_DAY}`)
    await expect(page.getByTestId('celebration-picker')).toHaveCount(0)
  })

  test('pray page honors ?celebration=saturday-mary query on Lauds', async ({ page, request }) => {
    await page.goto(`/pray/${OT_SATURDAY}/lauds?celebration=saturday-mary`)
    await expect(page.getByRole('heading', { name: 'Өглөөний даатгал залбирал' })).toBeVisible()

    // The API returns the Mary-specific concluding prayer text.
    const res = await request.get(`/api/loth/${OT_SATURDAY}/lauds?celebration=saturday-mary`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const concluding = body.sections.find((s: { type: string }) => s.type === 'concludingPrayer')
    expect(concluding).toBeTruthy()
    expect(concluding.text).toMatch(/Мариа|Цэвэр Охин/)

    expect(body.liturgicalDay.nameMn).toMatch(/Мариа/)
    expect(body.liturgicalDay.color).toBe('WHITE')
  })

  test('pray page back links preserve the celebration query', async ({ page }) => {
    await page.goto(`/pray/${OT_SATURDAY}/vespers?celebration=saturday-mary`)
    const backLink = page.getByRole('link', { name: /Бүх цагийн залбирлууд руу буцах/ })
    const href = await backLink.getAttribute('href')
    expect(href).toContain('celebration=saturday-mary')
  })

  test('/api/calendar/options returns the romcal default plus saturday-mary on an OT Saturday', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${OT_SATURDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.date).toBe(OT_SATURDAY)
    expect(Array.isArray(body.options)).toBe(true)

    const ids = body.options.map((o: { id: string }) => o.id)
    expect(ids).toContain('default')
    expect(ids).toContain('saturday-mary')

    const def = body.options.find((o: { id: string }) => o.id === 'default')
    expect(def.isDefault).toBe(true)
    expect(def.source).toBe('romcal')

    const mary = body.options.find((o: { id: string }) => o.id === 'saturday-mary')
    expect(mary.isDefault).toBe(false)
    expect(mary.source).toBe('votive')
    expect(mary.color).toBe('WHITE')
  })

  test('/api/calendar/options returns only the default on a plain weekday', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${PLAIN_WEEKDAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.options).toHaveLength(1)
    expect(body.options[0].id).toBe('default')
  })

  // FR-031: optional-memorials.json is currently empty (task #48 removed the
  // 3 non-PDF-authored entries). Days without a registered MM-DD optional
  // memorial return only the romcal default — verifies the loader doesn't
  // synthesise spurious options after the catalog became empty.
  test('/api/calendar/options returns only default for an MM-DD without registered optional memorial', async ({ request }) => {
    const res = await request.get('/api/calendar/options/2026-04-17') // formerly Benedict Joseph Labre
    expect(res.status()).toBe(200)
    const body = await res.json()
    const ids = body.options.map((o: { id: string }) => o.id)
    expect(ids).toEqual(['default'])
  })

  test('invalid date returns 400 from the options API', async ({ request }) => {
    // Aligns with commit 905073b's `isValidDateStr` contract — malformed
    // strings return 400 (Bad Request), not 404. The original 404 assertion
    // was stale even before #48.
    const res = await request.get('/api/calendar/options/not-a-date')
    expect(res.status()).toBe(400)
  })

  test('unknown celebrationId is ignored and default propers are served', async ({ request }) => {
    const base = await (await request.get(`/api/loth/${OT_SATURDAY}/lauds`)).json()
    const withBogus = await (
      await request.get(`/api/loth/${OT_SATURDAY}/lauds?celebration=does-not-exist`)
    ).json()
    expect(withBogus.liturgicalDay.nameMn).toBe(base.liturgicalDay.nameMn)
  })
})

// @fr FR-XXX  (placeholder — task #8 머지 시 실제 FR 번호로 일괄 교체)
//
// task #8 통합 구현 (P1+P2+P4+P5) 의 옵션 모델 v2 확정 결정 회귀 가드:
//   - Calendar authority: General Roman, no transfer
//   - Data source: PDF-authored only
//   - 2026-05-14 default = Ascension (SOLEMNITY)
//   - 마티아 사도 (5/14) 미노출 — PDF 카탈로그 없음
//   - Pre-empted feast: PDF 데이터 없으면 옵션에서 미노출

const ASCENSION_DAY = '2026-05-14'      // SOLEMNITY (movable, romcal Ascension Thursday)
const PENTECOST_DAY = '2026-05-24'      // SOLEMNITY, RED (movable)

test.describe('2026-05-14 Ascension default + PDF-only data policy (옵션 모델 v2)', () => {
  test('home page에서 Ascension 이 default 로 노출되고 picker 는 마티아 옵션을 제공하지 않는다', async ({
    page,
  }) => {
    await page.goto(`/?date=${ASCENSION_DAY}`)

    // SOLEMNITY day → 다중 옵션이 없으므로 picker 자체가 숨겨지거나, 노출되더라도
    // default 외 옵션은 없다 (PDF 카탈로그에 마티아 entry 자체가 없음).
    const pickerCount = await page.getByTestId('celebration-picker').count()
    if (pickerCount > 0) {
      const picker = page.getByTestId('celebration-picker').first()
      const matthiasOption = picker.locator(
        '[data-celebration-id*="matthias"], [data-celebration-id*="маттиа"]',
      )
      await expect(matthiasOption).toHaveCount(0)
      const defaultOption = picker.locator('[data-celebration-id="default"]').first()
      await expect(defaultOption).toBeVisible()
      await expect(defaultOption).toHaveAttribute('aria-checked', 'true')
    }
  })

  test('/api/calendar/options/2026-05-14 → default only, 마티아 id 없음', async ({ request }) => {
    const res = await request.get(`/api/calendar/options/${ASCENSION_DAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()

    const ids = body.options.map((o: { id: string }) => o.id)
    // default 는 반드시 포함되고, 마티아 슬러그 후보 (영문/몽골어/MM-DD 등)
    // 어느 것도 노출되지 않는다 — PDF-only 정책의 source-level 회귀 가드.
    expect(ids).toContain('default')
    for (const id of ids) {
      expect(id).not.toMatch(/matthias|маттиа|маттай|05-14/i)
    }

    const def = body.options.find((o: { id: string }) => o.id === 'default')
    expect(def.isDefault).toBe(true)
    expect(def.source).toBe('romcal')
    expect(def.rank).toBe('SOLEMNITY')
  })

  test('Pentecost (2026-05-24) 또한 SOLEMNITY default-only — PDF-only 정책 동치 가드', async ({
    request,
  }) => {
    const res = await request.get(`/api/calendar/options/${PENTECOST_DAY}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.options).toHaveLength(1)
    expect(body.options[0].id).toBe('default')
    expect(body.options[0].rank).toBe('SOLEMNITY')
  })

  test('URL ?celebration=<id> 갱신은 hour card 링크에 전파된다 (selection 보존 contract)', async ({
    page,
  }) => {
    // OT Saturday (saturday-mary 옵션 보유) 를 표적으로 URL → href 전파 회귀 가드.
    await page.goto(`/?date=${OT_SATURDAY}&celebration=saturday-mary`)
    await expect(page).toHaveURL(/celebration=saturday-mary/)

    // hour card 1개 이상은 ?celebration=saturday-mary 가 href 에 전파되어야 한다.
    const hourLink = page.locator('a[href*="/pray/"][href*="celebration=saturday-mary"]').first()
    await expect(hourLink).toBeVisible()
  })
})

// pre-empted feast 알고리즘 — PDF 데이터가 author 된 일자에서만 alternative
// 가 선택 가능해야 한다. 현재 카탈로그에는 해당 시나리오를 만족하는 일자가
// 없으므로 fixme — task #8 구현 후 PDF 데이터를 추가 author 하면 활성화.
test.describe('Pre-empted feast 알고리즘 (PDF 데이터 있을 때만 alternative)', () => {
  test.fixme(
    'PDF 가 동일 일자에 alternative celebration 을 author 한 경우 picker 가 alt 옵션을 노출한다',
    async () => {
      // 활성화 시:
      //   await page.goto(`/?date=<DATE_WITH_PDF_ALT>`)
      //   const picker = page.getByTestId('celebration-picker').first()
      //   const altOption = picker.locator('[data-celebration-id]:not([data-celebration-id="default"])').first()
      //   await expect(altOption).toBeVisible()
      //   const altId = await altOption.getAttribute('data-celebration-id')
      //   expect(altId).toBeTruthy()
    },
  )

  test.fixme(
    'PDF 가 author 하지 않은 alternative 는 romcal/sanctoral 에 존재해도 옵션 목록에 포함되지 않는다',
    async () => {
      // 활성화 시: romcal 에 등록된 sanctoral 중 PDF 카탈로그에 없는 일자를
      // 표적으로 두고, /api/calendar/options 응답에 해당 id 가 없음을 확인.
    },
  )
})
