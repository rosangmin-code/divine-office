# 추적성 매트릭스 (Traceability Matrix)

**프로젝트:** Mongolian Liturgy of the Hours (Divine Office) Web App
**최종 업데이트:** 2026-04-09
**기준 브랜치:** `main`

---

## 요구사항-구현-테스트 매핑

### 기능 요구사항 (Functional Requirements)

| ID | 요구사항 | 구현 파일 | 테스트 | 상태 |
|----|----------|-----------|--------|------|
| FR-001 | 전례력 계산 | `src/lib/calendar.ts` — romcal 기반 연간 전례력 생성, 시기/색상/등급/시편주간 매핑<br>`src/lib/mappings.ts` — romcal 키를 내부 타입으로 변환 (SEASON_MAP, COLOR_MAP, RANK_MAP)<br>`src/lib/types.ts` — `LiturgicalDayInfo`, `LiturgicalSeason`, `LiturgicalColor` 타입 정의 | `e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/시기명 검증, 시기 전환 경계 테스트<br>`e2e/api.spec.ts` — `/api/calendar/today`, `/api/calendar/date/[date]` 응답 구조 검증 | 완료 |
| FR-002 | 아침기도 (Lauds) 조립 | `src/lib/hours/lauds.ts` — `assembleLauds`: invitatory + hymn + psalmody + short reading + responsory + Benedictus + intercessions + Our Father + concluding prayer + dismissal<br>`src/lib/loth-service.ts` — `assembleHour()` 메인 오케스트레이션<br>`src/lib/hours/shared.ts` — `buildInvitatory`, `resolveGospelCanticle`, `resolveShortReading` | `e2e/prayer-lauds.spec.ts` — 5개 테스트: header, 핵심 section 존재, invitatory V./R., back link<br>`e2e/api.spec.ts` — Lauds API 응답: invitatory 첫 번째, hymn/psalmody/dismissal/benedictus/ourFather 포함<br>`e2e/prayer-sections.spec.ts` — psalm block 구조, hymn 라벨, Our Father 본문, dismissal 구조 | 완료 |
| FR-003 | 저녁기도 (Vespers) 조립 | `src/lib/hours/vespers.ts` — `assembleVespers`: hymn + psalmody + short reading + responsory + Magnificat + intercessions + Our Father + concluding prayer + dismissal<br>`src/lib/loth-service.ts` — Saturday vespers 1st Vespers 로직 포함 | `e2e/prayer-vespers.spec.ts` — 5개 테스트: header, no invitatory, Magnificat, Our Father, hymn/psalmody/dismissal<br>`e2e/api.spec.ts` — Vespers API: no invitatory, magnificat 확인 | 완료 |
| FR-004 | 끝기도 (Compline) 조립 | `src/lib/hours/compline.ts` — `assembleCompline`: examen + hymn + psalmody + short reading + responsory + Nunc Dimittis + concluding prayer + blessing + Marian antiphon<br>`src/lib/hours/compline.ts` — `mergeComplineDefaults()`: compline.json 기본값 병합<br>`src/lib/psalter-loader.ts` — `getComplinePsalmody()`, `getFullComplineData()`: 고정 주간 주기 | `e2e/prayer-compline.spec.ts` — 7개 테스트: header, no invitatory, Nunc Dimittis, no intercessions, no Our Father, blessing, 고정 주간 주기 검증<br>`e2e/api.spec.ts` — Compline API: nuncDimittis, no intercessions/ourFather, 고정 주기 psalm 비교 | 완료 |
| FR-005 | 낮기도 (Terce/Sext/None) 조립 | `src/lib/hours/daytime-prayer.ts` — `assembleDaytimePrayer`: hymn + psalmody + short reading + responsory + concluding prayer + dismissal<br>`src/lib/hours/index.ts` — terce/sext/none 모두 같은 assembler 사용 | `e2e/prayer-minor-hours.spec.ts` — terce/sext/none 각각 4개 테스트: no invitatory, no gospel canticle, no intercessions/ourFather, hymn/psalmody/dismissal<br>`e2e/api.spec.ts` — Terce API: no gospelCanticle/intercessions/ourFather, psalmody/dismissal 확인 | 완료 |
| FR-006 | 독서기도 (Office of Readings) | `src/lib/hours/index.ts` — assemblers에 officeOfReadings 미등록 (교부 독서 데이터 미완성)<br>`src/lib/loth-service.ts` — `getHoursSummary()`에서 officeOfReadings 비활성화<br>`src/app/api/loth/[date]/[hour]/route.ts` — VALID_HOURS에서 제외<br>`src/components/prayer-renderer.tsx` — `PatristicReadingSection` 컴포넌트 구현 완료 | `e2e/prayer-office-readings.spec.ts` — 5개 테스트 존재하나 assembler 미등록으로 실패 예상<br>`e2e/fixtures/dates.ts` — ALL_HOURS에 officeOfReadings 포함 | 부분 완료 |
| FR-007 | 4주 시편집 (psalter) 공통문 | `src/lib/psalter-loader.ts` — `getPsalterPsalmody()`: week-{1..4}.json에서 시편 로드<br>`src/lib/psalter-loader.ts` — `getPsalterCommons()`: shortReading, responsory, gospelCanticleAntiphon, intercessions, concludingPrayer 로드<br>`src/lib/loth-service.ts` — Layer 1 psalter commons 적용 | `e2e/prayer-sections.spec.ts` — psalm block 구조 검증 (antiphon, reference, verses, Gloria Patri)<br>`e2e/api.spec.ts` — sections 배열에 psalmody 포함 확인 | 완료 |
| FR-008 | 계절 고유문 (seasonal propers) | `src/lib/propers-loader.ts` — `getSeasonHourPropers()`: advent/christmas/lent/easter/ordinary-time.json 로드, date-keyed override (dec17-24) 지원<br>`src/lib/loth-service.ts` — Layer 2 season propers 적용 (psalter commons 위에 override) | `e2e/special-days.spec.ts` — Advent Dec 20 date-keyed propers 검증: 일반 Advent 평일과 concluding prayer 차이 확인<br>`e2e/liturgical-calendar.spec.ts` — 5개 시기별 색상/이름 매핑 확인 | 완료 |
| FR-009 | 성인축일 고유문 (sanctoral propers) | `src/lib/propers-loader.ts` — `getSanctoralPropers()`: solemnities/feasts/memorials.json 순차 검색<br>`src/lib/loth-service.ts` — Layer 3 sanctoral propers 적용 (최우선), `replacesPsalter` + `properPsalmody` 지원 | `e2e/special-days.spec.ts` — St. Joseph (03-19) Lauds: concluding prayer에 "Иосеф" 포함 확인, Vespers: Lauds와 다른 canticle antiphon<br>`e2e/api.spec.ts` — St. Joseph Lauds: sanctoral concluding prayer 확인 | 완료 |
| FR-010 | 3단계 fallback (sanctoral > season > psalter) | `src/lib/loth-service.ts` — 88~113행: Layer 1 psalterCommons → Layer 2 seasonPropers → Layer 3 hourPropers 순서로 병합<br>`src/lib/hours/compline.ts` — `mergeComplineDefaults()`: compline 전용 기본값 추가 병합 | `e2e/api.spec.ts` — Sanctoral propers override 테스트 (St. Joseph)<br>`e2e/special-days.spec.ts` — St. Joseph Lauds/Vespers sanctoral 우선 적용 확인<br>`e2e/prayer-sections.spec.ts` — shortReading/responsory 구조 검증 | 완료 |
| FR-011 | 토요일 저녁 = 주일 1st Vespers | `src/lib/loth-service.ts` — 55~59행: `dayOfWeek === 'SAT' && hour === 'vespers'`일 때 다음 주일 vespers propers로 fallback | 직접 테스트 없음 — 토요일 저녁기도 전용 E2E 테스트 부재 | 부분 완료 |
| FR-012 | 찬미가 (hymn) 자동 배정 | `src/lib/propers-loader.ts` — `getHymnForHour()`: hymns-index.json의 seasonalAssignments 기반, 시기/시간대별 후보 선택, weekOfSeason으로 결정적 rotation<br>`src/lib/loth-service.ts` — 122~128행: mergedPropers.hymn 미설정 시 자동 배정 | `e2e/prayer-lauds.spec.ts` — hymn section 존재 확인<br>`e2e/prayer-vespers.spec.ts` — hymn section 존재 확인<br>`e2e/prayer-sections.spec.ts` — hymn 라벨 렌더링 확인 | 완료 |
| FR-013 | 성경 본문 로드 | `src/lib/bible-loader.ts` — JSONL 파일(bible_ot/nt_rest/gospels)에서 성경 데이터 로드, `lookupRef()`: verse suffix (a/b/c) 처리, psalm offset 보정<br>`src/lib/scripture-ref-parser.ts` — 성경 참조 문자열 파싱<br>`src/lib/hours/shared.ts` — `resolvePsalm()`, `resolveGospelCanticle()`, `resolveShortReading()` | `e2e/prayer-sections.spec.ts` — psalm verse numbers (superscript), verse text 존재 확인<br>`e2e/prayer-lauds.spec.ts` — Benedictus gospel canticle 렌더링 확인 | 완료 |
| FR-014 | 전례력 API | `src/app/api/calendar/today/route.ts` — `GET /api/calendar/today`<br>`src/app/api/calendar/date/[date]/route.ts` — `GET /api/calendar/date/[date]` | `e2e/api.spec.ts` — today API: 응답 구조 (date, name, season 등 11개 필드), season/color 유효값 확인<br>`e2e/api.spec.ts` — date API: Ordinary Time 정확성, invalid date 404 | 완료 |
| FR-015 | 기도 조립 API | `src/app/api/loth/[date]/[hour]/route.ts` — `GET /api/loth/[date]/[hour]`: 유효 hour 검증, assembleHour() 호출, 400/404 에러 처리 | `e2e/api.spec.ts` — Lauds/Vespers/Compline/Terce API 상세 검증, invalid hour 400, invalid date 404<br>`e2e/prayer-sections.spec.ts` — API를 통한 shortReading/responsory 구조 확인 | 완료 |
| FR-016 | 기도 페이지 렌더링 | `src/app/pray/[date]/[hour]/page.tsx` — 기도 페이지: header, PrayerRenderer, 이전/다음 기도시간 nav, back link<br>`src/app/page.tsx` — 홈페이지: 전례일 정보 카드, 7개 시간대 카드, 날짜 nav<br>`src/components/prayer-renderer.tsx` — 14개 section type 렌더링<br>`src/components/psalm-block.tsx` — antiphon + title + verses + Gloria Patri<br>`src/components/date-picker.tsx`, `hour-icon.tsx`, `theme-toggle.tsx`, `footer.tsx` | `e2e/homepage.spec.ts` — 4개 테스트: 기본 렌더링, OT 날짜 렌더링, 몽골어 시간명/아이콘, invalid date 에러<br>`e2e/prayer-lauds.spec.ts` — header, back link, bottom back button<br>`e2e/date-navigation.spec.ts` — 이전/다음 날짜 nav, 연도 경계, 연속 nav<br>`e2e/error-handling.spec.ts` — invalid hour/date 에러 메시지 | 완료 |

### 비기능 요구사항 (Non-Functional Requirements)

| ID | 요구사항 | 구현 파일 | 테스트 | 상태 |
|----|----------|-----------|--------|------|
| NFR-001 | 모바일 반응형 | `src/app/page.tsx` — `max-w-2xl px-4 md:px-6`, `lg:grid lg:grid-cols-2`<br>`src/app/pray/[date]/[hour]/page.tsx` — `max-w-2xl lg:max-w-3xl px-4 md:px-6`<br>`src/app/layout.tsx` — `Viewport` export (`viewportFit: "cover"`)<br>`src/components/psalm-block.tsx` — 반응형 텍스트 크기 | `e2e/mobile.spec.ts` — 4개 테스트: 홈페이지/기도 페이지 수평 스크롤 없음, touch target >= 44px, font-size >= 14px | 완료 |
| NFR-002 | 몽골어 UI | `src/app/layout.tsx` — `<html lang="mn">`, Noto Sans/Serif (cyrillic subset)<br>`src/lib/types.ts` — `HOUR_NAMES_MN`, `DAY_NAMES_MN`<br>`src/lib/mappings.ts` — `SEASON_NAMES_MN`, `COLOR_NAMES_MN`, `RANK_NAMES_MN`<br>`src/components/prayer-renderer.tsx` — 모든 section 라벨 몽골어<br>`src/app/layout.tsx` — OG metadata 몽골어 (`locale: "mn_MN"`) | `e2e/homepage.spec.ts` — 몽골어 제목 "Цагийн Залбирал", 시간명 검증<br>`e2e/liturgical-calendar.spec.ts` — 몽골어 시기명 확인<br>`e2e/prayer-lauds.spec.ts` — 몽골어 section 이름 확인<br>`e2e/prayer-compline.spec.ts` — 몽골어 header 확인 | 완료 |
| NFR-003 | Vercel 배포 | `next.config.ts` — Next.js 16.2.0 기본 설정<br>`package.json` — `next build` / `next start` 스크립트<br>**`vercel.json` 파일 없음** — Vercel 기본 감지에 의존 | 직접 테스트 없음 — 배포 검증 E2E 없음 | 부분 완료 |

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
| `e2e/mobile.spec.ts` | NFR-001 |
| `e2e/error-handling.spec.ts` | FR-016 |
| `e2e/date-navigation.spec.ts` | FR-016 |
| `e2e/fixtures/dates.ts` | (테스트 데이터 — 모든 E2E 공통) |

---

## 커버리지 요약

### 상태별 집계

| 상태 | 기능 요구사항 | 비기능 요구사항 | 합계 |
|------|:------------:|:---------------:|:----:|
| 완료 | 14 | 2 | **16** |
| 부분 완료 | 2 | 1 | **3** |
| 미구현 | 0 | 0 | **0** |
| **합계** | **16** | **3** | **19** |

### 커버리지율

- **전체 요구사항:** 19건
- **완료:** 16건 (84.2%)
- **부분 완료:** 3건 (15.8%)
- **미구현:** 0건 (0%)

### 부분 완료 항목 상세

| ID | 요구사항 | 미완성 내용 | 완료를 위한 조건 |
|----|----------|-------------|-----------------|
| FR-006 | 독서기도 | 교부 독서 데이터 미완성, assembler 미등록, API에서 비활성화 | 1) 교부 독서 데이터 JSON 작성 2) officeOfReadings assembler 구현 3) API VALID_HOURS에 추가 |
| FR-011 | 토요일 저녁 = 주일 1st Vespers | 로직 구현 완료, 전용 E2E 테스트 부재 | 토요일 vespers가 주일 propers를 사용하는지 검증하는 E2E 테스트 추가 |
| NFR-003 | Vercel 배포 | 코드 배포 가능 상태이나 `vercel.json` 미존재, 배포 검증 테스트 없음 | 1) Vercel 프로젝트 연결 확인 2) 프로덕션 배포 성공 확인 |

### E2E 테스트 통계

- **테스트 파일:** 13개 (fixtures 포함 14개)
- **테스트 케이스:** 약 55개 (terce/sext/none 반복 포함 약 67개)
- **테스트가 없는 요구사항:** 없음 (모든 요구사항에 최소 1개 이상의 테스트 존재, 단 FR-011은 간접 테스트만)
