# FR-156 Phase 5 — firstVespers bare-ref 데이터 정합화 plan

**상태**: PROPOSED · plan 단계, 코드 무수정
**원천 dispatch**: divineoffice/cowork task #65
**선결 자료**: divine-researcher #64 root-cause (root_cause_confidence VERY_HIGH, files_changed=[])
**병렬 진행**: task #66 (researcher) — firstVespers reading + Magnificat antiphon 누락 root cause 진단 (별건, 본 plan 과 독립적이지만 결과는 후속 PR 의 회귀 가드와 합류해야 함)
**관련 SSOT**: FR-156 (`docs/fr-156-first-vespers-scope.md`), `src/data/loth/propers/{advent,christmas,lent,easter,ordinary-time}.json`, `src/data/loth/sanctoral/solemnities.json`, `src/data/loth/psalter-texts.json`, `src/lib/scripture-ref-parser.ts`, `src/lib/hours/resolvers/psalm.ts`, `scripts/verify-{first,solemnity,movable}-first-vespers.js`

---

## 0. 권장 단일 안 (1문장)

> **시즌별 5 분할 PR (Easter / Lent / Advent / Christmas+Solemnity / Ordinary-time)** 로 propers JSON 의 firstVespers `psalms[*].ref` 를 bare → versed 형으로 기계적 재기록 + Psalm 142 / Psalm 147 cells 의 catalog↔propers 번호 정합 (Hebrew vs Vulgate) 을 인간 검토 후 결정한다. 각 시즌 PR 은 (a) per-psalm 매핑표 + 자동 rewrite 스크립트 + (b) 해당 시즌 SAT vespers e2e + (c) `verify-*-first-vespers.js` byte-equal mismatch=0 으로 가드. parser regex 변경 / SW navigation 정책 / `CACHE_VERSION` 은 **모두 무관** — 데이터 fix 단독.

---

## 1. Context

### 1.1 dispatch 요약

- **Root cause** (researcher #64 → VERY_HIGH 확신):
  firstVespers `psalms[*].ref` 가 bare 형 (콜론 없는 `Psalm NNN`) 인 cells 가 다음 두 경로 모두 miss → `loth-service` 가 placeholder 로 fallback 하면서 SAT vespers 화면에 빈 시편이 노출:
  1. **catalog miss** — `psalter-texts.json` 의 키는 versed 형 (`Psalm 122:1-9`) 만 보유. bare key 매칭 실패.
  2. **parser regex miss** — `src/lib/scripture-ref-parser.ts:99` 의 `^((?:\d\s+)?[A-Za-z][A-Za-z\s]*?)?\s*(\d+):(.+)$` 정규식이 콜론 강제 → `parseScriptureRef("Psalm 122")` 가 빈 배열 반환 → Bible JSONL fallback 도 발화 못함.
- **영향 cells (실측 cardinality 기준)**: dispatch 의 67 와 1건 차이가 있는 **66 cells**. 본 plan 은 실측치를 따른다 (구현 PR 에서 ±1 변동은 자동 도구가 흡수).

### 1.2 실측 cardinality (`scripts` 직접 측정 — §A 부록 재현)

| 시즌 / 영역 | bare-ref cells |
|------------|----------------|
| advent | 5 |
| christmas | 2 |
| lent | 7 |
| easter | 8 |
| ordinary-time | 42 |
| sanctoral/solemnities (12-25 Christmas Day) | 2 |
| **합계** | **66** |

dispatch 67 vs 실측 66 의 1건 차이는 sanctoral 의 12-25 Christmas Day 1st Vespers 를 dispatch 가 christmas 시즌으로 함께 묶었거나 1건 boundary 케이스 (예: solemnity 와 Sunday 중첩). **WI 단위에서는 자동 도구가 cell 을 enumerate 하므로 정확 cardinality 는 PR 시점에 재측정**한다.

### 1.3 distinct culprit psalm 분포

| 책 | bare 등장 횟수 | catalog 키 (psalter-texts.json) | bible_ot 가용 |
|----|----------------|---------------------------------|--------------|
| Psalm 16 | 14 | `Psalm 16:1-6` AND `Psalm 16:7-11` (둘 다 존재) | ✓ |
| Psalm 113 | 14 (propers 13 + solemnity 1) | `Psalm 113:1-9` | ✓ |
| Psalm 122 | 11 | `Psalm 122:1-9` | ✓ |
| Psalm 130 | 11 | `Psalm 130:1-8` | ✓ |
| Psalm 142 | 15 | **MISSING** — 인접 키는 `Psalm 143:1-11` | ✓ (chapter 142 = 5 verses) |
| Psalm 147 | 1 (12-25 only) | **MISSING** — 인접 키는 `Psalm 147:1-11`, `Psalm 147:12-20` | ✓ |

핵심 갈래:
- **Psalm 16 / 113 / 122 / 130** — catalog 에 단일/명확한 versed 키 존재 → bare-ref 를 **기계적 1:1 rewrite**.
- **Psalm 16 만 두 개의 versed 키** — 어느 쪽이 firstVespers 의도인지 PDF 원본 verse-range 확인 필요.
- **Psalm 142 / 147** — catalog miss. 두 시나리오 중 하나:
  - (가) **Hebrew↔Vulgate 번호 mismatch**: PDF 원본이 Vulgate 번호 사용, catalog 가 Hebrew 변환된 상태일 가능. (예: Vulgate Ps 142 = Hebrew Ps 143 → catalog `Psalm 143:1-11` 이 동일 시편) — 이 경우 bare ref 를 catalog 의 Hebrew 키로 rewrite.
  - (나) **catalog 누락**: PDF 본문은 정확한 번호이나 추출이 누락 → catalog 보강 필요.
  - 결정은 **PDF 원본 인용** (§3.2) 으로 명확 결정.

---

## 2. 현행 진단 (확인 사항)

### 2.1 Parser regex 동작

```ts
// src/lib/scripture-ref-parser.ts:99
const match = segment.match(/^((?:\d\s+)?[A-Za-z][A-Za-z\s]*?)?\s*(\d+):(.+)$/)
// "Psalm 122" → match === null (no colon)
// → fallthrough 에서 SINGLE_CHAPTER_BOOKS check (line 103) → "Psalm" 미포함 → continue
// → refs[] 빈 채로 반환
```

이는 의도된 동작이다 — psalter 데이터 모두 versed 형이라는 전제 위에 만들어진 단순 정규식. **bare-ref 를 정상 입력으로 인정한다는 결정은 이 plan 의 범위 외** (§7.5 risk R-1 참조).

### 2.2 resolvePsalm fallback 경로

```ts
// src/lib/hours/resolvers/psalm.ts
const psalmText = psalterTexts[entry.ref]            // bare key → undefined
if (psalmText && psalmText.stanzas.length > 0) { ... } // skip
const refs = parseScriptureRef(entry.ref)             // [] (bare-ref miss)
const allVerses = []
for (const ref of refs) { /* skipped */ }
if (allVerses.length === 0) {
  throw new Error(`[resolvePsalm] no text resolved for "Psalm 122" — ...`)
}
```

→ `loth-service` 의 `Promise.allSettled` 가 reject 를 잡아 placeholder 자리에 끼우고, 사용자에게는 빈 antiphon + 빈 verses 의 psalm 카드가 노출된다 (일부 케이스에서는 Magnificat 까지 placeholder 로 떨어진다 — 이 부분 상세는 task #66 결과 합류 시점에 재확인).

### 2.3 page-injector / verifier 영향

Cells 는 `scripts/inject-first-vespers-pages.js` 가 ref 를 키 삼아 `psalter-texts.json` 의 page 마커와 매칭한다 (`scripts/lib/first-vespers-page-annotator.js` 참조). bare-ref 는 이 lookup 도 miss 한다 — 다만 task #41 이후에는 `PSALTER_WEEK_PAGES` static map 으로 page 가 채워졌기 때문에 page 필드 자체는 정상이고 verifier 도 PASS 다 (기존 mismatch=0). 즉 **page** 차원에는 issue 없고 **본문 verses** 차원에만 fallback 가 발생한다.

→ 본 PR 의 데이터 rewrite 로 bare → versed 가 되면 page-injector 가 fingerprint 경로로도 매칭하기 시작한다. 두 경로 (static map vs fingerprint) 가 동일 page 를 산출하는지 회귀로 검증 필요 (§5).

---

## 3. 권장 접근

### 3.1 [질문 1] PDF 원본에서 firstVespers verse 범위 추출 방법

PDF source: `parsed_data/full_pdf.txt` (970 페이지 마커, `scripts/reextract-pdf-pages.sh` 산출). 1st Vespers 섹션 앵커:
```
1 дүгээр Оройн даатгал залбирал
```
직후 패턴:
```
Шад дуулал N <default antiphon>
Дуулал NNN[:start-end] [optional verse range]
<body verses>
```

추출 절차 (스크립트 신규 — §4 의 WI-A1 산출물):
1. `parsed_data/full_pdf.txt` 에서 "1 дүгээр Оройн даатгал залбирал" 출현마다 블록 하한 (다음 "Уншлага" / "Хариу залбирал" / "Магнификат" 까지) 결정
2. 블록 내부의 `Дуулал` / `Дуулалын` 줄 파싱 — `Дуулал 122:1-9` 또는 `Дуулал 122` 형식 모두 캡처
3. verse 범위가 명시되어 있으면 그 자체를 authoritative versed 형으로 채택
4. verse 범위가 명시되지 않은 경우 (bare 출현) — 하단 본문 stanza 의 마지막 절 번호 (예: PDF 본문이 `1`, `2`, ..., `9` 절을 인용) 를 읽어 `Psalm NNN:1-{lastVerse}` 로 합성
5. 결과를 `parsed_data/first-vespers-versed-map.json` 으로 저장:
   ```json
   {
     "Psalm 16":  { "versed": "Psalm 16:7-11", "evidence": "PDF p.166 line 5460 ..." },
     "Psalm 113": { "versed": "Psalm 113:1-9", "evidence": "..." },
     ...
   }
   ```
6. 동시에 다음 4가지 sanity 체크:
   - 산출 versed key 가 `psalter-texts.json` 에 실제 존재 → 미존재 시 (가) Hebrew↔Vulgate 번호 mismatch 인지, (나) catalog 누락인지를 PDF body 첫 두 절 fingerprint 로 catalog 의 인접 책 (예: Psalm 143:1-11) body 와 cosine 유사도 비교
   - 4-week psalter authoritative page (§task #41 의 `PSALTER_WEEK_PAGES`) 와 PDF body page 가 일치
   - 동일 시편이 여러 cells 에서 등장 시 모두 동일 versed 결정 (Easter 4 SUN, Lent 4 SUN 등 모두 `Psalm 122` 가 등장 — 동일 versed 가 적용되어야 함)
   - sanctoral/solemnities 12-25 (Christmas Day) 의 Psalm 113 / Psalm 147 도 같은 PDF block 추적

산출물 (`first-vespers-versed-map.json`) 은 **WI-A1 의 deliverable**, 이후 모든 시즌 PR 이 같은 map 을 SSOT 로 사용한다.

### 3.2 [질문 2] catalog versed key 와 1:1 매핑 검증

§3.1 의 step 6 (sanity 체크) 가 곧 매핑 검증이다. 추가로 자동화 verifier:

`scripts/verify-first-vespers-ref-coverage.js` (신규):
- 입력: 모든 propers + sanctoral firstVespers psalms[*].ref
- 검증:
  1. 각 ref 가 versed 형 (정규식 `^[A-Za-z\d ]+\s+\d+:[\d\-\sa,.bc]+$`)
  2. 각 ref 가 `psalter-texts.json` 의 키와 정확히 일치
  3. 동일 catalog 키를 참조하는 cells 는 동일 antiphon_key prefix 그룹에 속해야 한다 (예: `fv-w4-sun-ps1` group — 같은 시편을 가리킴)
- exit code 0/1, CI 연결 가능. **PR 머지 게이트로 추가**.

### 3.3 [질문 3] 매핑 불가 cells 처리 — Psalm 142 / Psalm 147 결정 트리

PDF body fingerprint 결과에 따라 분기:

```
PDF body fingerprint 가 catalog 의 인접 numbered 키 (Psalm 143 / Psalm 147:12-20 등) 와 매칭
  → CASE A: Hebrew↔Vulgate 번호 mismatch
     - 결정: propers 데이터의 ref 를 catalog 의 numbered 키로 rewrite
       e.g. "Psalm 142" → "Psalm 143:1-11"
     - 별도: docs/PRD.md NFR-009d 또는 §7 에 numbering convention 명시 1줄 추가
PDF body fingerprint 가 catalog 의 어떤 키와도 매칭 안 됨
  → CASE B: catalog 누락
     - 결정: psalter-texts.json 에 신규 entry 추가 (`Psalm 142:1-N`)
     - extraction 소스: scripts/extract-psalm-texts.js 재실행 또는
       PDF block 직접 카피 + stanza 분할 수동 검증
     - psalmPrayerPage / psalmPrayer 는 PDF 마침기도 섹션에서 동일 절차로 추출
PDF body fingerprint 가 catalog 키 본문과 부분 일치 (verse 범위 차이)
  → CASE C: 동일 시편, 다른 verse-range
     - 결정: catalog 에 partial-range entry 추가 (e.g. `Psalm 142:1-7`)
     - 또는 인접 entry 재사용 (Psalm 16 처럼 두 키 중 하나 선택)
```

WI-A1 의 산출물에 각 distinct psalm 의 결정 verdict (CASE A/B/C) 를 명시. Christmas Day solemnity 의 `Psalm 113`, `Psalm 147` 은 별 항목으로 추적 — 보통 Vulgate Ps 113 + Vulgate Ps 147 (Hebrew Ps 114 + Ps 147:12-20) 으로 추정되지만 PDF 인용 필수.

**범용 지침**:
- catalog 보강 (CASE B/C) 가 발생하면 NFR-009c/d body-fingerprint workflow 의 verifier 영향 검토. `scripts/verify-psalter-body-pages.js` 가 새 entry 의 page 를 검증하도록 entry 등재.
- catalog 보강 시 `psalter-texts.json` 의 schema (`stanzas[]`, `psalmPrayer`, `psalmPrayerPage`) 모두 채움. **빈 stanzas 는 절대 금지** — 그러면 Bible fallback 으로 떨어지고 회귀 발생.
- rich overlay (`prayers/rich-overlay`) 도 새 entry 가 있으면 `loadPsalterTextRich` 가 빈 결과를 자연스럽게 반환하도록 (현행 코드는 `?? undefined` 로 안전).

### 3.4 [질문 4] 67 cells 분할 전략 — 시즌 단위

**채택**: 5 PR 분할.

| PR # | 시즌 | cells | 회귀 위험 | 우선순위 |
|------|------|-------|----------|----------|
| 5a | easter | 8 | 중 (Easter Sunday vespers + 6 SAT) | High (해 직전 시즌) |
| 5b | lent | 7 | 중 (Holy Week 포함 — Passion Sunday SAT) | High |
| 5c | advent | 5 | 저 | Med |
| 5d | christmas + solemnity 12-25 | 4 (2+2) | 저-중 (Christmas Day 1st Vespers UX 영향) | Med |
| 5e | ordinary-time | 42 | 중 (양 多, 단순 반복 ⇒ 자동화) | Low (안정 시즌) |

이유:
- 시즌별 PR 은 **rollback 단위 자연 정렬**. 만약 어떤 시즌의 catalog 결정 (CASE B 보강) 이 회귀를 일으키면 그 시즌만 revert 가능.
- e2e 회귀 가드도 시즌 단위로 분할 (각 PR 이 자기 시즌의 SAT 만 검증 → CI 시간 단축).
- 의존성: WI-A1 (versed-map 추출) 는 모든 PR 의 prerequisite. WI-A2 (자동 rewrite 스크립트) 도 마찬가지.

대안 (단일 PR) 의 단점:
- Diff 70 cells 가 5 시즌 JSON + sanctoral 1 + 가능한 catalog 추가 → 머지 충돌 위험 (병행 작업 다른 task 와)
- e2e 가드를 5 시즌 모두 통과해야 → 1 cell 결정 오류로 전체 PR rejected
- catalog 보강 결정 (CASE B) 이 시즌마다 다를 수 있음 → 단일 PR 은 그 결정을 뭉쳐서 review 부담↑

대안 (psalm 단위 PR — 6 PR) 의 단점:
- 같은 PR 이 5 시즌 JSON 모두 건드림 → 시즌별 충돌 위험 동일
- 그러나 catalog 결정 격리 측면에서는 더 깨끗 — **Open Question §7.6** 로 leader 결정에 맡김.

권장: **5 시즌 분할** (default) but leader 가 **6 psalm 분할** 을 선택해도 plan 의 WI 구조는 그대로 사용 가능 (WI-B[1..5] → WI-B[16,113,122,130,142,147] 로 라벨 치환).

### 3.5 [질문 5] 검증 가드 — 5 시즌 × all SAT vespers e2e

#### 자동 (per-PR CI)

1. **`verify-first-vespers-ref-coverage.js`** (§3.2 신규) — bare-ref 0 + 모든 ref ∈ catalog
2. **`verify-{first,solemnity,movable}-first-vespers.js`** mismatch=0 — 기존 byte-equal page verifier 유지
3. **`verify-psalter-pages.js`** — catalog 보강이 있으면 새 entry 가 page workflow 에 합류
4. **vitest** — `src/lib/__tests__/first-vespers.test.ts` + `src/lib/hours/__tests__/first-vespers-identity.test.ts` 273+ PASS 유지. 신규 테스트 (시즌별 SAT vespers psalm body 비공백 어서션) +5~10 추가
5. **typescript** — `npx tsc --noEmit` 0
6. **e2e** — 시즌별 SAT vespers 페이지 1건씩 (총 5건) + sanctoral 12-24 (Christmas Eve = Christmas Day 1st Vespers) 1건 = **6 신규 e2e**

#### e2e 매트릭스 (PR 별 1~2 신규 테스트 부가)

| PR | 검증 날짜 | 어서션 |
|----|----------|--------|
| 5a (easter) | 2026-04-04 (Holy Sat — Easter Vigil 전; e2e 적합 시 Easter 시즌 안의 임의 SAT 예 2026-04-11) | psalm 본문 stanza 가 비공백, antiphon 노출, Magnificat 노출 |
| 5b (lent) | 2026-02-21 (Lent 1주차 SAT) + 2026-03-28 (Passion Sunday SAT) | 위와 동일 + lentSunday[5] variant 노출 |
| 5c (advent) | 2025-11-29 (Advent 1주차 SAT) | 위와 동일 + advent variant 노출 |
| 5d (christmas+solemnity) | 2026-12-24 (Christmas Eve SAT — solemnity 12-25 firstVespers 가 호출되어야 함) | psalm 본문 + Christmas firstVespers 의 special ref 노출 |
| 5e (ordinary-time) | 2026-09-12 (OT 24주차 SAT 가정) | 위와 동일, default Sunday variant |

각 e2e 는 `// @fr FR-156` 태그 + Phase 5 식별을 위해 `// @phase 5` 또는 describe 안에 "Phase 5 bare-ref fix" 명시 → `scripts/generate-test-fr-map.mjs` 가 traceability 자동 갱신.

#### 수동 (CLAUDE.md mandate — 모바일 SW 회귀)

- 본 변경은 **데이터 단독** — 링크/URL/Content-Type 변경 없음 → SW 영향 0 (§3.6 참조). 그래도 시즌별 PR 머지 직후 1회씩 **iOS Safari** 에서 `/pray/{시즌별 SAT}/vespers` 로드 → 이전 캐시 HTML 재현 X 확인 (CLAUDE.md "테스트가 못 잡는 것들" 섹션 — A2HS PWA 사용자 회귀 가드).

### 3.6 [질문 6] CLAUDE.md SW navigation / CACHE_VERSION 영향

**모두 무관**. 근거 (CLAUDE.md "Service Worker 캐시" §):

| 트리거 조건 | 본 plan 에서 발생? |
|------------|------------------|
| 링크 스키마 / URL / target / rel 변경 | ❌ — JSON 데이터만 |
| 새 라우트 추가 | ❌ |
| 응답 Content-Type 변경 | ❌ — `/pray/[date]/vespers` 그대로 HTML |
| public/ 자산 경로 변경 | ❌ |
| 정적 자산 내용 변경 | ❌ — `/public` 무수정 |
| `PRECACHE_URLS` 변경 | ❌ |
| `sw.js` 자체 수정 | ❌ |
| Navigation 정책 변경 | ❌ — network-only 유지 |

→ `CACHE_VERSION = divine-office-v4` **bump 불필요**. 본 plan 의 모든 PR 에서 `public/sw.js` 는 무수정.

확인 1줄: 각 시즌 PR 의 마지막 단계에 `git diff main -- public/sw.js` 가 비어 있는지 검증 (체크리스트 §6).

### 3.7 [질문 7] 단일 PR vs 시즌별 분할 PR — 결론

§3.4 의 비교에서 도출: **시즌별 5 분할**. WI-A1 (versed-map) + WI-A2 (rewrite tool) + WI-B[1..5] (시즌 5 적용) + WI-C (선택적 catalog 보강) + WI-D (cleanup + traceability) 구조.

---

## 4. WI 분해 (dispatch-ready)

각 WI 는 (a) Title (b) AC (acceptance criteria) (c) target_files (d) 종속성 (e) complexity 를 포함. 본 plan 으로부터 leader 가 직접 dispatch 할 수 있도록 작성.

### WI-A1 — PDF 1st Vespers verse 범위 추출 + versed-map JSON 산출

- **AC**:
  1. `parsed_data/first-vespers-versed-map.json` 생성, 6개 distinct psalm (16, 113, 122, 130, 142, 147) 모두 entry 보유
  2. 각 entry 가 `versed` 키 + `evidence` (PDF 라인 인용 또는 page 번호) + `case_verdict` (CASE A/B/C — §3.3) 포함
  3. `case_verdict: "B"` 항목은 catalog 보강 후속 WI (WI-C) 트리거 표시
  4. 산출물이 `psalter-texts.json` 의 versed 키 inventory 와 cross-validated (PR review 시 명시 매핑표 첨부)
- **target_files** (산출): `parsed_data/first-vespers-versed-map.json`, 새 추출 스크립트 (e.g. `scripts/extract-first-vespers-versed-map.js`)
- **종속성**: 없음 (단독 진행 가능)
- **complexity**: MEDIUM (PDF 파싱 + 6 psalm × evidence 수집)
- **suggested_skill**: `/pair-coding` 또는 `/pair-research` (extraction 자체는 코딩, evidence 수집은 research 성격)
- **isolation**: worktree
- **추천 dispatch 대상**: divine-researcher (PDF source 친숙)

### WI-A2 — 자동 rewrite 스크립트 + dry-run 리포트

- **AC**:
  1. `scripts/rewrite-first-vespers-bare-refs.js` 가 WI-A1 의 versed-map 을 입력으로 받아 `propers/{season}.json` + `sanctoral/solemnities.json` 에서 bare-ref cells 를 versed 로 재기록
  2. `--season {advent|christmas|lent|easter|ordinary-time|solemnities}` 플래그로 한 시즌만 한정 적용 가능
  3. `--dry-run` 모드: 변경 후보 출력 + cell 단위 (`{season}.weeks.{N}.SUN.firstVespers.psalms[{i}]`) 위치 리스트
  4. 최초 dry-run 결과가 §1.2 의 cell 분포와 정합 (총 66 ± 1)
  5. catalog miss (CASE B) 가 발생하면 명시 ERROR + 해당 cell 을 skip + WI-C 보강 후 재실행 안내
- **target_files** (산출): `scripts/rewrite-first-vespers-bare-refs.js`, `scripts/__tests__/rewrite-first-vespers-bare-refs.test.js` (unit)
- **종속성**: WI-A1
- **complexity**: MEDIUM
- **suggested_skill**: `/pair-coding`
- **isolation**: worktree

### WI-A3 — `verify-first-vespers-ref-coverage.js` 신규 verifier (§3.2)

- **AC**:
  1. propers + sanctoral 의 모든 firstVespers `psalms[*].ref` 가 versed 형 + catalog 키 일치 검증
  2. 한 cell 이라도 bare 형이면 exit 1 + 위치 리스트 출력
  3. CI 연결: `package.json` scripts 에 `verify:first-vespers-ref` 등록
  4. 현재 (rewrite 전) 실행 시 66 violation 보고 (basal red)
- **target_files**: `scripts/verify-first-vespers-ref-coverage.js`, `package.json`
- **종속성**: 없음 (WI-A1/A2 와 병행 가능)
- **complexity**: LOW
- **suggested_skill**: `/pair-coding`
- **isolation**: worktree

### WI-B1..B5 — 시즌별 적용 (5 시즌)

각 WI 형식 동일, 시즌 라벨만 변경:

- **WI-B1: easter** (8 cells)
- **WI-B2: lent** (7 cells)
- **WI-B3: advent** (5 cells)
- **WI-B4: christmas + solemnities/12-25** (2 + 2 = 4 cells)
- **WI-B5: ordinary-time** (42 cells)

공통 AC:
1. WI-A2 의 rewrite 스크립트로 해당 시즌 한정 실행 → `git diff` 로 cell 수 확인
2. `verify-first-vespers-ref-coverage.js` 해당 시즌 한정 PASS (bare-ref 0)
3. `verify-{first,solemnity,movable}-first-vespers.js` mismatch=0 유지
4. `verify-psalter-pages.js` agree 수 회귀 없음 (psalter page 영향 없음을 재확인)
5. `vitest` 273+ PASS 유지 + 신규 단위 테스트 +1~3 (해당 시즌 SAT firstVespers 의 first psalm 본문 비공백 단위 어서션)
6. e2e 신규 1~2 (§3.5 매트릭스의 해당 시즌 행)
7. `git diff main -- public/sw.js` 비어 있음

**target_files** (수정):
- WI-B1: `src/data/loth/propers/easter.json` + e2e file + (선택) catalog
- WI-B2: `src/data/loth/propers/lent.json` + e2e + ...
- WI-B3: `src/data/loth/propers/advent.json` + e2e + ...
- WI-B4: `src/data/loth/propers/christmas.json`, `src/data/loth/sanctoral/solemnities.json` + e2e + ...
- WI-B5: `src/data/loth/propers/ordinary-time.json` + e2e + ...

**종속성**: B1~B5 모두 WI-A1, WI-A2, WI-A3 완료 후. **WI-C 결정 전에는 CASE B 영향 cell (Psalm 142 / Psalm 147) 이 들어간 시즌은 진행 불가** — 즉:
- B1, B2, B3, B5 는 **모두 Psalm 142 cells 포함** (Psalm 142 가 OT/Lent/Advent/Easter 전반에 등장)
- B4 는 Psalm 147 cell 포함 (12-25)
- → **WI-C 가 모든 B*[CASE B/C] 의 prerequisite**

**complexity**: B1=LOW (cells 8), B2=LOW (7), B3=LOW (5), B4=LOW (4), B5=MEDIUM (42 — 자동화로 mitigate)
**suggested_skill**: `/pair-coding` 또는 `/pair-process-workitem`
**isolation**: worktree per WI (5 worktrees 병렬 가능 — 단, ordinary-time 의 cells 가 catalog 결정 의존 — sequential 권장: B4 → B1/B2/B3 → B5)

### WI-C — catalog 보강 (Psalm 142 + Psalm 147 결정 적용)

- **AC**:
  1. WI-A1 의 case_verdict 에 따라 분기:
     - CASE A (번호 mismatch only) → propers data rewrite 만; catalog 무수정 (이 WI 자체가 no-op + skip 사유 명시)
     - CASE B (catalog 누락) → `psalter-texts.json` 신규 entry 추가, stanzas + psalmPrayer + psalmPrayerPage 모두 채움
     - CASE C (verse-range partial) → 신규 entry OR 기존 entry 의 partial-range alias 추가
  2. catalog 보강 시 `verify-psalter-pages.js`, `verify-psalter-body-pages.js`, `audit-psalter-ref-consistency.js` 모두 PASS
  3. 보강 entry 의 본문은 PDF 원본 (`parsed_data/full_pdf.txt` 의 stanza 블록) 직접 인용 — 추측 금지 (NFR-009b)
  4. rich overlay (`prayers/rich-overlay/...`) 호환 — 없으면 `?? undefined` fallback 자연 처리, 있으면 매핑 키 일치
- **target_files**: `src/data/loth/psalter-texts.json` (선택), `parsed_data/...` 추출 산출물, verifier 결과 로그
- **종속성**: WI-A1 (case_verdict 입력)
- **complexity**: MEDIUM (PDF stanza 분할 + 회귀 가드 다수)
- **suggested_skill**: `/pair-coding` + L3 fresh-eyes 리뷰
- **isolation**: worktree

### WI-D — Phase 5 cleanup + traceability + parser regex 평가

- **AC**:
  1. `verify-first-vespers-ref-coverage.js` 가 main branch 에서 exit 0 (모든 시즌 정합)
  2. `docs/PRD.md` FR-156 행에 "Phase 5: bare-ref 정합화 (66 cells, 5 시즌)" 1줄 추가, 상태 "완료"
  3. `docs/traceability-matrix.md` FR-156 영역에 신규 e2e 6건 + 신규 verifier 1건 등재
  4. `docs/fr-156-first-vespers-scope.md` 의 Phase 분할 섹션 업데이트 (Phase 5 추가)
  5. **parser regex 평가**: `src/lib/scripture-ref-parser.ts` 의 bare-ref 지원 추가 여부 결정. 본 PR 에서는 **무수정 권장** (defense-in-depth 후속 별건 FR — 이유 §7.5 R-1) — 결정 결과를 ADR 1줄로 기록.
- **target_files**: `docs/PRD.md`, `docs/traceability-matrix.md`, `docs/fr-156-first-vespers-scope.md`, (선택) ADR
- **종속성**: WI-B1..B5 모두 완료
- **complexity**: LOW
- **suggested_skill**: `/pair-doc-sync`
- **isolation**: worktree

### WI Dependency DAG

```
WI-A1 (versed-map) ──┬─→ WI-A2 (rewrite tool) ──┐
                     ├─→ WI-C (catalog 보강) ───┤
                     └─→ WI-A3 (ref verifier) ──┤
                                                ▼
                                       WI-B4 (christmas+sol)
                                                │
                                                ▼
                                       WI-B1 (easter) ⇆ WI-B2 (lent) ⇆ WI-B3 (advent)
                                                │           │           │
                                                └───────────┴───────────┘
                                                            ▼
                                                  WI-B5 (ordinary-time)
                                                            │
                                                            ▼
                                                          WI-D (cleanup)
```

WI-B[1..5] 의 sequencing:
- B4 (christmas+12-25 solemnity) 가 가장 먼저: solemnity firstVespers wiring 변동 (FR-156 Phase 3b ~ 의 산물) 의 회귀 가드를 빠르게 확인
- B1/B2/B3 병행 가능 (시즌 독립)
- B5 (OT 42 cells) 마지막: 가장 큰 diff 이지만 패턴 단순

---

## 5. 회귀 가드 요약

### 자동 (CI per PR)
- `verify-first-vespers-ref-coverage.js` — 신규 (WI-A3), bare-ref 0 enforce
- `verify-{first,solemnity,movable}-first-vespers.js` — 기존 byte-equal page verifier mismatch=0 유지 (3종)
- `verify-psalter-pages.js`, `verify-psalter-body-pages.js`, `audit-psalter-ref-consistency.js` — catalog 보강 시 (WI-C) 만 적극 검증
- `vitest` 273+ PASS 유지 (+5~10 신규 단위)
- `tsc --noEmit` 0
- e2e 신규 6건 (시즌별 1 + 12-24 1)
- `scripts/generate-test-fr-map.mjs --check` PASS
- `git diff main -- public/sw.js` empty (CACHE_VERSION 가드)

### 수동 (CLAUDE.md mandate)
- iOS Safari 실기기에서 시즌별 SAT vespers 1건씩 6 페이지 — 이전 SW 등록 잔존 사용자 시뮬레이션
- A2HS PWA 재실행 — Christmas Eve (12-24) 시점 1st Vespers 정확 노출
- DevTools Slow 3G — `/pray/{date}/vespers` 가 placeholder fallback 없이 완주

### 회귀 안전 영역 (변경 없음 명시)
- `public/sw.js`: 무수정
- `src/lib/scripture-ref-parser.ts`: 무수정 (R-1 별건 FR)
- 기존 versed-form refs (Psalm 141:1-9, Psalm 119:105-112 등): 무수정
- 4-week psalter `psalter/week-{1..4}.json`: 무수정
- regular Sunday vespers (non-firstVespers): 무수정

---

## 6. CLAUDE.md 체크리스트 정합

| 체크 항목 | 본 plan 의 답 |
|----------|--------------|
| 링크/URL/자산/Content-Type 변경 | **없음** |
| `sw.js` 검토 / CACHE_VERSION bump | **불필요** (§3.6) |
| 모바일 수동 확인 | **필요** — §5 의 6 페이지 시즌별 |
| 몽골어 라벨 오타 점검 | 본 PR 은 데이터 ref 만 변경, 본문 텍스트 무수정 (catalog 보강 시는 PDF 원문 카피 — NFR-009b "추측 금지") |
| PRD / traceability-matrix 갱신 | WI-D 의 AC §2,3 |
| HourSection 변형 추가 | 없음 |
| `@fr FR-156` 태그 부착 | 신규 6 e2e 모두 |
| `psalter/week-*.json` page 값 수정 | 없음 → `verify-psalter-pages.js` 무관 |
| 다른 데이터 영역 page 값 수정 | 없음 → 다른 verifier 무관 |
| `psalter-texts.json` 의 ref 또는 본문 수정 | **WI-C 만**, 그 경우 `audit-psalter-ref-consistency.js` 필수 PASS |

---

## 7. 위험 / Open Questions

### 7.1 Risks

| ID | 위험 | 심각도 | 완화 |
|----|------|-------|------|
| R-1 | parser regex 무수정 정책 → 향후 또 다른 bare-ref drift 발생 시 동일 placeholder 회귀 | MEDIUM | (a) WI-A3 의 verifier 가 CI 게이트 → drift 즉시 차단. (b) parser 의 bare-ref 지원은 별건 FR 로 ADR 기록. (c) 데이터 fix 단독 정책의 **장점** 은 SSOT (psalter-texts.json) 의 versed 형 invariant 보존 |
| R-2 | Psalm 142 가 CASE B (catalog 누락) 로 판명되면 PDF stanza 분할이 보강 entry 의 정확성 좌우 | HIGH | NFR-009b "추측 금지" + L3 fresh-eyes 리뷰 + verify-psalter-body-pages 매칭 가드 |
| R-3 | Hebrew↔Vulgate 번호 mismatch (CASE A) 가 PDF↔catalog 양쪽에 일관 적용되지 않은 상태 | MEDIUM | WI-A1 의 evidence 수집 단계에서 PDF 번호 vs catalog 번호 반드시 명시. 결정이 모호하면 leader 에 escalate (open question) |
| R-4 | Psalm 16 의 두 catalog 키 (`Psalm 16:1-6` vs `Psalm 16:7-11`) 중 잘못 선택 시 본문이 다른 verse 그룹으로 노출 | MEDIUM | WI-A1 에서 PDF 의 firstVespers 본문 첫 절 번호 (1 vs 7) 로 명확 결정 + e2e 본문 첫 줄 어서션 |
| R-5 | OT 42 cells 의 자동 rewrite 가 cell 위치 (path) 오인하여 잘못된 ref 갱신 | MEDIUM | WI-A2 의 dry-run 리포트 + L2 schema audit (path 정합) |
| R-6 | catalog 보강 시 `psalmPrayerRich` 매핑 누락 → rich-overlay miss → UX 회귀 | LOW | rich overlay loader 가 `?? undefined` fallback (psalm.ts:55-56). 다만 보강 후 `loadPsalterTextPsalmPrayerRich` 가 신규 키도 cover 하는지 task #46 (rich-builder read-modify-write) 정합 확인 |
| R-7 | task #66 (researcher 진행 중) 의 결과가 root cause 의 일부분 (예: Magnificat antiphon 누락) 을 본 plan 외 별도 결함으로 분리하지 못함 | MEDIUM | task #66 완료 즉시 결과를 본 plan 의 §1.1 에 합류. Magnificat 누락이 동일 placeholder fallback 경로라면 본 PR 가 자동 수복; 별도 경로면 별건 WI 추가 |
| R-8 | 5 분할 PR 사이 worktree 동시 작업이 다른 미머지 task 와 propers JSON 충돌 (megacommit 위험) | LOW | seed commit 선행 + `git diff` 로 자연 배제 (MEMORY: 병렬 세션 인프라 공유 protocol) |
| R-9 | dispatch 의 cells 67 vs 실측 66 의 1건 차이가 후속에 enumeration drift 생성 | LOW | WI-A2 의 dry-run 리포트가 SSOT — PR 시점에서 정확 cardinality 결정 |

### 7.2 Open Questions (leader 결정 필요)

1. **PR 분할 단위**: §3.4 의 "5 시즌 분할" (default) vs "6 psalm 분할" — psalm 단위가 catalog 결정 격리에 더 유리하나 시즌 JSON 파일 수정 빈도 ↑
2. **parser regex bare-ref 지원**: WI-D 에서 별건 FR 로 분리 (default) vs 본 PR 에 포함 (defense-in-depth)
3. **catalog 보강 (WI-C) 트리거 결정**: WI-A1 의 case_verdict 결과가 모든 항목 CASE A (번호 mismatch) 면 WI-C 자동 skip — verdict 가 모호한 경우 leader 가 case_verdict 검증
4. **task #66 결과 합류 방식**: researcher 가 별개 결함 (Magnificat 누락) 을 보고하면 본 plan 에 emergent WI 추가 vs 별건 FR
5. **e2e 시즌별 SAT 날짜 선정**: §3.5 매트릭스의 후보 날짜 (2026-04-11, 2026-02-21, 2026-03-28, 2025-11-29, 2026-12-24, 2026-09-12) 중 일부가 다른 e2e 와 fixture 충돌하는지 — 구현 task 시점 결정
6. **OT 42 cells 의 worktree 단위**: 단일 worktree (B5 한 개) vs 4-week 단위 분할 (B5a/b/c/d) — 단일 권장 (자동화 신뢰), 분할은 review 부담 ↑

### 7.3 Out of scope (명시)

- parser regex bare-ref 지원 (R-1 별건 FR)
- task #66 의 Magnificat antiphon 누락이 별개 결함일 경우의 fix
- 평일 firstVespers (개념 미존재)
- sanctoral feasts/memorials 의 firstVespers (현재 bare-ref 0건 — Christmas Day solemnity 외)
- 4-week psalter `psalter/week-{1..4}.json` 의 versed-form refs (이미 versed)
- regular (non-firstVespers) Sunday vespers
- SW navigation 정책 변경 (§3.6)
- `CACHE_VERSION` bump
- pdfjs / PDF viewer 변경 (FR-017j 와 무관)

---

## 8. 승인 후 후속 단계 (정보용)

1. plan approval → leader 가 WI-A1 부터 dispatch (researcher 또는 coder 중 적합 선택)
2. WI-A1, WI-A3 병행 → WI-A1 결과로 case_verdict 결정 → WI-C 필요성 판단
3. WI-A2 (rewrite tool) → dry-run 리포트로 cell cardinality 확정
4. WI-B4 → B1/B2/B3 (병행 가능) → B5 → WI-D 머지
5. 각 시즌 PR 머지 직후 §5 의 모바일 수동 체크리스트 1회 (특히 12-24 / Christmas Eve PR 직후)
6. main 안정화 후 R-1 별건 FR 등록 (parser regex bare-ref 지원)

---

## 부록 A — 실측 cardinality 재현 절차

```bash
# 시즌별 propers bare-ref count
node -e '
const fs = require("fs");
const seasons = ["advent","christmas","lent","easter","ordinary-time"];
const isBareRef = (r) => typeof r === "string" && /^[A-Za-z\d ]+\s+\d+$/.test(r) && !r.includes(":");
let total = 0;
seasons.forEach((s) => {
  const data = JSON.parse(fs.readFileSync(`src/data/loth/propers/${s}.json`, "utf8"));
  let count = 0;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      if (node.firstVespers && node.firstVespers.psalms) {
        node.firstVespers.psalms.forEach((p) => { if (p && isBareRef(p.ref)) count++; });
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(data);
  console.log(`${s}: ${count}`);
  total += count;
});
console.log(`propers subtotal: ${total}`);
'

# sanctoral solemnities bare-ref count (Christmas Day 12-25)
node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("src/data/loth/sanctoral/solemnities.json", "utf8"));
const isBareRef = (r) => typeof r === "string" && /^[A-Za-z\d ]+\s+\d+$/.test(r) && !r.includes(":");
let count = 0;
const walk = (node) => {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node && typeof node === "object") {
    if (node.firstVespers && node.firstVespers.psalms) {
      node.firstVespers.psalms.forEach((p) => { if (p && isBareRef(p.ref)) count++; });
    }
    Object.values(node).forEach(walk);
  }
};
walk(data);
console.log(`sanctoral/solemnities: ${count}`);
'
```

기대 출력 (2026-04-26 main 기준):
```
advent: 5
christmas: 2
lent: 7
easter: 8
ordinary-time: 42
propers subtotal: 64
sanctoral/solemnities: 2
# total: 66
```

WI-A2 의 dry-run 결과가 위 분포와 정합해야 한다. 구현 PR 시점 main 의 cell 수가 ±1 변동하면 plan 의 cardinality 도 그에 맞게 갱신.

---

*Plan 작성: planer (divineoffice cowork team), task #65, worktree `65-planer`, base commit 985e5225.*
