# Review 241 — #240 F-X5 FU#1 (Sun-eve-of-Solemnity 중복 렌더링 fix)

> **TL;DR** — **APPROVED_WITH_ISSUES (CONDITIONAL)**. dev 의 fix (`f4cee2c`) 는 Sun OT/CHRISTMAS + Mon Solemnity/Feast 케이스에서 중복 렌더링을 정확히 차단한다 (vitest 845/845 PASS). 단 (a) **Sun ADVENT + Mon Christmas (예: 2028-12-24)** 케이스는 `isPrivilegedSunday` over-protection 으로 동일 중복 렌더링 잔존 (MAJOR, 6-7 년 주기 재발), (b) **privileged-Sunday 게이트의 positive 테스트 부재** — gate 가 silent 하게 망가져도 suite 통과 (MAJOR), (c) traceability-matrix FU#1 주석 누락 (MINOR). **Status**: pending leader decision. **Risk**: MEDIUM (recurring edge, 다음 발현 2028-12-24). **Next**: leader 머지 가/부 결정 + FU#4 (Christmas Eve case) tracking.

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | dev |
| Subject commit | `f4cee2c` (worktree-240-dev) |
| Base commit | `4dbdc41` |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES (CONDITIONAL)** |
| Peer (codex/quality_auditor) | **NOT_APPROVED** (broader duplicate-rendering goal failure) |
| Disagreement note | Verdict 강도 차이 — 아래 §5 disagreement section 참조 |

---

## 1. 변경 요약

### 1.1 코드 변경 (`src/lib/loth-service.ts`)

`getHoursSummary()` 의 eve-strip 게이트:

| | Pre-FU#1 (#230) | Post-FU#1 (#240) |
|---|---|---|
| 조건 | `dayOfWeek !== 'SUN' && tomorrowHasFirstVespers` | `tomorrowHasFirstVespers && !isPrivilegedSunday` |
| `isPrivilegedSunday` | (없음) | `dayOfWeek === 'SUN' && day.season ∈ {ADVENT, LENT, EASTER}` |
| Sun OT/Christmas + Mon Solemnity/Feast | **strip 안 함** (← 버그) | **strip** (3 hours: firstVespers/firstCompline/lauds) |
| Sun Advent/Lent/Easter + Mon Solemnity/Feast | strip 안 함 | strip 안 함 (privileged guard) |
| Non-Sun + Mon firstVespers | strip | strip (변화 없음) |

Jsdoc/comment 도 변경된 동작을 반영해 갱신됨 (Universal Norms n. 61 인용 + Phase B 잔존 follow-up 코멘트 정리).

### 1.2 테스트 변경 (`src/lib/__tests__/loth-service.test.ts`)

신규 3 케이스 (`@fr FR-NEW (#240 F-X5 FU#1)`):
1. `2026-06-28` (Sun OT) → `2026-06-29` (Sts. Peter & Paul SOLEMNITY) → 3 hours assertion
2. `2026-11-08` (Sun OT) → `2026-11-09` (Lateran Basilica FEAST of Lord) → 3 hours assertion
3. `2026-06-14` (Sun OT) → `2026-06-15` (regular OT weekday) → 5 hours assertion (regression guard)

---

## 2. AC 검증 (Phase C)

| ID | Type | Criterion | Verification | Verdict |
|---|---|---|---|---|
| AC-1 | executable | vitest full suite passes | `npx vitest run` | **MET** — 845 passed (44 files) |
| AC-2 | executable | tsc --noEmit clean | `npx tsc --noEmit` | **MET** — "No errors found" |
| AC-3 | executable | eslint clean (changed files) | `npm run lint -- src/lib/loth-service.ts src/lib/__tests__/loth-service.test.ts` | **MET** — "No issues found" |
| AC-4 | semantic | Sun OT/Christmas + Mon Solemnity/Feast 중복 렌더링 차단 | 신규 테스트 2건 + behavioral probe | **MET** |
| AC-5 | semantic | privileged Sunday (ADVENT/LENT/EASTER) 보호 | code review + behavioral probe | **PARTIALLY_MET** — 보호 자체는 작동하지만 (a) Sun Advent + Mon Christmas 케이스에서 over-protection (b) positive 테스트 없음 |
| AC-6 | structural | regression guard 유지 (#230 호환) | 기존 #230 테스트 8개 모두 PASS | **MET** |
| AC-7 | structural | 자기리뷰 (CLAUDE.md) — traceability-matrix FU#1 주석 | grep `docs/traceability-matrix.md` for #240 | **NOT_MET** — FR-NEW (#230 F-X5) 행이 #240 FU#1 미반영 |

**Coverage gate**: 5 MET + 1 PARTIALLY_MET (MAJOR) + 1 NOT_MET (MINOR) → **APPROVED_WITH_ISSUES (CONDITIONAL)**.

---

## 3. Adversarial Findings

### 3.1 MAJOR — Sun ADVENT + Mon Christmas 중복 렌더링 잔존

**증상**: `getHoursSummary('2028-12-24')` (Sun, 4th Sunday of Advent, season=ADVENT) → 5 hours **포함 vespers + compline**. 동시에 `getHoursSummary('2028-12-25')` (Mon, Christmas, season=CHRISTMAS, sanctoral.firstVespers 보유) → 5 hours **포함 firstVespers + firstCompline**. 두 카드가 같은 Sunday-night Christmas Vigil 컨텐츠를 렌더 → **동일한 #240 base 버그 패턴**.

**증거**: 본 리뷰의 임시 vitest probe (`src/lib/__tests__/_tmp/probe-edge-cases.test.ts`, post-review 정리됨):
```
2028-12-24 (Sun): rank=SOLEMNITY season=ADVENT name="4th Sunday of Advent" hours=[firstVespers,firstCompline,lauds,vespers,compline]
2028-12-25 (Mon): rank=SOLEMNITY season=CHRISTMAS name="Christmas"          hours=[firstVespers,firstCompline,lauds,vespers,compline]
2034-12-24 (Sun): 동일 패턴
```

**원인**: `isPrivilegedSunday` 가 **모든** ADVENT Sun 을 보호. 하지만 Christmas (Solemnity of the Lord) 는 Universal Norms n. 40 의 명시적 경계 — "Advent ends with First Vespers of Christmas" — 에 의해 4th Sun Advent 의 II Vespers 를 displace. 즉 isPrivilegedSunday 가 Christmas Eve 에서 **over-protective**.

**Liturgical 근거** (peer audit 인용 정정):
- Universal Norms n. 40 (Liturgical Year): "**Advent has a twofold character... it ends before First Vespers of the Nativity of the Lord**"
- 따라서 12-24 evening 이 (요일과 무관하게) 항상 Christmas I Vespers — Sunday II Vespers 가 아니라.
- (peer 정정: "Christmas > 4th Advent within class 2 의 sub-priority 비교"보다 "Advent/Christmas 시즌 boundary 자체"가 더 정확한 근거)

**재발 빈도**: Dec 24 = Sun 은 약 6-7 년 주기. 직전 2017, 2023; 다음 2028 (2.5 년 후), 2034.

**범위 분석** (peer Q2 답변):
- Confirmed missed: Sun Advent → Mon Christmas (위)
- 영향 없음 / 정확히 보호됨: Sun Lent → Mon Annunciation (3-25) / Joseph (3-19) — Sun Lent (class 2) > Solemnity of Saints (class 3) → Sun 보호 정당
- 영향 없음: Sacred Heart (Fri) / Trinity, Pentecost, Christ the King (Sun) / Ascension, Corpus Christi (Thu/Sun)
- Watch: future 데이터에 Mon Baptism of the Lord (Epiphany Sun 다음 Mon) firstVespers 가 author 되면 동일 over-protection 가능

**추천 해결**:
- (옵션 A — 핀포인트) `isPrivilegedSunday` 에 `&& !(tomorrowDay.season === 'CHRISTMAS' && tomorrowDay.name === 'Christmas')` 예외 추가
- (옵션 B — 정공) precedence helper/table 도입 (peer 권고). today II Vespers 와 tomorrow I Vespers 의 table-rank 직접 비교 — Universal Norms n. 61 그대로. 단 day.rank 매핑 (현 codebase 가 모든 Sun 을 SOLEMNITY 로 표기) 이 inadequate 하므로 별도 precedence-class 메타데이터 필요.
- (옵션 C — 시즌 경계) `tomorrowDay.season === 'CHRISTMAS' && day.season === 'ADVENT'` 시 무조건 strip. Universal Norms n. 40 boundary 정확 반영. Lent→Easter Vigil 등에는 영향 없음 (Sat Lent 는 Sun 아님 → 본 게이트 미적용).

→ FU#4 로 별도 tracking 권고.

### 3.2 MAJOR — Privileged Sunday 게이트의 positive 테스트 부재

**증상**: 신규 3 테스트 모두 OT 시즌 Sunday (non-privileged) 만 검증. `isPrivilegedSunday === true` 분기가 strip 을 차단함을 직접 검증하는 테스트는 0 건.

**위험**: gate 가 silently 깨져도 (e.g. 시즌명 typo `'EASTER'` → `'EASTR'`, 또는 조건문 invert) 테스트 suite 가 PASS 한다. 회귀 가드 부재.

**peer 인용 (HIGH severity)**:
> "None proves `isPrivilegedSunday === true` blocks stripping. This is MAJOR because it is an explicit behavioral branch with real dates: e.g. `2025-12-07 → 2025-12-08` Immaculate Conception, `2029-03-18 → 2029-03-19` St Joseph, and `2030-03-24 → 2030-03-25` Annunciation."

**추천 추가 테스트** (1-2 케이스 충분):
- `2030-03-24` (3rd Sun Lent, privileged) → `2030-03-25` (Mon Annunciation, SOLEMNITY) → assert 5 hours (NOT stripped)
- `2025-12-07` (2nd Sun Advent, privileged) → `2025-12-08` (Immaculate Conception, SOLEMNITY) → assert 5 hours (NOT stripped)

이 테스트들이 있었다면 §3.1 의 Christmas Eve over-protection 도 작성 시점에 발견되었을 가능성이 높다 — Sun ADVENT 에서 strip 안 함을 단언하는 순간 "Mon Christmas 와 충돌하는데 정말 strip 안 해야 하나?" 질문이 자연스럽게 떠오른다.

### 3.3 MINOR — traceability-matrix FU#1 주석 누락

**증상**: `docs/traceability-matrix.md` 의 `FR-NEW (#230 F-X5)` 행 (line 27) 이 "**완료 (#230 F-X5 Phase A + B; #216 F-2c 흡수)**" 로 종결. #240 FU#1 추가가 미반영.

**CLAUDE.md self-review checklist** 의 "PRD / traceability-matrix 의 해당 FR 행이 현재 구현과 일치하는가?" 위반.

**추천**: 같은 행의 status 칸을 `완료 (#230 Phase A/B + #216 F-2c 흡수 + #240 FU#1)` 로 갱신. 구현 칸의 `getHoursSummary` 설명 끝에 "#240 FU#1: Sun OT/Christmas + Mon Solemnity/Feast 중복 렌더링 strip (privileged Sun 보호)" 한 줄 추가.

(PRD 자체에는 F-X5 dedicated 행이 없음 — 이는 #230 시점부터의 pre-existing 상태. FU#1 으로 신규 누락은 아님.)

### 3.4 NIT — `isPrivilegedSunday` 구현 정제 (peer Q4 응답)

peer 권고 (PARTIALLY_MET): "Season-proxy is too coarse. day.rank alone is also insufficient because the app maps Sundays to SOLEMNITY."

현 구현은 OK 하나, **장기**적으로는:
- `PRIVILEGED_SEASONS` 상수 추출 (clarity)
- 또는 precedence-class 헬퍼 도입 (옵션 B/C 와 통합)

§3.1 의 옵션 B 정공 해결 시 자연스럽게 흡수됨. 단독 NIT — 필수 아님.

---

## 4. Tests / Lint / Typecheck 증거

```
npx vitest run (worktree-241-divine-review @ f4cee2c overlay)
  Test Files  44 passed (44)
       Tests 845 passed (845)
   Start at  09:21:xx
   Duration  ~5 s

npx tsc --noEmit
  No errors found

npm run lint -- src/lib/loth-service.ts src/lib/__tests__/loth-service.test.ts
  No issues found
```

기존 #230 회귀 테스트 8 건 모두 PASS — `dayOfWeek !== 'SUN'` 게이트 제거 + `isPrivilegedSunday` 추가 후에도 호환.

---

## 5. Disagreement note (peer NOT_APPROVED vs reviewer APPROVED_WITH_ISSUES)

| 측면 | peer (codex/quality_auditor) | reviewer (divine-review) |
|---|---|---|
| Christmas Eve finding 사실관계 | **AGREE — HIGH confidence** | AGREE |
| Test coverage gap severity | MAJOR | MAJOR |
| Implementation quality | PARTIALLY_MET (season-proxy too coarse) | PARTIALLY_MET (NIT) |
| 최종 verdict | **NOT_APPROVED** | **APPROVED_WITH_ISSUES (CONDITIONAL)** |

**근거 차이**:
- peer: "원 review 의 'Sun II Vespers vs Mon Solemnity-I 충돌' 골은 broader duplicate-rendering goal. Christmas Eve 가 그 골에 해당. 따라서 fix 는 goal 미달 → NOT_APPROVED."
- reviewer: "FU#1 의 stated scope 는 commit 메시지에서 'Sun OT/Christmas + Mon Solemnity of Saints/Feast of Lord' 로 명시 narrow. dev 의 narrowing 은 liturgically 정당 (Sun Lent + Mon Annunciation 의 정확한 보호). Christmas Eve case 는 adjacent edge — FU#4 로 follow-up tracking 합리적."

**리더 판단 권고**: 어느 verdict 든 같은 follow-up (FU#4 + 테스트 추가) 을 trigger. peer 의 더 strict 한 stance 는 "Christmas Eve fix 를 머지 전 인라인 처리해야 한다" 입장이고, reviewer 의 stance 는 "follow-up 으로 분리해도 무방" 입장. 차이는 머지 시점의 tracking 강도.

---

## 6. Required follow-ups (FU#1 의 spillover)

1. **(MAJOR) FU#4 — Sun Advent + Mon Christmas over-protection** (§3.1)
   - 다음 발현: 2028-12-24 (2.5 년 후)
   - 옵션 A/B/C 중 선택 — 옵션 C (시즌 경계 직접) 가 가장 간단하고 Universal Norms n. 40 정확
2. **(MAJOR) FU#5 — Privileged Sunday positive test** (§3.2)
   - 1-2 케이스 추가 (Annunciation eve / Immaculate Conception eve)
   - FU#4 와 함께 처리 시 자연스럽게 추가됨 (FU#4 가 Christmas Eve 테스트를 추가해야 하므로 privileged 분기 별도 케이스도 같이 보강)
3. **(MINOR) FU#6 — traceability-matrix FU#1 주석** (§3.3)
   - 한 줄 갱신, lint 영향 없음

---

## 7. Optional nits

- `isPrivilegedSunday` constant 추출 (`PRIVILEGED_SEASONS as const`) — clarity, NIT (§3.4)
- Future-watch: Mon Baptism of the Lord (Epiphany Sun 다음) firstVespers 데이터가 추가되면 동일 over-protection 가능성 — peer 메모

---

## 8. References

- 검토 대상 commit: `f4cee2c` (worktree-240-dev)
- 모상위 review: `docs/review-231-230-fx5-firstvespers-relocation.md` (R2 amended, line 181 — 본 리뷰의 root finding)
- Liturgical reference: Universal Norms on the Liturgical Year, n. 40 (Advent/Christmas boundary), n. 61 (Vespers collision)
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-241/peer/exchanges/ex_20260503T012840Z_3de56557/response.txt`
- Behavioral probe (post-review 삭제됨): `src/lib/__tests__/_tmp/probe-edge-cases.test.ts`
