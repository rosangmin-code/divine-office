# FR-017j — PDF 뷰어 UX 개선 plan

**상태**: PROPOSED · plan 단계, 코드 무수정
**원천 dispatch**: divineoffice/cowork task #49
**수반 변경 대상**: `src/components/pdf-viewer.tsx`, `e2e/page-references.spec.ts`, `docs/PRD.md`, `docs/traceability-matrix.md`
**관련 SSOT**: FR-017i (PDF 뷰어 인앱 라우트), FR-018 (페이지 참조 토글), `CACHE_VERSION = divine-office-v4`

---

## 0. 권장 단일 안 (1문장)

> Native PointerEvents 기반 좌우 스와이프 + 컨테이너 폭 기준 fit-to-width 렌더 + 플로팅 반투명 "Буцах" 버튼 + 시각 prev/next 버튼 제거 + sr-only 키보드 prev/next 버튼 (ArrowLeft/Right + Home/End) 으로 통일하고, **CACHE_VERSION bump 없이** 단일 PR + 신규 e2e 8건 + 수동 모바일 체크리스트(iOS Safari·A2HS·Slow 3G)로 가드한다.

---

## 1. Context

사용자 요구 (한글 정리):
- (a) PDF 글씨가 모바일에서 작아 보인다 → **시각적으로 더 크게**
- (b) 화면 하단의 `Өмнөх / Дараах` 버튼이 거슬린다 → **제거**
- (c) 그 대신 **좌우 스와이프**로 페이지 이동
- (d) 캔버스 주변 여백이 답답하다 → **여백 제거**

전제:
- 본 task 는 **plan 만 산출**한다. 구현은 plan 승인 후 별건 dispatch.
- 변경 범위는 인앱 PDF 뷰어 (`/pdf/[page]`) 한 라우트로 한정. PageRef → 뷰어 진입 동선 (FR-017i) 은 그대로 유지.
- FR 번호 규칙 (`CLAUDE.md`) 에 따라 FR-017 군의 다음 알파벳은 `FR-017j`.

---

## 2. 현행 진단

### 2.1 렌더링 (`src/components/pdf-viewer.tsx`)

```
const baseScale = 1.5
const viewport = pdfPage.getViewport({ scale: baseScale * dpr })
const halfW = Math.floor(viewport.width / 2)
canvas.width  = halfW
canvas.height = Math.floor(viewport.height)
```

CSS: `<canvas className="h-auto max-w-full ...">`

→ 캔버스의 **내부 픽셀 폭 = halfW** (PDF 원본 half-page 폭 × `1.5 * dpr`)
→ CSS 표시 폭 = `min(halfW, parent_clientWidth)` — `max-w-full` 로 부모 폭에 클립
→ 모바일 (예: iPhone 13, viewport 390px, dpr 3) 에서:
  - half-page 원본 폭 ≒ 612pt × 1.5 = 918pt
  - dpr 3 적용 시 canvas.width = 2754px
  - CSS 는 `max-w-full` 로 부모 폭 (≈ 366px = 390 - 2×12px main padding) 까지 축소
  - **결과: 2754 → 366 다운스케일 = 7.5× 축소**. dpr 보정으로 sharpness 는 충분하지만 절대 글자 크기는 PDF 원본 → 366px 폭에 맞춰 작게 보인다.

핵심 문제: 캔버스가 PDF 원본 half-page 폭으로 렌더된 뒤 화면에서 단순 축소되므로, **사용자가 체감하는 글자 크기는 viewport 폭 × half-page 비율로 고정**된다. baseScale 을 올려도 CSS 가 다시 max-w-full 로 클립하면 동일 결과.

### 2.2 레이아웃 여백

```
<header ... px-4 py-3 ...>  Буцах + х. N + 우측 spacer
<main   ... flex ... px-3 py-4>  canvas
<nav    ... px-4 pb-6 pt-2>  Өмнөх / Дараах 버튼
```

수직 점유: header ~50px + main py-4(32px) + nav ~80px ≈ **160px** 가 캔버스 외 영역. 좁은 모바일 화면에서 캔버스가 갖는 vertical real estate 가 크게 깎인다. Horizontal `px-3` 도 12 px × 2 = 24px 손실.

### 2.3 페이지 이동

bottom `<nav>` 의 두 버튼만 제공. 키보드/스와이프/제스처/페이지 점프 모두 부재. 범위는 `MIN_BOOK_PAGE=1`, `MAX_BOOK_PAGE=969`.

### 2.4 PDF 문서 재로딩

`useEffect(() => {...}, [bookPage])` 안에서 매번 `getDocument(PDF_ASSET_PATH)` 를 호출. 페이지 이동마다 PDF 전체 메타데이터를 다시 로드한다 (브라우저 HTTP 캐시 덕에 네트워크는 0 이지만 pdfjs 파싱 비용은 매번 발생). 스와이프로 빠르게 페이지를 넘기는 시나리오에서 비용이 누적된다.

### 2.5 SW 캐시

`public/sw.js` 는 navigation = network-only, script/style/font/image = cache-first-with-network-fallback. PDF asset 자체는 destination 이 `''` 이므로 SW 가 가로채지 않고 브라우저 캐시에 의존.

---

## 3. 권장 접근

### 3.1 Scaling — fit-to-width 동적 스케일

**접근**: 컨테이너 (캔버스 부모) 의 `clientWidth` 를 `ResizeObserver` 로 측정 → PDF half-page 의 native CSS 폭 (`unscaledViewport.width / 2`) 대비 비율로 scale 결정 → 그 scale × dpr 로 canvas 픽셀 크기 산출.

```ts
const unscaled = pdfPage.getViewport({ scale: 1 })
const halfNativeW = unscaled.width / 2   // CSS px
const cssScale = containerCssWidth / halfNativeW   // 1.0 ~ 1.5 일반
const renderScale = cssScale * dpr
const viewport = pdfPage.getViewport({ scale: renderScale })
canvas.width  = Math.floor(viewport.width / 2)     // device px
canvas.height = Math.floor(viewport.height)
canvas.style.width  = `${containerCssWidth}px`     // CSS px
canvas.style.height = `${containerCssWidth * (viewport.height / (viewport.width/2)) / dpr}px`
```

이렇게 하면 캔버스 CSS 폭 = 화면 가용 폭이 되고, **글자가 곧바로 viewport 폭에 비례해 커진다**. dpr 곱해진 device px 로 렌더하므로 sharpness 도 유지.

가이드:
- `cssScale` 의 상한을 **2.0** 으로 클램프 (devicePixelRatio 4 폰에서 canvas.width 가 viewport 의 2× 폭 → 사용자가 가로 스크롤 없이 좌우 panning 으로 부분 확대를 볼 수 있도록 살짝 여유) — 단, 1차 구현은 상한 1.0 (정확히 fit-to-width) 로 시작하고 추후 follow-up 고려.
- `cssScale` 의 하한 = **1.0** (절대 축소하지 않는다 — desktop wide screen 에서는 캔버스가 컨테이너 좌측 정렬).
- 하한은 `max-w-[480px]` 같은 제한으로 desktop 에서 과도한 확대 방지 (선택).
- Native pinch-zoom 은 별도 방해 없이 brwoser 기본 동작 유지 (`touch-action: pan-y pinch-zoom` 또는 컨테이너 자체에 `touch-action: manipulation` 대신 default).

리렌더 트리거:
- `ResizeObserver` 가 컨테이너 폭 변동 감지 → 같은 PDF page 에 대해 canvas 만 다시 그림 (PDF 문서 재로딩 없음).
- 회전 (`window.orientationchange`) 도 ResizeObserver 가 자연 처리.

### 3.2 여백 제거

**접근**: 헤더 / 하단 nav / 메인 padding 모두 제거. 대신:
- **플로팅 반투명 "Буцах" 버튼** — `position: fixed; top: 12px; left: 12px; z-index: 20`, 작은 원형 (44×44 터치 타겟), 반투명 배경 (`bg-white/80 backdrop-blur` 또는 `bg-stone-900/60`), `aria-label="Буцах"`. 다크모드 대응.
- **페이지 인디케이터** — 우상단 작은 pill (`top-3 right-3`, 같은 반투명). `х. {bookPage}` 표시 + `aria-live="polite"` 로 페이지 변동 시 SR 안내.
- 캔버스 영역: `<main className="flex min-h-screen items-center justify-center">` 로 가운데 배치, padding 0. 캔버스 자체 `width: 100%`.
- 라이트/다크 배경은 그대로 (`bg-stone-100 dark:bg-neutral-950`) — A2HS standalone 에서 status bar 영역과의 contrast 유지.

iOS Safari home indicator (bottom unsafe-area) 와 status bar (top unsafe-area) 는 `env(safe-area-inset-*)` 로 보정.

```css
/* 플로팅 버튼 위치 */
top: max(12px, env(safe-area-inset-top, 0px));
left: max(12px, env(safe-area-inset-left, 0px));
```

### 3.3 스와이프 네비게이션

**라이브러리 vs 순수 PointerEvents 비교**:

| 기준 | `react-swipeable` | 순수 PointerEvents |
|------|------------------|-------------------|
| 의존성 | +1 (~3 KB gzip) | 0 |
| 코드량 | 낮음 (10줄) | 보통 (40~60줄) |
| 제스처 정확도 | 검증된 hysteresis | 직접 구현 필요 |
| iOS edge-back 충돌 | 처리 안 됨 | deadzone 직접 추가 |
| 핀치-줌 호환 | touch-action 직접 설정 | touch-action 직접 설정 |
| Playwright 테스트 | dispatchEvent 동일 | dispatchEvent 동일 |

**권장: 순수 PointerEvents.** 이유:
1. 한 라우트 한 컴포넌트에 한정된 스코프, 의존성 추가 정당화 어려움.
2. 좌우 1축 + 임계값 + boundary clamp 만 필요 → 60줄 이하로 충분.
3. iOS edge-back deadzone (왼쪽 16px) 처리는 어차피 직접 코드 필요.
4. SW 캐시 / 번들 사이즈 영향 0 (3.6 항목과 정합).

**구현 골격**:
```ts
const SWIPE_THRESHOLD = 60        // px (sample 추적 거리)
const EDGE_DEADZONE   = 16        // px (iOS back-swipe 회피)
const VERTICAL_REJECT = 1.2       // |dx| > VERTICAL_REJECT * |dy| 일 때만 좌우로 인정

onPointerDown → record startX, startY, startTime
onPointerMove → tentative dx
onPointerUp/Cancel → if |dx| > THRESHOLD && |dx| > VERTICAL_REJECT*|dy| && startX > EDGE_DEADZONE
                       → dx < 0 ? next() : prev()
```

CSS: 캔버스 컨테이너에 `touch-action: pan-y pinch-zoom` (좌우 swipe 우리가 처리, 위아래 스크롤 + 핀치줌은 브라우저 기본).

**범위 클램프**: `next = () => setBookPage(p => Math.min(MAX_BOOK_PAGE, p + 1))`, `prev = () => setBookPage(p => Math.max(MIN_BOOK_PAGE, p - 1))`. 이미 boundary 인 경우 setState 가 no-op (React 가 같은 값으로 리렌더 skip) — 사용자 피드백을 위해 짧은 시각 효과 (예: 0.15s `translateX(8px)` rubber band) 는 follow-up 후보.

**키보드 fallback**: `useEffect` 로 `document.addEventListener('keydown')` — `ArrowLeft → prev`, `ArrowRight → next`, `Home → setBookPage(1)`, `End → setBookPage(969)`. 입력 포커스가 form element 일 때는 무시.

### 3.4 prev/next 버튼 제거 + a11y

**시각 버튼 제거** + **sr-only 동등 컨트롤 유지**:

```tsx
<nav aria-label="Хуудас солих" className="sr-only">
  <button onClick={prev} disabled={bookPage <= 1}
          aria-label="Өмнөх хуудас" aria-keyshortcuts="ArrowLeft">
    Өмнөх
  </button>
  <button onClick={next} disabled={bookPage >= 969}
          aria-label="Дараагийн хуудас" aria-keyshortcuts="ArrowRight">
    Дараах
  </button>
</nav>
```

Tailwind `sr-only` (visually-hidden but focusable + readable by AT) 는 이미 프로젝트에서 사용 가능 (Tailwind v3+ 기본).

`aria-live="polite"` 영역 (페이지 인디케이터 pill 자체에 부착):
```tsx
<div role="status" aria-live="polite" aria-atomic="true">х. {bookPage}</div>
```

추가로 사용자가 임의 페이지로 점프할 수단이 필요한지는 open question (§9.3) — 1차 plan 에서는 보류.

**캔버스 자체 `role="img"` + `aria-label`**: 
```tsx
<canvas data-role="pdf-canvas" role="img"
        aria-label={`Дуулал номын ${bookPage}-р хуудас`} />
```

### 3.5 SW 캐시 / CACHE_VERSION

**CACHE_VERSION bump 불필요**. 근거:

| CLAUDE.md bump 기준 | 본 변경에서 발생? |
|---------------------|------------------|
| 정적 자산 경로 변경 | ❌ `psalter.pdf`, `pdf.worker.min.mjs` 그대로 |
| 정적 자산 내용 변경 | ❌ |
| 프리캐시 대상 변경 (`PRECACHE_URLS`) | ❌ `/offline.html`, `/icon.svg` 그대로 |
| SW 자체 로직 변경 | ❌ `sw.js` 무수정 |
| Navigation HTML 캐시 정책 변경 | ❌ network-only 유지 (변경 금지) |
| 응답 Content-Type 변경 | ❌ `/pdf/[page]` 는 여전히 HTML |

번들 hash 가 바뀌는 JS chunk 는 SW 의 script destination 분기 (cache-first + network-fetch-on-miss) 가 자연 처리한다. 새 hash 의 chunk 는 첫 요청에서 네트워크 fetch → 캐시. 구 hash chunk 는 참조되지 않은 채 잔존하지만 Lighthouse / 메모리 영향 무시 가능 (영구 잔존이 우려되면 별건 sweep).

**필수 확인 1줄**: 본 PR 머지 전 `public/sw.js` diff 가 비어 있는지 확인 (`git diff main -- public/sw.js`). 비어 있다 = bump 불필요 = OK.

### 3.6 e2e 회귀 가드 + swipe 테스트 전략

**기존 테스트 영향 분석** (`e2e/page-references.spec.ts` L188-244):

| 기존 어서션 | 영향 | 대응 |
|-------------|------|------|
| L194 `[data-role="page-ref-link"]` 가시 | 무영향 | 변경 없음 |
| L226 `[data-role="pdf-canvas"]` toBeVisible | 무영향 | 변경 없음 |
| L228 `data-book-page="58"` | 무영향 | attribute 그대로 |
| L229 `getByRole('button', { name: /Буцах/ })` toBeVisible | **위험** | 플로팅 버튼은 여전히 visible (sr-only 가 아니라 시각 floating). 어서션 그대로 통과해야 한다. |
| L241 같은 button click 으로 prayer page 복귀 | **위험** | 동일 — 플로팅 버튼이 onClick 동일하게 작동해야 한다. |

→ 결론: 기존 5개 테스트는 **버튼 location/style 만 바뀌고 accessible name/role 은 그대로**라면 모두 통과. 단, 플로팅 위치 때문에 클릭이 다른 요소에 가려질 수 있는지 (z-index) 만 확인 필요.

**신규 e2e 테스트 (권장 8건, 모두 `// @fr FR-017j` 태그)**:

1. `swipe left advances bookPage by 1`
   ```ts
   // /pdf/58 → swipe left → /pdf/59 (canvas data-book-page="59")
   await page.locator('[data-role="pdf-canvas"]').dispatchEvent('pointerdown', { clientX: 300, clientY: 400, pointerId: 1, pointerType: 'touch' })
   await page.dispatchEvent('html', 'pointermove', { clientX: 100, clientY: 405, pointerId: 1, pointerType: 'touch' })
   await page.dispatchEvent('html', 'pointerup',   { clientX: 100, clientY: 405, pointerId: 1, pointerType: 'touch' })
   await expect(canvas).toHaveAttribute('data-book-page', '59')
   ```
   (Playwright API 정확 호출은 구현 시 확정. `page.touchscreen` 도 후보.)
2. `swipe right retreats bookPage by 1`
3. `swipe at MAX (969) is no-op`
4. `swipe at MIN (1) is no-op`
5. `keyboard ArrowRight advances bookPage`
6. `keyboard ArrowLeft retreats bookPage`
7. `canvas occupies full container width (boundingBox.width >= viewport.width - 4)`
8. `aria-live region announces page change` — `page.locator('[role=status]')` 의 textContent 가 swipe 후 갱신

**수동 모바일 체크리스트 (CLAUDE.md mandate)**:
- [ ] iOS Safari (iPhone 실기기) 에서 좌우 스와이프 → 페이지 이동, edge-back 제스처 (왼쪽 화면 가장자리) 가 여전히 prayer page 로 돌아감
- [ ] iOS Safari pinch-zoom 으로 캔버스 확대 가능 (touch-action 충돌 없음)
- [ ] Android Chrome A2HS PWA 에서 floating "Буцах" 버튼 가시 + 동작
- [ ] DevTools Slow 3G 에서 swipe-spam → 5연속 swipe 후 마지막 페이지가 정상 렌더 (in-flight render cancel 검증)
- [ ] 다크모드에서 floating 버튼 가독성

### 3.7 FR-017j 등록

**`docs/PRD.md` §7.1**:
FR-017i 행 직후에 한 행 추가 — 예시:

```
| FR-017j | **PDF 뷰어 UX 개선**: `/pdf/[page]` 라우트에서 (a) 캔버스를 컨테이너 폭 기준 fit-to-width 로 렌더해 모바일 글자 크기를 키우고, (b) 헤더/하단 nav 를 제거해 캔버스 영역을 최대화하며, (c) 좌우 스와이프 (PointerEvents) 와 키보드 ArrowLeft/Right + Home/End 로 페이지 이동을 제공한다. (d) "Буцах" 는 좌상단 플로팅 반투명 버튼으로 유지, prev/next 시각 버튼은 제거하되 sr-only 등가 컨트롤 + `aria-live="polite"` 페이지 인디케이터로 a11y 보전. CACHE_VERSION bump 없음 (sw.js 무수정). | UI | P2 | 진행 중 |
```

**`docs/traceability-matrix.md`** (FR-017i 행 다음):
```
| FR-017j | PDF 뷰어 UX (fit-to-width / swipe / 플로팅 백버튼) | FR-017j | [PRD §7](../PRD.md#7-pdf-페이지-참조-기능) | `src/components/pdf-viewer.tsx` — fit-to-width + ResizeObserver + PointerEvents + sr-only nav + aria-live | `e2e/page-references.spec.ts` — FR-017j describe 8개 테스트 (스와이프 좌/우, 경계 no-op, 키보드, 캔버스 폭, aria-live) | 진행 중 |
```

`scripts/generate-test-fr-map.mjs --check` 가 CI 에서 누락 감지하므로 e2e 파일에 `// @fr FR-017j` 태그 누락 없도록 함 (CLAUDE.md "FR ↔ 테스트 연결" 규약).

§6.2 P2 행에서 FR-017i 의 **상태 갱신** 또는 별도 라인 등록은 follow-up — 주 매트릭스만으로 충분.

### 3.8 성능 가드 (모바일 메모리)

- **PDF 문서 단일 로드**: `getDocument(...)` 결과 (`pdfDoc`) 를 `useRef` 또는 `useState` 로 컴포넌트 마운트 1회만 유지. `bookPage` 변동 시에는 `pdfDoc.getPage(...)` 만 호출. → 페이지 이동 시 PDF 파싱 비용 0.
- **In-flight render cancel**: 현행 `renderTaskRef.current?.cancel()` 패턴 그대로 유지 (스와이프 spam 시 stale render 정리).
- **캔버스 픽셀 상한**: `cssScale` 클램프 + `dpr` 사용 → 최악 케이스 canvas.width ≈ 480 × 3 = 1440px. 메모리 ≈ 1440 × 1.5 × 1440 × 4B ≈ 12 MB. 수용 가능.
- **adjacent prefetch (deferred)**: ±1 페이지 미리 렌더해 swipe 직후 즉시 표시하는 최적화는 후속 follow-up. 1차에는 메모리 증가 회피를 위해 비활성.
- **debounce (선택)**: swipe 임계값을 통과한 직후 100ms 동안 추가 swipe 무시 → render 대기열 폭주 방지. 1차 구현에 포함 권장.

---

## 4. 변경 범위 (구현 단계 요약, 본 task 범위 외)

| 파일 | 변경 종류 | 핵심 수정 |
|------|---------|----------|
| `src/components/pdf-viewer.tsx` | 재작성 (≈ +130 / -60 LOC 예상) | fit-to-width, PointerEvents, ResizeObserver, sr-only nav, floating button, aria-live, pdfDoc ref 캐싱 |
| `src/app/pdf/[page]/page.tsx` | 무수정 | route boundary 그대로 |
| `src/lib/pdf-page.ts` | 무수정 | 헬퍼 그대로 |
| `e2e/page-references.spec.ts` | +8 테스트 | FR-017j describe 추가, `// @fr FR-017j` 태그 |
| `docs/PRD.md` | +1 행 | §7.1 FR-017j 등록 |
| `docs/traceability-matrix.md` | +1 행 | FR-017j 행 |
| `public/sw.js` | **무수정** | CACHE_VERSION bump 불필요 |
| `package.json` | **무수정** | 의존성 추가 없음 (PointerEvents native) |

---

## 5. 회귀 가드 요약

자동:
- e2e 신규 8건 (스와이프 / 키보드 / 폭 / aria-live)
- e2e 기존 FR-017i 5건 (링크 → 라우트, 캔버스 가시, Буцах 버튼) — 모두 통과 유지

수동 (CLAUDE.md 체크리스트):
- iOS Safari 실기기 (스와이프, edge-back, pinch-zoom)
- Android Chrome A2HS standalone (플로팅 버튼, 페이지 이동)
- DevTools Slow 3G (swipe-spam, render cancel)
- 다크모드 가독성

CI:
- `scripts/generate-test-fr-map.mjs --check` 통과 (FR-017j @fr 태그 누락 없음)
- 페이지 데이터 미수정 → `verify-{psalter,hymn,...}-pages.js` 와 `audit-psalter-ref-consistency.js` 영향 없음 (실행은 평소대로)

---

## 6. CLAUDE.md 체크리스트 정합

| 체크 항목 | 본 plan 의 답 |
|----------|--------------|
| 링크/URL/자산/Content-Type 변경? | **없음**. /pdf/[page] 라우트 동일, 자산 경로 동일 |
| `sw.js` navigation 정책 검토 | network-only 유지 — 변경 금지 |
| `CACHE_VERSION` bump | **불필요** (정적 자산/프리캐시/SW 로직 무수정) |
| 모바일 수동 확인 | **필요** — §3.6 수동 체크리스트로 명시 |
| 몽골어 라벨 오타 점검 | sr-only `Өмнөх`/`Дараах` (cf. existing buttons), aria-label `Буцах`, `Өмнөх хуудас`, `Дараагийн хуудас`, status `х. N` — PDF 원문 표기와 일치 확인 (구현 PR 시 grep) |
| PRD / traceability-matrix 갱신 | §3.7 에 양쪽 모두 +1 행 명시 |
| HourSection 변형 추가 | 없음 |
| `@fr FR-017j` 태그 부착 | §3.6 의 8건 모두에 부착 (필수) |
| `psalter/week-*.json` page 값 수정 | 없음 → verifier 무관 |
| 다른 데이터 영역 page 값 수정 | 없음 → verifier 무관 |
| `psalter-texts.json` ref/본문 수정 | 없음 → audit 무관 |

---

## 7. 위험 / Open Questions

### 7.1 Risks

| ID | 위험 | 심각도 | 완화 |
|----|------|-------|------|
| R-1 | iOS Safari edge-from-left back gesture 와 좌→우 스와이프(prev) 충돌 | HIGH | EDGE_DEADZONE 16px (좌측 가장자리) 에서는 swipe 무시. 실기기 테스트 필수 |
| R-2 | `touch-action` 설정으로 pinch-zoom 이 막힐 가능 | MEDIUM | `touch-action: pan-y pinch-zoom` 명시. iOS Safari 에서 pinch 동작 수동 확인 |
| R-3 | A2HS standalone 모드에서 브라우저 back 버튼 부재 → 플로팅 백버튼이 유일한 탈출구 | MEDIUM | 플로팅 버튼 z-index 충분, 다크모드 contrast, safe-area-inset 보정 |
| R-4 | swipe-spam 시 다중 render task 누적 → 메모리 spike / CPU 점유 | LOW | renderTaskRef.cancel + 100ms debounce + pdfDoc 단일 캐싱 |
| R-5 | sr-only 버튼이 시각 사용자에게 노출되어 레이아웃 깨짐 | LOW | Tailwind `sr-only` 표준 utility 사용, 검증 |
| R-6 | Playwright PointerEvents 시뮬레이션이 실제 모바일 swipe 와 정확히 동일하지 않아 e2e가 통과해도 실기기 실패 | MEDIUM | CLAUDE.md "테스트가 못 잡는 것" 정책 — 수동 체크리스트로 보강 |
| R-7 | desktop wide screen 에서 fit-to-width 가 과도 확대 | LOW | `max-w-[480px]` 또는 cssScale 클램프 1.5 |
| R-8 | aria-live 가 빠른 swipe 시 "х. 58, х. 59, х. 60" 누적 announce | LOW | debounce 와 자연 정합, 추가 throttle 불필요 |

### 7.2 Open Questions (구현 단계 결정 필요)

1. **fit-to-width 상한 cssScale 값**: 1.0 (정확 fit) / 1.5 (살짝 더 큼, 좌우 panning 필요) / 2.0 (확대) 중 어느 것? — **권장 1.0 으로 시작**, 사용자 피드백 따라 조정.
2. **임의 페이지 점프 UI**: 본 plan 에서는 제외. 970 페이지 책에서 +1/-1 만으로는 멀리 이동 불편. follow-up 후보 (e.g., 페이지 인디케이터 탭 → 모달 input)?
3. **adjacent ±1 prefetch**: 1차 구현에서는 비활성. 사용자 체감이 부족하면 follow-up.
4. **rubber band feedback**: boundary 시 시각 피드백 추가 여부. 1차에서는 단순 no-op.
5. **swipe gesture library**: native PointerEvents 권장하되, 구현 중 코드량이 100 LOC 이상 부풀면 `react-swipeable` 도입 재고 — 결정권은 구현 task 시점.

### 7.3 Out of scope (명시)

- 검색 / 텍스트 레이어 (selection)
- 북마크 / 즐겨찾기
- 두 페이지 동시 표시 모드 (현행 single half-page 유지)
- 다중 책 (psalter 외) — 현재 단일 PDF 자산 전제
- offline 모드에서 PDF 정적 캐싱 — `sw.js` script-only 정책 유지

---

## 8. 승인 후 후속 단계 (정보용, 본 task 무관)

1. plan approval → 별건 dispatch (`task #50` 등): 구현 + e2e + PRD/matrix 갱신을 묶은 단일 PR
2. 구현 PR 의 worktree 안에서 `/pair-coding` 또는 `/pair-process-workitem` 으로 진행
3. CLAUDE.md 의 변경 체크리스트 + §3.6 수동 모바일 체크리스트 모두 통과 후 머지
4. 머지 직후 Vercel 프로덕션에서 (a) 이전 SW 등록 보유 사용자 (b) A2HS PWA 사용자에게 새 빌드가 정상 적용되는지 1~2일 모니터링

---

*Plan 작성: planer (divineoffice cowork team), task #49, worktree `49-planer`.*
