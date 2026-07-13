import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'

const RECENT_MONDAY = '2026-07-13'

type FontSetting = {
  value: 'sans' | 'serif'
  radioName: 'Орчин үеийн' | 'Сонгодог'
  expectedFamily: 'Noto Sans' | 'Noto Serif'
}

type PageProbe = {
  name: string
  url: string
  elements: (page: Page) => Record<string, Locator>
}

const FONT_SETTINGS: FontSetting[] = [
  { value: 'sans', radioName: 'Орчин үеийн', expectedFamily: 'Noto Sans' },
  { value: 'serif', radioName: 'Сонгодог', expectedFamily: 'Noto Serif' },
]

const PAGE_PROBES: PageProbe[] = [
  {
    name: 'lauds',
    url: `/pray/${RECENT_MONDAY}/lauds`,
    elements: page => ({
      title: page.locator('h1'),
      antiphon: page.locator('[data-role="antiphon"]').first(),
      body: page.locator('[aria-label="Магтуу"] .font-reading').first(),
      sectionLabel: page.locator('[aria-label="Магтуу"] > p').first(),
    }),
  },
  {
    name: 'guide',
    url: '/guide',
    elements: page => ({
      title: page.locator('h1'),
      body: page.locator('#foreword p.font-reading').first(),
      sectionLabel: page.locator('#foreword h2'),
    }),
  },
  {
    name: 'ordinarium',
    url: '/ordinarium',
    elements: page => ({
      title: page.locator('h1'),
      body: page.locator('#morning .font-reading').first(),
      sectionLabel: page.locator('#morning h2'),
    }),
  },
  {
    name: 'settings',
    url: '/settings',
    elements: page => ({
      title: page.locator('h1'),
      previewLabel: page.getByTestId('font-preview').locator('p').first(),
      previewBody: page.getByTestId('font-preview').locator('p').nth(1),
      sectionLabel: page.locator('#font-family-heading'),
    }),
  },
]

async function computedFamily(locator: Locator): Promise<string> {
  await expect(locator).toBeVisible()
  return locator.evaluate(element => getComputedStyle(element).fontFamily)
}

async function selectFont(page: Page, setting: FontSetting) {
  await page.goto('/settings')
  const picker = page.getByRole('radiogroup', { name: 'Үсгийн хэлбэр' })
  await picker.getByRole('radio', { name: setting.radioName, exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font-family', setting.value)
}

async function captureLauds(page: Page, testInfo: TestInfo, setting: FontSetting) {
  const path = testInfo.outputPath(`lauds-${setting.value}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(`lauds-${setting.value}`, { path, contentType: 'image/png' })
}

test.describe('App-wide font family contract', () => {
  // @fr FR-026
  test('all representative text follows the selected family while picker samples stay fixed', async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => consoleErrors.push(error.message))

    for (const setting of FONT_SETTINGS) {
      await selectFont(page, setting)

      for (const probe of PAGE_PROBES) {
        await page.goto(probe.url)
        await expect(page.locator('html')).toHaveAttribute('data-font-family', setting.value)
        await page.evaluate(() => document.fonts.ready.then(() => undefined))

        const families = Object.fromEntries(
          await Promise.all(
            Object.entries(probe.elements(page)).map(async ([role, locator]) => [
              role,
              await computedFamily(locator),
            ]),
          ),
        )

        expect(
          new Set(Object.values(families)).size,
          `${probe.name}/${setting.value}: ${JSON.stringify(families)}`,
        ).toBe(1)
        for (const family of Object.values(families)) {
          expect(family).toContain(setting.expectedFamily)
        }

        console.log(JSON.stringify({ page: probe.name, setting: setting.value, families }))

        if (probe.name === 'lauds') await captureLauds(page, testInfo, setting)
      }

      await page.goto('/settings')
      const picker = page.getByRole('radiogroup', { name: 'Үсгийн хэлбэр' })
      const pickerFamilies = {
        modern: await computedFamily(picker.getByRole('radio', { name: 'Орчин үеийн', exact: true })),
        classic: await computedFamily(picker.getByRole('radio', { name: 'Сонгодог', exact: true })),
        preview: await computedFamily(page.getByTestId('font-preview')),
      }

      expect(pickerFamilies.modern).toContain('Noto Sans')
      expect(pickerFamilies.classic).toContain('Noto Serif')
      expect(pickerFamilies.preview).toContain(setting.expectedFamily)
      console.log(JSON.stringify({ page: 'settings-picker', setting: setting.value, families: pickerFamilies }))
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
