# F-X11 audit — 이중 줄바꿈 paragraph 구분 미구현 회귀 (#370)

**Task**: #370 | **Member**: divine-researcher (Explore, read-only)
**SHARD**: targeted (audit-only) | **isolation**: shared
**Reported by**: 사용자 (2026-05-08) — PDF 페이지 153 "чичрэхэд ч айхгүй" / "хүчит цайз." 다음 더 큰 간격 (이중 줄바꿈 = paragraph break) 누락

**Note**: 본 doc 은 #370 task 의 standalone deliverable. 통합 audit (`docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` §2) 의 보강 evidence (parsed_data 의 958 consecutive-blank runs distribution).

## TL;DR

1. **3-layer gap**: schema (paragraph 표현 부재) + extractor (1/2+ blank 동일 처리) + renderer (stanza 내 paragraph spacing 부재).
2. **PDF parsed_data 한계**: default pdftotext 모드는 paragraph break collapse. pdftotext-layout 모드는 column-split 후 1-row blank 로만 보존 (left col content 가 right col paragraph blank 를 한 row 로 압축).
3. **Scope**: 사용자 reported 페이지 153 (Psalm 46:2-12) 외에도 모든 시편/찬가의 inner paragraph 경계 영향 가능. Psalm 46 의 경우 PDF 시각적으로 4-5 stanza 그룹이 1개 거대 block (29 lines) 으로 평탄화됨.
4. **권고: Option B** — extractor 가 column-aware 2-row blank 를 paragraph boundary 로 식별 + schema 에 `paragraphBoundaries?: number[]` hint 추가 + renderer 에 within-stanza paragraph spacing CSS.

## §1. 사용자 reported 사례 (verbatim)

PDF 책 페이지 153 (physical 77 right column) — Psalm 46:2-12.

**PDF (`pdftotext -layout public/psalter.pdf -f 76 -l 78`, right column 추출, line 44-53)**:
```
44: Далайн зүрх рүү уулс нуран ороход ч             ← phrase start (col 53 baseline)
45:    бид айхгүй.                                  ← wrap (col 56 = baseline+3)
46: Ус хүрхрэн хөөсрөхөд ч,                         ← phrase
47: (blank — left col만 content, paragraph 또는 column-split artifact?)
48: Уулс сүртэйгээр ганхан чичрэхэд ч айхгүй.       ← phrase
49: (blank)
50: Түг түмдийн ЭЗЭН бидэнтэй хамт                  ← refrain start
51: Иаковын Тэнгэрбурхан бидний хүчит цайз.         ← refrain end
52: (blank)
53: Тэнгэрбурханы хотыг,                            ← next stanza
```

사용자 보고:
- "чичрэхэд ч айхгүй" (line 48) 다음 paragraph break (gap to "Түг түмдийн")
- "хүчит цайз." (line 51) 다음 paragraph break (gap to "Тэнгэрбурханы хотыг")
- 웹앱은 둘 다 일반 줄바꿈으로 표시

**현재 데이터** (`psalter-texts.rich.json` Psalm 46:2-12):
- 2 blocks (29-line + 2-line)
- 29-line block 에 모든 verse-cluster + refrain 평탄화
- PDF 시각적 4-5 stanza 그룹 → 1 거대 block

## §2. Scope 전수 — consecutive-blank 패턴 detect

`parsed_data/full_pdf.txt` (32761 lines) 전수 sweep 결과:

| pattern | 개수 | 의미 |
|---------|------|------|
| 2-blank consecutive | 957 | 대부분 page boundary (form-feed `\f` 직전 + 직후 blank) |
| 3-blank consecutive | 1 | 책 시작부 구조 분리 (line 19) |
| ≥4-blank | 0 | 없음 |

**핵심 한계**: parsed_data/full_pdf.txt 는 default pdftotext (`-layout` 없음) 출력. paragraph break 가 collapse 되어 단일 newline 으로만 보존됨. → 958 의 대부분이 cross-page boundary 이고, in-content paragraph break 식별 불가.

**Layout-aware 출력에서**: `pdftotext -layout` 은 column-aware 형태로 보존하지만 left col 과 right col 이 같은 row 에 있을 때 paragraph blank 가 column-merge 로 compressed. 위 사용자 사례 (Psalm 46) 에서 right col 의 paragraph break 가 1 row blank 로만 나타남 (line 47, 49, 52).

→ **결과적으로 paragraph 정보를 PDF text 추출 단계에서 안정적으로 보존 불가**. column splitter 가 column 단위로 분리한 후 column-내부 row 별 blank 를 카운트해야 함.

### 2.1 Affected refs (sample 추정)
- 모든 refrain 패턴 시편 (verse + refrain 반복 구조) — Psalm 46, 48, 67 등
- 모든 multi-stanza canticle (Daniel 3:57-88 — 평행 구조)
- 모든 longer hymn (paragraph break 가 verse 사이에 표시되는 경우)
- ~125 phrase-injected refs 중 정확한 affected count 는 column-aware 재추출 후 확정

## §3. cohort 분류

### 3.1 Paragraph break (within stanza, user-reported)
- PDF 시각적으로 verse-cluster 내부의 sub-grouping
- 예: Psalm 46 의 verse 3-4 와 verse 5 사이 (paragraph), refrain 직전 (paragraph)
- **현재 처리**: 평탄화 (1 block 내부)

### 3.2 Stanza split (between major sections)
- PDF 시각적으로 명확한 stanza 분리 — 보통 더 큰 vertical gap
- 예: 시편 본문 vs 마침 doxology, verse-cluster vs refrain (반복)
- **현재 처리**: multi-block (2+ block) 으로 매핑됨 — Psalm 46 의 block 0 (29 line) + block 1 (2-line refrain) 가 부분적 stanza split

### 3.3 Cross-page (page-boundary)
- PDF 페이지 break 자체. parsed_data 의 958 2-blank runs 의 대부분.
- F-X7c (#337) 가 처리한 hymn page-break stanza-drift 와 같은 영역
- **현재 처리**: form-feed `\f` 기반 page marker, content collapse 후 stanza 경계 유지

→ **본 task 의 scope 는 §3.1 paragraph break 만**. §3.2/§3.3 은 별 cohort.

## §4. Builder 변경 권고

### Option A — Extractor 만 minimal 수정 (LOW)
- `splitIntoStanzas` 를 2+-blank → stanza boundary, 1-blank → paragraph boundary 로 분기
- 새 schema field 안 만들고 stanza fragmentation 으로 매핑 (즉 paragraph break 마다 새 block)
- **장점**: schema 무변경. extractor + builder 만 수정.
- **단점**: PDF column-split artifact 의 1-row blank 가 spurious paragraph break 로 잡혀서 fragmentation 폭증. False positive 위험.
- **시나리오**: Psalm 46 → 4-5 blocks (현재 2). Renderer 가 block 사이 spacing 그대로 사용.
- LOC: extractor ~20 LOC + 재추출

### Option B — Schema + extractor + builder + renderer 보강 (MEDIUM-HIGH, RECOMMENDED)
1. **Schema** (`src/lib/types.ts:130-135`) PrayerBlock 의 stanza 에 추가:
   ```ts
   { kind: 'stanza'; lines: [...]; phrases?: PhraseGroup[]; paragraphBoundaries?: number[] }
   ```
   `paragraphBoundaries: [3, 7]` = lines[3] 와 lines[7] 시작 직전이 paragraph break.
2. **Extractor** column-aware 처리:
   - `splitColumns` 후 each column 의 row-별 blank count 추적
   - 1-row blank = paragraph (column-split artifact 가능, 둘 다 column 의 row 가 blank 일 때만 채택)
   - 2+-row blank = stanza boundary (확실)
3. **Builder**: `paragraphBoundaries[]` 를 stanza block 에 inject (additive, idempotent).
4. **Renderer** (`src/components/psalm-block.tsx:43-134`):
   - paragraph boundary 사이에 추가 spacing (`mt-3` 같은) 적용
   - phrase-render path 에서 phrase start 가 paragraphBoundaries[] 멤버이면 위쪽 margin 추가
- **장점**: schema-first 접근. F-X10 (#369) 의 wrap 재주입과 1번에 통합 land 가능 — extractor 재실행 시 paragraph 와 wrap 모두 정확.
- **단점**: schema 변경 → consumer 모두 update. test/coverage 추가.
- LOC: schema 5 + extractor 30 + builder 10 + renderer 15 + test 30 = ~90 LOC + 96 refs 재주입

### Option C — Data 정정 (manual, NOT RECOMMENDED)
- 96 refs 마다 paragraph 위치를 PDF 보고 manual 으로 확인 → 데이터 직접 입력
- **장점**: schema 변경 없이 정확
- **단점**: 매우 많은 manual 작업. drift 위험. extractor 자동화 가치 손실.

**권고: Option B** — F-X10 fix 와 통합 dispatch 가 효율. 단독 land 시에도 OK.

## §5. 렌더러 영향 (CSS gap 추가)

### 5.1 현재 구조 (`src/components/psalm-block.tsx:43-134`)
- `psalm.stanzasRich.blocks.map` → block 별로 `<p data-role="psalm-stanza" className="font-serif text-base leading-relaxed">` 렌더
- block 사이: 외부 wrapper `<div className="space-y-5 pl-3 md:space-y-4 md:pl-2">` — Tailwind `space-y` utility 가 형제 element 사이에 margin 추가
- block 내부 phrase 렌더 (line 62-105): 각 phrase 가 `<span className="block">` — block-level span 으로 새 줄, 하지만 phrase 사이 spacing 추가 없음

### 5.2 Paragraph boundary 적용 (Option B Renderer)
- block 내부 phrase 마다 `paragraphBoundaries.includes(phraseStart)` 체크
- TRUE 인 phrase 는 추가 `mt-3` 또는 `mt-4` margin (block 사이 보다 작고, phrase 사이 (현재 0) 보다 큼)
- 모바일/데스크톱 모두 동일 (CSS 만, sw 캐시 영향 없음 — HTML byte 변경 시 SW 정책 검토 필수, CACHE_VERSION bump 검토)

### 5.3 다크 모드 / mobile 검증 필수
- CLAUDE.md SW 캐시 회귀 1순위 가이드 준수
- `data-role="psalm-paragraph-boundary"` 추가 시 e2e selector 활용 가능

## §6. Fix scope estimate

| Option | LOC 변경 | 영향 범위 | re-injection | 회귀 risk |
|--------|---------|----------|------------|----------|
| **A (extractor only)** | extractor +20, builder 0, renderer 0 | 96 phrase-injected refs (재주입 후 더 많은 block) | 필수 | MEDIUM (false-positive paragraph break 로 over-fragmentation) |
| **B (schema + extractor + builder + renderer)** | schema 5, extractor 30, builder 10, renderer 15, test 30 = ~90 | 96 refs + ALL phrase-aware renderer | 필수 | LOW (schema additive, 기존 데이터 backward-compat) |
| **C (data 정정)** | data ~수백 KB diff | 96 refs manual | 불필요 | HIGH (manual drift) |

**Affected hymn/시편 추정**:
- F-X10 ALL-single 42 refs + 일부 multi-block (12 refs) 추가 = ~50-60 refs 시편
- 122 hymn 중 paragraph break 보존 사례 — F-X3 method b2 가 line-by-line 만 처리 → 거의 모든 multi-stanza hymn 에 영향
- Total estimated affected: 시편 ~50 + 찬가 ~80 = **~130 refs**

**모바일 검증 필수**:
- iOS Safari + Android Chrome 에서 paragraph spacing 가독성
- SW 캐시 회귀 검증 (CLAUDE.md 가이드)
- `CACHE_VERSION` bump 권고 (HTML byte 변경)

## §7. References

### 코드
- `src/components/psalm-block.tsx:43-134` (phrase + stanza render)
- `src/components/prayer-sections/rich-content.tsx` (RichContent flow modes)
- `src/lib/types.ts:130-135` (PrayerBlock kind:'stanza' schema)
- `scripts/parsers/extract-phrases-from-pdf.mjs:165-216` (dropSpuriousBlanks + splitIntoStanzas)
- `scripts/parsers/pdftotext-column-splitter.mjs` (column 분리 로직)
- `scripts/build-phrases-into-rich.mjs:24-95` (builder additive inject)

### 데이터
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (215 stanza-blocks, 2476 phrases)
- `parsed_data/full_pdf.txt` (default pdftotext — paragraph collapse)
- `public/psalter.pdf` (PDF SSOT, layout-extract 가능)

### 검증 스크립트 (audit 시 사용)
```python
# F-X11 consecutive-blank distribution
with open('parsed_data/full_pdf.txt') as f:
    lines = f.read().split('\n')
runs = []
i = 0
while i < len(lines):
    if lines[i].strip() == '':
        j = i
        while j < len(lines) and lines[j].strip() == '':
            j += 1
        if j - i >= 2:
            runs.append((i+1, j-i))
        i = j
    else:
        i += 1
print(f'Total >=2-blank runs: {len(runs)}')
# 결과: 957 × 2-blank, 1 × 3-blank
```

```bash
# F-X11 layout-aware blanks (per-column row blank)
pdftotext -layout -f 76 -l 78 public/psalter.pdf - | awk 'NR>=44 && NR<=53'
# 결과: right col 의 paragraph blank 가 1-row 로 압축 (left col content 의 영향)
```

### 관련 task / FR
- FR-161 (PRD §11) — phrase-unit-aware rendering (R-1 ~ R-18)
- F-X3 (#249/#263/#279/#291) — hymn phrase 주입 (paragraph 미고려)
- F-X8 (#300) — Магтуу wrap rule (no indent rule, paragraph 무관)
- F-X7c (#337) — page-break stanza-drift fix (cross-page 영역 — §3.3)
- F-X10 (#369) — wrap continuation 미분류 (paragraph 와 통합 fix 가능)
