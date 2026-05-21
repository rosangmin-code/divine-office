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
  # --- 중립 표면 (양피지 → 크림) ---
  surface: "#faf6ec"
  surface-container: "#f4ecd8"
  surface-container-high: "#ede2c9"
  border: "#e3d6ba"
  # --- 본문/잉크 ---
  on-surface: "#2b1f14"
  on-surface-strong: "#1f1610"
  on-surface-variant: "#7a6548"
  on-surface-faint: "#a08a5b"
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
    fontFamily: Noto Serif
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
- **Surface (#faf6ec) — 크림**: 카드/콘텐츠 표면. **Surface-container (#f4ecd8) — 양피지**: 페이지 바탕. 카드가 바탕보다 살짝 밝아 떠 보인다.
- **On-surface (#2b1f14) — 에스프레소 잉크**: 본문. **On-surface-strong (#1f1610)**: 제목. **On-surface-variant (#7a6548)**: 보조 텍스트. **On-surface-faint (#a08a5b)**: 메타·아이콘·라벨.
- **Border (#e3d6ba)**: 카드 1px 헤어라인 (그림자 대신 경계).
- **전례 절기색 (의미 전용)**: green/violet/red/rose/white. 절기에 따라 hero·구분선에만 제한적으로. **빨강(season-red)은 더 이상 일반 섹션 헤더에 쓰지 않는다** (악센트는 골드로 통일).

**다크 모드**: 바탕 #1a1510, 카드 #231c14, 잉크 #d6cfc7, 골드 #c9a961. 따뜻한 톤 유지.

## Typography

**Noto Serif = 신성/제목**, **Noto Sans = UI/본문**. 사용자가 설정에서 본문 서체(Sans↔Serif)와 글자 크기(9단계, 87.5%~200%)를 바꿀 수 있으므로 모든 크기는 `rem` 기반으로 스케일된다.

- **Display / Headline (Noto Serif 600)**: 기도 제목·시간전례 제목. 경전다운 격조.
- **Body-reading (Noto Serif 18px / 1.62)**: 기도 본문·시편. 긴 독서에 최적, 줄간 넉넉히.
- **Body-md (Noto Sans 16px)**: UI 텍스트·설명·목록.
- **Label (Noto Sans 12px 700, 대문자, 자간 0.12em)**: 섹션 라벨·메타 캡션. 한 화면에 폰트 두께 3종 이상 쓰지 않는다.

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
| 펼침/이동 | `chevron-right` / `chevron-left` |
| 절기/성당 | `church` |
| 글자 크기 ± | `a-large-small` (또는 `minus`/`plus`) |

## Components

- **Header bar**: sticky, surface-container + blur, 좌측 `arrow-left` 아이콘버튼(full, 38px) + 제목(title)/날짜(caption).
- **Hero card**: 기도 제목 블록. surface, rounded-lg. 절기 `church` 글리프(primary-container 배경) + kind 라벨(label, primary) + 제목(headline-lg) + 메타(caption).
- **Section label**: 섹션 구분은 빨강 헤더가 아니라 **label(대문자·faint) + 여백**으로. 접이식 섹션만 우측 `chevron-right`.
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
- **Do** 제목·기도 본문은 Noto Serif, UI 텍스트는 Noto Sans.
- **Don't** 빨강을 일반 섹션 헤더에 쓰기 — 절기 의미색으로만.
- **Don't** 둥근/각진 모서리 혼용.
- **Do** 모든 크기 `rem` 기반 — 9단계 글자 크기(최대 200%)에서 레이아웃 안 깨지게.
- **Do** 몽골어 키릴 맞춤법 준수("Гуйлтын" 아닌 ❌"Гүйлтын"), 외부 라벨 영어 혼입 금지(NFR-002).
- **Don't** footer 에 토글 화살표 부활 — 출처표시는 항상 노출.
