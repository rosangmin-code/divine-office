import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../../..')
const globals = readFileSync(resolve(ROOT, 'src/app/globals.css'), 'utf8')
const layout = readFileSync(resolve(ROOT, 'src/app/layout.tsx'), 'utf8')
const prayerPage = readFileSync(
  resolve(ROOT, 'src/app/pray/[date]/[hour]/page.tsx'),
  'utf8',
)

function sourceRule(pattern: RegExp, label: string): string {
  const match = globals.match(pattern)
  if (!match) throw new Error(`Missing ${label} rule in globals.css`)
  return match[0]
}

const defaultRule = sourceRule(
  /body\s*\{[^}]*--reading-font:[^}]*\}/,
  'default reading-font',
)
const serifRule = sourceRule(
  /html\[data-font-family="serif"\]\s+body\s*\{[^}]*\}/,
  'serif reading-font',
)
const readingRule = sourceRule(
  /\.font-reading\s*\{[^}]*\}/,
  'font-reading',
)
const bodyClasses = layout.match(/<body className=\{`\$\{notoSans\.variable\} \$\{notoSerif\.variable\} ([^`]*)`\}/)?.[1] ?? ''
const titleClasses = prayerPage.match(/<h1 className="([^"]*)"/)?.[1] ?? ''

describe('app-wide font-family setting', () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>>

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    await browser.close()
  })

  it('loads the configured headline weight and removes obsolete family sources', () => {
    expect(layout).toMatch(/const notoSerif = Noto_Serif\(\{[\s\S]*?weight: \['400', '600', '700'\]/)
    expect(globals).not.toContain('--font-family-sans')
    expect(globals).not.toContain('--font-family-serif')
  })

  it.each([
    ['default', '', '"Test Sans", sans-serif'],
    ['serif', 'serif', '"Test Serif", serif'],
  ])('uses one family for the whole prayer screen in %s mode', async (_, setting, expected) => {
    const page = await browser.newPage()
    await page.setContent(`
      <style>
        .font-sans { font-family: var(--font-sans), sans-serif; }
        .font-serif { font-family: var(--font-serif), serif; }
        ${defaultRule}
        ${serifRule}
        ${readingRule}
      </style>
      <main>
        <p id="antiphon">Antiphon label</p>
        <h1 id="prayer-title" class="${titleClasses}">Prayer title</h1>
        <p id="reading" class="font-reading">Prayer body</p>
      </main>
    `)
    await page.locator('html').evaluate((element, fontFamily) => {
      if (fontFamily) element.setAttribute('data-font-family', fontFamily)
    }, setting)
    await page.locator('body').evaluate<void, string, HTMLElement>((element, classes) => {
      element.className = classes
      element.style.setProperty('--font-sans', '"Test Sans"')
      element.style.setProperty('--font-serif', '"Test Serif"')
    }, bodyClasses)

    const families = await page.locator('#antiphon, #prayer-title, #reading').evaluateAll(
      (elements) => elements.map((element) => getComputedStyle(element).fontFamily),
    )

    expect(families).toEqual([expected, expected, expected])
    await page.close()
  })
})
