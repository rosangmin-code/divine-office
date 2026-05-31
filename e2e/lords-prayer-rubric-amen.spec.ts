import { test, expect, type Page } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * GOAL #115 (Step 4 — #115-sub-4) — **user-facing** RED e2e for:
 *   [D1] No Lord's-Prayer guidance cue after the intercessions — via BOTH
 *        render paths (structured `«…»` cue AND legacy `items[]` incipit bullet).
 *   [D2] The Lord's Prayer ends without a trailing "Амэн."
 *   [D3] Regression — intercession petitions preserved; Lord's-Prayer body intact.
 *
 * Blueprint:
 *   - MM:        docs/design/mental-models/goal115-lords-prayer-rubric-amen-removal.md
 *   - Scenarios: docs/research/GOAL115-scenarios.md (legacy 3-page escalation)
 *   - Spec lock: docs/research/GOAL115-spec.md (§3 affected-surface ledger, §4 outcome gate)
 *
 * ⚠️ RED — authored BEFORE the Step-6 fix. The [D1]/[D2] absence assertions
 * describe the POST-FIX rendered screen, so they MUST FAIL now (the guillemet
 * cue, the legacy incipit bullet, and the trailing Амэн still render). The
 * [D3] checks are GREEN regression guards.
 *
 * Selector-axis discipline (CLAUDE.md): structure via section aria-label
 * (`Гуйлтын залбирал` = intercessions, `Эзэний даатгал залбирал` = Lord's
 * Prayer); Mongolian-text accuracy via the verbatim incipit prefix
 * (`Тэнгэр дэх Эцэг`) and the amen token (`Амэн`, Cyrillic э).
 *
 * The incipit prefix `Тэнгэр дэх Эцэг` ALSO opens the Lord's-Prayer body, so
 * every [D1] assertion is SCOPED to the intercessions section to avoid a
 * false match on the (legitimate) Lord's-Prayer text.
 *
 * Dev server: playwright.config.ts webServer (npm run dev --port 3200).
 */

const INCIPIT_PREFIX = 'Тэнгэр дэх Эцэг'
const AMEN = 'Амэн'
const INTERCESSIONS = 'section[aria-label="Гуйлтын залбирал"]'
const LORDS_PRAYER = 'section[aria-label="Эзэний даатгал залбирал"]'

// Structured-path Sunday Lauds (petitions > 0 + a `«closing»` incipit cue).
// DATES.ordinarySunday = 2026-02-08 → psalterWeek 1 SUN lauds (API-verified:
// petitions=4, closing SET → the structured `«…»` cue renders).
const STRUCTURED = DATES.ordinarySunday

// Legacy `items[]`-path pages (petitions === 0, incipit present as a bullet).
// API-verified (GET /api/loth/<date>/<hour>): each returns an intercessions
// section with petitions=[] and a trailing `Тэнгэр дэх Эцэг…` item — the
// 3 real blocks named in GOAL115-spec §3 (week-3 SUN lauds, week-4 SUN lauds,
// week-4 MON vespers), mapped to clean (non-feast) Ordinary-Time dates:
const LEGACY_PAGES = [
  { date: '2026-06-14', hour: 'lauds', label: 'week-3 SUN lauds (pw3)' },
  { date: '2026-06-21', hour: 'lauds', label: 'week-4 SUN lauds (pw4)' },
  { date: '2026-06-22', hour: 'vespers', label: 'week-4 MON vespers (pw4)' },
] as const

async function gotoHour(page: Page, date: string, hour: string): Promise<void> {
  await page.goto(`/pray/${date}/${hour}`)
  // Readiness: the intercessions section is rendered on every Lauds/Vespers.
  await expect(page.locator(INTERCESSIONS)).toBeVisible()
}

test.describe('FR-169 GOAL #115 — Lord\'s-Prayer rubric + Амэн removal', () => {
  // @fr FR-169
  test('[D1-structured] no «…» Lord\'s-Prayer cue after intercessions (structured path)', async ({
    page,
  }) => {
    await gotoHour(page, STRUCTURED, 'lauds')
    const inter = page.locator(INTERCESSIONS)
    // [D3-a] regression: structured petitions still render.
    expect(await inter.locator('[data-role="intercessions-petition"]').count()).toBeGreaterThan(0)
    // [D1] outcome: no incipit cue inside the intercessions section.
    await expect(inter.getByText(INCIPIT_PREFIX, { exact: false })).toHaveCount(0)
  })

  // @fr FR-169
  for (const { date, hour, label } of LEGACY_PAGES) {
    test(`[D1-legacy] no incipit bullet on ${label} (legacy items[] path)`, async ({ page }) => {
      await gotoHour(page, date, hour)
      const inter = page.locator(INTERCESSIONS)
      // [D3-a] regression: the section still renders its (other) bullets.
      expect(await inter.locator('li').count()).toBeGreaterThan(1)
      // [D1] outcome: the trailing Lord's-Prayer incipit bullet is gone.
      await expect(inter.getByText(INCIPIT_PREFIX, { exact: false })).toHaveCount(0)
    })
  }

  // @fr FR-169
  for (const hour of ['lauds', 'vespers'] as const) {
    test(`[D2] Lord\'s Prayer ends without "Амэн" (${hour})`, async ({ page }) => {
      await gotoHour(page, STRUCTURED, hour)
      const lp = page.locator(LORDS_PRAYER)
      await expect(lp).toBeVisible()
      // [D3-b] regression: the body is otherwise intact (ends 'соёрхоно уу.').
      await expect(lp).toContainText('гэтэлгэн соёрхоно уу')
      await expect(lp).toContainText('Тэнгэр дэх Эцэг минь ээ')
      // [D2] outcome: no trailing Амэн token in the Lord's-Prayer section.
      await expect(lp.getByText(AMEN, { exact: false })).toHaveCount(0)
    })
  }
})
