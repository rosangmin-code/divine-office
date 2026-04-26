import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160
test.describe('Refrain denylist false-positive cleanup (FR-160-A1)', () => {
  // 2026-04-26 = Easter Week 4 SUN. Lauds psalmody[2] = Psalm 150:1-6.
  // Pre-FR-160: detectRefrainLines threshold=3 over-fired on the
  // 6-rep verse-ending 'Түүнийг магтагтун!', tagging it role=refrain
  // → red text in the UI. PDF p449-450 actual rendering is plain
  // black body text (verse-ending phrase, NOT a rubric refrain).
  // After the denylist gate, the entire Psalm 150 stanza body must
  // contain 0 lines tagged psalm-stanza-refrain.
  test.beforeEach(async ({ page }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
  })

  // @fr FR-160
  test('Psalm 150:1-6 stanza has 0 role=refrain lines', async ({ page }) => {
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    await expect(ps150).toBeVisible()
    // Stanzas render (rich path) — confirm body is present.
    const stanzas = ps150.locator('[data-role="psalm-stanza"]')
    expect(await stanzas.count()).toBeGreaterThanOrEqual(1)
    // No line within the Psalm 150 block is tagged refrain.
    const refrains = ps150.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBe(0)
  })

  // @fr FR-160
  test('Psalm 150:1-6 stanza body has no rubric red span', async ({ page }) => {
    // AC-1 outcome: no .text-red-700 inside the stanza body. We
    // exclude the psalm header (which legitimately uses red for
    // 'Дуулал' label + reference) by scoping to data-role="psalm-stanza".
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    const redInsideStanza = ps150.locator(
      '[data-role="psalm-stanza"] .text-red-700, [data-role="psalm-stanza"] .text-red-400',
    )
    expect(await redInsideStanza.count()).toBe(0)
  })

  // @fr FR-160
  // AC-2: authentic refrains on other refs must remain intact. Daniel 3
  // canticle on OT Wk1 SUN Lauds is the canonical regression date used
  // by FR-153f tests; we re-assert it here so a denylist mistake that
  // accidentally swallows non-Psalm150 refs would surface.
  test('Daniel 3 canticle refrains preserved on OT Wk1 SUN Lauds (regression guard)', async ({ page }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const refrains = page.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBeGreaterThanOrEqual(3)
  })
})
