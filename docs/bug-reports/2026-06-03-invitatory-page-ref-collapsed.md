# 초대송 page 번호 미표시 RCA

## 증상

사용자 보고: "앱의 '초대송(Invitatory)' 섹션에서만 출처 페이지 번호가 표시되지 않는다. 다른 기도 섹션(시편/찬가 등)은 몽골어 책(parsed_data/full_pdf.txt) 출처 페이지 번호가 정상 표시됨."

확정 증상은 "초대송 데이터가 항상 page를 잃는다"가 아니라 "기본 접힘 상태의 초대송 화면에서 page-ref DOM이 보이지 않는다"이다. Track C의 prod 재현에서 `/pray/2026-06-03/lauds`는 `showPageRefs=true`, `invitatoryCollapsed=true`일 때 `section[aria-label="Урих дуудлага"]` 아래 `data-role="page-ref-link"`가 0개였고, 같은 화면의 `Магтуу`는 `(Х. 897)` 링크를 `/pdf/897`로 렌더했다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:51-65`).

## 재현

Track C는 Turbopack dev server가 아니라 prod mode로 재현했다. 절차는 `npm run build`, `npm run start -- -p 3330`, URL `http://localhost:3330/pray/2026-06-03/lauds`였고(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:9-13`), 설정은 `showPageRefs=true`, 기본 접힘 조건인 `invitatoryCollapsed=true`, `invitatoryPsalmIndex=0`이었다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:51-54`).

증거 파일:

- Build log: `/home/min/.claude/pair-cowork/scratch/dvo/test-out-task-wi270-002-build.log`
- 접힘 화면 전체 캡처: `/home/min/.claude/pair-cowork/scratch/dvo/wi270-002-captures/lauds-collapsed-full-page.png`
- 접힘 초대송 캡처: `/home/min/.claude/pair-cowork/scratch/dvo/wi270-002-captures/invitatory-collapsed-section.png`
- 접힘 raw observation: `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-observation-collapsed.json`
- 펼침 raw observation: `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-observation.json`

대조 재현도 같은 조건에서 성립했다. `invitatoryCollapsed=false`로 펼치면 초대송 안에 page 28 링크가 8개 렌더되었고(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:21-31`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:36-39`), 접힘/펼침 양쪽 모두 console warning/error/pageerror는 0개였다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:3-7`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:65`).

## 대조

초대송은 별도 `invitatory` variant로 렌더된다. `PrayerRenderer`는 `section.type === 'invitatory'`일 때 `InvitatorySection`을 호출한다(`src/components/prayer-renderer.tsx:73-75`; Track B 요약 `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-001-findings.md:7`). `InvitatorySection`은 `settings.invitatoryCollapsed`를 `collapsed`로 읽고(`src/components/invitatory-section.tsx:13-15`), `activePage`를 `candidates[psalmIndex]?.page` 또는 `section.page`에서 계산한다(`src/components/invitatory-section.tsx:22-30`).

문제는 page-ref 위치다. 초대송 헤더의 page-ref는 `Урих дуудлага {!collapsed && <PageRef page={activePage} />}`로 접힘 상태에서 제거된다(`src/components/invitatory-section.tsx:35-37`). 초대송 본문 전체도 `!collapsed`일 때만 렌더된다(`src/components/invitatory-section.tsx:69-70`), 그리고 본문 내부 antiphon page-ref 호출도 그 아래에 있다(`src/components/invitatory-section.tsx:86`, `src/components/invitatory-section.tsx:152`, `src/components/invitatory-section.tsx:159`). 즉 접힌 기본 화면에는 page-ref가 들어갈 DOM 위치가 없다.

반대로 hymn과 psalmody는 항상 보이는 헤더에 page-ref를 둔다. `HymnSection`은 `displayPage`를 계산한 뒤(`src/components/hymn-section.tsx:18-22`) visible header에서 `Магтуу <PageRef page={displayPage} />`를 항상 렌더한다(`src/components/hymn-section.tsx:41-45`). `PsalmBlock`도 antiphon에 `page={psalm.page}`를 넘기고(`src/components/psalm-block.tsx:78-80`), 시편 제목/참조 헤더에 `<PageRef page={psalm.page} />`를 둔다(`src/components/psalm-block.tsx:81-88`). Track C의 같은 prod 화면에서 `Магтуу`가 `(Х. 897)` -> `/pdf/897`을 보인 것은 이 대조 경로와 일치한다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:27-30`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:61-64`).

## 근본원인

### 1차 원인: 초대송 page-ref가 펼침 전용 UI에만 있음

기본 설정은 `invitatoryCollapsed: true`이다(`src/lib/settings.tsx:37-45`). 초대송 컴포넌트는 이 값을 그대로 `collapsed`로 사용한다(`src/components/invitatory-section.tsx:13-15`). 그리고 모든 초대송 page-ref 렌더 위치가 `!collapsed`에 의존한다: 헤더 page-ref는 `!collapsed && <PageRef ...>`에 묶여 있고(`src/components/invitatory-section.tsx:35-37`), body 및 body 내부 `AntiphonBox page={activePage}` 호출도 펼침 블록 안에 있다(`src/components/invitatory-section.tsx:69-70`, `src/components/invitatory-section.tsx:86`, `src/components/invitatory-section.tsx:152`, `src/components/invitatory-section.tsx:159`).

`PageRef` 자체가 초대송만 실패시키는 것은 아니다. 공통 컴포넌트는 `settings.showPageRefs`와 truthy `page`가 있을 때 링크를 렌더한다(`src/components/page-ref.tsx:7-19`; Track B `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-001-findings.md:19`). 펼친 초대송에서 page 28 링크 8개가 나온 재현 결과도 `PageRef` 자체가 정상임을 보여준다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:21-31`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:36-39`).

따라서 1차 원인은 "기본 접힘 상태 + 초대송 page-ref의 펼침 전용 배치"이다. Track B도 같은 결론을 냈다: 기본 접힘 상태에서는 header `PageRef`가 억제되고, body의 `AntiphonBox` page-ref도 렌더되지 않는다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-001-findings.md:11-17`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-270-001-findings.md:23-25`).

### 2차 원인: 대체 초대시편 page 데이터 결측

데이터 쪽에는 별도의 잠재 결함이 있다. `buildInvitatory`는 항상 `ordinarium.invitatory.invitatoryPsalms[0]`을 기본 시편으로 사용한다(`src/lib/hours/builders/invitatory.ts:75-80`), candidate에는 각 `p.page`를 그대로 전달하고(`src/lib/hours/builders/invitatory.ts:92-98`), 기본 `selectedIndex`는 0이며 section page는 첫 시편의 page이다(`src/lib/hours/builders/invitatory.ts:99-102`).

원본 `src/data/loth/ordinarium/invitatory.json`에서 첫 후보 Psalm 95는 `page: 28`을 가진다(`src/data/loth/ordinarium/invitatory.json:6-10`). 그러나 대체 후보 Psalm 100, Psalm 67, Psalm 24 객체 범위에는 `page` 키가 없다(`src/data/loth/ordinarium/invitatory.json:43-69`, `src/data/loth/ordinarium/invitatory.json:70-95`, `src/data/loth/ordinarium/invitatory.json:96-121`). Track A는 `parsed_data/full_pdf.txt`에서 Psalm 100이 book page 30, Psalm 67이 book page 30-31, Psalm 24가 book page 31-32에 걸쳐 있음을 좁은 원문 앵커로 확인했다(`/home/min/.claude/pair-cowork/scratch/dvo/inv-268-methodology.md:51-59`, `parsed_data/full_pdf.txt:903-915`, `parsed_data/full_pdf.txt:938-945`, `parsed_data/full_pdf.txt:969-980`).

이 2차 원인은 기본 사용자에게 바로 드러나는 원인은 아니다. Track D의 영향범위 분석에 따르면 psalm selection path는 날짜/시즌/요일을 받지 않고 항상 `psalms[0]`에서 시작하며, 대체 Psalm 100/67/24는 사용자가 `settings.invitatoryPsalmIndex`를 바꿀 때만 활성화된다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-290-001-findings.md:7-15`, `/home/min/.claude/pair-cowork/scratch/dvo/wi-290-001-findings.md:23-27`). 즉 대체시편 page 누락은 "수동 선택 + 펼침 + page refs on" 조건에서만 영향을 준다.

## 영향범위

1차 원인(B, collapsed render gate)은 초대송이 조립되는 모든 Lauds 화면에 적용된다. `assembleLauds`는 `ctx.isFirstHourOfDay`일 때 초대송을 push한다(`src/lib/hours/lauds.ts:16-24`), 서비스 컨텍스트는 `hour === 'lauds'`를 `isFirstHourOfDay`로 설정한다(`src/lib/loth-service.ts:810-823`). 기본 설정이 `invitatoryCollapsed: true`이므로(`src/lib/settings.tsx:37-45`), 사용자가 page refs를 켜도 초대송이 접혀 있으면 초대송 page-ref는 보이지 않는다. Track D도 이 범위를 "every assembled Lauds invitatory section for users whose settings keep `invitatoryCollapsed: true`"로 정리했다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-290-001-findings.md:21-27`).

2차 원인(A, 대체 초대시편 page 결측)은 수동으로 Psalm 100/67/24를 선택한 경우에만 적용된다. 기본 조립은 Psalm 95이며 page 28을 가진다(`src/lib/hours/builders/invitatory.ts:79-102`, `src/data/loth/ordinarium/invitatory.json:6-10`). 대체 후보에는 page가 없고(`src/data/loth/ordinarium/invitatory.json:43-121`), `InvitatorySection`은 선택된 후보의 page를 `activePage`로 사용한다(`src/components/invitatory-section.tsx:22-30`). 따라서 대체 후보를 선택한 상태에서는 초대송을 펼쳐도 `PageRef`가 truthy page를 받지 못한다(`src/components/page-ref.tsx:7-10`).

비영향 범위: hymn/psalmody의 page-ref 렌더링은 구조적으로 별도 경로이며, 이 RCA의 1차 원인과 같은 접힘 게이트가 없다(`src/components/hymn-section.tsx:41-45`, `src/components/psalm-block.tsx:81-88`). Track C에서 같은 화면의 hymn 및 psalmody page refs가 정상 렌더된 것도 이 비영향 범위와 일치한다(`/home/min/.claude/pair-cowork/scratch/dvo/wi-270-002-findings.md:36-49`).

## 수정 방향

별도 GOAL에서 다음 두 작업을 분리해 처리한다.

1. 초대송 출처 page-ref를 접힘 상태에서도 보이는 헤더 위치로 이동하거나, 적어도 접힘 헤더에도 `PageRef page={activePage}`를 렌더한다. 의도는 hymn/psalmody처럼 사용자가 섹션을 펼치지 않아도 출처 page를 볼 수 있게 하는 것이다(`src/components/invitatory-section.tsx:35-37`, `src/components/hymn-section.tsx:41-45`, `src/components/psalm-block.tsx:81-88`).
2. `src/data/loth/ordinarium/invitatory.json`의 대체 후보 Psalm 100 / Psalm 67 / Psalm 24에 page metadata를 보강한다. Track A가 잡은 원문 앵커는 Psalm 100: `parsed_data/full_pdf.txt:903-915`, Psalm 67: `parsed_data/full_pdf.txt:938-945`, Psalm 24: `parsed_data/full_pdf.txt:969-980`이다. 데이터 full 재추출이 아니라 해당 후보의 page 필드만 보강하는 surgical fix로 충분하다.

이 RCA는 리포트 작성만 수행했으며 코드와 데이터는 변경하지 않았다.
