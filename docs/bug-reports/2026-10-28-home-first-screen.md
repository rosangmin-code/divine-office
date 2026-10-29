# 홈 첫 화면 — 큰 글씨에서 오늘로 안 내려감 · 아래 메뉴가 안 붙음 · «(Автомат)» 줄 무반응

- **발견**: 2026-10-28, 첫 화면 버튼 디자인 리뷰(3초 룰) 중
- **상태**: 모두 수정. §1 2026-10-28 (사용자 지시 "1, 2번부터 고쳐줘", FR-184 — §4). §2·§3 2026-10-29 (사용자 지시 "앱에서 할 수 있는 거 해", FR-186·FR-187 — §6), 그 작업 중 찾은 §5 도 함께(FR-187)
- **재현 환경**: 로컬 `npm run dev`(:3200)와 운영 `https://divine-office.vercel.app/` 둘 다. Playwright Chromium, 390×844, isMobile
- **스크립트**: 세션 scratchpad `design/` (`fontsize-trace2.mjs`, `prod-fontsize.mjs`, `sticky-check.mjs`, `prod-sticky.mjs`, `anchor-check.mjs`)

---

## 1. 글씨 크기 125% 이상이면 첫 화면에 오늘의 기도 버튼이 없다

### 증상

홈은 처음 열릴 때 오늘 날짜 줄을 화면 가운데로 굴린다(`src/components/liturgical-calendar-list.tsx` 마운트 effect 의 `scrollIntoView({block:'center'})`). 설정에서 글씨를 키운 사용자는 오늘 줄이 화면 아래로 밀려 버튼이 안 보인다. 200% 에서는 10월 10~12일 줄이 보인다.

### 재현 (운영)

초기화 스크립트로 `loth-settings.fontSize` 를 넣고, `<html data-font-size>` 변화와 `scrollIntoView` 호출 순간의 글씨 크기를 기록했다. 마지막에 오늘 줄의 화면 위치를 쟀다(뷰포트 높이 844).

```
$ node design/prod-fontsize.mjs
md    {"trace":[["attr",386,null,"->","md","scrollY",0],["scrollIntoView",888,"font","md","before",0],["after",1956],["attr",890,"md","->","md","scrollY",1956]],"scrollY":1956,"todayTop":283,"todayBottom":560,"vh":844,"todayVisible":true}
lg    {"trace":[["attr",138,null,"->","lg","scrollY",0],["scrollIntoView",287,"font","md","before",0],["after",1966],["attr",297,"lg","->","lg","scrollY",1966],["attr",301,"md","->","lg","scrollY",1966]],"scrollY":1966,"todayTop":548,"todayBottom":884,"vh":844,"todayVisible":true}
xl    {"trace":[["attr",172,null,"->","xl","scrollY",0],["scrollIntoView",341,"font","md","before",0],["after",1976],["attr",350,"xl","->","xl","scrollY",1976],["attr",355,"md","->","xl","scrollY",1976]],"scrollY":1976,"todayTop":818,"todayBottom":1221,"vh":844,"todayVisible":true}
xxxl  {"trace":[["attr",124,null,"->","xxxl","scrollY",0],["scrollIntoView",297,"font","md","before",0],["after",2050],["attr",307,"xxxl","->","xxxl","scrollY",2050],["attr",311,"md","->","xxxl","scrollY",2050]],"scrollY":2050,"todayTop":2194,"todayBottom":2750,"vh":844,"todayVisible":false}
x5l   {"trace":[["attr",137,null,"->","x5l","scrollY",0],["scrollIntoView",288,"font","md","before",0],["after",2156],["attr",299,"x5l","->","x5l","scrollY",2156],["attr",303,"md","->","x5l","scrollY",2156]],"scrollY":2156,"todayTop":3631,"todayBottom":4560,"vh":844,"todayVisible":false}
```

| 설정 | 오늘 줄 위치(top~bottom) | 첫 화면 |
|---|---|---|
| md 100% | 283~560 | 버튼 3개 다 보임 |
| lg 112.5% | 548~884 | 세 번째 버튼이 잘림 |
| xl 125% | 818~1221 | 날짜 줄 머리만 보임, 버튼 없음 |
| xxxl 150% | 2194~2750 | 안 보임 |
| x5l 200% | 3631~4560 | 안 보임 (10월 10~12일이 보임) |

로컬 dev 서버에서도 같은 값이 나왔다(x5l `scrollIntoView` 시점 font `md`, 최종 todayTop 3631).

### 원인

`scrollIntoView` 가 불리는 순간 `<html data-font-size>` 가 사용자의 값이 아니라 `md` 다. `data-font-size` 를 쓰는 곳은 두 군데뿐이다.

```
src/app/layout.tsx:64:     root.dataset.fontSize = s.fontSize || 'md';   ← head 인라인 스크립트 (사용자 값)
src/lib/settings.tsx:225:  root.dataset.fontSize = settings.fontSize    ← SettingsProvider effect
```

`SettingsProvider` 는 `useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)` 이고 `getServerSnapshot` 은 `DEFAULTS`(fontSize `md`)를 돌려준다. 하이드레이션 중 effect 가 이 기본값을 `<html>` 에 써서 인라인 스크립트가 넣은 값을 잠깐 덮는다. 홈 목록의 한 번뿐인 자동 스크롤이 바로 그 틈에 `md` 배치를 기준으로 돈다. 곧 클라이언트 값으로 다시 렌더되어 글씨가 커지지만, 스크롤 위치(≈1956)는 그대로라 오늘 줄이 아래로 밀려난다. 트레이스의 `x5l → md`(스크롤 전), `md → x5l`(스크롤 후) 두 변경이 이 순서를 보여 준다.

### 권장 조치

- 근본: `SettingsProvider` effect 가 서버 스냅숏(`DEFAULTS`) 상태일 때는 DOM 에 쓰지 않게 한다. 인라인 스크립트가 이미 사용자 값을 넣어 두었다. 같은 effect 의 `applyTheme` 도 같은 틈에 `dark` 클래스를 뺐다 넣는다(관측: 한 배치 안에서 `dark → '' → dark`, 화면 깜빡임은 확인 안 됨).
- 보강: 목록의 자동 스크롤을 글씨 크기가 자리 잡은 뒤에 한 번 더 맞춘다(사용자가 이미 스크롤했으면 하지 않음).
- 회귀 테스트: e2e 에서 `loth-settings.fontSize='x5l'` 로 홈을 열고 오늘 줄이 뷰포트 안에 있는지 단언.

## 2. 홈 아래 메뉴(Өнөөдөр / Тохиргоо)가 화면 아래에 붙지 않는다

### 증상

`src/components/footer.tsx:63` 홈 변형은 `sticky bottom-0` 이고 DESIGN.md·FR-162 도 "sticky(홈)" 이다. 실제로는 페이지 맨 끝에만 나온다. 첫 화면(오늘로 스크롤된 상태)에서는 보이지 않는다.

### 재현 (운영, 같은 결과가 로컬에도)

```
$ node design/prod-sticky.mjs
as-is {"scrollY":1956,"vh":844,"footerTop":966,"footerBottom":1083,"pinned":false}
body-overflow-clip {"scrollY":1956,"vh":844,"footerTop":727,"footerBottom":844,"pinned":true}
```

### 원인

`src/app/globals.css` 의 `html, body { overflow-x: hidden; }` (커밋 `5477360`, 2026-04-23, 가로 스와이프 흰 여백 수정). `html` 의 overflow 가 visible 이 아니면 `body` 의 overflow 는 뷰포트로 넘어가지 않고 `body` 자신이 스크롤 컨테이너가 된다(측정: `body` overflow `hidden/auto`). sticky 는 가장 가까운 스크롤 컨테이너인 `body` 기준으로 붙는데 `body` 는 스크롤하지 않으므로 아무 효과가 없다. 아래 메뉴를 sticky 로 만든 커밋 `f9c442f`(2026-05-20)보다 앞선 변경이라, 이 메뉴는 처음부터 한 번도 붙은 적이 없다.

위 두 번째 줄처럼 브라우저에서 `overflow-x: clip` 으로 바꾸면 붙는다(clip 은 스크롤 컨테이너를 만들지 않는다).

`src/components/__tests__/footer.test.ts:78` 은 HTML 에 `sticky` 클래스가 있는지만 본다. 그래서 통과한다.

### 고칠 때 주의

그냥 붙이면 아래 메뉴(버튼 줄 + 출처 2줄)가 화면 아래를 늘 차지한다. `overflow-x: clip` 을 입히고 잰 값:

```
$ node design/footer-x5l.mjs
md    {"footerH":117,"share":"14%","settingsRight":345,"vw":390}
xl    {"footerH":136,"share":"16%","settingsRight":356,"vw":390}
xxxl  {"footerH":187,"share":"22%","settingsRight":367,"vw":390}
x5l   {"footerH":281,"share":"33%","settingsRight":448,"vw":390}
```

200% 에서는 출처가 4줄로 늘어 화면의 3분의 1을 덮고, «Тохиргоо» 버튼 오른쪽 끝(448px)이 화면 폭(390px) 밖으로 나가 잘린다(시안 스크린샷 `design/x5l-after.png`). 고정 영역에는 버튼 줄만 두고 출처 2줄은 페이지 끝으로 옮기는 식의 결정이 먼저 필요하다. 출처 상시 노출은 #51/#53 사용자 결정이다.

## 3. 목록 맨 위 «(Автомат)» 줄이 눌러도 반응이 없다

`today-anchor` 줄은 `<button aria-expanded="false">` 로 그려지지만 `handleToggle` 이 `kind !== 'date'` 면 바로 return 한다(`liturgical-calendar-list.tsx`). 화면에는 «(Автомат)» 한 단어만 보인다.

```
$ node design/anchor-check.mjs
before {"url":"http://localhost:3200/","expanded":"false","text":"(Автомат)","bodies":1}
after tap {"url":"http://localhost:3200/","expanded":"false","bodies":1}
```

권장: 눌렀을 때 오늘 줄로 이동해 펼치게 하거나, 줄 자체를 없앤다.

## 4. §1 수정 (FR-184)

- `src/lib/settings.tsx`: `SettingsProvider` effect 를 하이드레이션 플래그(`useSyncExternalStore`, 서버 `false`/클라이언트 `true`)로 막았다. 서버 스냅숏으로 그리는 하이드레이션 렌더에서는 DOM 에 쓰지 않는다. 사용자 값은 head 인라인 스크립트가 이미 넣어 두었다.
- `src/components/liturgical-calendar-list.tsx`: 오늘 줄이 화면보다 길면(200% 등) `block:'start'`, 아니면 지금처럼 `'center'`. 가운데 맞춤은 긴 줄의 날짜 줄과 «Өнөөдөр» 표시를 화면 위로 잘라 냈다. `liturgical-calendar-row.tsx` 의 줄에 `scroll-mt-2`.

수정 후 로컬 실측(390×844, `scrollFont` = `scrollIntoView` 순간의 `data-font-size`). 오늘 칸 높이는 FR-185 이전 디자인 기준이다.

```
$ node design/local-fontsize.mjs
xs    {"scrollFont":"xs","panelH":249,"scrollY":1667,"todayTop":298,"todayBottom":546,"vh":844,"todayVisible":true}
md    {"scrollFont":"md","panelH":277,"scrollY":1956,"todayTop":283,"todayBottom":560,"vh":844,"todayVisible":true}
lg    {"scrollFont":"lg","panelH":336,"scrollY":2260,"todayTop":254,"todayBottom":590,"vh":844,"todayVisible":true}
xl    {"scrollFont":"xl","panelH":403,"scrollY":2573,"todayTop":221,"todayBottom":624,"vh":844,"todayVisible":true}
xxl   {"scrollFont":"xxl","panelH":510,"scrollY":3723,"todayTop":168,"todayBottom":677,"vh":844,"todayVisible":true}
xxxl  {"scrollFont":"xxxl","panelH":556,"scrollY":4100,"todayTop":144,"todayBottom":700,"vh":844,"todayVisible":true}
x4l   {"scrollFont":"x4l","panelH":691,"scrollY":4875,"todayTop":76,"todayBottom":767,"vh":844,"todayVisible":true}
x5l   {"scrollFont":"x5l","panelH":929,"scrollY":5829,"todayTop":-42,"todayBottom":887,"vh":844,"todayVisible":true}
```

마지막 줄처럼 200% 는 가운데 맞춤만으로는 위가 42px 잘렸다. 위 맞춤을 넣은 뒤(FR-185 디자인 포함)에는 오늘 칸이 화면 맨 위 16px 에서 시작한다(`top 16`, 390×844 와 375×667 모두).

회귀 테스트 `e2e/home-first-screen.spec.ts` `@fr FR-184`(xl·xxxl·x5l × chromium·mobile-chrome): `settings.tsx` 만 수정 전으로 되돌리면 6/6 실패, 되돌려 놓으면 통과.

```
$ npx playwright test e2e/home-first-screen.spec.ts -g "font"     # settings.tsx = HEAD
{'expected': 0, 'skipped': 0, 'unexpected': 6, 'flaky': 0}
  Error: expect(locator).toBeInViewport() failed
  Locator:  locator('[data-testid="calendar-row"][data-today="true"]').getByTestId('calendar-row-header')
  Received: viewport ratio 0
```

## 5. «Өнөөдөр» 버튼이 오늘로 데려가지 않는다 (§2 를 고치다 찾음)

아래 메뉴를 늘 보이게 고정하면 «Өнөөдөр» 를 더 자주 누르게 된다. 고치기 전에 눌러 봤다(로컬, 390×844).

```
$ node design/today-btn.mjs
{"label":"A load /","url":"/","scrollY":2006,"todayTop":309,"todayExpanded":"true","expandedRows":["2026-10-29"]}
{"label":"C /?month=2026-12","url":"/?month=2026-12","scrollY":0,"todayTop":null,"todayExpanded":null,"expandedRows":[]}
{"label":"D → footer Өнөөдөр","url":"/","scrollY":0,"todayTop":2315,"todayExpanded":"true","expandedRows":["2026-10-29"]}
{"label":"E next→prev back to this month","url":"/?month=2026-10","scrollY":0,"todayTop":2315,"todayExpanded":"true","expandedRows":["2026-10-29"]}
```

- 다른 달에서 누르면(D) 주소는 `/` 로 바뀌지만 화면은 이번 달 1일에 머문다. 오늘 칸은 2315px 아래에 있다.
- 원인: 목록 컴포넌트가 달이 바뀌어도 그대로 남아서, 마운트 때 한 번만 도는 오늘 스크롤이 다시 돌지 않는다.
- 이미 이번 달을 보고 있을 때 누르면 같은 주소로 `router.push('/')` 만 하고 끝나서 아무 일도 없다. 위 로그의 B 줄은 Playwright 가 버튼을 보이게 하려고 스크롤한 값이라 뺐다.

## 6. §2·§3·§5 수정 (FR-186 · FR-187)

**§2 아래 메뉴 고정 (FR-186).** `globals.css` 의 `html, body` 를 `overflow-x: hidden` → `hidden` + `clip` 으로 바꿨다. 뒤의 `clip` 이 이기고, `clip` 을 모르는 브라우저는 `hidden` 을 쓴다. 출처 2줄까지 고정하면 위 §2 의 높이가 되므로, 버튼 줄만 고정하고 출처 2줄은 고정 영역 밖 페이지 끝에 둔다. 출처는 항상 렌더되고 토글이 없어서 #51/#53 결정은 그대로다. 버튼은 아이콘 위 라벨로 바꿨다. 홈 컨테이너의 `pb-24` 는 메뉴가 내용을 덮는다는 가정의 여백이었고 실제로는 끝에 빈칸만 남겨서 뺐다.

```
$ node design/verify2.mjs
footer md {"h":55,"bottom":844,"vh":844,"pinned":true,"settingsRight":328,"vw":390,"hOverflow":0}
footer xl {"h":63,"bottom":844,"vh":844,"pinned":true,"settingsRight":337,"vw":390,"hOverflow":0}
footer x5l {"h":89,"bottom":844,"vh":844,"pinned":true,"settingsRight":363,"vw":390,"hOverflow":0}
page end {"creditsBottom":773,"footerTop":789,"footerBottom":844,"vh":844}
pray page hOverflow 0
```

**§3·§5 오늘로 가기 (FR-187).**
- 목록을 달 단위로 key 했다(`page.tsx`). 달이 바뀌면 목록이 새로 마운트되어 오늘(또는 `?date=`)로 스크롤한다.
- 아래 메뉴 «Өнөөдөр» 와 맨 위 동기 행이 같은 '오늘로 가기'(`src/lib/jump-to-today.ts`)를 쓴다. 오늘 칸이 목록에 있으면 펼치고 그 자리로 스크롤하고, 없으면 `/` 로 이동한다.
- 동기 행 문구는 FR-145 사용자 결정 원문("Today (Автомат)")대로 «Өнөөдөр (Автомат)» 로 바꿨다.

```
anchor → today {"top":309,"bottom":542,"vh":844,"open":true} Өнөөдөр (Автомат)
footer on / → today {"top":309,"bottom":542,"vh":844,"open":true} http://localhost:3200/
footer from Dec → today {"top":309,"bottom":542,"vh":844,"open":true} http://localhost:3200/
```

회귀 테스트는 `e2e/home-first-screen.spec.ts` 의 `@fr FR-186`(3)·`FR-187`(3)·`FR-188`(1) 과 `src/components/__tests__/footer.test.ts` 의 `@fr FR-186`(2) 이다. 홈 spec 을 `--repeat-each=3` 으로 돌려 72/72 통과했다.
