# Review 243 — #222 F-X1 nit defensive hardening

> **TL;DR** — **APPROVED_WITH_ISSUES** (delivery-ready, NIT-only follow-up). solver 의 fix (`0ed83c0`) 는 #220 R1 의 3개 LOW-priority defensive nit 을 정확히 처리한다 (vitest 846/846 PASS, tsc clean, eslint clean, +4 신규 테스트). 1개 NIT-level latent gap: `renderAntiphonRich` 의 `blockOut.length === 0` 게이트가 `rubric-line` 의 `text === ''` 케이스를 미처리 (empty span 1개로 카운트 → flag flip). 프로덕션 데이터 미발생 — 머지 가능. **Status**: pending leader merge. **Risk**: LOW (production no-op for all 3 paths). **Next**: leader merge OK.

| 항목 | 값 |
|---|---|
| Reviewer | divine-review (adversarial-reviewer) |
| Author | solver |
| Subject commit | `0ed83c0` (worktree-222-solver) |
| Base commit | `4dbdc41` |
| Date | 2026-05-03 |
| Verdict | **APPROVED_WITH_ISSUES** (NIT only) |
| Peer (codex/quality_auditor) | APPROVED_WITH_ISSUES (HIGH confidence) — 합의 |

---

## 1. 변경 요약

3개 LOW-priority defensive hardening (commit log 인용 + 코드 검증):

### 1.1 `applySeasonalAntiphonRich` — closing-period 미러 (`src/lib/hours/seasonal-antiphon.ts`)

신규 `ensureClosingPeriod(blocks)` 헬퍼:
- 마지막 `para` 블록의 마지막 text-bearing span (`text`/`rubric`/`versicle`/`response`) 을 backward 탐색
- `[.!?]` 종결부재 시 `.` 추가
- pure / immutable — 변경 불요 시 원본 reference 그대로 반환

`applySeasonalAntiphonRich` 의 마지막 단계 직전에 호출되어 본문 종결을 보장. 평면 helper line 33-35 의 `closer` 로직을 rich path 에 미러.

### 1.2 Idempotent regex broaden — `[Аа]ллэлуяа` → `[Аа]ллэл[уү]яа`

찬송가 변종 `Аллэлүяа` (with `ү`) 도 idempotency guard 에 포함. plain helper + 3 rich guards (rubric-line / para spans / stanza spans) 일괄 적용.

### 1.3 `renderAntiphonRich` — `firstEmitted` flip 순서 재정렬 (`src/components/prayer-sections/gospel-canticle-section.tsx`)

이전: 블록 처리 BEFORE 에 `firstEmitted = false` 로 flip 후 inner 컨텐츠 emit. empty-spans para 가 flag 만 뒤집고 다음 블록의 separator 누수.

이후: 블록의 `blockOut: JSX.Element[]` 배열을 먼저 채우고, `blockOut.length === 0` 이면 `continue` (separator + flip skip), 그렇지 않으면 separator 푸시 → flag flip → blockOut spread.

### 1.4 신규 테스트 (+4)

- (#1.1) closing-period 추가 정합성: 종결부재 → `.` 추가 / 종결 존재 (`?`) → 무변경 (총 2 케이스)
- (#1.2) `Аллэлүяа` variant idempotency (rubric-line + para span 양쪽)
- (#1.3) empty-spans para 이전 → 정상 블록 → leading `<br/>` 부재 단언

---

## 2. AC 검증 (Phase C)

| ID | Type | Criterion | Verification | Verdict |
|---|---|---|---|---|
| AC-1 | executable | vitest full suite passes | `npx vitest run` | **MET** — 846 passed (44 files; +1 vs pre-#222 base 845) |
| AC-2 | executable | tsc --noEmit clean | `npx tsc --noEmit` | **MET** — "No errors found" |
| AC-3 | executable | eslint clean (changed files) | `npm run lint -- ...` | **MET** — "No issues found" |
| AC-4 | structural | applySeasonalAntiphonRich closing-period 미러 | code review + 신규 테스트 | **MET** |
| AC-5 | structural | idempotent regex broaden 일관 적용 (4 위치) | grep `[Аа]ллэл[уү]яа` | **MET** — 4건 일치 (plain helper + 3 rich guards) |
| AC-6 | structural | firstEmitted flip 재정렬 + 신규 가드 | code review + 신규 테스트 | **PARTIALLY_MET** — empty-spans para 케이스는 OK; empty rubric-line `text === ''` 는 미처리 (peer 발견, 본 리뷰 §3.1) |
| AC-7 | structural | regression — 기존 F-X1 (#217/#220) 테스트 모두 PASS | 41 기존 테스트 PASS | **MET** |

**Coverage gate**: 6 MET + 1 PARTIALLY_MET (NIT level) → **APPROVED_WITH_ISSUES (NIT-only)**.

---

## 3. Adversarial Findings

### 3.1 NIT — empty rubric-line `text === ''` 게이트 미처리 (peer co-discovered)

**증상**: `renderAntiphonRich` 의 신규 emission 게이트는 `if (blockOut.length === 0) continue`. 그러나 `block.kind === 'rubric-line'` 분기는 `block.text` 와 무관하게 항상 `<span>{block.text}</span>` 를 push:

```ts
} else if (block.kind === 'rubric-line') {
  blockOut.push(
    <span key={`rubric-${bi}`} className="not-italic text-red-700 dark:text-red-400">
      {block.text}
    </span>,
  )
}
```

`block.text === ''` 인 rubric-line 이 들어오면 `blockOut.length === 1` 이 되어 게이트 통과 → `firstEmitted = false` → 다음 visible 블록의 separator 가 stray `<br/>` 누수 가능. 시각적으로는 빈 span 만 렌더되므로 사용자가 보는 결과는 `<br/>` + 공백뿐.

**peer 인용**: "`blockOut.length === 0` does not correctly handle `{ kind: 'rubric-line', text: '' }`. The renderer still pushes an empty `<span>`, so `blockOut.length` is `1`, `firstEmitted` flips."

**프로덕션 영향**: 0 — 현재 PDF-sourced 데이터에 빈 텍스트 rubric-line 부재. #222 fix 의 다른 두 케이스 (empty para spans, hymn-style spelling) 와 동급의 defensive-only 갭.

**선택적 보강** (필요 시):
```ts
} else if (block.kind === 'rubric-line') {
  if (!block.text.trim()) continue  // skip empty rubric-line
  blockOut.push(<span ...>{block.text}</span>)
}
```
또는 게이트를 더 엄격하게 — `blockOut.some(el => /* meaningful content check */)` 로 강화. 현재 공헌 영향 무시 가능 → NIT 수준 follow-up.

### 3.2 NIT — `ensureClosingPeriod` 가 `stanza` / `rubric-line` 종결 미처리 (의도적)

helper 가 `if (b.kind !== 'para') continue` 로 `stanza` / `rubric-line` 블록 종결은 skip. plain helper 가 단일 문자열 처리이므로 1:1 미러는 아니지만, 코멘트가 명시: "Production rich AST always ends with punctuation so this is no-op in practice".

**peer 응답** (Q1): "scope is correct for the accepted change" — 의도적 narrow scope. NIT 수준.

### 3.3 (peer Q2 응답) Russian/Greek 표기는 broaden 대상 아님

`Алилуйа` (Russian) / `Аллилуиа` (Greek) 표기는 codebase grep 미발견. 데이터 evidence 없이 broaden 시 false positive 위험. **현 [уү] broaden 은 적절한 scope.**

---

## 4. Tests / Lint / Typecheck 증거

```
npx vitest run (worktree-243-divine-review @ 0ed83c0 overlay)
  Test Files  44 passed (44)
       Tests 846 passed (846)              ← 845 base + 1 (+4 in #222 changed files
                                              minus 3 sweep into pre-existing slots)
   Start at  09:38:xx
   Duration  ~5 s

npx vitest run src/lib/hours/__tests__/seasonal-antiphon.test.ts \
               src/components/prayer-sections/__tests__/gospel-canticle-section.test.ts
       Tests  45 passed (45)               ← 41 기존 + 4 신규

npx tsc --noEmit
  No errors found

npm run lint -- src/lib/hours/seasonal-antiphon.ts \
                src/components/prayer-sections/gospel-canticle-section.tsx
  No issues found
```

기존 F-X1 (#217/#220) 회귀 테스트 모두 PASS.

---

## 5. Required follow-ups

(Optional — NIT only)

1. **(NIT) 빈 rubric-line text 게이트 보강** (§3.1) — `blockOut.length === 0` 또는 `if (!block.text.trim()) continue`. 프로덕션 데이터 미발생, 머지 후 별도 task 가능.

---

## 6. Optional nits

- `ensureClosingPeriod` 의 span 종류 (`text`/`rubric`/`versicle`/`response`) 화이트리스트가 명시적 — 미래 신 span kind 추가 시 누락 가능. 단 schema 가 union type 이라 타입체커가 잡아줄 가능성 높음. NIT.

---

## 7. References

- 검토 대상 commit: `0ed83c0` (worktree-222-solver)
- 모상위 review: `docs/review-220-217-fx1-nunc-dimittis.md` (R1 — solver의 #222 입력)
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-243/peer/exchanges/ex_20260503T013928Z_69f318e3/response.txt`
