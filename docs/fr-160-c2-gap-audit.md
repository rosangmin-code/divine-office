# FR-160-C-2 — psalter-headers preface gap audit

> **TL;DR** — Leader 의 "18 누락" 가설을 정정한다. PDF 실측 누락은 **35건**이며, 원인은 leader 가 추정한 *canticle + lookahead-out* 이 아니라 extractor 의 **3가지 독립적 결함**이다 (Cat A canticle scope-out 23건, Cat B `Дуулал N:m-n` verse-range anchor bug 10건, Cat C NT_BOOKS missing 2건). 보강 R1 (anchor 완화) + R3 (NT_BOOKS 확장) 만으로 +12, R2 (canticle scope, schema 변경) 까지 적용 시 +35 회수가 가능하다. R4 (lookahead window) 는 변경 불필요 — 0건. R5 coverage verifier 신설 권고.

타입: debug — 가설 검증 + 결함 분류 + 보강 plan

@fr FR-160-C2 (referenced WI: #164 진단 / #165 본 문서 / #166 R1+R3 patch / #167 R2 plan)

---

## 1. 개요 — "18-gap" 가설을 "gap" 으로 일반화

| 항목 | Leader 가설 (#164 dispatch) | 실측 (divine-researcher #164 산출) |
|------|----------------------------|--------------------------------------|
| target_total | 80 | 99 (PDF 전수 grep) |
| caught_by_extractor | 62 (canonical) | 64 (62 canonical + 4 unmatched key) |
| missed | **18** | **35** |
| 추정 원인 | canticles + lookahead-out (15 line 초과) | 별도의 3 결함 (Cat A/B/C, 아래) |
| lookahead-out (>10 line) | (포함 추정) | **0건** (가설 반증) |

**변경 사항**: `docs/fr-160-c2-18-gap-audit.md` (가설성 파일명) 대신 `docs/fr-160-c2-gap-audit.md` 로 일반화. 향후 추가 발견 시에도 파일명 보존.

자료 위치 :
- 추출 로직: `scripts/extract-psalter-headers.js` (`Дуулал N` anchor + 15-line lookahead)
- 현행 catalog: `src/data/loth/prayers/commons/psalter-headers.rich.json` (62 entries / 52 keys; #164 시점에 4 key unmatched)
- PDF 본문: `parsed_data/full_pdf.txt` (32,761 lines)
- PRD: `docs/PRD.md` FR-160-C 행

---

## 2. Breakdown — 35건 분류

| 카테고리 | 결함 | 누락 수 | 보강 |
|---------|------|--------|------|
| **A** | `Магтаал` canticle 헤더가 `^Дуулал N$` scope 외이므로 진입조차 불가 | 23 | R2 (신규 코드 path + schema 변경) |
| **B** | `Дуулал N:m-n` verse-range suffix 가 `^\s*Дуулал\s+(\d+)\s*$` anchor 와 mismatch — 매칭 실패 | 10 | R1 (anchor 완화) |
| **C** | Дуулал scope 통과했으나 NT preface book name (`1 Петр` / `2 Петр`) 이 `NT_BOOKS` 목록에 없어 lookup 실패 (standalone — Cat A/B 와 중복 안 됨) | 2 | R3 (NT_BOOKS 확장) |
| **합계** | — | **35** | R1+R3 LOW (~+12), R2 MEDIUM (+23) |

추가 발견: Cat B의 line 14790 (P135:1-12) 는 anchor bug + `1 Петр` NT_BOOKS missing 의 **이중 결함** — R1 만으로는 회수 불가, R3 까지 적용해야 catch.

---

## 3. 누락 entries 표

### 3.1 Category A — Магтаал canticle scope-out (23건)

| # | line | page | Магтаал line | canticle source | NT preface | 본문 첫 단어 |
|---|------|------|--------------|------------------|------------|--------------|
| A01 | 1880 | 56  | 1876 | Даниел 3:57-88, 56 | Илчлэл 19:5 | Эзэний бүх боолууд аа... |
| A02 | 2528 | 79  | 2523 | 1 Шастирын дээд 29:10-13 | Ефес 1:3 | Бидний Эзэн Есүс Христийн Эцэг... |
| A03 | 3044 | 94  | 3037 | Тобит 13:1-8 | 1 Петр 1:3 | Эзэн Есүс Христийн маань Тэнгэрбурхан... |
| A04 | 3638 | 111 | 3634 | Иудит 16:2-3а, 13-15 | Илчлэл 5:9 | Тэд шинэ дуу дуулж байсан |
| A05 | 4190 | 124 | 4185 | Иеремиа 31:10-14 | Иохан 11:51, 52 | Тэнгэрбурханы тарсан хүүхдүүдийг... |
| A06 | 5999 | 179 | 5995 | Даниел 3:52-57 | Ром 1:25 | Тэнгэрбурхан бол үүрд магтагдах Бүтээгч мөн |
| A07 | 6653 | 198 | 6649 | Сирак 36:1-5, 10-13 | Иохан 17:3 | Цорын ганц үнэн Тэнгэрбурхан... |
| A08 | 7176 | 213 | 7169 | Исаиа 38:10-14, 17-20 | Илчлэл 1:17, 18 | Эхэн ба эцэс нь Би бөгөөд амьд Нэгэн мөн |
| A09 | 7772 | 231 | 7767 | 1 Самуел 2:1-10 | Лук 1:52-53 | Удирдагчдыг сэнтийгээс нь буулган... |
| A10 | 8436 | 249 | 8432 | Исаиа 12:1-6 | Иохан 7:37 | Цангасан хүн байвал Над руу ирж, уугтун |
| A11 | 9025 | 266 | 9020 | Хабаккук 3:2-4, 13а, 15-19 | Лук 21:28 | Тэргүүнээ өргө. Учир нь та нарын золилт айсуй |
| A12 | 9562 | 281 | 9556 | Дэд хууль 32:1-12 | Матай 23:37 | Тахиа дэгдээхэйнүүдээ далавчин дороо... |
| A13 | 10111 | 296 | 10107 | Даниел 3:57-88, 56 (2회) | Илчлэл 19:5 | Эзэний бүх боолууд аа... (2nd) |
| A14 | 11904 | 351 | 11898 | Исаиа 33:13-16 | Үйлс 2:39 | Учир нь уг амлалт та нар болон... |
| A15 | 12440 | 367 | 12435 | Исаиа 40:10-17 | Илчлэл 22, 12 | Харагтун, Би удахгүй ирнэ |
| A16 | 13029 | 378 | 13016 | Иеремиа 14:17-21 | Марк 1:15 | Тэр цаг биелэлээ оллоо. Тэнгэрбурханы хаанчлал айсуй |
| A17 | 13532 | 396 | 13527 | Мэргэн ухаан 9:1-6, 9-11 | Лук 21:15 | Та нарыг эсэргүүцэгчдээс нэг нь ч... |
| A18 | 14116 | 418 | 14112 | Даниел 3:52-57 (2회) | Ром 1:25 | Тэнгэрбурхан бол үүрд магтагдах Бүтээгч мөн (2nd) |
| A19 | 14731 | 434 | 14727 | Исаиа 42:10-16 | Илчлэл 14:3 | Тэд Тэнгэрбурханы сэнтийн өмнө шинэ дуу дуулав |
| A20 | 15303 | 451 | 15298 | Даниел 3:26, 27, 29, 34-41 | Үйлс 3:19 | Та бүх зүрх сэтгэлээрээ Тэнгэрбурханд хандвал... |
| A21 | 16440 | 482 | 16436 | Исаиа 66:10-14а | Галат 4:26 | Тэнгэрлэг Йерусалим бол эрх чөлөөтэй... |
| A22 | 17000 | 491 | 16994 | Тобит 13:8-11, 13-15 | Илчлэл 21:10-11 | Тэр намайг сүрлэг өндөр уулан дээр... |
| A23 | 17555 | 511 | 17550 | Езекиел 36:24-28 | Илчлэл 21:3 | Тэд Түүний ард түмэн болж... |

**관찰** :
- 모든 23건은 OT canticle (또는 deuterocanonical Tobit/Judith/Sirach/Wisdom). NT canticle (Phil 2 / Eph 1 / Rev 19 등) 은 본 누락에 없음 — 본 자체가 NT 라 별도 NT preface 가 없는 PDF 패턴이 정확히 반영됨.
- preface 거리: Магтаал line 부터 NT preface line 까지 모두 ≤10 line. lookahead window 확장 불필요.

### 3.2 Category B — `Дуулал N:m-n` verse-range anchor bug (10건)

| # | line | page | Дуулал line | psalm header | NT preface | 비고 |
|---|------|------|-------------|--------------|------------|------|
| B01 | 1511  | 50  | 1505  | Дуулал 141:1-9     | Илчлэл 8:4   | verse-range suffix breaks anchor |
| B02 | 5572  | 166 | 5569  | Дуулал 119:105-112 | Иохан 15:12  | same |
| B03 | 9085  | 271 | 9082  | Дуулал 147: 12-20  | Илчлэл 21:9  | same + colon 후 공백 |
| B04 | 9235  | 275 | 9232  | Дуулал 116:1-9     | Үйлс 14:21   | same |
| B05 | 9849  | 291 | 9846  | Дуулал 116:10-19   | Еврей 13:15  | same |
| B06 | 14790 | 437 | 14783 | Дуулал 135:1-12    | 1 Петр 2:9 (`харьцуул.` prefix) | **DOUBLE bug**: anchor + NT_BOOKS missing — R1+R3 둘 다 적용해야 회수 |
| B07 | 15372 | 445 | 15369 | Дуулал 144:1-10    | Филиппой 4:13 | same anchor |
| B08 | 16069 | 468 | 16066 | Дуулал 139:1-18, 23-24 | Ром 11:34 | same + range 내 comma |
| B09 | 16368 | 480 | 16364 | Дуулал 143:1-11    | Галат 2:16   | same anchor |
| B10 | 17057 | 493 | 17054 | Дуулал 147: 12-20  | Илчлэл 21:9 (2nd) | same as B03 |
| B11 | 18254 | 536 | 18250 | Дуулал 143:1-11    | Галат 2:16 (2nd) | same as B09 |

> Note: Cat B 에 11 행이 보이지만 unique psalm header 기준 10건이며, B03/B10 과 B09/B11 은 동일 psalm 의 2회 출현(다른 hour). divine-researcher 의 `missed_dulul_range_bug=10` 은 unique 기준 — repetition 카운트는 11. R1 anchor 패치 적용 시 11회 모두 catch 됨.

### 3.3 Category C — NT_BOOKS missing standalone (2건)

| # | line | page | Дуулал line | psalm header | NT preface | 비고 |
|---|------|------|-------------|--------------|------------|------|
| C01 | 13223 | 389 | 13216 | Дуулал 135 (no range, anchor OK) | 1 Петр 2:9 (`харьцуул.` prefix) | Дуулал scope 통과, but `1 Петр` 가 NT_BOOKS 에 없음 |
| C02 | 14640 | 426 | 14635 | Дуулал 90 | 2 Петр 3:8 | Дуулал scope 통과, but `2 Петр` 가 NT_BOOKS 에 없음 |

이 두 건은 R1 적용해도 회수 불가 — NT_BOOKS 확장 (R3) 만으로 회수 가능한 **순수 NT_BOOKS 결함**.

---

## 4. extractor 보강 권고 (R1 ~ R5)

### R1 — `Дуулал` anchor 완화 (LOW, ~5 LOC)

```js
// 현행
const PSALM_HEADER = /^\s*Дуулал\s+(\d+)\s*$/;
// 제안
const PSALM_HEADER = /^\s*Дуулал\s+(\d+)(?::\s*\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)?\s*$/;
```

- captures: plain `Дуулал N` 또는 `Дуулал N:m-n` 또는 `Дуулал N: m-n` 또는 `Дуулал N:m-n, p-q` 또는 `Дуулал N:m-n, q-r` (콤마 + 공백 허용).
- gain: **+10 entries** (Cat B unique 기준; 동일 psalm 2회 출현까지 합치면 +11 raw match).
- false-positive risk: **LOW** — verse-range syntax 만 허용, 자유 텍스트 매칭 없음.
- 영향 파일: `scripts/extract-psalter-headers.js` 1줄. 결과 JSON 키 형식은 기존과 동일 (`Psalm <N>` — verse-range 는 키에 포함하지 않음, 본문 verse-range 는 별도 보존 영역).

### R2 — `Магтаал` canticle scope (MEDIUM, 신규 code path + schema 변경)

새 anchor :

```js
const CANTICLE_HEADER = /^\s*Магтаал\s*$/;
```

- 별도 code path: `Магтаал` 매칭 시 **다음 1-2 비공백 line** 을 canticle source line 으로 읽고 (예: `Даниел 3:57-88, 56`), 그 다음 ≤10 line 내에서 NT preface lookup.
- ref-key 제안: `Canticle <Source>` — 예: `Canticle Daniel 3:57-88, 56`, `Canticle Tobit 13:1-8`.
- schema 변경: `psalter-headers.rich.json` 에 신규 entry kind `canticle_preface` 추가 (기존 `patristic_preface` / `nt_typological` 와 병렬). 또는 별도 파일 `psalter-headers-canticles.rich.json` 으로 분리.
- gain: **+23 entries**.
- **false-positive risk: MEDIUM** — OT canticle (NT preface 있음) 과 NT canticle (preface 없음 — 본문 자체가 NT) 구분 필수. Heuristic: canticle source 의 첫 토큰이 `NT_BOOKS` 에 속하면 preface lookup 생략. PDF 실측: OT canticles 100% 가 NT preface 보유, NT canticles 는 0%.
- 영향 파일: `scripts/extract-psalter-headers.js` (신규 path), rich JSON loader, renderer (UI), 그리고 schema doc.
- 별도 task: **#167** (R2 canticle scope plan, MEDIUM).

### R3 — NT_BOOKS 확장 (LOW, ~4 entries)

추가 :

```
1 Петр, 2 Петр, Иуда, Филемон
```

- regex 주의: `1 Петр` 는 공백 포함 — 다중 단어 entry 를 단일 단어보다 **앞에 alternation** 배치하거나 word-boundary-tolerant 처리.
- 추가 고려: `харьцуул.\s+` prefix tolerance (cf-style citation. 현행 grep 은 line 13223, 14790 에서 이 prefix 만으로 매칭 실패할 수 있음 — divine-researcher 추가 권고).
- gain: **+2 standalone entries** (Cat C) + Cat B 의 B06 (DOUBLE bug) 회수 시 R1 와 결합해 효과 발생.
- 영향 파일: `scripts/extract-psalter-headers.js` `NT_BOOKS` 배열 1곳.
- 별도 task: **#166** (R1 + R3 합본 patch, LOW).

### R4 — lookahead window (변경 불필요)

- 실측: 99건 caught + missed 모두 NT preface 가 header 로부터 **≤10 line** 이내. 현행 `windowEnd = i + 16` 은 충분히 여유.
- 권고: **변경 없음** (정량 확인 후 leader hypothesis 의 "lookahead-out" 시나리오를 closed 로 표시).

### R5 — coverage verifier 신설 (LOW, 신규 verifier script)

- 제안: `scripts/verify-psalter-headers-coverage.js` — `Магтаал` + 확장 `NT_BOOKS` + 완화 anchor 기반 grep 결과를 `psalter-headers.rich.json` (+ canticles JSON) 의 키 셋과 대조해 missing=0 검증.
- 활용: R1+R2+R3 patch 후 회귀 방지 gate. CI 에서 `node scripts/verify-psalter-headers-coverage.js` 실행 → exit 1 on missing>0.
- gain: 향후 PDF 갱신 / 로직 변경 시 자동 회귀 감지.

R1+R3 적용 후 예상 결과 :
- `psalter-headers.rich.json` refs section: **62 → 73 (+11 — Cat B unique 10 + Cat C 2; 단 B06 은 R3 도 필요)**.
- R2 까지 적용 시: 추가 **+23 (canticle entries)** → 새 namespace 또는 새 파일.
- 누계: 62 → 99 (gap=0).

---

## 5. Leader 가설 vs 실측 — 분기 원인

| 측면 | Leader 가설 (#164 dispatch) | 실측 (35건) |
|------|-----------------------------|-------------|
| 총 누락 | 18 | 35 |
| 추정 분류 | "canticles + lookahead-out" | Cat A (canticle) **23** + Cat B (anchor bug) **10** + Cat C (NT_BOOKS) **2** |
| lookahead-out (>10 line) | 주요 원인 중 하나로 추정 | **0건** — 가설 반증 |
| 추정 누락 시나리오 | 명시된 OT canticle 일부 (Tobit/Isaiah/Habakkuk 등) | 위 3종 + Daniel 3:52-57, Daniel 3:57-88, Jeremiah 31, Wisdom 9, Sirach 36, 1 Samuel 2, Deut 32, Judith 16, Ezekiel 36 등 18종 추가 canticle |

**분기 원인 추정** :

1. Leader 의 18 추정은 명시적 OT canticle 헤더 ("Tobit 13", "Isaiah 38", "Habakkuk 3") 에 대한 **수기/육안 scan** 으로 보임. 실제 Магтаал scope-out 는 **23건** — 5건 이상 추가 (Daniel canticle 의 이중 출현 포함).
2. **Cat B (verse-range anchor bug) 10건은 가설에서 누락된 2번째 결함 모드**. 이는 canticle 이 아닌 일반 시편 (Psalm 116, 119, 135, 141, 144, 147 등) 이며 leader 의 canticle hypothesis 로는 잡히지 않음.
3. **Cat C 2건은 NT_BOOKS 결함**. 1 Петр / 2 Петр 가 그리스어 정경 표기와 다른 띄어쓰기 ("1 Петр" 공백 1개) 로, 단일 단어 NT_BOOKS 알고리즘 가정에서 silently 누락. leader 가설은 이 결함을 lookahead-out 으로 오해.
4. "lookahead-out" 은 실측 **0건** — leader 가 추정한 distance 기반 결함은 존재하지 않음. 가설 반증으로 R4 는 변경 불필요로 확정.

**교훈**: 단일 결함 모드 가설 (canticles 만, 또는 lookahead 만) 보다, 매칭 실패의 **3 stage** (anchor scope → verse-range parse → NT book lookup) 를 모두 점검하는 진단 매트릭스가 필요. R5 coverage verifier 는 이 매트릭스를 자동화하는 도구.

---

## 6. 다음 단계 (이미 dispatch 됨 또는 권고)

| 단계 | 상태 | task | 대상 |
|------|------|------|------|
| 본 audit doc commit | 본 PR | **#165** (이 문서) | member-01 |
| R1 + R3 patch (LOW, +12) | dispatched | **#166** | solver |
| R2 canticle scope plan (MEDIUM, +23, schema 변경) | pending | **#167** | tbd |
| R5 verifier 신설 | 권고 (별도 task 필요) | tbd | tbd |

---

## 부록 — 데이터 source

- divine-researcher #164 completion_report (PWMSG, 2026-04-28T12:25:52Z) — `research_findings` 필드의 `summary_table`, `missing_entries.category_A_canticle_scope_out` (23건), `missing_entries.category_B_dulul_verse_range_bug` (11 raw / 10 unique), `missing_entries.category_C_nt_books_missing_only` (2건), `extractor_recommendations.R1..R5`, `discrepancy_with_leader_estimate`. 본 문서의 모든 line/page/source/preface 데이터는 PWMSG 원본을 그대로 옮긴다.
- `scripts/extract-psalter-headers.js` (현행 추출 로직 — anchor / lookahead / NT_BOOKS 정의 위치)
- `parsed_data/full_pdf.txt` (PDF 원문, 32,761 lines)
- `src/data/loth/prayers/commons/psalter-headers.rich.json` (62 entries / 52 keys, 4 unmatched)
