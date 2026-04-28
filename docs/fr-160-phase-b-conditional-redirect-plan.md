# FR-160-B Plan — Conditional Directives + Page-Redirects 데이터 모델

**작업명**: FR-160 Phase 1 B — inline conditional / page-redirect 루브릭 정합화 (~150–170 cells)
**Plan 작성**: planer (task #132, worktree `132-planer`)
**Plan 검증**: peer consensus (Codex execution_strategist, R1+R2+R3+R4 → consensus_reached at R4)
**Base**: main 155f17a (R1 시점) — 본 plan 작성 중 follow-up 4 commits 누적 (refrain A1/A2/A4/D)
**FR 번호**: FR-160-B (umbrella "rubric data model expansion", FR-160 sibling sub-suffix)

---

## 0. 한 줄 요약 (single-recommended-approach)

**ConditionalRubric + PageRedirect 두 type 을 PrayerText AST 외부에 추가하고, Layer 4 merge 직후 hydrate 단계로 처리한다. PRESENTATION 은 기존 AST 가, SEMANTICS 는 새 schema 가 담당.**

---

## 1. 배경 + 문제 진술

### 1.1 현재 상황

`docs/PRD.md` §12 (루브릭/교송 라벨링) 의 기존 FR 들은 **개별 케이스의 ad-hoc 보완** 으로 발전:

| FR | 캡슐 | 상태 |
|----|------|------|
| FR-126 | dismissal 루브릭 빨간색 | 완료 — UI 만 |
| FR-127 | invitatory.rubric: string | 완료 — `ordinarium/invitatory.json` 의 단일 string 필드 |
| FR-128 | gloriaPatri: boolean (Benedicite 송영 생략) | 완료 — 단일 boolean |
| FR-129 | alleluiaConditional: boolean (sanctoral 부활시기 Alleluia) | 완료 — 단일 boolean |
| FR-150 | intercessions versicle/response (red dash) | 완료 — UI 만 |
| FR-152 | responsory 6행 (red dash) | 완료 — 데이터 + UI |

이 모든 cover 는 단일 boolean / string 필드로 표현되며 **\"조건부 분기를 일반 표현하는 데이터 모델\"** 은 부재. PDF 원전에는 ~150–170 건의 inline rubric 지시문이 흩어져 있고 이들은 각각:

1. **조건부 지시문 (~80–100 unique, raw 119)** — assembly 분기 의미
2. **페이지 리다이렉트 (~70)** — ordinarium 본문을 페이지로 참조

기존 FR 6 건은 이 중 4 건을 단일 boolean 으로 cover; 나머지 ~150 건은 데이터에 미캡처 → **rendered output 에 누락**.

### 1.2 문제

- 사용자가 PDF 와 비교했을 때 "**X 의 자리에 Y 를 읽는다**" / "**송영을 생략한다**" / "**Магтуу: х. 879** 페이지로 가서 본문 읽는다" 같은 지시문이 **앱에 표시되지 않음**.
- 기존 ad-hoc 패턴 (boolean 필드 추가) 으로 ~150 건을 cover 하려면 ~150 새 FR 번호 + ~150 boolean — 유지보수 폭발.
- 의미 클래스 (조건부 vs 리다이렉트) 가 데이터 표현으로 구분 안 됨 → assembler 가 type-narrow 못 함.

### 1.3 영향도

**HIGH** — 사용자 측 assembly correctness. PDF 원형 재현도 직접 영향.

---

## 2. PDF 출현 분포 (실측)

`parsed_data/full_pdf.txt` (970 page markers, 2-up 분할) grep 결과 (planer worktree, 2026-04-27):

### 2.1 조건부 지시문

| 패턴 | raw count | rubric 추정 | false-pos 사유 |
|------|-----------|------------|----------------|
| `үл уншина` | 28 | 28 | (rubric 전용) |
| `татаж авна` | 35 | 35 | (rubric 전용) |
| `^Эсвэл:` 또는 `^Эсвэл, ` | 22 | 22 | (line-leading rubric) |
| 그 외 `Эсвэл` | 5 | 0 | 시편 본문 ("또는 …" 의문) |
| `Хэрэв ... таарвал` | 4 | 4 | (rubric 전용) |
| `оронд ` (전체) | 47 | ~25 | "X-н оронд Y" rubric vs psalm body "instead of" 양립 |
| **조건부 합계 (raw)** | **141** | **~114** | overlap 후 unique ~80–100 |

**Overlap pattern** (한 라인에 둘 이상):
- "Үүний оронд X-р дууллыг уншина" → `оронд` + (`уншина` ⊂ assembly 동사)
- "X-н оронд Эсвэл Y" → `оронд` + `Эсвэл`
중복 제거 후 unique conditional ~80–100 cells 추정.

### 2.2 페이지 리다이렉트

| 패턴 | count | 의미 |
|------|-------|------|
| `Магтуу: х. NNN` | 70 | dismissal blessing 페이지 참조 |
| 그 외 `... х. NNN.` (running header 포함) | ~141 | 본문 내 페이지 참조 (rubric 외 제외) |
| **redirect 합계 (rubric 의미)** | **~70** | (Магтуу 패턴) |

### 2.3 종합

| 종류 | unique 추정 |
|------|-----------|
| ConditionalRubric | ~80–100 |
| PageRedirect | ~70 |
| **합계** | **~150–170** ✓ dispatch '~170' 추정 일치 |

> **Note**: WI-A2 (rewrite tool) dry-run 에서 정확한 cardinality 가 확정. 본 plan 의 추정은 PR-time 에 ±10% 허용.

---

## 3. 기존 PARTIAL cover + 통합 전략

### 3.1 기존 단일 필드 cover

```ts
// invitatory.json 의 단일 string 필드 (FR-127)
"rubric": "95-р дууллын оронд дараах гурван дууллын аль нэгийг уншиж болно..."

// AssembledPsalm 의 단일 boolean (FR-128)
gloriaPatri: boolean

// HourPropers 의 단일 boolean (FR-129, sanctoral)
alleluiaConditional?: boolean
```

### 3.2 통합 전략

**기존 boolean/string 필드는 보존** (backward compatibility, 회귀 위험 회피). 신규 데이터는 **`conditionalRubrics: ConditionalRubric[]`** + **`pageRedirects: PageRedirect[]`** 두 새 필드로 추가. 기존 boolean 은 **추가** (additive only) — 마이그레이션 강제 안 함.

향후 (FR-160-C 또는 별건) 기존 boolean → ConditionalRubric 으로 리팩토 가능 (이 plan 외).

---

## 4. Schema (peer R1+R2 합의)

### 4.1 ConditionalRubric

```ts
// src/lib/types.ts 추가
export type ConditionalRubricAction = 'skip' | 'substitute' | 'prepend' | 'append'

export type ConditionalRubricSection =
  | 'invitatory' | 'openingVersicle' | 'hymn' | 'psalmody'
  | 'shortReading' | 'responsory' | 'gospelCanticle'
  | 'intercessions' | 'concludingPrayer' | 'dismissal'

export interface ConditionalRubricLocator {
  section: ConditionalRubricSection
  index?: number  // psalmody[i] 등 서수
}

export interface ConditionalRubricWhen {
  season?: LiturgicalSeason[]   // ['EASTER', 'CHRISTMAS']
  dayOfWeek?: DayOfWeek[]       // ['SUN']
  dateRange?: { from: string, to: string }   // "MM-DD" 포맷
  predicate?: 'isFirstHourOfDay' | 'isVigil' | 'isObligatoryMemorial'
}

export interface ConditionalRubricTarget {
  ref?: string                  // e.g. "Psalm 95:1-11"
  text?: string                 // 즉시 inline
  textRich?: PrayerText         // rich AST (rare)
  ordinariumKey?: string        // ordinarium 카탈로그 lookup
}

export interface ConditionalRubric {
  rubricId: string              // unique key, e.g. "easter-sun-lauds-skip-ps2"
  when: ConditionalRubricWhen
  action: ConditionalRubricAction
  target?: ConditionalRubricTarget   // substitute/prepend/append 시 mandatory
  appliesTo: ConditionalRubricLocator
  evidencePdf: { page: number, line?: number, text: string }   // PDF 원문 발췌 (verifier)
  liturgicalBasis?: string      // GILH §, 또는 전례력 출처
}
```

### 4.2 PageRedirect

```ts
export type PageRedirectOrdinariumKey =
  | 'benedictus' | 'magnificat' | 'nunc-dimittis'
  | 'dismissal-blessing' | 'compline-responsory'
  | 'common-prayers' | 'gloria-patri' | 'invitatory-psalms'
  | 'hymns'

export type PageRedirectSection =
  | 'invitatory' | 'hymn' | 'psalmody' | 'shortReading'
  | 'responsory' | 'gospelCanticle' | 'intercessions'
  | 'concludingPrayer' | 'dismissal'

export interface PageRedirect {
  redirectId: string                       // unique key
  ordinariumKey: PageRedirectOrdinariumKey
  page: number                             // PDF page
  label: string                            // PDF 라벨 (e.g. "Магтуу: х. 879")
  appliesAt: PageRedirectSection
  evidencePdf: { page: number, line?: number, text: string }
}
```

### 4.3 HourPropers 확장

```ts
// src/lib/types.ts — HourPropers interface
export interface HourPropers {
  // ... 기존 필드 그대로 ...
  conditionalRubrics?: ConditionalRubric[]
  pageRedirects?: PageRedirect[]
}
```

### 4.4 Validation (Zod)

```ts
// src/lib/schemas.ts
import { z } from 'zod'

export const conditionalRubricSchema = z.object({
  rubricId: z.string().min(1),
  when: z.object({
    season: z.array(z.enum(['ADVENT','CHRISTMAS','LENT','EASTER','ORDINARY_TIME'])).optional(),
    dayOfWeek: z.array(z.enum(['SUN','MON','TUE','WED','THU','FRI','SAT'])).optional(),
    dateRange: z.object({ from: z.string().regex(/^\d{2}-\d{2}$/), to: z.string().regex(/^\d{2}-\d{2}$/) }).optional(),
    predicate: z.enum(['isFirstHourOfDay','isVigil','isObligatoryMemorial']).optional(),
  }),
  action: z.enum(['skip','substitute','prepend','append']),
  target: z.object({
    ref: z.string().optional(),
    text: z.string().optional(),
    textRich: prayerTextSchema.optional(),
    ordinariumKey: z.string().optional(),
  }).optional(),
  appliesTo: z.object({
    section: z.enum(['invitatory','openingVersicle','hymn','psalmody','shortReading','responsory','gospelCanticle','intercessions','concludingPrayer','dismissal']),
    index: z.number().int().min(0).optional(),
  }),
  evidencePdf: z.object({ page: z.number().int(), line: z.number().int().optional(), text: z.string() }),
  liturgicalBasis: z.string().optional(),
})
.refine(
  (rubric) => rubric.action === 'skip' || rubric.target !== undefined,
  { message: "non-skip action requires target", path: ['target'] },
)

export const pageRedirectSchema = z.object({
  redirectId: z.string().min(1),
  ordinariumKey: z.enum(['benedictus','magnificat','nunc-dimittis','dismissal-blessing','compline-responsory','common-prayers','gloria-patri','invitatory-psalms','hymns']),
  page: z.number().int().min(1).max(969),
  label: z.string().min(1),
  appliesAt: z.enum(['invitatory','hymn','psalmody','shortReading','responsory','gospelCanticle','intercessions','concludingPrayer','dismissal']),
  evidencePdf: z.object({ page: z.number().int(), line: z.number().int().optional(), text: z.string() }),
})
```

**Validation gate**: build-time fail-hard. `scripts/verify-conditional-rubrics.js` + `scripts/verify-page-redirects.js` 가 모든 propers/sanctoral JSON 의 새 필드를 zod 로 parse. 실패 시 exit 1 (CI gate 가능).

### 4.5 Hydrate 흐름

```ts
// src/lib/loth-service.ts — 기존 Layer 4 merge 직후

// Layer 4: rich overlay merge (기존)
// ↓ NEW Layer 4.5: conditional + redirect resolution
mergedPropers = applyConditionalRubrics(mergedPropers, {
  season: day.season, dayOfWeek, dateStr, hour, isFirstHourOfDay,
})
mergedPropers = applyPageRedirects(mergedPropers, ordinariumIndex)
```

`applyConditionalRubrics` — `mergedPropers.conditionalRubrics?` 를 evaluate:
- when 매치 → action 적용 (skip → 해당 section 제거 / substitute/prepend/append → target 인라인)
- when 미매치 → 무시 (rubric 자체는 데이터에 남음, 결정성 회귀 가드 위해)

`applyPageRedirects` — `mergedPropers.pageRedirects?` 를 evaluate:
- ordinariumKey 가 ordinarium catalog 에 존재 → 해당 page 의 본문을 hydrate → mergedPropers 의 적절한 필드 (e.g. `concludingPrayer`) 채움
- ordinariumKey 미존재 → fail-hard (zod validation 에서 차단되어야 하지만 catalog 변경 시 runtime guard)

---

## 5. Sub-WI 분해 (5 unit)

### 5.1 B1 — Schema + Types + Zod validator

**복잡도**: HIGH | **권장 멤버**: solver
**산출물**:
- `src/lib/types.ts` — 5 새 type 추가 (ConditionalRubric*, PageRedirect*, HourPropers 확장)
- `src/lib/schemas.ts` — 2 zod schema (conditionalRubricSchema, pageRedirectSchema)
- `src/lib/__tests__/schemas.test.ts` — schema unit (positive/negative path)
- `scripts/verify-conditional-rubrics.js` — JSON file 검증 CLI
- `scripts/verify-page-redirects.js` — JSON file 검증 CLI

**AC** (7항):
1. 새 type 5 종 모두 export, tsc 통과 (`npx tsc --noEmit` 0 errors)
2. zod schema 가 valid case PASS / invalid case (action='substitute' 인데 target 없음 등) FAIL
3. propers/sanctoral JSON 5 시즌 + 4 sanctoral 모두 zod parse PASS (현재 conditionalRubrics/pageRedirects 필드 없으므로 미터치 — 빈 배열 허용)
4. assembleHour 결정성 무영향 (현재 propers 데이터 미터치 → 시간/날짜별 sections 출력 byte-equal)
5. e2e 무영향 (기존 e2e 통과)
6. unit test ADEQUATE 비율 ≥ 90% (positive + negative + field-level 3-point)
7. `@fr FR-160-B-1` 태그, PRD §12 행 신설, traceability matrix 갱신

### 5.2 B2 — PageRedirect + Ordinarium Loader Auto-Link

**복잡도**: MEDIUM | **권장 멤버**: solver / member-01
**산출물**:
- `src/lib/hours/page-redirect-resolver.ts` — `applyPageRedirects(propers, ordinariumIndex)` 헬퍼
- `src/lib/loth-service.ts` — Layer 4.5 wiring (applyPageRedirects 호출)
- `src/lib/__tests__/hours/page-redirect-resolver.test.ts` — unit
- ordinarium key catalog: `src/data/loth/ordinarium-key-catalog.json` (key → page 매핑)

**AC** (7항):
1. 새 helper export, schema 호환
2. ordinariumIndex 미일치 ordinariumKey 입력 → fail-hard (throw Error with key context)
3. 기존 propers JSON 무영향 (pageRedirects 미마킹 상태 → noop)
4. assembleHour 결정성 무회귀
5. e2e 무영향
6. unit ADEQUATE ≥ 90% (8 매치 케이스 + 4 미매치 케이스)
7. `@fr FR-160-B-2` 태그

### 5.3 B3 — Rewrite Tool + 1차 Marking (시즌별 5 PR + sanctoral 1 PR)

**복잡도**: HIGH | **권장 멤버**: member-01 (FR-156 Phase 5 propers JSON rewrite 경험)
**산출물**:
- `scripts/mark-conditional-rubrics.js` — PDF excerpt (`parsed_data/full_pdf.txt`) → JSON 마킹 도구
  - flags: `--season=<advent|christmas|lent|easter|ordinary-time|all>` `--sanctoral` `--dry-run` `--verify`
  - input: PDF 패턴 매처 (regex) + 매뉴얼 mapping table (`scripts/data/conditional-rubric-mapping.json`)
  - output: propers/sanctoral JSON 의 conditionalRubrics/pageRedirects 필드 add-only
- `scripts/data/conditional-rubric-mapping.json` — PDF 라인 → ConditionalRubric/PageRedirect 매핑 (검토자 친화)
- `scripts/verify-conditional-rubric-coverage.js` — PDF mention count vs JSON conditional count 정합 (cardinality drift 방지)

**AC** (7항):
1. dry-run 모드 정확 (변경 없이 리포트만 출력)
2. propers 시즌 5 + sanctoral 1 = 6 sub-PR 분할
3. NFR-009d byte-equal verifier (verify-{propers,sanctoral}-pages.js) 무회귀
4. assembleHour 결정성 — 마킹 후에도 conditional 의 when 미매치 시 sections 동일
5. e2e 무영향 (when 미매치 케이스만 e2e 가 cover; 매치 케이스는 B5)
6. unit ADEQUATE ≥ 90%
7. `@fr FR-160-B-3` + 시즌별 sub-PR commit 메시지

### 5.4 B4 — assembleHour 분기 + applyConditionalRubrics 헬퍼

**복잡도**: HIGH | **권장 멤버**: solver (loth-service 경험)
**산출물**:
- `src/lib/hours/conditional-rubric-resolver.ts` — `applyConditionalRubrics(propers, ctx)` 헬퍼
- `src/lib/loth-service.ts` — Layer 4.5 wiring 확장 (applyConditionalRubrics + applyPageRedirects)
- `src/lib/__tests__/hours/conditional-rubric-resolver.test.ts` — dispatch matrix test (시즌×day 조합)

**AC** (7항):
1. when 평면 객체 모든 필드 (season/dayOfWeek/dateRange/predicate) 정확 매치
2. action 4 종 (skip/substitute/prepend/append) 모두 정확 적용
3. propers JSON 마킹 후 e2e 시나리오 (각 conditional 별 매치/미매치 양면) PASS
4. assembleHour 결정성 — 동일 입력 → 동일 sections (deep equal)
5. e2e 신규 7 케이스 (시즌별 1 + sanctoral) 통과
6. unit ADEQUATE ≥ 90%
7. `@fr FR-160-B-4` + 회귀 가드 명시

### 5.5 B5 — E2E + Unit + Dispatch Matrix Test

**복잡도**: MEDIUM | **권장 멤버**: divine-tester (Playwright 전담)
**산출물**:
- `e2e/conditional-rubric-easter.spec.ts` — Easter 시기 conditional 전수
- `e2e/conditional-rubric-advent.spec.ts` — Advent 의 dateRange 매치
- `e2e/conditional-rubric-sanctoral.spec.ts` — sanctoral 12-25 부활 Alleluia 등
- `e2e/page-redirect.spec.ts` — Магтуу 페이지 redirect 시 본문 hydrate 검증
- `src/lib/__tests__/hours/dispatch-matrix.test.ts` — 시즌×day×시간 매트릭스 (vitest)

**AC** (7항):
1. e2e 4 spec, 각 spec ≥ 4 케이스 (총 ≥ 16)
2. dispatch matrix unit ≥ 35 케이스 (5 시즌 × 7 day × 1 hour)
3. 모든 conditional 별 매치 / 미매치 양면 시나리오
4. PageRedirect hydrate 후 본문이 ordinarium 페이지의 텍스트와 byte-equal
5. ADEQUATE ≥ 90% (positive + negative + field-level)
6. 회귀 — 기존 e2e + vitest 무회귀
7. `@fr FR-160-B-5` 태그 + PRD §12 행에 e2e 케이스 카운트 갱신

---

## 6. Sub-WI DAG + 의존성

```
            ┌── B2 (Page Redirect Loader)
            │      │
B1 (Schema) ┤      ├── B4 (assembleHour 분기) ── B5 (E2E + Unit)
            │      │
            └── B3 (Rewrite Tool + 1차 Marking) ── (B4 의 입력)
```

**Critical path**: B1 → B3 → B4 → B5 (B3 의 마킹이 B4 의 분기 검증 필수 입력)
**Parallel windows**:
- B1 완료 후: B2 와 B3 병렬 가능 (둘 다 schema 의존, 서로 독립)
- B3 의 시즌별 sub-PR 6개 중 advent/christmas/lent/easter/ordinary-time 5개 병렬 가능 (sanctoral 은 후순위)
- B4 는 B2+B3 모두 머지 후 시작 (B3 의 마킹 + B2 의 redirect resolver 모두 필요)
- B5 는 B4 후 단일 PR

**PR 분할 권고** (peer R3 합의):
- **PR 1**: B1+B2 (schema + redirect loader) — 검증 가능한 isolated 단위
- **PR 2~7**: B3 의 시즌별 5 sub-PR + sanctoral 1 sub-PR (rewrite tool 은 PR 2 에 포함)
- **PR 8**: B4 (assembleHour 분기)
- **PR 9**: B5 (E2E + Unit)

총 **9 PR 흐름**, mega-PR 회피.

---

## 7. AC 7항 — 모든 sub-WI 균질 적용

| AC | 검증 방법 | 모든 sub-WI 적용 여부 |
|----|-----------|--------------------|
| AC-1 schema validation | zod runtime + build-time fail-hard | 모두 |
| AC-2 loader contract | ordinariumKey 미존재 → fail-hard | B2/B4 (schema 외 wiring 멤버) |
| AC-3 propers JSON 적합 | NFR-009d byte-equal verifier | B3/B4/B5 (JSON 영향 멤버) |
| AC-4 assembleHour 결정성 | deep equal sections (시즌×day 매트릭스) | 모두 |
| AC-5 e2e 시즌-day 동작 | Playwright 매치/미매치 양면 | B4/B5 (assembly 영향 멤버) |
| AC-6 회귀 가드 | vitest + 기존 e2e 비회귀 | 모두 |
| AC-7 트레이서빌리티 | `@fr FR-160-B-{i}` 태그 + PRD §12 + matrix 갱신 | 모두 |

---

## 8. Risk Register

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|-----------|-----------|
| R-1 | **Silent miss** — when 매치 잘못되어 conditional 이 잘못 발화/미발화 (사용자 인지 불가) | CRITICAL | MEDIUM | (a) zod strict locator validation (action='substitute' → target 강제), (b) unresolved hit fail-hard (ordinariumKey 미일치 throw), (c) dispatch matrix test ≥35 케이스 (5시즌×7day), (d) e2e fixture-based diff (각 conditional 매치/미매치 양면) |
| R-2 | **Cardinality drift** — PDF mention 170 vs JSON marking 카운트 불일치 (rewrite tool 누락/중복) | HIGH | MEDIUM | (a) `scripts/verify-conditional-rubric-coverage.js` PDF count vs JSON count 게이트, (b) dry-run mode 의 cardinality 리포트, (c) overlap 라인 (`оронд` + `Эсвэл` 동시) 식별 + 단일 ConditionalRubric 으로 표현 |
| R-3 | **ordinariumKey 누락** — page-redirect destination 이 ordinarium 카탈로그에 없는 페이지 | HIGH | LOW | (a) zod enum 으로 9 fixed key 잠금, (b) `src/data/loth/ordinarium-key-catalog.json` build-time 적합성 검증, (c) 키 추가 시 PR 분리 + reviewer 가이드 |
| R-4 | **Round-trip drift** — JSON 의 evidencePdf.text vs PDF 원문 byte-equal 손실 (e.g. NBSP, curly quote) | MEDIUM | MEDIUM | (a) `normaliseForGate` 정규화 후 byte-equal (FR-153 패턴 재사용), (b) `evidencePdf.line` 필드로 로케이터 명확, (c) verifier 가 PDF 원문 vs evidencePdf.text 비교 |
| R-5 | **E2E cardinality explosion** — 시즌×day×시간 조합 폭증 (5×7×3 = 105 케이스 이론치) | MEDIUM | HIGH | (a) table-driven test (per conditionalRubric: minimum 2 케이스), (b) Playwright fixture sharding, (c) dispatch matrix unit (vitest) 가 시즌×day, e2e 는 visual / interaction 만 |
| R-6 | **schema migration 실패** — 기존 propers JSON 5 시즌 / 4 sanctoral 의 zod parse fail (예상치 못한 필드 조합) | LOW | LOW | (a) B1 의 AC-3 — 현재 propers JSON 모두 zod PASS, (b) 새 필드 (conditionalRubrics/pageRedirects) optional 이므로 noop, (c) 시즌별 PR 분할로 영향 격리 |
| R-7 | **plan author = verifier 안티패턴** — planer 가 sub-WI 코딩 직접 수행 시 회귀 가드 격리 손상 | (조직) | (운영) | planer 는 본 plan 외 작업 거부 (fitness pushback 채널). sub-WI 코딩은 solver / member-01 / divine-tester 에게 별건 dispatch (peer R3 합의) |

---

## 9. WI-D Cleanup (sub-WI 외 마무리)

이 plan 의 마지막 PR (PR-9 또는 별건 마무리 PR) 에서 처리:

1. **PRD §12 갱신** — FR-160-B 행 신설:
   - ID: `FR-160-B`
   - 요구사항: "**Inline conditional + page-redirect 데이터 모델**: ..." (사용자 친화 요약 + 5 sub-WI 링크)
   - 모듈: `데이터 / 파이프라인 / UI`
   - 우선순위: P1
   - 상태: 진행/완료
2. **traceability-matrix.md 갱신** — FR-160-B-1..5 행 추가, 각 sub-WI 의 산출 파일 + 테스트 ID 매핑
3. **`@fr` 태그 점검** — `node scripts/generate-test-fr-map.mjs --check` 가 0 missing 으로 통과
4. **page coverage 영향 평가** — `scripts/audit-page-coverage.js` 실행. PageRedirect 가 page coverage 와 별 카테고리 (NFR-009a 임계값과 충돌 없음 확인)
5. **신규 verifier CI 등록** — `verify-conditional-rubrics.js`, `verify-page-redirects.js`, `verify-conditional-rubric-coverage.js` 3 개를 GitHub Actions / CI 파이프라인에 추가
6. **ordinarium-key-catalog.json 신설** — B2 의 산출물이지만 cleanup 단계에서 PRD §7 등 구현 상세에 위치 명시
7. **scripture-ref-parser 영향 평가** — bare-ref / page-redirect 는 별 path → parser 무수정 (FR-156 Phase 5 와 동일)

---

## 10. SW / CACHE_VERSION / 모바일 검토

### 10.1 CACHE_VERSION bump 결론: **불필요** (peer R4 합의)

근거 (CLAUDE.md "Service Worker 캐시" 섹션 기준):
- `public/sw.js` 의 PRECACHE_URLS = `[OFFLINE_URL, '/icon.svg']` — JSON data 미포함
- `src/data/loth/*.json` 변경 → Next.js webpack 이 hash-based filename 으로 chunk 생성 → URL 변경되어 cache-first 분기에서 자동 cache miss
- SW 자체 로직 변경 0
- public/ 자산 변경 0
- 정적 자산 경로 / 프리캐시 대상 / SW 로직 어느 항목도 트리거 안 됨

### 10.2 링크 / Content-Type / 라우트 변경 결론: **없음**

- 새 라우트 추가 없음
- 기존 페이지 (`/`, `/settings`, `/pdf/[page]`) 의 링크 스키마 변경 없음
- `<Link>` href / target / rel 무수정
- 응답 Content-Type 무변경 (HTML 그대로)

→ **CLAUDE.md "링크·자산 스키마가 바뀌는 PR" 수동 체크리스트 미적용**.

### 10.3 모바일 수동 체크리스트 (B5 머지 직전 권장)

assembly correctness 가 사용자 인지 영역이므로 디바이스 실시현 권장:
- [ ] iOS Safari — Easter 시기 일요일 lauds 의 Alleluia conditional rubric 정상 표시
- [ ] Android Chrome — Advent 12-17~24 dateRange 매치 시 dec24 분기 정상
- [ ] DevTools Network throttle = Slow 3G — page redirect 의 ordinarium 본문 hydrate 시각

---

## 11. Migration Cardinality 추정 (peer R4 합의)

| 종류 | unique 추정 | 신뢰도 |
|------|-----------|--------|
| ConditionalRubric | 80–100 | ±10% |
| PageRedirect | 70 | ±5% (Магтуу 패턴 명확) |
| **합계** | **150–170** | (dispatch '~170' 일치) |

**확정 시점**: B3 의 dry-run 모드 첫 실행. PR 시점에 정확한 카운트 발표.

---

## 12. Decision Record (peer consensus)

- **Topic**: FR-160-B conditional + page-redirect 데이터 모델
- **Decision**: Option B (분리 schema, AST 외부) — ConditionalRubric + PageRedirect 두 type, Layer 4 merge 직후 hydrate, Zod build-time fail-hard
- **Claude stance**: APPROVED_WITH_ISSUES (R1) → APPROVED_WITH_ISSUES (R2) → APPROVED_WITH_ISSUES (R3, CACHE_VERSION dispute) → AGREE (R4)
- **Peer stance**: APPROVED_WITH_ISSUES (R1) → APPROVED_WITH_ISSUES (R2) → APPROVED_WITH_ISSUES (R3) → AGREE (R4, CACHE_VERSION 동의)
- **Rounds**: 4 (minimum_rounds=4 for "complex")
- **Outcome**: consensus_reached at R4
- **Critical decisions**:
  - Q-R2.2 action enum: skip/substitute/prepend/append (selector 보류, 별건 FR)
  - Q-R3.4 CACHE_VERSION: 불필요
  - Q-R3.5 FR 번호: FR-160-B (sibling sub-suffix)
  - Q-R3.6 권장 멤버: solver (B1, B2, B4), member-01 (B3), divine-tester (B5)

---

## 13. 다음 단계

1. **본 plan 머지 후** — leader 가 sub-WI dispatch (B1 부터 순차):
   - WI-B1: solver (schema + types + zod + verifier) → PR 1
   - WI-B2: solver / member-01 (page redirect loader) → PR 1 에 포함 또는 별 PR
   - WI-B3: member-01 (rewrite tool + 시즌별 5 sub-PR + sanctoral 1) → PR 2~7
   - WI-B4: solver (assembleHour 분기) → PR 8
   - WI-B5: divine-tester (e2e + dispatch matrix) → PR 9
2. **planer 본인은 sub-WI 코딩 거부** — owner=verifier 안티패턴 (R7), fitness pushback. 단 후속 plan 정합성 보조 검증 (예: B3 의 propers diff 가 schema 와 정합인지 review) 호출 시 즉응.
3. **분기점**: B3 의 cardinality 가 추정 ±10% 초과 시 plan revisit (별건 R5 round 또는 추가 dispatch).

---

**End of Plan**
