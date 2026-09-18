# Handoff — 2026-05-03 F-X5 follow-ups complete

## TL;DR

이전 핸드오프 (`4dbdc41`, 같은 날 firstVespers + Marian + psalmPrayer occurrence sweep) 이후 30 커밋 추가. F-X5 의 review #231 R2 가 권고한 5건 follow-up (#239) + #222 F-X1 nit + emergent NIT 6건 (#247) 까지 모두 land. 테스트 876/876 PASS, lint/tsc 0 error. main HEAD `1b1293f`, origin 동기. 4건 사용자 결정 게이트만 미해결로 남음.

## Pipeline state

- **main HEAD**: `1b1293f` (docs(review-248))
- **마지막 코드 변경**: `174f763` (#247 NIT batch impl)
- **origin**: 동기 (push 2회 완료 — 사용자 명시 승인)
- **테스트**: 876/876 PASS (vitest), lint 0, tsc 0
- **멤버**: 7명 전원 idle, light context (35-41k)
- **Auto-clear**: 활성, cooldown 15min, last_run `2026-05-03T06:30Z`

## Main HEAD progression (이번 세션)

```
3c79873 (이전 세션 베이스) [docs(handoff): Compline sweep]
  ↓ (30 커밋)
4dbdc41 docs(handoff): firstVespers + Marian + psalmPrayer occurrence sweep [이전 세션 마지막]
0ed83c0 fix(hours): F-X1 nit hardening (#222) — defensive Alleluia + render guards
f4cee2c fix(loth-service): F-X5 FU#1 (#240) — Sun II strip on non-privileged Sun + Mon Solemnity
1f4ccb7 fix(loth-service,hours): F-X5 FU#2+FU#3 (#242) — 404 gate + effectiveDay 균일화
f6395dd docs(review-241): #240 verdict APPROVED_WITH_ISSUES (CONDITIONAL)
30200e2 docs(review-243): #222 verdict APPROVED_WITH_ISSUES
beaaf73 fix(loth-service): F-X5 FU#4+FU#5 (#245) — Advent→Christmas boundary + privileged-Sun positive tests
7035e2d docs(review-244): #242 verdict APPROVED_WITH_ISSUES
97a400c docs(review-246): #245 (revise) verdict APPROVED_WITH_ISSUES
174f763 fix(#247): NIT batch — 6 cleanups (#239 FU#4 / #243 / #244 / #246)
1b1293f docs(review-248): #247 verdict APPROVED_WITH_ISSUES
```

## Landed work (task ID 단위)

### #222 — F-X1 nit defensive hardening (LOW, solver)
- `gospel-canticle-section.tsx` renderAntiphonRich `firstEmitted` flip 재배치 (compute blockOut 먼저, emit 후 flip)
- `seasonal-antiphon.ts` `ensureClosingPeriod` helper 추가 (plain helper 와 mirror), `[Аа]ллэлуяа/[уү]яа` 정규식 broaden (plain + 3 rich guards 모두)
- 변경: +63 -6 (production no-op shapes)

### #240 + #245 cumulative — F-X5 FU#1 (MAJOR, dev)
- `stripEveCards` 에 `isPrivilegedSunday` gate (SUN && season ∈ {ADVENT, LENT, EASTER}) — Universal Norms n.61 (Table of Liturgical Days) class 2 vs class 3/5 비교
- `isAdventToChristmasBoundary` (today.season=ADVENT && tomorrow.season=CHRISTMAS) override — Universal Norms n.40 (Christmas Vigil)
- `loth-service.test.ts` +9 테스트:
  - #240: Sts. Peter & Paul 2026-06-29, Lateran 2026-11-09, OT regression 06-14/15
  - #245: Annunciation 2030-03-24 NOT stripped, Immaculate Conception 2025-12-07 NOT stripped, Christmas 2028-12-24 STRIPPED
- traceability-matrix #245 FU#6: FR-NEW (#230 F-X5) "완료 (#230 Phase A+B; #216 F-2c 흡수; #240 FU#1; #245 FU#4+FU#5)"

### #242 — F-X5 FU#2+FU#3 (MINOR batch, dev)
- **FU#2 (404 gate)**: `isFirstVespersEligibleDate` (date-only public wrapper) export → `page.tsx` `notFound()` + `route.ts` 404 (hour ∈ {firstVespers, firstCompline} && 비적격 날짜)
- **FU#3 (effectiveLiturgicalDay)**: `lauds.ts` L99 / `vespers.ts` L76 — F-2 swap 호출이 `ctx.liturgicalDay` 직접 read → `ctx.effectiveLiturgicalDay ?? ctx.liturgicalDay` (compline.ts 패턴 대칭). 리뷰어 핵심 발견: 단순 방어가 아니라 FR-156 + F-X5 promotion 경로의 silent F-2 miss 를 실제로 닫음
- `route.test.ts` +10 integration 테스트, `error-handling.spec.ts` +6 e2e (BLOCKED 환경)

### #247 — NIT batch (LOW, solver)
6건 review-finding 통합 cleanup:
- `gospel-canticle-section.tsx` empty-text rubric-line guard (`if (!block.text.trim()) continue`)
- `loth-service.ts` jsdoc Easter Octave caveat (L778)
- `loth-service.test.ts` stale comment fix L394, Annunciation label correction L159, alternate-prayer text/page assertion strengthening
- `route.ts` 404 hint with next-day URL (L35)
- `route.test.ts` +2 (Sat 2022-12-24 404 + Ascension 2026-05-14 firstCompline 200)

## 사용자 결정 게이트 (미해결)

다음 사이클에서 사용자 input 필요:

1. **#239 FU#5 — legacy /pray/SAT/{vespers,compline} URL deprecation policy**
   - 영구 호환 vs SW vN redirect 결정 필요. 현재는 404 게이트만 들어감 (#242 FU#2)

2. **F-X3 6-stage 배치 — Phase A 시작 승인**
   - A pilot (hymn 5), B sweep-hymn-w1 (~30), C intercession (73), D sweep-hymn-rest (92), E rebuild-r14a (시편 29), F gospel-canticle-spike
   - audit 자체는 #228 완료, 실 적용 phase 결정 대기

3. **F-X2 Phase 3 emergent — 3 text-mismatch (Psalm 110 W2, 100 W3, 147 W4)**
   - text+page joint override schema 결정 필요 (현재 Phase 2 batch #224 까지 land)

4. **#247 review (#248) NIT-on-NIT 3건** — 다음 NIT batch 로 defer
   - `gospel-canticle-section.tsx:94` inline comment 정정 (downstream guard 가 case 를 잡지 않음)
   - `route.ts:35` 404 hint year boundary (2100 → invalid 2101 제안)
   - `loth-service.ts:778` jsdoc 일반화 (easter 만 언급, christmas/advent SUN slot 누락)

## Operational follow-ups

- **Stale dev server 정리** PID 4038450/4038451/4038463 (worktree `162-solver`, port 3200, 4일+ orphan, leader sandboxing 으로 kill 불가). 사용자 직접 SIGTERM 필요
- **#171 [DEFERRED]** EnterWorktree base mismatch fix Option B (사용자 보류 유지, 우회책 git fetch + rebase --onto 활용 중)

## 이번 세션 메모리 추가/유지

- `feedback_phase_amend_pattern.md` (신규, #230 F-X5 사례) — dev 의 Phase A→B 자체 amend 진화
- `feedback_pdf_ssot_verbatim.md` (신규) — 사용자 추정 vs PDF verbatim 충돌 시 PDF 채택 (3 사례 누적)

## Next session 시작 체크포인트

1. `git log --oneline -5` 로 1b1293f 가 origin/main HEAD 인지 확인
2. `npm run test` (vitest) 876/876 baseline 재확인
3. 위 4 사용자 결정 게이트 중 우선순위 확인
4. F-X3 audit 결과 (#228) 가 phase A 시작 trigger — `docs/audit-fx3-*.md` 검토 후 dispatch
