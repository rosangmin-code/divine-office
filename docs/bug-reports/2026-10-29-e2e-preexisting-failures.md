# 전체 e2e — 이미 있던 실패 5건 (FR-186~188 작업 중 발견)

- **발견**: 2026-10-29, FR-186~188(홈 아래 메뉴 고정·오늘로 가기·날짜 줄 금색) 검증으로 전체 e2e 를 돌리다가
- **상태**: 수정 2026-10-29 (사용자 지시 "실패도 고쳐") — §4
- **영향**: 앱 결함이 아니라 테스트 쪽이다. 2건은 데이터를 바꾼 뒤 갱신하지 않은 기대값, 3건은 실행마다 결과가 갈리는 불안정 테스트다. CI 코어 e2e(`test:e2e:core`)에는 들어 있지 않다. 매일 도는 전체 e2e(`e2e-nightly.yml`)는 `continue-on-error: true` 라서 실패해도 '성공'으로 표시된다. 그래서 지금까지 드러나지 않았다

---

## 1. 격리 — 작업 전 코드(HEAD `edacd36`)에서도 실패

작업 중인 변경을 `git stash push -u` 로 치우고 같은 5개를 돌린 뒤 되돌렸다(`git stash pop`).

```
$ npx playwright test e2e/guide.spec.ts:111 e2e/ordinarium.spec.ts:62 e2e/feast-selection.spec.ts:30 \
    e2e/mary-mother-of-god-vespers2.spec.ts:18 e2e/prayer-psalter-headers.spec.ts:55 --reporter=list   # HEAD edacd36
  ✓   1 [chromium] › e2e/feast-selection.spec.ts:30:7 › … selecting saturday-mary updates the URL and propagates to hour card links
  ✘   2 [chromium] › e2e/guide.spec.ts:111:7 › Guide page (GILH) › homepage has link to guide page
  ✘   3 [chromium] › e2e/mary-mother-of-god-vespers2.spec.ts:18:7 › … vespers Magnificat shows the EP-II antiphon, not the EP-I antiphon
  ✘   5 [chromium] › e2e/prayer-psalter-headers.spec.ts:55:7 › … Daniel 3 canticle has no psalm-header-rich element (catalog gap)
  ✘   4 [chromium] › e2e/ordinarium.spec.ts:62:7 › … homepage has ordinarium link that navigates to /ordinarium
  ✘   6 [mobile-chrome] › e2e/feast-selection.spec.ts:30:7 › … selecting saturday-mary …
  ✘   7 [mobile-chrome] › e2e/guide.spec.ts:111:7 › … homepage has link to guide page
  ✓   9 [mobile-chrome] › e2e/ordinarium.spec.ts:62:7 › … homepage has ordinarium link …
  ✘  10 [mobile-chrome] › e2e/prayer-psalter-headers.spec.ts:55:7 › … Daniel 3 canticle …
  ✘   8 [mobile-chrome] › e2e/mary-mother-of-god-vespers2.spec.ts:18:7 › … vespers Magnificat …
```

작업 후 코드로 전체 e2e 를 돌렸을 때도 같은 5개가 실패했다(10건, `--last-failed` 재실행에서는 guide mobile 이 통과).

## 2. 기대값이 낡은 것 2건 (항상 실패)

- `mary-mother-of-god-vespers2.spec.ts:25`
  - 기대값은 `Аяа Христ минь, дэлхий ертөнцийн Аврагч ба Эзэн минь`(쉼표 없음)이다.
  - 데이터는 `5a33955`(2026-10-24, 호격 쉼표 통일, STC-019)부터 `Аяа, Христ минь, …` 다.
  - 앱이 맞고, 테스트 기대값만 갱신하면 된다.
- `prayer-psalter-headers.spec.ts:61`
  - 다니엘 3장 찬가에 머리말 요소가 0개여야 한다고 본다. 주석은 "추출기 범위가 «Дуулал N» 뿐"이라는 옛 전제다.
  - 2026-10-27 머리말 전수 대조(`30558f6`)로 책에 있는 머리말이 들어가 지금은 1개다.

  ```
  Expected: 0
  Received: 1
    > 61 |     expect(await header.count()).toBe(0)
  ```

  - 책 인쇄면에서 이 머리말을 확인한 뒤 기대값을 바꾸면 된다.

## 3. 불안정 3건 (실행마다 갈림)

`guide.spec.ts:111`, `ordinarium.spec.ts:62` 은 홈 맨 아래 링크를 누르고 주소를 본다. `feast-selection.spec.ts:30` 은 펼친 줄의 축일 선택을 누른다. 실패할 때는 주소가 `/` 에 남아 있거나(`toHaveURL`), 선택이 바뀌지 않는다(`aria-checked` `false`). 같은 테스트를 따로 재현하면 통과한다.

```
$ node design/click-debug.mjs     # 같은 순서 수동 재현 (Pixel 7)
url http://localhost:3200/ordinarium
[["scroll",432,2018],["click",478,"A","Залбиралт цагийн ёслолын дэг жаяг",2149,685],["scroll",732,0]]
```

세 테스트 모두 `page.goto` 직후 클릭한다. 하이드레이션 뒤 오늘 줄로 가는 자동 스크롤(`liturgical-calendar-list.tsx`)과 클릭 시점이 겹치면 클릭이 엉뚱한 곳에 떨어지거나 React 가 받기 전에 지나가는 것으로 보인다(추정). 2026-10-25 D10 리포트(`2026-10-25-e2e-d10-scroll-tap-flaky.md`)와 같은 종류다. 권장 조치는 자동 스크롤이 끝났다는 신호를 기다린 뒤 누르는 것이다. 예를 들어 `e2e/home-first-screen.spec.ts` FR-187 처럼 오늘 줄이 뷰포트에 들어온 것을 먼저 확인한다.

## 4. 수정

**원인 확인 (§3).** 클릭 시각, 하이드레이션 시각(목록 DOM 에 React fiber 가 붙은 때), 스크롤을 기록하며 같은 순서를 8번씩 돌렸다(`design/flaky-probe.mjs`, ms 는 페이지 로드 기준).

```
feast desktop: 7/8 failed
  FAIL {"ok":false,"hydratedAt":378,"clicks":[[375,"DIV","Залбирлын сонголтЖирийн "]],"scrolls":[[337,2116],[376,2065]]}
  pass {"ok":true,"hydratedAt":325,"clicks":[[337,"BUTTON","saturday-mary"]],"scrolls":[[326,2116],[359,2065]]}
feast mobile: 8/8 failed
ordinarium desktop: 6/8 failed
  FAIL {"ok":false,"hydratedAt":357,"clicks":[[354,"DIV","ОгнооӨмнөх сар2026 оны 1"]],"scrolls":[[312,2208],[355,2028]]}
  pass {"ok":true,"hydratedAt":337,"clicks":[[323,"A","Залбиралт цагийн ёслолын"]],"scrolls":[[316,2208],[336,2028],[660,0]]}
ordinarium mobile: 6/8 failed
```

Playwright 가 대상을 화면에 굴려 넣고(첫 scroll) 누르는 바로 그 순간, 하이드레이션 직후 목록의 한 번뿐인 자동 스크롤(두 번째 scroll)이 화면을 옮긴다. 그래서 클릭이 대상이 아닌 `DIV` 에 떨어진다. 추정이 아니라 실측이다. 사람이 로드 0.35초 안에 누를 일은 드물어 테스트 쪽 경쟁이다.

**조치.**

- `src/components/liturgical-calendar-list.tsx`: 첫 스크롤을 마친 뒤(스크롤할 줄이 없어도) 목록에 `data-ready="true"` 를 단다. DOM 에 직접 달아 다시 그리지 않는다. D10 의 `data-tap-armed` 와 같은 방식이다.
- `e2e/fixtures/home.ts`(신규): `waitForHomeReady(page)`.
- `guide.spec.ts:111`, `ordinarium.spec.ts:62`, `feast-selection.spec.ts:30`: `page.goto` 직후 이것을 기다린다.
- §2 의 2건은 기대값을 고쳤다.
  - `mary-mother-of-god-vespers2.spec.ts`: `Аяа, Христ минь…` (STC-019 장부에 `01-01.vespers2` Magnificat antiphon p.608 이 들어 있음).
  - `prayer-psalter-headers.spec.ts`: '머리말 없음' 확인을 책에 머리말이 없는 주일 저녁 찬가 묵시록 19:1-7(`header-book.json` pp.71·189 `header: null`)로 옮겼다. 다니엘 3:52-57 은 책의 머리말(«Тэнгэрбурхан бол үүрд магтагдах Бүтээгч мөн (Ром 1:25)», p.409)이 나오는지 확인하는 테스트로 바꿨다.

**결과.**

```
$ npx playwright test e2e/guide.spec.ts e2e/ordinarium.spec.ts e2e/feast-selection.spec.ts \
    e2e/mary-mother-of-god-vespers2.spec.ts e2e/prayer-psalter-headers.spec.ts --repeat-each=3
  12 skipped
  252 passed (1.3m)

$ npx playwright test          # 전체
  35 skipped
  1087 passed (4.7m)
```
