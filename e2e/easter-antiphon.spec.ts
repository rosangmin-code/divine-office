import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

/**
 * @fr FR-155
 *
 * During Easter season, every psalm / gospel-canticle antiphon must
 * terminate with "Alleluia" per GILH §113 (§272 in the Mongolian LOTH).
 * The 4-week psalter antiphons are authored for Ordinary Time weekdays;
 * when reused in Easter they must be augmented. See
 * src/lib/hours/seasonal-antiphon.ts.
 */
test.describe('Easter season psalm / canticle antiphons (FR-155)', () => {
  test('Easter weekday Lauds psalm antiphons all carry Аллэлуяа', async ({ request }) => {
    const res = await request.get(`/api/loth/${DATES.easterWeekday}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('EASTER')

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    expect(psalmody).toBeTruthy()
    const psalms = psalmody.psalms as Array<{ antiphon?: string; reference?: string }>
    expect(psalms.length).toBeGreaterThan(0)
    for (const p of psalms) {
      expect(
        p.antiphon,
        `psalm ${p.reference} antiphon must end with Alleluia on ${DATES.easterWeekday}`,
      ).toMatch(/[Аа]ллэлуяа[,.!?]*\s*$/)
    }

    const gospelCant = body.sections.find((s: { type: string }) => s.type === 'gospelCanticle')
    expect(gospelCant).toBeTruthy()
    expect(gospelCant.antiphon).toMatch(/[Аа]ллэлуяа[,.!?]*\s*$/)
  })

  test('Ordinary Time weekday Lauds antiphons do NOT get Alleluia appended', async ({
    request,
  }) => {
    const res = await request.get(`/api/loth/${DATES.ordinaryWeekday}/lauds`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.liturgicalDay?.season).toBe('ORDINARY_TIME')

    const psalmody = body.sections.find((s: { type: string }) => s.type === 'psalmody')
    const psalms = psalmody.psalms as Array<{ antiphon?: string; reference?: string }>
    // At least one weekday antiphon lacks "Аллэлуяа" — confirms no mistaken
    // append outside Easter. (Some sanctoral antiphons may include it
    // naturally, so we assert presence of ≥1 non-Alleluia antiphon.)
    const nonAlleluia = psalms.filter(
      (p) => p.antiphon && !/[Аа]ллэлуяа[,.!?]*\s*$/.test(p.antiphon),
    )
    expect(nonAlleluia.length).toBeGreaterThan(0)
  })
})
