---
version: alpha
name: Цагийн Залбирал — Parchment Liturgical
description: >
  몽골어 성무일도(Liturgy of the Hours) PWA 의 디자인 시스템.
  따뜻한 양피지(parchment)·세피아 바탕에 황동골드(brass gold) 단일 악센트.
  경건하고 차분한 독서 경험 + 어르신 가독성 우선.
colors:
  # --- 단일 악센트 (황동골드) ---
  primary: "#9a7b2e"
  primary-hover: "#866a26"
  primary-container: "#f1e7cf"
  on-primary: "#fffaf0"
  on-primary-container: "#4a3a10"
  # --- 중립 표면 (Claude warm-canvas 채택: 따뜻한 크림) ---
  surface: "#fffdf9"
  surface-container: "#faf9f5"
  surface-container-high: "#f5f0e8"
  border: "#e6dfd8"
  # --- 본문/잉크 ---
  on-surface: "#2a2520"
  on-surface-strong: "#141413"
  on-surface-variant: "#6c6a64"
  on-surface-faint: "#8e8b82"
  # --- 전례 절기색 (의미 전용, 시즌 구동) ---
  season-green: "#2d6a4f"
  season-violet: "#7b2d8b"
  season-red: "#c1121f"
  season-rose: "#c76f93"
  season-white: "#d8cbb0"
  error: "#c1121f"
typography:
  display:
    fontFamily: Noto Serif
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.22
  headline-md:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
  body-reading:
    fontFamily: "--reading-font (Noto Sans default / Noto Serif user option)"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.62
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0.12em
  caption:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  page-margin: 16px
  max-width: 672px
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
components:
  header-bar:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    padding: 14px
  hero-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 18px
  section-label:
    textColor: "{colors.on-surface-faint}"
    typography: "{typography.label}"
  prayer-text:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-reading}"
  response-line:
    textColor: "{colors.primary}"
    typography: "{typography.body-reading}"
  reference-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 14px
  calendar-day:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 13px
  calendar-day-today:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.primary}"
  calendar-day-feast:
    textColor: "{colors.primary}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
    padding: 6px
  footer:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
---

# Цагийн Залбирал — Parchment Liturgical

성무일도 웹앱의 디자인 시스템 SSOT. 이 문서가 색·타이포·간격·아이콘·컴포넌트의 단일 진실원이며, UI 구현은 여기서 파생된다. 의도가 바뀌면 **이 문서를 먼저 고치고** 코드를 맞춘다.

## Overview

차분하고 경건한 **기도 독서** 경험이 목표다. 정체성은 **양피지·세피아 바탕 + 황동골드 단일 악센트** — 오래된 전례서의 따뜻함을 디지털로 옮긴 느낌. 화려함이 아니라 *고요함*이 미덕이다.

- **대상**: 몽골 가톨릭 신자, 어르신 비중 높음 → **가독성·고대비·큰 터치타깃**이 최우선.
- **감정**: 평화·신성·신뢰. 산만하지 않고, 한 화면에 강조는 하나만.
- **밀도**: 빽빽하지 않게. 여백으로 호흡을 준다 (특히 홈 달력 리스트).

## Colors

팔레트는 따뜻한 중립(양피지) 위에 **단 하나의 악센트(황동골드)**로 절제한다.

- **Primary (#9a7b2e) — 황동골드**: 유일한 상호작용/강조색. 제목 악센트, 응답구, 포커스, today/축일 표시, primary 버튼. 한 화면에 과용 금지.
- **Surface (#fffdf9) — 카드**: 콘텐츠 표면. **Surface-container (#faf9f5) — 크림 캔버스**: 페이지 바탕(Claude warm-canvas 채택). **Surface-container-high (#f5f0e8)**: 보조 표면. 카드가 바탕보다 살짝 밝아 떠 보인다.
- **On-surface (#2a2520) — 잉크**: 본문. **On-surface-strong (#141413)**: 제목. **On-surface-variant (#6c6a64)**: 보조 텍스트. **On-surface-faint (#8e8b82)**: 메타·아이콘·라벨.
- **Border (#e6dfd8)**: 카드 1px 헤어라인 (그림자 대신 경계).
- **전례 절기색 (의미 전용)**: green/violet/red/rose/white. 절기에 따라 hero·구분선에만 제한적으로. **빨강(season-red)은 더 이상 일반 섹션 헤더에 쓰지 않는다** (악센트는 골드로 통일).

**다크 모드**: 바탕 #1a1510, 카드 #231c14, 잉크 #d6cfc7, 골드 #c9a961. 따뜻한 톤 유지.

## Typography

서체는 태그나 페이지가 아니라 **텍스트 역할**로 결정한다. **Noto Serif = 신성/콘텐츠 제목**, **Noto Sans = UI chrome**, **reading font = 사용자가 읽는 본문**이다. 사용자가 설정에서 reading font(Sans↔Serif)와 글자 크기(9단계, 87.5%~200%)를 바꿀 수 있으므로 모든 크기는 `rem` 기반으로 스케일된다.

- **Display / Headline (Noto Serif 600)**: 기도 제목·시간전례 제목. 경전다운 격조.
- **Body-reading (사용자 설정, 기본 Noto Sans, 18px / 1.62)**: 기도 본문·시편과 긴 콘텐츠 본문. 긴 독서에 최적, 줄간 넉넉히.
- **Body-md (Noto Sans 16px)**: UI 텍스트·컨트롤 설명·탐색 목록.
- **Label (Noto Sans 12px 700, 대문자, 자간 0.12em)**: 섹션 라벨·메타 캡션. 한 화면에 폰트 두께 3종 이상 쓰지 않는다.

### 역할 → 서체 계약

| 역할 | 서체 원천 | 유틸리티 / 변수 | 예시 컴포넌트 |
|---|---|---|---|
| 신성·콘텐츠 제목 | 항상 Noto Serif | `font-serif` / `var(--font-serif)` | 기도 hero의 시간전례명, guide/ordinarium의 문서·장·절 제목 |
| 읽기 본문 | 사용자 설정: 기본 Noto Sans, 선택 시 Noto Serif | `font-reading` → `var(--reading-font)`; `body`의 `--font-sans` / `--font-serif`에서 파생 | 기도·시편·찬가·응답 본문, guide 설명문, ordinarium 기도문·시편·안티폰 내용, settings reading-font 미리보기 |
| UI chrome | 항상 Noto Sans | `font-sans` 또는 `body` 상속 / `var(--font-sans)` | 헤더·푸터·탐색·버튼·폼·설정 설명·목차·PDF viewer 오버레이 |
| 라벨·루브릭·메타 | 항상 Noto Sans | `font-sans` 또는 `body` 상속 / `var(--font-sans)` | 섹션 라벨, 안티폰 표지(`Шад дуулал`), 절기명·날짜·페이지 번호, guide/ordinarium의 짧은 지시문 |
| 서체 선택 샘플 | 샘플이 나타내는 서체를 명시 | `font-sans` 또는 `font-serif` | settings의 `Орчин үеийн` / `Сонгодог` 선택지 |
| PDF 원문 페이지 | PDF에 내장된 서체(앱 설정 대상 아님) | canvas 렌더; DOM font utility 없음 | `PdfViewer`의 PDF canvas |

**Drift 판정 규칙:** 사용자가 읽는 기도·전례·설명 본문은 페이지 종류와 관계없이 **반드시** `font-reading` / `--reading-font` 메커니즘을 사용한다. 본문에 `font-serif` 또는 `font-sans`를 직접 지정하면 drift다. 반대로 제목·UI·라벨 역할에 `font-reading`을 적용하는 것도 drift다.

비기도 페이지도 같은 역할 계약을 따른다.

- **Guide**: 문서·장·절 제목은 serif, 설명 본문은 reading font, 목차·링크·페이지 번호·짧은 루브릭은 sans.
- **Ordinarium**: 문서·장·절 제목은 serif, 기도문·시편·응답·안티폰 내용은 reading font, 탐색·페이지 번호·루브릭·절기 라벨은 sans.
- **Settings**: 페이지 전체 UI는 sans. 두 서체 선택지의 글자 모양 샘플만 각각 `font-sans` / `font-serif`이고, 실제 reading-font 미리보기 문장은 `font-reading`을 쓴다.
- **PDF viewer**: canvas의 원문 서체는 PDF 자체를 보존하고 설정으로 바꾸지 않는다. 페이지 표시·로딩·오류·탐색 등 앱 chrome은 sans다.

## Layout

- **모바일 우선**, 중앙 정렬 **max-width 672px**, 좌우 page-margin 16px(데스크탑 24px).
- **8px 간격 스케일**(4px 반 스텝). 카드 내부 패딩 18px로 호흡.
- 관련 항목은 카드로 묶는 **containment**. 홈 달력은 행간 여백을 늘려 빽빽함을 푼다.

## Elevation & Depth

그림자 대신 **톤 레이어 + 헤어라인**으로 깊이를 표현(flat·경건). 바탕(양피지) < 카드(크림)의 명도 차 + 1px border-색. 그림자는 sticky 상/하단 바의 미세 blur 정도만.

## Shapes

부드럽되 장난스럽지 않게. 카드 **rounded-lg(16px)**, 작은 표면 **md(12px)**, 칩·아이콘버튼 **full**. **한 화면에서 둥근/각진 모서리를 섞지 않는다.**

## Iconography

**단일 아이콘 패밀리 = [Lucide](https://lucide.dev)** (stroke 1.75, 크기 20–24px, on-surface-faint 색, 강조 시 primary). **이모지(📖⊙⚙)·유니코드 화살표(▾▴‹›☩)는 전면 금지** — 이전 디자인의 통일감 결여 주범.

**번들 필수 (CDN 금지)**: 아이콘은 반드시 앱 번들에 포함(`lucide-react` import 또는 인라인 SVG)한다. CDN(`unpkg` 등) 스크립트로 불러오면 느린/차단된 네트워크의 기기에서 로드 실패 → **빈 네모 박스**만 남는다(실제 발생). 아이콘은 항상 렌더되어야 한다.

**기능 있는 곳에만**: 아이콘은 의미·동작이 있는 자리(뒤로/설정/오늘/달력/링크 종류/이동)에만. **장식용 아이콘 박스 금지** — 특히 제목 앞 빈 글리프 박스처럼 의미 없이 자리만 차지하는 요소는 두지 않는다.

표준 매핑:

| 의미 | Lucide |
|---|---|
| 뒤로 | `arrow-left` |
| 설정 (Тохиргоо) | `settings` |
| 오늘 (Өнөөдөр) | `sunrise` |
| 달력/날짜 | `calendar-days` |
| 기도 안내(заавар) | `book-open` |
| 예식 순서(дэг жаяг) | `scroll-text` |
| 펼침/이동(가로) | `chevron-right` / `chevron-left` |
| 세로 토글(펼치기/접기) | `chevron-up` / `chevron-down` |
| 절기/성당 | `church` |
| 글자 크기 ± | `a-large-small` (또는 `minus`/`plus`) |
| 완료/설치됨 상태 | `check` (✓ 유니코드 대체) |

## Components

- **Header bar**: sticky, surface-container + blur, 좌측 `arrow-left` 아이콘버튼(full, 38px) + 제목(title)/날짜(caption).
- **Hero card**: 기도 제목 블록. surface, rounded-lg. 절기 `church` 글리프(primary-container 배경) + kind 라벨(label, primary) + 제목(headline-lg) + 메타(caption).
- **Section title (제목)**: 섹션 제목(예: Магтуу, Дуулал, Уншлага, Гуйлтын залбирал 등)은 **전례 빨강**(`--color-liturgical-red` = #c1121f / 다크 #ef4444)으로 **통일** — 미사경본·전례서의 루브릭 빨강 전통. 화면 전반에서 동일 색·동일 위계로. 접이식 섹션만 우측 `chevron-right`. (WCAG AA 대비 확인 필수.)
- **Prayer / Response / Verse**: body-reading. 응답구는 primary, 절번호는 faint·tabular.
- **Reference item**: surface 카드, 좌측 아이콘 글리프(primary-container) + 텍스트 + 우측 `chevron-right`.
- **Calendar day**: surface 카드 행. today=primary-container 배경, 축일=제목 primary(**대문자 골드 강조 금지** — 두께+색으로). 좌측 날짜 블록 + 우측 정보.
- **Footer**: surface-container, sticky(홈). 컨트롤은 **Өнөөдөр / Тохиргоо 2개뿐**(아이콘+라벨). **토글 화살표(chevron) 제거** — 교회 출처표시 2줄은 항상 작게(caption) 노출.
- **Font-size stepper**: [Aa−][Aa · 현재단계][Aa+], min 44×44 터치타깃, primary 테두리, 양끝 단계서 disabled.

## Do's and Don'ts

- **Do** 악센트(골드)는 한 화면에서 가장 중요한 요소 하나에만.
- **Don't** 이모지/유니코드 아이콘 사용 — **Lucide 단일 패밀리만**.
- **Do** WCAG AA 대비(본문 4.5:1) 유지 — 어르신 가독성 직결.
- **Don't** 한 화면에 폰트 두께 3종 이상.
- **Do** 신성·콘텐츠 제목은 Noto Serif, UI 텍스트는 Noto Sans, 읽기 본문은 `font-reading`으로 역할을 분리.
- **Do** 섹션 제목(heading)은 전례 빨강(`--color-liturgical-red`)으로 통일 — 미사경본 루브릭 전통(절기 의미색 용도와는 별개의 제목 통일색).
- **Don't** 둥근/각진 모서리 혼용.
- **Do** 모든 크기 `rem` 기반 — 9단계 글자 크기(최대 200%)에서 레이아웃 안 깨지게.
- **Do** 몽골어 키릴 맞춤법 준수("Гуйлтын" 아닌 ❌"Гүйлтын"), 외부 라벨 영어 혼입 금지(NFR-002).
- **Don't** footer 에 토글 화살표 부활 — 출처표시는 항상 노출.
