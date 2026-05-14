# Handoff (2026-05-03) — firstVespers + Marian + psalmPrayer occurrence sweep

이번 세션 (2026-05-02 ~ 05-03) 종료. 사용자 모바일 검증 완료. 다음 세션이 자체 완결적으로 이어받기 위한 핵심 컨텍스트.

## 현재 main HEAD

```
32b59bf docs(review-231): #230 F-X5 R2 amend (Phase A+B cumulative review)
dc1d3b1 Merge worktree-230-dev (#230 F-X5 Phase A+B)
b8a4ee9 docs(audit-228): F-X3 phrase-unit 적용 누락 전수조사
f1e4944 Merge 229-solver (page 521→516 fix)
2af2b58 Merge 227-divine-review
3ad3988 Merge 225-dev (4 Marian phrase-unit + hanging indent)
e51415b Merge 219-member-01 (psalmPrayer Phase 1 pilot)
```

origin/main 동기화 완료. CACHE_VERSION v4 → v5 (Vercel 재배포 자동 트리거됨, 사용자 모바일 검증 완료 ✓).

## 검증 baseline (main, 2026-05-03 종료)

| 항목 | 값 |
|---|---|
| vitest | **842 PASS** / 0 FAIL (44 files) |
| tsc | 0 errors |
| eslint | 0 errors (target scope) |
| verify-psalter-pages.js | drift 0 (agree=157, verified-correction=4) |
| verify-compline-pages.js | drift 0 (agree=24, verified-correction=0) |
| sw.js | CACHE_VERSION='divine-office-v5' |
| working tree | clean |

## 이번 세션 land 요약 (Compline + first-Vespers + Marian 통합 sweep)

### F-X1 (#217) — Nunc Dimittis 안티폰 줄바꿈 + Eastertide rich Аллэлуяа augmentation
- gospel-canticle-section.tsx 의 inter-block separator → `<br/>` (renderer)
- applySeasonalAntiphonRich helper 신규 (NEW para block 으로 Аллэлуяа 추가, EASTER 한정, 멱등)
- loth-service Layer 5/8b ordering (plain+rich 둘 다 augment)
- review #220: APPROVED_WITH_ISSUES (3 nit, production impact 0)

### F-X1c (#225) — 4 Marian antiphons phrase-unit + 시편식 hanging indent
- types.ts: MarianAntiphonCandidate.lines + HourSection.lines optional 추가
- compline.json: 4 antiphons (Salve Regina 7 / Аврагчийн хайрт эх 8 / Тэнгэрийн Хатан 6 / Амар амгалан Мариа 8 phrases) lines field
- marian-antiphon-section.tsx: 우선순위 candidate.lines → section.lines → splitMarianTextOnAlleluia(text). 각 phrase 를 `<p data-testid="marian-antiphon-line">` + `pl-6 -indent-6` hanging indent
- splitMarianTextOnAlleluia (#223 의 fallback) 보존 — sanctoral 변형 안전망
- review #227: APPROVED_WITH_ISSUES (3 nit, PDF 29/29 verbatim 검증)

### F-X2 (#218 audit + #219 Phase 1 pilot + #224 Phase 2 batch) — psalmPrayerPage occurrence-aware

**audit (#218 deeper, docs/handoff-fx2-psalmprayer-audit.md)**:
- p.280 vs p.506 본문 byte-identical 확인 — multi-occurrence 시편 page-mapping conflation
- 12 keys / 16 occurrences 영향 (Psalm 92, 8, 51, 110, 100, 119, 118, 150, 67, 135, 144, 147)
- 권장 fix: Option A revised (week-N.json psalm entry 에 optional psalmPrayerPage override + resolver 1-line nullish coalescing)

**Phase 1 pilot (#219, member-01)** — Psalm 92:2-9 단건:
- types.ts (+10), psalm.ts (+12 -2, two return sites nullish-coalesce), week-4.json (+1), psalm.test.ts (+65)
- 카탈로그 (psalter-texts.json + psalter-texts.rich.json) 변경 X — 데이터 분산 패턴
- review #221: APPROVED_WITH_ISSUES (1 nit, Bible-fallback path anchor 부재 — Phase 2 에서 closed)

**Phase 2 batch (#224, member-01)** — 12 occurrences land + 3 defer:
- week-{2,3,4}.json psalm entries 에 psalmPrayerPage override 추가
- scripts/audit-fx2-phase2-pages.js (+247 신규) — PDF verbatim 검증 자동화
- 3 cases defer (Phase 3 emergent): Psalm 110 W2 / Psalm 100 W3 / Psalm 147 W4 — PDF prayer text ≠ catalog text → text+page joint override 필요
- review #226: APPROVED_WITH_ISSUES (2 nit, audit script ergonomics)

### F-X3 audit (#228 divine-researcher) — 시편/찬가 phrase-unit 적용 누락 전수조사
- docs/handoff-fx3-phrase-audit.md (262 lines, leader 가 옵션 A 로 직접 commit — read-only profile fitness conflict)
- 핵심 결과:
  - 시편 본문: 96/125 entries (77%) phrase-rich 적용. **29 entries 누락** (R-14 NOVEL_EDGE cohort)
  - **찬가 hymns: 0%** (122 files / 565 stanzas — 사용자 visible 매일)
  - **시즌 전구 (intercessionsRich): 0%** (73 files / 248 stanzas)
  - 복음찬가 (Benedictus/Magnificat/Nunc Dimittis): schema 미지원 (P3 spike 필요)
  - Marian (#225 land): 100% (lines field)
- 권장 Phase batch: F-X3-A (hymn 5 pilot) → F-X3-B (hymn w1 30) → F-X3-C (intercession 73) → F-X3-D (hymn 92) → F-X3-E (시편 29 R-2 builder 재실행) → F-X3-F (gospel canticle schema spike)
- 사용자 결정 대기 — Phase batch dispatch 미진행

### F-X4 (#229 solver) — Sunday I Compline 끝기도 page 521 → 516
- compline.json:161 SAT.concludingPrayer.page 521 → 516 (1 line)
- PDF p.512 subhead 'НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД' SSOT
- verify-compline-pages.js auto-removal signal (이전 manual-review delta:-5 자동 사라짐)

### F-X5 (#230 dev Phase A+B + #216 F-2c 흡수) — Saturday First Vespers/Compline → Sunday/Solemnity 페이지 이동
- HourType 확장: `firstVespers` + `firstCompline` (PDF p.49 + p.512 verbatim 라벨)
- 라우팅: /pray/[date]/firstVespers + /pray/[date]/firstCompline 신규
- assembleHour data-key 변환 (firstVespers→vespers·SUN, firstCompline→ALWAYS·SAT 슬롯 — PDF p.512 'НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД' 따름)
- firstVespers 3-path lookup (sanctoral / movable special-key / season Sunday)
- HourContext.effectiveLiturgicalDay (optional, backward-compat) — F-2 alternation 이 promotion 후 effective rank 봄 (#216 F-2c 흡수)
- Saturday 카드: vespers + compline 제거 (URL 자체는 backward-compat 보존)
- Sunday 카드: firstVespers + firstCompline + lauds + daytime + vespers + compline (6개)
- 평일 Solemnity/Feast eve 카드: vespers/compline strip + 본 날 페이지에 firstVespers/firstCompline 추가
- sw.js CACHE_VERSION v4 → v5
- review #231 R1 + R2: APPROVED_WITH_ISSUES (5 follow-up, 1 MAJOR Sun-eve-of-Solemnity 중복)

### Routine
- `auto on` cooldown 15min standing rule 활성. 4회 fire (이번 세션)
- handoff doc 본문 (이번 doc)

## 사용자 모바일 검증 완료 (이번 세션 종료 직전)

사용자 명시 검증 완료:
- F-X1c Marian (4 antiphons phrase-unit + hanging indent) ✓
- F-X2 시편 92 page=506 / 시편 8 page=509 ✓
- F-X4 Compline 끝기도 page 516 ✓
- F-X5 firstVespers/firstCompline 라우트 + Saturday 카드 strip ✓

## 미완료 follow-up 큐 (다음 세션)

### TaskList pending

| # | Subject | 우선도 |
|---|---|---|
| #171 | EnterWorktree base mismatch fix (DEFERRED, 우회책 유지) | DEFERRED |
| #222 | F-X1 nit defensive hardening (3 nit) | LOW |
| #239 | F-X5 follow-ups (5 items, mixed) | mixed |

### #239 F-X5 follow-ups 세부 (review #231 R2 권고)

1. **MAJOR** — Sun-eve-of-Solemnity 중복 렌더링 (loth-service.ts:848): Sun=ordinary + Mon=Solemnity 케이스에서 Sun II vs Mon Solemnity-I 중복. Universal calendar rubric 통상 Mon Solemnity-I 우선 → Sun II strip 게이트 보강 필요.
2. **MINOR** — Non-Sunday firstVespers/firstCompline URL 404 게이트 (route.ts:6, page.tsx:13): VALID_HOURS 글로벌, ordinary 평일 URL 가 부조화 콘텐츠 반환. Phase B 의 hasFirstVespersAndCompline(date) 헬퍼 활용 가능.
3. **MINOR** — effectiveLiturgicalDay 소비 균일화 (lauds.ts:95, vespers.ts:72-77): F-2 helper 가 ctx.liturgicalDay 직접 read. compline.ts 만 effectiveLiturgicalDay 사용. lauds/vespers 도 마이그레이션 OR compline-only 의도 명시.
4. **NIT** — Christmas firstCompline 테스트 코멘트 stale (loth-service.test.ts:230): 'eve-shifted to Thu slot' 코멘트가 Phase B always-SAT 후 stale. assertion 강화 권고.
5. **OPEN** — legacy /pray/SAT/{vespers,compline} URL deprecation policy 미결정. 영구 백워드 호환 vs SW vN redirect.

### F-X3 Phase batch backlog (#228 audit 권고, 사용자 결정 대기)

| Phase | scope | 우선도 |
|---|---|---|
| **F-X3-A pilot** | Hymn 5개 phrase 주입 (PDF column-width-aware builder spike) | **P1** |
| **F-X3-B sweep-hymn-w1** | Hymn ~30개 batch | P1 |
| **F-X3-C intercession** | seasonal 73 file / 248 stanza phrase 주입 | **P1** |
| **F-X3-D sweep-hymn-rest** | hymn 92개 batch | P1 |
| **F-X3-E rebuild-r14a** | 시편 29 entries R-2 builder 재실행 | P2 |
| **F-X3-F gospel-canticle-spike** | Benedictus/Magnificat/NuncDimittis schema 격상 | P3 spike |

### F-X2 Phase 3 (emergent from #224, 별 task 미생성)

3 cases (catalog text ≠ PDF text → text+page joint override schema 필요):
- Psalm 110 W2-SUN-vespers (p.186)
- Psalm 100 W3-FRI-lauds (p.380)
- Psalm 147 W4-FRI-lauds (p.493)

권장 schema: `psalmPrayerOccurrences[]` 의 entry 가 page 외 text 도 보유 (현재 Phase 1 의 lean Option A 는 page 만)

## 운영 메모

### EnterWorktree base mismatch (systemic, 20+ 회 재현)
- 우회 protocol (memory feedback_enterworktree_base_mismatch.md):
  1. 멤버: dispatch 받으면 `git rev-list --left-right --count <base>...HEAD` 로 ahead/behind 확인
  2. behind 시: `git rebase --onto <base>` 또는 reset --hard
  3. 단일 commit 으로 ff-mergeable 만들기
- 이번 세션 20+ dispatch 모두 우회로 안정 운영. #171 DEFERRED 그대로.

### Auto-clear standing rule (이번 세션 활성화 유지)
- `.claude/scaffold/cowork-clear-auto.json` 의 `divineoffice.enabled=true` (cooldown 15min)
- 이번 세션 4회 fire (cleared: dev × 2, divine-researcher × 1, divine-review × 1, member-01 × 2, solver × 1). 1회 cooldown 직전 skip
- 비활성화: `/pair-cowork-clear auto off`

### read-only profile fitness conflict
- divine-researcher (Explore) 의 docs file write 시 충돌 발생 (#228)
- 우회: leader 가 inline markdown 본문 받아 main repo 에 직접 commit (옵션 A)
- memory `feedback_dispatch_role_permission_check.md` 정합

### 시즌 자동 분기 패턴 (FR-easter-3 / F-2 / Marian / firstVespers 4 sweep 모두 동일)
1. 데이터 (ordinarium 또는 propers JSON) 에 시즌별 variant author
2. assembler 가 dayInfo + effectiveLiturgicalDay 검사 후 분기
3. 컴포넌트는 변경 없음 (default 값 SSOT 가 backend, frontend 토글 보존)
4. L2 integration test 가 assembleHour 통한 real Layer-4 layering 검증

### PDF SSOT 패턴
이번 세션 다수 PDF verbatim 검증으로 사용자 추정 또는 audit 추정값 정정:
- "даатгал" vs "Дээд" — PDF 178 matches vs 0 → даатгал 채택 (NFR-002)
- Psalm 51 W2/W3/W4 page audit estimate +1 정정
- Psalm 118 W4 audit estimate +2 정정
- firstCompline always-SAT data-key — PDF subhead 'НЯМ ГАРАГУУДАД БОЛОН ИХ БАЯРУУДАД' SSOT

## 참고 문서

- `docs/handoff-fx2-psalmprayer-audit.md` — F-X2 deeper audit
- `docs/handoff-wi218-fx2-audit.md` — F-X2 1차 audit
- `docs/handoff-fx2-phase2-batch.md` — F-X2 Phase 2 batch + Phase 3 defer
- `docs/handoff-fx3-phrase-audit.md` — F-X3 phrase-unit 누락 전수조사 (262 lines)
- `docs/review-220-217-fx1.md` — F-X1 review verdict
- `docs/review-221-219-fx2-phase1.md` — F-X2 Phase 1 review
- `docs/review-226-224-fx2-phase2.md` — F-X2 Phase 2 review
- `docs/review-227-225-marian-phrase-unit.md` — Marian review
- `docs/review-231-230-fx5-firstvespers-relocation.md` — F-X5 R1+R2 review
- `docs/PRD.md` + `docs/traceability-matrix.md` — FR-NEW (#230 F-X5) 행 등재
- `parsed_data/full_pdf.txt` — PDF 텍스트 추출본 (PDF SSOT)

## 검증 명령 (재현)

```bash
cd "/home/min/myproject/divineoffice"
npx vitest run                                              # 842 PASS
npx tsc --noEmit                                            # 0 errors
npm run lint                                                # 0 target errors
node scripts/verify-phrase-coverage.js --check              # NFR-009j check
for v in psalter hymn compline propers psalter-body sanctoral; \
  do node scripts/verify-${v}-pages.js; done                # baseline 무회귀
git diff HEAD -- public/sw.js                               # CACHE_VERSION='divine-office-v5'
git status                                                  # working tree clean
```

## 다음 세션 시작 시 권장 순서

1. 사용자 추가 모바일 검증 또는 회귀 보고 시 즉시 dispatch
2. 회귀 0 이면: 우선순위 결정 dispatch
   - **F-X3-C intercession** (가장 단순, 자동 phrase 주입) 또는
   - **F-X3-A hymn pilot** (사용자 visible 매일)
   - **#239 MAJOR Sun-eve-of-Solemnity** UX edge
3. 또는 사용자 직접 영역 (모바일 PWA 재설치 검증, 라벨 정확성 확인 등)
