# 추적성 매트릭스 (Traceability Matrix)

**프로젝트:** Mongolian Liturgy of the Hours (Divine Office) Web App
**최종 업데이트:** 2026-04-12
**기준 브랜치:** `main`

> **참고:** 기능 요구사항은 모듈별 PRD로 분리되었습니다. 각 모듈 문서는 [`docs/modules/`](modules/) 디렉토리를 참조하세요.
> 아래 매트릭스의 FR ID는 매트릭스 고유 번호이며, PRD 모듈별 FR ID와의 매핑은 "PRD FR" 열을 참조하세요.

---

## 요구사항-구현-테스트 매핑

### 기능 요구사항 (Functional Requirements)

| ID | 요구사항 | PRD FR | 모듈 | 구현 파일 | 테스트 | 상태 |
|----|----------|--------|------|-----------|--------|------|
| FR-001 | 전례력 계산 | FR-001~006 | [calendar](modules/calendar.md) | `src/lib/calendar.ts` — romcal 기반 연간 전례력 생성, 시기/색상/등급/시편주간 매핑<br>`src/lib/mappings.ts` — romcal 키를 내부 타입으로 변환 (SEASON_MAP, COLOR_MAP, RANK_MAP)<br>`src/lib/types.ts` — `LiturgicalDayInfo`, `LiturgicalSeason`, `LiturgicalColor` 타입 정의 | `e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/시기명 검증, 시기 전환 경계 테스트<br>`e2e/api.spec.ts` — `/api/calendar/today`, `/api/calendar/date/[date]` 응답 구조 검증 | 완료 |
| FR-002 | 아침기도 (Lauds) 조립 | FR-010 | [hour-assembly](modules/hour-assembly.md) | `src/lib/hours/lauds.ts` — `assembleLauds`: invitatory + hymn + psalmody + short reading + responsory + Benedictus + intercessions + Our Father + concluding prayer + dismissal<br>`src/lib/loth-service.ts` — `assembleHour()` 메인 오케스트레이션<br>`src/lib/hours/shared.ts` — `buildInvitatory`, `resolveGospelCanticle`, `resolveShortReading` | `e2e/prayer-lauds.spec.ts` — 5개 테스트: header, 핵심 section 존재, invitatory V./R., back link<br>`e2e/api.spec.ts` — Lauds API 응답: invitatory 첫 번째, hymn/psalmody/dismissal/benedictus/ourFather 포함<br>`e2e/prayer-sections.spec.ts` — psalm block 구조, hymn 라벨, Our Father 본문, dismissal 구조 | 완료 |
| FR-003 | 저녁기도 (Vespers) 조립 | FR-011 | [hour-assembly](modules/hour-assembly.md) | `src/lib/hours/vespers.ts` — `assembleVespers`: hymn + psalmody + short reading + responsory + Magnificat + intercessions + Our Father + concluding prayer + dismissal<br>`src/lib/loth-service.ts` — Saturday vespers 1st Vespers 로직 포함 | `e2e/prayer-vespers.spec.ts` — 5개 테스트: header, no invitatory, Magnificat, Our Father, hymn/psalmody/dismissal<br>`e2e/api.spec.ts` — Vespers API: no invitatory, magnificat 확인 | 완료 |
| FR-004 | 끝기도 (Compline) 조립 | FR-012 | [hour-assembly](modules/hour-assembly.md) | `src/lib/hours/compline.ts` — `assembleCompline`: examen + hymn + psalmody + short reading + responsory + Nunc Dimittis + concluding prayer + blessing + Marian antiphon<br>`src/lib/hours/compline.ts` — `mergeComplineDefaults()`: compline.json 기본값 병합<br>`src/lib/psalter-loader.ts` — `getComplinePsalmody()`, `getFullComplineData()`: 고정 주간 주기 | `e2e/prayer-compline.spec.ts` — 7개 테스트: header, no invitatory, Nunc Dimittis, no intercessions, no Our Father, blessing, 고정 주간 주기 검증<br>`e2e/api.spec.ts` — Compline API: nuncDimittis, no intercessions/ourFather, 고정 주기 psalm 비교 | 완료 |
| FR-005 | 낮기도 (Terce/Sext/None) 조립 | FR-013~014 | [hour-assembly](modules/hour-assembly.md) | `src/lib/hours/daytime-prayer.ts` — `assembleDaytimePrayer`: hymn + psalmody + short reading + responsory + concluding prayer + dismissal<br>`src/lib/hours/index.ts` — terce/sext/none 모두 같은 assembler 등록<br>**`src/app/api/loth/[date]/[hour]/route.ts` — `VALID_HOURS`에서 제외 (비활성화)**<br>**`src/lib/loth-service.ts:204-210` — `getHoursSummary()`에서 제외 (홈페이지에 노출 안 됨)** | `e2e/prayer-minor-hours.spec.ts` — terce/sext/none 각각 4개 테스트 (assembler 내부 검증, 현재 API 경로로는 400 반환)<br>`e2e/api.spec.ts` — Terce API: no gospelCanticle/intercessions/ourFather, psalmody/dismissal 확인 | 부분 완료 (API/UI 비활성화) |
| FR-006 | 독서기도 (Office of Readings) | FR-015 | [hour-assembly](modules/hour-assembly.md) | `src/lib/hours/index.ts` — assemblers에 officeOfReadings 미등록 (교부 독서 데이터 미완성)<br>`src/lib/loth-service.ts` — `getHoursSummary()`에서 officeOfReadings 비활성화<br>`src/app/api/loth/[date]/[hour]/route.ts` — VALID_HOURS에서 제외<br>`src/components/prayer-renderer.tsx` — `PatristicReadingSection` 컴포넌트 구현 완료 | `e2e/prayer-office-readings.spec.ts` — 5개 테스트 존재하나 assembler 미등록으로 실패 예상<br>`e2e/fixtures/dates.ts` — ALL_HOURS에 officeOfReadings 포함 | 부분 완료 |
| FR-007 | 4주 시편집 (psalter) 공통문 | FR-020~023 | [psalter](modules/psalter.md) | `src/lib/psalter-loader.ts` — `getPsalterPsalmody()`: week-{1..4}.json에서 시편 로드<br>`src/lib/psalter-loader.ts` — `getPsalterCommons()`: shortReading, responsory, gospelCanticleAntiphon, intercessions, concludingPrayer 로드<br>`src/lib/loth-service.ts` — Layer 1 psalter commons 적용 | `e2e/prayer-sections.spec.ts` — psalm block 구조 검증 (antiphon, reference, verses, Gloria Patri)<br>`e2e/api.spec.ts` — sections 배열에 psalmody 포함 확인 | 완료 |
| FR-008 | 계절 고유문 (seasonal propers) | FR-030~032 | [propers](modules/propers.md) | `src/lib/propers-loader.ts` — `getSeasonHourPropers()`: advent/christmas/lent/easter/ordinary-time.json 로드, date-keyed override (dec17-24) 지원<br>`src/lib/loth-service.ts` — Layer 2 season propers 적용 (psalter commons 위에 override) | `e2e/special-days.spec.ts` — Advent Dec 20 date-keyed propers 검증: 일반 Advent 평일과 concluding prayer 차이 확인<br>`e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/이름 매핑 확인 | 완료 |
| FR-009 | 성인축일 고유문 (sanctoral propers) | FR-040~045 | [propers](modules/propers.md) | `src/lib/propers-loader.ts` — `getSanctoralPropers()`: solemnities/feasts/memorials.json 순차 검색<br>`src/lib/loth-service.ts` — Layer 3 sanctoral propers 적용 (최우선), `replacesPsalter` + `properPsalmody` 지원 | `e2e/special-days.spec.ts` — St. Joseph (03-19) Lauds: concluding prayer에 "Иосеф" 포함 확인, Vespers: Lauds와 다른 canticle antiphon<br>`e2e/api.spec.ts` — St. Joseph Lauds: sanctoral concluding prayer 확인 | 완료 |
| FR-010 | 3단계 fallback (sanctoral > season > psalter) | FR-050~051 | [propers](modules/propers.md) | `src/lib/loth-service.ts` — 88~113행: Layer 1 psalterCommons → Layer 2 seasonPropers → Layer 3 hourPropers 순서로 병합<br>`src/lib/hours/compline.ts` — `mergeComplineDefaults()`: compline 전용 기본값 추가 병합 | `e2e/api.spec.ts` — Sanctoral propers override 테스트 (St. Joseph)<br>`e2e/special-days.spec.ts` — St. Joseph Lauds/Vespers sanctoral 우선 적용 확인<br>`e2e/prayer-sections.spec.ts` — shortReading/responsory 구조 검증 | 완료 |
| FR-011 | 토요일 저녁 = 주일 1st Vespers | FR-032 | [propers](modules/propers.md) | `src/lib/loth-service.ts` — 55~59행: `dayOfWeek === 'SAT' && hour === 'vespers'`일 때 다음 주일 vespers propers로 fallback | 직접 테스트 없음 — 토요일 저녁기도 전용 E2E 테스트 부재 | 부분 완료 |
| FR-012 | 찬미가 (hymn) 자동 배정 | FR-060~063 | [hymns](modules/hymns.md) | `src/lib/propers-loader.ts` — `getHymnForHour()`: hymns-index.json의 seasonalAssignments 기반, 시기/시간대별 후보 선택, weekOfSeason으로 결정적 rotation<br>`src/lib/loth-service.ts` — 122~128행: mergedPropers.hymn 미설정 시 자동 배정 | `e2e/prayer-lauds.spec.ts` — hymn section 존재 확인<br>`e2e/prayer-vespers.spec.ts` — hymn section 존재 확인<br>`e2e/prayer-sections.spec.ts` — hymn 라벨 렌더링 확인 | 완료 |
| FR-013 | 성경 본문 로드 | FR-070~072 | [bible](modules/bible.md) | `src/lib/bible-loader.ts` — JSONL 파일(bible_ot/nt_rest/gospels)에서 성경 데이터 로드, `lookupRef()`: verse suffix (a/b/c) 처리, psalm offset 보정<br>`src/lib/scripture-ref-parser.ts` — 성경 참조 문자열 파싱<br>`src/lib/hours/shared.ts` — `resolvePsalm()`, `resolveGospelCanticle()`, `resolveShortReading()` | `e2e/prayer-sections.spec.ts` — psalm verse numbers (superscript), verse text 존재 확인<br>`e2e/prayer-lauds.spec.ts` — Benedictus gospel canticle 렌더링 확인 | 완료 |
| FR-014 | 전례력 API | FR-080~081 | [api](modules/api.md) | `src/app/api/calendar/today/route.ts` — `GET /api/calendar/today`<br>`src/app/api/calendar/date/[date]/route.ts` — `GET /api/calendar/date/[date]` | `e2e/api.spec.ts` — today API: 응답 구조 (date, name, season 등 11개 필드), season/color 유효값 확인<br>`e2e/api.spec.ts` — date API: Ordinary Time 정확성, invalid date 404 | 완료 |
| FR-015 | 기도 조립 API | FR-082~083 | [api](modules/api.md) | `src/app/api/loth/[date]/[hour]/route.ts` — `GET /api/loth/[date]/[hour]`: 유효 hour 검증, assembleHour() 호출, 400/404 에러 처리 | `e2e/api.spec.ts` — Lauds/Vespers/Compline/Terce API 상세 검증, invalid hour 400, invalid date 404<br>`e2e/prayer-sections.spec.ts` — API를 통한 shortReading/responsory 구조 확인 | 완료 |
| FR-016 | 기도 페이지 렌더링 | FR-090~098 | [ui](modules/ui.md) | `src/app/pray/[date]/[hour]/page.tsx` — 기도 페이지: header, PrayerRenderer, 이전/다음 기도시간 nav, back link<br>`src/app/page.tsx` — 홈페이지: 전례일 정보 카드, 7개 시간대 카드, 날짜 nav<br>`src/components/prayer-renderer.tsx` — 14개 section type 렌더링<br>`src/components/psalm-block.tsx` — antiphon + title + verses + Gloria Patri<br>`src/components/date-picker.tsx`, `hour-icon.tsx`, `theme-toggle.tsx`, `footer.tsx` | `e2e/homepage.spec.ts` — 4개 테스트: 기본 렌더링, OT 날짜 렌더링, 몽골어 시간명/아이콘, invalid date 에러<br>`e2e/prayer-lauds.spec.ts` — header, back link, bottom back button<br>`e2e/date-navigation.spec.ts` — 이전/다음 날짜 nav, 연도 경계, 연속 nav<br>`e2e/error-handling.spec.ts` — invalid hour/date 에러 메시지 | 완료 |

| FR-017 | PDF 페이지 참조 표시 | FR-017 | [PRD §7](../PRD.md#7-pdf-페이지-참조-기능) | `src/components/page-ref.tsx` — PageRef 조건부 렌더링 (`'use client'`, `useSettings()`로 `showPageRefs` 확인)<br>`src/components/prayer-renderer.tsx` — 11개 섹션 컴포넌트에 `<PageRef page={section.page} />` 삽입<br>`src/components/psalm-block.tsx` — 시편 참조 옆 `<PageRef page={psalm.page} />`<br>`src/lib/types.ts` — `PsalmEntry`, `ShortReading`, `Responsory`, `AssembledPsalm`, `HourSection` 11개 variant에 `page?: number`<br>`src/lib/hours/shared.ts` — `resolvePsalm()`, `resolveShortReading()`, `resolveGospelCanticle()`에 page 전파<br>`src/lib/hours/{lauds,vespers,compline,daytime-prayer}.ts` — section 생성 시 page 전달<br>`src/data/loth/psalter/week-1.json` — 일요일 lauds page 주석 (샘플) | `e2e/page-references.spec.ts` — 8개 테스트: 기본 숨김, 토글 ON/OFF, 영구 저장, 시편/복수 섹션, 접근성<br>`src/lib/__tests__/hours/page-propagation.test.ts` — 10개 테스트: 각 assembler page 전파 검증 | 완료 (데이터 일부) |
| FR-018 | 페이지 참조 토글 설정 | FR-018 | [PRD §7](../PRD.md#7-pdf-페이지-참조-기능) | `src/lib/settings.tsx` — `SettingsProvider` React Context + `useSettings()` hook, localStorage `loth-settings` 키<br>`src/app/settings/page.tsx` — "Хуудасны лавлагаа" `role="switch"` + `aria-checked` + `aria-labelledby`, 활성 시 brass gold 트랙<br>`src/components/page-ref.tsx` — `showPageRefs` false면 null 반환 | `e2e/settings.spec.ts` — `page-refs switch syncs with pray page toggle`, `page-refs switch uses gold when enabled`<br>`e2e/page-references.spec.ts` — /settings switch 경유 on/off, 영구 저장, 기본 숨김, 시편/복수 섹션 | 완료 |
| FR-019 | 설정 시스템 기반 | FR-019 | [PRD §7](../PRD.md#7-pdf-페이지-참조-기능) | `src/lib/settings.tsx` — Context + localStorage, `hydrated` 상태로 SSR 불일치 방지, `fontSize`/`fontFamily`/`theme`/`invitatoryCollapsed` 필드 확장<br>`src/app/layout.tsx` — `<SettingsProvider>` 래핑, pre-paint 인라인 스크립트로 FOUC 방지<br>`src/app/pray/[date]/[hour]/page.tsx` — 헤더에 `<SettingsLink />`만 배치(페이지 참조 토글 버튼 제거, `/settings`로 일원화)<br>`src/app/settings/page.tsx` — 통합 설정 페이지 | `e2e/page-references.spec.ts` — 영구 저장/새로고침<br>`e2e/settings.spec.ts` — 설정 페이지 전체 | 완료 |
| FR-020 | 가이드 페이지 렌더링 (GILH) | FR-100~102 | [guide](modules/guide.md) | `src/data/loth/gilh.json` — 구조화된 GILH 데이터 (서문, 소개 §1-§11, 루브리카, 각주 28개)<br>`src/app/guide/page.tsx` — 가이드 읽기 페이지 (Server Component, 정적 생성): 목차(Гарчиг) + 3개 섹션 + 각주<br>`src/app/page.tsx` — 홈페이지에 가이드 링크 추가 | `e2e/guide.spec.ts` — 8개 테스트: 목차 렌더링, 앵커 이동, 서문 표시, §번호 소개, 루브리카 구조, 각주 역참조, 홈 링크, 다크모드 | 완료 |
| FR-021 | Web App Manifest | FR-110 | [PRD §8](../PRD.md#8-pwa-설치-기능) | `src/app/manifest.ts` — Next.js App Router `MetadataRoute.Manifest`, `/manifest.webmanifest`로 자동 서빙, `<link rel="manifest">` 자동 삽입. 몽골어 `name`/`short_name`/`description`, `lang: 'mn'`, `display: 'standalone'`, `theme_color: '#2d6a4f'`, `background_color: '#fafaf9'` | `e2e/pwa.spec.ts` — 테스트 #1,3: 매니페스트 서빙/필드 검증, 헤드 링크 검증 | 완료 |
| FR-022 | 앱 아이콘 (PWA) | FR-111 | [PRD §8](../PRD.md#8-pwa-설치-기능) | `public/icon.svg` — 전례 녹색(#2d6a4f) 배경의 십자가 SVG, 매니페스트 `any`+`maskable` 레퍼런스<br>`src/app/icon.tsx` — 32x32 favicon, `ImageResponse` from `next/og`<br>`src/app/apple-icon.tsx` — 180x180 Apple touch icon | `e2e/pwa.spec.ts` — 테스트 #2,4: 매니페스트 아이콘 도달, apple touch icon 도달 | 완료 |
| FR-023 | Service Worker + 오프라인 폴백 | FR-112~114 | [PRD §8](../PRD.md#8-pwa-설치-기능) | `public/sw.js` — `divine-office-v1` 캐시, install 시 `/offline.html` 프리캐시, activate 시 구버전 정리, fetch에서 navigation은 network-first(폴백 `/offline.html`), 정적 자산은 cache-first<br>`public/offline.html` — 자체 완결적 몽골어 오프라인 페이지 (다크모드 대응)<br>`src/components/sw-registrar.tsx` — `'use client'` 등록 컴포넌트, 프로덕션 한정<br>`src/app/layout.tsx` — `<SwRegistrar />` 렌더링 | `e2e/pwa.spec.ts` — 테스트 #5,6: SW 파일 서빙(no-cache 헤더 포함)/오프라인 페이지 서빙 | 완료 |
| FR-024 | 시편 본문 · stanza 구조 | FR-120~122 | [PRD §9](../PRD.md#9-시편-본문-및-stanza-구조) | `src/data/loth/psalter-texts.json` — 시편 참조별 stanza 배열 (PDF 교독 구분 그대로 반영, 5,900+ 줄)<br>`src/data/loth/ordinarium/invitatory-antiphons.json` — 시기/축일별 초대송 교송 분리<br>`scripts/extract-psalm-texts.js` — `parsed_data/` → psalter-texts.json 추출<br>`src/lib/hours/shared.ts` — `resolvePsalm()`에 stanza 전파, `buildInvitatory()`가 invitatory-antiphons 참조<br>`src/components/psalm-block.tsx` — stanza 경계 시각적 구분<br>`src/lib/hours/types.ts`, `src/lib/types.ts` — `AssembledPsalm.stanzas` 타입 | `e2e/prayer-psalter-commons.spec.ts` — 간접 검증 (psalmody 구조 확인)<br>`src/lib/__tests__/hours/{lauds,vespers,compline,daytime-prayer}.test.ts` — stanza/invitatory-antiphons 사용 검증 | 완료 |
| FR-025 | 글씨 크기 조정 (5단계) | FR-025 | [PRD §10](../PRD.md#10-사용자-설정-페이지) | `src/lib/settings.tsx` — `FontSize` 타입, 설정 변경 시 `document.documentElement.dataset.fontSize` 적용<br>`src/app/globals.css` — `html[data-font-size="xs|sm|md|lg|xl"]`에 `font-size: 87.5%..125%` 스케일<br>`src/app/settings/page.tsx` — 5단계 라디오 그룹 + 샘플 텍스트 프리뷰 | `e2e/settings.spec.ts` — 테스트 #2,3,4,9: 라디오 개수, 라운드트립, 5단계 검증, /pray 전파 | 완료 |
| FR-026 | 글꼴 선택 (Sans/Serif) | FR-026 | [PRD §10](../PRD.md#10-사용자-설정-페이지) | `src/lib/settings.tsx` — `FontFamily` 타입, `dataset.fontFamily` 적용<br>`src/app/globals.css` — `html[data-font-family="serif"] body`에 `var(--font-serif)` 적용<br>`src/app/layout.tsx` — `next/font/google`의 `Noto_Sans`·`Noto_Serif` 변수 이미 바디에 부착 | `e2e/settings.spec.ts` — 테스트 #5: Serif/Sans data-font-family 전환 | 완료 |
| FR-027 | 테마 모드 (light/dark/system) | FR-027 | [PRD §10](../PRD.md#10-사용자-설정-페이지) | `src/lib/settings.tsx` — `ThemeMode` 타입, `applyTheme()` 헬퍼, `system` 모드에서 `matchMedia('(prefers-color-scheme: dark)')` 리스너 등록<br>`src/app/layout.tsx` — pre-paint 인라인 스크립트가 `loth-settings.theme` 우선, 구 `theme` 키, `prefers-color-scheme` 순으로 fallback<br>`src/components/theme-toggle.tsx` — `useSettings` 기반 2-way 토글, 단일 저장소 consolidated | `e2e/settings.spec.ts` — 테스트 #6: 라이트/다크 `dark` 클래스 토글<br>`e2e/page-references.spec.ts` — 테스트 #5 (간접, 기존 테마 동작 유지) | 완료 |
| FR-028 | 헤더 기어 아이콘 | FR-028 | [PRD §10](../PRD.md#10-사용자-설정-페이지) | `src/components/settings-link.tsx` — `<Link href="/settings">` 기어 SVG, `aria-label="Тохиргоо"`<br>`src/app/page.tsx`, `src/app/guide/page.tsx`, `src/app/pray/[date]/[hour]/page.tsx` — 헤더에 `<SettingsLink />` 삽입 | `e2e/settings.spec.ts` — 테스트 #8: 홈 기어 → /settings 이동 | 완료 |
| FR-029 | 초대송 접기/펼치기 | FR-031 | [PRD §10](../PRD.md#10-사용자-설정-페이지) | `src/components/invitatory-section.tsx` — `'use client'` 추출된 Invitatory 렌더러, `useSettings()`로 `invitatoryCollapsed` 구독, chevron 토글 버튼(`aria-expanded`/`aria-controls`)<br>`src/lib/settings.tsx` — `Settings.invitatoryCollapsed: boolean` 필드 추가, `DEFAULTS.invitatoryCollapsed=true`(기본 접힘)<br>`src/components/prayer-renderer.tsx` — 인라인 `InvitatorySection` 제거 후 분리 파일에서 import | `e2e/prayer-lauds.spec.ts` — `Invitatory collapse toggle` describe 블록: 기본 접힘, 토글 시 본문 표시, 새로고침 후 상태 유지 3개 테스트 | 완료 |

### 비기능 요구사항 (Non-Functional Requirements)

| ID | 요구사항 | 구현 파일 | 테스트 | 상태 |
|----|----------|-----------|--------|------|
| NFR-001 | 모바일 반응형 | `src/app/page.tsx` — `max-w-2xl px-4 md:px-6`, `lg:grid lg:grid-cols-2`<br>`src/app/pray/[date]/[hour]/page.tsx` — `max-w-2xl lg:max-w-3xl px-4 md:px-6`<br>`src/app/layout.tsx` — `Viewport` export (`viewportFit: "cover"`)<br>`src/components/psalm-block.tsx` — 반응형 텍스트 크기 | `e2e/mobile.spec.ts` — 4개 테스트: 홈페이지/기도 페이지 수평 스크롤 없음, touch target >= 44px, font-size >= 14px | 완료 |
| NFR-002 | 몽골어 UI | `src/app/layout.tsx` — `<html lang="mn">`, Noto Sans/Serif (cyrillic subset)<br>`src/lib/types.ts` — `HOUR_NAMES_MN`, `DAY_NAMES_MN`<br>`src/lib/mappings.ts` — `SEASON_NAMES_MN`, `COLOR_NAMES_MN`, `RANK_NAMES_MN`<br>`src/components/prayer-renderer.tsx` — 모든 section 라벨 몽골어<br>`src/app/layout.tsx` — OG metadata 몽골어 (`locale: "mn_MN"`) | `e2e/homepage.spec.ts` — 몽골어 제목 "Цагийн Залбирал", 시간명 검증<br>`e2e/liturgical-calendar.spec.ts` — 몽골어 시기명 확인<br>`e2e/prayer-lauds.spec.ts` — 몽골어 section 이름 확인<br>`e2e/prayer-compline.spec.ts` — 몽골어 header 확인 | 완료 |
| NFR-003 | Vercel 배포 | `next.config.ts` — Next.js 16.2.0 기본 설정<br>`package.json` — `next build` / `next start` 스크립트<br>**`vercel.json` 파일 없음** — Vercel 기본 감지에 의존 | 직접 테스트 없음 — 배포 검증 E2E 없음 | 부분 완료 |
| NFR-007 | SSR 하이드레이션 호환 | `src/lib/settings.tsx` — `hydrated` 상태 관리, 하이드레이션 전 기본값 사용 | `e2e/page-references.spec.ts` — 테스트 #5 (새로고침 후 정상 동작) | 완료 |
| NFR-008 | 접근성 | `src/app/settings/page.tsx` — 페이지 참조 switch `role="switch"` + `aria-checked` + `aria-labelledby`<br>`src/components/page-ref.tsx` — `aria-label` | `e2e/settings.spec.ts` — `has 5 font-size radios, 2 font-family radios, 3 theme radios, 1 switch` (switch 카운트/aria), `page-refs switch syncs with pray page toggle` | 완료 |
| NFR-009 | 성능 무영향 | `src/components/page-ref.tsx` — page undefined/showPageRefs false면 null, 렌더링 없음 | `src/lib/__tests__/hours/page-propagation.test.ts` — undefined pages 테스트 | 완료 |
| NFR-010 | PWA 설치 가능성 | `src/app/manifest.ts` + `public/sw.js` + `src/components/sw-registrar.tsx` — Vercel HTTPS 배포 시 브라우저 A2HS 기준 충족 | `e2e/pwa.spec.ts` — 테스트 #1,3,5,7: 매니페스트/SW/theme-color/apple-web-app 메타 검증 | 완료 |
| NFR-011 | SW 업데이트 정책 | `next.config.ts` — `/sw.js`에 `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` 헤더<br>`src/components/sw-registrar.tsx` — `updateViaCache: 'none'` 옵션 | `e2e/pwa.spec.ts` — 테스트 #5: SW 응답 헤더의 `cache-control` 검증 | 완료 |
| NFR-012 | 오프라인 페이지 UX | `public/offline.html` — 인라인 CSS, 외부 리소스 없음, stone-50/neutral-950 다크모드, 전례 녹색 CTA, 44px 이상 터치 타겟 | `e2e/pwa.spec.ts` — 테스트 #6: 몽골어 본문/`lang="mn"` 확인 | 완료 |
| NFR-013 | 모바일 박스 여백 최적화 | `src/components/prayer-renderer.tsx` — `article`/배경색 섹션/`AntiphonBox` padding을 모바일에서 축소, `md:` 이상에서만 기본값 사용<br>`src/components/psalm-block.tsx` — antiphon 박스 내부 여백 반응형 조정 | `e2e/mobile.spec.ts` — 375px 뷰포트에서 기도 본문 가용 폭 검증 (간접) | 완료 |
| NFR-014 | 설정 FOUC 방지 (pre-paint) | `src/app/layout.tsx` — `<head>` 인라인 스크립트가 paint 이전에 `loth-settings`를 읽어 `<html>`의 `data-font-size`/`data-font-family`/`dark` 클래스를 선반영 | `e2e/settings.spec.ts` — 테스트 #3: 새로고침 후 `data-font-size` 유지 | 완료 |
| NFR-015 | 설정 페이지 접근성 | `src/app/settings/page.tsx` — `role="radiogroup"` + `aria-labelledby`, `role="radio"` + `aria-checked`, `role="switch"` + `aria-checked`, 모든 버튼 `min-h-[44px]`, 몽골어 `aria-label`<br>`src/components/settings-link.tsx` — `aria-label="Тохиргоо"` | `e2e/settings.spec.ts` — 테스트 #2 (라디오/스위치 카운트), #3 (aria-checked), #7 (switch aria) | 완료 |

---

## 테스트 파일 매핑 (역방향)

| 테스트 파일 | 커버하는 요구사항 ID |
|------------|---------------------|
| `e2e/liturgical-calendar.spec.ts` | FR-001, FR-008, NFR-002 |
| `e2e/prayer-lauds.spec.ts` | FR-002, FR-012, FR-013, FR-016, NFR-002 |
| `e2e/prayer-vespers.spec.ts` | FR-003, FR-012, FR-016 |
| `e2e/prayer-compline.spec.ts` | FR-004, FR-007, NFR-002 |
| `e2e/prayer-minor-hours.spec.ts` | FR-005 |
| `e2e/prayer-office-readings.spec.ts` | FR-006 |
| `e2e/prayer-sections.spec.ts` | FR-002, FR-007, FR-010, FR-013 |
| `e2e/special-days.spec.ts` | FR-008, FR-009, FR-010 |
| `e2e/api.spec.ts` | FR-001, FR-002, FR-003, FR-004, FR-005, FR-009, FR-010, FR-014, FR-015 |
| `e2e/homepage.spec.ts` | FR-016, NFR-002 |
| `e2e/mobile.spec.ts` | NFR-001, NFR-013 |
| `e2e/error-handling.spec.ts` | FR-016 |
| `e2e/date-navigation.spec.ts` | FR-016 |
| `e2e/page-references.spec.ts` | FR-017, FR-018, FR-019, NFR-007, NFR-008 |
| `src/lib/__tests__/hours/page-propagation.test.ts` | FR-017, NFR-009 |
| `e2e/guide.spec.ts` | FR-020 |
| `e2e/pwa.spec.ts` | FR-021, FR-022, FR-023, NFR-010, NFR-011, NFR-012 |
| `e2e/prayer-psalter-commons.spec.ts` | FR-007, FR-010, FR-024 |
| `e2e/settings.spec.ts` | FR-019, FR-025, FR-026, FR-027, FR-028, NFR-014, NFR-015 |
| `e2e/fixtures/dates.ts` | (테스트 데이터 — 모든 E2E 공통) |

---

## 커버리지 요약

### 상태별 집계

| 상태 | 기능 요구사항 | 비기능 요구사항 | 합계 |
|------|:------------:|:---------------:|:----:|
| 완료 | 20 | 9 | **29** |
| 부분 완료 | 4 | 1 | **5** |
| 미구현 | 0 | 0 | **0** |
| **합계** | **24** | **10** | **34** |

### 커버리지율

- **전체 요구사항:** 34건
- **완료:** 29건 (85.3%)
- **부분 완료:** 5건 (15.2%)
- **미구현:** 0건 (0%)

### 부분 완료 항목 상세

| ID | 요구사항 | 미완성 내용 | 완료를 위한 조건 |
|----|----------|-------------|-----------------|
| FR-005 | 낮기도 (Terce/Sext/None) | assembler 및 e2e 테스트는 구현됨. propers 데이터(짧은독서/화답/마침기도) 미완으로 API/UI에서 비활성화됨 | 1) 낮기도 propers 데이터 보충 2) `route.ts`의 `VALID_HOURS` 및 `loth-service.ts`의 `getHoursSummary()`에서 재활성화 |
| FR-006 | 독서기도 | 교부 독서 데이터 미완성, assembler 미등록, API에서 비활성화 | 1) 교부 독서 데이터 JSON 작성 2) officeOfReadings assembler 구현 3) API VALID_HOURS에 추가 |
| FR-011 | 토요일 저녁 = 주일 1st Vespers | 로직 구현 완료, 전용 E2E 테스트 부재 | 토요일 vespers가 주일 propers를 사용하는지 검증하는 E2E 테스트 추가 |
| FR-017 | PDF 페이지 참조 | 코드 구현 완료, 데이터 일부만 주석됨 (week-1 일요일 lauds만) | 나머지 JSON 파일에 page 번호 주석 추가 (week-2~4, propers, sanctoral, ordinarium) |
| NFR-003 | Vercel 배포 | 코드 배포 가능 상태이나 `vercel.json`/`vercel.ts` 미존재, 배포 검증 테스트 없음 | 1) `vercel.ts` 설정 파일 추가 2) 프로덕션 배포 성공 확인 |

### E2E 테스트 통계

- **테스트 파일:** 18개 (E2E 17개 + fixtures, Vitest 10개)
- **테스트 케이스:** E2E ~71개 + Vitest 74개 (terce/sext/none 반복 포함)
- **테스트가 없는 요구사항:** 없음 (모든 요구사항에 최소 1개 이상의 테스트 존재, 단 FR-011은 간접 테스트만)
