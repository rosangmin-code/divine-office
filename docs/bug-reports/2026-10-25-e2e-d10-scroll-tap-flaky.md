# e2e D10 «스크롤 직후 탭은 패널을 열지 않는다» — 첫 시도 절반 이상 실패 (불안정 테스트)

- **발견**: 2026-10-25, Next.js 16.3.8 → 16.4.3 업그레이드 검증 중
- **상태**: 수정 완료 2026-10-25 (사용자 지시 "D10 테스트 고쳐") — §5
- **영향**: CI e2e 는 `retries: 2` 라 대개 재시도로 통과하지만, 세 번 연속 실패하면 CI 가 빨개진다. 원인은 테스트 쪽 타이밍이었다(§3) — 사용자 동작 결함 아님

---

## 1. 증상

`e2e/prayer-footer.spec.ts:175` D10 은 휠 스크롤 직후(600ms 이내) 본문을 탭하면 설정 패널이 **열리지 않아야** 한다고 본다. 실패는 전부 그 첫 단언(`:191`, 기대 `data-expanded="false"`, 실제 `"true"`)에서 났다 — 스크롤 직후의 탭이 패널을 열어 버렸다.

## 2. 재현 · 기준선 비교

같은 기계에서 운영용 빌드(`next build` + `next start --port 3200`)를 띄우고, 재시도 없이 다섯 번씩 돌렸다. D10 은 뷰포트 2종 × 프로젝트 2종 = 4개라서 실행당 20회다.

```
$ npx playwright test e2e/prayer-footer.spec.ts --repeat-each=5 --retries=0 --workers=2 --reporter=json
```

| Next.js | D10 실패 | 실패 위치 | 그 밖 |
|---|---|---|---|
| 16.3.8 (업그레이드 전) | 11/20 | 전부 `:191` | D3 1/20 (`:31` 패널이 안 열림) |
| 16.4.3 (업그레이드 후) | 12/20 | 전부 `:191` | 없음 |

```
e2e-footer-old.json        { 'D10 line 191': 11, 'D3  line 31': 1 }   # 16.3.8, stats expected 248 / unexpected 12
16.4.3 run (rtk tee log)   { 'D10 line 191': 12 }                    # 16.4.3, stats expected 248 / unexpected 12
```

CI 설정(`--retries=2 --workers=2`)으로 돌린 코어 스위트에서도 D10 은 업그레이드 전후 모두 "flaky"(재시도로 통과)로 나왔다. 업그레이드 후 실행에서는 D4b 도 한 번 첫 시도에 실패했다. 실패 위치는 `openPanelByBodyTap`(`:31`)이었고 증상은 탭했는데 패널이 안 열린 것으로, 기준선의 D3 실패와 같은 모양이다. 반복 실행 20회에서는 다시 나오지 않았다.

## 3. 원인 — 리스너가 붙기 전에 스크롤했다 (실측 확인)

`src/components/prayer-footer.tsx` 는 `scroll`/`pointerdown` 리스너를 effect 에서 붙이고, 마지막 스크롤 시각(`lastScrollAt`)을 기준으로 `shouldOpenOnBodyTap` 이 600ms(`SCROLL_QUIET_MS`) 안의 탭을 거른다. 테스트는 `page.goto` 직후 바로 휠을 굴린다. `page.goto` 는 load 이벤트에서 돌아오고 하이드레이션·effect 는 그 뒤라서, 리스너가 붙기 전에 스크롤이 끝나면 `lastScrollAt` 이 비어 있고 다음 탭이 '조용할 때의 탭'으로 판정되어 패널이 열린다.

확인: 초기화 스크립트로 `window.addEventListener('scroll', …, {capture:true})` 호출 시각과 실제 scroll·pointerdown 시각을 기록하며 D10 순서를 20회 재현했다(`d10-probe.mjs`, 페이지 로드 기준 ms).

```
{"proj":"chromium","vp":1280,"fail":true, "listenerAt":301,"firstScroll":286,"down":312,"scrollsAfterListener":0}
{"proj":"mobile-chrome","vp":375,"fail":true, "listenerAt":425,"firstScroll":402,"down":449,"scrollsAfterListener":0}
{"proj":"mobile-chrome","vp":375,"fail":false,"listenerAt":352,"firstScroll":357,"down":405,"scrollsAfterListener":1}
…
FAIL 6/20
fail & listener attached before first scroll: 0
pass & listener attached after all scrolls before tap: 0
```

실패 6건은 전부 스크롤이 리스너보다 먼저였고, 통과 14건은 전부 리스너가 먼저였다 — 예외 없이 갈린다. 휠 한 번은 scroll 이벤트 하나로 즉시 끝난다(부드러운 스크롤 아님). D3·D4b 의 한 번씩 실패(탭했는데 안 열림)는 같은 이유로 리스너 전에 클릭한 경우다.

실제 사용자가 페이지가 뜬 뒤 0.3초 안에 스크롤하고 곧바로 탭하면 패널이 열릴 수 있지만, 그러면 핸들·Esc·백드롭으로 닫으면 되므로 제품 쪽은 고치지 않았다.

## 4. 업그레이드 판정에 쓴 근거

§2 표: 옛 버전과 새 버전의 실패율이 같고(11 vs 12 / 20), 실패 위치도 같다. 그래서 Next.js 16.4.3 업그레이드 커밋을 막는 사유로 보지 않았다.

## 5. 수정

- `src/components/prayer-footer.tsx`: 본문 탭 effect 가 리스너를 붙인 직후 루트(`data-role="prayer-footer-root"`)에 `data-tap-armed="true"` 를 달고, cleanup 에서 뗀다. SSR 마크업에는 없다.
- `e2e/prayer-footer.spec.ts`: `waitForTapArmed()` 를 두고 D10(휠 전), D1(탭 전), `openPanelByBodyTap`(D3·D4a·D4b·D4c·D6·D7 이 씀)에서 기다린다.
- `src/components/__tests__/prayer-footer.test.ts`: 표지가 SSR 에 없고, click 리스너 부착 뒤에 붙으며, cleanup 에서 떨어지는지 확인한다. SSR 에 표지가 있으면 e2e 대기가 바로 통과해 버리므로 이 단언이 필요하다.

## 6. 검증

```
# 수정 후, 운영 빌드, 재시도 없이 10회 반복 (520회 실행, D10 40회)
$ npx playwright test e2e/prayer-footer.spec.ts --repeat-each=10 --retries=0 --workers=2 --reporter=json
failures {} D10 runs 40
{ expected: 520, unexpected: 0, flaky: 0 }

# 대기가 시험을 무력화하지 않았는지 — SCROLL_QUIET_MS 를 0 으로 바꿔 빌드하면 D10 이 잡아야 한다
$ npx playwright test e2e/prayer-footer.spec.ts -g D10 --repeat-each=3 --retries=0
12 failed   (전부 첫 단언 — 스크롤 직후 탭이 패널을 엶)   → 원복

# CI 코어 스위트 (CI 설정)
$ npm run test:e2e:core -- --retries=2 --workers=2
278 passed, flaky 0
```

vitest 2203 통과(+1), lint·tsc 0, traceability OK.
