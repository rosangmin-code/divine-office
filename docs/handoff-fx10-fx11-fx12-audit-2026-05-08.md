# F-X10 + F-X11 + F-X12 통합 audit (#369/#370/#371)

**Tasks**: #369 (F-X10) + #370 (F-X11) + #371 (F-X12) | **Member**: divine-researcher (Explore, read-only)
**SHARD**: targeted (audit-only) | **isolation**: shared
**Reported by**: 사용자 (2026-05-08) — PDF 책 페이지 153 (Psalm 46:2-12 + 토요일 저녁기도) 기반 3 회귀 보고

## TL;DR

| 회귀 | scope | root cause | 권고 |
|------|-------|------------|------|
| **F-X10** wrap 미분류 | 96 phrase-injected refs 중 **42 (44%)** ALL single-line. 전체 2476 phrases 중 wrap-merged **179 (7.2%)** | extractor `WRAP_DELTA=3` 자체는 정상이나, 실제 데이터에는 wrap 거의 없음 (builder 의 `lines.length` strict match 또는 R-9 handler 가 wrap 평탄화한 의혹). PILOT Psalm 110:1-5,7 마저 multi-line phrase 0개 | Option C — diagnostic re-run (sample 5건 extractor 직접 실행) → root cause 확정 → builder 또는 R-9 handler 수정 + Phase 1 batch 재주입 |
| **F-X11** paragraph 구분 미구현 | `kind:'stanza'` 블록의 inner paragraph 분기 unsupported. extractor 가 single+ blanks 를 stanza boundary 로 동일 처리 | schema 차원 gap (PrayerBlock 에 kind:'paragraph' 또는 stanza 내 sub-group 부재). pdftotext-layout 출력의 row-level blank 가 column-split 후 1-blank 로 collapse | Option B (recommended) — extractor `splitIntoStanzas` 가 2+ consecutive blanks 를 STANZA-BREAK, 1-blank 를 PARAGRAPH-BREAK 로 구별. Schema 에 paragraph hint 추가 (예: `block.paragraphBoundaries: number[]`) |
| **F-X12** 응답구절 italic | structured `petitions[]` path 의 response 가 plain (`<div data-role="intercessions-response">`). legacy `intercessions: []` flat path 도 plain. PDF 의 italic 정보 보존 데이터 경로 부재 | renderer 는 `PrayerSpan.emphasis = ['italic']` 지원. 하지만 intercession 데이터가 emphasis 안 옮김 — week-N.json 의 `intercessions: []` 는 string 배열 (메타 정보 없음) | Option C — (a) renderer 에서 response 줄에 italic class 추가 (단순), (b) data layer 에 italic flag (per petition response) 추가 + builder 가 PDF italic 라인 식별 (정밀) |

---

## §1. F-X10 — PDF 들여쓰기 wrap continuation 미분류

### 1.1 사용자 reported 사례 (재현)

PDF 책 페이지 153 (physical 77 right column) — Psalm 46:2-12:

**PDF verbatim** (`pdftotext -layout public/psalter.pdf -f 76 -l 78`, right column 추출):
```
Тэнгэрбурхан, бидний хоргодох газар ба хүч,    ← col 53 (baseline)
Зовлон шаналан дунд үнэхээр олддог тусламж.    ← col 53
Дэлхий өөрчлөгдөхөд ч,                          ← col 53
Далайн зүрх рүү уулс нуран ороход ч             ← col 53 (PHRASE START)
   бид айхгүй.                                  ← col 56 (= baseline+3 = WRAP)
Ус хүрхрэн хөөсрөхөд ч,                         ← col 53 (next phrase)
Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.       ← col 53
```

**현재 데이터** (`psalter-texts.rich.json` Psalm 46:2-12 stanzasRich.blocks[0]):
```
phrase 3 indent=0 range=[3,3]: "Далайн зүрх рүү уулс нуран ороход ч"
phrase 4 indent=0 range=[4,4]: "бид айхгүй."        ← SEPARATE phrase (잘못)
phrase 5 indent=0 range=[5,5]: "Ус хүрхрэн хөөсрөхөд ч,"
```

PDF 가 명백히 wrap (col 56 = baseline+3 = WRAP_DELTA) 인데 data 는 phrase 분리.

### 1.2 Scope (전수)

`psalter-texts.rich.json` 전체 sweep:
- **125 psalms (refs)** — 372 stanza-blocks
- **215 stanza-blocks** with phrases injected (`block.phrases` 존재)
- **2476 total phrases**
  - **multi-line (wrap detected)**: 179 (7.2%)
  - **single-line (no wrap)**: 2297 (92.8%)
- **42 psalms WITH phrases but ALL single-line** — wrap detection 0회 발동
- **54 psalms with at least one multi-line phrase** — extractor 부분 동작

#### 1.2.1 ALL single-line psalms (42건) — sample 25개

```
Psalm 63:2-9    : 26 phrases   (all single-line)
Psalm 149:1-9   : 25 phrases   (all single-line)
Psalm 110:1-5, 7: 21 phrases   (all single-line) ← FR-161 R-7 PILOT
Psalm 8:2-10    : 27 phrases   (1 multi-line! sole exception in pilot triplet)
Revelation 19:1-7: 25 phrases  (all single-line)
1 Chronicles 29:10-13: 20 phrases
Psalm 19:2-7    : 17 phrases
Psalm 119:145-152: 26 phrases
Psalm 27:1-6    : 32 phrases
Psalm 32:1-11   : 36 phrases
Isaiah 45:15-26 : 49 phrases
Psalm 100:1-5   : 18 phrases
Psalm 46:2-12   : 31 phrases   (사용자 보고 ref)
Psalm 131:1-3   : 5 phrases
Psalm 132:1-10  : 24 phrases
Psalm 117:1-2   : 6 phrases
Psalm 116:10-19 : 21 phrases
Psalm 122:1-9   : 19 phrases
Psalm 130:1-8   : 19 phrases
Philippians 2:6-11: 18 phrases
Psalm 150:1-6   : 19 phrases
Psalm 43:1-5    : 23 phrases
Psalm 49:1-13   : 30 phrases
Isaiah 12:1-6   : 12 phrases
Psalm 72:1-11   : 28 phrases
Psalm 121:1-8   : 16 phrases
… (+17 more)
```

**중요**: FR-161 R-7 PILOT (Psalm 110:1-5,7) 도 multi-line phrase 0개. R-7 통과 시점 (2026-04-?) 에는 wrap merge 가 작동했을 가능성 — 그 후 R-9.A/B/C/D/E 핸들러 또는 R-12 (column-merge artifact fix) 가 retroactively 평탄화한 의혹. git blame 추가 조사 필요.

### 1.3 Root cause (코드 분석)

**Extractor**: `scripts/parsers/extract-phrases-from-pdf.mjs:228-257` (`runStage1`):
```js
const expectedWrapRel = current.indent * PHRASE_INDENT_STEP + WRAP_DELTA  // = 0*6 + 3 = 3
if (Math.abs(rel - expectedWrapRel) <= WRAP_TOLERANCE) {                  // tol=1
  current.lineRange[1] = i  // wrap merge
  continue
}
```
- `WRAP_DELTA = 3`, `WRAP_TOLERANCE = 1`, `PHRASE_INDENT_STEP = 6`
- 로직 자체는 정확. PDF 의 baseline+3 wrap 패턴을 정확히 capture 해야 함.

**Builder**: `scripts/build-phrases-into-rich.mjs:24-35`:
```
c. require `extractorStanza.lines.length === richBlock.lines.length`
   — otherwise the rich.json has pre-joined wraps that PhraseGroup
   `lineRange` would mis-index. Mismatch → atomic rejection
```
- 빌더는 stanza line count 가 일치해야만 inject. **만약 rich.json 의 stanza 가 이미 wrap-pre-joined 되어 있으면 phrase 가 inject 안됨**. 하지만 inject 안되면 phrase 자체가 없어야 함 — 우리는 phrase 가 있으나 single-line.
- 이는 **inject 는 됐는데 wrap 정보가 사라짐** 패턴. extractor 가 stage1 출력 시 wrap 을 못 잡았거나 (baseline detection 실패), 또는 후속 R-9 handler 가 phrase[] 를 line-by-line 으로 retroactively 재작성한 의혹.

**`detectBaselineCol` 의존성**: `extract-phrases-from-pdf.mjs:131-147`:
- baseline = "smallest leading-whitespace count >=2 occurrences and >0"
- 만약 column splitter (`splitColumns`) 가 column-aware 잘 못 자르면 left/right column 이 섞여서 baseline 이 잘못 잡힘 — 그러면 wrap=baseline+3 검출 실패
- 또는 PDF 가 짧은 시편 (e.g. Psalm 117:1-2 = 6 lines) 일 때 wrap 이 1번 뿐이면 `count >= 2` 조건에 안 걸려서 baseline 이 wrap-line 을 baseline 으로 오인식

### 1.4 권고 — Option C (diagnostic + targeted fix)

1. **Diagnostic phase** (BLOCKING — root cause 확정 전 fix 안함):
   - 5 sample refs (Psalm 110:1-5,7 / Psalm 46:2-12 / Psalm 8:2-10 / Psalm 117:1-2 / Psalm 32:1-11) 에 대해 extractor 직접 실행 → 출력 phrases[] 가 multi-line 인지 확인
   - 만약 extractor 출력이 multi-line 이면 → 빌더 또는 R-9 handler 가 wrap 정보 손실. git blame 으로 어느 commit 이 평탄화했는지 식별.
   - 만약 extractor 출력 자체가 single-line 이면 → baseline detection / dropSpuriousBlanks / splitColumns 중 하나가 PDF column-aware 처리 실패. column splitter 로 right column 만 떼어낸 raw output 을 비교.
2. **Fix phase** (root cause 별):
   - Case A (handler regression): 해당 handler 의 wrap-flatten 로직 식별 + 제거. invariant test 추가 (sample ref 의 multi-line phrase count >= 1).
   - Case B (extractor regression): baseline detection 강화 (mode-of-minimums 외 fallback 추가, 짧은 시편의 1-회 wrap 도 detect).
   - Case C (column splitter regression): pdftotext-column-splitter.mjs 검증 + 수정.
3. **Re-injection phase**: 96 refs 의 phrase 를 builder 로 dry-run → diff 확인 → land. NFR-009j (verify-phrase-coverage) 가 wrap-rate >= X% 가드.
4. **Test gate**: invariant `pilot Psalm 110:1-5,7 has >=1 multi-line phrase` (R-7 회귀 방지).

**Effort 추정**: Diagnostic LOW (1-2 시간). Fix MEDIUM-HIGH (root cause 에 따라 변동). Re-injection LOW (script 재실행). 총 MEDIUM.

---

## §2. F-X11 — 이중 줄바꿈 paragraph 구분 미구현

### 2.1 사용자 reported 사례

PDF 책 페이지 153 — "чичрэхэд ч айхгүй" 다음 더 큰 간격 (paragraph break), "хүчит цайз." 다음에도 동일.

**PDF verbatim** (right column, 행 단위):
```
44: Далайн зүрх рүү уулс нуран ороход ч
45:    бид айхгүй.
46: Ус хүрхрэн хөөсрөхөд ч,
47: (blank — left col 만 content)
48: Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.
49: (blank)
50: Түг түмдийн ЭЗЭН бидэнтэй хамт
51: Иаковын Тэнгэрбурхан бидний хүчит цайз.
52: (blank)
53: Тэнгэрбурханы хотыг,
```

**현재 데이터**: Psalm 46:2-12 → 2 blocks (29-line + 2-line refrain). 하지만 PDF 시각적으로는 여러 stanza 그룹 (각 verse-cluster + refrain 패턴):
- Verse 그룹 1: lines 1-2 (Тэнгэрбурхан, бидний... + Зовлон шаналан...)
- Verse 그룹 2: lines 3-7 (Дэлхий... + 후속)
- **Refrain**: Түг түмдийн ЭЗЭН + Иаковын Тэнгэрбурхан (예상 별도 stanza)
- Verse 그룹 3 + Refrain 반복...

→ 현재 1개 거대 block 으로 평탄화됨.

### 2.2 Root cause

**Schema gap**: `src/lib/types.ts:130-135`:
```ts
| { kind: 'para'; spans: PrayerSpan[]; indent?: 0 | 1 | 2 }
| {
    kind: 'stanza'
    lines: { spans: PrayerSpan[]; indent: 0 | 1 | 2; role?: 'refrain' | 'doxology' }[]
    phrases?: PhraseGroup[]
  }
```
- `kind: 'stanza'` 는 lines[] flat 배열. **stanza 안에 inner paragraph 그룹 표현 없음**.
- 다중 stanza = 다중 block. 하지만 현재 builder/extractor 가 PDF 의 paragraph 분기를 stanza boundary 로 변환 안함.

**Extractor**: `extract-phrases-from-pdf.mjs:201-216` (`splitIntoStanzas`):
```js
for (const line of columnLines) {
  if (line.trim().length === 0) {
    if (current.length > 0) {
      stanzas.push(current)  // 1번 blank 도 boundary
      current = []
    }
  } else {
    current.push(line)
  }
}
```
- 1 blank = stanza boundary. 2+ blank 도 같은 boundary (collapsed).

**Column splitter side effect**: pdftotext-layout 에서 right column 의 "blank row" 는 LEFT column 에 content 있는 row 일 때 발생. Single 1-row blank 는 column-split artifact (다른 column 만 content), 2-row blank 는 진짜 paragraph break — 하지만 splitIntoStanzas 는 둘을 구별 안함. 게다가 `dropSpuriousBlanks` (165-191) 는 wrap-aligned next 라인 앞의 blank 만 drop — paragraph break 는 baseline-aligned next 앞이므로 안 drop, 즉 stanza boundary 로 처리.

→ **결과**: 모든 blank (single + double) 가 stanza boundary 로 해석됨. PDF paragraph 분기가 stanza 분기로 매핑. 하지만 actual rich.json 결과는 단일 거대 block (Psalm 46 의 29-line block) — 이는 column-split 후 right column 에 blank row 가 충분히 안 들어왔다는 뜻 (left column 이 항상 content 있어서 right col 의 paragraph blank 는 1 line 내로 압축).

### 2.3 권고 — Option B (extractor + schema 보강)

1. **Extractor 수정**: `splitIntoStanzas` 가 consecutive blank 개수 추적. 1-blank = paragraph boundary (within stanza), 2+-blank = stanza boundary (between stanzas).
2. **Schema 확장**: stanza block 에 `paragraphBoundaries?: number[]` (line index 배열) 추가. 또는 별도 `kind: 'paragraph'` block 도입.
3. **Renderer**: `psalm-block.tsx:43-134` 가 paragraphBoundaries 에 따라 within-stanza spacing 추가 (e.g. `mt-4` between paragraphs vs stanza boundary `mt-6` between blocks).
4. **Builder**: 새 schema field 매핑 추가.
5. **Re-extraction**: 96 phrase-injected refs + 추가 paragraph-aware refs 재생성.

**Alternative — Option A (minimal)**: extractor 만 수정하여 2+-blank → stanza boundary 로 land (paragraph→stanza upgrade). 불필요한 fragmentation 위험 (PDF 의 inter-paragraph blank 가 정확히 2 row 안 되는 경우 false negative). 하지만 schema 변경 회피.

**Effort 추정**: Option B MEDIUM-HIGH (schema + extractor + builder + renderer + re-inject). Option A LOW-MEDIUM (extractor only + re-inject).

---

## §3. F-X12 — гуйлтын залбирал 응답구절 italic 미반영

### 3.1 사용자 reported 사례

Гуйлтын залбирал (intercession) 의 "...залбирцгаая" (let us pray) 다음 반복구절 (응답구절, response refrain) 이 PDF 에서 italic — 웹앱은 plain.

**예시 (week-1.json SUN lauds)**:
```
intercessions: [
  "Христ бол хэзээ ч жаргахгүй нар, хүн бүрийн",
  "дээрээс тусдаг үнэн гэрэл билээ. Бүгдээрээ Түүнд",
  "хандан залбирч алдаршуулцгаая:",                     ← 마침
  "Эзэн, Та бол бидний амь болон аврал билээ.",         ← 반복구절 (PDF italic)
  "Оддын бүтээгч ээ, ...",                              ← versicle
  "...талархъя. - Мөн Таны амилалтыг бид дурсан санаж байна.",  ← versicle + " - " + response
  ...
]
```
PDF 에서는 "Эзэн, Та бол бидний амь болон аврал билээ." 가 italic (intercession refrain). 웹앱은 raw string 으로 렌더 (plain).

### 3.2 Render path 분석

`src/components/prayer-sections/intercessions-section.tsx`:

**3 paths**:

| Path | 조건 | Italic 적용 |
|------|------|------------|
| **Rich** (line 29-41) | `section.rich && section.rich.blocks.length > 0` | ✅ `RichContent` 가 `PrayerSpan.emphasis: ['italic']` 지원 |
| **Structured** (line 71-108) | `section.petitions.length > 0` | refrain `font-serif italic` (line 81) ✅, response `<div data-role="intercessions-response">` plain ❌ |
| **Legacy items[]** (line 116-126) | 위 둘 모두 false | 모두 plain ❌ |

**현재 데이터 path**: 거의 모든 hour 가 `intercessions: []` flat string 배열만 보유 → legacy path → 모두 plain (refrain 포함).

### 3.3 Schema 능력

`src/lib/types.ts:101`:
```ts
| { kind: 'text'; text: string; emphasis?: ('italic' | 'bold')[] }
```
PrayerSpan 은 italic 지원. RichContent (line 56-381) 가 `emphasisClass` 헬퍼로 적용. → **schema 는 이미 italic 가능**. data 가 안 채울 뿐.

### 3.4 Root cause

- **데이터 layer gap**: week-N.json 의 `intercessions: []` 는 plain string 배열. 어떤 줄이 italic 인지 메타 없음.
- **Resolver gap**: intercession resolver (확인 필요 — `src/lib/hours/resolvers/...`) 가 PDF italic 정보를 보존하지 않음.
- **Renderer gap (Structured path)**: line 96-98 의 `<div data-role="intercessions-response">- {p.response}</div>` 에 italic class 없음. Refrain (line 78-85) 만 italic.

### 3.5 권고 — Option C (renderer 부분 fix + data layer follow-up)

**Phase A (렌더러 단독 수정, fast fix)**:
- `intercessions-section.tsx:78-85` 의 refrain 은 이미 italic — OK
- Legacy items[] path (line 116-126) 에서 응답구절 식별 heuristic 추가:
  - "...залбирцгаая:" / "...залбирцгаая." 다음 줄 = refrain (italic)
  - 또는 " - " split 후 우측 = response (italic)
  - 하지만 user-reported "залбирцгаая 다음 반복구절" 은 응답 refrain 만 italic 임
- 적용:
  ```tsx
  // legacy path
  {section.items.map((item, i) => {
    const prev = section.items[i-1] ?? ''
    const isRefrain = i > 0 && /залбирцгаая[:\.]\s*$/.test(prev.trim())
    return (
      <li key={i} className={`font-serif text-stone-800 dark:text-stone-200${isRefrain ? ' italic' : ''}`}>
        — {item}
      </li>
    )
  })}
  ```
- Structured path 의 response (line 96-98) 도 italic 추가 (옵션 — PDF 의 response 는 italic 일 수도 plain 일 수도; 사용자 추가 확인 필요).

**Phase B (data layer 강화, 정밀 fix — 선택)**:
- intercession 데이터 schema 에 `refrain?: string` (italic), `petitions: [{ versicle, response }]` migration
- builder 가 PDF italic span 식별 + 카탈로그 inject
- 점진적 transition (legacy 과 신 schema co-existence)

**Effort 추정**: Phase A LOW (~10 LOC + heuristic test). Phase B HIGH (data migration + builder + 매 hour 재처리). Phase A 만으로 사용자 reported 회귀 즉시 해결 가능.

---

## §4. 통합 권고

| 회귀 | priority | effort | 의존성 |
|------|---------|--------|---------|
| F-X10 | HIGH (시각적 회귀 + 광범위 96 refs / 42 ALL-single) | Diagnostic LOW + Fix MEDIUM-HIGH | independent |
| F-X11 | MEDIUM (visual paragraph 보존 — UX 개선) | Option B MEDIUM-HIGH (schema 변경) / Option A LOW-MEDIUM (extractor only) | independent (schema 수정시 F-X10 재주입과 합류 효율적) |
| F-X12 | MEDIUM (LOTH liturgical 정확성) | Phase A LOW | independent |

**권고 dispatch 순서**:
1. **F-X12 Phase A** 즉시 dispatch (dev/solver, ~10 LOC) — 사용자 가시 회귀, 빠른 land
2. **F-X10 Diagnostic** 먼저 (member-01 또는 divine-researcher) — root cause 확정. Fix scope 결정.
3. **F-X10 Fix** + **F-X11 Option A 또는 B** — 병합하면 phrase re-injection 1번에 해결 가능 (효율). Option B 채택 시 schema PR 분리.

**모바일 검증 필수** (CLAUDE.md SW 캐시 회귀 1순위):
- F-X10/X11 fix 후 모바일에서 이전 SW 캐시된 HTML 의 phrase render 확인
- F-X12 italic 추가 후 모바일 brightness/dark-mode 가독성 확인

---

## §5. References

### 코드
- **Renderer**:
  - `src/components/psalm-block.tsx:43-134` (phrase + stanza render)
  - `src/components/prayer-sections/intercessions-section.tsx:1-131` (3 paths)
  - `src/components/prayer-sections/rich-content.tsx:56-381` (RichContent emphasis 적용)
- **Extractor / Builder**:
  - `scripts/parsers/extract-phrases-from-pdf.mjs:60-339` (WRAP_DELTA=3, splitIntoStanzas, dropSpuriousBlanks)
  - `scripts/parsers/pdftotext-column-splitter.mjs` (column 분리)
  - `scripts/build-phrases-into-rich.mjs:24-95` (line-count strict match)
- **Resolver**: `src/lib/hours/resolvers/psalm.ts` + `intercessions.ts` (확인 권고)
- **Type**:
  - `src/lib/types.ts:101` (`PrayerSpan.emphasis: ('italic'|'bold')[]`)
  - `src/lib/types.ts:130-135` (PrayerBlock kind:'para'|'stanza')

### 데이터
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (215 stanza-blocks, 2476 phrases)
- `src/data/loth/psalter/week-{1..4}.json` (legacy intercessions[] flat)
- `parsed_data/full_pdf.txt` + `public/psalter.pdf` (PDF SSOT)

### 관련 task / FR
- FR-161 (PRD §11) — phrase-unit-aware rendering
- FR-161 R-1 / R-2 / R-7 (PILOT) / R-9.A-E (handlers) / R-12 (column-merge artifact fix) / R-13 (hanging indent) / R-14 (indent inconsistency audit)
- NFR-009j (verify-phrase-coverage CI gate)
- 기존 audit doc: `docs/handoff-fr161-r14c.md`, `docs/handoff-fx3-phrase-audit.md`, `docs/handoff-fx3-method-b-spike.md`, `docs/handoff-fx3-r2-a1-spike.md`

### PDF spot-check (책 153 = physical 77 right col)
- `pdftotext -layout -f 76 -l 78 public/psalter.pdf` 로 verbatim 추출 가능
- Lines 44-53 (Psalm 46:2-12 본문) — wrap delta +3, paragraph break 1 row blank in column-split

### 검증 스크립트 (audit 시 사용)
```python
# F-X10 wrap coverage measurement
import json
data = json.load(open('src/data/loth/prayers/commons/psalter-texts.rich.json'))
total=multi=single=0
for ref, payload in data.items():
    for b in payload.get('stanzasRich',{}).get('blocks',[]):
        if b.get('kind') != 'stanza': continue
        for p in b.get('phrases',[]):
            total += 1
            lr = p.get('lineRange',[0,0])
            if lr[1] > lr[0]: multi += 1
            else: single += 1
print(f'multi-line wrap: {multi}/{total} = {100*multi/total:.1f}%')
```

```bash
# F-X10 PDF baseline detection (sample ref)
node scripts/parsers/extract-phrases-from-pdf.mjs --pdf public/psalter.pdf --book-page 153 --column right
# (compare output phrases[] with rich.json)
```
