import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  workers: 2,
  // CI 에서 test.only 가 남아 있으면 실패 (리뷰 §3.5 발견 6)
  forbidOnly: isCI,
  // CI: list(로그) + html(아티팩트, 자동 열기 금지). 로컬: list.
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'on-first-retry',
  },
  webServer: {
    // CI 는 quality job 이 만든 .next 를 next start 로 서빙 (프로덕션과 동일 경로).
    // 로컬은 기존대로 dev 서버 재사용.
    command: isCI ? 'npm run start -- --port 3200' : 'npm run dev -- --port 3200',
    port: 3200,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
})
