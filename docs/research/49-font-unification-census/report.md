# 앱 전체 유효 서체 경로 전수 감사

- 작업: `[#90-sub-4]` / WI 100
- 감사일: 2026-07-13
- 범위: `src/app`, `src/components`의 런타임 TSX/CSS. 테스트의 문자열·주석은 근거 확인에만 사용했다.
- 질문: g-46의 읽기 서체 통일 뒤에도 사용자가 일반 기도 화면에서 왜 여러 서체를 보는가?

## 결론

g-46은 **기도 본문(reading body)의 선택 경로만** `.font-reading`으로 통일했다. 앱 전체를 한 서체로 통일한 것은 아니다. 현재 계약과 구현은 일반 기도 화면에서 동시에 다음을 보여 주도록 되어 있다.

1. 기도 화면 `h1`: 항상 Noto Serif.
2. 기도 본문: 설정에 따라 Noto Sans 또는 Noto Serif.
3. 섹션 라벨·루브릭·시편 헤더·시편/복음찬가 antiphon: 항상 Noto Sans 상속.
4. 페이지·날짜 이동·선택기·하단 설정: 항상 Noto Sans 상속.

따라서 사용자가 “아직도 폰트가 여러 개”라고 느끼는 것은 재현 가능한 현재 동작이다. 특히 고전(serif) 읽기 설정에서는 각 시편 앞뒤의 antiphon이 sans, 가운데 본문이 serif라서 한 기도 단위 안에서 반복적으로 서체가 바뀐다. 이는 누락된 Tailwind 기본 스택의 우발적 누수라기보다 `globals.css` 주석에 명시된 현재 정책의 결과다.

실제 미해결 drift도 있다. `guide/page.tsx`와 `ordinarium/page.tsx`의 본문 하드코딩(병렬 WI에서 수정 중), 설정 미리보기의 선택 미반영, 사용되지 않는 `--font-family-*` 테마 변수, 그리고 Noto Serif 600 계약과 실제 로드 weight(400/700) 불일치다.

## 판정 기준과 실제 cascade

### 계약

`DESIGN.md` Typography는 다음을 말한다.

- Display / Headline: Noto Serif 600.
- Body-reading: Noto Serif 18px / 1.62.
- Body-md / Label: Noto Sans.
- 동시에 사용자가 본문 서체를 Sans↔Serif로 바꿀 수 있다.

더 최신이고 구체적인 구현 계약인 `src/app/globals.css:66-79`는 이 모호함을 다음과 같이 해소한다.

- 기도 본문만 `.font-reading`을 사용한다.
- `data-font-family=sans`(기본): `--reading-font = var(--font-sans), sans-serif`.
- `data-font-family=serif`: `--reading-font = var(--font-serif), serif`.
- 장식 제목은 `font-serif` 유지.
- 라벨·루브릭·헤더·antiphon은 클래스 없이 body sans 상속.

본 보고서의 `contract-expected`는 이 최신 구체 규칙을 우선한다. 다만 “Body-reading=Noto Serif”와 “기본 reading=Noto Sans”의 문서 자체 충돌은 `ambiguous`로 별도 기록한다.

### 유효 cascade

| 단계 | 근거 | 유효 결과 | 판정 |
|---|---|---|---|
| 폰트 파일 | `src/app/layout.tsx:7-19` | `next/font`가 Noto Sans 400/500/600/700, Noto Serif 400/700을 번들하고 `--font-sans`, `--font-serif`를 body 클래스에 주입 | compliant, 단 Serif 600 누락은 drift |
| 앱 기본값 | `src/app/layout.tsx:76-81` | `<body ... font-sans>` 때문에 클래스 없는 모든 자손은 Noto Sans 상속 | compliant |
| 설정 초기화 | `src/app/layout.tsx:58-70` | `html[data-font-family]`, 기본값 `sans` | compliant |
| 읽기 기본 | `src/app/globals.css:77` | `.font-reading`은 기본 Noto Sans | ambiguous: 구현 주석과는 일치, DESIGN의 고정 Serif body와는 불일치 |
| 읽기 고전 | `src/app/globals.css:78` | 고전 설정에서 `.font-reading`만 Noto Serif | compliant |
| 읽기 유틸리티 | `src/app/globals.css:79` | `font-family: var(--reading-font)` | compliant |
| Tailwind 테마 선언 | `src/app/globals.css:6-7` | `--font-family-sans/serif`는 Tailwind v4의 `font-sans/font-serif` namespace가 아니며 런타임 참조도 0건. 실제 서체는 next/font의 `--font-sans/serif`가 결정 | drift(죽은/오도하는 토큰), 현재 화면의 직접 원인은 아님 |
| 폰트 없는 요소 | 앱 전체 | body의 Noto Sans 상속. Tailwind preflight가 폼 컨트롤에도 inherit을 적용 | compliant; OS date-picker 내부 UI는 ambiguous |
| PDF 본문 | `src/components/pdf-viewer.tsx:343-350` | `<canvas>` 픽셀이므로 CSS font cascade 대상 아님; 원본 PDF 내장 서체 | intentional-exception |

`font-family`, `--font-*`, `font-sans`, `font-serif`, `font-reading` 외에 `style.fontFamily`/React `fontFamily` 지정은 0건이다. `font-family-heading` 같은 문자열은 element id/ARIA 참조일 뿐 서체 지정이 아니다.

## 명시적 서체 사이트 census

동일 파일에서 같은 역할·source·판정을 갖는 인접/반복 렌더 분기는 한 행으로 묶었다. 행 안의 모든 line은 grep hit 각각을 포함한다.

| SITE (file:line) | element role | current font source | contract-expected | VERDICT |
|---|---|---|---|---|
| `src/app/layout.tsx:11,18` | next/font CSS 변수 공급 | Noto Sans / Noto Serif | 두 번들 변수 | compliant |
| `src/app/layout.tsx:76` | 앱 전체 기본 | `font-sans` → body의 `--font-sans` | UI·라벨 기본 Noto Sans | compliant |
| `src/app/globals.css:6-7` | Tailwind 테마 토큰 | 미사용 `--font-family-sans/serif` | 실제 유틸리티 namespace 또는 제거 | drift |
| `src/app/globals.css:77-79` | 읽기 서체 SoT | 기본 Sans / 고전 Serif / `.font-reading` | 설정 구동 reading source | compliant(기본값 문서만 ambiguous) |
| `src/app/pray/[date]/[hour]/page.tsx:99` | 기도·시간전례 제목 | 강제 `font-serif`, weight 500 | Noto Serif 600 | drift: family는 compliant, weight와 로드 파일은 불일치 |
| `src/components/hymn-section.tsx:56` | plain hymn 본문 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/invitatory-section.tsx:86,87,157,167` | 초대송 versicle/response, 시편 본문, 영광송 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/opening-versicle-section.tsx:30,33,36` | 시작 versicle/response | `font-reading` | 설정 구동 reading | compliant |
| `src/components/psalm-block.tsx:175,252,288,308` | rich phrase, rich legacy, plain stanza, verse fallback 시편 본문 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/psalm-block.tsx:324` | Gloria Patri | `font-reading` | 기도 본문 reading | compliant |
| `src/components/psalm-block.tsx:359` | plain 시편 마침기도 | `font-reading` | 기도 본문 reading | compliant |
| `src/components/marian-antiphon-section.tsx:87` | 마리아 대송(마침 antiphon) 본문 | `font-reading` | 기도 본문 reading | compliant |
| `src/components/concluding-prayer-section.tsx:31` | plain 전체 마침기도 | `font-reading` | 기도 본문 reading | compliant |
| `src/components/prayer-sections/rich-content.tsx:15-16` | 모든 rich para/stanza/phrase/natural/sentence body (`:371-378,401-484,542-560`) | 공용 `BODY_CLASS=font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/examen-section.tsx:14` | 성찰 본문 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/short-reading-section.tsx:27` | 짧은 독서 fallback body | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/our-father-section.tsx:7` | 주님의 기도 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/blessing-section.tsx:14,17` | 축복 versicle/response | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/dismissal-section.tsx:28,31,35,38,42,45,54,57` | 파견 versicle/response 모든 분기 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/responsory-section.tsx:61,65,68,74,77,82,84` | 응송 call/response/Gloria | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/intercessions-section.tsx:95,102,112,151,180` | 청원 도입·후렴·항목, plain/rich 분기 | `font-reading` | 설정 구동 reading | compliant |
| `src/components/prayer-sections/gospel-canticle-section.tsx:425,432,446` | 복음찬가 verse, doxology, text fallback | `font-reading` | 설정 구동 reading | compliant |
| `src/app/settings/page.tsx:37` | Sans 선택 샘플 버튼 | 강제 `font-sans` | 선택지 자체 서체 표본 | intentional-exception |
| `src/app/settings/page.tsx:38` | Serif 선택 샘플 버튼 | 강제 `font-serif` | 선택지 자체 서체 표본 | intentional-exception |
| `src/app/guide/page.tsx:147,191,208` | 지침 문서 prose/versicle | 강제 `font-serif` | 읽기 설정을 따르는 `font-reading` | drift (병렬 WI 대상) |
| `src/app/guide/page.tsx:180` | 지침 문서 rubric-like item | 강제 `font-serif` | 최신 globals 규칙이면 sans rubric; 문서형 독서의 일부로 보면 reading | ambiguous (병렬 WI에서 결정 필요) |
| `src/app/ordinarium/page.tsx:103,132,135,145` | ordinarium 문단/versicle/시편 stanza | 강제 `font-serif` | `font-reading` | drift (병렬 WI 대상) |
| `src/app/ordinarium/page.tsx:111,154` | rubric/season label | 강제 `font-serif` | 최신 globals 규칙의 sans | drift (병렬 WI 대상) |
| `src/app/ordinarium/page.tsx:119` | ordinarium 내부 기도 제목 | 강제 `font-serif` | 신성/제목 Serif 또는 reading 중 정책 필요 | ambiguous |
| `src/app/ordinarium/page.tsx:158` | antiphon 목록 본문 | 강제 `font-serif` | 현재 prayer-screen antiphon 계약은 sans, 그러나 기도 문서 본문으로 보면 reading | ambiguous |

## 암시적(inherited) 서체 사이트 census

명시적 클래스가 없는 경로가 Tailwind default로 “새 서체”를 선택하는 것은 아니다. 모두 `layout.tsx:76`의 Noto Sans를 상속한다. 다만 반복 노출되는 역할을 빠짐없이 분류하면 다음과 같다.

| SITE (file:line) | element role | current font source | contract-expected | VERDICT |
|---|---|---|---|---|
| `src/components/prayer-sections/antiphon-box.tsx:19-25` | 모든 시편/찬가의 앞·뒤 antiphon + label | body `font-sans` 상속 | globals 주석상 antiphon은 항상 sans | compliant, 그러나 최상위 가시적 다중-font 원인 |
| `src/components/prayer-sections/gospel-canticle-section.tsx:160-178` | rich 복음찬가 antiphon | body `font-sans` 상속 | antiphon 항상 sans | compliant, 그러나 가시적 다중-font 원인 |
| `src/components/prayer-sections/gospel-canticle-section.tsx:296-359` | antiphon 선택 rubric/dropdown/options | body `font-sans` 상속 | UI/루브릭 sans | compliant |
| `src/components/prayer-sections/rich-content.tsx:380-388` | rich rubric-line | body `font-sans` 상속 | 루브릭 sans | compliant |
| `src/components/psalm-block.tsx:94-145` | 시편 종류·reference·title·preface header | body `font-sans` 상속 | header/caption sans | compliant, 그러나 serif body 사이에서 반복 전환 |
| `src/components/psalm-block.tsx:328-330,348-350` | Gloria 생략 note / 시편 마침기도 label | body `font-sans` 상속 | note/label sans | compliant |
| `src/components/prayer-sections/gospel-canticle-section.tsx:391-396,453-458` | 복음찬가 section label / missing note | body `font-sans` 상속 | label/note sans | compliant |
| `src/components/hymn-section.tsx:32-45,61-100` | hymn label, note, candidate picker | body `font-sans` 상속 | label/UI sans | compliant |
| `src/components/invitatory-section.tsx:33-146` | 초대송 labels, rubrics, pickers, 시편 title/epigraph | body `font-sans` 상속 | label/rubric/UI/header sans | compliant |
| `src/components/marian-antiphon-section.tsx:81-84,107+` | 마리아 대송 label 및 선택기 | body `font-sans` 상속 | label/UI sans | compliant |
| `src/components/opening-versicle-section.tsx:23-24`; `concluding-prayer-section.tsx:20-21`; `prayer-sections/{blessing,dismissal,examen,intercessions,our-father,responsory,short-reading}-section.tsx`의 section header | 기도 섹션 라벨·루브릭·메타 | body `font-sans` 상속 | label/rubric sans | compliant, 반복적인 시각 전환 원인 |
| `src/app/pray/[date]/[hour]/page.tsx:36,62,96,105`; `src/components/prayer-footer.tsx:127-145` | 오류/season label/date meta/하단 UI | body `font-sans` 상속 | UI·label sans | compliant |
| `src/components/month-nav.tsx:99-138`; `src/components/date-picker.tsx:9-28`; `src/components/liturgical-calendar-row.tsx:65-140`; `src/components/hour-card-list.tsx:13-60`; `src/components/celebration-picker.tsx:43+` | 홈 날짜 탐색·달력·시간 카드·선택기 | body `font-sans` 상속 | UI sans | compliant |
| `src/components/date-picker.tsx:10-20` | native date input | Tailwind preflight로 Noto Sans inherit; 내부 picker glyph는 OS | UI sans | ambiguous platform exception |
| `src/app/settings/page.tsx:94-290`; `src/components/install-app-section.tsx:133+` | 설정/설치 UI chrome | body `font-sans` 상속 | UI sans | compliant |
| `src/app/settings/page.tsx:196-205` | “Жишээ” font preview | body `font-sans` 상속, 선택값과 무관 | 선택된 reading font를 보여 주는 preview라면 `font-reading` | drift (샘플 선택 버튼 예외와 별개) |
| `src/components/pdf-viewer.tsx:267-340` | PDF page indicator/loading/error/download chrome | body `font-sans` 상속 | UI sans | compliant |
| `src/components/pdf-viewer.tsx:331-333` | PDF 오류 상세 `<pre>` | Tailwind preflight monospace | 진단 텍스트 | intentional-exception |
| `src/components/pdf-viewer.tsx:343-350` | PDF 실제 페이지 | canvas에 그려진 원본 PDF 서체 | 원본 보존 | intentional-exception |
| `src/app/{guide,ordinarium}/page.tsx`의 TOC/nav/page headings 및 `src/app/settings/page.tsx:107` | 문서/설정 페이지 제목과 heading | body `font-sans` 상속 | UI heading이면 sans, DESIGN의 모든 Headline을 문자 그대로 적용하면 Serif | ambiguous |
| `src/app/error.tsx`, `not-found.tsx`, `loading.tsx`, `src/components/footer.tsx`, `settings-link.tsx`, `page-ref.tsx` | 전역 UI·상태·링크 | body `font-sans` 상속 | UI sans | compliant |

## 일반 기도 화면의 가시적 offender 순위

1. **정책 자체의 2-family 구성** — `page.tsx:99`의 항상-Serif 제목과 body Sans 기본값 때문에 설정을 건드리지 않은 화면도 최소 두 family를 보여 준다. g-46의 “통일” 범위가 앱 전체가 아니라 reading body뿐이라는 이름/기대 차이가 가장 큰 원인이다.
2. **모든 시편/찬가 antiphon** — `antiphon-box.tsx:19-25`, `gospel-canticle-section.tsx:160-178`. 고전 설정에서도 항상 Sans이며, 각 시편의 Serif 본문 앞뒤에 반복돼 사용자가 가장 자주 보는 전환이다.
3. **반복 section/header/caption 층** — 각 섹션의 대문자 라벨, 시편 reference/title/preface, rubric가 모두 Sans다. 이것도 현재 globals 계약에는 맞지만 Serif reading 사이에 여러 번 끼어든다.
4. **Headline weight 불일치** — DESIGN은 Serif 600인데 `layout.tsx:14-19`는 Serif 400/700만 로드하고 기도 `h1`은 `font-medium`(500)이다. 브라우저의 합성 weight가 family 차이처럼 느껴질 수 있다.
5. **실제 남은 하드코딩** — guide/ordinarium의 Serif body. 일반 기도 route의 offender는 아니지만 앱 전체 설정 일관성을 깨며 병렬 WI가 수정 중이다.
6. **특수 화면 예외** — PDF canvas의 원본 서체, 오류 `<pre>` monospace, native date picker의 OS UI. 일반 기도 본문에는 나타나지 않는다.

## 수정 권고

### (a) 기계적으로 적용 가능한 class/token 수정

1. 병렬 WI의 `guide/page.tsx`, `ordinarium/page.tsx` body 경로를 `font-reading`으로 교체한다. rubric/heading/antiphon 행은 무차별 교체하지 말고 아래 계약 결정을 먼저 적용한다.
2. `src/app/settings/page.tsx:196-205` 미리보기가 실제 선택 서체를 보여 주어야 한다면 wrapper에 `font-reading`을 붙인다. `:37-38`의 두 선택 버튼은 의도적 표본이므로 유지한다.
3. `src/app/globals.css:6-7`의 미사용 `--font-family-*`를 제거하거나 실제 Tailwind v4/앱 token naming으로 정리한다. 지금은 cascade 설명을 오도한다.
4. Headline 계약을 유지한다면 Noto Serif `600`을 로드하고 기도 제목에 `font-semibold`을 쓴다. 또는 계약을 실제 500/합성 정책으로 수정한다.
5. labels/rubrics/headers/antiphons를 Sans로 유지한다면 상속에만 맡기지 말고 공용 role class/컴포넌트에 명시적 `font-sans`를 둘 수 있다. 이는 화면 변화 없이 회귀·부모 wrapper 누수를 막는다.

### (b) 계약 결정이 필요한 변경

1. 사용자의 “폰트 통일”이 **reading body만 통일**인지, **한 기도 화면의 모든 가시 텍스트를 한 family로 통일**인지 결정해야 한다. 후자라면 현재 g-46 계약을 바꿔야 한다.
2. antiphon을 “header/label”로 볼지 “기도 본문”으로 볼지 결정해야 한다. 사용자가 보는 문장 대부분은 실제 기도문이므로, `AntiphonBox`/`AntiphonRichBox`의 본문만 `font-reading`, prefix label만 `font-sans`로 나누는 안이 가장 좁은 변경이다.
3. 시편 title/preface와 Gloria/루브릭을 reading 설정에 포함할 범위를 결정해야 한다. 현재는 Gloria 본문만 reading이고 title/preface는 Sans다.
4. `DESIGN.md`의 “Body-reading=Noto Serif”와 “사용자 Sans↔Serif 선택”, globals의 “기본 Sans”를 하나의 문장으로 정합화해야 한다.
5. 문서 페이지(guide/ordinarium)의 h1/h2/h3/h4를 신성/제목 Serif로 볼지 UI 문서 navigation Sans로 볼지 정해야 한다. body class swap과 heading family 결정을 분리해야 한다.
6. PDF 페이지 자체는 CSS 통일 대상에서 제외할지 명시해야 한다. 포함하려면 canvas/PDF 렌더링 문제가 아니라 원본 PDF 재제작 문제다.

## 결과 증거

- **how**: `rg`로 `font-serif|font-sans|font-reading|font-family|--font-*` 전 occurrence를 수집하고, `layout.tsx`→`globals.css`→기도 renderer의 상속 경로를 파일 읽기로 교차 확인했다. 별도로 React inline `fontFamily`를 검색해 0건임을 확인했다.
- **what**: 기대된 “앱 전체 단일 유효 서체 경로”와 달리, 일반 기도 화면은 제목 Serif + 설정형 reading + Sans antiphon/label/header의 복수 경로를 의도적으로 유지한다. 실제 drift와 intentional exception을 위 표에서 분리했다.
- **where**: 이 보고서의 명시적/암시적 census 표와 offender 순위. 핵심 캡처 surface는 `src/app/pray/[date]/[hour]/page.tsx:99`, `src/components/prayer-sections/antiphon-box.tsx:19-25`, `src/components/psalm-block.tsx:94-175`, `src/app/globals.css:66-79`다.

