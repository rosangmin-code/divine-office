# Review 244 — #242 F-X5 FU#2+FU#3 MINOR batch

> **TL;DR** — **APPROVED_WITH_ISSUES** (delivery-ready, NIT-only follow-ups). dev 의 fix (`1f4ccb7`) 는 #231 R2 의 FU#2 (404 게이트) + FU#3 (effectiveLiturgicalDay 균일화) 두 MINOR 항목을 정확히 처리한다 (vitest 864/864 PASS, +19 vitest tests + 6 Playwright e2e, tsc clean, 변경 파일 lint clean). 3개 NIT 잔여 (UX 404 메시지 비안내, 테스트 커버리지 갭, 코멘트 overbroad 표현). **Status**: pending leader merge. **Risk**: LOW. **Next**: leader merge OK + 옵션 follow-up (테스트 1-2 케이스 추가).

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Subject commit | `1f4ccb7` (worktree-242-dev) |
| Base commit | `4dbdc41` |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES** (NIT only) |
| Peer (codex/quality_auditor) | APPROVED_WITH_ISSUES (HIGH confidence) — 합의 |

---

## 1. 변경 요약

### 1.1 FU#2 — Non-Sunday URL 404 게이트

**신규**: `src/lib/loth-service.ts::isFirstVespersEligibleDate(dateStr)`. 내부 `hasFirstVespersAndCompline` 의 date-only 공개 wrapper. 적격: Sunday | fixed-date Solemnity/Feast (sanctoral.firstVespers) | movable Solemnity (resolveSpecialKey path).

**적용**:
- `src/app/pray/[date]/[hour]/page.tsx` — `notFound()` for `firstVespers`/`firstCompline` on non-eligible date
- `src/app/api/loth/[date]/[hour]/route.ts` — `404 NextResponse` 동일 게이트

검증 순서: invalid date / invalid hour (400) → FU#2 게이트 (404) → assembleHour. 기존 400 회귀 테스트가 게이트 우선순위 단언.

### 1.2 FU#3 — `effectiveLiturgicalDay` 균일화

`shouldUseAlternateConcludingPrayer` 호출이 `ctx.effectiveLiturgicalDay ?? ctx.liturgicalDay` 사용:
- `src/lib/hours/lauds.ts` L99 — forward guarantee (현재 lauds 는 promotion 경로 무, 대칭성 확보)
- `src/lib/hours/vespers.ts` L76 — **실효성 있는 fix**: FR-156 Sat-vespers 의 eve-of-Solemnity promotion (loth-service.ts L209-280) + F-X5 firstVespers route (L307-371) 모두 effectiveLiturgicalDay 채움. 이전엔 vespers F-2 swap 이 eve weekday 의 rank 만 보고 silent miss.

`compline.ts` (#216 F-2c) 와 동일 패턴. 4 헬퍼가 동일 SSOT (`effectiveLiturgicalDay ?? liturgicalDay`) 일관 사용.

### 1.3 신규 테스트 (+22 vitest, +6 Playwright)

- `loth-service.test.ts` +8: `isFirstVespersEligibleDate` 단위 (Sunday + Solemnity + Feast + movable + Sat + ordinary weekday + invalid date)
- `vespers.test.ts` +2: effective day promotion → swap fires / no effective day → fallback
- `lauds.test.ts` +2: 동일 구조 (forward guarantee)
- `api/loth/[date]/[hour]/__tests__/route.test.ts` +10 (신규 파일): GET 핸들러 통합 — 404 게이트 verbatim, 200 회귀, 400 우선순위
- `e2e/error-handling.spec.ts` +6: Playwright 평일 firstVespers/firstCompline → 404, API → 404, regression 200

---

## 2. AC 검증 (Phase C)

| ID | Type | Criterion | Verification | Verdict |
|---|---|---|---|---|
| AC-1 | executable | vitest full suite passes | `npx vitest run` | **MET** — 864 passed (+19 vs 845 base) |
| AC-2 | executable | tsc --noEmit clean | `npx tsc --noEmit` | **MET** — "No errors found" |
| AC-3 | executable | eslint clean (changed files) | `npm run lint -- ...` | **MET** — "No issues found" (변경 파일 한정; 무관 4 사전 issue 그대로) |
| AC-4 | structural | FU#2: 404 게이트 동치 적용 (page.tsx + route.ts) | grep `isFirstVespersEligibleDate` | **MET** — 2 호출 동일 조건 |
| AC-5 | semantic | FU#2: ordinary weekday/Sat 404 + Sun/Solemnity 200 회귀 | route.test.ts +10 + e2e +6 | **MET** |
| AC-6 | structural | FU#3: lauds.ts L99 + vespers.ts L76 effectiveDay ?? 적용 | grep `effectiveLiturgicalDay ??` | **MET** — 4 헬퍼 (lauds, vespers, compline, [implicit firstVespers]) 일관 |
| AC-7 | semantic | FU#3: vespers F-2 promotion 시 swap 실제 발화 | vespers.test.ts +2 (promoted day → ALTERNATE) | **MET** |
| AC-8 | structural | regression — 기존 #214 F-2 / #216 F-2c / #230 F-X5 모두 PASS | full suite | **MET** |

**Coverage gate**: 8 MET → **APPROVED_WITH_ISSUES (NIT only)**.

---

## 3. Adversarial Findings

### 3.1 NIT — Sat URL 404 사용자 발견성 (peer co-discovered)

**증상**: Sat Dec 24 (e.g., 2022-12-24, 2033-12-24) 의 `/pray/<sat>/firstVespers` 가 404 응답하지만, 사용자가 "내 Christmas I Vespers 가 어디 있나?" 알려주는 redirect/안내 부재. F-X5 모델 상 컨텐츠는 다음 일자 (Sun Dec 25 이거나 Sun=Dec 24 의 firstVespers — Sun 케이스) 의 URL 에 있음.

**peer 인용 (Q2 PARTIALLY_MET)**: "no explicit redirect/message points from Sat Dec 24 to Dec 25 firstVespers".

**프로덕션 영향**: 미미. 사용자가 카드 리스트로 진입하면 적절한 URL 로 이동 (홈페이지 → 다음일자 화살표). 직접 URL 입력 시에만 404 도달.

**옵션**: 404 페이지에 "이 시간 전례는 다음 페이지에 있습니다 → /pray/<next-day>/firstVespers" 또는 자동 redirect. NIT 수준 — 스코프 외.

### 3.2 NIT — 테스트 커버리지 갭 (peer co-discovered)

**부족 시나리오**:
- Christmas Eve (Sat Dec 24, e.g., 2022-12-24) 직접 URL 404 케이스 — 현 테스트가 일반 Sat (2030-06-15) 만 검증
- Movable Solemnity 의 `firstCompline` route-level positive — 현 route.test.ts 는 firstCompline 200 케이스가 fixed-date Solemnity (Christmas 2026-12-25) 만. movable (Ascension/Pentecost/Trinity/CorpusChristi/SacredHeart/ChristTheKing) 의 firstCompline 200 검증 없음

**peer 인용 (Q5 PARTIALLY_MET)**: "tests cover ordinary weekday/Saturday negatives and Sunday/fixed positives, but not the exact Dec 24 Christmas Eve direct URL, nor a movable Solemnity route-level 200 for both firstVespers/firstCompline".

**옵션** (1-2 케이스 추가):
```ts
it('returns 404 for firstVespers on Sat Dec 24 (Christmas Eve, regression)', async () => {
  const res = await callGet('2022-12-24', 'firstVespers')
  expect(res.status).toBe(404)
})

it('returns 200 for firstCompline on a movable Solemnity (Ascension 2026-05-14 Thu)', async () => {
  const res = await callGet('2026-05-14', 'firstCompline')
  expect(res.status).toBe(200)
})
```

NIT 수준. 머지 후 별도 task 가능.

### 3.3 NIT — `isFirstVespersEligibleDate` jsdoc overbroad (peer co-discovered)

**증상**: jsdoc 코멘트 (line 815-816) 가 "any Sunday (Phase 2 #20: `weeks[N].SUN.firstVespers` always present as data, with backstop merge from regular Sunday vespers)" 라고 표현. Easter Octave week 1 의 일부 Sunday/Solemnity 데이터에서는 `firstVespers` 슬롯이 비어 있어 backstop merge 가 fire — "always present as data" 는 문자 그대로 사실이지만, 실제 컨텐츠가 backstop 의존 케이스 존재.

**peer 인용 (caveat 3)**: "Easter week 1 lacks a firstVespers slot in current data, so that assertion is overbroad".

**프로덕션 영향**: 0 — 게이트는 항상 Sunday=true 이고 backstop merge 가 user-visible 로 정상 컨텐츠 제공. 코멘트 정확성 NIT.

**옵션**: 코멘트 보강 — "Phase 2 #20: every Sunday is eligible (data slot may be empty in Easter Octave; regular Sunday vespers backstop merge handles content)".

### 3.4 No new latent bug (peer Q6 MET)

코드 변경은 모두 `?? operator` fallback 또는 게이트 추가 — 기존 호출자에 대해 behavior-equivalent. FR-156 / F-X5 promotion 경로에 effectiveLiturgicalDay 가 채워지지 않은 경로는 모두 fallback 으로 기존 동작 유지.

---

## 4. Tests / Lint / Typecheck 증거

```
npx vitest run (worktree-244-divine-review @ 1f4ccb7 overlay)
  Test Files  45 passed (45)               ← +1 vs base 44 (route.test.ts 신규)
       Tests 864 passed (864)              ← 845 base + 19 신규
   Duration  ~5 s

npx tsc --noEmit
  No errors found

npm run lint -- src/lib/loth-service.ts \
                src/app/pray/[date]/[hour]/page.tsx \
                src/app/api/loth/[date]/[hour]/route.ts \
                src/app/api/loth/[date]/[hour]/__tests__/route.test.ts \
                src/lib/hours/lauds.ts \
                src/lib/hours/vespers.ts \
                src/lib/__tests__/loth-service.test.ts \
                src/lib/__tests__/hours/lauds.test.ts \
                src/lib/__tests__/hours/vespers.test.ts
  No issues found
```

(전체 `npm run lint` 는 무관 4 파일에 사전 `no-unused-vars` issue — #242 와 무관, 본 batch 에서 수정 책임 없음)

---

## 5. Required follow-ups

(Optional — NIT only, 머지 가능)

1. **(NIT) 404 페이지 UX 안내** (§3.1) — Sat/이브 URL 404 시 다음일자 URL 안내 또는 redirect.
2. **(NIT) 테스트 커버리지 보강** (§3.2) — Sat Dec 24 + movable Solemnity firstCompline 200.
3. **(NIT) jsdoc 정확성** (§3.3) — Sunday "always present" 표현 보강.

---

## 6. Optional nits

- e2e (Playwright) 테스트는 본 환경에서 미실행 (kill 권한/Turbopack file-handle 한계). route handler vitest 가 동일 코드 경로 검증 → 통합 보장. CI 환경에서 e2e 별도 검증.

---

## 7. References

- 검토 대상 commit: `1f4ccb7` (worktree-242-dev)
- 모상위 review: `docs/review-231-230-fx5-firstvespers-relocation.md` (R2 — FU#2/FU#3 권고 출처)
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-244/peer/exchanges/ex_20260503T014750Z_dcc5e9e5/response.txt`
