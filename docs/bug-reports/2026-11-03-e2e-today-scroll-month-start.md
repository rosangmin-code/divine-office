# 월초에 실패한 오늘 이동 E2E 테스트

2026-11-02 개정 시편집 배포 커밋 `5c791cf`의 [CI 실행](https://github.com/rosangmin-code/divine-office/actions/runs/41563643584)에서 `home-first-screen.spec.ts`의 `footer «Өнөөдөр» on today’s month scrolls back to today`가 데스크톱·모바일 양쪽에서 실패했다.

실패 지점은 버튼을 누르기 전 테스트 준비 단계다.

```text
await page.evaluate(() => window.scrollTo(0, 0))
await expect(page.locator(TODAY_ROW)).not.toBeInViewport()
Expected: not in viewport
Received: in viewport
data-date="2026-11-03"
```

테스트는 페이지 맨 위로 이동하면 오늘 행이 화면 밖으로 나간다고 가정했다. 11월 3일은 월초라 오늘 행이 처음부터 상단 화면에 있다. 운영 화면에서도 1280×720에서 맨 위로 스크롤한 오늘 행의 y=318.25, 높이=233.25로 확인했다. 해당 CI에서 다른 테스트는 이 실패와 별개로 진행됐으며, 성무일도 본문·PDF에 대한 운영 직접 검증도 통과했다.

테스트를 오늘 행에서 더 먼 문서 끝으로 스크롤하도록 수정했다. 오늘 행이 화면 밖이라는 사전 조건과, 하단 오늘 버튼을 누른 뒤 화면 안으로 돌아온다는 기존 검증은 유지한다. 날짜나 화면 높이에 따라 테스트를 생략하지 않는다.

검증: `npx playwright test e2e/home-first-screen.spec.ts --grep 'scrolls back to today'` — chromium와 mobile-chrome 모두 통과(2 passed). 운영 화면에서도 문서 끝으로 이동한 뒤 오늘 버튼으로 돌아오는 동작을 확인했다.
