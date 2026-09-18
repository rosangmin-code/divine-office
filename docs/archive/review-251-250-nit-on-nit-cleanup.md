# Review 251 — #250 NIT-on-NIT 3건 cleanup (LOW)

> **TL;DR** — **APPROVED_WITH_ISSUES** (NIT-on-NIT-on-NIT, none blocking). solver 의 NIT-on-NIT cleanup (`929f272`) 가 #248 review 가 발견한 3건 LOW finding (F-1 코멘트 부정확 / F-2 hint over-broad + max-year edge / F-3 JSDoc over-narrow) 을 정확히 정리. 실행 게이트 (vitest 738 PASS / ESLint clean / tsc clean) clean. F-3 의 JSDoc enumeration 은 adversarial fixture sweep (5 propers files) 으로 verify — 정확히 8개 empty SUN.firstVespers 슬롯이 모두 enumerate 되었고 spurious entry 없음. F-1 코멘트는 rubric-line branch 가 무조건 `<span>` push 한다는 사실관계를 정확히 기술. F-2 의 `isValidDateStr(nextStr)` 가드는 2100-12-31 경계에서 hint 를 생략 (nextStr=2101-01-01 → validator reject). 잔여 NIT 2건 (모두 LOW): (a) F-2 hint 는 conditional wording 으로 softening 했지만 non-eve 404 케이스에서도 next-day URL 자체는 여전히 노출 — solver 가 코멘트로 명시 인정한 trade-off; (b) F-1 코멘트의 "preceding inter-block `<br/>` separator" 표현은 first-block 케이스에서는 부정확 (firstEmitted=true 시 separator 없음). 둘 다 doc-precision 차원 NIT-NIT-NIT, 후속 흡수 가능. **Status**: ready to merge. **Risk**: LOW (NIT-on-NIT-on-NIT, prod 영향 없음). **Next**: leader merge.

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | solver |
| Subject commit | `929f272` (worktree-250-solver, base c0d3f24) |
| Base commit | `df75bff` (Merge 250-solver — already merged into main) |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES** (NIT-on-NIT-on-NIT) |
| Peer (codex/quality_auditor) | APPROVED_WITH_ISSUES (HIGH confidence) — 합의 |
| Reviewed-against | df75bff..929f272 (3 files, +50/-31) |

---

## 1. 변경 요약

`fix(#250): NIT-on-NIT 3건 cleanup (#248 review 잔여 LOW)`

3 files / +50 / -31:

| # | Origin (from #248) | File | 변경 | Severity |
|---|---|---|---|---|
| F-1 | #248 NIT-1 (this review's #248 F-1, AC-5) | `src/components/prayer-sections/gospel-canticle-section.tsx` (+11/-8) | rubric-line empty-skip 코멘트 정정 — "downstream guard already catches this implicitly" 제거, "rubric-line branch unconditionally pushes a `<span>` so blockOut.length would be 1, not 0" 정확한 사실 기술 + production-no-op 명시. 코드 동작 무변화. | doc accuracy |
| F-2 | #248 NIT-2 (this review's #248 F-2, AC-6) | `src/app/api/loth/[date]/[hour]/route.ts` (+23/-15) | (a) hint wording 을 conditional framing 으로 softer 화 ("If you were looking for the eve of a celebration, try ..."); (b) `isValidDateStr(nextStr)` 가드 추가 — 2100-12-31 boundary 에서 hint 생략 (next-day URL 이 validator 범위 밖). body 를 객체 변수로 빌드해서 hint optional 처리. | UX + edge guard |
| F-3 | #248 NIT-3 (this review's #248 F-3, AC-8) | `src/lib/loth-service.ts` (+16/-8) | `isFirstVespersEligibleDate` + `hasFirstVespersAndCompline` JSDoc 의 empty-firstVespers SUN 슬롯 enumeration 을 easter-only 에서 Easter Octave + Christmas (5 슬롯) + Advent dec24 모두 포함하도록 확장. 코드 동작 무변화. | doc accuracy |

---

## 2. AC Verification (per-AC verdict)

| AC | Type | Criterion | Verdict | Evidence |
|---|---|---|---|---|
| AC-1 | exec | vitest targeted shard 0 fail | **MET** | `npx vitest run src/lib src/app/api src/components/prayer-sections` → **35 files / 738 tests / 0 failed / 5.48s** |
| AC-2 | exec | ESLint 0 issues on 3 changed files | **MET** | `npx eslint <3 files>` → exit 0, "ESLint: No issues found" |
| AC-3 | exec | tsc --noEmit clean | **MET** | exit 0, "TypeScript: No errors found" |
| AC-4 | semantic | F-1 새 코멘트가 rubric-line branch 사실관계 정확 반영 | **MET** | `gospel-canticle-section.tsx:93-117` 트레이스 — early-skip (line 105) 제거 시 blockOut.push(`<span>`) (line 109) 가 무조건 발사 → blockOut.length=1, downstream guard `blockOut.length === 0` (line 119) 미적중. 새 코멘트 (line 100-104) "rubric-line branch unconditionally pushes a `<span>` so `blockOut.length` would be 1, not 0, and the downstream guard would NOT short-circuit" 사실관계 일치. |
| AC-5 | structural | F-2 새 hint 가 substring '2022-12-25' 보존 | **MET** | `route.ts:58` — `body.hint = "If you were looking for the eve of a celebration, try /api/loth/${nextStr}/${hour} — ..."`. date='2022-12-24', nextStr='2022-12-25' → hint 에 substring 포함. AC-1 vitest pass 가 `route.test.ts:75` `expect(body.hint).toContain('2022-12-25')` 만족 확인. |
| AC-6 | semantic | F-2 max-year guard 가 2100-12-31 에서 hint 생략 | **MET** | `date-validation.ts:9` `if (y < 1900 \|\| y > 2100) return false`. trace: date='2100-12-31' → nextStr='2101-01-01' → `isValidDateStr` false → conditional `if (isValidDateStr(nextStr))` (route.ts:57) 미진입 → body.hint 미설정 → JSON 에서 hint key 부재. |
| AC-7 | structural | F-3 JSDoc enumeration 이 실제 fixture 와 일치 | **MET** | adversarial sweep (`jq '.weeks \| to_entries[] \| select(.value.SUN.firstVespers == null)' src/data/loth/propers/*.json`) → 정확히 8개 empty 슬롯, JSDoc 8개 모두 enumerate. lent.json/ordinary-time.json 에 empty 슬롯 부재 (검증). spurious entry 없음, gap 없음. |
| AC-8 | semantic | NIT-on-NIT-on-NIT adversarial scan | **MET** | 잔여 NIT 2건만 발견 — 모두 documented trade-off / doc precision; blocking 없음. recursion converged. |

---

## 3. Adversarial Findings (2건, 모두 NIT-NIT-NIT, LOW)

### F-1 (AC-8) — F-2 hint URL 이 non-eve 404 에도 노출됨 (severity: nit, category: UX)
- **File**: `src/app/api/loth/[date]/[hour]/route.ts:44-50, 58`
- **사실**: 새 conditional framing ("If you were looking for the eve of a celebration") 이 misleading 정도를 줄였지만, hint 의 next-day URL 자체는 모든 FU#2 404 에 여전히 emit (단, isValidDateStr 가드 통과 시). 평범한 화요일 firstVespers 요청 → 다음 날 (수요일) URL 을 제시 → 따라가면 또 404.
- **solver 인지**: 새 코멘트 (route.ts:44-47) 에 명시 인정 — "other 404s — e.g. ordinary Tuesday — surface the URL anyway, but the wording stays conditional so callers know it only applies when they were targeting a celebration's eve."
- **권고**: documented design trade-off. NO ACTION (recursion converged). 더 보수적 스코핑 (예: `isFirstVespersEligibleDate(nextStr)` 가드까지 추가) 은 NIT cleanup 범위 밖.

### F-2 (AC-4) — F-1 코멘트의 "preceding inter-block `<br/>`" 표현 (severity: nit, category: doc)
- **File**: `src/components/prayer-sections/gospel-canticle-section.tsx:97`
- **주장**: "a malformed authoring would surface a stray empty red `<span>` (and its preceding inter-block `<br/>` separator) under an antiphon"
- **사실**: 정확. **단** edge case — 만약 empty rubric-line 이 첫 emit block (firstEmitted=true 초기 상태) 이면 line 128-130 `if (!firstEmitted)` 가드로 `<br/>` separator 가 push 되지 않음. 즉 "preceding inter-block `<br/>`" 는 non-first-block 케이스에서만 사실. "inter-block" 단어가 implicit 으로 non-first 를 함축하나 명시적이지 않음.
- **권고**: doc 정밀도 NIT. NO ACTION (재귀적 추적이 의미 없음). 만약 미래 batch 가 있다면 wording 을 "preceding inter-block `<br/>` separator (when applicable)" 정도로 미세조정 가능.

---

## 4. Evidence

### 4.1 Executable

```
$ npx vitest run src/lib src/app/api src/components/prayer-sections
 RUN  v4.1.4 /home/min/myproject/divineoffice/.claude/worktrees/251-divine-review

 Test Files  35 passed (35)
      Tests  738 passed (738)
   Start at  19:09:10
   Duration  5.48s

$ npx eslint src/components/prayer-sections/gospel-canticle-section.tsx \
              'src/app/api/loth/[date]/[hour]/route.ts' \
              src/lib/loth-service.ts
ESLint: No issues found

$ npx tsc --noEmit
TypeScript: No errors found
```

### 4.2 데이터 anchor (AC-7 fixture sweep)

```
$ for f in src/data/loth/propers/*.json; do
    jq -r --arg base "$(basename $f .json)" \
      '.weeks | to_entries[]
         | select(.value.SUN != null)
         | select(.value.SUN.firstVespers == null)
         | "\($base) \(.key).SUN.firstVespers: <empty>"' "$f"
  done

advent dec24.SUN.firstVespers: <empty>
christmas dec25.SUN.firstVespers: <empty>
christmas octave.SUN.firstVespers: <empty>
christmas jan1.SUN.firstVespers: <empty>
christmas epiphany.SUN.firstVespers: <empty>
christmas epiphanyWeek.SUN.firstVespers: <empty>
easter 1.SUN.firstVespers: <empty>
easter easterSunday.SUN.firstVespers: <empty>
```

8개 슬롯 = JSDoc 8개 entry (Easter 2 + Christmas 5 + Advent 1) — 완전 일치.

### 4.3 코드 트레이스 (AC-4)

```
src/components/prayer-sections/gospel-canticle-section.tsx
─────────────────────────────────────────────────────────
 93  } else if (block.kind === 'rubric-line') {
 94    // #247 NIT-2 / #250 F-1 — production-data no-op defensive guard.
 95    // (... 새 코멘트 ...)
105    if (!block.text.trim()) continue                       ← early-skip (제거 시 fall-through)
106    // PDF rubric line: red + upright (NOT italic). ...
109    blockOut.push(<span ...>{block.text}</span>)            ← 무조건 push (length=1)
117  }
118
119  if (blockOut.length === 0) continue                       ← downstream guard (length=1 이라 미적중)
128  if (!firstEmitted) out.push(<br ... />)                   ← inter-block separator (firstEmitted=true 시 skip)
132  out.push(...blockOut)
```

### 4.4 코드 트레이스 (AC-5/6)

```
src/app/api/loth/[date]/[hour]/route.ts
───────────────────────────────────────
 51  const nextDate = new Date(date + 'T00:00:00Z')
 52  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
 53  const nextStr = nextDate.toISOString().slice(0, 10)
 54  const body: { error: string; hint?: string } = {
 55    error: `${hour} is not available for ${date}: ...`,
 56  }
 57  if (isValidDateStr(nextStr)) {                            ← max-year guard
 58    body.hint = `If you were looking for the eve of a celebration, try /api/loth/${nextStr}/${hour} — ...`
 59  }
 60  return NextResponse.json(body, { status: 404 })

src/lib/date-validation.ts
──────────────────────────
  9  if (y < 1900 || y > 2100) return false                   ← validator range
```

| Trace input | nextStr | isValidDateStr | hint emitted? |
|---|---|---|---|
| date='2022-12-24', hour='firstVespers' | '2022-12-25' | true | ✓ contains '2022-12-25/firstVespers' |
| date='2100-12-31', hour='firstVespers' | '2101-01-01' | false | ✗ omitted |

### 4.5 Production-data sanity check (F-1 claim)

```
$ grep -rE '"kind"\s*:\s*"rubric-line"' src/data/ --include="*.json" | wc -l
2

$ grep -rE '"kind"\s*:\s*"rubric-line"\s*,\s*"text"\s*:\s*""' src/data/ --include="*.json"
(empty)
```

2개 rubric-line 블록 존재 (`compline.json:183`, `:206`), 둘 다 비어있지 않음 — solver 의 "Production data has no empty rubric-line blocks today" 검증.

---

## 5. Test Method Transparency

| AC-id | Level | Method | Actual Command | Asserted | Limitation |
|---|---|---|---|---|---|
| AC-1 | L3 (Unit) | vitest run | `npx vitest run src/lib src/app/api src/components/prayer-sections` | 35 files / 738 tests / 0 failed | targeted shard — 다른 디렉토리(e.g. e2e/) 미실행 |
| AC-2 | L3 (Unit) | ESLint | `npx eslint <3 files>` | exit 0, no issues | 3 changed files only — 다른 파일 lint drift 미캡처 |
| AC-3 | L3 (Unit) | tsc | `npx tsc --noEmit` | exit 0, no errors | 전체 프로젝트 — runtime behavior 미검증 |
| AC-4 | L4 (Manual trace) | Read + manual trace | Read gospel-canticle-section.tsx:70-135 | 코드 경로가 코멘트 주장 일치 | 정적 분석만 — production data 에는 empty rubric-line 부재라 동적 trigger 없음 |
| AC-5 | L3 (Unit) + L4 | Read + vitest assertion | Read route.ts:58, route.test.ts:75 + AC-1 vitest pass | hint 에 substring '2022-12-25' 포함 | 다른 hour/date 조합 에 대한 hint substring 미검증 |
| AC-6 | L4 (Manual trace) | Read + trace | Read date-validation.ts:9, route.ts:51-59 | 2100-12-31 → 2101-01-01 → guard suppresses hint | 2100-12-31 자체는 vitest 에 negative-path 테스트 부재 (NIT 추가 가능, 권고 안 함) |
| AC-7 | L4 (Manual) | jq fixture sweep | 5 propers files 전체 sweep | 8개 empty 슬롯 = JSDoc 8개 entry 완전 일치 | sanctoral.json 미스윕 (firstVespers 의 다른 source) — 단 JSDoc scope 가 propers 에 한정 |
| AC-8 | L2 (Integration-equivalent) | adversarial scan + Read all changed paths | manual review + grep + jq | 2 NIT-NIT-NIT 발견 (둘 다 documented/precision) | 본 reviewer 의 attack-surface 한정 |

**Level-Method Consistency**: 모든 row 가 claimed level 과 실제 method 일치 (DOWNGRADE 없음). 일부 AC 는 L3 + L4 hybrid (e.g. AC-5 = vitest + manual code read).

---

## 6. 합의 (Claude + Peer)

| 평가자 | per-AC | overall verdict | stance | findings |
|---|---|---|---|---|
| Claude (Agent — Explore) | 8/8 MET | APPROVED | AGREE | 0 |
| Peer (codex / quality_auditor) | 8/8 MET | APPROVED_WITH_ISSUES | AGREE | 2 (NIT-NIT-1 UX, NIT-NIT-2 doc) |
| **합의** | 8/8 MET | **APPROVED_WITH_ISSUES** | AGREE | 2 NIT (transparently surfaced, non-blocking) |

per-AC 는 8/8 일치. overall verdict 는 1단계 gap (APPROVED vs APPROVED_WITH_ISSUES) — 보수적 선택으로 후자 채택, 2개 NIT 발견을 transparent 하게 surface. dispatch context 가 "NIT-on-NIT-on-NIT 잠재 finding 식별. 모두 LOW expected" 라고 명시했으므로 정확히 그 시나리오에 부합.

---

## 7. 권고

- **Merge 진행 가능** — 모든 AC MET, executable gate clean, recursion converged.
- 잔여 2 NIT-NIT-NIT (UX hint scope + doc wording precision) 는 후속 batch 에 흡수 가능하나, **권장은 NO ACTION** — NIT-on-NIT-on-NIT 까지 들어가면 review/cleanup 자체의 cost-benefit 이 역전됨. solver 의 documented trade-off (route.ts:44-47) 는 충분히 self-aware.
- 추가 cleanup batch 가 도래하면 다음 두 doc 정밀도 nudge 만 수렴 후보:
  1. F-1 코멘트: "preceding inter-block `<br/>` separator (when applicable, i.e. non-first-block)"
  2. F-2 hint: 만약 진짜 한 번 더 다듬는다면 `if (isValidDateStr(nextStr) && isFirstVespersEligibleDate(nextStr))` 까지 좁힐 수 있음 (단, NIT-cleanup 범위 초과로 별도 task 권장).
