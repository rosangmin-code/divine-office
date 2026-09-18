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
    # Stage 1: locate source line (window = 6 line, M-3 fix)
    #   - 안전 마진 +2 over §2.3 의 4-line edge case
    #   - 다음 Магтаал anchor 발견 시 즉시 break (false-positive 차단)
    sourceIdx = scanForSourceLine(i + 1, min(i + 7, nextMagtaalIdx))
    if sourceIdx < 0:
      log("[canticle] no source line near L%d — skip", i + 1)
      skipNoSource++; continue
    sourceLine = lines[sourceIdx].trim()
    # Stage 2: NT-canticle skip heuristic (longest-prefix-match)
    bookPhrase = extractBookPhrase(sourceLine, KNOWN_CANTICLE_BOOKS)  // §6.1
    if bookPhrase in NT_CANTICLE_BOOKS:                                // §6.2
      log("[canticle] NT self-canticle %s — skip", bookPhrase)
      skipNt++; continue
    # Stage 3: NT preface lookup (≤10 lines after sourceIdx)
    attribIdx = lookupAttribution(sourceIdx + 1, sourceIdx + 11)
    if attribIdx < 0:
      log("[canticle] OT canticle but no NT preface near L%d — skip", sourceIdx + 1)
      skipNoPreface++; continue
    # Stage 4: emit canticle_preface entry
    #   - page = pageOfLine[sourceIdx] (m-4: source line page 가 정답;
    #     Магтаал line 이 page break 를 가로질러 다른 page 일 가능성)
    emitCanticleEntry(sourceLine, attribLine, page=pageOfLine[sourceIdx],
                       evidenceRange=[sourceIdx + 1, attribIdx + 1])
    okOt++
```

총 4-stage. 기존 `Дуулал` path 와 **상호 배타** (서로 다른 anchor regex) 이므로 한 line 이 양쪽에 매칭될 수 없다.

> **Amend (review #168 응답)** — `i + 5` → `i + 7` (window 4→6) + nextMagtaalIdx break guard (M-3). `extractFirstBookToken` → `extractBookPhrase` 로 longest-prefix-match 전환 (C-3). `pageOfLine[i]` → `pageOfLine[sourceIdx]` (m-4).

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
  - `Canticle 1 Chronicles 29:10-13` (Mongolian `1Шастирын дээд` → `1 Chronicles`; m-1: 영문 표준 spacing).
- **매핑 테이블 단위 (C-3 fix)**: extractor 안에 `OT_CANTICLE_BOOKS_MN_TO_EN` 상수 — **키는 full Mongolian phrase** (첫 토큰 단독이 아니라 phrase 전체). lookup 은 `extractBookPhrase` (longest-prefix-match) 가 sourceLine 의 prefix 와 keys 를 대조해 가장 긴 매치를 반환. 미등록 phrase 는 warning log + skip.

  ```js
  const OT_CANTICLE_BOOKS_MN_TO_EN = {
    'Даниел':            'Daniel',
    'Тобит':             'Tobit',
    'Иудит':             'Judith',
    'Иеремиа':           'Jeremiah',
    'Исаиа':             'Isaiah',
    'Хабаккук':          'Habakkuk',
    'Сирак':             'Sirach',
    'Езекиел':           'Ezekiel',
    'Гэтлэл':            'Exodus',
    '1 Самуел':          '1 Samuel',
    'Дэд хууль':         'Deuteronomy',     // 2-word phrase
    'Мэргэн ухаан':      'Wisdom',          // 2-word phrase
    '1Шастирын дээд':    '1 Chronicles',    // numeric-prefix + 2-word (no space)
  }
  ```

  longest-prefix-match 의 이점: §6.1 첫 토큰 lookup 이면 `Дэд` / `Мэргэн` / `1Шастирын` 이 키이므로 phrase suffix (`хууль` / `ухаан` / `дээд`) 정보가 손실. phrase-aware lookup 이면 source 원문 그대로 lookup → 영문 매핑이 phrase 의미 보존 (`Дэд хууль` → `Deuteronomy` 로 정확). audit table 3.1 의 12 unique book 모두 본 13 entries 로 cover (1 Самуел 가 12번째, 1Шастирын 가 13번째 — 첫 column 의 12 vs 13 차이는 동일 attribution 기준 카운트 vs 불완전 phrase 식별 카운트).

- verse-range 표기: source 원문에서 추출 (예: `3:57-88, 56`). 콤마 + 공백 normalize.

이유: 영문화는 시편 catalog (`Psalm 51:3-19`) 와 동일 convention 유지. Mongolian source 본문은 entry 내 `source` 필드에 보존.

---

## 6. NT-canticle skip 휴리스틱 (false-positive 방지의 핵심)

### 6.1 Book-phrase 추출 (longest-prefix-match) — C-1, C-3 fix

```js
// KNOWN_CANTICLE_BOOKS: keys of OT_CANTICLE_BOOKS_MN_TO_EN ∪ NT_CANTICLE_BOOKS
function extractBookPhrase(sourceLine, knownPhrases) {
  // 1. trimmed start
  const trimmed = sourceLine.replace(/^\s+/, '')
  // 2. longest-prefix-match: knownPhrases 를 길이 내림차순으로 정렬한 뒤
  //    첫 매치를 반환. "Дэд хууль" 가 "Дэд" 보다 먼저 비교됨.
  const sorted = [...knownPhrases].sort((a, b) => b.length - a.length)
  for (const phrase of sorted) {
    if (trimmed.startsWith(phrase)) {
      // phrase 다음 character 는 공백 / 숫자 / 콜론 이어야 함 (false-positive 차단)
      const next = trimmed[phrase.length]
      if (!next || /[\s\d:.,;)\]]/u.test(next)) return phrase
    }
  }
  return null
}
```

**Regex 결함 회피 (C-1)**: 기존 `(?:\d+\s+)?[А-Я][а-я]+` 형태의 단일 regex 는 `1Шастирын` (숫자와 키릴이 공백 없이 붙음) 매칭 실패. longest-prefix-match 는 `1Шастирын дээд` 를 phrase 셋의 키로 보유하므로 prefix 비교만으로 매칭 가능 (regex 의 `(?:\d+\s+)?` 같은 separator 가정 불필요).

### 6.2 SKIP 판정 입력 — C-4 fix (NT_BOOKS source-of-truth 통일)

```js
// NT_CANTICLE_BOOKS 는 R3 (#166) 의 NT_BOOKS 와 동일 source 에서 spread.
// 단 R3 NT_BOOKS 의 'Колосси' 는 PDF 0 매치 dead entry — R2 patch 에서
// 'Колоссай' (PDF 12 매치) 로 교체 (또는 둘 다 보유) 한 후 사용.
const NT_CANTICLE_BOOKS = new Set(NT_BOOKS)
```

**R3 SSOT 통일 (C-4 mandatory)**:

- 기존 R3 (#166) `NT_BOOKS` 의 `'Колосси'` 는 PDF 전수 grep 0 매치 — dead entry.
- 실측 `'Колоссай'` 12 매치 (line 475, 480, 486, 2855, 3934, 5730, 8147, 12207, 15679, 16179, 16766, 20566).
- **plan §6.2 가 단독 union 으로 보강하면 R3 NT_BOOKS 의 dead entry 가 그대로 잔존** + plan 의 NT_RE 가 시편 NT preface lookup 에서 `(Колоссай N:M)` 을 silently 놓치는 자매 결함이 patched 되지 않음.
- 따라서 본 R2 plan 은 **NT_BOOKS source-of-truth 단일화** 를 R2.0 sub-WI 로 신설 (§11):
  1. `Колосси` → `Колоссай` 교체 (또는 둘 다 보유, longest-prefix 정책에 따름).
  2. R3 NT_BOOKS 와 R2 NT_CANTICLE_BOOKS 가 한 source (`NT_BOOKS` 단일 export) 에서 spread.
  3. 본 patch 는 R2.1 진입 전 R3 file 에 직접 commit (cross-cutting; sub-WI 의존 그래프 root).

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
function scanForSourceLine(start, end, magtaalAnchorRe) {
  // M-3: 다음 Магтаал anchor 발견 시 break (false-positive 차단).
  // M-2: dead variable firstNonBlankIdx 제거 — looksLikeSource 만으로 충분.
  for (let j = start; j < end; j++) {
    const trimmed = lines[j].trim()
    if (trimmed.length === 0) continue
    if (magtaalAnchorRe.test(trimmed)) return -1   // 다음 canticle anchor — 즉시 종료
    if (looksLikeSource(trimmed)) return j
  }
  return -1   // skip + log
}

function looksLikeSource(line) {
  // C-2 fix: (a) (?:\d+\s*)? — 숫자와 키릴 사이 공백 0+ 허용 (1Шастирын 매칭),
  //         (b) (?:\s+[а-яё]+)* — multi-word lowercase suffix 0+ 단어 허용
  //             (Дэд хууль, Мэргэн ухаан 매칭).
  return /^\s*(?:\d+\s*)?[А-Я][а-я]+(?:\s+[а-яё]+)*\s+\d+/u.test(line.trim())
}
```

- `Хурганы хурим` (book token 없음, 숫자 없음) → looksLikeSource false → 다음 line 으로 이동 → `Илчлэл 19:1-7` 캐치.
- `Тэнгэрбурханы шүүлт` (post-source title) — Stage 1 은 source 발견 후 break 하므로 영향 없음.
- `1Шастирын дээд 29:10-13` (A02, line 2524) → C-2 fix 후 `looksLikeSource` true → `extractBookPhrase` 가 `1Шастирын дээд` longest-prefix match → `1 Chronicles` 영문화 → emit (이전엔 silently 누락).
- `Дэд хууль 32:1-12` (A12, line 9557) / `Мэргэн ухаан 9:1-6, 9-11` (A17, line 13528) → 동일 경로 → emit.

---

## 8. Catalog builder 변경 (`scripts/build-psalter-headers-catalog.js`)

기존 builder 는 `extract.refs[psalmRef]` 만 처리. canticle entry 는 별도 namespace 로 emit 되므로 `extract.canticles[refKey]` (또는 동일 `refs` 안에 `"Canticle "` prefix) 를 받아 :

```js
for (const [canticleRef, blocks] of Object.entries(extract.canticles)) {
  refs[canticleRef] = { entries: blocks.map(toEntry) }
  // canticle 은 catalog cross-reference 가 불필요 (psalter-texts.json 키 매핑 없음).
}
```

**Multi-occurrence dedup 정책 (M-4 fix)**:

- dedup 키: `(attribution, preface_text)` tuple — 두 값 모두 동일 시 dedup, 어느 한쪽이라도 다르면 분리 entry.
- page 만 다른 동일 (attribution + 본문) entry 는 **분리 보존** (downstream 이 page 별로 출처 표시 가능; A01 page 56 + A13 page 296 이 동일 source `Даниел 3:57-88, 56` 동일 attribution `Илчлэл 19:5` 동일 본문 → 두 entry 보존, ref-key 는 1개 — Option A 예시와 일치).
- 즉, dedup 은 **(canticleRef, attribution, preface_text)** triple 기준에서 동일하지만 page 만 다른 경우 → 분리 보존; 어느 한 필드라도 다른 경우 → 분리. **page 가 dedup 키에 포함되지 않음** — Option A 예시의 분리 표기는 의도된 정책.
- R1.5 verseRange dispatch 의 "동일 ref 다중 occurrence per-preface 분기" 패턴 의미를 그대로 재사용 (canticle 의 경우 분기 단위가 page).

---

## 9. Loader / renderer 영향

### 9.1 Loader (`src/lib/prayers/rich-overlay.ts`) — M-1 fix (단일 함수)

기존 `loadPsalterHeaderRich(ref)` 를 **`loadHeaderRich(ref)` 단일 함수로 일반화** — ref string 의 prefix (`"Psalm "` / `"Canticle "`) 자체로 분기. 별도 `loadCanticleHeaderRich` 추가하지 않음. 이유 :

- Option A schema (§4) 가 단일 catalog 단일 file 단일 ref dictionary 이므로 dual loader 는 동일 JSON 을 2번 read / 2번 cache → memory 낭비 + R2.4 sizing 부풀림.
- 단일 함수 + prefix 분기 → 기존 호출처는 함수명만 rename (ref string 은 호출자가 형식 결정).
- R2.4 sizing: MEDIUM → **SMALL** 수렴 (renderer source-line modifier 만 잔존; loader 는 trivial rename).

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

## 11. Sub-WI 분해 (decompose 단계 입력) — review #168 amend

| sub-WI | 범위 | 복잡도 | 의존 |
| ------ | ---- | :----: | ---- |
| **R2.0** | NT_BOOKS source-of-truth 통일 (`Колосси` → `Колоссай`) — R3 file 직접 patch + R2 NT_CANTICLE_BOOKS spread 정합 (C-4 fix) | LOW (~5 LOC + grep 회귀 verify) | None |
| **R2.1** | extractor `Магтаал` path 추가 + NT skip (longest-prefix-match) + OT_CANTICLE_BOOKS_MN_TO_EN 매핑 (full-phrase 키) | LOW (~80 LOC + snapshot test 1 + 진단 로그 manual diff (m-2)) | R2.0 |
| **R2.2** | schema doc + builder canticle namespace 처리 + dedup tuple 정책 (M-4) | LOW (~30 LOC + JSON schema 주석) | R2.1 |
| **R2.3** | `psalter-headers.rich.json` 재생성 (23 entries 추가) + diff 리뷰 + audit table 3.1 1:1 비교 | SMALL-MEDIUM (script 실행 + manual diff + corner case 발견 시 R2.1 round-trip; m-5 sizing 보수화) | R2.1, R2.2 |
| **R2.4** | `loadHeaderRich` 단일화 (M-1) + renderer prop + CSS modifier | SMALL (rename + UI + 단위 테스트 2) | R2.3 |
| **R2.5** | hour resolver canticle ref 정규화 (Mongolian → `Canticle <En>`) + e2e 1 (Sat Vespers Daniel) | MEDIUM (resolver + e2e — R2.4 머지 필수, M-5 직렬 의존) | R2.4 |
| **R2.6** | PRD §12.1 FR-160-C 행 갱신 + traceability-matrix + traceability-auto 재생성 | LOW (~5 LOC + script) | R2.5 |
| **R2.7** | R5 verifier 신설 + CI gate (m-3: numbering pending — 별도 task 후보) | MEDIUM (본 R2 와 직교) | — |

총 7 sub-WI (R2.0 신설, R2.7 별도 task 후보). **권고 진행 순서 (M-5 fix)**: `R2.0 → R2.1 → R2.2 → R2.3 → R2.4 → R2.5 → R2.6` **직렬**. R2.5 가 e2e step (loader + renderer + resolver 통합) 을 포함하므로 R2.4 와 진정한 병렬 불가능 — 직렬 의존 명시.

**대안 (R2.5 split)**: 진행 가속 시 R2.5 를 (5a) resolver 정규화 (R2.4 무관, 병렬 가능) + (5b) e2e (R2.4 의존, 직렬) 로 분리 가능. 본 plan 기본은 단일 R2.5.

---

## 12. 리스크 / 대안

| 리스크 | 영향 | 완화 |
|--------|------|------|
| NT canticle false-positive (가장 큰 위험) | catalog drift, PRD count error | §6.1 longest-prefix-match (book-phrase) + NT_CANTICLE_BOOKS lookup + snapshot test (m-2: 추가로 진단 로그 manual diff 단계 R2.1 에 포함) |
| Edge case 2.3a/b (blank/title 분리) 외 추가 변형 (시즌 특이 layout) | OT canticle 일부 누락 (≤2건 추정) | scanForSourceLine window 6-line (M-3 fix, 안전 마진 +2) + magtaalAnchorRe break guard + warning log → 누락 시 R5 verifier 로 잡힘 |
| `Колоссай` 가 R3 NT_BOOKS 에 없음 (`Колосси` dead entry) | 시편 NT preface lookup 의 자매 결함 + NT canticle 1건 catalog 오삽입 | **R2.0 신설** (C-4): R3 file 직접 patch + R2 NT_CANTICLE_BOOKS 가 단일 source 에서 spread |
| 동일 OT canticle 의 multi-occurrence dedup 정책 | (attribution, preface_text) 동일 시 중복 entry, 다를 시 분기 누락 | M-4: dedup 키 = `(attribution, preface_text)` tuple. page 만 다른 동일 본문은 분리 보존. §8 명시 |
| `1Шастирын` / `Дэд хууль` / `Мэргэн ухаан` 등 multi-word / no-space book name 매칭 실패 | A02 / A12 / A17 silently 누락 | C-1/C-2/C-3 fix: regex `(?:\d+\s*)?` 완화 + `(?:\s+[а-яё]+)*` multi-word + longest-prefix-match phrase lookup |
| Hour resolver canticle ref 정규화가 기존 hour 데이터와 contract 충돌 | Sat Vespers / Sun Lauds 깨짐 | R2.5 직렬 의존 (R2.4 → R2.5, M-5) + e2e Sat Vespers Daniel 검증 필수 |
| Магтаал ↔ source line 사이 page break | A 항목의 page 가 wrong page 표기 | m-4 fix: `page = pageOfLine[sourceIdx]` (source 라인 page 가 정답). audit 23건 모두 동일 page 라 현행 무이슈, 그러나 미래 PDF 변경 대비 |
| catalog 파일 size 증가 (62 → 96 entries) | 로딩 latency 미미 | 측정 불필요 — 100KB 미만 유지 |

대안: R2 를 step-wise (only OT 일부 → 검증 → 확장) 로 분할할 수도 있으나, schema 변경이 동반되므로 23건 일괄 도입이 cost 효율적.

---

## 13. 결론 — Approve 판단 기준 (review-direction step 입력)

본 plan 은 다음 가정에 의존 :

1. NT canticle 전수가 longest-prefix-match `NT_CANTICLE_BOOKS` lookup 으로 식별 가능 (실측 ≥6건 확인, ~25건 추정). **R2.1 snapshot test + 진단 로그 manual diff (m-2) 로 검증** — snapshot expected (`23 OT + 0 NT + 70 hit + ~22 no-source`) 가 ground truth 가정.
2. OT canticle 의 source line 이 Магтаал 후 **≤6 line** 내 등장 (M-3 fix; 실측 23건 모두 ≤2 line, edge ≤4 line. 안전 마진 +2 + magtaalAnchorRe break guard 로 false-positive 차단).
3. Mongolian → English book name 매핑 13 entries (`§5` table) 가 audit table 3.1 의 12 unique book 모두 cover (1Шастирын, Дэд хууль, Мэргэн ухаан 포함). C-3 longest-prefix-match 로 phrase suffix 손실 없음.
4. catalog Option A (단일 파일 + `"Canticle "` prefix) + M-1 단일 loader 통합이 downstream consumer 에 미치는 영향이 Option B/C 보다 작음.
5. R2.0 (NT_BOOKS SSOT 통일) 가 R2.1 진입 전에 완료 — `Колосси` dead entry 가 잔존하면 시편 NT preface lookup 의 자매 결함이 patched 되지 않음.

가정 위배 시 R2.1 sub-WI 의 snapshot test 가 즉시 실패 → 가정 1-3, 5 는 자동 검증, 가정 4 는 R2.4 PR 리뷰에서 manual.

→ Direction approval 후 `pair-cli plan save-steps` + `/pair-decompose` 진행 권고. **R2.0 (NT_BOOKS SSOT) 가 의존 그래프 root 임을 dispatch 시 명시**.

---

## 14. 변경 이력 (review #168 응답)

본 amendment 는 task #170 dispatch — divine-review #168 의 verdict `APPROVED_WITH_ISSUES` 에 대응. 14 issue (4 critical + 5 major + 5 minor) 별 처리 요약 :

| ID | 위치 | severity | 처리 | 본문 반영 |
|----|------|----------|------|-----------|
| **C-1** | §6.1 `extractFirstBookToken` regex `(?:\d+\s+)?` → `(?:\d+\s*)?` | critical | **resolved** — longest-prefix-match 로 전환 (regex 가정 자체 제거). `1Шастирын` (no-space) 매칭 가능 | §6.1 전면 재작성 |
| **C-2** | §7 `looksLikeSource` regex 동일 + multi-word lowercase suffix `(?:\s+[а-яё]+)*` | critical | **resolved** — `(?:\d+\s*)?` 완화 + `(?:\s+[а-яё]+)*` 0+ 단어 허용. `1Шастирын дээд` / `Дэд хууль` / `Мэргэн ухаан` 매칭 | §7 함수 시그니처 + 주석 갱신 |
| **C-3** | §5 매핑 키 단위 (full phrase vs 첫 토큰) 명시 | critical | **resolved** — Option A 채택 (full Mongolian phrase 키 + longest-prefix-match lookup). §5 에 13-entry 매핑 table 명시 + §6.1 lookup 로직과 일치 | §5 + §6.1 |
| **C-4** | §6.2 `Колосси` (R3 NT_BOOKS) PDF 0 매치 dead entry — `Колоссай` 12 매치와 spelling drift | critical | **resolved** — **R2.0 sub-WI 신설** (R3 file 직접 patch + R2 NT_CANTICLE_BOOKS 가 단일 source 에서 spread). NT_BOOKS source-of-truth 통일 | §6.2 + §11 R2.0 + §12 risks |
| **M-1** | §4 vs §9.1 — 단일 catalog 권고 vs dual loader 모순 | major | **resolved** — `loadHeaderRich(ref)` 단일 함수로 통합 (prefix 분기). R2.4 sizing MEDIUM → SMALL 수렴 | §9.1 |
| **M-2** | §7 `firstNonBlankIdx` dead variable | major | **resolved** — 변수 삭제. magtaalAnchorRe break guard 가 의도 표현 | §7 |
| **M-3** | §3 stage 1 `i + 5` 4-line window 안전 마진 0 | critical-mandatory | **resolved** — window 4 → 6 (`i + 7`) + `magtaalAnchorRe` break guard 추가 (다음 anchor 발견 시 즉시 종료, false-positive 차단) | §3 + §7 + §12 + §13 |
| **M-4** | §8 multi-occurrence dedup 기준 (preface 본문 vs attribution) 모호 | major | **resolved** — dedup 키 = `(attribution, preface_text)` tuple 명시. page 만 다른 동일 본문은 분리 보존 (Option A 예시와 정합) | §8 |
| **M-5** | §11 R2.4 ‖ R2.5 병렬 — e2e dependency 로 직렬 의존 | major | **resolved** — 진행 순서를 R2.0 → R2.1 → ... → R2.5 → R2.6 직렬로 정정. R2.5 split 옵션 (5a resolver + 5b e2e) 대안으로 명시 | §11 |
| **m-1** | §5 `Canticle 1Chronicles` spacing inconsistency | minor | **resolved** — `Canticle 1 Chronicles 29:10-13` 으로 변경 (영문 표준 표기) | §5 |
| **m-2** | §13 가정 1 snapshot test 자동 검증 약점 | minor | **resolved** — R2.1 sub-WI 에 진단 로그 manual diff 단계 추가 (snapshot 의 expected 와 일치 검증) | §11 R2.1 + §13 가정 1 |
| **m-3** | §11 R2.7 "별도 #168 후보" — dispatch numbering 충돌 (#168 은 review task) | nit | **resolved** — "numbering pending — 별도 task 후보" 로 수정 | §11 R2.7 |
| **m-4** | §3 `page = pageOfLine[i]` (Магтаал line) — page break 시 wrong page | nit | **resolved** — `page = pageOfLine[sourceIdx]` (source line page 가 정답). audit 23건 모두 동일 page 라 현행 무이슈, 미래 PDF 변경 대비 | §3 + §12 |
| **m-5** | §11 R2.3 sizing LOW 낙관 | nit | **resolved** — SMALL-MEDIUM 으로 보수화. corner case 발견 시 R2.1 round-trip 비용 명시 | §11 R2.3 |

**Deferred / not-applied**: 없음 (14/14 모두 resolved).

**증거 보강 (PDF 실측)**:

- `Колосси` PDF 0 매치, `Колоссай` 12 매치 (line 475, 480, 486, 2855, 3934, 5730, 8147, 12207, 15679, 16179, 16766, 20566) — C-4 정당화.
- `1Шастирын дээд 29:10-13` line 2524, `Дэд хууль 32:1-12` line 9557, `Мэргэн ухаан 9:1-6, 9-11` line 13528 — C-1/C-2/C-3 정당화 (review #168 §2 와 일치).

amend 후 plan 의 design 자체는 review verdict 의 5 디멘션 (NT skip / schema / R1.5 / window / sub-WI) 모두 PASS — R2.0~R2.6 implementation 진입 권고.
