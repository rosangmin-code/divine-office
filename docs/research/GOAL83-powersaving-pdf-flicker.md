# GOAL #83 — 절전모드 PDF 뷰어 "까맣게↔하얗게 번갈이(ALTERNATING)" 원인 조사

- **작성**: dvo-sol (research, task #84 / `[#83-sub-1]`)
- **일자**: 2026-05-29
- **대상 코드**: `src/components/pdf-viewer.tsx` (단일 2D `<canvas>`, `getContext('2d')`)
- **L1 합의**: Claude + peer(`research_methodologist`, codex) 2라운드 → `consensus_reached: true` at R2, stance=`APPROVED_WITH_ISSUES`. **합의 대상은 "프레이밍"이며, 인과(causality)의 확정이 아님** — 최종 근본원인 확정은 실기기 계측을 요구한다(§6 Limitations).
- **선행 맥락**: #80은 *정적(static) black* 을 고침(다크 컨테이너 배경 `dark:bg-neutral-950`이 invisible/초과 캔버스를 통해 노출 + 캔버스 4096px 초과). 본 조사는 그와 **별개인 반복(alternating) 현상**의 원인 규명이다.

---

## 1. 방법론 (Methodology)

**하이브리드(코드분석 + 1차 웹리서치 + 적대적 교차검증)** 접근을 택했다. 본 현상은 (a) 실기기·OS 상태(절전모드, 메모리 압박)에 의존하고 (b) Playwright/devtools로 재현 불가하므로(§5), "실험"은 결정적 소스가 될 수 없다. 따라서 ① `pdf-viewer.tsx`의 렌더 생명주기를 line 단위로 분석해 **어떤 레이어(React/JS vs WebKit compositing)에서 반복이 발생 가능한지** 의 경계를 먼저 확정하고, ② iOS WebKit / 안드로이드 Chromium의 canvas 메모리·GPU·throttle 거동을 **공식 버그트래커·WebKit/Chrome 문서 우선** 으로 1차 인용 수집하며, ③ 모든 판정을 peer(`research_methodologist`)와 적대적으로 교차검증해 과잉주장·미인용 단정·누락 대안을 제거했다. 산출물은 본 마크다운 보고서(H1–H4 판정 + [D1]/[D2] + 재현성 구분)이며, **인용 가능한 사실 / 추론(INFERRED) / 미확정 잔여** 를 명시적으로 라벨링하는 것을 형식 원칙으로 삼는다.

---

## 2. 코드 사실 (1차 소스: 직접 인용)

`src/components/pdf-viewer.tsx`:

- **effect1** (L74–112): `pdfjs.getDocument(...)`로 문서를 **마운트 시 1회** 로드, `pdfDocRef`에 캐시. 페이지 전환은 `doc.getPage(...)`만 호출.
- **effect2** (L114–126): `ResizeObserver`가 `frameRef`의 **`clientWidth`만** 관찰 — `const measure = () => setFrameWidth(el.clientWidth)` (L120). deps `[]`.
- **effect3** (L129–207): 렌더. **deps `[bookPage, frameWidth, docReady]`** (L207).
  - 실행 시 `setStatus('loading')` (L135) → 캔버스가 `invisible` 클래스를 받음(L372).
  - `canvas.width = halfDeviceW` / `canvas.height = ...` (L171–172) — **HTML 사양상 backing store를 투명(transparent black)으로 초기화/clear**.
  - `pdfPage.render({...})` (L189) → `await task.promise` (L191) → `setStatus('ready')` (L192). **one-shot Promise** (애니메이션 루프 아님).
- **clamp** (L23–24, 160–166): `MAX_CANVAS_DIM=4096`, `MAX_CANVAS_AREA=16_777_216`. clamp 후에도 페이지 캔버스는 큼 — 약 4096×2800 ≈ 45MB backing store(4 byte/px 기준).
- **레이어** :
  - 외곽 컨테이너(L272): `bg-stone-100 dark:bg-neutral-950` ← **다크모드에서 검정 배경**.
  - frame(L339): `bg-white` ← #80 fix, 테마독립 "종이".
  - canvas(L372): `bg-white shadow` + status≠ready 일 때 `invisible`.
- **부재 확인** (`grep -n "requestAnimationFrame\|visibilitychange\|pageshow\|contextlost" src/components/pdf-viewer.tsx` → 0건):
  - `requestAnimationFrame` 루프 **없음** → H3 약화.
  - `visibilitychange`/`pageshow` 재렌더 **없음** → purge된 surface를 복구할 코드 경로 부재(§D2).
  - `webglcontextlost`/`contextlost` 핸들러 **없음**.

### 2.1 결정적 경계 추론 (핵심)

effect3의 React deps `[bookPage, frameWidth, docReady]`는 **절전모드에서 자발적으로 oscillate 하지 않는다** — 페이지 전환·doc 로드 없이는 변화 트리거가 없다. `bookPage`는 사용자 입력에만, `docReady`는 1회 true 고정, `frameWidth`는 `clientWidth`(정수) 변화 시에만. 게다가 React `setState`는 `Object.is(prev,next)` 동일 시 재렌더를 bail-out 하므로, 같은 정수 width 로 `measure()`가 반복돼도 effect3는 재실행되지 않는다.

> **따라서 "반복되는(alternating)" 깜빡임은 React/JS 재렌더 레이어에서 자발적으로 발생할 수 없고, 그 아래 WebKit/Chromium compositing·backing-store 레이어에서 발생해야 한다.** 이 경계가 H1을 지지하고 H2/H3를 약화시키는 1차 근거다. (단, §H2의 단서대로 "width가 외부 요인으로 실제 변하는" 경로는 계측 없이 완전 배제 불가.)

---

## 3. 웹 리서치 (1차 인용)

### 3.1 iOS Safari canvas 메모리 한도 — getContext null / transparent (≠ 반복 black)
- iOS Safari의 **per-page canvas 메모리 총량 한도 ≈ 384MB**; 초과 시 경고 `Total canvas memory use exceeds the maximum limit (384 MB)` 출력, `getContext()`가 **null 반환** → 렌더 실패. ([WebKit bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325))
- 한도 도달 시 Safari는 **transparent canvas를 그린다**("starts drawing transparent canvas elements"); Safari가 canvas 요소를 참조 해제 후에도 hoard 하는 경향. 우회책=캔버스를 1×1로 축소+clear 후 제거. ([PQINA: Total Canvas Memory Use Exceeds The Maximum Limit](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/), [Apple Developer Forums thread 687866](https://developer.apple.com/forums/thread/687866))
- 2023 fix: backing store가 할당 시도 중 GC 미발화로 즉시 해제되지 못한 점을 다룸. ([WebKit bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325))

> **해석**: 이 메커니즘(384MB 한도)은 **지속적 error/transparent 상태**(앱에선 `setStatus('error')` L196 또는 빈 캔버스)를 낳지 *반복(alternating)* 을 낳지 않는다. 또한 본 앱은 캔버스 **1개**(~45MB)만 사용 → 단독으로 384MB 한도에 도달하지 않는다. → **반복 현상의 직접 원인에서 제외**(아래 §H1의 (A)/(B) 분리).

### 3.2 WebKit 메모리 압박(memory pressure) 3단계
- Conservative **50%** (render/glyph 캐시·dead resource 정리 + 비차단 GC), Strict **65%** (back/forward 캐시·**decoded image data**·font 캐시 + **모든 JIT 컴파일 JS** 파기), Kill **100%** (동기 정리, 초과 지속 시 page reload). ([Catch Metrics: Deep Dive — RAM Internals in WebKit](https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit))
- (주의) 이 글은 canvas backing store의 purge/재구성 거동을 직접 다루지 않음 — §H1의 backing-store eviction은 *이 일반 압박 메커니즘으로부터의 추론* 임.

### 3.3 절전모드(Low Power Mode / battery saver)의 문서화된 효과
- **iOS**: rAF를 **30fps로 throttle**(저전력 모드). ([WebKit bug 168837 "[iOS] Throttle requestAnimationFrame to 30fps in low power mode"](https://bugs.webkit.org/show_bug.cgi?id=168837), [Popmotion](https://popmotion.io/blog/20180104-when-ios-throttles-requestanimationframe/)) — 단 본 앱엔 rAF 루프 없음(§2).
- iOS LPM 일반 효과(공식 문서화 항목만): **refresh rate 60Hz 제한**(ProMotion 기기), **백그라운드 앱 새로고침·자동 다운로드 일시중지**, 디스플레이 밝기/일부 시각효과 감소. ([Apple Support 101604](https://support.apple.com/en-us/101604)) — ⚠️ *CPU/GPU clock throttle 은 널리 관측되나 이 Apple 페이지엔 명시 없음(3rd-party 벤치마크 영역) → 본 보고서 결론엔 미사용.*
- **안드로이드/Chrome**: Energy Saver는 **display refresh rate 감소**, CSS/JS 애니메이션·rAF가 자동 조정. ([Chrome for Developers: Memory and Energy Saver mode](https://developer.chrome.com/blog/memory-and-energy-saver-mode))

> **핵심 인용 격차(명시)**: **"절전모드가 canvas/GPU 메모리 예산을 직접 줄인다"는 1차 인용은 없다.** LPM의 문서화된 효과는 throttle/clock 감소/백그라운드 중지이지 메모리 한도 축소가 아니다. → 본 보고서는 "절전모드"를 메모리 압박의 *직접 원인* 이 아니라 **저메모리 디바이스 상태와 상관(correlated)** 되는 조건으로 취급한다.

### 3.4 GPU-process canvas surface 손실 → black (INFERRED, 2D 직접 인용 아님)
- iOS Safari의 **GPU Process: DOM/Canvas Rendering** 아키텍처에서 canvas 합성이 깨지는 사례 보고: thread 708348은 **"GPU Process: DOM Rendering"** 플래그로 video→canvas drawImage 시 **검은 이미지**(iOS 16 Beta 2에서 fixed된 transient 사례), three.js #26829는 **blank white canvas + "context lost" 반복**(evict↔restore 진동 패턴). ([Apple Developer Forums thread 708348](https://developer.apple.com/forums/thread/708348), [three.js issue 26829](https://github.com/mrdoob/three.js/issues/26829))
- ⚠️ **이 보고들은 모두 WebGL / video-to-canvas 사례이고, black/white·feature-flag·fixed 여부가 사례별로 다르다.** 본 앱의 **2D canvas + pdf.js** 에 대한 "purge 후 *불투명 black* compositing" 직접 1차 인용은 확보하지 못함 → §H1의 BLACK source (a)는 **유추(INFERRED)** 로 라벨하며, 이들 보고는 "GPU-process가 canvas surface를 손실/반복재구성할 수 있다"는 *일반 거동의 방증* 으로만 쓰고 색(black) 자체의 직접 근거로는 쓰지 않는다.

---

## 4. 가설 판정 (H1–H4)

| 가설 | 판정 | 핵심 근거 |
|---|---|---|
| **H1** canvas backing-store purge(메모리 압박) → black↔white 반복 | **SUPPORTED (최유력, 단 미확정)** | §2.1 경계추론(반복은 compositing 레이어에서만 발생 가능) + §3.2 메모리 압박 eviction + §3.4(INFERRED black). 단 BLACK source 미확정. |
| **H2** ResizeObserver(frameWidth) → effect3 재렌더 루프 | **INCONCLUSIVE (반박 우세)** | §2.1: deps 자발적 oscillate 불가 + `clientWidth` 정수 + setState 동치 bail-out. 그러나 브라우저 UI/dynamic viewport가 width를 실제 변경하는 경로는 계측 없이 완전 배제 불가(peer 지적). |
| **H3** rAF/JS throttle → 부분/취소 렌더 반복 | **REFUTED (반복에 대해)** | §2: rAF 루프 부재(grep 0건), pdf.js render는 one-shot Promise. throttle은 렌더를 *느리게* 할 뿐 *반복* 을 만들지 않음. (pdf.js 내부 스케줄링 아티팩트 가능성은 잔여, 단 alternation의 주동인 아님.) |
| **H4** 순수 OS/디스플레이, 앱 코드 무관(테마 케이스처럼) | **REFUTED (서술 그대로는)** | OS는 *트리거* 이나, 발현 표면은 앱의 **대형 GPU canvas(~45MB) + 다크 컨테이너 배경**. 캔버스 축소/배경 변경/복구 핸들러로 거동이 바뀌므로 "코드 무관" 아님 → code-influenceable. |

### H1 상세 — 두 메커니즘 분리 + BLACK source 미확정
- **(A) per-page 384MB getContext-null 한도(§3.1)**: 지속 error/transparent → **반복 아님 → 제외**.
- **(B) 시스템 전역 메모리/GPU 압박(§3.2) + GPU-process surface eviction(§3.4)**: WebKit GPU 프로세스가 대형 canvas/reading-column 레이어 backing을 **반복적으로 evict→repaint** → 깜빡임. 45MB 단독이 트리거가 아니라, **저메모리 + 타 앱/탭 + 절전모드 상관 조건** 의 전역 압박이 트리거. (three.js의 "context lost over and over"가 동일한 evict↔restore 진동 패턴 — 단 WebGL.)
- **WHITE phase (잘 설명됨)**: transparent/cleared canvas → frame `bg-white` 노출(§3.1 + L171–172 clear + L372 invisible-loading).
- **BLACK phase (UNDETERMINED — 두 후보)**:
  - **(a)** GPU-process canvas surface 손실이 **불투명 black으로 compositing**(§3.4, INFERRED).
  - **(b)** 페이퍼/캔버스 레이어 paint가 evict 될 때 **다크 컨테이너 배경 `dark:bg-neutral-950`(L272)** 노출 — 이 경우 #80의 시각 메커니즘과 동일하되 트리거(레이어 eviction)가 다름.
- **falsifiable 디스크리미네이터(실기기 테스트 권장)**: **light mode 에서도 BLACK 반복이 나타나는가?**
  - light-mode 에서도 BLACK → source **(a)** (light 컨테이너는 `bg-stone-100`이라 backdrop이 black일 수 없음 → 캔버스 자체가 black).
  - dark-mode 에서만 BLACK → source **(b)** (#80 fix가 레이어 eviction엔 불충분).

---

## 5. 재현성: Playwright vs 실기기-only

| 항목 | 재현 수단 | 비고 |
|---|---|---|
| **알터네이팅 현상 자체** | **실기기-only** | 실제 메모리/GPU 압박 + 절전모드 디바이스 상태 필요. Playwright/devtools는 iOS 메모리 압박·LPM·GPU-process eviction을 시뮬레이트 못 함(프로젝트 CLAUDE.md "테스트가 못 잡는 것들"과 동일 부류). |
| effect3가 dep 변화 없이 자발 재실행 안 함(H2 반박) | **Playwright/단위 재현 가능** | 페이지 정지 상태에서 render 호출 수가 증가하지 않음을 assert. |
| `clientWidth` 정수 + setState bail-out | **단위 재현 가능** | 동일 width 반복 측정 시 재렌더 없음. |
| rAF 루프 부재(H3 반박) | **정적/grep 재현 가능** | `grep requestAnimationFrame` 0건. |
| clamp 수식(4096/16.7M) 정확성 | **단위 재현 가능** | 입력 dpr/페이지 크기 → 예측 backing dim. |
| **BLACK source (a)/(b) 판별** | **실기기-only** (light/dark 매트릭스) | §4 디스크리미네이터. |
| D2 완화(컨테이너 배경 비-다크) 효과 | **부분 재현 가능** | 컴퓨티드 배경색 DOM assert(=worst-case 노출색이 white)는 가능; 실제 eviction 하 거동은 실기기. |

---

## 6. 결정 (Decision)

### [D1] 근본 원인 — 최유력 가설 + 미확정 잔여
**최유력**: 절전모드와 **상관된 저메모리/GPU 압박** 하에서 WebKit(iOS Safari) **GPU 프로세스가 대형(~45MB) canvas/reading-column 레이어를 반복적으로 evict→repaint** 하여 발생하는 **compositing-레이어 진동**. React/JS 재렌더 루프가 아니며(§2.1), per-page 384MB getContext-null 한도(지속 error)와도 다르며(§3.1), rAF throttle(§3.3)도 아니다. **#80의 정적 black(CSS/layout)과 트리거가 구별되는 별개 현상**이다.

**미확정 잔여(합의 명시 — "프레이밍 합의이지 인과 확정 아님")**:
1. BLACK phase의 출처가 (a) 캔버스 자체 black-compositing(INFERRED) 인지 (b) 다크 컨테이너 backdrop 노출인지 **미확정** → §4 light/dark 디스크리미네이터로 판별 필요.
2. 2D canvas의 purge-후-black compositing에 대한 **직접 1차 인용 부재**(WebGL/video 유추).
3. "절전모드 → canvas 메모리 예산 축소"의 직접 인용 부재(상관으로 취급).
4. 확정은 **실기기 계측** 요구: effect3 render count, ResizeObserver width 로그, status 전이, console 경고(`Total canvas memory…`, context-lost), device/light-dark 매트릭스.

### [D2] 코드-fixable vs OS/디스플레이 동작
**판정: 부분적으로 code-mitigable** (순수 OS·코드무관 아님). OS 트리거(메모리/GPU 압박)는 제어 불가하나, **증상의 확률·가시성** 은 코드로 줄일 수 있다. (완치가 아니라 확률/가시성 저감으로 프레이밍 — 합의 단서.)

방향만 제시(구현은 별도 GOAL). **중요 — 방향1과 방향2는 서로 다른 BLACK source를 커버하며 상호 대체 불가**(§4 디스크리미네이터와 일관):
1. **(source (b) 전용 — 불투명 black 캔버스에는 무효) `/pdf/[page]` 컨테이너 배경을 테마무관 페이퍼(비-다크)로** — `pdf-viewer.tsx` **L272** `dark:bg-neutral-950` 제거/대체. #80이 frame(L339)에 적용한 논리를 컨테이너까지 확장. **유효 범위는 source (b)(다크 backdrop 노출) 및 WHITE-phase 의 backdrop 노출에 한정** — worst-case 레이어 드롭 시 *backdrop* 노출색이 black 대신 white 가 된다. **source (a)(캔버스 자체가 불투명 black 으로 compositing)에는 효과 없음**: 흰 배경 위에 올라간 불투명 black 캔버스는 가려지지 않는다(§4 light-mode 디스크리미네이터가 이 한계를 함의). 저비용·테스트가능(Playwright DOM-assert로 컨테이너 배경색 검증).
2. **(source (a) 담당) canvas backing store 축소** — `MAX_CANVAS_DIM`/`MAX_CANVAS_AREA`(L23–24) 하향 또는 절전/대형페이지에서 dpr cap(예 ≤2)으로 L160 `renderScale = cssScale * dpr` 완화 → GPU surface 작아져 eviction 확률↓. **source (a)(불투명 black 캔버스)에 대한 유일한 코드 레버**(방향1로 못 가림).
3. **(복구 — source (a)/(b) 공통) `visibilitychange`/`pageshow` 시 effect3 재렌더** — purge된 surface 복구. 단 "보이는 채로" evict 되면 이벤트 미발화 가능 → 부분적.

권장 우선순위: **1 → 2 → 3**. 단 우선순위는 *비용·테스트가능성* 기준이며 **커버리지 기준이 아니다** — source (a)가 우세하다고 판명되면(§4 light-mode 디스크리미네이터 결과) **방향2가 필수**이고 방향1만으로는 해결되지 않는다. 실기기 디스크리미네이터로 우세 source를 먼저 확정한 뒤 방향을 선택할 것.

---

## 7. 참고 출처 (References)
1. WebKit bug 195325 — Canvas context allocation fails / 384MB limit / null getContext — https://bugs.webkit.org/show_bug.cgi?id=195325
2. PQINA — Total Canvas Memory Use Exceeds The Maximum Limit (transparent canvas, 1×1 우회책) — https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/
3. Apple Developer Forums thread 687866 — Total canvas memory use exceeds the maximum limit — https://developer.apple.com/forums/thread/687866
4. Catch Metrics — Deep Dive: RAM Internals in WebKit (memory pressure 50/65/100%) — https://www.catchmetrics.io/blog/deep-dive-ram-internals-webkit
5. WebKit bug 168837 — [iOS] Throttle requestAnimationFrame to 30fps in low power mode — https://bugs.webkit.org/show_bug.cgi?id=168837
6. Popmotion — When iOS throttles requestAnimationFrame to 30fps — https://popmotion.io/blog/20180104-when-ios-throttles-requestanimationframe/
7. Apple Support 101604 — Use Low Power Mode (문서화 항목: 60Hz refresh 제한, 백그라운드 새로고침·자동다운로드 중지, 밝기/시각효과 감소; CPU/GPU throttle 수치는 미문서화) — https://support.apple.com/en-us/101604
8. Chrome for Developers — Memory and Energy Saver mode (refresh rate 감소, rAF 자동조정) — https://developer.chrome.com/blog/memory-and-energy-saver-mode
9. Apple Developer Forums thread 708348 — iOS 16 Beta: "GPU Process: DOM Rendering" 플래그로 video→canvas 시 검은 이미지 (transient, iOS 16 Beta 2에서 fixed) — https://developer.apple.com/forums/thread/708348
10. three.js issue 26829 — iOS 17: blank **white** canvas + "context lost" 반복 (WebGL; evict↔restore 진동 패턴의 방증) — https://github.com/mrdoob/three.js/issues/26829
11. (코드 1차) `src/components/pdf-viewer.tsx` L23–24, L74–207, L272, L339, L372 — 본 저장소
