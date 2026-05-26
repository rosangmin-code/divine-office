import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160-B
// GOAL #27 (#27-sub-1) — 01-01 천주의성모 (Mary, Mother of God) Second
// Vespers (EP-II / vespers2) render restoration.
//
// Before the fix, `/pray/<Jan1>/vespers` showed the EP-I (First Vespers)
// Magnificat antiphon ("Бидний төлөө гэсэн агуу хайраар…") over the
// running-weekday psalmody (2026-01-01 Thu → Ps 30/32). The proper EP-II
// Magnificat antiphon ("Аяа Христ минь…", salvaged WI-25 audit §10 from
// full_pdf.txt L21046-21048, p.609) never appeared.
//
// The new `vespers2` block routes the EP-II Magnificat antiphon via the
// fixed-date Solemnity vespers2 swap and borrows Week-1 Sunday Vespers
// psalmody (Octave-of-Christmas norm) via an FR-160-B psalmody-substitute.
test.describe('01-01 Mary Mother of God — Second Vespers EP-II (GOAL #27)', () => {
  test('vespers Magnificat shows the EP-II antiphon, not the EP-I antiphon', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.maryMotherOfGod2026}/vespers`)
    const magnificat = page.locator('section[aria-label="Мариагийн магтаал"]')
    await expect(magnificat).toBeVisible()
    // EP-II Magnificat antiphon (salvaged) — Mongolian phrase accuracy.
    await expect(magnificat).toContainText(
      'Аяа Христ минь, дэлхий ертөнцийн Аврагч ба Эзэн минь',
    )
    // The EP-I (First Vespers) antiphon must NOT be the Second Vespers
    // Magnificat antiphon (the pre-fix bug).
    await expect(magnificat).not.toContainText('Бидний төлөө гэсэн агуу хайраар')
  })

  test('vespers psalmody is the borrowed Week-1 Sunday body (Octave norm)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.maryMotherOfGod2026}/vespers`)
    const psalmody = page.locator('section[data-role="psalmody-section"]')
    await expect(psalmody).toBeVisible()

    // Week-1 Sunday Vespers psalms (Ps 110 / Ps 114 / Rev 19) — NOT the
    // running weekday psalter. Ps 110 block renders with inlined body.
    const ps110 = psalmody.locator('section[aria-label="Psalm 110:1-5, 7"]')
    await expect(ps110).toBeVisible()
    await expect(ps110.locator('[data-role="psalm-stanza"]').first()).toBeVisible()

    // The borrowing is surfaced as a small directive note below the body.
    await expect(
      psalmody.locator('[data-role="conditional-rubric-directive"]'),
    ).toContainText('1 дүгээр долоо хоногийн Ням гараг')
  })

  test('vespers EP-II differs from firstVespers EP-I Magnificat antiphon', async ({
    page,
  }) => {
    // First Vespers (EP-I) renders its own antiphon on the same day.
    await page.goto(`/pray/${DATES.maryMotherOfGod2026}/firstVespers`)
    const ep1Magnificat = page.locator('section[aria-label="Мариагийн магтаал"]')
    await expect(ep1Magnificat).toBeVisible()
    await expect(ep1Magnificat).toContainText('Бидний төлөө гэсэн агуу хайраар')
    await expect(ep1Magnificat).not.toContainText(
      'Аяа Христ минь, дэлхий ертөнцийн Аврагч ба Эзэн минь',
    )
  })
})
