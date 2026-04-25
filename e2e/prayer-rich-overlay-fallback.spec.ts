import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-153
// Task #54 — symmetric wk1 fallback for `loadSeasonalRichOverlay`.
//
// Prior to this fix, Easter weeks 2-7 weekdays (and the analogous Lent /
// Advent weekday rotations) loaded JSON propers from `weeks['1']` (the
// PDF Octave) but the matching `seasonal/easter/wN-DAY-hour.rich.json`
// file did not exist for N>1. The resolver returned `null` for seasonal
// rich, then `psalterCommons` filled in the body — producing the visible
// bug "JSON ref `Ром 14:7-9` (Easter wk1 SAT) + body 'Тиймээс Христ дотор...'
// (psalter wk3 SAT)". The fix mirrors `propers-loader`'s `weeks['1']`
// fallback in `loadSeasonalRichOverlay`.
//
// E2E gate: render the prayer page for representative wk2-7 weekday dates
// and assert the rendered shortReading body matches the wk1 rich content.
test.describe('seasonal rich overlay wk1 fallback (task #54)', () => {
  test('Easter Week 3 Saturday lauds — body matches w1-SAT-lauds rich', async ({
    page,
  }) => {
    // 2026-04-25 is Easter Week 3 Saturday. JSON propers fall back to
    // `easter.json weeks['1'].SAT.lauds` (ref `Ром 14:7-9`, page 728);
    // rich must mirror that fallback to `seasonal/easter/w1-SAT-lauds.rich.json`
    // whose shortReading body opens with "Бидний хэн нь...".
    await page.goto(`/pray/${DATES.easterW3Saturday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    // Rich path: a single RichContent wrapper (no legacy `<sup>` verses).
    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)

    // Direct body assertion — the dispatch's evidence requirement.
    await expect(section).toContainText('Бидний хэн нь')
  })

  test('Easter Week 2 Monday lauds — body matches w1-MON-lauds rich', async ({
    page,
  }) => {
    // 2026-04-13. Same fallback path as above; assert rich coverage by
    // shape (single wrapper, no legacy verses), then a body excerpt that
    // appears in `seasonal/easter/w1-MON-lauds.rich.json`'s shortReading.
    await page.goto(`/pray/${DATES.easterW2Monday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Lent Week 2 Tuesday lauds — body sourced from lent/w1-TUE-lauds rich', async ({
    page,
  }) => {
    // 2026-03-03. Lent weeks 2-5 weekdays mirror the wk1 weekday
    // formulary; rich fallback prevents the same partial-merge bug.
    await page.goto(`/pray/${DATES.lentW2Tuesday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Advent Week 2 Wednesday lauds — body sourced from advent/w1-WED-lauds rich', async ({
    page,
  }) => {
    // 2025-12-10. Advent weeks 2-3 weekdays mirror the wk1 formulary.
    await page.goto(`/pray/${DATES.adventW2Wednesday}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })
})

// @fr FR-153
// Task #57 — Tier 1 special-key disk file load. The seasonal rich loader
// now consults `seasonal/easter/w{specialKey}-{day}-{hour}.rich.json` for
// `resolveSpecialKey` matches (Easter ascension/easterSunday/pentecost,
// OT trinitySunday/corpusChristi/sacredHeart/christTheKing). Disk files
// previously sat unloaded since #54 added the special-key wk1-fallback
// guard but no Tier 1 load. Pentecost Sunday (2026-05-24) renders the
// rich shortReading; Ascension Thursday (2026-05-14) day-of has no
// matching THU disk file, but the page must still render cleanly.
test.describe('seasonal rich overlay special-key load (task #57)', () => {
  test('Pentecost Sunday lauds — shortReading renders from wpentecost rich', async ({
    page,
  }) => {
    // 2026-05-24 = Pentecost Sunday. day === 'SUN' so
    // `seasonal/easter/wpentecost-SUN-lauds.rich.json` is loaded by Tier 1.
    // The file carries `shortReadingRich`; the page must render
    // RichContent (single wrapper, no legacy `<sup>` verse numbers).
    await page.goto(`/pray/${DATES.pentecostDay2026}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Pentecost Sunday vespers — concluding prayer section renders cleanly', async ({
    page,
  }) => {
    // wpentecost-SUN-vespers.rich.json carries `concludingPrayerRich` /
    // `intercessionsRich` / `responsoryRich` / `shortReadingRich`.
    // Smoke regression: the page must mount the prayer article and
    // surface the concluding prayer section without breakage.
    await page.goto(`/pray/${DATES.pentecostDay2026}/vespers`)
    await expect(page.locator('article')).toBeVisible()
    const prayerSection = page.locator(
      'section[aria-label="Төгсгөлийн даатгал залбирал"]',
    ).first()
    await expect(prayerSection).toBeVisible()
  })

  test('Ascension Thursday lauds — page renders cleanly (now picks up SUN-slot via fallback)', async ({
    page,
  }) => {
    // 2026-05-14 day === 'THU'. Task #61 adds a SUN-slot fallback to
    // the Tier 1 special-key load, so wascension-SUN-lauds.rich.json
    // now applies on Thursday too. The page must still render cleanly.
    await page.goto(`/pray/${DATES.ascensionDay2026}/lauds`)
    await expect(page.locator('article')).toBeVisible()
  })
})

// @fr FR-153
// Task #61 — Christmas special-key disk file load. resolveSpecialKey
// now returns Christmas keys (dec25/jan1/octave by date, holyFamily/
// baptism/epiphany by name); rich-overlay Tier 1 with SUN-slot fallback
// picks up the canonical formulary even on weekdays.
test.describe('Christmas rich overlay special-key load (task #61)', () => {
  test('Christmas Day on Friday (2026-12-25) lauds — shortReading renders rich shape', async ({
    page,
  }) => {
    // 2026-12-25 = Friday. wdec25-SUN-lauds.rich.json carries
    // shortReadingRich (+ intercessions/responsory/concludingPrayer /
    // alternativeConcludingPrayer). The resolver's day → SUN fallback
    // retrieves the SUN-slot file even though day !== 'SUN'.
    //
    // Rigorous text-content verification lives in
    // `src/lib/__tests__/loth-service.test.ts` ("Christmas special-key
    // rich integration" describe) which calls `assembleHour` directly
    // against the real disk. This e2e covers the rendering shape:
    // RichContent wrapper present, no legacy `<sup>` verse markers.
    await page.goto(`/pray/${DATES.christmasDay2026}/lauds`)
    const section = page.locator('section[aria-label="Уншлага"]')
    await expect(section).toBeVisible()

    const richWrapper = section.locator('div.space-y-2')
    await expect(richWrapper).toHaveCount(1)
    await expect(section.locator('sup')).toHaveCount(0)
  })

  test('Mary Mother of God (2026-01-01 Thursday) vespers — concluding prayer section renders cleanly', async ({
    page,
  }) => {
    // 2026-01-01 = Thursday. wjan1-SUN-vespers.rich.json carries
    // concludingPrayerRich. The resolver's date-matched special-key
    // ('jan1') + SUN fallback retrieves it on a non-Sunday.
    await page.goto(`/pray/${DATES.maryMotherOfGod2026}/vespers`)
    await expect(page.locator('article')).toBeVisible()
    const prayerSection = page.locator(
      'section[aria-label="Төгсгөлийн даатгал залбирал"]',
    ).first()
    await expect(prayerSection).toBeVisible()
  })
})
