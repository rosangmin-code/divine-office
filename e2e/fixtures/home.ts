import type { Page } from '@playwright/test'

/**
 * Wait until the home calendar list has hydrated and made its one-time
 * scroll to today / `?date=` (it then carries `data-ready="true"`).
 * A click sent right after `page.goto('/')` used to race that scroll and
 * land on whatever it had just moved under the pointer
 * (docs/bug-reports/2026-10-29-e2e-preexisting-failures.md).
 */
export async function waitForHomeReady(page: Page): Promise<void> {
  await page.locator('[data-testid="liturgical-calendar-list"][data-ready="true"]').waitFor()
}
