# Review 248 — #247 NIT batch (6 review-finding cleanups, LOW)

> **TL;DR** — **APPROVED_WITH_ISSUES** (NIT-on-NIT, none release-blocking). solver 의 NIT batch (`174f763`) 가 #239 FU#4 / #243 / #244 / #246 review 들의 LOW finding 6건을 정확히 정리. 실행 게이트 (lint / tsc / vitest 738 PASS) clean, 6건 모두 PDF/JSON anchor 와 weekday/날짜 사실관계 verify 통과. 잔여 NIT 3건 (모두 LOW): (a) NIT-2 의 코멘트가 downstream `blockOut.length===0` 가드가 empty rubric-line 을 잡는다고 주장하지만 실제로는 안 잡음 — guard 자체는 옳고 production-data 에는 빈 rubric-line 부재; (b) NIT-3 의 404 hint 는 day-before-celebration 케이스에만 유의미하며 max date 2100-12-31 에서 hint 가 2101-01-01 로 굴러 validator (1900-2100) 범위를 벗어남; (c) NIT-5 JSDoc 이 `easter.json` Easter Octave Sundays 만 empty firstVespers 로 표기하지만 `advent.json` dec24.SUN + `christmas.json` dec25/octave/jan1/epiphany/epiphanyWeek SUN 도 동일하게 empty. **Status**: ready to merge. **Risk**: LOW (NIT-on-NIT, prod 영향 없음). **Next**: leader merge.

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | solver |
| Subject commit | `174f763` (worktree-247-solver, base 0fbae07) |
| Base commit | `0fbae07` (Merge #246 divine-review) |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES** (NIT-on-NIT) |
| Peer (codex/quality_auditor) | APPROVED_WITH_ISSUES (HIGH confidence) — 합의 |
| Reviewed-against | 0fbae07..174f763 (5 files, +88/-20) |

---

## 1. 변경 요약

`fix(#247): NIT batch — 6 review-finding cleanups (#239 FU#4 / #243 / #244 / #246)`

5 files / +88 / -20:

| # | Origin | File | 변경 | Severity |
|---|---|---|---|---|
| NIT-1 | #239 FU#4 | `src/lib/__tests__/loth-service.test.ts` | Christmas firstCompline (2026-12-25) 의 stale "eve-shifted to Thu slot" 코멘트 → Phase B SAT-slot 설명; F-2 swap assertion 강화 (alternate text 's "Та энэ гэрт зочлон орж" + page 516 동시 verify) | doc + test ↑ |
| NIT-2 | #243 NIT-1 | `src/components/prayer-sections/gospel-canticle-section.tsx` | `renderAntiphonRich` rubric-line branch 에 `if (!block.text.trim()) continue` defensive guard 추가 | code defensive |
| NIT-3 | #244 NIT-1 | `src/app/api/loth/[date]/[hour]/route.ts` | FU#2 404 응답에 `hint` 필드 추가 (next-day URL 제안, no redirect) | UX hint |
| NIT-4 | #244 NIT-2 | `src/app/api/loth/[date]/[hour]/__tests__/route.test.ts` | (a) Sat Dec 24 2022 firstVespers 404 regression + hint contains '2022-12-25' assertion; (b) Ascension 2026-05-14 firstCompline 200 positive (movable Solemnity, path 2 of `hasFirstVespersAndCompline`) | coverage ↑ |
| NIT-5 | #244 NIT-3 | `src/lib/loth-service.ts` | `isFirstVespersEligibleDate` + `hasFirstVespersAndCompline` JSDoc 정정: "always present as data" overstatement → Easter Octave Sundays (`weeks['easterSunday'].SUN`, `weeks[1].SUN`) 가 empty firstVespers 인 점 명시, dayOfWeek=SUN gate 가 short-circuit 한다는 사실로 eligibility 유지 설명 | doc accuracy |
| NIT-6 | #246 NIT-1 | `src/lib/__tests__/loth-service.test.ts` | 2030-03-25 Annunciation 테스트의 it-name + inline comment "Solemnity of Saints" → "Solemnity of the Lord" 정정 (class-3 ranking 결론 불변) | doc accuracy |

---

## 2. AC Verification (per-AC verdict)

| AC | Type | Criterion | Verdict | Evidence |
|---|---|---|---|---|
| AC-1 | exec | ESLint clean (5 changed files) | **MET** | `npx eslint <5 files>` → no issues |
| AC-2 | exec | tsc --noEmit clean | **MET** | exit 0, no errors |
| AC-3 | exec | vitest targeted scope passes | **MET** | `npx vitest run src/lib src/app/api/loth src/components/prayer-sections` → 35 files / 738 tests / 0 failed (5.2s) |
| AC-4 | semantic | NIT-1 strengthened assertion proves F-2 swap fired | **MET** | `compline.json` `days.SAT.concludingPrayer.alternate` text contains "Та энэ гэрт зочлон орж" + page=516; primary text starts "Аяа, Эзэн минь, энэ шөнийн турш..." (does NOT contain that substring) → 텍스트 어서션이 alternate 식별의 진짜 anchor (page 어서션은 보조; primary/alternate 가 동일 page 공유) |
| AC-5 | semantic | NIT-2 empty-text guard production no-op | **PARTIALLY_MET** | guard 자체는 type-safe (`text: string` per `src/lib/types.ts:132`) 이고 production-data 에 빈 rubric-line 부재. **단** 코멘트 ("the `blockOut.length === 0 → continue` guard further down already catches this implicitly") 는 부정확 — rubric-line branch 는 무조건 `<span>` push 하므로 `blockOut.length===1`, downstream guard 미적중. 실제로는 redundant 가 아니라 새 behavior (empty span + `<br>` 제거). |
| AC-6 | semantic | NIT-3 404 hint UX correct + safe | **PARTIALLY_MET** | UTC 산술 (`new Date(date+'T00:00:00Z').setUTCDate(getUTCDate()+1)`) 이 leap-day / month / year rollover / DST-immune 모두 정확. JSON 404+hint 는 redirect (`303`) 회피 — cache/SW 안전. **단** (a) hint 는 모든 FU#2 404 에 universal 하게 붙지만 day-before-celebration 외에는 misleading; (b) `isValidDateStr` 의 max date 가 2100-12-31 인데 (`src/lib/date-validation.ts`) 2100-12-31 → 2101-01-01 hint 는 validator 범위를 벗어남 — hint URL 따라가면 400. |
| AC-7 | semantic | NIT-4 new tests factually correct | **MET** | weekday: 2022-12-24=Sat ✓, 2026-05-14=Thu (Ascension Easter+39, Easter 2026=Apr 5) ✓; hint assertion 'contains 2022-12-25' 는 hint 본문 형식과 일치 |
| AC-8 | semantic | NIT-5 JSDoc 정확성 | **PARTIALLY_MET** | Easter-specific claim 정확: `easter.json` `weeks['easterSunday'].SUN.firstVespers=null`, `weeks['1'].SUN.firstVespers=null` 직접 verify; SUN gate short-circuit 위치 (`loth-service.ts:796`) 도 사실. **단** 빈 firstVespers SUN 슬롯이 Easter Octave 만 있는 게 아님 — `advent.json` `dec24.SUN`, `christmas.json` `dec25.SUN` / `octave.SUN` / `jan1.SUN` / `epiphany.SUN` / `epiphanyWeek.SUN` 도 동일하게 비어 있음. JSDoc 의 "currently `weeks['easterSunday'].SUN` and `weeks[1].SUN` in `propers/easter.json`" 는 over-narrow. |
| AC-9 | semantic | NIT-6 Annunciation = Solemnity of the Lord | **MET** | Annunciation (Mar 25) 은 Incarnation 중심으로 of-the-Lord 분류가 표준; sanctoral entry 도 Lord-focused. class-3 ranking 결론 불변 — pure label fix 로 정확. |
| AC-10 | structural | Diff scope = 5 files NIT only | **MET** | `git diff --stat main..worktree-247-solver` → 정확히 declared 5 files, +88/-20 |
| AC-11 | semantic | Adversarial scan | **PARTIALLY_MET** | blocking regression 없음. 3 nit-level finding (AC-5/6/8) 만 — 모두 doc/UX 차원, runtime impact 없음. |

---

## 3. Adversarial Findings (3건, 모두 NIT-on-NIT, LOW)

### F-1 (AC-5) — NIT-2 코멘트 부정확 (severity: nit, category: doc)
- **File**: `src/components/prayer-sections/gospel-canticle-section.tsx:94-101`
- **주장**: "The `blockOut.length === 0 → continue` guard further down already catches this implicitly, but the early skip keeps the intent explicit"
- **사실**: rubric-line branch (line 106-112) 는 `block.text` 가 empty 든 아니든 무조건 `<span>{block.text}</span>` 을 `blockOut` 에 push 한다. 따라서 `blockOut.length === 0` (line 116) 는 empty-text rubric-line 케이스를 잡지 않는다 (length=1).
- **실제 효과**: 새 guard 는 redundant 가 아니라 진짜 behavior change — empty `<span class="not-italic text-red-700 dark:text-red-400">` 와 그 앞 `<br/>` separator 를 모두 제거. production data 에는 빈 rubric-line 이 없으므로 user-visible impact 는 zero (이 의미에서 "production no-op" 자체는 옳음).
- **권고**: 코멘트만 정정. Defer 가능 — 차기 NIT batch 에 흡수.

### F-2 (AC-6) — 404 hint 의 over-broad scope + max-date 경계 (severity: nit, category: UX)
- **File**: `src/app/api/loth/[date]/[hour]/route.ts:35-49`
- **사실 1**: hint 는 모든 FU#2 404 에 동일하게 "next-day URL" 을 제안한다. 그러나 day-before-celebration 외 케이스 (예: 평범한 화요일에 firstVespers 요청) 에서는 next-day URL 이 not-helpful (next day 도 firstVespers 없을 수 있음). 단순 "Try" suggestion 으로 framed 되어 있어서 misleading 정도는 낮음.
- **사실 2**: `isValidDateStr` (`src/lib/date-validation.ts`) 의 max date 가 2100-12-31. `new Date('2100-12-31T00:00:00Z').setUTCDate(getUTCDate()+1)` → 2101-01-01. Hint URL `/api/loth/2101-01-01/firstVespers` 따라가면 400 Invalid date 응답 (validator 거부). 실용적으로는 2026-x 시점에서 75년 후 edge 라 거의 hit 안 함.
- **권고**: (a) hint 를 date-conditional (예: `dayOfWeek === 'SAT'` 등으로 좁히거나) 로 좁히는 follow-up; (b) max-year (2100) 에서는 hint 생략. 둘 다 LOW, 차기 NIT batch 에 흡수.

### F-3 (AC-8) — JSDoc empty-firstVespers 목록이 over-narrow (severity: nit, category: doc)
- **File**: `src/lib/loth-service.ts:778-782` (`isFirstVespersEligibleDate`) + 818-825 (`hasFirstVespersAndCompline`)
- **주장**: "currently `weeks['easterSunday'].SUN` and `weeks[1].SUN` in `propers/easter.json`"
- **사실**: 다른 propers 파일에도 빈 SUN.firstVespers 슬롯 다수:
  - `advent.json` `dec24.SUN` (Dec 24 가 Sunday 인 해)
  - `christmas.json` `dec25.SUN`, `octave.SUN`, `jan1.SUN`, `epiphany.SUN`, `epiphanyWeek.SUN`
- **실제 효과**: Eligibility logic 에는 영향 없음 (모두 SUN gate short-circuit 으로 200 응답). 하지만 JSDoc 의 facts 가 incomplete — 후속 reviewer 가 misleading 받을 수 있음.
- **권고**: JSDoc 을 "Easter Octave + Christmas/Advent SUN 슬롯 다수가 비어 있음" 으로 일반화하거나, 구체 enumeration 을 다 적기. LOW, 차기 doc-pass 에 흡수.

---

## 4. Evidence

### 4.1 Executable
- `npx eslint src/lib/loth-service.ts src/app/api/loth/[date]/[hour]/route.ts src/app/api/loth/[date]/[hour]/__tests__/route.test.ts src/components/prayer-sections/gospel-canticle-section.tsx src/lib/__tests__/loth-service.test.ts` → no issues
- `npx tsc --noEmit` → no errors
- `npx vitest run src/lib src/app/api/loth src/components/prayer-sections` → 35 files / 738 tests / 0 failed / 5.2s
- 핀포인트:
  - `npx vitest run -t "Sat Dec 24"` → 1 passed
  - `npx vitest run -t "Ascension"` → 1 passed
  - `npx vitest run -t "Christmas"` (loth-service) → 9 passed (강화 어서션 포함)

### 4.2 데이터 anchor
- `src/data/loth/ordinarium/compline.json` `days.SAT.concludingPrayer.alternate` (Python json verify):
  - text 시작: "Аяа, Эзэн минь, Та энэ гэрт зочлон орж, эндээс дайсны үхлийн хамаг ид хүчийг зайлуулж өгнө үү..."
  - page: 516
  - primary text 시작: "Аяа, Эзэн минь, энэ шөнийн турш бидэнтэй хамт байгаарай..." (substring "Та энэ гэрт зочлон орж" 미포함 → 어서션이 swap 식별)
- `src/data/loth/propers/easter.json`:
  - `weeks['easterSunday'].SUN.firstVespers = null` ✓
  - `weeks['1'].SUN.firstVespers = null` ✓
  - `weeks['ascension'].SUN.firstVespers` exists (Ascension 200 test 의 path 2 anchor)
- `src/data/loth/propers/advent.json`: `weeks['dec24'].SUN.firstVespers` empty (F-3)
- `src/data/loth/propers/christmas.json`: `weeks['dec25'/'octave'/'jan1'/'epiphany'/'epiphanyWeek'].SUN.firstVespers` 모두 empty (F-3)

### 4.3 Weekday / 날짜 verify
- 2022-12-24 = 토요일 ✓ (NIT-4 a)
- 2026-05-14 = 목요일 (Ascension = Easter+39, Easter 2026 = Apr 5) ✓ (NIT-4 b)
- 2026-12-25 = 금요일 ✓ (NIT-1)
- 2030-03-24 = 일요일 ✓ (NIT-6)
- 2030-03-25 = 월요일 (Annunciation) ✓ (NIT-6)

---

## 5. 합의

| Reviewer | Stance | Confidence |
|---|---|---|
| Claude (divine-review) | AGREE — APPROVED_WITH_ISSUES | HIGH |
| Peer (codex / quality_auditor) | AGREE — APPROVED_WITH_ISSUES | HIGH |

`pair-cli consensus check` → outcome=consensus, round=1.

Decision id: `dec_1` (`/home/min/myproject/divineoffice/.claude/worktrees/248-divine-review/.claude/pair-working/decision-trails/review-247-nit-batch-6-low-review-finding-cleanu.decision.json`).

---

## 6. Recommendation

- **Merge**: ready (3 finding 모두 NIT-on-NIT, LOW, runtime/test impact 없음).
- **Follow-up (defer-OK)**: F-1/F-2/F-3 을 차기 NIT batch 에 흡수 — 별도 dispatch 불필요.
