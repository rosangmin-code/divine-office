# F-X9 audit — 시편 아래 제목/성경구절 반복 회귀 전수조사 (#362)

**Task**: #362 (research dispatch from team-lead) | **Branch**: `worktree-362-divine-researcher`
**Member**: divine-researcher (Explore profile, research domain) | **Base commit**: `53c2d0d`
**SHARD**: targeted (audit-only, read-only investigation; no data/code change)
**Reported by**: 사용자 (2026-05-08) — "시편 아래에 있는 제목과 성경 구절이 반복해서 들어가고 있음"

## TL;DR

1. **Root cause confirmed**: FR-160-C psalter-headers 카탈로그 (`psalter-headers.rich.json`) 의 `preface_text` 가 PDF title-line + body + attribution-wrapper 를 한 덩어리로 캡처. Renderer 는 `psalm.title` 과 `headerRich.attribution` 을 별도로 또 emit → 양쪽 중복.
2. **Scope (전수)**: 64 refs / **77 entries** 중 67 (87%) title-중복, 74 (96%) attribution-중복. 모든 4-week cycle 시편 (W1-W4) + 시즌 propers (Advent/Christmas/Easter/Lent) 모두 영향.
3. **F-X8 / F-X2 Phase 3 / F-X7c 와 무관** — 최근 변경은 hymn 본문 / psalmPrayer override 만 건드림. psalter-headers 카탈로그는 FR-160-C-2 (#170, 2026-04-28) 이후 손대지 않음.
4. **Fix 권고: Option C (A+B+test)** — extractor 재실행 (data 재생성) + renderer defensive guard + invariant test.

## 1. 사용자 reported 사례 (예시 spot-check)

renderer 가 emit 하는 실제 텍스트 흐름 (psalm-block.tsx:17-39 기반):

```
[reference]    Дуулал 149:1-9   p.64
[psalm.title]  Тэнгэрбурханы ариун ард түмний баяр хөөр                         ← #1
[headerRich]   Тэнгэрбурханы ариун ард түмний баяр хөөр Шашны хөвгүүд,           ← #2 시작 = title
               шинэ ард түмний хүүхдүүд ээ Христ өөрсдийн Хаандаа баярлацгаа!
               (Хэсихиус)                                                        ← #2 끝 = (attribution)
               (Хэсихиус)                                                        ← #3 renderer suffix
```

→ "Тэнгэрбурханы ариун ард түмний баяр хөөр" 두 번 + "(Хэсихиус)" 두 번.

### 1.1 spot-check 예시 (verbatim PDF + catalog 대조)

| Ref | week-N.json title | preface_text (catalog) 시작 | preface_text 끝 | attribution |
|-----|-------------------|------------------------------|------------------|-------------|
| **Psalm 149:1-9** (W1-Sun-lauds, p64) | Тэнгэрбурханы ариун ард түмний баяр хөөр | "Тэнгэрбурханы ариун ард түмний баяр хөөр Шашны хөвгүүд… | …Хаандаа баярлацгаа! (Хэсихиус)" | Хэсихиус |
| **Psalm 114:1-8** (W1-Sun-vespers, p70) | Израильчууд Египетийн боолчлолоос чөлөөлөгдсөн байна | "Израильчууд Египетийн боолчлолоос чөлөөлөгдсөн байна Ариун угаалын… | …Египетээс гарсан юм (Гэгээн Августин)." | Гэгээн Августин |
| **Psalm 67:2-8** (W2-Mon-lauds + W3-Tue-lauds + W4-Wed-lauds, p30/239/333) | Бүх үндэстний дундах хүмүүс Эзэнд мөргөх болно | "Бүх үндэстний дундах хүмүүс Эзэнд мөргөх болно Иймээс… | …та нар мэдэгтүн (Үйлс 28:28)." | Үйлс 28:28 |
| **Psalm 29:1-10** (W1-Mon-vespers, p80) | Тэнгэрбурханы Үгэнд зориулсан хүндэтгэлийн магтаал | "Тэнгэрбурханы Үгэнд зориулсан хүндэтгэлийн магтаал Эцэгийн дуу хоолой… | …хайрт Хүү минь энэ билээ" (Матай 3:17) | Матай 3:17 |
| **Psalm 11:1-7** (W1-Mon-vespers, p84) | Тэнгэрбурхан бол зөв шударга хүний хөрвөшгүй бат түшиг мөн | "Тэнгэрбурхан бол зөв шударга хүний хөрвөшгүй бат түшиг мөн. Зөвт… | …цатгагдах болно (Матай 5:6). | Матай 5:6 |

### 1.2 PDF verbatim — Psalm 149 layout (parsed_data/full_pdf.txt:1998-2006)
```
64
64    1 дүгээр долоо хоног
Дуулал 149                                                ← extractor anchor (line i)
Тэнгэрбурханы ариун ард түмний баяр хөөр                  ← line i+1 = TITLE (also in week-1.json)
Шашны хөвгүүд, шинэ ард түмний хүүхдүүд ээ
Христ өөрсдийн Хаандаа баярлацгаа! (Хэсихиус)             ← line i+4 = body END + attrib
ЭЗЭНийг магтагтун!                                        ← psalm body 시작
```

extractor 가 `lines.slice(i+1, attribLineIdx+1)` 로 `Тэнгэрбурханы… (Хэсихиус)` 전체를 `preface_text` 에 캡처.

## 2. Scope 전수 (read-only)

### 2.1 Catalog 규모
- **카탈로그 파일**: `src/data/loth/prayers/commons/psalter-headers.rich.json` (1138 lines)
- **64 distinct refs** / **77 total entries** (multi-occurrence: 같은 시편이 여러 page 에서 다른 patristic/typological preface 와 매핑되는 경우 entries[] 가 다중)
- **kind 분포**: patristic_preface 11 entries (14%), nt_typological 66 entries (86%)

### 2.2 Render path — 단일 (psalm-only)
- **Renderer**: `src/components/psalm-block.tsx:28-39` — 유일한 `headerRich` 소비처
- **Resolver**: `src/lib/hours/resolvers/psalm.ts:70` (stanza branch) + `:144` (Bible-fallback branch) — `loadPsalterHeaderRich(entry.ref)` 양쪽 모두에서 호출
- **Loader**: `src/lib/prayers/rich-overlay.ts:360-366` (`loadPsalterHeaderRich`) — `entries[0]` 만 반환, page-aware disambiguation 없음
- **다른 sections (canticle / hymn / responsory / intercession) 영향 없음** — `headerRich` 는 psalm-block 만 사용. F-X7/F-X7b/F-X7c 의 hymn `Магтуу` 노이즈와는 다른 path.

### 2.3 데이터 entry-level 전수 (요약)

77 entries 중:
- title-dup: **67 / 77 (87%)** — strict prefix 60, mid-string near-match 7
- attr-dup: **74 / 77 (96%)** — preface_text 가 `(${attribution})` 또는 `(${attribution}).` 로 끝남
- 둘 다 N: 3 entries (Psalm 135 페이지 383 둘 + 페이지 428 1개) — PDF column-break 등 extractor 변형으로 우연히 dup 회피

전체 entry 표는 §1.1 spot-check 와 동일한 패턴 — divine-researcher 메시지 본문 (#362 completion_report) 의 §2.3 표 참조.

### 2.4 hour/day 영향 범위
- 64 distinct refs × 4-week psalter cycle × Lauds/Vespers/Office of Readings + propers (Advent/Christmas/Easter/Lent) × 매 day 노출
- 사실상 전 사용자가 매일 1+ 시편에서 중복을 본다.
- multi-occurrence ref: Psalm 51:3-19 (4 entries), Psalm 67:2-8 (3) 등 매우 많음.

## 3. 패턴 분류

### Pattern A — TITLE 중복 (data 결함, 87%)
- **위치**: catalog `preface_text` 시작이 PDF "Дуулал N" 다음 줄(들) — 즉 시편의 분류 제목.
- **메커니즘**: extractor (`scripts/extract-psalter-headers.js:158-163`) 가 `windowStart = i + 1` 부터 캡처 시작 → PDF title-line 흡수.
- **렌더 시점**: `psalm-block.tsx:24-26` 가 `psalm.title` 을 italic stone-gray 로 한 번 emit → `psalm-block.tsx:28-39` 가 `headerRich.preface_text` (title + body) 를 italic red 로 또 emit.

### Pattern B — ATTRIBUTION 중복 (data + render 합성, 96%)
- **데이터 측**: extractor 의 `lines.slice(windowStart, attribLineIdx + 1)` 이 attribution 라인까지 포함 → preface_text 가 `…body. (Хэсихиус)` 로 끝남.
- **렌더 측**: `psalm-block.tsx:34-37` 가 `{preface_text}` 출력 후 `{' ('}<span>{attribution}</span>{')'}` 를 또 출력 → 결과 `…body. (Хэсихиус) (Хэсихиус)`.
- **예외 (3건)**: Psalm 135:1-12 p383, Psalm 135:13-21 p383, Psalm 135:1-12 p428 — column-break 변형으로 attribution 가 preface_text 안에 못 들어감.

### Pattern C — 페이지/구문 분리 없음
- 동일 시편 multi-occurrence (e.g. Psalm 67:2-8 페이지 30/239/333) 는 entries[] 에 3개 element. Loader 가 `entries[0]` 만 반환 → multi-occurrence ref 도 매 occurrence 동일 dup 패턴 적용 (page-aware lookup 미구현은 별개 known-issue).

## 4. Root cause 가설

### 4.1 Origin
- **Origin commit**: `155f17a` (2026-04-27) `feat(fr-160): psalter-headers preface catalog (C, 62 entries 52 keys)` — 카탈로그 + extractor 최초 도입
- **Extension**: `50bfe83` (2026-04-28) `feat(fr-160-c2): extractor R1+R3 patch + R1.5 verse-range fanout (task #166)` — anchor 정규식 확장 (block 캡처 로직 그대로)
- **그 이후 변경 없음**: psalter-headers 카탈로그는 #170 종료 후 손대지 않음

### 4.2 결함 메커니즘
- **schema intent (types.ts:653-665)**:
  ```ts
  preface_text: string  // The full preface body (the citation/quote text)
  ```
  → 의도: body only.
- **actual content**: `[title-line(s)] [body] [(attribution)]` 합본.
- **mismatch 코드 위치** (extract-psalter-headers.js:158-164):
  ```js
  const block = lines.slice(windowStart, attribLineIdx + 1)  // ← title부터 attrib까지 전부
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
  ```

### 4.3 Renderer 가 dup 을 catch 하지 못한 이유
- `psalm-block.tsx:28-39` 는 schema intent 신뢰. preface_text 가 title 로 시작하는지 / attribution 으로 끝나는지 검사 없음.
- `psalter-headers.test.ts:42-49` 는 length>0, kind enum, attribution string type 만 검증 → shape invariant 검증 누락.

### 4.4 F-X8 / F-X2 Phase 3 / F-X7c 와의 연관
- **F-X8 (#300)** — hymns.json + hymn-section.tsx 만 변경. psalter-headers 무관.
- **F-X2 Phase 3 (#352)** — psalm.ts 의 R-1 suppression (psalmPrayerRich 만), headerRich 미접촉.
- **F-X7c (#337)** — hymns.json 의 3 hymns (41/45/111) 만. psalter-headers 무관.
- **결론**: F-X9 회귀는 FR-160-C origin 에서 들어온 latent bug. 최근 커밋과 무관.

## 5. Fix 권고

### Option A — Data 정정 (catalog rebuild)
**Scope**:
1. `scripts/extract-psalter-headers.js:158-164` block capture 수정
2. extractor 재실행 → catalog 재생성 (77 entries)
3. **장점**: schema intent 정합. 다른 소비자 안전.
4. **단점**: PDF 변형 (Pattern A near-match 7건 + Pattern B 예외 3건) 처리 로직 필요.

### Option B — Renderer guard (defensive, fast fix)
**Scope** (`src/components/psalm-block.tsx:28-39` 수정):
```tsx
{psalm.headerRich && (() => {
  let pt = psalm.headerRich.preface_text
  if (psalm.title && pt.startsWith(psalm.title.trim())) {
    pt = pt.slice(psalm.title.trim().length).trimStart()
  }
  const attribPat = new RegExp(`\\s*\\(${escapeRegExp(psalm.headerRich.attribution)}\\)\\.?\\s*$`)
  pt = pt.replace(attribPat, '').trimEnd()
  return (...)
})()}
```
**장점**: 즉각적 UI fix. ~15-20 LOC + escapeRegExp helper.
**단점**: schema 와 content mismatch 고착화.

### Option C — A + B + invariant test (RECOMMENDED)
1. **A 우선 land** — extractor 수정 + catalog 재생성
2. **B 도 land** — renderer defensive guard (defense-in-depth)
3. **invariant test 추가** (`psalter-headers.test.ts`):
   - `preface_text` 가 `psalm.title` 로 시작하지 않음
   - `preface_text` 가 `(attribution)` 로 끝나지 않음
4. (선택) NFR-009 verifier 추가

**Effort**: A ~30-50 LOC + script run + spot-check 5건. B ~20 LOC. Test ~30 LOC. **LOW-MEDIUM**.

dispatch 분리 권고: (a) member-01 이 A+test, (b) dev/solver 가 B 정확히 1 PR.

## 6. References

### 코드
- **Renderer**: `src/components/psalm-block.tsx:17-39`
- **Resolver**: `src/lib/hours/resolvers/psalm.ts:70` (stanza), `:144` (Bible-fallback)
- **Loader**: `src/lib/prayers/rich-overlay.ts:299-372`
- **Type**: `src/lib/types.ts:653-677`
- **Extractor (root cause)**: `scripts/extract-psalter-headers.js:158-164`
- **Builder**: `scripts/build-psalter-headers-catalog.js`
- **Test**: `src/lib/prayers/__tests__/psalter-headers.test.ts:36-129`

### 데이터
- `src/data/loth/prayers/commons/psalter-headers.rich.json` (1138 lines, 64 refs / 77 entries)
- `src/data/loth/psalter/week-{1..4}.json`
- `src/data/loth/propers/{advent,christmas,easter,lent}.json`

### PDF SSOT (parsed_data/full_pdf.txt)
- L1998-2006 — Psalm 149 layout
- L2208-2215 — Psalm 114 layout
- (그 외 67 entries 각각 evidence_line_range 가 catalog 에 기록됨)

### Origin 커밋
- `155f17a` 2026-04-27 — `feat(fr-160): psalter-headers preface catalog`
- `50bfe83` 2026-04-28 — `feat(fr-160-c2): extractor R1+R3 patch`

### 관련 task / FR
- FR-160-C (PRD §12.1) — psalter-headers preface 카탈로그
- 관련 ticket: #170 (FR-160-C-2 R2 plan), #228 (F-X3 audit), #344 (F-X2 Phase 3 audit)
