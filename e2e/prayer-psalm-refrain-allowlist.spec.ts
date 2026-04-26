import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160
test.describe('Refrain allowlist false-negative cleanup (FR-160-A4)', () => {
  // FR-160-A4 forces auto-refrain detection on lines that fail the
  // threshold=3 over-cautious gate but are PDF/GILH-confirmed authentic
  // refrains. The 6 task #120 entries cover 2-rep antiphonal Q&A,
  // self-address, peoples-praise, and inclusio patterns.

  // @fr FR-160
  test('Psalm 24:1-10 forced lines tagged role=refrain (psalterWeek 1 TUE Lauds)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW1Tuesday}/lauds`)
    const ps24 = page.locator('section[aria-label="Psalm 24:1-10"]')
    await expect(ps24).toBeVisible()
    // 3 forced_lines × 2 stanza occurrences (vv 7-10 antiphonal Q&A
    // repeats once) = 6 refrain-tagged lines.
    const refrains = ps24.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBeGreaterThanOrEqual(6)
  })

  // @fr FR-160
  test('Psalm 24:1-10 refrain lines carry rubric red colour', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW1Tuesday}/lauds`)
    const ps24 = page.locator('section[aria-label="Psalm 24:1-10"]')
    const first = ps24.locator('[data-role="psalm-stanza-refrain"]').first()
    await expect(first).toHaveClass(/text-red-700/)
  })

  // @fr FR-160
  test('Psalm 67:2-8 forced lines tagged role=refrain (psalterWeek 3 TUE Lauds)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW3Tuesday}/lauds`)
    const ps67 = page.locator('section[aria-label="Psalm 67:2-8"]')
    await expect(ps67).toBeVisible()
    // 2 forced_lines × 2 stanzas = 4 refrain-tagged lines (vv 3+5).
    const refrains = ps67.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBeGreaterThanOrEqual(4)
  })

  // @fr FR-160
  // Regression guard — denylist (Psalm 150:1-6 / 29:1-10 from FR-160-A1)
  // and authentic threshold-detected refrains (Daniel 3 from FR-153f)
  // must remain unaffected by the allowlist mechanism.
  test('Psalm 150:1-6 still has 0 refrain lines (denylist precedence)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    const refrains = ps150.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBe(0)
  })

  // @fr FR-160
  // Scope: limit count to the Daniel 3 canticle block specifically so a
  // regression that breaks Daniel 3 cannot be masked by other psalms on
  // the same Lauds page contributing refrains. The catalog key includes
  // a comma ("Daniel 3:57-88, 56"), so we partial-match the aria-label.
  test('Daniel 3 canticle threshold refrains still detected (additive merge)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const dan3 = page.locator('section[aria-label^="Daniel 3:"]')
    await expect(dan3.first()).toBeVisible()
    const refrains = dan3.locator('[data-role="psalm-stanza-refrain"]')
    // Daniel 3:57-88 has many refrain repetitions; require ≥10 to make
    // the assertion meaningful (was 3, threshold-fire baseline = 44).
    expect(await refrains.count()).toBeGreaterThanOrEqual(10)
  })
})
