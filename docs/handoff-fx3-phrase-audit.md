# F-X3 — 시편/찬가/기도문 phrase-unit 적용 누락 전수조사

> **TL;DR** — phrase-rich (FR-161 R-13 hanging indent + viewport-wrap) 패턴은 시편 본문에 96/125 entries (77%) 적용되어 있으나, **찬가 122개 hymn 0% / 시즌 전구 ~62 file × 4 stanza = ~248 stanza 0% / 복음찬가 (Benedictus·Magnificat·Nunc Dimittis) verses[] schema 미지원 / Compline antiphon 시즌 default 단문 schema 미지원**. 사용자 visible 영역에서 phrase-rich 적용 stanza는 215 / 추정 1,185 stanza-equivalent = **18%**. 누락의 압도적 다수는 (a) `prayers/hymns/N.rich.json` 122파일 (b) `prayers/seasonal/{advent,christmas,easter,lent}/*.rich.json` 의 intercessionsRich. 권장 fix 경로: 찬가→시즌전구→시편 잔여 29 entries→복음찬가 (별도 spike). renderer 측 변경은 (대부분의) `kind: stanza` 영역에 대해선 이미 land된 `psalm-block.tsx` / `rich-content.tsx` 의 phrase 분기를 그대로 활용 (data-only fix). 복음찬가 verses[] schema 만 renderer 변경 필요.

@fr FR-161-R-19 (task #228, F-X3 audit)
base: 2af2b58 Merge 218-divine-researcher (WI: 218)

---

## 1. 측정 방법

### Scope (read-only audit)
- worktree `228-divine-researcher` (base `2af2b58`)
- 전수 sweep 대상: `src/data/loth/prayers/{commons,hymns,seasonal}/`, `src/data/loth/{ordinarium,propers,sanctoral}/`
- PDF reference: `parsed_data/full_pdf.txt` (main repo cp 우회 불필요 — 절대경로 직접 read)
- renderer 분기 확인: `src/components/{psalm-block.tsx, marian-antiphon-section.tsx, prayer-sections/{rich-content,gospel-canticle-section}.tsx}`

### 측정식
- "phrase-rich 적용 stanza" = `kind:'stanza'` block 중 `phrases?: PhraseGroup[]` 배열이 비어있지 않은 것
- "Marian-style hanging indent 적용" = ad-hoc `lines: string[]` field 보유 (FR-X1c #225 패턴)
- jq sweep으로 entry/file 단위 카운트 + sample 검증

---

## 2. 영역별 phrase-rich 적용 매트릭스

### 2.1 시편 본문 (psalter-texts.rich.json)

| 메트릭 | 값 |
|--------|----|
| 총 entries | 125 (시편 + OT/NT canticles 본문) |
| stanza 보유 entry | 125 (100%) |
| **phrase-rich 적용 entry** | **96 (76.8%)** |
| stanza-only-no-phrase entry | **29 (23.2%)** |
| 총 stanza | 372 |
| phrase-rich stanza | 215 (57.8%) |
| legacy stanza (no phrases) | 157 (42.2%) |

**누락 29 entries** (= FR-161 R-14 NOVEL_EDGE cohort):
```
1 Samuel 2:1-10                Daniel 3:26-27, 29, 34-41
Daniel 3:57-88, 56             Ephesians 1:3-10
Exodus 15:1-4a, 8-13, 17-18    Isaiah 33:13-16
Isaiah 38:10-14, 17-20         Isaiah 61:10-62:5
Jeremiah 14:17-21              Jeremiah 31:10-14
Psalm 16:1-6                   Psalm 21:2-8, 14
Psalm 30:2-13                  Psalm 31:1-17
Psalm 42:2-6                   Psalm 51:3-19
Psalm 65:2-9                   Psalm 81:2-11
Psalm 88:2-10                  Psalm 96:1-13
Psalm 118:1-16                 Psalm 119:105-112
Psalm 135:1-12                 Psalm 137:1-6
Psalm 141:1-9                  Psalm 142:1-7
Psalm 144:1-10                 Psalm 144:11-15
Wisdom 9:1-6, 9-11
```
- **이미 분류 완료**: `docs/fr-161-r14-pdf-indent-inconsistency.md` (#191) 가 위 29 refs 를 Cat A-G 로 분류했고 R-14a (#200) 가 Cat A+C+D+E ~10 refs 의 rich.json data-quality 를 land 했지만 그 후 R-2 builder (`scripts/build-phrases-into-rich.mjs`) 재주입은 안 된 것으로 추정됨 — 그래서 phrase 배열이 여전히 0인 entries 가 다수.
- **권장 후속 액션**: R-14a-rebuild — `scripts/build-phrases-into-rich.mjs` 재실행 + verifier (`scripts/verify-phrase-coverage.js`) 로 coverage 재측정. Cat B (translation drift) / Cat F (extractor wrap-inference) / Cat G (page-mapping) 잔여는 별도 track.

### 2.2 찬가 (prayers/hymns/N.rich.json × 122 files) — **0% 적용**

| 메트릭 | 값 |
|--------|----|
| 총 hymn 파일 | 122 |
| stanza 보유 hymn | 122 (100%) — 모두 stanza+divider 구조 |
| **phrase-rich 적용 hymn** | **0 (0.0%)** |
| 총 stanza | 565 |
| 총 stanza-line (각 stanza 내 lines 합) | 2,425 |
| **phrase 누락 stanza** | **565 (100%)** |

**현재 상태 sample (hymn 76 / page 933)**:
```json
{ "hymnRich": { "blocks": [
  { "kind": "stanza", "lines": [
    { "spans": [{"kind":"text", "text":"Дахилт: Надад байгаа нандин бүхнээ"}], "indent": 0 },
    { "spans": [{"kind":"text", "text":"Эзэн Тандаа өргөе"}], "indent": 0 },
    { "spans": [{"kind":"text", "text":"Тэнгэрт байгаа бидний Бурхан Их Эзэн Та"}], "indent": 0 },
    { "spans": [{"kind":"text", "text":"ерөөлтэй"}], "indent": 0 },
    ...
  ]}
]}}
```

**PDF (page 933) 실제 layout**:
```
Дахилт: Надад байгаа нандин бүхнээ      ← logical phrase 1 (PDF wrap line 1)
Эзэн Тандаа өргөе                       ← logical phrase 1 (PDF wrap line 2 — 같은 phrase의 wrap continuation)
Тэнгэрт байгаа бидний Бурхан Их Эзэн Та ← logical phrase 2 (line 1)
ерөөлтэй                                ← logical phrase 2 (line 2 — wrap continuation, single word)
...
```
→ 현재 hard-break (각 PDF line = 별도 stanza-line) 으로 표현되어, viewport 변화 시 phrase 단위 wrap 안 됨 + hanging indent 없음. **사용자 원성 1순위**.

**렌더러 호환**: `src/components/hymn-section.tsx` 는 이미 `<RichContent content={section.textRich!} />` 로 위임하고, `rich-content.tsx` 의 stanza 분기 (line 333-358) 는 `block.phrases?.length > 0` 일 때 phrase + hanging indent 자동 적용 → **renderer 변경 0**, **데이터 주입만 필요**.

### 2.3 시즌 전구 (prayers/seasonal/{advent,christmas,easter,lent}/*.rich.json)

| 시즌 | 파일 수 | stanza 수 | phrase 적용 stanza |
|------|---------|-----------|---------------------|
| advent | 15 | 63 | 0 |
| christmas | 15 | 22 | 0 |
| easter | 21 | 76 | 0 |
| lent | 22 | 87 | 0 |
| ordinary-time | 68 | **0** | 0 |
| **소계** | **141 files** | **248 stanza** | **0 (0%)** |

- ordinary-time 68 파일은 모두 **concludingPrayerRich 1개씩만** 보유 (intercession 등 부재) — stanza-bearing 영역 아님.
- 그 외 시즌의 stanza 는 **모두 `intercessionsRich.blocks`** 안에 위치. 즉 시즌 전구의 V/R 호응 형식이 `kind: stanza` + `lines:[indent:0/1]` 로 들어가 있고, phrases 미적용.
- 사용자가 매일 보는 영역. PDF page 557 sample (advent w1 MON) 확인 결과 본문이 여러 wrap line 으로 흐르므로 phrase 단위 묶음 의미 있음.

**렌더러 호환**: `intercessions-section.tsx` 도 `<RichContent content={section.rich} />` 위임. 동일하게 데이터 주입만 필요.

### 2.4 복음찬가 (Gospel canticle: ordinarium/canticles.json)

| canticle | verses 수 | schema |
|----------|-----------|--------|
| benedictus (Захариагийн магтаал) | 19 | `verses: string[]` |
| magnificat (Мариагийн магтаал) | 12 | `verses: string[]` |
| nuncDimittis (Сайнмэдээний айлдлын магтаал) | (3-4) | `verses: string[]` |

- Schema 가 `kind:'stanza'` 가 아닌 **legacy `verses: string[]`** — phrase-rich 패턴 적용 불가능.
- Renderer (`src/components/prayer-sections/gospel-canticle-section.tsx` line 182-184): `section.verses.map((verse, vi) => ...)` 단순 hard-break.
- PDF (Benedictus page 34-35) 확인 결과 logical phrase 가 wrap continuation 으로 표시됨. 사용자가 매일 두번 (Lauds Benedictus, Vespers Magnificat, Compline Nunc Dimittis) 보는 영역.

**권장 fix**: spike 작업 — schema 격상 (legacy `verses: string[]` → `kind:'stanza'+phrases` 또는 별도 `versesRich: PrayerText` 추가) + renderer 분기 추가. PDF 의 wrap 패턴 추출은 시편 builder 와 동일 로직 재사용 가능.

### 2.5 Compline antiphon — schema 분리

| 항목 | 적용 상태 |
|------|----------|
| psalter antiphons (`compline.json` 의 day별 antiphon_key + default_antiphon) | `default_antiphon: string` (단문) — phrase 의미 없음 |
| Marian antiphons (`compline.json.anteMarian.{salveRegina, alternatives[]}`) | **`lines: string[]` 적용됨 (#225 land)** |
| Compline gospel canticle antiphon (Nunc) | rich overlay (gospelCanticleAntiphonRich) — 단문 para → phrase 의미 적음 |
| Compline shortReading / responsory / blessing | rich overlay 다수 단문 — phrase 의미 적음 |

→ Compline 영역 자체는 #225 (Marian) 에서 사용자 가시 phrase 누락이 land 되어 있어 **추가 누락 미미**.

### 2.6 propers / sanctoral (`propers/*.json`, `sanctoral/*.json`)

- 전부 plain string 필드만. rich overlay 없음 (rich data 는 `prayers/seasonal/` 에 별도 분리되어 있음).
- 단순 antiphon / V/R / 단문 본문 — phrase 분해 의미 없는 영역.

### 2.7 commons (compline 외)

- `prayers/commons/compline/{DAY}.rich.json` × 7 — 모두 `kind:'para'` (responsory + shortReading + Nunc antiphon). stanza 없음 → phrase 적용 무관.
- `psalter-headers.rich.json` — header 메타 (시편 도입 rubric, doxology 등). stanza 일부 있을 수 있으나 본 audit 에서는 별도 측정 안 함 (priority 낮음).

---

## 3. 종합 매트릭스

| 영역 | 파일/엔트리 | stanza | phrase 적용 | 미적용 | 미적용율 | 우선도 |
|------|-------------|--------|-------------|--------|----------|--------|
| **시편 본문** (psalter-texts.rich.json) | 125 entries | 372 | 215 | 157 | 42% | P2 |
| **찬가** (hymns/N.rich.json) | 122 files | 565 | 0 | 565 | **100%** | **P1** |
| **시즌 전구** (intercessionsRich, 4 시즌) | 73 files (= 141 - 68 ordinary) | 248 | 0 | 248 | **100%** | **P1** |
| **복음찬가** (canticles.json verses[]) | 3 entries | n/a (verses[]) | 0 | n/a | n/a (schema↑) | P3 (spike) |
| Compline antiphons (Marian) | 4 antiphons | n/a (lines[]) | 4 (lines) | 0 | 0% (#225 land) | done |
| 그 외 (propers/sanctoral plain, commons compline para, ordinary concluding) | n/a | 0 | 0 | 0 | n/a | OOS |
| **총계 (stanza-supporting 영역)** | — | **1,185** | **219** | **970** | **82%** | — |

→ 사용자 visible 영역에서 stanza 단위 phrase-rich 적용은 약 **18% (= 219/1,185)**.

---

## 4. 권장 fix 경로

### P1-A — 찬가 phrase 주입 (최우선, 사용자 visible 매일)

- **대상**: `prayers/hymns/N.rich.json` × 122 files
- **방법 후보**:
  - (a1) **PDF column-width-aware builder 신설** — 찬가 PDF 영역(page ~870-1100) 의 column width 측정 → 같은 logical sentence 가 wrap 으로 분할된 PDF line 들을 phrase 로 묶음. 시편 builder (`scripts/build-phrases-into-rich.mjs`) 와 input/output 모양 동일하나, PDF column 좌표가 시편과 다르므로 별도 prep 필요.
  - (a2) **rich.json `lines[]` 단순 join + sentence boundary 추출** — 현재 hymn rich.json 의 각 stanza-line 이 PDF wrap 단위라는 가정 하에, `.[?!]` 또는 `Дахилт:` keyword 로 phrase boundary 만 detect. PDF 재파싱 없이 진행 가능. 정확도는 낮으나 빠른 pilot 가능.
  - (a3) **수동 phrase boundary 주입** — author 가 hymn 별 phrase 를 hand-spec. 122 hymn × 평균 20 line 작업량 → 노동량 큼.
- **Phase 추천**: pilot (5 hymn, a1 또는 a2) → 검증 → sweep batch (week-1 hymn 30개) → phrase coverage 보고 → 나머지 92개 batch.

### P1-B — 시즌 전구 phrase 주입 (사용자 visible 매일, P1-A 와 병렬)

- **대상**: `prayers/seasonal/{advent,christmas,easter,lent}/*.rich.json` × 73 files (= 248 stanza)
- **특이성**: 전구는 V/R 패턴 — `lines[0].indent=0` (인도), `lines[1].indent=1, spans[rubric "- "]` (응답). 즉 stanza 내부에 indent 0/1 mix. phrase 단위 묶음 의미 = `lineRange:[0,1]` 한 phrase, indent=0, role=N/A.
- **방법**: stanza 별로 `phrases:[{ "lineRange":[0,1], "indent":0 }]` 1개 phrase 자동 주입 (모든 stanza 가 indent 0/1 한 쌍 구조). 자동 builder 1회 실행.
- **사용자 효과**: 좁은 viewport 에서 줄바꿈+wrap continuation hanging indent 적용. 첫 phrase 의 wrap line 들이 응답 라인과 시각적으로 구분됨.

### P2 — 시편 본문 잔여 29 entries (R-14 cohort)

- **상태**: docs/fr-161-r14-pdf-indent-inconsistency.md 에 분류 land. R-14a (#200) 일부 fix.
- **추가 액션**: R-2 builder 재실행으로 R-14a 후 phrase 재주입 시도. 잔여 Cat F (Psalm 108 wrap-inference) 는 R-12.5 spike (별 work item) 후 처리. Cat B (translation drift) 는 별 track.

### P3 — 복음찬가 schema 격상 spike (사용자 visible 매일 두 번)

- **대상**: `ordinarium/canticles.json` 의 benedictus / magnificat / nuncDimittis
- **변경량**: schema (legacy `verses: string[]` → `versesRich: PrayerText` overlay 또는 stanza 격상) + renderer (`gospel-canticle-section.tsx`) 의 verses 분기 + (선택) PDF builder 재사용.
- **순서**: spike → schema 결정 → pilot (Benedictus 단일) → 나머지 2개 sweep.

### Out-of-scope

- propers / sanctoral plain string — phrase 의미 없음.
- ordinary-time 68 file — concludingPrayer 단문, phrase 의미 적음.
- compline.json default_antiphon 단문 → phrase 의미 없음.
- Marian (#225) — already done.

---

## 5. Phase batch 계획 (추천)

| Phase | scope | 예상 fix work | leader dispatch 후보 |
|-------|-------|---------------|----------------------|
| **F-X3-A pilot** | Hymn 5개 (page 870-900 첫 5 hymns) phrase 주입 | builder spike + 수동 verify | dev (write 권한) + divine-tester (verify) |
| **F-X3-B sweep-hymn-w1** | Hymn ~30개 batch | builder run + verify | dev |
| **F-X3-C intercession** | seasonal 73 files / 248 stanza phrase 주입 | 단순 phrase array 자동 주입 | dev |
| **F-X3-D sweep-hymn-rest** | 나머지 92 hymn | builder sweep + verify | dev |
| **F-X3-E rebuild-r14a** | 시편 29 entries R-2 builder 재실행 | builder run + R-14a rich.json 잔여 patch | dev |
| **F-X3-F gospel-canticle-spike** | benedictus schema 격상 + renderer | spike + schema decision + pilot | planer (design) → dev (impl) |

---

## 6. 추가 검증 결과

### 6.1 renderer 측 phrase 분기는 이미 land됨

- `src/components/psalm-block.tsx` (line 54): `if (block.phrases && block.phrases.length > 0)` → hanging indent + phrase wrap 처리. (FR-161 R-13)
- `src/components/prayer-sections/rich-content.tsx` (line 343): 동일한 phrase 분기 — **모든 RichContent-hosted rich field** (hymnRich, intercessionsRich, responsoryRich, shortReadingRich, concludingPrayerRich, alternativeConcludingPrayerRich, gospelCanticleAntiphonRich) 가 자동 혜택. (FR-161 R-4)
- `src/components/marian-antiphon-section.tsx` (line 76, 99): `lines: string[]` + `pl-6 -indent-6` hanging indent. (#225)
- `src/components/prayer-sections/gospel-canticle-section.tsx` (line 182-184): **verses[] 단순 map — phrase 분기 없음**. → P3 spike 필요.

→ 따라서 **P1-A (찬가) / P1-B (전구) / P2 (시편 잔여) 는 데이터 주입만 필요**, renderer 변경 0. P3 (복음찬가) 만 renderer 변경 필요.

### 6.2 PDF 측 wrap 패턴 (sample 확인 완료)

- 시편: col 4 base / col 7 wrap (R-14 audit 에서 확정)
- 찬가 (page 933 hymn 76): 단일 column 폭이 좁아 logical phrase 가 2 PDF line 으로 frequently wrap. wrap continuation 의 시각 indent 는 시편보다 미묘 (column 자체가 narrow).
- 전구 (page 557 advent w1 MON): wrap continuation 은 indent +1 정도로 표현.
- 복음찬가 (page 34 benedictus): logical phrase 단위 hard-break 다수 (PDF 가 이미 phrase 단위 줄바꿈) — verses[] 가 PDF line 1:1 인 경우 phrase 묶음 1:1 가능.

---

## 7. constraints + caveats

- read-only audit. 데이터/코드/테스트/docs file 0 변경 (Write 권한 없음, leader 가 main repo 에 직접 commit).
- 카운트는 jq sweep 기반 정확값. PDF 측 sample 검증은 hymn 76 / advent w1 MON intercession / Benedictus 3 case 만 깊이 확인 — 나머지는 패턴 적용 가정.
- P1-A 찬가 fix 경로 (a1 vs a2) 결정은 dev 와 builder spike 후 결정 권장.
- R-14a 후 phrase 재주입 누락 가설은 추정 — git log 확인으로 검증 가능 (R-14a 완료 후 `scripts/build-phrases-into-rich.mjs` 실행 여부).

---

## 8. references (audit evidence 수집 위치)

- `src/data/loth/prayers/commons/psalter-texts.rich.json` (1.4MB, 125 entries)
- `src/data/loth/prayers/hymns/*.rich.json` (122 files)
- `src/data/loth/prayers/seasonal/{advent,christmas,easter,lent,ordinary-time}/*.rich.json` (141 files)
- `src/data/loth/ordinarium/canticles.json` (3 gospel canticles)
- `src/data/loth/ordinarium/compline.json` (anteMarian + day antiphons)
- `src/lib/types.ts` (PrayerBlock kind:'stanza' + PhraseGroup schema, lines 84-122)
- `src/components/psalm-block.tsx` (phrase-render branch FR-161 R-4/R-13)
- `src/components/prayer-sections/rich-content.tsx` (phrase-render branch line 333-358)
- `src/components/prayer-sections/gospel-canticle-section.tsx` (verses[] legacy render)
- `src/components/marian-antiphon-section.tsx` (lines[] hanging indent #225)
- `parsed_data/full_pdf.txt` (PDF reference, main repo absolute path)
- `docs/fr-161-r14-pdf-indent-inconsistency.md` (#191 — 29 NOVEL_EDGE refs cohort 분류)
- `docs/fr-161-phrase-unit-pivot-plan.md` (FR-161 architectural pivot)
- `docs/review-227-225-marian-phrase-unit.md` (#225 Marian land review)
- task #200 (R-14a Cat A+C+D+E land), #201 (R-14c Cat G land)
