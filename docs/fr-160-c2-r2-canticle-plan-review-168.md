# FR-160-C-2 R2 plan — adversarial review (task #168)

> **Verdict: APPROVED_WITH_ISSUES** — plan 의 큰 그림 (Магтаал 별도 code-path + Option A 단일 catalog + R1.5 verseRange 패턴 재사용 + sub-WI 6분해) 은 valid. 그러나 §6.1 / §7 의 regex 와 §5 의 ref-key / mapping 설계가 PDF 실측과 어긋나 **A02 (1Шастирын дээд 29:10-13), A12 (Дэд хууль 32), A17 (Мэргэн ухаан 9) 3건 회수 실패** 위험이 critical. R2.1 implementation 진입 전에 issue C-1 ~ C-4 보강 필수.

타입: review (adversarial-reviewer 산출)

@fr FR-160-C2 (review of: planer #167 / dispatch task #168)

---

## 1. Review scope

- 대상 문서: `docs/fr-160-c2-r2-canticle-plan.md` (329 lines, base_commit 47e5bf6 의 a2eeadb)
- 의존 자료 (read-only 검증 시 참조) :
  - `docs/fr-160-c2-gap-audit.md` (Cat A 23 entries)
  - `scripts/extract-psalter-headers.js` (현행 R1+R3+R1.5 적용 base)
  - `scripts/build-psalter-headers-catalog.js` (현행 builder)
  - `parsed_data/full_pdf.txt` (실측 grep 으로 spelling 검증)
- 리뷰 디멘션 (dispatch 명시) :
  1. NT canticle skip heuristic 의 false-positive / false-negative
  2. schema 변경 (`Canticle <Source>` prefix) 의 ref-key 충돌 / loader/renderer 영향
  3. R1.5 verseRange capture 패턴 재사용 시 source-line 매칭 정확성
  4. edge case 의 4-line window 충분성 (5+ line 누락?)
  5. sub-WI R2.1~R2.6 의존 그래프 / sizing

---

## 2. PDF 실측 grep 으로 확정한 사실 (issue 의 근거)

```text
2524: 1Шастирын дээд 29:10-13          ← 공백 없음 (1Шастирын)
9557: Дэд хууль 32:1-12                 ← 2 단어 (Дэд + хууль)
13528: Мэргэн ухаан 9:1-6, 9-11         ← 2 단어
2855/3934/5730/8147/12207/15679/16179/16766/20566: Колоссай ...
                                        ← 항상 "Колоссай" (공백 없는 8 매치)
```

기존 `NT_BOOKS` 의 `'Колосси'` 는 PDF 전체 0 매치 — **dead entry**. 이는 plan §6.2 가 `'Колоссай'` 를 신규 추가 권고할 때 인지하지 못한 사실이다.

---

## 3. Issues

### Critical (R2.1 시작 전 반드시 보강)

#### C-1 — `extractFirstBookToken` regex 가 `1Шастирын` 매칭 실패 → A02 회수 누락

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:179`
- 결함:
  ```js
  const m = sourceLine.match(/^\s*((?:\d+\s+)?[А-Я][а-я]+)/u)
  ```
  PDF 실측 `1Шастирын дээд 29:10-13` (line 2524) 은 `1Шастирын` 처럼 **숫자와 키릴이 공백 없이 붙어 있다**. regex 의 `(?:\d+\s+)?` 는 "숫자 + 공백" 만 허용하므로 매칭 실패. 매칭 실패 시 fallback 없이 `null` 반환 → §5 의 `OT_CANTICLE_BOOKS_MN_TO_EN` lookup 도 null → §3 stage 4 emit 미실행 → **A02 (line 2528, page 79) 회수 실패**.
- 보강:
  ```js
  const m = sourceLine.match(/^\s*((?:\d+\s*)?[А-Я][а-я]+)/u)
  //                                ^^^^ \s* 로 완화 (0 공백 허용)
  ```
  단, 이 경우 추출된 토큰은 `"1Шастирын"` (공백 없음) — mapping table 키도 동일 표기로 등록해야 함 (issue C-3 와 묶음).
- severity: **critical**
- category: bug

#### C-2 — `looksLikeSource` regex 도 동일 결함 + multi-word 부족 매칭

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:228`
- 결함:
  ```js
  return /^\s*(?:\d+\s+)?[А-Я][а-я]+(?:\s+[а-я]+)?\s+\d+/u.test(line.trim())
  ```
  - "1Шастирын дээд 29:10-13" — `(?:\d+\s+)?` 매칭 실패 + `[А-Я]` 첫 글자가 `1` 이라 fail → **looksLikeSource false** → `scanForSourceLine` source 미발견 → **A02 skipNoSource**.
  - 추가: `(?:\s+[а-я]+)?` 가 1회 만 허용. PDF 의 `Дэд хууль` (Deuteronomy) 은 2 단어, `Мэргэн ухаан` 은 2 단어 — 둘 다 1회 lowercase 추가 단어로 OK 하지만, 향후 3 단어 책명 (e.g. 가상 `Зүсэг шажны ном`) 에는 약함.
- 보강:
  ```js
  return /^\s*(?:\d+\s*)?[А-Я][а-я]+(?:\s+[а-яё]+)*\s+\d+/u.test(line.trim())
  //                ^^^^ \s* 완화          ^^ * 로 0+ 단어 허용
  ```
- severity: **critical**
- category: bug

#### C-3 — `OT_CANTICLE_BOOKS_MN_TO_EN` 매핑 lookup key 가 multi-word phrase 인지 첫 토큰인지 불명 → A02/A12/A17 회수 누락 위험

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:158-164` (§5 매핑 테이블)
- 결함:
  - plan §6.1 `extractFirstBookToken` 은 "첫 토큰" 만 capture (e.g. `Дэд` from `Дэд хууль`).
  - plan §5 표는 매핑 키를 full phrase 로 표기: `Дэд хууль → Deuteronomy`, `Мэргэн ухаан → Wisdom`, `1Шастирын дээд → 1Chronicles`.
  - 두 contract 가 충돌 — 첫 토큰 lookup 이면 키도 첫 토큰 (`Дэд`, `Мэргэн`, `1Шастирын`) 이어야 한다. 그러지 않으면 **A02, A12, A17 회수 실패** (audit table 3.1 12 unique book 중 3개 multi-word + 1개 numeric-prefix).
  - 또한 첫 토큰 만으로 매핑 시 `Дэд` / `Мэргэн` 토큰의 ambiguity (가상의 다른 OT canticle 의 book name 일치 가능성) 검증이 plan 에 없음.
- 보강 옵션 :
  - (A) `extractFirstBookToken` 을 phrase-aware 로 확장 — book name 후보 셋 (12 entries) 와 longest-prefix-match. 키는 full phrase.
  - (B) 첫 토큰 lookup 을 유지하되 매핑 표를 첫 토큰 단위로 재정의: `{ "Дэд": "Deuteronomy", "Мэргэн": "Wisdom", "1Шастирын": "1Chronicles", ... }`. 단 phrase suffix 정보는 ref-key 영문화에 손실 — `Canticle Deuteronomy 32:1-12` 만 emit, "хууль" suffix 미반영.
  - 어느 옵션이든 plan §5 와 §6.1 가 일치해야 한다.
- severity: **critical**
- category: design / bug

#### C-4 — `Колосси` (기존 NT_BOOKS) 가 PDF 0 매치 dead entry — `Колоссай` 와 spelling drift 인지 못 함

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:189-195` (§6.2 NT_CANTICLE_BOOKS)
- 결함:
  - plan §6.2: `NT_CANTICLE_BOOKS = new Set([...NT_BOOKS, 'Колоссай'])` — 기존 `NT_BOOKS` 의 `'Колосси'` 는 그대로 두고 새로 `'Колоссай'` 만 추가. 결과: NT_BOOKS 가 하나는 dead, 하나는 live 인 dual-spelling 상태로 잔존.
  - PDF 실측 (parsed_data/full_pdf.txt grep) — `Колосси` 0 매치, `Колоссай` 9+ 매치. 기존 NT_BOOKS 의 `'Колосси'` 는 절대 매칭되지 않는 dead entry.
  - 더 큰 문제: 기존 #166 R3 patch (NT_BOOKS 확장) 가 `'Колоссай'` 를 추가하지 않은 채 `'Колосси'` 만 보유했다면, **NT preface lookup 도 그동안 `Колоссай` 을 silently 놓쳐 왔을 가능성** (시편 본문의 NT preface 가 `(Колоссай N:M)` 이라면 NT_RE 매칭 실패 → unmatched/missing).
  - plan 은 이 drift 를 인지하지 못하고 NT_CANTICLE_BOOKS 에만 보강 — 자매 결함이 시편 NT preface lookup 에 잔존.
- 보강:
  1. R3 (#166) NT_BOOKS 의 `'Колосси'` → `'Колоссай'` 로 교체 (또는 둘 다 보유) 검토. 본 R2 의 NT_CANTICLE_BOOKS 도 동일 source 에서 spread 하므로 자동 정합.
  2. NT_CANTICLE_BOOKS 추가 entry 를 1개로 grep 결과로 정당화하는 evidence (현재 plan 은 line 3934 의 `Колоссай 1:12-20` 만 인용).
- severity: **critical**
- category: bug / spec

---

### Major (디자인 점검 필요)

#### M-1 — Option A "단일 파일 단일 loader" 권고와 §9.1 dual loader 제안 모순

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:137,256`
- 결함:
  - §4 Option A 결론: "단일 catalog 단일 loader 로 통합, downstream consumer 는 `kind === 'canticle_preface'` 분기만 추가하면 됨".
  - §9.1: "신규 함수 `loadCanticleHeaderRich(canticleRefKey)`. 기존 `loadPsalterHeaderRich(ref)` 와 평행 구조".
  - **모순**: 단일 파일 + 단일 ref dictionary 인데 loader 를 2개 분리하면 동일 JSON 을 2번 read / 2번 cache → memory 낭비. 또한 R2.4 sub-WI 의 sizing (`MEDIUM`) 도 dual loader 가정.
- 보강: loader 를 `loadHeaderRich(ref)` 단일 함수로 통합 (ref string prefix 로 자체 분기). R2.4 sizing 재검토 → SMALL 수렴 가능.
- severity: **major**
- category: design

#### M-2 — `scanForSourceLine` 의 `firstNonBlankIdx` dead variable

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:217-224`
- 결함:
  ```js
  let firstNonBlankIdx = -1
  for (let j = start; j < end; j++) {
    if (lines[j].trim().length === 0) continue
    if (firstNonBlankIdx < 0) firstNonBlankIdx = j   // setter
    if (looksLikeSource(lines[j])) return j
  }
  return -1
  ```
  `firstNonBlankIdx` 가 setting 되지만 어떤 path 에서도 사용되지 않음. 의사코드 단계라도 plan 에서 dead variable 은 R2.1 implementation 시 lint warning 또는 code review 에서 noise 로 잡힌다. 주석에 "title-prefix fallback 용 reserved" 라고 표시하거나 삭제하는 것이 깔끔.
- 보강: 주석으로 의도 표시 또는 삭제.
- severity: **major** (style 이지만 이미 plan 단계에서 짚을 수 있음)
- category: style

#### M-3 — 4-line window 의 안전 마진 0 — 5+ line edge case 발견 시 silently 누락

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:84,323`
- 결함:
  - §3 stage 1: `sourceIdx = scanForSourceLine(i + 1, i + 5)` → window = 4 line.
  - §2.3a 의 case (line 2267~2271) 가 정확히 4 line 이라 boundary fit. 마진 0.
  - §13 가정 2 ("Магтаал 후 ≤4 line 내 등장") 가 위배되면 (e.g. PDF rendering inconsistency 로 5 line skip) snapshot test 의 expected count = 23 미달 → R2.1 fail. 그러나 fail 후 원인 진단 / 수정 round-trip 비용 발생.
  - 위배 발견 시 단순 window 확대 (5, 6, ..) 의 false-positive risk 검토 plan 에 미반영. 인접 Магтаал 의 minimum 거리는 audit 데이터 기준 수십 line 이라 window 8까지는 안전해 보이나 plan 에서 정량 분석 부재.
- 보강:
  - window 를 6-line 으로 확대 (안전 마진 +2) + scanForSourceLine 내 "다음 Магтаал anchor 발견 시 즉시 break" guard 추가. 이렇게 하면 false-positive 차단 + 미발견 edge case 대응.
  - 또는 plan §13 가정 2 의 PDF 실측 정찰을 명시 (e.g. "audit table 3.1 23건 모두 ≤2 line, edge 2건 ≤4 line — 5+ line case PDF 전수 grep 으로 0 확인").
- severity: **major**
- category: design

#### M-4 — multi-occurrence dedup 기준 (preface 본문 vs attribution) 모호

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:248,310`
- 결함:
  - §8: "동일 source 의 multi-occurrence 가 다른 NT preface 를 가지면 entries 배열 내 별개 entry 로 분리, 동일 preface 면 dedup".
  - "동일 preface" 의 비교 기준이 (a) attribution (`Илчлэл 19:5`) 만, (b) preface_text 본문, (c) attribution + 본문 — 어느 것인지 명시 안됨.
  - audit A06 (page 179) + A18 (page 418) — 둘 다 source `Даниел 3:52-57`, 동일 attribution `Ром 1:25`, 본문도 동일 → dedup 명확. 그러나 가상의 case (동일 attribution + 다른 본문) 또는 (다른 attribution + 동일 본문) 의 처리는 미정의.
  - §4 Option A 예시는 동일 source `Даниел 3:57-88, 56` 의 두 occurrence (page 56, 296) 를 분리 entry 로 보존 — A01 + A13 본문이 동일하므로 §8 룰에 따라 dedup 되어야 하는데 예시는 분리. **plan 자체 inconsistency**.
- 보강: dedup 정의를 "(attribution, preface_text) tuple 동일 시" 로 명시. 또는 page 만 다른 동일 본문 entry 도 분리 보존하기로 결정 (downstream 이 page 별 분기) — 어느 쪽이든 명시.
- severity: **major**
- category: spec

#### M-5 — R2.4 ‖ R2.5 병렬은 e2e dependency 로 진정한 병렬 아님

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:295,299`
- 결함:
  - §11 권고 진행: "R2.4 ‖ R2.5 (병렬 가능)".
  - R2.5 의 deliverable 에 "e2e 1 — Sat Vespers Daniel canticle 표시" 포함. e2e 는 loader (R2.4) + renderer (R2.4) + resolver (R2.5) 모두 통과해야 PASS.
  - R2.5 의 e2e step 만으로 R2.4 dependency 가 발생 → R2.5 시작 전 R2.4 PR 머지 필요. **즉 R2.4 → R2.5 의 직렬 의존**.
- 보강: §11 의 진행 순서를 `R2.1 → R2.2 → R2.3 → R2.4 → R2.5 → R2.6` 직렬로 정정. 또는 R2.5 를 (5a) resolver 정규화 (R2.4 무관) + (5b) e2e (R2.4 의존) 로 split.
- severity: **major**
- category: design

---

### Minor (개선 권장)

#### m-1 — ref-key convention 의 spacing inconsistency

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:158-162`
- 결함: NT_BOOKS 는 `'1 Петр'` (공백 있음), Canticle ref-key 는 `'Canticle 1Chronicles 29:10-13'` (공백 없음). 두 convention 이 충돌.
- 보강: `Canticle 1 Chronicles 29:10-13` 으로 통일 (영문 표준 표기).
- severity: minor
- category: style

#### m-2 — plan §13 가정 1 의 "snapshot test 자동 검증" 약점

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:322-327`
- 결함: 가정 1 (NT canticle 전수가 첫 토큰 NT_BOOKS lookup 으로 식별 가능) 을 snapshot test 가 자동 검증한다고 주장. snapshot 비교는 "0 NT entries + 23 OT entries" 만 본다. 즉 false-positive of skip (NT 가 정확히 NT 로 분류되어 0 emit) 은 검증되지만, **false-negative of skip (NT 가 OT 로 잘못 분류되어 24+ emit) 는 잡힘**, **false-positive of OT (OT 가 NT 로 잘못 분류되어 22- emit) 도 잡힘**. 그러나 audit 의 "23 OT" 자체가 정찰 추정값 — 실측 24+ 일 가능성도 있어, snapshot 의 expected 가 ground truth 인지 불확실.
- 보강: R2.1 의 진단 로그가 §1 본문의 "Магтаал hit 70, OT 분류 23, NT skip ~25, edge-case (no source) ~22" 와 일치하는지 manual diff 단계 추가 (R2.3 manual diff 와 별도 로그 검증).
- severity: minor
- category: spec

#### m-3 — R2.7 의 "별도 task #168 후보" 가 본 dispatch 와 numbering 충돌

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:297`
- 결함: plan §11 R2.7 표가 "별도 #168 후보" 로 명시. 그러나 dispatch 가 본 review task 를 #168 로 부여 → numbering 충돌.
- 보강: numbering 은 leader 가 부여 — plan 에서는 "별도 task 후보 (numbering pending)" 로 둘 것.
- severity: nit
- category: spec

#### m-4 — `pageOfLine[i]` 를 Магтаал line 으로만 사용 — page break boundary risk

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:99` (의사코드 `page=pageOfLine[i]`)
- 결함: Магтаал line `i` 와 source line `sourceIdx` 가 PDF 의 page break 를 가로질러 다른 페이지에 위치할 가능성. audit table 3.1 23 건 모두 동일 page 라 현재는 무이슈, 그러나 plan 이 risk 를 인지하지 않음.
- 보강: `page = pageOfLine[sourceIdx]` 또는 두 값 비교 후 mismatch 시 warning log. risk row 에 추가.
- severity: nit
- category: design

#### m-5 — R2.3 `manual diff` sizing LOW 낙관적

- 위치: `docs/fr-160-c2-r2-canticle-plan.md:293`
- 결함: 23 entries 추가의 page / source / NT preface 정확성을 PDF 와 1:1 manual review 하는 인지 부담을 LOW 로 평가. 정량적으로는 audit table 3.1 의 23 row 와 그대로 비교하면 낮은 비용이지만, 정찰 단계에서 발견하지 못한 PDF rendering corner case (page break, footnote 삽입) 가 있다면 review 에서 catch. LOW → SMALL-MEDIUM 으로 sizing 보수화 권고.
- severity: nit
- category: spec

---

## 4. Per-AC verdict (dispatch 5-디멘션 매핑)

| 디멘션 | verdict | 핵심 issue |
|--------|---------|------------|
| 1. NT canticle skip false-positive/false-negative | APPROVED_WITH_ISSUES | C-4 (Колосси/Колоссай spelling drift), m-2 (snapshot test 약점) |
| 2. schema 변경 / loader / renderer 영향 | APPROVED_WITH_ISSUES | M-1 (Option A vs dual loader 모순) |
| 3. R1.5 verseRange capture 패턴 재사용 | APPROVED | canticle 은 ref-key 자체 unique 라 fan-out 불필요 — 의미 재정의 OK. 단 plan §1 본문의 "R1.5 패턴 재사용" 표현이 misleading (multi-occurrence 분기는 page 기반이지 verseRange 기반 아님) |
| 4. 4-line window 충분성 | APPROVED_WITH_ISSUES | M-3 (안전 마진 0) |
| 5. sub-WI R2.1~R2.6 의존 그래프 / sizing | APPROVED_WITH_ISSUES | M-5 (R2.4 ‖ R2.5 병렬 불가), m-5 (R2.3 sizing 낙관) |

추가로 본 review 가 발견한 **plan 미커버 결함** : C-1, C-2, C-3 의 regex / mapping 결함 — audit table 3.1 의 12 unique OT book 중 3건 (1Шастирын, Дэд хууль, Мэргэн ухаан) 이 R2.1 implementation 그대로 진행 시 silently 누락.

---

## 5. Approval condition (R2.1 진입 전 필수)

R2.1 sub-WI 시작 전 다음 4 가지 보강이 plan 에 반영되어야 한다 :

1. **C-1 / C-2** — `extractFirstBookToken` 과 `looksLikeSource` 의 regex 를 `(?:\d+\s*)?` 로 완화하여 `1Шастирын` (공백 없음) 매칭 가능하도록.
2. **C-3** — `OT_CANTICLE_BOOKS_MN_TO_EN` 매핑 키의 단위 (full phrase vs 첫 토큰) 명시 + plan §6.1 추출 로직과 일치.
3. **C-4** — 기존 NT_BOOKS 의 `'Колосси'` 가 dead entry 임을 명시하고 (a) 삭제 또는 (b) `'Колоссай'` 로 교체, (c) 둘 다 유지 중 하나 결정. R3 (#166) 와 R2 의 NT_BOOKS source-of-truth 단일화.
4. **M-3** — 4-line window 를 6-line 으로 확대 + `scanForSourceLine` 내 다음 Магтаал anchor break guard 추가 (false-positive 차단).

위 4 가지 보강 후에는 plan 의 design 자체는 안전 — Option A schema, sub-WI 분해, R5 verifier 연계 모두 valid. **APPROVED_WITH_ISSUES** 로 verdict 확정.

---

## 6. Recommendation

planer (member-01 또는 후속 owner) 가 plan 을 amend → C-1~C-4 + M-3 패치 후 leader review approval → `pair-cli plan save-steps` + `/pair-decompose` R2.1~R2.6 진행.

R2.1 snapshot test 가 emit 결과 = 23 OT entries + 0 NT entries + 진단 로그 (Магтаал hit 70 / OT 23 / NT skip ~25 / no-source ~22) 와 일치하면 가정 1-3 자동 검증 통과.

---

## 부록 — Adversarial review 방법

- `git show 47e5bf6:<path>` 로 base-commit fixed 파일 4건 (plan / gap-audit / extractor / builder) 을 read-only 로 확보.
- `parsed_data/full_pdf.txt` 에 `grep -nE` 로 spelling 실측 (Колоссай / 1Шастирын / Дэд хууль / Мэргэн ухаан) 검증 — plan §6.1 regex 와 PDF 실측의 mismatch 4건 식별.
- 5 디멘션 (NT skip / schema / R1.5 / window / sub-WI) 각각에 가설 → 반례 탐색 → file:line 인용 → severity 분류 적용.
- false-positive vs false-negative 의 양방향 검증 (M-2 m-2) 으로 snapshot test 의 sensitivity 한계 식별.
