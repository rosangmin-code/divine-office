# 전체 e2e 실패 2건 — 축일 선택지가 있는 날의 큰 글자 첫 화면, 쪽 번호 개수 경쟁

- **발견**: 2026-10-31, 4주간 시편집 2026-10-30 개정판을 앱에 반영한 뒤 전체 e2e(개발 서버)를 돌리다가
- **상태**:
  - §2 쪽 번호 개수: 테스트를 고쳤다(나타날 때까지 기다린 뒤 센다).
  - §3 큰 글자 첫 화면: 화면을 고쳤다 — 사용자 결정 (가) "가 해" (2026-10-31), FR-189. §4.
- **영향**: 둘 다 개정판 반영과 무관하다. 변경을 치운 HEAD(`8e9138d`)에서 같은 결과가 난다. 다만 §3 은 축일 선택지가 있는 날마다 실패하므로, 그런 날 push 하면 CI 가 빨갛게 된다(오늘 10-31 토요일이 그런 날이다).

---

## 1. 결과

```
$ npx playwright test --reporter=line          # 개발 서버, 개정판 반영 상태
PASS (1085) FAIL (2)
1. font x5l — first screen shows today's date line and its first hour
   Locator:  locator('[data-testid="calendar-row"][data-today="true"]').locator('[data-role="hour-list"] a').first()
   Received: viewport ratio 0
     > 42 |     await expect(today.locator('[data-role="hour-list"] a').first()).toBeInViewport()
2. page references appear on multiple section types
   Expected: >= 3
   Received:    0
     >  99 |     expect(count).toBeGreaterThanOrEqual(3)
```

## 2. 쪽 번호 개수 — `e2e/page-references.spec.ts:97`

같은 테스트를 조건을 바꿔 다시 돌렸다.

| 조건 | 결과 |
|---|---|
| 개정판 반영 상태, 전체 e2e 를 막 마친(오래 돈) 개발 서버 | 2번 다 실패 (0개) |
| 개정판 반영 상태, 배포용 빌드 (`npm run build` → `CI=1 … --retries=0`) | 통과 |
| HEAD `8e9138d`, 새로 띄운 개발 서버 | 통과 |
| 개정판 반영 상태, 새로 띄운 개발 서버 | 통과 (`PASS (68) FAIL (0)`) |

```
$ CI=1 npx playwright test e2e/page-references.spec.ts e2e/home-first-screen.spec.ts --retries=0 --reporter=line
PASS (91) FAIL (1)
1. font x5l — first screen shows today's date line and its first hour

$ npx playwright test e2e/page-references.spec.ts --retries=0 --reporter=line   # 새 개발 서버
PASS (68) FAIL (0)
```

**원인.** 쪽 번호 «(х. N)»는 하이드레이션 뒤 localStorage 설정(`showPageRefs`)을 읽고서야 그려진다. 같은 파일의 다른 테스트는 `toBeVisible()` 로 나타날 때까지 기다리는데, 이 테스트만 `count()` 를 바로 읽었다. `count()` 는 기다리지 않는다. 부하가 걸린 개발 서버에서 하이드레이션이 늦으면 0 을 읽는다.

**조치.** `await expect.poll(() => allPageRefs.count()).toBeGreaterThanOrEqual(3)` — 나타날 때까지 다시 센다. 고친 뒤 `PASS (68) FAIL (0)`.

## 3. 큰 글자(x5l) 첫 화면 — `e2e/home-first-screen.spec.ts:42` (mobile-chrome)

FR-184(큰 글자에서 오늘로 스크롤)를 지키는 테스트다. 오늘 줄의 날짜 줄과 첫 기도 버튼이 첫 화면에 보여야 한다.

오늘 2026-10-31(토)은 연중 제30주간 토요일 «또는 토요일의 성모 마리아 기념»(Төгс жаргалт цэвэр Охин Мариагийн Бямба гарагийг дурсахуй)을 고를 수 있는 날이다. 그래서 오늘 줄의 날짜 줄과 기도 버튼 사이에 축일 선택지(`celebration-picker`, «Өнөөдрийн залбирлын сонголт»)가 들어간다.

```
$ node home-x5l.mjs        # 배포용 서버, fontSize x5l, 목록 data-ready 뒤 측정 (px)
desktop {"vh":720,"row":[17,703],"hour":[599,104],… "celebration-picker y=192 h=358","hour-list y=598 h=106"}
pixel7  {"vh":839,"row":[16,1357],"hour":[1156,200],… "celebration-picker y=397 h=710","hour-list y=1155 h=202"}
```

- 폰(Pixel 7, 화면 839px)에서는 선택지가 710px 를 차지해, 첫 기도 버튼이 1156px 에 놓인다. 첫 화면에는 날짜 줄, «Өнөөдөр» 표시, 두 축일 이름, 선택지 제목과 첫 선택 카드까지만 보인다.
- 데스크톱(720px)에서는 기도 버튼이 599px 에서 시작해 들어온다.
- HEAD `8e9138d` 에서도 같다:

```
$ git stash push … && npx playwright test e2e/page-references.spec.ts e2e/home-first-screen.spec.ts --retries=0   # HEAD, 새 개발 서버
PASS (91) FAIL (1)
1. font x5l — first screen shows today's date line and its first hour
   Received: viewport ratio 0
```

**왜 지금 드러났나.** 테스트는 2026-10-29(목)에 만들었다. 그날은 선택지가 없어 통과했다. 이 테스트는 실행하는 날짜에 따라 결과가 바뀐다. 선택지가 있는 날(선택 기념일이 있는 평일·토요일)에만, 가장 큰 글자의 폰에서만 실패한다.

**판단할 것.** 기대가 틀린 것인지, 화면이 모자란 것인지는 디자인 결정이다.

- (가) 화면을 고친다. 선택지가 있는 날에도 첫 화면에 기도 버튼이 보이게 한다. 예를 들어 큰 글자에서 선택지를 한 줄 요약(지금 고른 것 + «바꾸기»)으로 접는다. 날짜 줄 아래 «эсвэл …» 로 두 축일 이름이 이미 나오므로, 펼친 카드 두 장은 같은 내용을 한 번 더 보여 준다.
- (나) 테스트 기대를 바꾼다. 선택지가 있는 날에는 첫 화면에 선택지 제목이 보이면 통과로 본다. 기도하기 전에 축일을 고르는 순서를 지금 모습대로 인정하는 것이다.

결정 전까지 이 테스트는 선택지가 있는 날 CI 에서 실패한다.

## 4. 조치 — FR-189 (사용자 결정 (가), 2026-10-31)

- 글씨 크기 L 이상(`globals.css` 의 `@custom-variant font-large`, `<html data-font-size>` lg~x5l)에서는 선택지를 한 줄로 접는다. 한 줄은 지금 고른 축일 + «Солих» 이고, 누르면 선택지 전체를 펼친다. 선택지를 누르면(탭·Enter·Space) 다시 접히고 포커스는 그 줄로 돌아온다. 방향키로 고르는 동안은 펼친 채 두고, Esc 로 접는다.
- M 이하는 지금처럼 선택지 전체를 보여 주고 한 줄은 없다.
- 접힘은 CSS 가 정한다. head 인라인 스크립트가 첫 그림 전에 `data-font-size` 를 넣으므로 하이드레이션 뒤 출렁임이 없다.
- 기준을 L 로 잡은 이유: 아래 측정에서 작은 폰(320×568)은 L 부터 기도 버튼이 가려졌다. 설정 화면에서도 M 이 기본이고 L 이 첫 'Large' 다.

오늘 줄 첫 기도 버튼의 위치(px). '보이는 끝'은 아래 고정 메뉴의 윗선이다.

```
$ node picker-measure.mjs        # 2026-10-31(선택지 있는 날), 개발 서버, 목록 data-ready 뒤
                 고치기 전                          고친 뒤
pixel7 (839, 보이는 끝 750~784)
  md    560-612 OK  (선택지 202)            560-612 OK  (선택지 202, 한 줄 없음)
  xl    619-684 OK  (선택지 301)            505-570 OK  (한 줄 82)
  xxxl  724-838 가려짐 (선택지 420)         569-683 OK  (한 줄 134)
  x4l   942-1075 가려짐 (선택지 587)        594-727 OK  (한 줄 156)
  x5l   1156-1356 가려짐 (선택지 710)       648-848 윗부분만 (한 줄 218)
iphoneSE (568, 보이는 끝 479~513)
  lg    500-586 가려짐                      397-482 OK
  xl    605-700 가려짐                      409-504 OK
  xxl 이상  가려짐                           가려짐 (날짜 줄과 축일 이름만으로 화면 대부분)
desktop (720)
  x4l   569-660 가려짐                      445-536 OK
  x5l   599-703 가려짐                      457-561 OK
```

5XL 의 폰에서는 첫 기도 버튼의 윗부분(이름 첫 줄 «Өглөөний»)까지 첫 화면에 든다. 처음엔 «Солих» 가 오른쪽 자리를 차지해 축일 이름이 한 낱말씩 세로로 눌렸다(한 줄 290px). 그래서 자리가 모자라면 «Солих» 가 통째로 다음 줄로 내려가게 했다(218px).

```
$ npx playwright test e2e/home-first-screen.spec.ts e2e/feast-selection.spec.ts --retries=0
  4 skipped
  60 passed (21.7s)
```

FR-184 의 `font x5l` 도 오늘(선택지 있는 날) 통과한다. 새 e2e 3 케이스(`@fr FR-189`)는 날짜를 2026-05-30(연중 토요일, 성모 기념 선택)으로 고정해 실행하는 날과 무관하다.
