# Re-review 246 — #245 (revise of #240 per #241 review, FU#4+#5+#6 cumulative)

> **TL;DR** — **APPROVED_WITH_ISSUES** (NIT only — test comment 라벨 정확성). dev 의 revise (`beaaf73`) 가 #241 R1 의 3 follow-up (MAJOR×2 + MINOR) 모두 정확히 closes. FU#4 (Universal Norms n. 40 boundary) 는 Sun Advent + Mon Christmas 만 정확히 catch (4년치 empirical probe 확인), FU#5 (privileged-Sun positive tests 3개) 는 silent breakage 회귀가드 확보, FU#6 (traceability-matrix annotation) 정확히 적용. 잔여 NIT 1건: 2030-03-25 Annunciation 테스트 코멘트가 "Solemnity of Saints" 로 표기 (실제 Solemnity of the Lord, rank 결론은 변동 없음). vitest 852/852 PASS, lint/tsc clean. **Status**: ready to merge. **Risk**: LOW. **Next**: leader merge.

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Subject commit | `beaaf73` (worktree-240-dev, revise of #240) |
| Base commit | `70e2ef3` (Merge #222) |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES** (NIT only) |
| Peer (codex/quality_auditor) | APPROVED_WITH_ISSUES (HIGH confidence) — 합의 |
| #241 R1 status | All 3 follow-ups closed |

---

## 1. 변경 요약

`src/lib/loth-service.ts` `getHoursSummary()`:

```ts
// FU#4 — Universal Norms n. 40 boundary
const isAdventToChristmasBoundary =
  isPrivilegedSunday &&
  day.season === 'ADVENT' &&
  !!tomorrowDay &&
  tomorrowDay.season === 'CHRISTMAS'

// FU#1 + FU#4 combined gate
const stripEveCards =
  tomorrowHasFirstVespers && (!isPrivilegedSunday || isAdventToChristmasBoundary)
```

**Truth table**:

| `isPrivilegedSunday` | `isAdventToChristmasBoundary` | strip? | 적용 사례 |
|---|---|---|---|
| false | (false) | strip if tomorrow has FV | Sun OT + Mon Solemnity (FU#1 base) |
| true | true | **strip** | Sun Advent + Mon Christmas (Dec 24 = Sun, FU#4) |
| true | false | don't strip | Sun Lent + Mon Annunciation / Sun Advent + Mon Immaculate Conception |

신규 테스트 3건 (`@fr FR-NEW (#245)`):
- (FU#5 positive #1) `2030-03-24` Sun Lent + Mon Annunciation → **5 hours**
- (FU#5 positive #2) `2025-12-07` Sun Advent + Mon Immaculate Conception → **5 hours** (boundary precision: tomorrow.season=ADVENT NOT CHRISTMAS)
- (FU#4 boundary) `2028-12-24` Sun 4th Advent + Mon Christmas → **3 hours**

`docs/traceability-matrix.md` row updated with full chain: `#230 Phase A+B + #216 F-2c 흡수 + #240 FU#1 + #245 FU#4 + FU#5`.
`docs/traceability-auto.md` regen.

---

## 2. AC 검증 (Phase C — re-review)

| ID | Type | Criterion | Verification | Verdict |
|---|---|---|---|---|
| AC-1 | executable | vitest full suite passes | `npx vitest run` | **MET** — 852 passed (44 files; 846 base + 6 new) |
| AC-2 | executable | tsc --noEmit clean | `npx tsc --noEmit` | **MET** — "No errors found" |
| AC-3 | executable | eslint clean (changed files) | `npm run lint -- ...` | **MET** — "No issues found" |
| AC-4 | semantic | **#241 R1 §3.1 (FU#4) closes** — Sun Advent + Mon Christmas duplicate rendering | empirical vitest probe: 2028/2034/2017/2023-12-24 모두 3 hours | **MET** |
| AC-5 | semantic | **#241 R1 §3.2 (FU#5) closes** — privileged Sun positive coverage | 2 새 positive 테스트 단언 5 hours when guard active | **MET** |
| AC-6 | structural | **#241 R1 §3.3 (FU#6) closes** — traceability annotation | `grep '#240 FU#1\|#245 FU#4'` in traceability-matrix.md | **MET** |
| AC-7 | semantic | Boundary precision — FU#4 fires ONLY on Christmas, not other Mon Solemnities in Advent | 2025-12-07 (Sun Advent + Mon Immaculate Conception) → 5 hours probe + test | **MET** |
| AC-8 | structural | regression — 모든 prior fix (#230/#240/#214 F-2/etc.) 호환 | 기존 13 테스트 모두 PASS | **MET** |

**Coverage gate**: 8 MET → **APPROVED_WITH_ISSUES (NIT only)**.

---

## 3. Adversarial Findings

### 3.1 NIT — 테스트 코멘트 Annunciation 라벨 부정확 (peer co-discovered)

**위치**: `src/lib/__tests__/loth-service.test.ts:159` (FU#5 첫 테스트 코멘트)

**현재 표기**:
```
// 2030-03-25 = Mon Annunciation of the Lord (SOLEMNITY of
// Saints, class 3, sanctoral.firstVespers data present).
```

**부정확성**: 코멘트 내부 모순 — "Annunciation of the Lord" 로 부르고 다음 줄에서 "SOLEMNITY of Saints" 로 분류. Annunciation 은 Solemnity of the Lord (성모영보 — 그리스도 incarnation 사건) 임. 단 n. 59 Table of Liturgical Days 상 class 3 (universal-calendar Solemnities, "of the Lord, BVM, Saints" 묶음) 에 위치 — rank 결론 (class 2 Sun Lent > class 3 Solemnity) 자체는 정확.

**peer 인용 (HIGH confidence)**: "Annunciation is a Solemnity of the Lord. The rank conclusion is still correct: it is not one of n.59 item 2's four top Lord solemnities, so a Lent Sunday still outranks it."

**프로덕션 영향**: 0 — 테스트 단언/실행은 정확. 코드 동작 무관.

**옵션**:
```diff
- // (SOLEMNITY of Saints, class 3, sanctoral.firstVespers data present).
+ // (SOLEMNITY of the Lord, class 3 in Table n. 59, sanctoral.firstVespers
+ //  data present).
```

NIT 수준, 머지 후 처리 가능.

### 3.2 No new latent regression (peer Q6 PARTIALLY_MET → no-behavioral)

코드 변경:
- 기존 `stripEveCards = tomorrowHasFirstVespers && !isPrivilegedSunday` (FU#1)
- 새 `stripEveCards = tomorrowHasFirstVespers && (!isPrivilegedSunday || isAdventToChristmasBoundary)`

`isAdventToChristmasBoundary` 가 false 일 때 동작은 FU#1 와 동일 (truth table OR 의 short-circuit). `isAdventToChristmasBoundary === true` 인 경우는 정확히 Dec 24 = Sun 케이스 (recurrence ~6-7 yr) — 이전엔 over-protected 되었으나 이제 정확히 strip. 다른 케이스 영향 0.

**peer Q4 응답**: "No additional Monday Solemnity-of-the-Lord duplicate path is introduced. Christmas Monday is covered; Jan 1/Baptism/Epiphany-style Christmas-season Sundays are non-privileged and governed by FU#1 when firstVespers data exists. Pentecost/Trinity are Sunday observances, not Monday-first-vespers cases."

→ 추가 over-protection 케이스 없음.

### 3.3 Empirical edge probe (이번 re-review에서 직접 실행)

```
2028-12-24 (Sun ADVENT 4thSun) → 2028-12-25 (Mon CHRISTMAS):  3 hours ✓ FU#4 fires
2034-12-24 (Sun ADVENT 4thSun) → 2034-12-25 (Mon CHRISTMAS):  3 hours ✓ FU#4 fires (recurrence)
2017-12-24 (Sun ADVENT 4thSun) → 2017-12-25 (Mon CHRISTMAS):  3 hours ✓ historical
2023-12-24 (Sun ADVENT 4thSun) → 2023-12-25 (Mon CHRISTMAS):  3 hours ✓ historical
2025-12-07 (Sun ADVENT 2ndSun) → 2025-12-08 (Mon Imm.Conc.): 5 hours ✓ NOT triggered (precise scope)
2030-03-24 (Sun LENT 3rdSun)   → 2030-03-25 (Mon Annunc.):   5 hours ✓ NOT triggered (LENT≠ADVENT)
2026-04-05 (Sun EASTER)        → Mon Easter (no FV):         5 hours ✓ NOT triggered
2026-06-28 (Sun OT)            → Mon Sts. P&P (Solemnity):    3 hours ✓ FU#1 regression preserved
2026-06-14 (Sun OT)            → Mon weekday:                 5 hours ✓ no strip
2025-12-14 (Sun ADVENT 3rdSun) → Mon weekday:                 5 hours ✓ no strip
```

모든 시나리오 액티브 + 정확. Boundary precision 검증 완료.

---

## 4. Tests / Lint / Typecheck 증거

```
npx vitest run (worktree-246-divine-review @ beaaf73 overlay)
  Test Files  44 passed (44)
       Tests 852 passed (852)              ← 846 base (post #222 merge) + 6 new
   Duration  ~5 s

npx vitest run src/lib/__tests__/loth-service.test.ts
       Tests  34 passed (34)               ← 28 prior + 6 new

npx tsc --noEmit
  No errors found

npm run lint -- src/lib/loth-service.ts src/lib/__tests__/loth-service.test.ts
  No issues found
```

---

## 5. #241 R1 follow-up resolution status

| 권고 | Severity | 처리 | Verdict |
|---|---|---|---|
| FU#4: Sun Advent + Mon Christmas over-protection | MAJOR | `isAdventToChristmasBoundary` 추가 (Universal Norms n. 40 직접 인용) | **CLOSED** |
| FU#5: Privileged Sunday positive test | MAJOR | 2 positive + 1 boundary 테스트 추가 | **CLOSED** |
| FU#6: traceability-matrix annotation | MINOR | row 갱신 (`#240 FU#1; #245 FU#4 + FU#5`) | **CLOSED** |

3/3 closed. 본 re-review 추가 신규 finding 1건 (NIT — §3.1, 테스트 코멘트 라벨 정확성).

---

## 6. Optional nits (pre-existing or out-of-scope)

- (#241 R1 §3.4 carryover) `PRIVILEGED_SEASONS` 상수 추출 — 여전히 inline. clarity 만의 NIT, 머지 영향 없음.

---

## 7. References

- 검토 대상 commit: `beaaf73` (worktree-240-dev)
- 모상위 review: `docs/review-241-240-fx5-fu1-sun-eve-solemnity.md` (R1, 본 revise 의 입력)
- Liturgical reference: Universal Norms on the Liturgical Year n. 40 (Advent 종결 boundary), n. 59 (Table of Liturgical Days), n. 61 (Vespers collision)
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-246/peer/exchanges/ex_20260503T015743Z_d1498b2d/response.txt`
