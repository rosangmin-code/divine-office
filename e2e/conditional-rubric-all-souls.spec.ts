import { test, expect } from '@playwright/test'

// GOAL #27 (#27-sub-2 / FR-160-B-7) — All Souls' (11-02) Sunday-collision
// dynamic psalmody resolve.
//
// When 11-02 falls on a Sunday, the All Souls' Lauds + Vespers psalmody
// carry a `substitute` rubric (when dayOfWeek=SUN) that previously surfaced
// ONLY the directive note ("take from the matching Sunday of the Four
// Weeks") with the psalm body HIDDEN. This WI adds a DYNAMIC
// `psalterRef.week:'current'` so the assembler inlines the running 4-week
// cycle's Sunday psalms (the day's own psalterWeek) — the body now renders
// and the directive is kept as a small affordance.
//
// 2025-11-02 and 2031-11-02 are Sundays (calendar fact) → 31st Sunday of
// Ordinary Time → psalterWeek 3 → Psalm 93 (Lauds) / Psalm 110 (Vespers).
// 2026-11-02 is Monday (negative). 2024-11-02 is Saturday — its Vespers is
// the First Vespers of the following Sunday, where the dynamic borrow MUST
// stay suppressed (note-only preserved, zero regression).

interface DirectiveProbe {
  rubricId?: string
  mode?: string
  text?: string
  bodyInlined?: boolean
}
interface PsalmProbe {
  reference?: string
}
interface Section {
  type: string
  psalms?: PsalmProbe[]
  directives?: DirectiveProbe[]
}
function sec(sections: Section[], type: string): Section | undefined {
  return sections.find((s) => s.type === type)
}

test.describe('FR-160-B-7 — All Souls 11-02 Sunday dynamic psalmody (page render)', () => {
  // @fr FR-160-B-7
  test('2025-11-02 Lauds renders the Sunday psalm BODY (not a pointer note)', async ({
    page,
  }) => {
    await page.goto('/pray/2025-11-02/lauds')
    const psalmody = page.locator('[data-role="psalmody-section"]')
    await expect(psalmody.first()).toBeVisible()
    // The user-facing outcome: actual psalm stanzas render (body inlined),
    // NOT just the directive note. Before this WI the section showed zero
    // psalm-stanza elements (directive-only).
    await expect(
      psalmody.locator('[data-role="psalm-stanza"]').first(),
    ).toBeVisible()
    const stanzaCount = await psalmody.locator('[data-role="psalm-stanza"]').count()
    expect(stanzaCount).toBeGreaterThan(0)
    // The directive note is kept as an affordance alongside the body.
    await expect(
      psalmody.locator(
        '[data-role="conditional-rubric-directive"][data-rubric-id="sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute"]',
      ),
    ).toBeVisible()
  })

  // @fr FR-160-B-7
  test('2025-11-02 Vespers renders the Sunday psalm BODY (not a pointer note)', async ({
    page,
  }) => {
    await page.goto('/pray/2025-11-02/vespers')
    const psalmody = page.locator('[data-role="psalmody-section"]')
    await expect(psalmody.first()).toBeVisible()
    await expect(
      psalmody.locator('[data-role="psalm-stanza"]').first(),
    ).toBeVisible()
    const stanzaCount = await psalmody.locator('[data-role="psalm-stanza"]').count()
    expect(stanzaCount).toBeGreaterThan(0)
  })
})

test.describe('FR-160-B-7 — All Souls 11-02 dynamic psalmody (API contract)', () => {
  // @fr FR-160-B-7
  test('2025-11-02 Lauds: substitute is bodyInlined + Week-3 Sunday psalms', async ({
    request,
  }) => {
    const res = await request.get('/api/loth/2025-11-02/lauds')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const psalmody = sec(body.sections, 'psalmody')
    expect(psalmody).toBeTruthy()
    expect(psalmody!.psalms?.[0]?.reference).toBe('Psalm 93:1-5')
    const sub = psalmody!.directives?.find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
    )
    expect(sub, 'lauds substitute present').toBeDefined()
    expect(sub!.bodyInlined, 'lauds substitute is inlined on the actual Sunday').toBe(true)
  })

  // @fr FR-160-B-7
  test('2025-11-02 Vespers: substitute is bodyInlined + Week-3 Sunday psalms', async ({
    request,
  }) => {
    const res = await request.get('/api/loth/2025-11-02/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const psalmody = sec(body.sections, 'psalmody')
    expect(psalmody!.psalms?.[0]?.reference).toBe('Psalm 110:1-5, 7')
    const sub = psalmody!.directives?.find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-vespers-sunday-substitute',
    )
    expect(sub!.bodyInlined).toBe(true)
  })

  // @fr FR-160-B-7 — regression: plain weekday (Monday) never fires the
  // Sunday-gated substitute.
  test('2026-11-02 (Monday) Lauds: no Sunday substitute directive', async ({ request }) => {
    const res = await request.get('/api/loth/2026-11-02/lauds')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const psalmody = sec(body.sections, 'psalmody')
    const leak = (psalmody?.directives ?? []).find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-lauds-sunday-substitute',
    )
    expect(leak, 'Sunday-only rubric must not fire on Monday').toBeUndefined()
  })

  // @fr FR-160-B-7 — regression: Saturday-eve 11-02 Vespers (First Vespers
  // of the following Sunday) matches only via the SUN promotion, so the
  // dynamic borrow stays suppressed → directive surfaces WITHOUT bodyInlined
  // (legacy note-only surface preserved).
  test('2024-11-02 (Saturday eve) Vespers: substitute present but NOT inlined', async ({
    request,
  }) => {
    const res = await request.get('/api/loth/2024-11-02/vespers')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    const psalmody = sec(body.sections, 'psalmody')
    const sub = (psalmody?.directives ?? []).find(
      (d) => d.rubricId === 'sanctoral-memorial-11-02-all-souls-vespers-sunday-substitute',
    )
    expect(sub, 'eve First-Vespers substitute still surfaces').toBeDefined()
    expect(sub!.bodyInlined, 'dynamic borrow suppressed on the eve').toBeUndefined()
  })
})
