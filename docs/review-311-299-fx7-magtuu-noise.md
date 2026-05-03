# Review #311 — #299 F-X7 'Магтуу' page-info noise removal (member-01)

> **TL;DR** — F-X7 fix (16 instances / 14 hymn rich.json files) is structurally correct within its declared scope (rich.json only). All 10 ACs MET on executable + structural axes; AC-1..AC-9 cleanly MET; AC-10 MET on strict reading (Pattern A/B strip itself preserves what it touches). Two MAJOR follow-ups surface: (1) `ordinarium/hymns.json` plain-text path retains 14 'Магтуу' occurrences that leak through alt-hymn-pick render, (2) 3 hymns (41/45/111) carry pre-existing PDF-page-break stanza-drift (orphan 1-line "stanza" continuations) that F-X7 exposes but does not address. Neither blocks merge; both are scope-bounded and tracked as follow-up cohorts. **Verdict**: **APPROVED_WITH_ISSUES**.
>
> **Reviewer**: divine-review (adversarial-reviewer profile)
> **Author**: member-01
> **Subject commit**: `697e844` → main `db6b90c` (17 files, +307/-368)
> **Pipeline**: analyze → adversarial-scan (peer: codex/quality_auditor, consensus AGREE) → verdict
> **Peer evidence**: exchange `ex_20260503T235106Z_e884fe62` — APPROVED_WITH_ISSUES, HIGH confidence

---

## 1. Scope

member-01 가 #299 F-X7 dispatch (사용자 보고 hymn 본문 'магтуу' 노이즈) 를 다음과 같이 처리:

1. **Audit decision** (uppercase 채택, dispatch 의 lowercase 지시와 다름):
   - hymn rich.json 에 lowercase 'магтуу' standalone 0건 cross-checked
   - PDF `parsed_data/full_pdf.txt` page header 'Магтуу' 96 occurrences (uppercase)
   - PDF SSOT verbatim (memory `feedback_pdf_ssot_verbatim.md`) 적용 — uppercase 'Магтуу' 16건만 strip

2. **Strip script** `scripts/strip-hymn-magtuu-noise.mjs`:
   - Pattern A (13건, single-line stanza ['Магтуу']): block + 인접 divider 함께 제거 (next > prev 우선)
   - Pattern B (3건, multi-line first-line='Магтуу'): line[0] drop + phrase lineRange -1 shift

3. **2 regression guards**:
   - `scripts/verify-no-page-noise.js` (Node CLI, exit 1 on hit)
   - `src/lib/__tests__/data/hymn-page-noise.test.ts` (vitest, npm test 포함)

4. **Test evidence (executable)**:
   - npm test: 47 files / **916 tests** PASS (915 → +1 신규 guard)
   - npx tsc --noEmit: clean
   - npm run lint: 0 errors / 16 pre-existing warnings
   - F-X3 builder rerun: byte-identical output

## 2. Acceptance Criteria — verdict

| AC | Type | Criterion | Verdict | Evidence |
|----|------|-----------|---------|----------|
| AC-1 | executable | npm test 916 PASS (was 915, +1 guard) | **MET** | `npm test 2>&1 \| tee /tmp/test-out-311.log`: `Test Files 47 passed (47), Tests 916 passed (916)`, exit 0 |
| AC-2 | executable | scripts/verify-no-page-noise.js 0 occurrences | **MET** | `node scripts/verify-no-page-noise.js`: `[verify-no-page-noise] OK — 0 occurrences of standalone 'Магтуу' in src/data/loth/prayers/hymns`, exit 0 |
| AC-3 | executable | npx tsc --noEmit clean | **MET** | `TypeScript: No errors found`, exit 0 |
| AC-4 | executable | npm run lint 0 errors | **MET** | `ESLint: 0 errors, 16 warnings in 9 files` (모두 pre-existing `@typescript-eslint/no-unused-vars`, 변경 영역 무관) |
| AC-5 | structural | 16 instances / 14 hymn rich.json (Pattern A: 13, Pattern B: 3) | **MET** | `grep -rn '"Магтуу"' src/data/loth/prayers/hymns/*.rich.json` → 0 hits 후. Commit stat: 14 hymn files modified. `grep -ircn 'магтуу' hymns/` → 0 hits any case (post-fix). |
| AC-6 | semantic | uppercase hand-decision validity (PDF SSOT alignment) | **MET** | `grep -n '^Магтуу$' parsed_data/full_pdf.txt` → 96 standalone matches; first 4 anchors lines 561, 589, 1009, 1241 일치. hymn rich.json lowercase magtuu grep 0 hits. PDF SSOT verbatim 패턴 (memory feedback_pdf_ssot_verbatim.md) 정합. |
| AC-7 | semantic | lowercase 'магтуу' inflected forms preserved in psalter/propers | **MET** | psalter-texts.json 7 hits (магтуул/магтууг 등), lent.json 16, easter.json 9, ordinarium.json 8 — F-X7 가 hymn rich.json 만 변경했으므로 구조적으로 untouched. Sample 검증: `Дуулал болон магтууг Түүнд зориулан зохио` (psalter-texts:809) — accusative form, body content. |
| AC-8 | executable | F-X3 builder idempotency byte-identical rerun | **MET** | `node scripts/build-hymn-phrases-into-rich.mjs --all` → OK=122 FAIL=0; decisions: total_hymn=122 total_stanza=552 b2_layer1=25 b2_layer2=144 a2_terminator=75 a2_refrain=134 a2_fallback=174. `git diff --stat src/data/loth/prayers/hymns/` empty. Strip script `--dry-run` rerun: 0 instances (idempotent). |
| AC-9 | structural | 2 regression guards present (CLI + vitest) | **MET** | `scripts/verify-no-page-noise.js` 존재 (Pattern A/B shape 분류 + exit 1). `src/lib/__tests__/data/hymn-page-noise.test.ts` 존재 + npm test 포함. Note: CLI script가 package.json npm scripts 에 미등록이며 별도 CI step 없음 — vitest 가 active guard. (찬조 finding F-3 참조). |
| AC-10 | semantic | Pattern A trailing divider 제거 + Pattern B first-line strip 구조 보존 | **MET** | Sample inspection: hymn 89 b10 (last block, neighborTrim=prev) — 마지막 stanza '5. Ариун Гурвалаас...' (4L) 정상. hymn 41 b2 (Pattern B 4→3): lineRange [0,2], 3 lines 'Их адис хайранд / Ертөнцийн... / Ер магтагдан...' ✓. hymn 45 b8 (Pattern B 2→1): 1 line 'Юуны тул зүдэв?' (lineRange shifted) ✓. hymn 111 b8 (Pattern B 3→2): lineRange [0,1], 2 lines 'Үзүүлэхүй... / Үнэн лавыг...' ✓. `adjustPhrasesAfterFirstLineDrop` 의 clamp 로직 정확 (newA=max(0,a-1), newB=b-1, drop if newB<0). |

**10/10 MET — APPROVED_WITH_ISSUES with 2 MAJOR follow-up cohorts (scope-bounded; not F-X7 defects).**

## 3. Adversarial scan — findings

### Finding F-1 (MAJOR — follow-up cohort F-X7b): ordinarium/hymns.json plain-text path retains 14 'Магтуу' noise

**관찰**: F-X7 strip 은 `src/data/loth/prayers/hymns/{N}.rich.json` (rich path) 만 처리. 그러나 renderer `src/components/hymn-section.tsx:24-27`:

```ts
const useRich =
  !!section.textRich &&
  section.textRich.blocks.length > 0 &&
  (!candidates || selectedIdx === (section.selectedIndex ?? 0))
```

→ User 가 "Бусад магтуу" alt 메뉴에서 다른 hymn 선택 시 `selectedIdx !== default` 되어 plain text fallback (line 49: `<div>{displayText}</div>`). `displayText` 는 `candidates[i].text` 에서 와서 `propers-loader.ts:386-402` 가 `src/data/loth/ordinarium/hymns.json` 을 로드. 이 파일에 'Магтуу' 14건 잔존:

```json
"text": "1. Есүс мандан ирсэн\n\nМагтуу\nИх адис хайранд\n..."  // line 204
```

`grep -n '"\\\\nМагтуу\\\\n\|Магтуу\\\\n' src/data/loth/ordinarium/hymns.json` (or equivalent line scan) — 14 occurrences (lines 204, 219, 224, 229, 249, 404, 409, 444, 464, 524 …).

**평가**: F-X7 dispatch 는 hymn rich.json scope 명시 → 본 fix 자체는 dispatch 에 대해 정확. 그러나 **사용자 reported 노이즈** 의 제거 측면에서는 alt-pick 경로 잔존. peer (codex) 도 동일 finding 도출, severity major 로 분류, follow-up tracking 권고.

**권고 follow-up**: F-X7b — `ordinarium/hymns.json` plain-text 14 'Магтуу' 토큰 sweep (regex `\nМагтуу\n` → `\n`) + regression guard 확장 (verifier 가 plain-text path 도 scan).

### Finding F-2 (MAJOR — follow-up cohort F-X7c): Pre-existing PDF-page-break stanza-drift (3 hymns)

**관찰**: F-X7 가 strip 한 결과 3 hymn 에서 **structural drift** 가 visible 해짐 (이전엔 'Магтуу' 노이즈가 가렸음):

| hymn | 현재 구조 | 의미적 정합 |
|------|----------|------------|
| 41 | b0=`['1. Есүс мандан ирсэн']` (1L), b2=`['Их адис хайранд', 'Ертөнцийн хүмүүн цөмөөр', 'Ер магтагдан жаргатугай!']` (3L) | 원래 stanza 1 = 4 lines (모든 sibling stanza 와 동일 4L pattern). PDF page-break + 'Магтуу' 가 stanza 1 을 1L+3L 로 split. |
| 45 | b6=`['3. Ядуурлыг баримтлан', 'Ядралыг хүлээн', 'Явганаар ном тавьж']` (3L), b8=`['Юуны тул зүдэв?']` (1L, 사이에 divider) | sibling stanza pattern: stanza 2 (b4) 4L 'Юуны тул зовов?' / stanza 4 (b10) 4L 'Юуны тул үхэв?' / stanza 5 (b12) 4L 'Юуны тул хардаг вэ?' 모두 4L 종결. stanza 3 만 3L+orphan 1L. |
| 111 | b6=`['3. Өлмий, мутар, хавирганы', 'Үлдэж хоцорсон шархаа']` (2L), b8=`['Үзүүлэхүй дор тэд тийн', 'Үнэн лавыг бат мэдэв.']` (2L, 사이에 divider) | sibling stanza pattern: stanza 1/2/4/5/6/7 모두 4L. stanza 3 만 2L+2L split. |

**평가**: F-X7 의 Pattern B 는 declared scope 내에서 정확하게 작동 (line[0] drop, phrase lineRange -1 shift). 그러나 stanza 의 "전체 4-line 의미 단위" 복원 (split-back-merge) 은 **F-X3 transcribe 시 PDF page-break 처리 의도에 속하는 별도 cohort**.

문제 발생 타임라인:
1. F-X3 #291 — 122 hymn PDF transcribe. Page-break 가 stanza 중간을 가르고 'Магтуу' page header 가 끼어듬. Block 분리 + 'Магтуу' 라인 발생.
2. F-X7 #299 (이번) — 'Магтуу' 본문 노이즈 visible 정정. block 분리 그대로 유지.

→ User 입장에서: 노이즈 'Магтуу' 는 사라졌으나 stanza 가 시각적으로 split (divider 가운데 끼워진 1L orphan 또는 1L+3L 분리). render 시 의미 단절.

**권고 follow-up**: F-X7c — PDF page-break-aware re-merge for 3 hymn (41 b0+b2, 45 b6+b8, 111 b6+b8). 또는 F-X3 builder 에 split-detection + merge 로직 추가.

### Finding F-3 (MINOR — design): verify-no-page-noise.js CLI 미연동

**관찰**: `scripts/verify-no-page-noise.js` 는 standalone Node CLI. `package.json scripts` 에 미등록 (e.g., `verify:hymn-page-noise`), CI workflow 에도 미연동. 동일 로직의 vitest test (`hymn-page-noise.test.ts`) 가 `npm test` 에서 active guard.

**평가**: AC-9 의 "2 guards exist" 측면 MET (peer도 동일 verdict). 다만 CLI가 manual-run convenience 로 그치고 있어 redundancy. severity minor — 회귀 방어는 vitest 로 충분.

**권고**: 두 옵션 중 택일 — (a) `package.json scripts` 추가 + CI step (precommit hook 또는 GitHub action), (b) CLI 제거 후 vitest 만 유지 (DRY).

### Finding F-4 (MINOR — regression-guard scope): PAGE_LABEL uppercase only

**관찰**: `scripts/verify-no-page-noise.js:28` `PAGE_LABEL = 'Магтуу'`. case-insensitive 변환 없음. 현 데이터에 lowercase 'магтуу' standalone 0 hit (uppercase hand-decision 의 근거) 이지만, 미래 PDF re-transcribe 가 lowercase 변형을 도입하면 silent pass.

**평가**: 데이터 history 로 보면 page header 는 원본 PDF 상 항상 uppercase → 가능성 낮음. defensive nit.

**권고 (선택)**: `text.trim().toLowerCase() === 'магтуу'` 로 case-insensitive match (또는 유지 + 주석 추가 explaining design choice).

### Finding F-5 (NIT — code-clarity): adjustPhrasesAfterFirstLineDrop 의미 주석 부족

**관찰**: `scripts/strip-hymn-magtuu-noise.mjs:61-77` 의 `adjustPhrasesAfterFirstLineDrop`:

```js
const newA = Math.max(0, a - 1)
const newB = b - 1
if (newB < 0) continue // entire phrase was just the noise line
```

phrase 가 line 0 만 (`[0,0]`) cover 한 케이스 silent drop. 현 데이터에 such case 없으나 future contract violation 시 디버깅 어려울 수 있음.

**평가**: nit. 동작 정확.

**권고**: drop 케이스에 대한 한 줄 주석 추가 또는 `if (newB < 0) { /* phrase wrapped only the noise line */ continue }`.

### Finding F-6 (NIT — defensive): Pattern A neighborTrim assumption

**관찰**: `scripts/strip-hymn-magtuu-noise.mjs:92-101` Pattern A 가 마지막 block 일 때 leading divider pop. 현 데이터에서 pop 직전 block 은 stanza (hymn 89 b11), 그러나 코드는 prior block 이 stanza 임을 assert 안함. 미래 hymn 이 두 연속 divider 다음 noise stanza 를 가지면 unbalanced.

**평가**: 현재 데이터로는 0 occurrence. defensive nit.

## 4. Test method transparency

| AC-id | Test Level | Method | Actual Command | What Was Asserted | Limitation | level_check |
|-------|-----------|--------|----------------|-------------------|------------|-------------|
| AC-1 | L1 (E2E) | vitest full run | `npm test 2>&1 \| tee /tmp/test-out-311.log` | 47 files / 916 tests pass (incl. +1 hymn-page-noise) | vitest + jsdom only; no playwright e2e | OK |
| AC-2 | L4 (Manual) | Node script subprocess | `node scripts/verify-no-page-noise.js` | exit 0 + "0 occurrences" stdout | only checks rich.json 122 files, not plain text data | OK |
| AC-3 | L4 (Manual) | tsc subprocess | `npx tsc --noEmit` | 0 type errors across all `.ts/.tsx` | strictNullChecks per tsconfig only | OK |
| AC-4 | L4 (Manual) | ESLint subprocess | `npm run lint` | 0 errors (warnings allowed) | flat config `eslint.config.mjs` rules only | OK |
| AC-5 | L3 (Unit) | grep + git stat | `grep -rn '"Магтуу"' src/data/loth/prayers/hymns/*.rich.json; git show 697e844 --stat` | 0 standalone hits + 14 file diff | text=='Магтуу' standalone match only; doesn't catch `Магтуу.` or `Магтуу ` | OK |
| AC-6 | L5 (Observational) | grep PDF + audit cross-ref | `grep -n '^Магтуу$' parsed_data/full_pdf.txt` (96 hits, lines 561/589/1009/1241+) + dispatch verify | PDF SSOT uppercase confirmed; lowercase grep in hymn rich.json 0 hits | PDF page header convention (manual judgment) | OK |
| AC-7 | L3 (Unit) | grep non-hymn directories | `grep -ircn 'магтуу' src/data/loth/{psalter-texts*,propers,ordinarium,sanctoral}*` | hits in psalter (7), lent (16), easter (9), ordinarium (8), sanctoral (1) — all body forms | structural untouched proof (F-X7 changed only hymn dir) | OK |
| AC-8 | L4 (Manual) | builder rerun + git diff | `node scripts/build-hymn-phrases-into-rich.mjs --all; git diff --stat src/data/loth/prayers/hymns/` | OK=122 FAIL=0; diff empty | builder b2/a2 logic only; doesn't validate phrase.text consistency | OK |
| AC-9 | L3 (Structural) | file existence + npm test inclusion | `ls scripts/verify-no-page-noise.js src/lib/__tests__/data/hymn-page-noise.test.ts` + grep test ID in npm test output | both files exist; vitest test runs in npm test | doesn't validate CI integration | OK |
| AC-10 | L3 (Unit) | python3 JSON inspection | `python3 -c "import json; ..."` block-by-block on hymn 41/45/89/111 rich.json | Pattern A last-block neighborTrim correct; Pattern B lineRange shift correct | sample-based; not full 14-file exhaustive | OK |

`pair-cli verify-level` consistency: 모든 entry method-level 일치 (downgrade 없음).

## 5. Decision

**Verdict**: **APPROVED_WITH_ISSUES**

- All 10 ACs MET on declared F-X7 scope (hymn rich.json strip).
- 2 MAJOR follow-up cohorts identified (F-X7b, F-X7c) — pre-existing or out-of-dispatch-scope, do not block merge.
- 3 MINOR/NIT findings — design polish, not regression risks.
- Pipeline consensus: Claude (adversarial) + Peer (codex/quality_auditor) AGREE on APPROVED_WITH_ISSUES.

**Recommend follow-up tasks**:
1. **F-X7b** (MAJOR) — sweep `src/data/loth/ordinarium/hymns.json` plain-text 'Магтуу' (14 occurrences) for alt-pick render path coverage.
2. **F-X7c** (MAJOR) — re-merge stanza-drift in 3 hymns (41/45/111) — orphan continuation lines from PDF page-break.
3. F-3 (MINOR) — wire `verify-no-page-noise.js` into npm scripts/CI or remove (DRY).
4. F-4 (MINOR) — case-insensitive PAGE_LABEL match in verifier.

**No revise required for #299 itself** — F-X7 is scope-correct and merged.

---

## 6. Reviewer notes

- **Hand-decision validation** (uppercase 'Магтуу' vs dispatch lowercase): member-01 의 PDF SSOT 채택 결정 정합. Memory `feedback_pdf_ssot_verbatim.md` 패턴 적용 (사용자 추정과 audit 결과 충돌 시 PDF 채택). Dispatch instruction 의 'lowercase' 표현은 사용자 보고 영역의 통상 표현일 뿐 데이터 실재와는 다름. member-01 의 commit message + strip script header 가 hand-decision 의 근거를 명시한 점 양호.

- **F-X3 builder idempotency**: 본 review 가 직접 rerun 검증. byte-identical 확인. 별도 patch 없이 strip 결과가 builder re-run 에 안정 (additive 설계대로).

- **인접 cohorts**:
  - #300 F-X8 (대문자=새 절, 소문자=wrap, 들여쓰기 없음 줄바꿈 규칙) 와 directly orthogonal — 본 review 와 무관.
  - F-X3 (#291) 의 PDF page-break re-assembly 가 F-X7c (Finding F-2) 의 root cause. F-X7c 후속에서 F-X3 builder 에 split-detection 추가 고려 가치.
