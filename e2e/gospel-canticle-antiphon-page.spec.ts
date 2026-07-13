import { test, expect } from '@playwright/test'

const WEEK_3_MONDAY = '2026-06-15'
const CORRECTED_ANTIPHON = 'Бидний Тэнгэрбурхан Эзэн ерөөлтэй еэ!'

test.describe('Week 3 Monday Lauds gospel canticle antiphon', () => {
  // @fr FR-017g
  test('shows the corrected Шад магтаал text with its verified page reference', async ({ page }, testInfo) => {
    const browserErrors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') browserErrors.push(message.text())
    })
    page.on('pageerror', error => browserErrors.push(error.message))

    await page.goto('/settings')
    const pageRefSwitch = page.getByRole('switch', { name: /Хуудасны лавлагаа/ })
    await expect(pageRefSwitch).toHaveAttribute('aria-checked', 'false')
    await pageRefSwitch.click()
    await expect(pageRefSwitch).toHaveAttribute('aria-checked', 'true')

    await page.goto(`/pray/${WEEK_3_MONDAY}/lauds`)
    await expect(page.getByText('Дуулалтын III', { exact: false })).toBeVisible()

    const canticle = page.locator('section[aria-label="Захариагийн магтаал"]')
    await expect(canticle).toBeVisible()

    // Mongolian-accuracy axis: intentionally bind to the corrected PDF text.
    const correctedRows = canticle.getByText(CORRECTED_ANTIPHON, { exact: false })
    await expect(correctedRows).toHaveCount(2)

    // Structure axis: both the opening and repeated closing antiphon rows
    // carry the verified page link emitted by PageRef.
    const pageRefs = canticle.locator(
      '[data-role="antiphon"] [data-role="page-ref-link"]',
    )
    await expect(pageRefs).toHaveCount(2)
    for (const pageRef of await pageRefs.all()) {
      await expect(pageRef).toHaveText('(х. 320)')
      await expect(pageRef).toHaveAttribute('href', '/pdf/320')
    }

    const firstRow = canticle.locator('[data-role="antiphon"]').first()
    await expect(firstRow).toContainText(`Шад магтаал: ${CORRECTED_ANTIPHON}`)

    await expect(canticle.locator('xpath=..')).toHaveCSS('opacity', '1')
    await firstRow.scrollIntoViewIfNeeded()
    const screenshotPath = testInfo.outputPath('w3-mon-lauds-gospel-canticle.png')
    await firstRow.screenshot({ path: screenshotPath })
    await testInfo.attach('w3-mon-lauds-gospel-canticle', {
      path: screenshotPath,
      contentType: 'image/png',
    })

    console.log(JSON.stringify({
      date: WEEK_3_MONDAY,
      psalterWeek: 'III',
      antiphonRow: await firstRow.innerText(),
      pageRefText: await pageRefs.first().innerText(),
      pageRefHref: await pageRefs.first().getAttribute('href'),
      screenshotPath,
      browserErrors,
    }))
    expect(browserErrors, browserErrors.join('\n')).toEqual([])
  })
})
