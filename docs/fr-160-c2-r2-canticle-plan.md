# FR-160-C-2 R2 — `Магтаал` canticle scope plan (extractor + schema)

> **TL;DR** — `Магтаал` 헤더 23건 (OT canticle, NT preface 보유) 을 회수하기 위해 extractor 에 별도 code-path 추가 + `psalter-headers.rich.json` 에 신규 entry kind `canticle_preface` 도입한다. 핵심 위험은 **NT canticle 오회수 (false positive)** — 첫 토큰 `NT_BOOKS` lookup 으로 skip. R1.5 verseRange capture 패턴을 source-line 매칭에 그대로 재사용해 동일 canticle 의 다중 occurrence 를 per-occurrence preface 로 보존한다. plan-only, no code.

타입: planning — 새 extractor path + schema 변경 design + sub-WI 분해

@fr FR-160-C2 (referenced WI: #165 audit / #166 R1+R3 patch / **#167 본 문서**)

---

## 1. 목표

- 입력: `parsed_data/full_pdf.txt` 의 `^Магтаал\s*$` 헤더 70 라인 (전체 출현).
- 출력: `psalter-headers.rich.json` 에 **+23 OT canticle entries** 추가, NT canticle (Phil 2 / Eph 1 / Col 1 / Rev 4-19 등) 은 false-positive 없이 0건 추가.
- 부산물: extractor 의 진단 로그가 (a) Магтаал hit 70, (b) OT 분류 23, (c) NT skip ~25, (d) edge-case (no source) ~22 로 명시.

---

## 2. 입력 데이터 분석 (gap audit + 추가 정찰)

### 2.1 OT canticle 패턴 (23건, 회수 대상)

```text
1876: Магтаал  (trailing tab)
1877: Даниел 3:57-88, 56                  ← canticle source line
1878: Эзэний хамаг бүтээлүүд ээ, ...      ← preface body
1879-1880: ...(Илчлэл 19:5).              ← NT typological preface
```

- 패턴: `Магтаал → [blank?] → <source line> → preface body (≤10 line) → (NT_BOOK N:M)`.
- 첫 토큰 빈도: `Даниел` 4, `Исаиа` 5, `Тобит` 2, `Иудит` 1, `Иеремиа` 2, `Сирак` 1, `1 Самуел` 1, `Хабаккук` 1, `Дэд хууль` 1, `Мэргэн ухаан` 1, `Езекиел` 1, `1Шастирын дээд` 1 (audit table 3.1).

### 2.2 NT canticle 패턴 (~25건, skip 대상 — 가장 큰 위험)

```text
1666: Магтаал
1667: Филиппой 2:6-11                     ← NT_BOOKS 첫 토큰 → SKIP
2320: Магтаал → 2321: 1 Петр 2:21-24      ← SKIP
2815: Магтаал → 2816: Ефес 1:3-10         ← SKIP
3406: Магтаал → 3407: Илчлэл 4:11. 5:9... ← SKIP (Илчлэл = Rev)
5156: Магтаал → 5157: Илчлэл 15:3-4       ← SKIP
3933: Магтаал → 3934: Колоссай 1:12-20    ← SKIP (NT_BOOKS 확장 필요)
```

NT canticle 은 본문 자체가 NT 이므로 별도 NT preface 가 없다. 오회수 시 catalog 가 부풀고 PRD count drift 발생 → **반드시 skip**.

### 2.3 Edge cases (실측 정찰 발견)

#### 2.3a Blank-prefix + title-prefix (line 2267)

```text
2267: Магтаал
2268: (blank)
2269: Хурганы хурим          ← human-readable title
2270: (blank)
2271: Илчлэл 19:1-7          ← source line, 4 lines below Магтаал
```

#### 2.3b Blank-prefix + title-suffix (line 4547)

```text
4547: Магтаал
4548: (blank)
4549: Илчлэл 11:17-18. 12:10б-12а   ← source, 2 lines below
4550: Тэнгэрбурханы шүүлт          ← title AFTER source
```

#### 2.3c No source line / unidentified (~5-10건 추정)

일부 Магтаал 는 source citation 이 누락되었거나 ("Хурганы хурим" 처럼 이름만 있는 경우) 시즌별 시편 재사용. 본 R2 범위에서는 **catalog skip** + warning log 만 출력.

→ Extractor 의 source-line 탐지는 **`Магтаал` 다음 ≤4 라인 내 첫 비공백 line** 을 후보로 본 후, "Book N(:M-N)?" 형식 정규식으로 검증한다.

---

## 3. 새 extractor flow (`scripts/extract-psalter-headers.js` 신규 path)

```text
for each line i:
  if line[i] matches /^\s*Магтаал\s*$/:
    canticleCount++
    # Stage 1: locate source line (skip up to 3 blank/title lines)
    sourceIdx = scanForSourceLine(i + 1, i + 5)
    if sourceIdx < 0:
      log("[canticle] no source line near L%d — skip", i + 1)
      skipNoSource++; continue
    sourceLine = lines[sourceIdx].trim()
    # Stage 2: NT-canticle skip heuristic
    firstToken = extractFirstBookToken(sourceLine)   // see §6
    if firstToken in NT_BOOKS:
      log("[canticle] NT self-canticle %s — skip", firstToken)
      skipNt++; continue
    # Stage 3: NT preface lookup (≤10 lines after sourceIdx)
    attribIdx = lookupAttribution(sourceIdx + 1, sourceIdx + 11)
    if attribIdx < 0:
      log("[canticle] OT canticle but no NT preface near L%d — skip", sourceIdx + 1)
      skipNoPreface++; continue
    # Stage 4: emit canticle_preface entry
    emitCanticleEntry(sourceLine, attribLine, page=pageOfLine[i],
                       evidenceRange=[sourceIdx + 1, attribIdx + 1])
    okOt++
```

총 4-stage. 기존 `Дуулал` path 와 **상호 배타** (서로 다른 anchor regex) 이므로 한 line 이 양쪽에 매칭될 수 없다.

---

## 4. Schema 옵션 비교 + 권고

### Option A — 동일 파일에 신규 kind 추가 (권고)

`src/data/loth/prayers/commons/psalter-headers.rich.json` 의 `refs` 영역에 `canticle_preface` kind 추가, ref-key 는 `Canticle <Source>`:

```jsonc
"refs": {
  "Canticle Daniel 3:57-88, 56": {
    "entries": [
      {
        "kind": "canticle_preface",
        "source": "Даниел 3:57-88, 56",       // 원문 (mongolian)
        "verseRange": "3:57-88, 56",          // R1.5 패턴 재사용 — 동일 source 의 multi-occurrence 분기용
        "attribution_kind": "nt_typological", // 기존 enum 재사용
        "attribution": "Илчлэл 19:5",
        "preface_text": "Эзэний хамаг бүтээлүүд ээ, ...",
        "page": 56,
        "source_line": 1877,
        "evidence_line_range": [1878, 1880]
      },
      // 동일 source 의 2번째 occurrence (line 10107, page 296)
      { "kind": "canticle_preface", ..., "page": 296, "source_line": 10108 }
    ]
  },
  ...
}
```

장점: 단일 catalog 단일 loader 로 통합, downstream consumer 는 `kind === 'canticle_preface'` 분기만 추가하면 됨. unmatched bucket 도 동일 영역.

### Option B — 별도 파일 `psalter-headers-canticles.rich.json`

장점: 시편 vs canticle 의 schema 가 진화 시 분리 가능.
단점: loader 2개, namespace 충돌 위험, builder 가 동일 PDF source 를 두 번 파싱.

### Option C — `psalm-canticles.rich.json` 신규 도메인 (덮어쓰기 없는 별도 영역)

장점: canticle 이 시편이 아니라는 의미 명확.
단점: rich-overlay 시스템에 새 도메인 추가 → loader / wiring / 테스트 영향 광범.

**권고: Option A**. 이유 :
- entries 가 23개 (작음) → 별도 파일 분리 비용이 이득보다 큼.
- ref-key prefix `"Canticle "` 로 시편 키 (`"Psalm "`) 와 collision 0.
- loader 분기 추가 1줄 → renderer 가 `entry.kind === 'canticle_preface'` 분기로 source line 표시 추가.

---

## 5. ref-key 명명 규칙

- 형식: `Canticle <Latinized-Book> <verse-range>`. 예 :
  - `Canticle Daniel 3:57-88, 56` (Mongolian `Даниел` → English `Daniel`).
  - `Canticle Tobit 13:1-8`.
  - `Canticle Wisdom 9:1-6, 9-11` (Mongolian `Мэргэн ухаан` → `Wisdom`).
  - `Canticle 1Chronicles 29:10-13` (Mongolian `1Шастирын дээд` → `1Chronicles`).
- 매핑 테이블: extractor 안에 `OT_CANTICLE_BOOKS_MN_TO_EN` (12 entries) 상수 — Mongolian 첫 토큰 → 영문 latin 명. 미등록 토큰은 warning log + skip.
- verse-range 표기: source 원문에서 추출 (예: `3:57-88, 56`). 콤마 + 공백 normalize.

이유: 영문화는 시편 catalog (`Psalm 51:3-19`) 와 동일 convention 유지. Mongolian source 본문은 entry 내 `source` 필드에 보존.

---

## 6. NT-canticle skip 휴리스틱 (false-positive 방지의 핵심)

### 6.1 첫 토큰 추출

```js
function extractFirstBookToken(sourceLine) {
  // Match leading "1 Петр" / "Иохан" / "Колоссай" / "Даниел" 등
  // - 숫자-공백-단어 (multi-word: "1 Петр", "1 Самуел")
  // - 단어 (single: "Иохан", "Даниел")
  const m = sourceLine.match(/^\s*((?:\d+\s+)?[А-Я][а-я]+)/u)
  return m ? m[1].trim() : null
}
```

### 6.2 SKIP 판정 입력

NT_BOOKS 는 R3 (확장된) 셋을 그대로 사용하되, canticle 전용으로 한 항목 추가:

```js
const NT_CANTICLE_BOOKS = new Set([
  ...NT_BOOKS,            // R3 적용 후 셋
  'Колоссай',             // Col 1:12-20 — extractor NT_BOOKS 에 없으면 추가
])
```

→ `Колоссай 1:12-20` (line 3934) 가 NT canticle 임을 명시. 만약 R3 가 이미 Колоссай 를 포함했다면 본 추가는 noop.

### 6.3 검증 — PDF 실측 기반 expected counts

| 분류 | 예상 | 비고 |
|------|-----:|------|
| Магтаал hit | 70 | grep 결과 |
| OT canticle (catalog 추가) | 23 | gap audit Cat A |
| NT canticle (skip) | ~25 | Phil 2, Eph 1, 1Pet 2:21-24, Col 1, Rev 시리즈 등 |
| no-source / 미식별 | ~22 | 시즌 재사용 / 이름만 / 정찰 미흡 |

총합 ≈ 70 (정확치는 실행 시 계측). PRD count: catalog 가 73 → **96** (시편 73 + canticle 23). gap audit Section 4 의 "62 → 99 (gap=0)" 와 부합 (시편 부분 73 + canticle 23 + NT-self 미카운트 = 96; gap 3 은 R5 verifier 가 추적).

---

## 7. Edge case 처리 — Stage 1 source-line scanner 세부

```js
function scanForSourceLine(start, end) {
  // 첫 비공백 line 이 source 형식이면 그대로 사용.
  // 만약 첫 비공백 line 이 'title' (book name 미포함, e.g. "Хурганы хурим"),
  // 다음 비공백 line 까지 1회 더 시도.
  let firstNonBlankIdx = -1
  for (let j = start; j < end; j++) {
    if (lines[j].trim().length === 0) continue
    if (firstNonBlankIdx < 0) firstNonBlankIdx = j
    if (looksLikeSource(lines[j])) return j
  }
  return -1   // skip + log
}

function looksLikeSource(line) {
  // book token + 숫자 (chapter or chapter:verse) — 최소 1 chapter 숫자 필수
  return /^\s*(?:\d+\s+)?[А-Я][а-я]+(?:\s+[а-я]+)?\s+\d+/u.test(line.trim())
}
```

- `Хурганы хурим` (book token 없음, 숫자 없음) → looksLikeSource false → 다음 line 으로 이동 → `Илчлэл 19:1-7` 캐치.
- `Тэнгэрбурханы шүүлт` (post-source title) — Stage 1 은 source 발견 후 break 하므로 영향 없음.

---

## 8. Catalog builder 변경 (`scripts/build-psalter-headers-catalog.js`)

기존 builder 는 `extract.refs[psalmRef]` 만 처리. canticle entry 는 별도 namespace 로 emit 되므로 `extract.canticles[refKey]` (또는 동일 `refs` 안에 `"Canticle "` prefix) 를 받아 :

```js
for (const [canticleRef, blocks] of Object.entries(extract.canticles)) {
  refs[canticleRef] = { entries: blocks.map(toEntry) }
  // canticle 은 catalog cross-reference 가 불필요 (psalter-texts.json 키 매핑 없음).
}
```

R1.5 verseRange dispatch 패턴은 canticle 에도 적용 — 동일 source 의 다중 occurrence 가 다른 NT preface 를 가지면 entries 배열 내 별개 entry 로 분리, page 로 구분. 동일 preface 면 dedup.

---

## 9. Loader / renderer 영향

### 9.1 Loader (`src/lib/prayers/rich-overlay.ts`)

신규 함수 `loadCanticleHeaderRich(canticleRefKey)`. 기존 `loadPsalterHeaderRich(ref)` 와 평행 구조 — 단순히 키 prefix 만 다름. 캐싱 / locale 분기 동일.

### 9.2 Renderer (`src/components/psalm-block.tsx`)

- 추가 prop: `canticleHeader?: PsalterHeaderEntry`.
- 렌더 위치: psalm body 위, source line 표시 + preface 본문 + NT typological attribution. CSS 는 기존 `.psalter-header-rich` 재사용 + `.psalter-header-canticle` modifier 추가 (source line 강조용).

### 9.3 Hour resolver (`src/lib/hours/resolvers/psalm.ts`)

canticle 은 시편 ref 와 별개 — `HourSection` 의 `kind: 'canticle'` 이미 존재 (PRD §5.1). resolver 가 canticle ref 를 만들 때 `Canticle <book> <verse>` 형식으로 정규화해 loader 에 전달.

→ 이 부분이 가장 변동폭 큼 — sub-WI 로 별도 분해 (§11 참조).

---

## 10. 검증 / 회귀 — R5 verifier 연계

R5 (`scripts/verify-psalter-headers-coverage.js`) 신설 시:

- input: `psalter-headers.rich.json` keys (시편 + canticle 모두).
- expected: PDF 실측 grep 결과 (시편 73 + canticle 23 + NT-self 0 = 96 ref).
- 분류 보고: missing / extra / kind-mismatch.
- `npm run verify:psalter-headers` 로 CI 통합.

R2 만 단독 검증할 unit test :

- `scripts/extract-psalter-headers.js` 에 `--canticles-only` flag 추가 → 23 OT entries + 0 NT entries 정확히 emit 확인.
- snapshot test (e.g. `tests/extract-canticles.snapshot.json`) 로 회귀 방지.

---

## 11. Sub-WI 분해 (decompose 단계 입력)

| sub-WI | 범위 | 복잡도 | 의존 |
| ------ | ---- | :----: | ---- |
| **R2.1** | extractor `Магтаал` path 추가 + NT skip + OT_CANTICLE_BOOKS_MN_TO_EN 매핑 | LOW (~80 LOC + snapshot test 1) | None |
| **R2.2** | schema doc + builder canticle namespace 처리 | LOW (~30 LOC + JSON schema 주석) | R2.1 |
| **R2.3** | `psalter-headers.rich.json` 재생성 (23 entries 추가) + diff 리뷰 | LOW (script 실행 + manual diff) | R2.1, R2.2 |
| **R2.4** | loader `loadCanticleHeaderRich` + renderer prop + CSS modifier | MEDIUM (UI + 단위 테스트 2) | R2.3 |
| **R2.5** | hour resolver canticle ref 정규화 (Mongolian → `Canticle <En>`) | MEDIUM (resolver + e2e 1 — Sat Vespers Daniel canticle 표시) | R2.4 |
| **R2.6** | PRD §12.1 FR-160-C 행 갱신 + traceability-matrix + traceability-auto 재생성 | LOW (~5 LOC + script) | R2.5 |
| **R2.7** | R5 verifier 신설 + CI gate | MEDIUM (별도 #168 후보, 본 R2 와 직교) | — |

총 6 sub-WI (R2.7 별도 task 후보). 권고 진행 순서: R2.1 → R2.2 → R2.3 → R2.4 ‖ R2.5 (병렬 가능) → R2.6.

---

## 12. 리스크 / 대안

| 리스크 | 영향 | 완화 |
|--------|------|------|
| NT canticle false-positive (가장 큰 위험) | catalog drift, PRD count error | 6장 첫-토큰 NT_BOOKS lookup + snapshot test |
| Edge case 2.3a/b (blank/title 분리) 외 추가 변형 (시즌 특이 layout) | OT canticle 일부 누락 (≤2건 추정) | scanForSourceLine 의 window 4-line + warning log → 누락 시 R5 verifier 로 잡힘 |
| `Колоссай` 가 R3 NT_BOOKS 에 없음 | NT canticle 1건 (line 3933, Col 1:12-20) catalog 오삽입 | §6.2 NT_CANTICLE_BOOKS 에 명시적 union — R3 와 독립 |
| 동일 OT canticle 의 multi-occurrence dedup 정책 | preface 동일 시 중복 entry, 다를 시 page 분기 누락 | R1.5 verseRange dispatch + page 비교 (동일 → dedup, 다름 → 분기) |
| Hour resolver canticle ref 정규화가 기존 hour 데이터와 contract 충돌 | Sat Vespers / Sun Lauds 깨짐 | R2.5 를 별도 PR 로 분리 + e2e Sat Vespers Daniel 검증 필수 |
| catalog 파일 size 증가 (62 → 96 entries) | 로딩 latency 미미 | 측정 불필요 — 100KB 미만 유지 |

대안: R2 를 step-wise (only OT 일부 → 검증 → 확장) 로 분할할 수도 있으나, schema 변경이 동반되므로 23건 일괄 도입이 cost 효율적.

---

## 13. 결론 — Approve 판단 기준 (review-direction step 입력)

본 plan 은 다음 가정에 의존 :

1. NT canticle 전수가 첫 토큰 NT_BOOKS lookup 으로 식별 가능 (실측 ≥6건 확인, ~25건 추정).
2. OT canticle 의 source line 이 Магтаал 후 ≤4 line 내 등장 (실측 23건 중 모두 ≤2 line, edge ≤4 line).
3. Mongolian → English book name 매핑 12 entries 가 충분 (audit table 3.1 의 12 unique book 모두 enum).
4. catalog Option A (단일 파일 + `"Canticle "` prefix) 가 downstream consumer 에 미치는 영향이 Option B/C 보다 작음.

가정 위배 시 R2.1 sub-WI 의 snapshot test 가 즉시 실패 → 가정 1-3 는 자동 검증, 가정 4 는 R2.4 PR 리뷰에서 manual.

→ Direction approval 후 `pair-cli plan save-steps` + `/pair-decompose` 진행 권고.
