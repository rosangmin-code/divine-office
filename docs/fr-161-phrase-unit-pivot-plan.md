# FR-161 — 시편/기도문 phrase-unit 줄바꿈 architectural pivot plan

> **TL;DR** — 현행 렌더링은 PDF 의 visual line break 를 1:1 로 web 에 옮긴다 (`<span class="block">` per PDF-line). 모바일 viewport 에서 PDF 한 phrase 가 자동 wrap 되면서 PDF line break 가 하드 break 와 충돌해 **이중 줄바꿈** 이 발생. 본 plan 은 (a) PDF 들여쓰기 / 구두점 / 캐피털라이제이션 cue 로 **phrase unit 을 추출**해 schema 에 명시하고, (b) renderer 가 phrase 단위로 `<p>` 또는 `<span>` 을 emit (verse line break 는 soft hint 로 격하), (c) 시편 (verse-poetic) vs 기도문 (prose) 의 정책을 분리해 phrase-aware 로 통합한다. 위험은 (1) PDF text 가 indent 를 이미 잃었음 — pdftotext 재추출 또는 punctuation heuristic 필수, (2) 125 시편 + ~수백 기도문 의 마이그레이션 cost. **pilot Psalm 110:1-5,7 (Sunday Vespers I, 2 stanzas / 20 lines)** 권고 — 위험 작고 기존 e2e (Sunday Vespers) 가 검증 안전망. plan-only no code.

타입: planning — 큰 architectural pivot. 의존 그래프 root 결정 + sub-WI 분해 + 결정 게이트 명시.

@fr FR-161 (이전 FR 카탈로그 last: FR-160-C-2 Phase B 마무리)

---

## 1. 문제 정의

### 1.1 사용자 발화 (원문 인용)

> 일단 작업에 큰 변화가 필요한 거 같아. 시편과 기도문의 줄바꿈을 따로 구분해서 관리해야할 거 같아. 특히 시편 같은 경우에는 pdf 원문을 그대로 보여준다고 한 것 때문에 줄바꿈이 꼬여버렸어. pdf 의 경우와 웹앱의 경우 가로줄이 다르기 때문에 줄바꿈이 다르게 들어갈 수 밖에 없는데, pdf 줄바꿈을 고수하려고 하니 이중으로 줄바꿈이 들어가서 엉망이 되어버린 거지. pdf 의 경우 구문 단위가 있는데 그 경우에 줄바꿈을 하면 들여쓰기를 하고 구문 단위로 끝나면 들여쓰기를 않아. 그러니까 먼저 구문 단위를 파악하고 그것에 따라서 웹앱에서의 줄바꿈을 적용 할 거 같아.

### 1.2 핵심 통찰 — PDF typography convention

PDF 의 시편 typography 는 두 가지 line-break 종류를 visual indent 로 구분 :

| line type | PDF 표기 | 의미 |
|-----------|----------|------|
| **phrase end** | flush left (indent 0) — 다음 line 도 새 phrase 시작 | 한 phrase 종료, 다음 phrase 시작 |
| **phrase wrap** | indented (indent ≥1) — 같은 phrase 의 wrap continuation | viewport-driven wrap, semantic break 아님 |

전자는 web 에서 hard `<br>` 또는 `<p>` 로 보존, 후자는 web 에서 viewport 가 자유 wrap 하도록 normal text flow 로 두어야 한다.

### 1.3 현행 결함 — 이중 줄바꿈

현행 `psalm-block.tsx` 는 PDF line 단위로 `<span class="block">` 을 emit + `whitespace-pre-line` (collapse 안 함). 결과 :

- 데스크탑 (가로 wide) — PDF line wrap 안 함 → PDF 와 동일하게 보임 ✓
- 모바일 (가로 narrow) — PDF 한 line 이 web 2-3 line 으로 자동 wrap → 그 다음 PDF line 이 또 hard break 로 시작. **시각적으로 이중 줄바꿈처럼 보임**.
- PDF 의 phrase wrap (indent 1) 도 `indent=0` 으로 저장되어 있어 (audit 결과 — §2.3) phrase 경계 정보 자체가 schema 에 없음.

### 1.4 결과 — 모바일 신뢰도 하락

모바일 사용자가 "이건 의도된 줄바꿈인지, 그냥 wrap 인지" 판단 불가. 시편의 시적 흐름 (parallelism, antiphony) 도 손상.

---

## 2. 현행 audit

### 2.1 PDF 파싱 source-of-truth

- `parsed_data/full_pdf.txt` (32,761 lines, 1.5 MB) — 추정 `pdftotext` 출력. **visual indent 보존 안 됨** (모든 line flush left).
- `Four-Week psalter.- 2025.pdf` (project root) — 원본 PDF, **재파싱 가능**.
- `public/psalter.pdf` — 동일 binary, public 서빙용.

→ 현행 텍스트 source 만으로는 phrase boundary 추정 불가능 (indent 정보 손실). 새 파싱 path 또는 punctuation heuristic 필수.

### 2.2 저장 schema (시편)

`src/data/loth/prayers/commons/psalter-texts.rich.json` — 125 unique keys, 37,302 lines. schema (`PrayerBlock` `kind: 'stanza'`, `src/lib/types.ts:91-93`) :

```ts
{ kind: 'stanza';
  lines: { spans: PrayerSpan[]; indent: 0 | 1 | 2; role?: 'refrain' | 'doxology' }[] }
```

- `lines[]` = PDF visual line 1:1.
- `indent` field 는 schema 상 0/1/2 enum 이지만 **현행 데이터 전수가 indent=0** (실측: Psalm 110:1-5,7 stanza 0, 20 lines 모두 indent=0).
- `role` 은 refrain/doxology 만 마킹 (FR-160 A1/A4).

→ schema 는 phrase-aware 를 표현할 능력이 있으나, **데이터가 빈 정보**. 마이그레이션 dimension: 데이터 측이지 schema 측이 아님 (적어도 시편 stanza 한정).

### 2.3 저장 schema (기도문)

`prayer-text.rich.json` 류 (`src/data/loth/prayers/commons/{compline,psalter}/*.rich.json`) — `PrayerBlock` `kind: 'para'` 로 prose paragraph 표현. 줄바꿈은 paragraph 단위만 보존 (intra-paragraph wrap 은 viewport 자유). 시편과 다른 정책.

### 2.4 렌더링

#### 2.4a 시편 (`src/components/psalm-block.tsx:43-72`)

```tsx
{psalm.stanzasRich.blocks.map((block) => (
  <p className="whitespace-pre-line ...">
    {block.lines.map((line) => (
      <span className={`block${indentClass}`}>{text}</span>
    ))}
  </p>
))}
```

- `<span className="block">` → 각 line 이 own visual line.
- `whitespace-pre-line` → 추가 whitespace 보존 (legacy 호환).
- `indent` → `pl-6` (1) / `pl-12` (2) Tailwind class (현행 데이터가 indent=0 이라 사실상 미사용).

**결함**: line 단위 hard break 가 viewport-aware wrap 과 충돌. mobile narrow 에서 이중 줄바꿈 인지.

#### 2.4b 기도문 (`src/components/prayer-sections/rich-content.tsx`)

- `kind: 'para'` → `<p>` 1개. intra-paragraph wrap 자유. 결함 없음 (current).
- `kind: 'stanza'` → 시편과 동일 line 단위 hard break. 시편이 아닌 stanza (canticle, hymn 본문) 도 동일 결함.

#### 2.4c CSS / responsive

`leading-relaxed` (1.625) + `text-base` (1rem) — line-height 는 적정. wrap 동작 자체는 정상, 단지 hard break 가 너무 많이 박힘이 문제.

### 2.5 SW 캐시 (`public/sw.js`)

- navigation = `network-only` (per CLAUDE.md). HTML 변경은 즉시 반영.
- 시편 데이터 (`*.rich.json`) 는 API route 로 서빙 (`/api/loth/[date]`) — 응답 자체는 dynamic, SW 가 별도 캐시 정책 두지 않음.
- 본 pivot 은 **자산 경로 / Content-Type / 라우트 변경 0** → `CACHE_VERSION` bump 불필요, `sw.js` 무수정.
- 단 schema 변경이 client renderer 와 동시 deploy 되어야 하므로 **데이터 + 코드 atomic PR** 이 핵심.

---

## 3. PDF 들여쓰기 패턴 실측 (3 시편 샘플)

### 3.1 Psalm 110:1-5,7 (Sunday Vespers I, line 2147-)

PDF 본문 (`parsed_data/full_pdf.txt:2152-2167`) — 모두 flush left (indent 정보 손실) :

```text
2152: ЭЗЭН миний Эзэнд
2153: "Би чиний дайснуудыг
2154: Хөлийн чинь гишгүүр болготол
2155: Миний баруун гарт залрагтун" гэв.    ← 문장 종료 (".")
2156: ЭЗЭН, Сионоос                          ← 새 문장 시작 (대문자 + 공통 명사)
2157: Хүч чадлын очирт таягийг чинь сунгана. ← 문장 종료
...
```

Phrase boundary cue (현재 데이터로 추정 가능한 신호) :

- **종료 cue**: `.` / `!` / `?` / `гэв.` / `байна.` / 닫는 따옴표 + `.` / `”`
- **시작 cue**: 대문자 시작 (Cyrillic `[А-ЯЁ]`) + 종료 cue 다음 line
- **continuation cue**: 소문자 시작 line, comma 끝, 종속절 마커 (가정형)

원본 PDF 의 indent 도 검증 필요 — `pdftotext -layout` 로 재추출하면 column 정보 일부 보존 가능.

### 3.2 Psalm 24:1-10 (Tuesday Lauds, allowlist 6-line refrain)

verse 7-10 antiphonal Q&A 가 본문에 섞인 케이스. phrase 단위가 (질문 1 phrase + 응답 1 phrase) 의 dual-track. refrain 라인 (현행 마킹) 과 phrase 단위가 정합해야 함.

### 3.3 Daniel 3:57-88, 56 (Sunday Lauds Canticle, 44-rep refrain)

canticle 로 매우 긴 anaphoric 구조 — 모든 verse 가 refrain ("Эзэнийг магтагтун. Түүнийг магтаж, бүгдийн дээр үүрд мөнх өргөмжлөгтүн.") 을 끝에 갖는다. phrase 단위는 (verse subject + refrain) tuple. PDF typography 는 refrain 만 indent 적용했을 가능성 — 재파싱 검증 필요.

→ 3 샘플 모두 PDF 원본 재파싱 (`pdftotext -layout` 또는 `pdfminer.six` Python) 으로 visual indent 복원 가능성 검증이 sub-WI 의 root.

---

## 4. 새 schema 설계 (4 옵션 비교)

### Option A — `lines[].indent` 의미 재정의 (가장 작은 변경)

기존 `lines[]` 유지, `indent: 0|1|2` 의 의미를 :

- `indent=0` → phrase **start** (web hard break 전)
- `indent=1` → phrase **continuation** (web soft wrap, hard break 없음)
- `indent=2` → 깊은 indent (예: 따옴표 인용)

renderer 변경: `indent=0` 의 line 들을 모아 `<p>` 1개로 emit (각 line 사이 공백), `indent=1/2` 는 같은 `<p>` 안에서 viewport wrap.

장점: schema 변경 0, 데이터 마이그레이션만 (indent 값을 0/1/2 로 redistribute).
단점: indent enum 의 기존 의미 (Tailwind `pl-6` / `pl-12` visual indent) 가 충돌. 현행 indent=0 데이터를 redistribute 하려면 phrase boundary 추출 cost 그대로 부담. R5 같은 verifier 부재.

### Option B — `lines[]` 위에 `phrases[]` 신설 (권고)

`PrayerBlock` `kind: 'stanza'` 에 `phrases?: { lineRange: [start, end]; indent?: 0|1|2 }[]` 신규 optional 필드 추가. 의미 :

- `lineRange` = 기존 `lines[]` 배열의 인덱스 범위 (inclusive both ends).
- `indent` = phrase 자체의 visual indent (별개 차원).
- phrases[] 부재 → 기존 fallback (각 line 별 hard break, 현행 동작).

```ts
{ kind: 'stanza';
  lines: { spans, indent, role? }[];           // 기존 — PDF visual line 1:1
  phrases?: { lineRange: [number, number];     // 신규 — phrase grouping
              indent?: 0 | 1 | 2;
              role?: 'refrain' | 'doxology'    // line.role 와 정합 필요 시 phrase 로 격상
            }[]
}
```

renderer: `phrases` 가 있으면 phrase 단위 `<p>` emit, `lines` 는 raw text source (lineRange 로 lookup) — **viewport wrap 자유**. phrase 부재 시 legacy line-단위 렌더 (회귀 0).

장점: additive, dual-field, partial migration 가능 (pilot → 확산). schema 변경 명확, downstream 호환.
단점: schema 가 redundant (lineRange 로 lines 를 다시 indexing) — 그러나 PDF 원형 보존 + phrase 추출 분리 의도이므로 의도된 redundancy.

### Option C — `lines[]` 폐기, phrase-only schema

`lines[]` 를 `phrases[]` 로 완전 대체. phrase 가 PDF source 기록 (e.g. `phrase.pdfLines: string[]` 으로 원형 보존).

장점: schema 깔끔, line-level hard break 의 잔존 위험 0.
단점: 현행 데이터 전체 마이그레이션 필수 (atomic). 회귀 위험 큼.

### Option D — block-level reflow (schema 무수정, renderer 만 변경)

renderer 가 punctuation heuristic 으로 runtime phrase boundary 를 추정. 데이터 / schema 0 변경.

장점: zero-data-migration. pivot 즉시 반영.
단점: heuristic 의 false-positive / negative 를 데이터에 기록할 수단 없음. 시편마다 manual 검수 필요. 회귀 시 디버그 어려움.

### 권고: **Option B**

이유 :

1. additive — 기존 데이터 그대로 두고 phrases 만 점진 추가 (pilot 부터).
2. 마이그레이션 phase 분할 가능 (Phase 0/1/2 — §6).
3. PDF 원형 (`lines[]`) 보존이 NFR-009 류 traceability 와 정합.
4. renderer 분기 명확 (phrases ? phrase-render : line-render).
5. R-verifier 신설 가능 (`scripts/verify-phrase-coverage.js` — phrase 가 모든 line 을 cover 하는지).

---

## 5. extractor 변경 (`scripts/extract-phrases-from-pdf.js` 신규)

### 5.1 두 단계 추출 — visual indent + heuristic fallback

#### Stage 1 — PDF visual indent 복원 (`pdftotext -layout` 또는 pdfminer)

```bash
pdftotext -layout "Four-Week psalter.- 2025.pdf" full_pdf_layout.txt
```

`-layout` 모드는 column 위치를 ASCII 공백으로 보존. flush-left 와 indented 가 leading whitespace 길이로 구분 가능. 단 multi-column PDF 의 경우 column 분리 처리 필요.

→ pilot 단계 **PDF 재파싱 가능성 검증** 자체가 sub-WI R-1 (LOW).

#### Stage 2 — punctuation heuristic (Stage 1 fail 또는 보조용)

```js
function inferPhraseBoundary(line, prevLine) {
  // 종료 cue: 문장부호 + 닫는 따옴표 / `гэв.` / `байна.`
  const ENDS = /[.!?][”"]?\s*$/u
  // 시작 cue: 대문자 시작 (Cyrillic 또는 라틴)
  const STARTS_NEW = /^[А-ЯЁA-Z“"]/u
  // 종속 cue: 콤마 끝 / 소문자 시작 / 종속절 마커
  const CONTINUES = /,\s*$/u
  return ENDS.test(prevLine) && STARTS_NEW.test(line)
}
```

- 종료 cue 발견 다음 line 이 시작 cue → phrase boundary.
- 그 외 → continuation (현재 phrase 에 포함).
- 모호 case (`гэж`, `:` 끝, refrain 시작) 는 manual 검수 마킹.

#### Stage 3 — verification cross-check

Stage 1 (indent) 와 Stage 2 (heuristic) 결과를 cross-check :

- 100% 일치 → high-confidence, auto-emit.
- 80-99% 일치 → emit + warning log + manual review queue.
- < 80% → manual review 강제.

### 5.2 산출 schema

```jsonc
// scripts/out/phrase-extract.json
{
  "Psalm 110:1-5, 7": {
    "stanzas": [
      {
        "stanzaIdx": 0,
        "phrases": [
          { "lineRange": [0, 3], "confidence": "high",
            "evidence": "indent + punctuation 일치" },
          { "lineRange": [4, 5], "confidence": "high",
            "evidence": "indent" },
          ...
        ]
      },
      ...
    ]
  },
  ...
}
```

builder (`scripts/build-phrases-into-rich.mjs`) 가 본 산출을 `psalter-texts.rich.json` 에 phrases 필드로 inject.

### 5.3 verifier (R-verifier)

`scripts/verify-phrase-coverage.js` :

- 모든 stanza 의 phrases 가 lines 를 빈 곳 없이 cover 하는지.
- 중첩 0 (lineRange 가 disjoint).
- confidence 분포 리포트.
- `--check` 모드는 violation > 0 시 exit 1 (CI gate 후보, **NFR-009j 신설**).

---

## 6. renderer 변경 (viewport-aware)

### 6.1 시편 (`src/components/psalm-block.tsx`)

```tsx
{psalm.stanzasRich.blocks.map((block) => {
  if (block.kind !== 'stanza') return null
  return block.phrases ? renderPhraseStanza(block) : renderLineStanza(block)
})}

function renderPhraseStanza(block) {
  return (
    <div className="space-y-3 pl-3">
      {block.phrases.map((p, pi) => {
        const text = block.lines
          .slice(p.lineRange[0], p.lineRange[1] + 1)
          .map((l) => l.spans.map((s) => s.text).join(''))
          .join(' ')        // PDF wrap → 단일 공백
        const indentClass = phraseIndentClass(p.indent)
        const isRefrain = p.role === 'refrain'
        return (
          <p
            key={pi}
            data-role={isRefrain ? 'psalm-stanza-refrain' : 'psalm-phrase'}
            className={`font-serif text-base leading-relaxed${indentClass}${
              isRefrain ? ' text-red-700 dark:text-red-400' : ''
            }`}
          >
            {text}
          </p>
        )
      })}
    </div>
  )
}

// 기존 renderLineStanza 는 phrases 부재 시 fallback (회귀 0).
```

핵심 :

- phrase 1개 = `<p>` 1개 = browser viewport 자유 wrap.
- `whitespace-pre-line` 제거 (phrase 모드).
- PDF wrap 은 단일 공백으로 join (semantic content 보존).
- refrain / doxology 는 phrase-level role 로 격상.

### 6.2 기도문 (`src/components/prayer-sections/rich-content.tsx`)

prose `kind: 'para'` 는 변경 0 (이미 phrase-aware).
`kind: 'stanza'` 가 사용되는 비-시편 (canticle 본문 in 기도문 카탈로그, hymn 본문 등) 도 시편과 동일 phrase-aware 처리.

### 6.3 CSS 정책

- `space-y-3` → phrase 사이 vertical gap (현행 `space-y-5` 보다 작게 — phrase 가 더 작은 단위이므로).
- `leading-relaxed` (1.625) 유지.
- `pl-6` / `pl-12` indent 은 `phrase.indent` 에서만 적용 (line-level indent 미사용).

---

## 7. 마이그레이션 전략 (3-phase)

### Phase 0 — pilot (1 시편, ~1 PR)

- **target**: Psalm 110:1-5, 7 (Sunday Vespers I, week 1).
- 작업: PDF 재파싱 + phrase 추출 + manual 검수 + JSON inject + renderer 분기 추가 + e2e 1 (Sunday Vespers I 시편 phrase 렌더 검증).
- 검증: 모바일 (Pixel 7 Playwright) + desktop, refrain (없음) regression.
- 목적: schema + extractor + renderer **end-to-end pipeline 검증** 1편으로 위험 최소화.

### Phase 1 — 1주차 확산 (14 시편, ~3 PR)

- target: w1 SUN/MON/.../SAT × lauds/vespers (14 hours, ~30 시편).
- 작업: pilot 의 extractor + renderer 그대로 적용. 데이터 측 마이그레이션 위주.
- 검증: phrase coverage verifier (NFR-009j) 가 모든 ref OK 인지.

### Phase 2 — 4주차 + 특별 (125 시편, ~5-7 PR)

- target: w2/w3/w4 + canticles + invitatory + compline + Magnificat / Benedictus / Nunc Dimittis.
- 기도문 stanza-kind 도 동일 마이그레이션.
- 검증: phrase coverage verifier 0 violations + PRD count 정합.

### Phase 3 — line-level hard break 폐기 (optional, 안정화 후)

- phrases 가 100% coverage 검증되면 `phrases` optional → required 로 강화.
- legacy line-render path 제거 (renderer simplify).
- schema migration `phrases: required`.

→ Phase 0/1/2 는 dual-field 호환. Phase 3 는 회귀 위험 평가 후 진행.

---

## 8. 검증 / 회귀

### 8.1 자동 (CI gate)

- `scripts/verify-phrase-coverage.js --check` (NFR-009j 후보) — 본 plan 의 R-verifier 신설.
- vitest unit — phrase renderer 의 `<p data-role="psalm-phrase">` count 가 데이터 phrases.length 와 일치.
- vitest unit — phrases 부재 시 legacy line-render path (회귀 0).

### 8.2 e2e (Playwright)

- pilot Phase 0: `e2e/phrase-render-pilot.spec.ts` — Sunday Vespers I Psalm 110:1-5,7 phrase 단위 렌더 + Pixel 7 mobile viewport 에서 PDF wrap 동작 확인.
- Phase 1+: 시즌별 phrase 정합성 spec (선택적).
- mobile screenshots (Pixel 7) — `.playwright-mcp/fr161-pilot-{psalm}-{viewport}.png` 4 (mobile-narrow / mobile-wide / desktop-narrow / desktop-wide).

### 8.3 manual (CLAUDE.md 체크리스트)

- iOS Safari + Add-to-Home-Screen PWA 에서 phrase wrap 동작 확인 (이전 SW 등록 상태).
- Slow 3G 네트워크에서 PDF body fetch latency 무회귀.
- 몽골어 정확성 (`Гуйлтын` 등) phrase 추출 시 token 손실 0 확인 — phrase join 시 spans.text 가 lossless.

---

## 9. SW 캐시 / sw.js 영향

- 새 라우트 / 자산 경로 / Content-Type 변경 **0건**.
- 기존 `/api/loth/[date]` 응답에 `phrases` 필드 추가 (additive).
- `CACHE_VERSION` bump **불필요** (cache 정책 변경 없음).
- 단 client renderer 와 데이터가 동시 deploy 되어야 함 — atomic PR 원칙. 데이터만 먼저 deploy 시 phrases 필드는 미사용 (legacy fallback), renderer 만 먼저 deploy 시 phrases 필드 부재 (legacy fallback). → 어떤 순서든 회귀 0, 단 활성화는 둘 다 land 후.

---

## 10. PRD / FR 번호 / NFR

### 10.1 FR 번호 — **FR-161** 권고

- CLAUDE.md FR 규칙: "새 기능은 기존 범위 내에서 다음 번호 사용" → FR-160 다음 = **FR-161**.
- subletters: FR-161 자체가 phrase pivot, 후속 영역은 FR-161-A (시편 pilot), FR-161-B (1주차 확산), FR-161-C (4주차 + 특별), FR-161-D (Phase 3 legacy 폐기) 권고.
- 대안: FR-160 의 sub 로 FR-160-E 등 — 하지만 FR-160 은 refrain 정합화 / Phase B / Phase C 등 이미 광범위, 별 FR 권고.

### 10.2 NFR 신설 — **NFR-009j** 권고

- 명: "Phrase coverage 정합성 (FR-161)".
- 정의: `psalter-texts.rich.json` 의 모든 stanza block 은 (a) phrases 부재 OR (b) phrases 가 lines 전체를 disjoint cover. 위반 시 빌드/CI fail.
- 검증 스크립트: `scripts/verify-phrase-coverage.js [--check]`.

### 10.3 traceability-matrix

- 새 row: `FR-161` + e2e tag `@fr FR-161`.
- 자동 매핑: `scripts/generate-test-fr-map.mjs` 가 주석 추출 → `traceability-auto.md` 갱신.

---

## 11. Sub-WI 분해 (decompose 단계 입력)

| sub-WI | 범위 | 복잡도 | 의존 |
| ------ | ---- | :----: | ---- |
| **R-0** | PDF 재파싱 가능성 spike — `pdftotext -layout` 또는 pdfminer.six 로 visual indent 복원 검증 (3 샘플 시편) | LOW (~2h spike, 산출 1 markdown report) | None |
| **R-1** | extractor `scripts/extract-phrases-from-pdf.js` 신설 — Stage 1 visual indent + Stage 2 punctuation heuristic + Stage 3 cross-check + 산출 JSON schema | MEDIUM (~150 LOC + snapshot test 3 샘플) | R-0 |
| **R-2** | builder `scripts/build-phrases-into-rich.mjs` 신설 — phrase JSON 을 `psalter-texts.rich.json` 의 stanza.phrases 필드로 inject (additive, atomic) | LOW (~50 LOC + dry-run 모드) | R-1 |
| **R-3** | schema `PrayerBlock` `kind: 'stanza'` 에 `phrases?: PhraseGroup[]` 추가 + `PhraseGroup` type + Zod runtime + types.ts JSDoc | LOW (~20 LOC + schemas.test.ts 4 case) | None (R-1 과 병렬) |
| **R-4** | renderer `psalm-block.tsx` 분기 — phrases 있을 때 phrase-render, 없을 때 legacy line-render. CSS 조정 | SMALL (~50 LOC + unit 4 case) | R-3 |
| **R-5** | renderer `rich-content.tsx` 의 `kind: 'stanza'` 도 동일 분기 (canticle/hymn 본문 영향 추적) | SMALL (~30 LOC + unit 2 case) | R-4 |
| **R-6** | verifier `scripts/verify-phrase-coverage.js [--check]` + NFR-009j 신설 + CI gate | LOW (~40 LOC + integration test 1) | R-2, R-3 |
| **R-7** | **pilot Psalm 110:1-5,7** end-to-end — extractor 실행 + manual 검수 + builder inject + renderer e2e + Pixel 7 screenshot 4 viewport | MEDIUM (PR 단위 통합, e2e + 데이터 1 ref) | R-2, R-4, R-6 |
| **R-8** | Phase 1 확산 — 1주차 14 hours / ~30 시편 데이터 마이그레이션 + verifier 0 violations | MEDIUM (데이터 측, ~30 ref × 검수) | R-7 |
| **R-9** | Phase 2 확산 — w2/w3/w4 + canticles + invitatory + compline 전수 (~95 ref) | LARGE (5-7 PR 분할, member 다수 분담) | R-8 |
| **R-10** | 기도문 `kind: 'stanza'` (hymn / 기도문 카탈로그) 도 동일 마이그레이션 | MEDIUM | R-5, R-9 |
| **R-11** | PRD `FR-161` 행 + NFR-009j 행 + traceability-matrix + traceability-auto | LOW | R-7+ |
| **R-12** | (Phase 3 — optional) phrases required 강화 + legacy line-render 폐기 | MEDIUM (회귀 평가 후 dispatch) | 전체 phase 안정화 |

총 12 sub-WI (R-0 spike 우선, R-7 pilot 이 1차 milestone). **권고 진행 순서**: `R-0 → (R-1 ‖ R-3) → R-2 → (R-4 ‖ R-6) → R-5 → R-7 (pilot milestone) → R-8 → R-9 → R-10 → R-11 → R-12 (optional)`.

병렬화 :

- R-1 (extractor) ‖ R-3 (schema) — 독립 파일.
- R-4 (renderer) ‖ R-6 (verifier) — 둘 다 R-2/R-3 후.

---

## 12. 결정 필요 (leader/user)

본 plan 은 다음 4 결정을 leader/user 에게 표면화 한다 :

### D-1 — schema 옵션 (Option B 권고, 그러나 leader 결정)

§4 4 옵션 중 :

- (A) `lines[].indent` 의미 재정의
- (B) `phrases?: PhraseGroup[]` 신설 (additive) — **권고**
- (C) `lines[]` 폐기 phrase-only
- (D) renderer-only heuristic, 데이터 무수정

권고: B. 그러나 schema 의 redundant 표현을 거부할 수도 있음. user 결정 필요.

### D-2 — FR 번호 (FR-161 권고)

§10.1. 대안 FR-160-E 가능. 권고: **FR-161** (FR-160 의 phase 광범위 감안).

### D-3 — pilot 시편 선정 (Psalm 110:1-5,7 권고)

§7 Phase 0. 권고 :

- **Psalm 110:1-5,7** (Sunday Vespers I) — 2 stanzas, 20 lines, refrain 없음, e2e (Sunday Vespers) 안전망 보유. 가장 단순.

대안 :

- **Psalm 24:1-10** (Tuesday Lauds) — refrain 6 lines (FR-160 A4 marked), phrase-refrain 정합 검증 동시 가능. 약간 복잡.
- **Daniel 3:57-88, 56** (Sunday Lauds Canticle) — 44-rep refrain, 가장 stress-test. 위험 큼, pilot 부적합.

권고: **Psalm 110**. user 결정 필요.

### D-4 — 마이그레이션 phase 분할

§7 의 3-phase (Phase 0 pilot → Phase 1 1주차 → Phase 2 4주차+특별 → Phase 3 legacy 폐기) :

- Phase 0/1/2 는 backward-compat 유지. 회귀 위험 작음.
- Phase 3 는 schema breaking change. 별도 dispatch 권고.

대안 :

- 단일 Phase (모든 시편 한 번에) — 데이터 PR 단위 작아지지만 회귀 평가 어려움.
- 2-Phase (pilot + 일괄) — phase 1 의 점진 검증 단계 생략.

권고: **3-phase**. user 결정 필요.

---

## 13. 리스크 / 대안

| 리스크 | 영향 | 완화 |
|--------|------|------|
| PDF 재파싱 (`pdftotext -layout` / pdfminer) 가 indent 복원 실패 | extractor Stage 1 무력화, heuristic-only 로 fallback | R-0 spike 로 사전 검증. fail 시 phrase boundary 추출 cost 증가 (manual 검수 비율 ↑) |
| Cyrillic 대문자 heuristic 의 false-positive (e.g. 인명 mid-sentence) | phrase 분리 오류 → 시각 깨짐 | confidence < 80% 는 manual review queue. snapshot test 로 회귀 catch |
| Refrain 마킹 (FR-160 A1/A4) 와 phrase boundary 불일치 | refrain 이 phrase 중간에서 잘림 | phrase 추출 시 refrain boundary 우선 (refrain 시작/끝 = phrase boundary 강제) |
| 125 시편 마이그레이션의 manual 검수 부담 | 일정 폭증, Phase 2 가 multi-PR | member 분담 (4-week × 4 멤버), PR 단위 분할 |
| Mobile viewport 에서 phrase 가 너무 길어 wrap 시 가독성 저하 | UX 회귀 (이중 줄바꿈 해소했으나 다른 문제) | Pixel 7 + iPhone SE viewport screenshot manual 검수, 길이 임계 알림 |
| 기도문 `kind: 'stanza'` (hymn 본문 등) 의 phrase 정책이 시편과 다를 수 있음 | hymn 의 strophe 단위가 시편 phrase 와 충돌 | R-10 별도 sub-WI 로 분리, hymn 만의 phrase 정책 정의 (별 plan 후속) |
| Service Worker 의 stale HTML 이 phrase 렌더 fallback 충돌 | 모바일 PWA 사용자 깨진 화면 | navigation network-only 정책 유지 (CLAUDE.md), CACHE_VERSION 무관 — 현행 SW 정책으로 안전 |
| `whitespace-pre-line` 제거가 다른 컴포넌트 (legacy line-render path) 깨뜨릴 가능성 | 회귀 | renderer 분기로 phrases 없는 경우 legacy class 그대로 보존 |
| schema dual-field 의 점진 마이그레이션 동안 traceability 보고 혼란 | 어느 ref 가 phrase-aware 인지 추적 어려움 | verifier 의 진단 로그 + PRD §FR-161 행에 마이그레이션 표 (Phase 진행 상태) 유지 |

---

## 14. 결론 — Approve 판단 기준

본 plan 은 다음 4 가정에 의존 :

1. PDF 원본 (`Four-Week psalter.- 2025.pdf`) 의 indent 가 `pdftotext -layout` 으로 일부 복원 가능 (R-0 spike 가 1차 검증).
2. punctuation + capitalization heuristic 의 confidence ≥ 80% 가 가능 (Stage 2; pilot 결과로 보정).
3. Option B schema (additive `phrases?: PhraseGroup[]`) 가 downstream consumer 에 미치는 영향이 Option A/C/D 보다 작음.
4. 3-phase 마이그레이션 (pilot → 1주차 → 4주차+특별) 이 회귀 위험을 phase 별로 contain 가능.

가정 위배 시 :

- R-0 fail → heuristic-only 로 cost 증가 — phase 일정 늘림 (deferred ok).
- confidence < 80% → manual 검수 비율 ↑, R-7 pilot 의 검증 round-trip 길어짐.
- schema 결정 변경 → R-3 재설계, R-4/R-5 영향.
- phase 변경 → §7 재분할.

가정 1-2 는 R-0 spike 로 자동 검증, 가정 3-4 는 D-1 + D-4 결정 게이트.

→ Direction approval (D-1 ~ D-4 결정) 후 `pair-cli plan save-steps` + `/pair-decompose` R-0~R-12 진행 권고. **R-0 spike 가 의존 그래프 root 임을 dispatch 시 명시**.

---

## 부록 A — 의존 자료

- `parsed_data/full_pdf.txt` (32,761 lines, 1.5 MB) — 현행 텍스트 source, indent 손실 상태.
- `Four-Week psalter.- 2025.pdf` (project root) — 원본 PDF, 재파싱 source.
- `src/data/loth/prayers/commons/psalter-texts.rich.json` (125 keys, 37,302 lines) — 현행 시편 catalog.
- `src/lib/types.ts:84-94` — `PrayerSpan` / `PrayerBlock` schema (현행 `kind: 'stanza'` 의 line 단위).
- `src/components/psalm-block.tsx:43-72` — 현행 시편 line-단위 렌더링.
- `src/components/prayer-sections/rich-content.tsx` — 기도문 `kind: 'para'` 의 phrase-aware 렌더 (참고 모델).
- `docs/PRD.md` FR-160 행 (last FR) — FR-161 추가 위치.
- `CLAUDE.md` SW 캐시 정책 (navigation network-only) + 변경 체크리스트.

## 부록 B — 본 plan 미커버 (별 dispatch 후보)

- hymn `kind: 'stanza'` 의 strophe 단위 phrase 정책 — R-10 의 hymn-specific plan 후속.
- 4-week psalter 외의 `Магтаал` canticle (FR-160-C-2 R2 plan #167/#170 의 23 OT entries) 의 phrase 처리.
- mobile-specific typography (font-size, line-height) 미세 튜닝 — UX 별 dispatch.
- accessibility (screen reader phrase boundary 의 aria-label) 검증 별 dispatch.
