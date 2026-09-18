# docs/ 안내

몽골어 성무일도 앱의 문서 디렉터리. 루트에는 **지금도 읽고 고치는 문서**만 두고, 끝난 작업의 기록은 `archive/` 로 내린다 (2026-09-18 정리).

## 살아있는 문서 (루트)

| 파일 | 역할 |
|---|---|
| [PRD.md](PRD.md) | 기능·아키텍처 SSOT. FR 번호표(§12.1)와 데이터 모델 |
| [traceability-matrix.md](traceability-matrix.md) | FR ↔ 구현 파일 ↔ 테스트 대응표 (손으로 관리) |
| [traceability-auto.md](traceability-auto.md) | 테스트의 `@fr` 태그를 모은 자동 생성물 — `node scripts/generate-test-fr-map.mjs`. 직접 고치지 말 것 |
| [ops-rollback.md](ops-rollback.md) | Vercel · GitHub · Service Worker 롤백 절차 (1인 운영 1페이지) |
| [security-incident-2026-04-vercel.md](security-incident-2026-04-vercel.md) | 2026-04 Vercel 사고 대응 체크리스트 (운영 점검용) |
| [app-review-2026-09-13.md](app-review-2026-09-13.md) | 최근 전체 앱 리뷰 — 발견 항목과 처리 상태 |
| [handoff-2026-09-17-review-session.md](handoff-2026-09-17-review-session.md) | **현재 인계 문서.** 남은 과제(§3)와 사용자 액션은 여기서 본다 |
| [fr-156-first-vespers-scope.md](fr-156-first-vespers-scope.md) | 제1저녁기도(FR-156) 범위·데이터 규약 |
| [fr-160-phase-b-conditional-redirect-plan.md](fr-160-phase-b-conditional-redirect-plan.md) | 조건부 루브릭 · 페이지 리다이렉트 데이터 모델(FR-160-B) 계약 |
| [fr-161-phrase-unit-pivot-plan.md](fr-161-phrase-unit-pivot-plan.md) | phrase 단위 줄바꿈 렌더링(FR-161) 설계 근거 — `types.ts`·`schemas.ts` 가 참조 |
| [fr-017j-pdf-viewer-ux-plan.md](fr-017j-pdf-viewer-ux-plan.md) | PDF 뷰어 UX(FR-017j) 계획 |

새 FR 을 넣을 때는 `PRD.md` 표에 한 행 + `traceability-matrix.md` 에 한 행, 테스트엔 `// @fr FR-XXX` (자세한 규칙은 저장소 루트 `CLAUDE.md`).

## 하위 디렉터리

| 디렉터리 | 내용 |
|---|---|
| `bug-reports/` | 버그·회귀 리포트. 명령과 출력 로그를 붙인다 — 구두 보고 금지 |
| `research/` | 조사·스윕 산출물 (GOAL 별 폴더). 큰 결과 파일은 git 추적에서 제외돼 있음 |
| `design/mental-models/` | 전례 규칙의 정신 모델 (대축일 시편 fallback 등) |
| `modules/` | 모듈별 설명 (api · bible · calendar …) |
| `process/` | 운영 절차 조각 (`CACHE_VERSION` bump 기준, 오타 언마스크 연쇄) |
| `data/` | 원문 오식 대장 |
| `screenshots/` | 렌더 검증 캡처 |
| `archive/` | **끝난 작업의 기록** — 아래 참조 |

## archive/

2026-04~06 의 완료 로그 88건. 파일명은 그대로이고 위치만 옮겼다(`git mv`, 이력 보존). 코드 주석·다른 문서의 `docs/<파일>.md` 참조는 전부 `docs/archive/<파일>.md` 로 고쳐 두었다.

| 종류 | 수 | 파일명 패턴 |
|---|---|---|
| 페어 리뷰 기록 | 36 | `review-<task>-…md` |
| 옛 인계 문서 | 25 | `handoff-…md` (2026-05-01 ~ 06-08, fx·fr161 시리즈) |
| FR 세부 계획 · 증거 | 17 | `fr-153g…`, `fr-156-phase5…`, `fr-160-c2…`, `fr-161-r0…r14…` |
| 데이터 감사 기록 | 7 | `audit-…-2026-05-….md` (drift · typo · indent · curator queue) |
| 일회성 산출물 | 3 | `prayer-inventory.md`, `stage6-followup.md`, `task-40-psalter-texts-reconciliation.md` |

찾는 문서가 루트에 없으면 [archive/](archive/) 를 먼저 본다.
