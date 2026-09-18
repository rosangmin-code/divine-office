# F-X2 — 토요일 W4 Lauds 시편 마침 기도 page 280 vs 506 audit

**Task**: #218 (research dispatch) | **Branch**: worktree-218-divine-researcher | **Base**: 3c79873  
**Member**: divine-researcher | **Peer**: codex research_methodologist (ex_20260502T130214Z_4cbbd497, APPROVED_WITH_ISSUES)

## TL;DR — 사용자 신고 버그는 systemic page-mapping conflation 의 한 사례

토요일 W4 Lauds 의 첫 시편(Psalm 92:2-9) 마침 기도가 PDF 506쪽에 인쇄되어 있음에도 앱이 280쪽 칩을 표시한다. 280쪽은 **W2 토요일 Lauds** 의 같은 시편(같은 마침 기도 텍스트가 본문에서 두 번 인쇄됨)이 위치한 곳이다. 데이터 카탈로그(`psalter-texts.json`/`psalter-texts.rich.json`) 가 시편 ref 한 개당 한 페이지만 저장하므로 multi-occurrence 시편의 **첫 등장(가장 빠른 주차)** 페이지가 후속 주차들을 모두 덮어쓴다. 13+ 시편이 동일 패턴.

## Reproduction

- **데이터**: `src/data/loth/psalter/week-4.json` `.days.SAT.lauds.psalms[0].ref="Psalm 92:2-9"`, `page: 505`.
- **카탈로그**: `src/data/loth/psalter-texts.json["Psalm 92:2-9"].psalmPrayerPage = 280`.
- **카탈로그 (rich)**: `src/data/loth/prayers/commons/psalter-texts.rich.json["Psalm 92:2-9"].psalmPrayerRich.page = 280`.
- **렌더러**: `src/components/psalm-block.tsx:186` → `<PageRef page={psalm.psalmPrayerPage} />` 가 **legacy `psalmPrayerPage=280` 값을 직접 표시**.
- **리졸버**: `src/lib/hours/resolvers/psalm.ts:55-115` 가 `entry.ref` 평면 lookup 만 사용 (occurrence context 미주입).

## PDF evidence (parsed_data/full_pdf.txt)

| Occurrence | PDF page header | 마침 기도 위치 (본문 라인) | 마침 기도 첫 30자 |
|-----------|----------------|--------------------------|-----------------|
| W2 SAT lauds (`2 ДУГААР ДОЛОО ХОНОГ` / `Бямба гарагийн өглөө`) | **280** (line 9516) | line 9536-9542 `Дууллыг төгсгөх залбирал` | "Эзэн минь, Та ичгүүрийг минь биднээс…" |
| W4 SAT lauds (`4 дүгээр долоо хоног` / `Бямба гарагийн өглөө`) | **506** (line 17505) | line 17528-17534 `Дууллыг төгсгөх залбирал` | "Эзэн минь, Та ичгүүрийг минь биднээс…" |

→ 두 페이지에 **동일 prayer text 가 각자 인쇄**되어 있다. PDF 가 "see page X" 식 cross-ref 가 아니라 매 occurrence 마다 본문을 반복.

## Systemic scope (multi-occurrence psalms with single-entry catalog)

`psalter-texts.rich.json` 80 keys, `psalter-texts.json` 82 keys 의 `psalmPrayerPage` 항목을 week-{1..4}.json 의 시편 ref 출현 횟수와 cross-reference 한 결과 (스크립트 미작성, 수동 jq + sort 사용):

### Confirmed mismatch (multi-occurrence + 다른 PDF page)

| Ref | Occurrences (page) | rich/legacy page | Mismatched at |
|-----|-------------------|------------------|---------------|
| **Psalm 92:2-9** ⭐ | w2-SAT-lauds@279, w4-SAT-lauds@505 | 280 | **w4 (should be 506)** |
| Psalm 8:2-10 | w2-SAT-lauds@282, w4-SAT-lauds@508 | 284 | w4 (should be 509) |
| Psalm 110:1-5, 7 | w1-SUN-vespers@68, w2@185, w3@304, w4@415 | 69 | w2/w3/w4 |
| Psalm 51:3-19 | w1-FRI-lauds@142, w2@263, w3@375, w4@488 | 144 | w2/w3/w4 |
| Psalm 100:1-5 | w1-FRI-lauds@147, w3@379 | 148 | w3 |
| Psalm 119:145-152 | w1-SAT-lauds@159, w3@391 | 160 | w3 |
| Psalm 118:1-16 | w2-SUN-lauds@175, w4@405 | 178 | w2 매칭? PDF 재확인 필요 — 178 은 어느 occurrence 도 +1 안 맞음 |
| Psalm 150:1-6 | w2-SUN-lauds@180, w4@411 | 181 | w4 |
| Psalm 67:2-8 | w2-WED-vespers@239, w3-TUE-lauds@333 | 240 | w3-TUE |
| Psalm 147:12-20 | w2-FRI-lauds@267, w4@492 | 268 | w4 |
| Psalm 144:1-10 | w4-TUE-lauds@445, w4-THU-vespers@481 | 446 | w4-THU |
| Psalm 135:1-12 | w3-FRI-vespers@383, w4-MON-lauds@428 | 386 | both — PDF 재확인 필요 |
| Psalm 145:1-13 | w4-FRI-vespers@497, 498 | 499 | same-occurrence 다중 stanza, OK |
| Psalm 117:1-2 | w1-SAT-lauds@162, w3-SAT-lauds@394 | rich 없음 / legacy 미확인 | 후속 |

### False positive (multi-occurrence 이지만 conflict 아님)

| Ref | Pattern |
|-----|---------|
| Psalm 113:1-9 (3x SAT vespers) | 모두 같은 page 287 — Saturday Vespers I 공용 시편 |
| Psalm 116:10-19 (3x SAT vespers) | 모두 같은 page 289 — 동일 |
| Psalm 45:2-10, 49:1-13, 72:1-11, 132:1-10, 145:1-13 | 한 occurrence 안에서 stanza 분할로 두 page 등장 — 데이터의 "2x" 는 가짜, 실제 reuse 아님 |

### Out of audit scope (이번 task 미포함)

- compline / daytime hours 의 시편 reuse — peer 추천. NT 칸티클(Philippians/Ephesians/Colossians/Revelation) 은 `psalmPrayerRich` 미보유 (별도 처리).
- propers / sanctoral 의 시편 reuse — 후속 sweep 필요.
- 데이터 fix 자체 (이번 audit 은 진단까지).

## Root cause

```ts
// src/lib/prayers/rich-overlay.ts:292
export function loadPsalterTextPsalmPrayerRich(ref: string): PrayerText | null {
  const catalog = loadPsalterTextsCatalog()
  if (!catalog) return null
  const entry = catalog[ref]            // ← flat ref lookup, occurrence-blind
  return entry?.psalmPrayerRich ?? null
}
```

```ts
// src/lib/hours/resolvers/psalm.ts:55-115
const psalterTexts = loadPsalterTexts()
const psalmText = psalterTexts[entry.ref]   // ← legacy 같은 패턴
…
psalmPrayerPage: psalmText.psalmPrayerPage, // ← 한 ref 당 한 page (280)
psalmPrayerRich,                            // ← 한 ref 당 한 entry (page 280)
```

```tsx
// src/components/psalm-block.tsx:186
Дууллыг төгсгөх залбирал <PageRef page={psalm.psalmPrayerPage} />
```

→ 페이지 칩은 **legacy `psalmPrayerPage`** 에서 직접 옴. rich.json `page` 는 RichContent 에 전달되긴 하나 표시되는 칩은 legacy 값. 즉 단일 fix 로 두 카탈로그 모두 수정해야.

흥미롭게도 `rich-overlay.ts:305-306` 주석은 동일한 architectural limitation 을 `psalter-headers` 카탈로그에 대해 이미 인지하고 있음:

> "ref 당 다중 entries 가능 (한 시편이 4주 cycle 에서 여러 주차에 등장하면서 다른 patristic/typological preface 와 매핑). 현재 구현은 첫번째 entry 를 반환하는 간단한 lookup; 페이지 컨텍스트로 disambiguate 하는 확장은 후속."

→ 같은 패턴이 `psalter-texts` 의 psalm-prayer 에도 그대로 누적되어 있다.

## Recommended fix (peer-validated, A-normalized)

1. **Schema 확장** (`psalter-texts.json` + `psalter-texts.rich.json` 양쪽):
   ```json
   "Psalm 92:2-9": {
     "stanzas": [...],          // 그대로 (text 단일 SSOT)
     "psalmPrayer": "...",      // 그대로 (text 단일 SSOT)
     "psalmPrayerOccurrences": [
       { "week": "2", "dayKey": "SAT", "hour": "lauds", "psalmPrayerPage": 280 },
       { "week": "4", "dayKey": "SAT", "hour": "lauds", "psalmPrayerPage": 506 }
     ]
   }
   ```
   기존 `psalmPrayerPage` 단일 필드는 **첫 occurrence fallback** 으로 유지(backward-compat).

2. **Resolver 시그니처 확장** (`resolvePsalm` + `loadPsalterTextPsalmPrayerRich`):
   - `(entry, …, psalterContext: { week, dayKey, hour })` 추가
   - `psalmPrayerOccurrences[]` 배열에서 context 매칭으로 page 선택
   - 매칭 실패 시 첫 entry 또는 단일 `psalmPrayerPage` 로 graceful fallback

3. **Test anchor**: `src/lib/hours/resolvers/__tests__/psalm.test.ts` 에 W2-Sat-Lauds vs W4-Sat-Lauds 두 occurrence 모두 정확한 page 반환 vitest 추가 (Psalm 92:2-9 회귀 anchor).

4. **NFR-009d 확장**: `scripts/verify-psalter-pages.js` 가 multi-occurrence 시편의 occurrence 별 page 정합성도 검증하도록 enhancement (이번 audit 의 13건이 그대로 verifier seed).

5. **Migration order** (권장):
   - Phase 1: pilot (Psalm 92:2-9 만 schema 확장 + resolver context 통과 + 회귀 테스트)
   - Phase 2: 나머지 12+ multi-occurrence 시편 batch 이관
   - Phase 3: psalter-headers 카탈로그도 동일 shape 으로 통합 (rich-overlay.ts:305 후속 작업 합류)

대안 분석:
- **Option B (compound key per occurrence)**: 시편 prayer text 가 매 occurrence 마다 중복 저장 → drift risk + 용량. 비추천.
- **Option C (week-N.json 에 `psalmPrayerPage` override)**: 진실의 출처가 분산. 임시 마이그레이션 브릿지로는 가능하나 지속 가능 모델 아님.
- **Option D (충돌 시 page chip 숨김)**: UX 퇴행. fallback 으로만.

## Files referenced (read-only audit)

| Path | 역할 |
|------|------|
| `src/data/loth/psalter/week-1.json` ~ `week-4.json` | per-week 시편 occurrence 출현 |
| `src/data/loth/psalter-texts.json` | legacy 시편 본문 + psalmPrayer + psalmPrayerPage 카탈로그 (82 keys) |
| `src/data/loth/prayers/commons/psalter-texts.rich.json` | rich AST 카탈로그 + psalmPrayerRich.page (80 keys) |
| `src/lib/hours/resolvers/psalm.ts` | resolvePsalm — entry.ref flat lookup |
| `src/lib/hours/loaders.ts` | `loadPsalterTexts` |
| `src/lib/prayers/rich-overlay.ts` | `loadPsalterTextPsalmPrayerRich` (line 292) + 자매 카탈로그 deferred 주석 (line 305-306) |
| `src/lib/types.ts:629-630` | AssembledPsalm.psalmPrayerRich + psalmPrayerPage 타입 |
| `src/components/psalm-block.tsx:182-201` | 렌더러 — `<PageRef page={psalm.psalmPrayerPage} />` |
| `parsed_data/full_pdf.txt` | PDF 텍스트 추출본 (main repo 에서 cp) — line 9450~9550 (W2), line 17440~17550 (W4) |

## Peer evidence

- Provider: codex (research_methodologist)
- Exchange: `ex_20260502T130214Z_4cbbd497`
- Stance: APPROVED_WITH_ISSUES, confidence HIGH
- Key correction: 칩이 `psalter-texts.rich.json psalmPrayerRich.page` 가 아닌 **legacy `psalter-texts.json psalmPrayerPage`** 에서 직접 옴 (확인 완료)
- 추가 확장 권고: ordinarium/compline/invitatory/propers/sanctoral 도 후속 audit 대상

## Out of scope (handed back to leader)

- 실제 데이터 패치 (resolver/schema/migration) — solver/dev 대상 후속 task
- compline/daytime/sanctoral psalter reuse audit — 별도 sweep
- pilot W4 Sat Lauds Psalm 92 만 우선 패치할지, batch 13건 동시 패치할지 — leader 의사결정
