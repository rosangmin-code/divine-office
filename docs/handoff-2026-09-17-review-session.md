# 인계 — 2026-09-13~17 전체 리뷰 세션

- **시작**: `94c89bc` / **끝**: `20bb333` (68 커밋, 전부 `origin/main` push·배포 완료, CI green)
- **후속 (2026-09-17)**: `c6e826b` CI Node 22 · `34cedc4` FR-174 404 상태코드 · `76f783c` FR-175 성토요일/토요일 성탄 저녁기도 · FR-176/FR-177 전례일 순위표 적용 · `2dfa86a`/`789df8b` FR-178 카드 조밀화·시편 정렬 · FR-179 접근성(대비·스위치)
- **후속 (2026-09-18)**: `0222e0e` FR-180 축일 제1저녁기도 주일 한정 · `621dc02` FR-181 성탄 평일 formulary · `d44413d` FR-182 제2저녁기도 rich · `952631c` 리포 위생 · `5aa16b0` docs 아카이브
- **후속 (2026-10-14)**: `c2ddea2` FR-183 운문 줄바꿈 — **규칙 정정**(책에서 접힌 행 = 앞 행과 같은 논리 행 → 복원해서 화면 폭에 맞춰 다시 접고 접힌 줄에만 들여쓰기, 운문 통일·산문 예외). 렌더러 통일 + 시편 118(71→60행)·이사야 61(32→30행)·초대송 시편 95(24→14)·67(17→16) 논리 행 복원. 리포트 `docs/bug-reports/2026-10-14-verse-logical-line-wrapping.md`
- **작업 트리 clean, worktree·잔여 서버 없음**
- 종합 리뷰: `docs/app-review-2026-09-13.md` (§1 P0, §3 영역별, §7 e2e 101건, §8 전야 저녁기도, §9 주일 EP II)

---

## 1. 완료 (전부 배포됨)

### 전례 정확성 — 사용자 화면에 실제로 잘못 나가던 것
| 건 | 증상 | 커밋 |
|---|---|---|
| 연중 주일 본기도·후렴 | 시즌 카운터 `weekOfSeason` 으로 조회해 **모든 연중 주일**이 다른 주일 것 | `f769a5f` |
| 성삼일 | romcal 시즌 키 `'Holy Week'`(공백) 오타로 사순 1주 리셋, 6주 데이터 도달 불가 | `1eca5c7` |
| 주일 sanctoral 덮어쓰기 | MM-DD 단독 조회로 2028 사순 3주일이 "성 요셉" 등 | `4036840` |
| 토요일 저녁 대체 본기도 | 승격된 날 rank + 전야 요일을 섞어 판정 → **매 토요일(연 46회)** alternate | `becef1f` |
| rich 오염 26셀 | rich 가 plain 과 다른 소스에서 옴(모든 성인 당일에 연중 주일 본기도 등). UI 는 rich 우선이라 화면이 틀림 | `2601f59` |
| 주일 EP I 병합 | 사순·부활·대림 주일 제1저녁기도 독서·응송·청원이 시편집 발췌 | `17014b2` |
| **주님 공현** | romcal 이름 `"Epiphany"` 매칭 실패로 **매년 후렴·본기도 빈 값** | `8a95846` |
| 주일 제2저녁기도 | 주일 당일 저녁이 EP I 후렴 사용 (2026년 41회) + 데이터 4건 | `8a95846`, `a506ab6` |
| 성가정·세례 전야 | FEAST 특수키가 승격 경로에서 배제 | `dd82856` |

### 기반
- `next` 16.2.4 → 16.3.5, `pdfjs-dist` 5.6.205 → 6.3.289 → **audit 취약점 0**
- CI 강화: `next build` + audit(high) + 핵심 UI e2e 258케이스 + nightly 전체 e2e
- `verify:all`(14종) CI 연결, 검증기 RED 정리, plain↔rich parity verifier 신설
- UI e2e 사문화 101건 정리 (전체 934 통과)
- 시편 헤더 영문 참조 → 몽골어(`Дуулал 63:2-9`), settings localStorage 보호
- 접근성: 풋터 패널 dialog 시맨틱·포커스 복원, 공용 listbox(드롭다운 4곳 키보드·ARIA), radiogroup roving

---

## 2. 사용자 액션 대기

1. ⏸ **보류 (사용자 판단 2026-10-22)** — ~~Vercel Deployment Checks 등록~~. push 전 로컬 테스트·검증기가 이미 관례이고 빌드 실패는 Vercel 이 막으므로 실익이 작다고 판단. 기여자가 늘면 재검토. 시도 기록: "Select checks to add" 에 SHA `2c6de12` 를 넣어도 GitHub 에는 있는 check run 2개가 "No configured checks found" 로 안 보였다(Show All Checks 스위치 비활성) — Vercel GitHub App 의 Checks 읽기 권한 미승인으로 추정, 미확인. 재개 시 `github.com/settings/installations` → Vercel → 권한 요청부터.
   - `vercel.com/rosangmin-3807s-projects/divine-office/settings/build-and-deployment` → Deployment Checks → GitHub provider
   - job 2개 **둘 다** Required: `Lint · Typecheck · Unit tests`, `Playwright · API smoke + core UI`
   - (quality 실패 시 e2e 는 skipped → 하나만 걸면 통과로 셀 수 있음)
   - 전제: Settings → Environments → Production 의 "Auto-assign Custom Production Domains" ON
   - Hobby 에서 메뉴가 안 보이면 fallback 은 `scratchpad/gate/plan.md` §4.3 (GH Actions + Vercel CLI)
2. **실기기 1건**: 이전 SW(v83) 등록된 브라우저에서 `/pdf/58` → PDF 뷰어 정상 여부 (워커 자산 교체 + 24h HTTP 캐시 시나리오, Playwright 재현 불가)

---

## 3. 남은 과제 (착수 안 함)

| 우선 | 항목 | 메모 |
|---|---|---|
| ~~중~~ ✅ | ~~CI Node 20 → 22~~ | 2026-09-17 `c6e826b`. quality·e2e·nightly 3 job. `package.json` engines 는 미변경(Vercel 런타임 선택에 영향) |
| ~~중~~ ✅ | ~~2027-12-25 토요일 성탄 카드~~ | 2026-09-17 `76f783c` (FR-175). 조사 중 **성토요일 저녁기도 카드 누락(매년)** 이 같은 뿌리로 드러나 함께 수정 |
| ~~중~~ ✅ | ~~잘못된 URL 이 HTTP 200~~ | 2026-09-17 `34cedc4` (FR-174). 홈 스켈레톤을 `(home)` 그룹으로, `/pray` 검증을 segment layout 으로 |
| ~~중~~ ✅ | ~~2028-01-01 → 공현 제1저녁기도 미승격~~ | 2026-09-17 FR-176(a). "책이 공현 EP I 을 인쇄하지 않는다" 는 오기였다 — p.609 구역 맨 앞에 표제 없이 있고 데이터도 `epiphany.SUN.vespers` 에 있다 |
| ~~중~~ ✅ | ~~평일 대축일 다음날이 평범한 주일~~ | 2026-09-17 FR-176(b). 사용자 판단으로 보편 순위표 적용. 주님의 축일 4개도 함께 |
| ~~중~~ ✅ | ~~주님의 축일 `firstVespers` 카드가 비주일에도 뜸~~ | 2026-09-18 FR-180. 책 p.821/831/835 «Ням гарагт таарвал» → `FirstVespersPropers.sundayOnly` 데이터 플래그(라테라노 p.840 은 무조건이라 플래그 없음). 조사 중 **주일 occurrence 의 찬미가 자리에 주석문이 찍히던 것**(잘못 인코딩된 FR-160-B rubric, 프로덕션 `/pray/2025-02-02/firstVespers`)이 같은 뿌리로 드러나 함께 수정 |
| ~~낮~~ ✅ | ~~색 대비 H4~~ | 2026-09-18 FR-179. 13 URL × 2 테마 미달 0 |
| ~~낮~~ ✅ | ~~스위치 터치 타겟~~ | 2026-09-18 FR-179. hit 64×44, 트랙 48×28 유지 |
| ~~낮~~ ✅ | ~~대림·사순·부활 EP II 청원 rich~~ | 2026-09-18 FR-182. 원인은 rich 빌더 4개(청원·응송·마침기도·선택기도)의 `HOURS` 에 `vespers2` 부재 — 짧은독서 빌더만 있었다. 6개 `-vespers2.rich.json` 에 4필드 생성(게이트 24/24). partial `vespers2` 셀(연중 주일 등)엔 파일을 만들지 않는 가드 — 만들면 `-vespers` fallback 의 선택 마침기도 rich 가 사라지는 회귀(리포트 §4) |
| ~~낮~~ ✅ | ~~`epiphanyWeek` 도달 불가~~ | 2026-09-18 FR-181. `resolveSpecialKey` 1월 산술(공현 = 1/2 이후 첫 주일, 세례 = +7 또는 월요일). 조사 중 **1/2~공현 전날도 시편집**으로 나가던 것이 드러나 p.601 «…долоо хоногууд»(복수) formulary 를 그 구간에도 적용 — 판단이므로 veto 가능(리포트 §6 (a)) |
| ~~낮~~ ✅ | ~~세례가 월요일인 해(2029·2034·2035)~~ | 2026-09-18 판정: **버그 아님**. (a) 책 p.616 은 세례 짧은독서를 인쇄하지 않아 앱은 진행 중인 시편집 요일 독서로 fallback — 평일 축일·대축일 전부(봉헌·변모·베드로바오로·성모승천) 같은 규칙이고 주일 세례의 Езекиел 37 도 시편집 주일 독서. (b) 공현(순위표 I.2) 제2저녁기도가 세례(II.5) 제1저녁기도를 이기므로 `/firstVespers` 404 와 공현 EP II 유지가 옳음(코드상 보호는 `keepsOwnEveningPrayerII` 가 아니라 FR-173 Path 2b `SUN` 게이트 — 결과 옳고 근거 간접). 회귀 가드 2건 `christmas-weekday-propers.test.ts` |
| ~~낮~~ ✅ | ~~`wepiphanyWeek-SUN-*.rich.json` `source.weekKey` 오기~~ | 2026-09-18 수정 — 두 파일 10곳 `"epiphany"` → `"epiphanyWeek"`. `source` 는 provenance 메타라 코드가 `weekKey` 를 읽지 않음(compline 만 `source.id` 확인) |
| ~~낮~~ ✅ | ~~리포 위생~~ | 2026-09-18 `952631c`. 절단 스윕 jsonl 4개(27MB) 추적 해제(코드·CI 참조 0 확인, 로컬 파일 유지) + `.gitignore` + 로컬 `git gc` — loose 5,262개/86MB → 0. 히스토리 재작성은 하지 않음(사용자 결정) |
| ~~낮~~ ✅ | ~~docs 아카이브~~ | 2026-09-18 `5aa16b0`. 루트 md 99 → 11 + `docs/README.md`, 완료 로그 88건을 `docs/archive/` 로 `git mv`(이력 보존). 경로 참조 182곳 수리, 새로 깨진 링크 0 |
| ~~낮~~ ✅ | ~~초대송 연 구분 = 후렴 반복 횟수~~ | 2026-10-14 사용자 결정 "책이 연이 더 많으면 책대로" → 책 문단대로 재편. 시편 67 4→5연(후렴 5→6회), 시편 24 4→7연(5→8회). 시편 95·100 은 책과 일치해 유지. 책 시편 95 의 인쇄된 `(Шад дуулал давтагдана)` 6개 = 앱 반복 6회로 **연 1개 = 후렴 1회** 규약이 책 규약임이 실증됨 (리포트 §6 (b)) |
| 낮 | `lines[].indent` 필드 신뢰 불가 | FR-183 전수 검사 결과 과잉·누락·반전이 섞여 있다(시편 63 블록 인셋 오인, 시편 110 누락, 시편 114 반전, 시편 118 전무). 렌더러는 이미 무시(WI #502). **향후 줄바꿈·들여쓰기 작업의 근거로 쓰지 말 것** — 논리 행 복원은 PDF x 좌표 재추출만 유효 (리포트 §3.4) |
| 낮 | `Psalm 88:2-10` 고아·손상 데이터 | 어떤 시간경도 참조하지 않고(실사용은 `Psalm 88:2-19`, phrase 44개 보유) 블록이 책 p.540 좌단/p.541 우단을 번갈아 가리키는 2단 뒤섞임. 화면 영향 0 이라 그대로 두고 기록만 (리포트 §6 (a)) |

---

## 4. 이 세션에서 굳어진 작업 방식 (재사용 권장)

- **전례 로직 변경 검증 = main↔브랜치 전일자 지문 diff 스윕.** `assembleHour` 를 전 날짜 × 시간경으로 돌려 day 필드·섹션·후렴·본기도·rich page 를 비교하고 **"바뀐 셀이 의도한 범주뿐"** 을 표로 확인. 스크립트 패턴: 세션 scratchpad `eve/sweep.js`, `pd3/`, `vsp2fix/`.
- **데이터↔PDF 판정은 인쇄면 렌더로.** `pdftotext -f N -l N -layout` 로 물리 페이지 찾고 `pdftoppm -r 200 -png` 렌더 → PIL 크롭 → 이미지를 직접 보고 판독. 추출 텍스트만으로 판정 금지. (책 587 = 물리 294, 오프셋 ≈ -293)
- **worktree 에이전트의 함정**: SoT(`parsed_data/`, `public/psalter.pdf`) 가 gitignore 라 worktree 에서 `it.skipIf` 로 건너뛰는 테스트가 있다. 에이전트가 "전부 통과" 로 보고해도 **머지 후 main 에서 재실행**해야 한다. pdfjs 이관의 파서 회귀(82건)가 이렇게 드러났다.
- **`CACHE_VERSION` bump 기준 정리**: 고정 URL 자산의 *내용* 변경 + SW 로직 변경만. SSR HTML 변경은 navigation 이 network-only 라 불필요, `_next/static` 은 content-hash 라 불필요. v84(pdf.worker 교체)가 이 기준의 첫 사례. 이전 v42~v83 은 대부분 불필요한 보수적 bump.
- **rich 는 plain 과 같은 소스여야 한다**(`applyRichSourceParity`). UI 가 rich 우선 렌더라 rich 가 틀리면 화면이 틀린다. rich 관련 변경 시 plain↔rich page 일치 전수 확인.
