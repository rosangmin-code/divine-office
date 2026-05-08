# Review #389 — F-X10 fix (#375): extractor baseline detection 회귀 fix + 119 refs 재주입

**Reviewer**: divine-review (independent — author: solver)
**Target**: commit 739e0e5 (merged via cee307f), worktree 389-divine-review @ base 6d6e2914
**Peer**: codex (quality_auditor), discussion R1 → consensus AGREE
**Verdict**: **CONDITIONAL — APPROVED for merge (already landed), MAJOR follow-up required**

> **TL;DR** — F-X10 fix delivers stated goals (PILOT restored, user case detected, wrap-rate 7.2% → 15.0%) BUT introduces 11 over-merge stanza-blocks where entire 4-15 line stanza collapses into 1 phrase. Mechanism confirmed by both Claude + peer (codex quality_auditor). Wrap-rate floor invariant (≥15%) is satisfiable by over-merging — not a safety contract. Revise before next phrase-data sweep.

---

## §1. 검증 요약 (AC matrix)

| AC | Type | Verdict | Evidence |
|----|------|---------|----------|
| AC-1: vitest 전체 PASS | executable | **MET** | `npx vitest run` → PASS (985) FAIL (0). Log: `~/.claude/pair-cowork/scratch/divineoffice/test-out-task-389.log` |
| AC-2: detectBaselineCol 3-stage 알고리즘 정당성 | semantic | **PARTIALLY_MET** | Stage 1 dominance + Stage 3 fallback OK. Stage 2 wrap-score `best.score >= 1` 게이트 너무 permissive — 1 accidental wrap pair 로 baseline flip 가능. |
| AC-3: wrap-rate ≥ 15% | executable | **MET** | 339/2258 = 15.013% (test pass). 단 invariant 가 over-merge 로 satisfied 가능 — safety 계약 부족. |
| AC-4: 119 refs re-injection 시각적 회귀 (over-merge) | semantic | **NOT_MET** | 11 stanza blocks 가 전체 stanza = 1 phrase 로 collapse. Examples: Psalm 32:1-11 block 1 [0,14] (15 lines), Psalm 143:1-11 block 1 [0,13] (14 lines), Revelation 19:1-7 block 0 [0,6] (7 lines), Psalm 116:10-19 block 1 [0,9] (10 lines). |
| AC-5: PILOT phrase boundary 보존 | structural | **MET** | Psalm 110:1-5,7 = 18 phrases (3 multi-line). 자연 wrap pair 만 merge — over-merge 없음. R-7 contract 회복. |
| AC-6: F-X11 cohort 권고 / mixed-content edge case | semantic | **MET (informational)** | Solver follow-up note 에서 per-stanza baseline 시도 보류 (Rev 15:3-4 over-merge 위험) — peer 도 per-stanza/per-content-block baseline 을 structural fix 로 권고. F-X11 와 함께 다룰 수 있음. |
| AC-7: CLAUDE.md SW 캐시 / CACHE_VERSION bump | structural | **MET** | sw.js v7 (변경 없음). psalter-texts.rich.json 은 src/data/ 번들 → Next.js chunk hash 자동 갱신 (publicly cached static asset 아님). bump 불필요. |

**전체 verdict**: **CONDITIONAL** (APPROVED_WITH_ISSUES variant)

---

## §2. Findings (peer audit + 자체 adversarial scan, both AGREE)

### F-1 [MAJOR] Over-merge — 11 stanza blocks 전체가 1 phrase 로 collapse

**증거 (data-level)**: `psalter-texts.rich.json` post-fix sweep:

| Ref | Block | Lines | Phrase span | Severity |
|-----|-------|-------|-------------|----------|
| Psalm 32:1-11 | 1 | 15 | lr=[0,14] (전체) | MAJOR |
| Psalm 143:1-11 | 1 | 14 | lr=[0,13] (전체) | MAJOR |
| Revelation 11:17-18; 12:10b-12a | 0 | 12 | lr=[0,11] | MAJOR |
| Psalm 116:10-19 | 1 | 10 | lr=[0,9] | MAJOR |
| Psalm 100:1-5 | 0 | — | lr=[8,17] (10 lines) | MAJOR |
| Revelation 19:1-7 | 0 | 7 | lr=[0,6] | MAJOR |
| Psalm 116:1-9 | 0 | 7 | lr=[0,6] | MAJOR |
| Psalm 62:2-9 | 2 | 7 | lr=[0,6] | MAJOR |
| Psalm 11:1-7 | 0 | — | lr=[0,5] (6 lines) | MAJOR |
| Psalm 41:2-14 | 1 | — | lr=[2,7] (6 lines) | MINOR |
| Psalm 33:1-9 | 3 | 5 | lr=[0,4] | MINOR |
| Psalm 98:1-9 | 1 | 5 | lr=[0,4] | MINOR |
| Psalm 147:12-20 | 1 | 5 | lr=[0,4] | MINOR |

전체: 9 over-merge MAJOR (>=5 lines + ≤2 phrases) + 2 MINOR.

**증거 (mechanism, peer-confirmed via raw extraction)**:
Psalm 32 continuation page 136 column counts: `col 0: 11, col 3: 17`.
- Stage 1 dominance 실패 (`17 ≤ 11 * 2 = 22`).
- Stage 2 wrap-score: col-0 가 1 score 받음 ('Дууллыг төгсгөх залбирал → Эзэн...' header→body transition 이 baseline=0+wrap=3 패턴 매치). col-3 score = 0 (body 줄들은 wrap 없음).
- baseline = 0 선택.
- `dropSpuriousBlanks` 가 col-3 을 wrap-indent 로 인식 → stanza break blank 삭제.
- `runStage1` 가 모든 col-3 줄을 첫 phrase 의 wrap continuation 으로 merge.
- 결과: 15 줄 = 1 phrase.

**Visual impact (예시 — Revelation 19:1-7 block 0)**:

PDF 의도된 구조 (5 phrase):
```
P1: Аллэлуяа!
P2: Тэнгэрбурханд аврал нигүүлсэл, хүчин чадал
    хийгээд сүр жавхлан байдаг юм.            ← 자연 wrap
P3: (Х. Аллэлуяа!)
P4: Түүний шүүлт шулуун шударга ба үнэн зөв
    юм.                                        ← 자연 wrap
P5: Х. Аллэлуяа! (аллэлуяа!).
```

현재 데이터 (1 phrase):
```
P1: [전체 7줄 합쳐짐 — phrase boundary 손실]
```

5 개 distinct semantic units (응답 antiphon "Аллэлуяа!" 반복, 본문 절, 응답 antiphon, 본문 절, 응답 antiphon) 가 1 phrase 로 평탄화. Renderer 는 5 개의 phrase boundary 가 아닌 1 개의 multi-line block 으로 표시 → 사용자 시각 회귀.

### F-2 [MAJOR] Stage 2 `best.score >= 1` 게이트 너무 permissive

**증거**: `extract-phrases-from-pdf.mjs:200-222` (Stage 2 wrap-score):
```js
if (best.score >= 1) return best.col
```
1 개의 accidental wrap-pattern pair (header→body transition 등) 가 baseline 결정에 충분.

**Peer 분석 (codex quality_auditor)**: "Raising to `>=2` would fix Psalm 32 page 136, but not all: Psalm 116 page 290 and Psalm 143 page 474 each have col 0 score 2 from non-body transitions while col 3 is the body column. The gate should scale with occurrence/density and exclude header/prayer/seasonal transitions."

**권고**: 
- 단기: gate `>=2` (Psalm 32 case 만 부분 fix)
- 정확: occurrence-relative gate (`best.score >= max(2, candidate.occurrence / 5)`) 또는 sentence-boundary signal 결합
- 장기: per-content-block baseline (F-3 참조)

### F-3 [MAJOR] Mixed-content per-column baseline structural limitation

**증거**: `psalter.pdf` continuation pages 는 한 column 안에 여러 content type 혼재:
- 시편 본문 (col 3)
- 시편 마침 기도 (col 0)
- 시즌별 propers (col 0 또는 col 3)
- 응답 antiphon (col 0)

Per-column 단일 baseline 이 이 모두를 설명할 수 없음. 시편 본문 col-3 이 dominate 못하면 (col-0 마침기도 + 시즌 prop 가 합쳐서 카운트 균형) Stage 2 가 col-0 선택 → body 가 wrap 으로 잘못 분류.

**Solver follow-up note**: Rev 15:3-4 block 1 에서 per-stanza baseline 시도했으나 over-merge 위험으로 보류. 그러나 **현재 fix 도 11 over-merge 발생** — 보류 결정의 근거가 약화됨.

**권고 (peer + 자체)**: per-stanza 또는 per-content-block (시편 본문 vs 마침 기도 vs 시즌 prop) baseline detection 이 structural fix. F-X11 (paragraph boundary) cohort 와 함께 다루는 것이 효율적.

### F-4 [MAJOR] Test invariant 부족 — wrap-rate floor 가 over-merge 로 satisfied

**증거**: `wrap-rate-invariant.test.mjs:80-96` (overall multi-line wrap rate >= 15%):
```js
const rate = multi / total
expect(rate).toBeGreaterThanOrEqual(0.15)
```

`multi` 는 multi-line phrase count. Over-merge 가 multi-line phrase count 를 **증가** 시킴 (단일 거대 phrase = 1 multi-line). 따라서:
- 정상 wrap detection (자연 wrap pair) → multi 증가 → rate 통과
- Over-merge collapse (전체 stanza 합침) → multi 증가 → rate **여전히 통과**

→ **Wrap-rate floor 는 safety invariant 가 아님**. 둘 다 통과시키므로 분별력 없음.

**권고 (peer)**:
- Max phrase span: `expect(maxSpan).toBeLessThanOrEqual(MAX_REASONABLE_SPAN)` (예: 4 lines)
- Phrase/line ratio: `expect(phraseCount / lineCount).toBeGreaterThanOrEqual(MIN_RATIO)` (예: 0.4 → 평균 phrase span 2.5 줄 이하)
- Fixture 추가: Psalm 32 page 136, Psalm 116 page 290, Psalm 143 page 474, Rev 19 collapse — known regression cases 회귀 가드.

---

## §3. Positive findings

### F+1 [GOOD] PILOT preservation

Psalm 110:1-5,7 (FR-161 R-7 PILOT) 18 phrases / 3 multi-line, 자연 wrap pair만 merge:
- block 0 p12 [12,13]: "Эзэн тангарагласан бөгөөд / санаагаа өөрчлөхгүй." (PDF 자연 wrap)
- block 0 p13 [14,15]: "«Мелхизедекийн хэргэмийн дагуу / Чи мөнхийн тахилч юм» гэв." (PDF 자연 wrap, 인용문)
- block 1 p01 [1,2]: "Хилэнгийнхээ өдөр / Тэрээр хаадыг бут цохино." (PDF 자연 wrap)

R-7 multi-line contract 정확히 회복.

### F+2 [GOOD] User-reported case (Psalm 46:2-12) 정확히 detected

block 0 에서 5 multi-line phrase, 사용자 reported wrap pair "Далайн зүрх рүү уулс нуран ороход ч / бид айхгүй." multi-line 으로 분류 (test 어서션 통과).

### F+3 [GOOD] Net visual 품질 개선

Pre-fix: 42/96 phrase-injected refs ALL-single (44% 심각한 fragmentation, 모든 verse 가 one-line phrase).
Post-fix: 15 refs ALL-single (16%) + 11 over-merge MAJOR (5%).

Net: 약 79% refs healthy/improved, 5% 새 over-merge regression. 직전 상태 대비 정량적 향상 — 다만 over-merge 는 fragmentation 과 다른 형태의 visual 회귀이므로 회귀 카운트 그대로 비교 불가.

### F+4 [GOOD] Fix 자체 algorithm 의 문서화 우수

extract-phrases-from-pdf.mjs:117-153 의 detectBaselineCol JSDoc 이 3-stage 정책 + Psalm 46 / 149 / 110 specific cases 의 의도 + DOMINANCE_RATIO 의 trade-off 를 충분히 설명. 미래 maintenance 시 의도 추적 용이.

### F+5 [GOOD] Test 구조 (column-level + data-level) 적절

- column-level: `extract-phrases-from-pdf.test.mjs` (Psalm 46 right col body@col 0 + PILOT Psalm 110 left col body@col 3) — 알고리즘 boundary 표적
- data-level: `wrap-rate-invariant.test.mjs` (PILOT regression guard + user case + global floor) — end-to-end 가드

문제는 데이터 레벨이 over-merge 를 catch 못 한다는 점 (F-4) — coverage 보강 필요하나 기본 구조는 견고.

---

## §4. CLAUDE.md 체크리스트 (사전 검토)

- [x] **링크/URL/자산 경로/Content-Type**: 변경 없음 (data + extractor only). sw.js navigation 정책 영향 없음.
- [x] **모바일 실제 회귀**: F-1 over-merge → 11 refs visual change. PDF 비교로 over-merge 확인 권고. 모바일 실제 검증 사용자 필요.
- [x] **몽골어 라벨 오타**: 없음.
- [x] **PRD/traceability**: FR-161 (NFR-009j) 영역 — F-X10 fix 라인 추가 권고 (현재 wi-tracking 외 미반영).
- [x] **`HourSection` 개수**: 변경 없음.
- [x] **e2e `@fr` 태그**: 새 invariant test 가 `// @fr FR-161` 태그 포함 ✓.
- [x] **psalter `page` verifier**: psalter-texts.rich.json 만 변경 (page 필드 변경 아님). `verify-psalter-pages.js` 영향 없음.
- [x] **다른 데이터 영역 verifier**: 영향 없음 (psalter 본문만).
- [x] **`audit-psalter-ref-consistency.js`**: ref/page 변경 없음. window ±2 stanza 지문 정합성 영향 없음.
- [ ] **CACHE_VERSION bump**: psalter-texts.rich.json 은 src/data/ 번들 → Next.js chunk hash 자동 갱신. SW v7 유지. (정합 ✓)

---

## §5. Verdict 근거

| 기준 | 평가 |
|------|------|
| 모든 focus PASS | ✗ (AC-2 PARTIALLY, AC-4 NOT_MET) |
| Critical findings | 없음 |
| MAJOR findings | 4개 (F-1, F-2, F-3, F-4) |
| Minor/nit findings | 0 |
| 전체 fix direction | NET POSITIVE (PILOT 회복, user case 해결, wrap-rate 회복) |
| 새 데이터 회귀 | 11 stanza-blocks (5% of phrase-injected blocks) |
| Test gate | 985 PASS / 0 FAIL ✓ — 단 over-merge bound 미보장 |

**결정: CONDITIONAL** (= APPROVED_WITH_MAJOR_ISSUES — 이미 merged 된 fix 는 유지, follow-up MUST 필수)

이미 merge 된 상태이므로 revert 권고하지 않음. 다음 phrase-data sweep 또는 F-X11 cohort 작업 전에 다음 follow-up 완료 필수:

---

## §6. Follow-up 권고 (MAJOR — block next sweep)

### FU-1 (P0): Stage 2 게이트 강화 + 테스트 추가
- `best.score >= max(2, candidate.occurrence / 5)` 또는 sentence-boundary 결합
- 테스트 fixture: Psalm 32 page 136, Psalm 116 page 290, Psalm 143 page 474, Rev 19 page (TBD)
- Invariant: `expect(phraseCount / lineCount).toBeGreaterThanOrEqual(0.4)` per block
- Invariant: `expect(maxPhraseSpan).toBeLessThanOrEqual(MAX_SPAN)` (e.g. 4)

### FU-2 (P0): 11 over-merge refs 수동 corrective re-injection
현재 collapse 된 11 refs 는 FU-1 알고리즘 수정 후 재추출. 또는 즉시 manually corrective curation (각 stanza 의 phrase boundary 가 PDF 와 일치하는지 검증).

### FU-3 (P1): Per-content-block baseline detection (F-X11 cohort 와 통합)
시편 본문 / 마침 기도 / 시즌 prop / 응답 antiphon 을 column 분리 후 per-content baseline. F-X11 (paragraph boundary) 과 동일 영역이므로 합치면 효율적.

### FU-4 (P2): NIT — 알고리즘 정당성 노출
Stage 2 wrap-score 의 `best.score >= 1` 정당성 (왜 1 인가) JSDoc 에 명시. 현재 'Stage 2 catches mixed cases' 만 있고 임계값 의미 누락.

---

## §7. References

- **Audit**: `docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` §1 (F-X10 root cause + Option C 권고)
- **Fix**: `scripts/parsers/extract-phrases-from-pdf.mjs:117-220` (detectBaselineCol 3-stage)
- **Tests**: `scripts/parsers/__tests__/extract-phrases-from-pdf.test.mjs` (F-X10 body-at-flush-left), `scripts/__tests__/wrap-rate-invariant.test.mjs` (rich-data invariants)
- **Fixtures**: `scripts/parsers/__tests__/fixtures/psalter-physical-{068,077}.txt`
- **Data**: `src/data/loth/prayers/commons/psalter-texts.rich.json`
- **Peer**: codex (quality_auditor), exchange `ex_20260508T154146Z_3f16d29b`, response `ex_20260508T154647Z_6ae2c1e0`
- **Discussion**: R1 consensus AGREE (Claude + peer)
- **Related reviews**: `docs/review-376-fx9-fix-cohort.md`, `docs/review-382-fx12-phase-a.md`
