# FR-153g — psalter pilot 규격 137 refs 재추출 · 사전 조사 리포트

- 작성: divine-researcher (cowork) · 2026-04-23
- 기준 HEAD: main `4e57978` + 휴리스틱 오염 커밋 `c92abf3`
- 범위: FR-153g 본 구현 착수 전 리스크/우선순위/게이트 사전 조사. 읽기 전용.
- 본 조사는 `docs/stage6-followup.md §2 🔴 FR-153g` 와 `docs/PRD.md §12.1` 의 상위 계획을 분해한다.

---

## 1. Coarse refs 우선순위 표

입력 기준: `scripts/out/psalter-rich-report.md` (FR-153f 산출). `psalter-texts.json` 137 refs 에서 **stanza ≤ 2 AND line ≥ 20** 으로 필터한 56 건 중, 라인 수 내림차순 상위 18 건 + 본 조사에서 가산한 canticle 전수.

### 1.1 Top 18 coarse psalms (stanza≤2 AND line≥20)

라인 수 ≥ 25 를 "심히 coarse" 로 간주하고 line DESC 정렬. pilot Ps 63 은 main 2 → pilot 8 stanza 로 세분화된 실증치가 있음.

| # | ref | stanza | line | 비고 |
|---:|:---|---:|---:|:---|
| 1 | `Psalm 115:1-13` | 2 | 42 | 최우선 — refrain "ЭЗЭНийг магтагтун" 중복 keys 1 건 있음 |
| 2 | `Psalm 5:2-10, 12-13` | 2 | 37 | lauds 상수, pilot 패턴 적용 검증 필수 |
| 3 | `Psalm 29:1-10` | 2 | 35 | refrain 1 키 보유 (line 3) |
| 4 | `Psalm 48:2-12` | 2 | 34 | — |
| 5 | `Psalm 36:6-13` | 2 | 33 | — |
| 6 | `Psalm 32:1-11` | 2 | 33 | — |
| 7 | `Psalm 41:2-14` | 2 | 31 | — |
| 8 | `Psalm 57:2-12` | 2 | 30 | — |
| 9 | `Psalm 27:1-6` | 2 | 29 | ⚠️ 동일 key family (`27:7-14`) c92abf3 에서 오염 복구 이력 |
| 10 | `Psalm 49:1-13` | 2 | 29 | — |
| 11 | `Psalm 46:2-12` | 2 | 28 | refrain 2 키 (line 6) — 세분화 효과 큼 |
| 12 | `Psalm 24:1-10` | 2 | 27 | — |
| 13 | `Psalm 45:2-10` | 2 | 27 | — |
| 14 | `Psalm 45:11-18` | 2 | 27 | — |
| 15 | `Psalm 16:1-6` | 2 | 26 | — |
| 16 | `Psalm 16:7-11` | 2 | 26 | — |
| 17 | `Psalm 20:2-8` | 2 | 25 | — |
| 18 | `Psalm 63:2-9` | 2 | 25 | ✅ pilot 검증 완료 (main 2 → pilot 8) — baseline |

나머지 38 건 (line 20~24 구간) 은 MVP 자동화 후 2차 배치.

### 1.2 Non-Psalm canticles 전수 (33 건)

rich-report.md §"non-Psalm canticles" 항목 전수. 디스패치에서 지정한 **Dan 3 / Tob 13 / Isa 12 / Hab 3 / Ezek 36** 은 다음과 같이 현존 여부 확인:

- ✅ **Daniel 3:57-88, 56** — stanza 15 · line 84 · refrain 44 (main). pilot 에서 15 → 19 (+4 orphan refrain stanza). 🟢 pilot 기검증
- ✅ **Daniel 3:52-57** — stanza 7 · line 30 · refrain 19
- ✅ **Daniel 3:26-27, 29, 34-41** — stanza 11 · line 41 (refrain 0)
- ✅ **Tobit 13:1-8** — stanza 10 · line 47 · refrain 0
- ✅ **Isaiah 12:1-6** — stanza 1 · line 12 (line < 20 이므로 §1.1 criterion 외, canticle 특성상 포함)
- ✅ **Habakkuk 3:2-4, 13a, 15-19** — stanza 3 · line 33
- ❌ **Ezekiel 36** — `psalter-rich-report.md` non-Psalm canticles 목록에 존재하지 않음. 137 refs 전수 재검토해도 Ezekiel 참조 0 건. 🟡 디스패치 범위 검증 필요 — Ezek 36:24-28 은 전례상 vespers 에 쓰이지만 본 `psalter-texts.json` 에는 등록되지 않은 상태

| # | ref | stanza | line | refrain 라인 | 우선 순위 | 비고 |
|---:|:---|---:|---:|---:|:---:|:---|
| C1 | `Daniel 3:57-88, 56` | 15 | 84 | 44 | 🟢 done | pilot 완료 |
| C2 | `Exodus 15:1-4a, 8-13, 17-18` | 11 | 51 | 0 | P1 | line 최대 |
| C3 | `Daniel 3:26-27, 29, 34-41` | 11 | 41 | 0 | P1 | — |
| C4 | `Tobit 13:1-8` | 10 | 47 | 0 | P1 | — |
| C5 | `Isaiah 38:10-14, 17-20` | 9 | 37 | 0 | P1 | — |
| C6 | `1 Samuel 2:1-10` | 8 | 44 | 0 | P1 | — |
| C7 | `Jeremiah 14:17-21` | 7 | 26 | 0 | P1 | — |
| C8 | `Daniel 3:52-57` | 7 | 30 | 19 | P1 | refrain 密 |
| C9 | `Deuteronomy 32:1-12` | 7 | 39 | 0 | P1 | — |
| C10 | `Colossians 1:12-20` | 6 | 36 | 0 | P1 | — |
| C11 | `Wisdom 9:1-6, 9-11` | 6 | 39 | 0 | P1 | — |
| C12 | `Isaiah 40:10-17` | 6 | 32 | 0 | P1 | — |
| C13 | `Isaiah 61:10-62:5` | 6 | 32 | 0 | P1 | — |
| C14 | `Isaiah 45:15-26` | 3 | 45 | 0 | P2 | — |
| C15 | `Isaiah 42:10-16` | 2 | 26 | 0 | P2 | — |
| C16 | `Revelation 19:1-7` | 4 | 24 | 12 | P2 | refrain 3 키 |
| C17 | `Revelation 11:17-18; 12:10b-12a` | 2 | 24 | 0 | P2 | — |
| C18 | `Isaiah 33:13-16` | 4 | 20 | 0 | P2 | — |
| C19 | `Jeremiah 31:10-14` | 3 | 20 | 0 | P2 | — |
| C20 | `Ephesians 1:3-10` | 3 | 23 | 0 | P2 | — |
| C21 | `Judith 16:2-3a, 13-15` | 1 | 21 | 0 | P2 | 단일 stanza → 세분화 필수 |
| C22 | `Sirach 36:1-7, 13-16` | 1 | 20 | 0 | P2 | 단일 stanza |
| C23 | `Isaiah 12:1-6` | 1 | 12 | 0 | P3 | 짧음 — MVP 하단 |
| C24 | `Isaiah 2:2-5` | 2 | 20 | 0 | P2 | — |
| C25 | `Isaiah 26:1-6` | 1 | 25 | 0 | P2 | — |
| C26 | `Habakkuk 3:2-4, 13a, 15-19` | 3 | 33 | 0 | P1 | — |
| C27 | `1 Chronicles 29:10-13` | 1 | 19 | 0 | P3 | — |
| C28 | `Revelation 4:11; 5:9-10, 12` | 2 | 19 | 0 | P3 | — |
| C29 | `Revelation 15:3-4` | 2 | 11 | 0 | P3 | 짧음 |
| C30 | `Philippians 2:6-11` | 1 | 16 | 0 | P3 | 단일 stanza |
| C31~C33 | (rich-report 의 "3건 생략" 구간) | — | — | — | — | 2차 확인 필요 |

**권고 실행 순서**:
1. **MVP (15 건)**: Top 10 coarse psalms + Dan 3 family (3건) + Tob 13 + Exo 15 — pilot 파이프라인 일반화 최초 검증
2. **P1 확장 (20 건)**: 잔여 P1 canticle + refrain 보유 psalm (46/115 등)
3. **P2 확장 (26 건)**: 나머지 line 20~27 구간
4. **F final (76 건)**: line < 20 psalm + single-stanza 엔트리 — 자동화 안정화 후

---

## 2. Pilot 파이프라인 분석

### 2.1 현재 pilot 인프라 (3 refs: Ps 63 / Dan 3 / Ps 149)

#### 2.1.1 입력 스테이지 — `scripts/extract-psalter-pilot.mjs` (320 LOC)

파이프라인:
1. `pdftotext -layout` → 해당 book page ±2 범위를 캐시 파일에 dump
2. `scripts/parsers/pdftotext-column-splitter.mjs` → 2-up landscape PDF 의 left/right column 분리 (병합 휴리스틱 없음 — **의도적 순수성**)
3. 헤더 regex (예: `/^\s*Дуулал\s*63\s*(?::|$)/`) 로 책 페이지 내 시편/찬가 시작 line 탐색
4. 제목(title) 및 epigraph `)` 로 끝나는 라인 skip
5. body lines 를 **blank-line 경계로만** stanza 로 분할 — cross-stanza merge 없음
6. 13 개의 END_MARKERS regex (Gloria Patri `Эцэг, Хүү, Ариун Сүнсэнд` **dative only**, `Шад магтаал`, `Дууллыг төгсгөх залбирал`, `Уншлага`, `Богино уншлага`, `Хариу залбирал`, etc.) 중 하나를 만나면 종료
7. 출력: `src/data/loth/psalter-texts.pilot.json` — stanzas 는 원 PDF indent(leading space) 보존 문자열 배열

#### 2.1.2 Rich 빌드 스테이지 — `scripts/build-psalter-texts-rich.pilot.mjs` (392 LOC)

파이프라인:
1. `psalter-texts.pilot.json` 로드
2. per-ref refrain 검출: trimmed-line 을 `,.!–—-` tail normalise 후 ref 내 중복 ≥ 3 회 인 키를 `role: 'refrain'` 표기
3. `buildStanzasRichFromSource(stanzas, refrains)` — 각 라인의 leading space 개수를 bucket(0 / 1-3 / ≥4 → 0/1/2)
4. **수용 게이트 2단계 (PASS 3/3 달성)**:
   - (a) **텍스트 byte-equal**: `normaliseForGate(source.join)` === `normaliseForGate(rich.flatten)` — whitespace/curly quote/dash 정규화 후 완전 일치 필요
   - (b) **구조 동등성**: stanza 수 일치 + per-stanza line 수 일치 + refrain 라인 수 일치
5. PDF 스타일 실측 (pdfjs-style-overlay) 으로 italic %, rubric(body) % 계측 → **3A vs 3C 결정 근거** (rubric-body 3% < 5% → 3A Source JSON 확정)
6. 출력: `src/data/loth/prayers/commons/psalter-texts.pilot.rich.json` + `scripts/out/psalter-stanzas-rich-pilot.md`

### 2.2 137 refs 일반화 설계

#### 2.2.1 확장 필요 컴포넌트

| 현재 | 일반화 요구 |
|:---|:---|
| `PILOT_REFS` 배열에 3 항목 수동 기재 (ref / bookPage / title / headerRegex) | 137 항목 자동 생성 — `psalter-texts.json` keys + `psalter/week-*.json` 의 page 필드 조인 |
| `BOOK_MAP` 몽골어 책명 21 종 하드코딩 | 그대로 재사용 가능 (legacy `extract-psalm-texts.js` 의 동일 map) |
| `END_MARKERS` 13 종 고정 | 137 refs 전수 스캔으로 신규 end marker 추가 필요 가능성 — 특히 축일 rubric, cross-season 레이블 |
| `PILOT_PAGES` 3 항목 | 137 엔트리 bookPage 매핑 — **`psalter/week-*.json`** 의 `page` 필드가 권위 (이미 NFR-009c verified) |
| pdftotext 범위 `firstPhysical..lastPhysical` 수동 | 137 bookPage 의 physical 자동 매핑 + 페이지 묶음 range optimisation (consecutive bookPages → 단일 pdftotext 호출) |

#### 2.2.2 헤더 regex 자동 생성

pilot 의 3 규칙에서 패턴 추출:
- Psalm N: `/^\s*Дуулал\s*N\s*(?::|$)/`
- Canticle: 책명별 `BOOK_MAP` 몽골어명 + `\s*(chapter)\s*:\s*(verse)` 형태

구현 안:
```js
function headerRegexFor(refKey) {
  const m = refKey.match(/^(\w[\w\s]*?)\s+(\d+):(\d+)/)
  if (!m) throw new Error(`unparsable ref: ${refKey}`)
  const [_, book, chap, verse] = m
  const monForms = BOOK_MAP[book] ?? []
  const alt = monForms.map(escapeRegex).join('|')
  return new RegExp(`^\\s*(?:${alt})\\s*${chap}\\s*:\\s*${verse}\\b`, 'u')
}
```

edge case 주의:
- 복합 ref (`Revelation 11:17-18; 12:10b-12a`) — 첫 청크만 헤더 매치
- `Psalm 3:2-9` 처럼 verse-range only — pilot 패턴은 이미 지원
- `Daniel 3:57-88, 56` — start verse 57 로 매치 (pilot 검증됨)

#### 2.2.3 수용 게이트 실패 처리

pilot 은 fail-fast + 수기 조사. 137 refs 규모에서는:
- per-ref 실패 시 카탈로그 생성 중단 (기존 main builder `build-psalter-texts-rich.mjs` 가 동일 정책: 1건 FAIL → 카탈로그 미생성 + `psalter-rich-failures.md` 기록)
- 실패율 목표: ≤ 10% (14건 이하). 초과 시 휴리스틱 재설계 경보
- 수동 패치 루트: `scripts/out/psalter-extraction-failures.md` 진단 기록 → 수기 JSON 패치 → 재실행

---

## 3. 휴리스틱 오염 재현 패턴 (c92abf3 사례)

### 3.1 c92abf3 가 수정한 6 건 상세

| # | ref | 증상 | PDF 정답 | 복구 stanza/line | 원인 추정 |
|---:|:---|:---|:---|:---|:---|
| 1 | `Psalm 117:1-2` | 본문이 단 1 줄로 축소 | p.163 "Бүх үндэстэн, ЭЗЭНийг магтагтун…" 6 줄 | 1 / 6 | END_MARKER 조기 종료 or mergeAcrossStanzaBoundaries 로 후속 시편에 흡수 |
| 2 | `Psalm 135:13-21` | 본문에 `135:1-12` 내용 전체 중복 복사 | p.385 II 섹션 | 4 / 22 | 섹션 II 경계 인식 실패 → 잘못된 매치 |
| 3 | `Psalm 27:7-14` | 본문에 `27:1-6` 내용 전체 중복 복사 | p.118-119 II 섹션 | 5 / 25 | 동일 패턴 (II 섹션 경계 실패) |
| 4 | `Psalm 139:23-24` | **키 자체 부재** | p.467 | 1 / 5 | 추출 완전 실패 — week-4 WED vespers 에서 참조됨에도 |
| 5 | `Psalm 15:1-5` | **키 자체 부재** | p.87 | 4 / 15 | 동일 — week-1 MON vespers 참조 |
| 6 | `Psalm 113 (week-1 SAT)` | `page` 필드 누락 | 287 | — | `week-*.json` page 결측 (데이터 입력 누락) |

### 3.2 legacy `scripts/extract-psalm-texts.js` 휴리스틱 코드 (535 LOC 중 핵심)

**line 80-93: `mergeColumnWraps`** — 동일 stanza 내 wrap 병합
```js
function mergeColumnWraps(stanza) {
  const out = []
  for (const line of stanza) {
    const first = line.charAt(0)
    const isLowerCyrillic = /^[а-яёөү]/.test(first)
    if (out.length > 0 && isLowerCyrillic) {
      out[out.length - 1] = out[out.length - 1] + ' ' + line
    } else {
      out.push(line)
    }
  }
  return out
}
```
- **조건**: 이전 line 이 있고 현재 line 이 소문자 키릴 시작 → 이전 line 끝에 공백 결합
- **오작동 시나리오**: PDF 가 서사 문장을 의도적으로 짧게 분할한 경우(시편 인용/에피그래프/답가 후렴) 주요 의미 라인을 부모 라인 꼬리에 흡수 → **line 수 축소 + stanza 경계 모호**
- 실제 결과: Ps 149 main(`1/22`) vs pilot(`1/25`) — 3 개 wrap 라인이 이웃에 병합됨 (pilot diff 에서 확인)

**line 100-115: `mergeAcrossStanzaBoundaries`** — stanza 경계 넘는 병합
```js
function mergeAcrossStanzaBoundaries(stanzas) {
  const out = []
  for (const stanza of stanzas) {
    if (stanza.length === 0) continue
    const first = stanza[0].charAt(0)
    const isLowerCyrillic = /^[а-яёөү]/.test(first)
    if (out.length > 0 && isLowerCyrillic) {
      const prev = out[out.length - 1]
      prev[prev.length - 1] = prev[prev.length - 1] + ' ' + stanza[0]
      for (let i = 1; i < stanza.length; i++) prev.push(stanza[i])
    } else {
      out.push(stanza)
    }
  }
  return out
}
```
- **조건**: 직전 stanza 있고 현재 stanza 첫 line 이 소문자 키릴 → 현재 stanza 전체를 이전 stanza 에 병합
- **오작동 시나리오**: PDF 의 의도적 stanza break 가 소문자 연결어로 시작하는 경우(예: `бид`, `харин`, `түүнчлэн`) 전체 stanza 가 이전 stanza 말미에 흡수 → **stanza 수 coarse 화의 직접 원인**
- 실제 결과: Ps 63 main(`2/25`) vs pilot(`8/26`) — 8 개의 PDF blank-line 구분을 전부 무시하고 2 macro-stanza 로 맞붙임

### 3.3 2 차 오염 메커니즘 (3-way diff 에서 발견된 데이터 손상)

Ps 135:13-21 / Ps 27:7-14 의 "인접 섹션 내용 중복 복사" 는 단순 merge 휴리스틱으로는 설명 불가. 추정:

1. `extract-psalm-texts.js` 가 섹션 II 마커(PDF 에서 로마 숫자 `II` 로 표기된 후속 소단락) 인식 실패 → 헤더 regex 가 **첫 번째 매치** 만 보고 종료
2. II 섹션 body 시작 탐색 실패 → 직전 I 섹션 body 로 폴백
3. 결과: I 섹션 내용이 II 섹션 JSON 엔트리에 중복 주입

**FR-153g 재현 차단 조치**:
- pilot 은 `bookPage` 를 인자로 받고 `flat` 스트림에서 해당 bookPage 이후의 첫 헤더 매치 → 섹션 II 는 **pilot 대상 refs 에 명시된 bookPage** 가 II 섹션에 해당하면 정확히 그 매치에서 시작
- pilot 의 title substring matcher 가 추가 보증 (`title` 필드 20 자 prefix 매치)
- 재추출 후 c92abf3 수정본 (Ps 117, 27:7-14, 135:13-21, 139:23-24, 15:1-5) 을 **regression baseline** 으로 고정

### 3.4 오염 검출 자동화 제안

FR-153g 실행 시 포함할 가드:
- **regression 비교**: 재추출 후 c92abf3 fixed 6 건의 **정규화 byte-equal** 검증 (게이트 a 재사용). 통과하지 못하면 즉시 abort
- **duplicate scan**: 인접 ref 간 stanza 지문 교차 비교 — `Psalm N:1-X` 의 본문이 `Psalm N:Y-Z` 에 ≥ 50% 포함되면 의심 마크 (Ps 135 / Ps 27 패턴)
- **missing-key scan**: `week-*.json` 에서 참조되는 모든 ref key 가 `psalter-texts.json` 에 존재하는지 확인 (Ps 139:23-24 / Ps 15:1-5 패턴)

---

## 4. 수용 게이트 재설계

### 4.1 현재 게이트 (FR-153f `buildPsalterStanzasRich`)

- **(a) 텍스트 byte-equal**: `normaliseForGate(source flatten) === normaliseForGate(rich flatten)` — whitespace + curly-quote + dash + NBSP 정규화 후 **완전 일치**
- **(b) 구조 동등성**: stanza 개수 일치 AND per-stanza line 개수 일치 AND refrain 라인 개수 일치

### 4.2 재설계 필요 사유

FR-153g 는 **의도적으로 stanza 경계를 재분할**한다 (pilot Ps 63: 2 → 8, Dan 3: 15 → 19, Ps 149: line 22 → 25). 현재 구조 동등성 게이트는 이 재분할을 실패로 판정하므로 그대로 쓸 수 없다.

다만 (a) 텍스트 byte-equal 은 **유지한다** — pilot 실증에서 Ps 63/Dan 3/Ps 149 모두 `source === pilot` after whitespace norm (char 수 747/1931/741 완전 일치).

### 4.3 새 2 단계 + 2 가드 게이트 (제안)

**게이트 (A) — Normalised text equivalence (유지)**
- 입력: legacy `psalter-texts.json[ref].stanzas` (3-way diff 검증본 = c92abf3 baseline) vs 재추출본
- 검증: `normaliseForGate(legacy.flatten) === normaliseForGate(reextracted.flatten)`
- 실패 조건: 텍스트 드리프트 — 단 1 글자라도 본문이 바뀌면 FAIL
- 동작: per-ref failure 로 카탈로그 미생성 + `scripts/out/psalter-extraction-failures.md` 기록

> ⚠️ **알려진 사각지대 (Gate A blindspot, divine-review M2)**: 본 게이트는 legacy 데이터를 정답으로 가정한다. 하지만 §2 / §3 에서 기술했듯이 legacy 의 추출 경로가 오염 가능성이 있었다 (c92abf3 에서 6 건 발견·복구). 비-c92abf3 오염 ref 가 추가로 존재한다면 (A) 는 **정확한 재추출 결과를 legacy 오염본과 불일치한다는 이유로 REJECT** 한다. Gate (C) 는 알려진 6 건만 whitelist 하므로 이 사각지대는 Gate (D) duplicate scan 의 부분 커버리지에 의존한다. FR-153g R5 MVP 15 건 수동 대조에서 (A) FAIL 발생 시 **먼저 legacy 오염 의심** 으로 분류 후 PDF 3-way 검증을 루틴에 추가하여 원저 vs 재추출 vs legacy 세 방향 비교로 판정. 판정이 "legacy 오염" 이면 (A) 통과 기준을 PDF 원저로 교체하고 legacy 행을 c92abf3-style 복구 커밋에 추가.

**게이트 (B) — Structural refinement bound (신규, (b) 대체)**
- 입력: legacy stanza/line 구조 vs 재추출 구조
- 검증: 다음 invariant 전부 충족
  - `reextracted.stanza_count >= legacy.stanza_count` (stanza 세분화만 허용)
  - `reextracted.line_count ∈ [legacy.line_count, legacy.line_count × 1.15]` (wrap-unwrap 허용 최대 +15%)
  - `reextracted.flatten_chars == legacy.flatten_chars (±2%)` (whitespace 보정만 허용)
- 실패 조건: stanza 감소, line 감소, 문자 수 ±2% 초과 변동
- 동작: per-ref 경고 + `structural_drift` 필드로 리포트. 경고 수 ≥ 5 면 카탈로그 생성 차단 + 수기 조사 요구

**가드 (C) — Contamination regression (신규)**
- 입력: 재추출 결과 + c92abf3 복구 6 refs
- 검증: 다음 6 refs 는 c92abf3 복구 상태(main HEAD 기준) 와 **byte-equal**
  - `Psalm 117:1-2`
  - `Psalm 135:13-21`
  - `Psalm 27:7-14`
  - `Psalm 139:23-24`
  - `Psalm 15:1-5`
  - week-1 SAT vespers `Psalm 113` page=287 필드 (구조 검증)
- 실패 조건: 6 건 중 1 건이라도 (A) gate 실패 → 즉시 전체 프로세스 abort (데이터 손상 의심)
- 동작: 프로세스 종료 code 2 + `psalter-regression-alert.md` 로 stack trace 남김

**가드 (D) — Cross-ref contamination detection (신규)**
- 입력: 재추출 137 refs 전체 payload
- 검증: 인접 ref 간 본문 지문 교차 비교
  - 길이 ≥ 100 자 인 임의의 stanza text 를 fingerprint 로 취급
  - 동일 fingerprint 가 다른 ref 에 ≥ 50% 겹쳐 포함되면 **duplicate suspect** 로 표시
  - Ps 135 family / Ps 27 family 처럼 I/II 섹션 구조는 사전 whitelist (의도적 반복 허용)
- 실패 조건: whitelist 외 duplicate 1 건 이상 감지
- 동작: 경고 리포트만 생성 (blocking 아님). 수기 검토 후 whitelist 추가 or 재추출 재실행 결정

### 4.4 게이트 구현 위치

- (A), (B): `scripts/parsers/rich-builder.mjs` 에 `verifyPsalterReextraction()` 신규 export. `buildPsalterStanzasRich` 의 기존 2 게이트와 병립 (pilot 경로와 구분)
- (C), (D): `scripts/build-psalter-texts-rich.mjs` (137 refs 배치 빌더) 의 전/후처리 단계. main builder 가 fail-fast 정책 보유 (현재 구현) 이므로 그 hook 에 추가
- 실패 리포트: `scripts/out/psalter-extraction-failures.md` (per-ref) + `scripts/out/psalter-regression-alert.md` (가드 C) + `scripts/out/psalter-contamination-suspects.md` (가드 D)

---

## 5. 권고 액션 리스트 (FR-153g 본 구현 착수용)

우선순위순:

1. **R1 — 파이프라인 일반화**: `scripts/extract-psalter-pilot.mjs` 의 PILOT_REFS 하드코딩을 **137-ref auto-generation** 으로 치환. 입력은 `psalter-texts.json` keys × `psalter/week-*.json` pages. `BOOK_MAP` 은 재사용.
2. **R2 — 헤더 regex factory**: §2.2.2 구현 + 3 edge case (복합 ref, range-only, canticle start verse) 유닛 테스트.
3. **R3 — END_MARKERS 전수 재검증**: 137 refs × 각 bookPage 에서 pilot 종료 지점 이후 첫 non-empty line 을 수집 → 현재 13 종 END_MARKERS 가 모두 커버하는지 grep. 미커버 마커는 추가.
4. **R4 — 새 게이트 (A/B/C/D)**: §4.3 을 `rich-builder.mjs` + `build-psalter-texts-rich.mjs` 에 구현. 기존 FR-153f 카탈로그 교체 전 **병렬 dry-run** 으로 validation.
5. **R5 — MVP 15 건 실행**: §1 의 Top 10 coarse psalms + 5 canticle (Dan 3 family 3건 + Tob 13 + Exo 15). 결과 수동 PDF 대조 → 통과 시 R6.
6. **R6 — 나머지 122 refs 자동화 + 카탈로그 교체**: `src/data/loth/prayers/commons/psalter-texts.rich.json` 교체 → e2e 회귀 테스트 (`e2e/prayer-psalm-stanzas-rich.spec.ts`) + 기존 FR-153f 3 스크린샷 재캡처.
7. **R7 — 휴리스틱 폐기 선언**: `scripts/extract-psalm-texts.js` deprecated 마크 (`// @deprecated — 휴리스틱 오염 위험. FR-153g 이후 scripts/extract-psalter-pilot.mjs 사용`). 파일 삭제는 커밋 히스토리 보존 위해 보류.

**예상 공수**: R1~R4 집중 1 일 + R5 수동 대조 1 일 + R6 자동화 + 검증 1~2 일 = **3~4 일** (당초 docs/stage6-followup.md §2 추정 3~5 일 부합).

**리스크 플래그**:
- 🔴 R3 미커버 END_MARKER 가 5 개 이상 나오면 일정 +1 일
- 🔴 (C) 가드 실패 시 즉시 stop — c92abf3 수정본이 신규 로직에 맞지 않음을 의미 → 수동 재검증 필요
- 🟡 Ezek 36 canticle 의 추가 요청 은 본 `psalter-texts.json` 범위 외 — 별도 wi 로 분리 권장

---

**끝.**
