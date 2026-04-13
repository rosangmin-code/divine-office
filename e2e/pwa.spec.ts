import { test, expect } from '@playwright/test'

test.describe('PWA installability', () => {
  test('serves a valid web app manifest', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.name).toContain('Цагийн Залбирал')
    expect(manifest.short_name).toBe('Цагийн Залбирал')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('mn')
    expect(manifest.theme_color).toBe('#2d6a4f')
    expect(manifest.background_color).toBe('#fafaf9')
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('manifest icons are reachable', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest')
    const manifest = await manifestResponse.json()

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src)
      expect(iconResponse.status(), `icon ${icon.src}`).toBe(200)
    }
  })

  test('page head links manifest and theme color', async ({ page }) => {
    await page.goto('/')

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .first()
      .getAttribute('href')
    expect(manifestHref).toBeTruthy()
    expect(manifestHref).toContain('manifest.webmanifest')

    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .first()
      .getAttribute('content')
    expect(themeColor).toBe('#2d6a4f')
  })

  test('apple touch icon is served', async ({ page, request }) => {
    await page.goto('/')

    const appleIconHref = await page
      .locator('link[rel="apple-touch-icon"]')
      .first()
      .getAttribute('href')
    expect(appleIconHref).toBeTruthy()

    if (appleIconHref) {
      const response = await request.get(appleIconHref)
      expect(response.status()).toBe(200)
    }
  })

  test('serves the service worker with correct headers', async ({ request }) => {
    const response = await request.get('/sw.js')
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type'] || ''
    expect(contentType).toContain('javascript')

    const cacheControl = response.headers()['cache-control'] || ''
    expect(cacheControl).toContain('no-cache')

    const body = await response.text()
    expect(body).toContain('addEventListener')
    expect(body).toContain('fetch')
  })

  test('serves the offline fallback page', async ({ request }) => {
    const response = await request.get('/offline.html')
    expect(response.status()).toBe(200)

    const body = await response.text()
    expect(body).toContain('Интернэт холболтгүй')
    expect(body).toContain('lang="mn"')
  })

  test('app is configured for apple web app standalone mode', async ({ page }) => {
    await page.goto('/')

    const webAppCapable = await page
      .locator('meta[name="mobile-web-app-capable"]')
      .first()
      .getAttribute('content')
    expect(webAppCapable).toBe('yes')

    const appleTitle = await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .first()
      .getAttribute('content')
    expect(appleTitle).toBe('Цагийн Залбирал')
  })
})
