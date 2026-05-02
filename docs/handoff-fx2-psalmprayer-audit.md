# F-X2 — 시편 마침 기도 page-mapping audit (deeper follow-up)

**Task**: #218 (research dispatch — 두 번째 follow-up) | **Branch**: worktree-218-divine-researcher  
**Member**: divine-researcher | **Peer**: codex research_methodologist (ex_20260502T130214Z_4cbbd497, APPROVED_WITH_ISSUES)  
**SHARD**: none-justified (read-only audit, AA7 floor 면제)

## TL;DR

1. **사용자 보고 정답 판정**: PDF p.280 과 p.506 의 마침 기도 본문은 **byte-identical**. 두 다른 본문이 아니라 *동일* 본문이 LOTH 4-주차 cycle 안에서 W2 SAT Lauds (p.280) 와 W4 SAT Lauds (p.506) 로 두 번 인쇄됨. **W4 SAT Lauds 컨텍스트의 정답 페이지 칩은 506**.
2. **레전더 가설 무효화**: leader 의 추정 ("280 은 책 앞부분 standalone 시편 섹션") 은 PDF 목차로 반증됨 — TOC line 41-45 가 LOTH 4-주차 cycle 의 페이지 범위 (W1=49, W2=166, W3=287, W4=398, Compline=512+) 를 명시. 280·506 모두 LOTH 안.
3. **시스템 범위**: 82 legacy + 80 rich entries 중 **12 keys 가 PARTIAL_CONFLATION** (한 ref 가 LOTH 4-주차 안에서 2~4 occurrence; 카탈로그가 1 page 만 저장 → 1 occurrence 만 정답, 나머지는 잘못된 page 칩). 합계 **16 occurrences 가 잘못된 page 표시**.
4. **권장 fix**: 옵션 (A) week-N.json psalm entry 에 occurrence-specific `psalmPrayerPage` override 필드. 작업량 최소·회귀 위험 가장 낮음·기존 SSOT 분배 패턴과 정합.

---

## 1. Verbatim 본문 비교 — p.280 vs p.506

### p.280 (W2 SAT Lauds, parsed_data/full_pdf.txt 9536-9542)

```
Дууллыг төгсгөх залбирал
Эзэн минь, Та ичгүүрийг минь биднээс
салгаад, биднийг Таны авралын үйлсэд баясуулна
уу. Таны Хүүгээр сонгогдсон хамаг хүмүүс Танд
үйлчлэхдээ итгэлтэй, найдвартай байж, хайрын
үйлсийг үргэлж ихэд үйлдэж, дэлгэрүүлэх
болтугай.
```

PDF 컨텍스트 마커 (line 9519): `2 дугаар долоо хоног` ("Second Week"); page header 9516: `280`; psalm body label 9486: `Дуулал 92`.

### p.506 (W4 SAT Lauds, parsed_data/full_pdf.txt 17528-17534)

```
Дууллыг төгсгөх залбирал
Эзэн минь, Та ичгүүрийг минь биднээс
салгаад, биднийг Таны авралын үйлсэд баясуулна
уу. Таны Хүүгээр сонгогдсон хамаг хүмүүс Танд
үйлчлэхдээ итгэлтэй, найдвартай байж, хайрын
үйлсийг үргэлж ихэд үйлдэж, дэлгэрүүлэх
болтугай.
```

PDF 컨텍스트 마커 (line 17508): `4 дүгээр долоо хоног` ("Fourth Week"); page header 17505: `506`; psalm body label 17478: `Дуулал 92`.

### Diff 결과

`Дууллыг төгсгөх залбирал` 헤더부터 마지막 어미 `болтугай.` 까지 **개행·공백 위치 포함 0 bytes diff**. 두 occurrence 가 prayer text 를 *완전히 동일하게* 인쇄. PDF 가 cross-ref ("see page X") 가 아닌 **본문 반복** 방식이므로 한쪽이 본문이고 다른 쪽이 참조라는 가설 성립 안 함.

### 정답 판정 (W4 SAT Lauds 사용자 컨텍스트)

> **W4 SAT Lauds 페이지 칩은 506 이 정답.**

근거:
- 사용자가 W4 토요일 (=2026-05-02) 에 접근하면 week-4.json 의 SAT lauds 섹션이 활성화. 해당 시편(Psalm 92:2-9, page=505) 다음의 마침 기도는 같은 W4 4-주차 cycle 안의 다음 페이지(506) 에 인쇄됨. 사용자가 PDF 를 펼쳐 확인하려면 506 으로 가야 함.
- 280 은 같은 prayer 본문이지만 **W2 컨텍스트의 페이지 번호** — 사용자가 W4 토요일을 보고 있을 때 280 으로 안내하면 "다른 주차의 같은 시편" 페이지로 점프하여 컨텍스트 이탈.
- 두 페이지의 마침 기도가 byte-identical 이라는 사실은 *사용자에게 보일 본문 자체* 는 어느 쪽이든 같다는 의미. 그러나 **page-ref UI 의 의미는 "사용자가 PDF 의 어느 위치를 펼쳐야 하는가"** 이므로 occurrence-context 일치가 정답.

---

## 2. Book structure 검증

`parsed_data/full_pdf.txt` 목차(line 41-45):

```
"Дуулал" номын дөрвөн долоо хоног
1 дүгээр долоо хоног............................................49
2 дугаар долоо хоног..........................................166
3 дугаар долоо хоног..........................................287
4 дүгээр долоо хоног..........................................398
Шөнийн даатгал залбирал                          (Compline)
Ням гараг
1 дүгээр Оройн даатгал залбирлын дараа.... 512
…
```

→ **단일 4-주차 LOTH cycle**. 별도 standalone Psalter section 없음. p.280·506 모두 LOTH 안 (W2·W4).

검증 결과 LOTH 페이지 범위:
- **W1**: 49–165
- **W2**: 166–286
- **W3**: 287–397
- **W4**: 398–511
- **Compline**: 512–547
- **Seasonal/Sanctoral**: 548+

---

## 3. Sweep — 82 legacy psalmPrayerPage entries 분류

방법: `src/data/loth/psalter-texts.json` 의 모든 `psalmPrayerPage` 항목과 `src/data/loth/psalter/week-{1..4}.json` 의 시편 occurrence (lauds + vespers, 168 entries) 를 cross-reference. legacy page ↔ occurrence page 의 차가 [-1, +3] 범위 안이면 매칭. (시편 본문 page + 1~2 가 마침 기도 page 가 일반적.)

### 분류 결과 (전체 82)

| 분류 | 카운트 | 의미 | bug? |
|------|------|------|------|
| **ALL_MATCH single-occ** | 60 | 카탈로그의 page 가 그 단일 occurrence 와 정합 | ✗ |
| **ALL_MATCH multi-occ** | 6 | n>=2 occurrence 모두 같은 page 또는 같은 occurrence 안의 stanza 분할 | ✗ |
| **PARTIAL_CONFLATION** | **12** | n>=2 occurrence, 1 occurrence 만 page 매칭 — **THE BUG CLASS** | **✓** |
| **NO_MATCH single-occ** | 0 | (없음) | — |
| **ORPHAN no-occurrence** | 4 | week-N.json lauds/vespers 에 등장 안 함 (Saturday Vespers I, daytime, Compline 가능성) | 별건 |

### 3.1 PARTIAL_CONFLATION 12 keys (정정 필요한 occurrence 16개)

| # | Ref | legacy_page | sect | occurrences (page) | 매칭 | 정정 필요 occurrence |
|--|-----|------------|------|---------------------|-----|--------------------|
| 1 | **Psalm 110:1-5, 7** | 69 | W1 | w1-SUN-vespers@68, w2@185, w3@304, w4@415 | 1/4 | w2 (→p.186), w3 (→p.305), w4 (→p.416) |
| 2 | Psalm 119:145-152 | 160 | W1 | w1-SAT-lauds@159, w3-SAT-lauds@391 | 1/2 | w3 (→p.392) |
| 3 | **Psalm 51:3-19** | 144 | W1 | w1-FRI-lauds@142, w2@263, w3@375, w4@488 | 1/4 | w2 (→p.264), w3 (→p.376), w4 (→p.489) |
| 4 | Psalm 100:1-5 | 148 | W1 | w1-FRI-lauds@147, w3-FRI-lauds@379 | 1/2 | w3 (→p.380) |
| 5 | Psalm 118:1-16 | 178 | W2 | w2-SUN-lauds@175, w4-SUN-lauds@405 | 1/2 | w4 (→p.406) |
| 6 | Psalm 150:1-6 | 181 | W2 | w2-SUN-lauds@180, w4-SUN-lauds@411 | 1/2 | w4 (→p.412) |
| 7 | Psalm 67:2-8 | 240 | W2 | w2-WED-vespers@239, w3-TUE-lauds@333 | 1/2 | w3-TUE (→p.334) |
| 8 | **Psalm 92:2-9** ⭐ | 280 | W2 | w2-SAT-lauds@279, w4-SAT-lauds@505 | 1/2 | **w4 (→p.506)** — 사용자 신고 |
| 9 | Psalm 8:2-10 | 284 | W2 | w2-SAT-lauds@282, w4-SAT-lauds@508 | 1/2 | w4 (→p.509) |
| 10 | Psalm 135:1-12 | 386 | W3 | w3-FRI-vespers@383, w4-MON-lauds@428 | 1/2 | w4-MON (→p.429) |
| 11 | Psalm 144:1-10 | 446 | W4 | w4-TUE-lauds@445, w4-THU-vespers@481 | 1/2 | w4-THU (→p.482) |
| 12 | Psalm 147:12-20 | 268 | W2 | w2-FRI-lauds@267, w4-FRI-lauds@492 | 1/2 | w4 (→p.493) |

**합계 정정 필요**: 12 keys × (n−1) = 16 occurrences.

추정 정정 페이지(`→pX`) 는 occurrence_psalm_page + 1 또는 +2 (PDF 패턴 평균); 실제 정정 시 PDF 본문 verbatim 검증으로 확정해야 함 (이번 audit 은 추정값 표시; pilot #219 시 Psalm 92:2-9 만 PDF 검증 완료 ✓).

### 3.2 ALL_MATCH multi-occ (6 — bug 아님)

| Ref | legacy_page | 패턴 |
|-----|------------|------|
| Psalm 113:1-9 | 288 | w1/w2/w3 SAT vespers 모두 page 287 (Saturday First Vespers I 공용 시편) |
| Psalm 116:10-19 | 290 | 동일 (모두 page 289) |
| Psalm 132:1-10 | 369 | w3-THU-vespers 한 occurrence 가 stanza 분할로 page 367+368 점유 |
| Psalm 145:1-13 | 499 | w4-FRI-vespers 동일 (497+498) |
| Psalm 45:2-10 | 205 | w2-MON-vespers 동일 (203+204) |
| Psalm 49:1-13 | 221 | w2-TUE-vespers 동일 (219+220) |

→ 이들은 false positive (multi-occurrence 처럼 보이나 실제로는 single-occurrence-with-pagebreak 또는 same-page reuse).

### 3.3 ORPHAN 4 keys (audit out-of-scope)

| Ref | legacy_page | sect | 추정 사용처 |
|-----|------------|------|------------|
| Psalm 16:1-6 | 170 | W2 | Saturday First Vespers I (FR-156 firstVespers map evidence p.169-170) |
| Psalm 119:105-112 | 168 | W2 | Daytime hours / Compline (week-N.json lauds/vespers 미등장) |
| Psalm 141:1-9 | 51 | W1 | Saturday First Vespers I (Sunday W1 직전, p.51) |
| Psalm 142:1-7 | 53 | W1 | Saturday First Vespers I (p.53) |

→ ordinarium / propers / sanctoral / compline / daytime hours sweep 은 별도 후속 task. peer 권고와 일치.

---

## 4. Root cause 재확인

```ts
// src/lib/hours/loaders.ts:8 — entry 타입
psalmPrayerPage?: number   // ← 단일 number, occurrence 무관

// src/lib/hours/resolvers/psalm.ts:55-115 — resolvePsalm
const psalterTexts = loadPsalterTexts()
const psalmText = psalterTexts[entry.ref]            // ← flat ref lookup
…
psalmPrayerPage: psalmText.psalmPrayerPage,          // ← 단일 page 그대로 전파

// src/lib/prayers/rich-overlay.ts:292 — rich 카탈로그
export function loadPsalterTextPsalmPrayerRich(ref: string): PrayerText | null {
  const catalog = loadPsalterTextsCatalog()
  if (!catalog) return null
  const entry = catalog[ref]                         // ← 동일 flat lookup
  return entry?.psalmPrayerRich ?? null
}

// src/components/psalm-block.tsx:186 — 렌더 (page chip)
<PageRef page={psalm.psalmPrayerPage} />             // ← LEGACY 필드 직접 표시
```

→ 두 카탈로그 (legacy + rich) 모두 ref 단일 page 모델. 렌더는 legacy 필드를 직접 표시 (rich.page 는 RichContent 구조에 들어가지만 화면 칩 자체는 legacy). occurrence context 가 resolver/loader 어느 단계에도 주입되지 않아, 카탈로그의 첫 page (가장 빠른 occurrence) 가 모든 occurrence 를 덮어씀.

선례: `src/lib/prayers/rich-overlay.ts:305-306` 의 `psalter-headers` 카탈로그 주석은 같은 한계를 이미 인지함:
> "ref 당 다중 entries 가능 (한 시편이 4주 cycle 에서 여러 주차에 등장하면서 다른 patristic/typological preface 와 매핑). 현재 구현은 첫번째 entry 를 반환하는 간단한 lookup; 페이지 컨텍스트로 disambiguate 하는 확장은 후속."

→ 동일 패턴이 `psalter-texts` 의 psalm-prayer 에도 그대로 누적. `psalter-headers` 가 미해결 deferred 인 상태에서 `psalter-texts` 가 같은 부채를 별도 표면화.

---

## 5. Fix 옵션 분석

### Option A — week-N.json psalm entry 에 per-occurrence override

**Schema**:
```jsonc
// src/data/loth/psalter/week-4.json — 기존
{
  "type": "psalm",
  "ref": "Psalm 92:2-9",
  "page": 505,
  "antiphon_key": "w4-sat-lauds-ps1",
  // …
}
// → 추가 (occurrence override)
{
  "type": "psalm",
  "ref": "Psalm 92:2-9",
  "page": 505,
  "psalmPrayerPage": 506,        // ← occurrence-context page 명시 (override)
  // psalter-texts.json psalmPrayerPage=280 은 "default fallback" 으로 남음
  …
}
```

**Resolver 변경**:
```ts
// src/lib/hours/resolvers/psalm.ts
return {
  …,
  // entry-level override 우선, 없으면 catalog 의 default page
  psalmPrayerPage: entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage,
  …
}
```

**작업량**:
- Schema: `src/lib/types.ts` 의 PsalterDayPsalm 타입에 optional `psalmPrayerPage?: number` 추가 (1 line)
- Resolver: 1 line 변경 (?? 연산자)
- 데이터: 16 occurrence × week-N.json `psalmPrayerPage: <pdf page>` 한 줄씩 추가
- 회귀 테스트: w2-SAT-lauds (p.280, override 없음) + w4-SAT-lauds (p.506, override 적용) 양쪽 vitest

**장점**:
- 기존 SSOT (`psalter-texts.json` 의 prayer text + default page) 그대로 유지 — 본문 중복 X
- 변경 범위 최소 (16 데이터 라인 + 2 코드 라인 + 1 타입 라인)
- 4주차 패턴이 데이터(week-N.json)에 명시되므로 LOTH 디자인 의도와 정합
- backward-compat: override 미부여 entry 는 기존 동작
- pilot/batch 분할 가능 — Psalm 92:2-9 만 우선(이미 #219 dispatch 됨), 나머지 11 keys 후속 batch

**단점**:
- 데이터 진실 출처가 분산: prayer text 는 catalog, page 는 week-N.json. 단 page 는 본질적으로 occurrence-bound 정보이므로 분산이 자연스러움
- `psalter-texts.json` 의 default page 가 "어느 occurrence 의 page 인가" 가 모호할 수 있음 → 첫 occurrence (가장 빠른 주차) 로 약속하면 됨

**회귀 위험**: 낮음. override 가 nullable, 기본 fallback 유지. NFR-009d (psalter-pages verifier) 가 이미 page 정합성을 검증하므로 verifier 에 occurrence-aware 검증만 추가.

---

### Option B — `psalter-texts.json` 을 occurrence-keyed 로 재구성

**Schema**:
```jsonc
{
  "Psalm 92:2-9": {
    "stanzas": [...],          // 그대로
    "psalmPrayer": "...",      // 그대로 (text SSOT)
    "psalmPrayerOccurrences": [
      { "week": "2", "dayKey": "SAT", "hour": "lauds", "psalmPrayerPage": 280 },
      { "week": "4", "dayKey": "SAT", "hour": "lauds", "psalmPrayerPage": 506 }
    ]
  }
}
```

**Resolver 변경**: `loadPsalterTexts()` 와 `loadPsalterTextPsalmPrayerRich()` 시그니처에 `psalterContext: { week, dayKey, hour }` 인자 추가, occurrences 배열 매칭 후 매칭 실패 시 첫 entry fallback.

**작업량**:
- Schema 변경: 양 catalog 의 80~82 entries 의 page 필드를 occurrences 배열로 마이그레이션 (수동/스크립트)
- Resolver 시그니처: 호출처 (psalm.ts 56·60·111) 모두 컨텍스트 전달 필요
- 회귀 테스트: 모든 multi-occurrence + single-occurrence fallback 검증

**장점**:
- 카탈로그 자체가 SSOT 으로 자기-완결적
- psalter-headers 카탈로그와 동일 shape 으로 통합 가능 (rich-overlay.ts:305 deferred 작업 합류)

**단점**:
- 변경 범위 큼 — 80~82 entries 마이그레이션 + 2 catalog 양쪽 + resolver/loader 시그니처 + 호출처
- 회귀 면적 큼 (catalog text-only 사용처에도 영향)
- single-occurrence entries 도 schema 변경됨 → 80% 의 entry 가 변화 없는 데이터 작업
- psalter-texts.json 이 다른 곳에서도 import 되면 호환 깨질 위험

**회귀 위험**: 중간~높음. 단계별 마이그레이션 + 임시 dual-shape 지원 필요.

---

### Option C — 별도 SSOT 신설 (`src/data/loth/psalm-prayer-overrides.json`)

**Schema**:
```jsonc
{
  "w4-SAT-lauds.Psalm 92:2-9": { "psalmPrayerPage": 506 },
  "w4-SAT-lauds.Psalm 8:2-10": { "psalmPrayerPage": 509 },
  "w4-SUN-lauds.Psalm 118:1-16": { "psalmPrayerPage": 406 },
  // … 16 entries
}
```

**Resolver 변경**: 신규 loader `loadPsalmPrayerOverrides()` + `resolvePsalm` 에서 컨텍스트 키 조합 후 lookup, 없으면 catalog default fallback.

**작업량**:
- 신규 파일 1 (16 entries)
- 신규 loader 1 (~20 lines)
- resolver 1 line 변경 (?? 체이닝)
- 회귀 테스트

**장점**:
- 기존 catalog/week-N.json 모두 변경 X — 가장 lean
- 정정 데이터를 한 파일에 응집 → 추가 수정 시 발견 쉬움

**단점**:
- 새 SSOT 한 개 더 (PRD/traceability 매트릭스에 등재 필요)
- "왜 별도 파일인가" 의 의미가 약함 — week-N.json 의 *psalm entry* 가 자연스러운 위치인데 별도 파일은 인지 부담 증가
- override 데이터가 week-N.json psalm entry 와 중복 키 (week+dayKey+hour+ref) — 미세하게 drift 가능

**회귀 위험**: 낮음. 모든 변화가 새 파일 + 한 line 코드.

---

### Option 비교 매트릭스

| 기준 | A (week-N override) | B (occurrence-keyed catalog) | C (별도 overrides 파일) |
|------|--------------------|-----------------------------|------------------------|
| 변경 LOC (코드) | ~3 | ~30+ | ~20 |
| 변경 LOC (데이터) | 16 lines (week-N.json) | 80~82 entries × 2 catalog | 16 lines (신규 파일) |
| Schema breaking | nullable optional | catalog shape 변경 | 신규 SSOT |
| 회귀 위험 | **낮음** | 중~높음 | 낮음 |
| psalter-headers 통합 | 별개 작업 (separate) | **통합 가능** (동일 shape) | 별개 작업 |
| LOTH 디자인 정합 | **높음** (week-N 가 4주차 cycle SSOT) | 높음 (catalog 자체-완결) | 중 (override 파일이라는 메타 개념) |
| pilot 가능 | **즉시** (1 entry 추가) | 어려움 (catalog 마이그레이션 atomic) | 즉시 |
| Memory feedback (Rich 확산 카탈로그 패턴) 정합 | 중 (page 만 분산) | **높음** (catalog 일원화) | 낮음 |
| Memory feedback (병렬 세션 인프라 공유) 영향 | 낮음 (인프라 변경 X) | **높음** (catalog/loader/resolver 동시 수정) | 낮음 |

### 최종 권고: **Option A** (per-occurrence override in week-N.json)

근거:
1. **변경 범위 최소** — 16 데이터 라인 + 3 코드 라인. pilot Psalm 92:2-9 만 우선 적용해도 즉시 사용자-신고 버그 해소.
2. **회귀 위험 최저** — 기존 catalog/loader/renderer 모두 nullable fallback 으로 backward-compat.
3. **LOTH 디자인 정합** — week-N.json 이 이미 4-주차 cycle 의 occurrence-bound 정보(page, antiphon_key, 등) 의 SSOT. `psalmPrayerPage` 도 occurrence-bound 이므로 같은 위치가 자연스러움.
4. **병렬 작업 가능** — pilot (#219 Psalm 92:2-9) 과 batch (나머지 11 keys) 를 별 세션이 동시에 진행 가능. 인프라 (loader/resolver) 수정이 1 line 으로 즉시 land.
5. **psalter-headers deferred 작업과 분리 가능** — rich-overlay.ts:305 의 psalter-headers 통합은 별개 후속으로, 이번 fix 는 psalm-prayer 만 빠르게 해소.
6. **NFR-009d verifier 확장 용이** — verify-psalter-pages.js 가 이미 entry 별 page 검증; `psalmPrayerPage` override 추가 검증은 minor 확장.

Option B 는 시즌 중립 카탈로그 통합 (Memory rich-catalog-pattern feedback) 과는 정합하나 변경 면적이 12 PARTIAL_CONFLATION 의 즉시 해소 목표보다 과대 — 사용자 보고 버그를 해소하면서 catalog architectural debt 를 별도 후속 task 로 분리하는 편이 우선순위 명확.

Option C 의 별도 overrides 파일은 fix 자체로는 깨끗하나 새 SSOT 의 인지 부담 (다른 영역도 비슷한 패턴이 생기면 파일이 분화) 이 우려.

#### 실행 단계 (권장)

- **Phase 1 (#219 — 이미 dispatch 됨)**: Option A 인프라 + Psalm 92:2-9 W4 SAT Lauds pilot.
  - `src/lib/types.ts`: PsalterDayPsalm 에 optional `psalmPrayerPage?: number` 추가
  - `src/lib/hours/resolvers/psalm.ts`: `entry.psalmPrayerPage ?? psalmText?.psalmPrayerPage` 로 변경 (line 74·112)
  - `src/data/loth/psalter/week-4.json` 의 SAT lauds Psalm 92:2-9 entry 에 `"psalmPrayerPage": 506` 추가
  - vitest 추가 (W2 default + W4 override)
- **Phase 2 (후속 batch)**: 나머지 11 keys 의 16 occurrence override.
  - PDF 본문 verbatim 검증 (이번 audit 의 추정값 → 실제 page 확정)
  - week-N.json batch 추가
- **Phase 3 (별건 후속)**: ORPHAN 4 keys + Saturday Vespers I + propers/sanctoral/compline/daytime sweep
- **Phase 4 (별건 후속)**: psalter-headers 카탈로그를 occurrence-keyed shape 으로 (rich-overlay.ts:305 deferred 작업 land)

---

## 6. Files referenced (read-only audit)

| Path | 역할 |
|------|------|
| `parsed_data/full_pdf.txt` | PDF 본문 (main repo cp 우회 by memory feedback) |
| `src/data/loth/psalter/week-{1,2,3,4}.json` | per-week 시편 occurrence (lauds + vespers) |
| `src/data/loth/psalter-texts.json` | legacy 시편 본문 + psalmPrayer/psalmPrayerPage (82 keys) |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | rich AST 카탈로그 + psalmPrayerRich.page (80 keys) |
| `src/lib/hours/loaders.ts:1-30` | `loadPsalterTexts` + PsalterTextEntry 타입 |
| `src/lib/hours/resolvers/psalm.ts:55-115` | resolvePsalm — 두 entry path 모두 flat ref lookup |
| `src/lib/prayers/rich-overlay.ts:240-296,305-306` | rich catalog loader + psalter-headers deferred 주석 |
| `src/lib/types.ts:629-630` | AssembledPsalm 타입 (psalmPrayerRich + psalmPrayerPage) |
| `src/components/psalm-block.tsx:182-201` | renderer — `<PageRef page={psalm.psalmPrayerPage} />` (line 186) |
| `parsed_data/first-vespers-versed-map.json` | Saturday Vespers I 시편 매핑 (ORPHAN entry 분석 보조) |

## 7. Peer evidence

- Provider: codex (research_methodologist persona)
- Exchange: `ex_20260502T130214Z_4cbbd497`
- Stance: APPROVED_WITH_ISSUES, confidence HIGH
- 핵심 correction (적용됨): 화면 칩은 rich 가 아닌 **legacy `psalmPrayerPage`** 에서 직접 옴 — psalm-block.tsx:186 으로 확인 완료
- 추가 권고 (이번 audit 에 반영): ordinarium / compline / invitatory / propers / sanctoral psalter reuse 도 후속 audit 대상 → ORPHAN 4 keys 가 그 시드

## 8. Out of scope (handed back to leader)

- Phase 1 pilot (Psalm 92:2-9 데이터/코드 패치) — **#219 member-01 dispatched**
- Phase 2 batch (나머지 11 keys 16 occurrence) — 후속 dispatch
- Phase 3 ordinarium/compline/propers/sanctoral psalter reuse sweep
- Phase 4 psalter-headers 카탈로그 통합 (rich-overlay.ts:305 deferred 작업)
- NFR-009d verify-psalter-pages.js 의 occurrence-aware 확장
