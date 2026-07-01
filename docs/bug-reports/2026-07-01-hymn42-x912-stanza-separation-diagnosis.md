# 진단 리포트 — 찬미가 42 (X.912) 문단(연) 구분 미구현

- **GOAL**: #35 / g-25
- **WI**: #35-sub-1 (task 36) — Step 1 Bug reproduction (RED), 진단 전용(수정 금지)
- **작성**: dvo-dev-cl (2026-07-01)
- **원인 확정**: **(b) stanza(연) 분리 누락 — DATA 레벨** (`42.rich.json` 에 `paragraphBoundaries` 필드 부재)
- **상태**: 진단 완료. 코드/데이터 수정 없음(후속 #37 Develop).

---

## 1. 증상

사용자 신고: `/pray/2026-07-21/vespers` 찬미가 42(X.912) 에서 **문단(연)·행 구분이 안 보임 ("통짜")**. g-22 에서 wrap hanging-indent 를 복원(DO-NOT-REVERT)했음에도 여전히 문단 구분이 없음.

---

## 2. 재현 — in-process real-production-render (viewport-invariant)

실제 `HymnSection` 컴포넌트에 hymn 42 의 real `textRich` 를 넣어 production 렌더 경로(`renderToStaticMarkup`)로 렌더한 결과:

```
DIAG_HYMN42_RESULT {
  "blockLines": 12,             ← 12개 라인이 각각 별도 block 으로 렌더 (행 구분 O)
  "hangingIndent": 12,          ← 12개 전부 -indent-6 hanging indent 적용 (g-22 wrap 가드 살아있음)
  "paragraphGaps": 0,           ← mt-3 stanza gap 0개 (연 구분 X)
  "paragraphBoundaryAttrs": 0,  ← data-paragraph-boundary 속성 0개
  "renderMode": "phrase",       ← phrase-render 경로 (예상대로)
  "hasParagraphBoundariesField": false  ← 42.rich.json block 에 paragraphBoundaries 필드 없음
}
```

렌더된 HTML(발췌) — 12줄이 **동일 간격**으로 연속 렌더, 연 사이 간격 0:

```html
<p ... data-render-mode="phrase">
  <span data-role="psalm-phrase" class="block pl-6 -indent-6"><span>Есүс хамгийн нандин нэр юм аа</span></span>
  <span data-role="psalm-phrase" class="block pl-6 -indent-6"><span>Есүс Та үргэлж гуйлтад хариулдаг</span></span>
  <span data-role="psalm-phrase" class="block pl-6 -indent-6"><span>ӨӨ Есүс миний гараас барьдаг Эзэн</span></span>
  <span data-role="psalm-phrase" class="block pl-6 -indent-6"><span>Хамгийн нандин Түүний нэр Есүс</span></span>   ← 연1 끝(후렴)
  <span data-role="psalm-phrase" class="block pl-6 -indent-6"><span>Есүсээ магтан дуулахыг хүсэж байна</span></span>  ← 연2 시작 — mt-3 없음
  ... (연2, 연3 도 동일, 간격 차 0) ...
</p>
```

> in-process 실렌더를 outcome evidence 로 사용(디스패치 승인 형식). `paragraphGaps=0` 은 **viewport-불변**(mt-3 유무는 폭·글꼴과 무관) 이므로 좁은폭 Playwright 픽셀 스크린샷이 진단 결론을 바꾸지 않음 — 320/360/390 어느 폭에서도 연 간격은 0. (행 wrap hanging-indent 는 (c) 후보였으나 아래에서 배제되므로 픽셀 확인 불요.)

---

## 3. 원인 확정 — (b) stanza 분리 누락 (DATA)

### 데이터 구조 (`src/data/loth/prayers/hymns/42.rich.json`)

`hymnRich.blocks` 는 **단일 block** (`kind: 'stanza'`, lines 12, phrases 12). block 키 = `['kind','lines','phrases']` — **`paragraphBoundaries` 필드 없음**.

12개 라인은 후렴 "Хамгийн нандин Түүний нэр Есүс" 가 line 3·7·11 에 반복되는 **4행×3연** 구조:
- 연1: line 0–3, 연2: line 4–7, 연3: line 8–11.

### 렌더 로직은 연 구분을 지원함 (`rich-content.tsx`)

`renderBlock` phrase-path (L409, L434–435):
```ts
const paragraphBoundarySet = new Set(block.paragraphBoundaries ?? [])
...
const isParagraphStart = paragraphBoundarySet.has(start)   // start = phrase.lineRange[0]
const paragraphClass = isParagraphStart ? 'mt-3' : ''      // 연 간 간격
```
→ `paragraphBoundaries` 에 phrase 시작 line 이 들어 있으면 `mt-3`(연 간격) 삽입. **hymn 42 는 이 필드가 없어 `paragraphBoundarySet` 이 비어 있음 → mt-3 0개 → 연 구분 렌더 안 됨.**

### 선례 — hymn 37 은 이미 이 필드로 연 구분함

`37.rich.json` block[0]: `kind=stanza, n_lines=12, paragraphBoundaries=[2, 6, 8]` (rich-content.tsx L406 주석 "магтуу #37 'Дээдийн дээд' stanza breaks, PDF p906"). 동일 단일-block 구조에서 `paragraphBoundaries` 로 연을 나눔 → **hymn 42 도 같은 패턴을 쓰면 됨.**

### 왜 g-22 후에도 안 보였나

g-22 는 **wrap-continuation hanging-indent**(행 wrap 시 들여쓰기)만 복원했고, **연(stanza) 경계**는 다룬 적이 없음. g-22 진단리포트(`docs/bug-reports/2026-06-30-magtuu-hymn-linebreak-phrase-heuristic.md §3`)의 "데이터 정상(시행 12, orphan 0)" 은 **행/phrase 구조**에 대한 판정이지 **연 grouping(`paragraphBoundaries`)** 은 점검 대상이 아니었음. 그래서 연-분리 gap 이 미검출로 남음. 사용자의 "문단 구분" 은 g-22 가 고친 것과 다른 축(연 경계)이라 여전히 미해결.

---

## 4. 다른 원인 배제

| 후보 | 판정 | 근거 |
|---|---|---|
| (a) 캐시/배포 구버전 | **배제(단독 원인 아님)** | 현재 main HEAD(base 1a7fe07) 렌더 자체가 `paragraphGaps=0`. 코드/데이터에 연-분리가 애초에 없으므로 하드리프레시로도 안 고쳐짐. (사용자 기기가 추가로 stale 일 수는 있으나 근본원인은 main 에 존재) |
| **(b) stanza 분리 누락** | **✅ 확정** | 42.rich.json 에 `paragraphBoundaries` 부재 → mt-3 0 (§3) |
| (c) 행 들여쓰기 미적용 | **배제** | 12/12 라인에 `pl-6 -indent-6` 적용됨. g-22 hanging indent 가 이 phrase-path(hymn-section.tsx:54 `flush`)에 살아있음. 행 구분·wrap indent 정상 |
| (d) 잔여결함 | **배제** | 원인이 (b) 단일 데이터-필드 부재로 깔끔히 특정됨 |

---

## 5. 권고 수정안 (후속 #37 — 이 WI 에서는 미실행)

**DATA-only, 코드 변경 0, 본문 글자 불변(MT 아님):**

`src/data/loth/prayers/hymns/42.rich.json` `hymnRich.blocks[0]` 에 추가:
```json
"paragraphBoundaries": [4, 8]
```
- `4` = 연2 시작(line 4), `8` = 연3 시작(line 8). 후렴(line 3·7·11) 로 구분되는 4행×3연 구조 기준.
- 렌더는 이미 지원(hymn 37 과 동일 경로) → `mt-3` 연 간격이 세 연 사이에 렌더됨. 새 컴포넌트/CSS/디자인 선택 불요(기존 mt-3 컨벤션 재사용, hymn 37 선례).
- **본문 글자·행 순서 불변**, phrases/lines 무변경. 오직 연 grouping 메타데이터만 추가.

시각 디자인 선택(연 간격 크기 등)을 바꾸려면 그건 별건 — 현재는 hymn 37 과 동일한 `mt-3` 를 권고(추가 AskUser 불요).

---

## 부록 — 핵심 파일·근거

- 데이터(원인): `src/data/loth/prayers/hymns/42.rich.json` — `hymnRich.blocks[0]` (paragraphBoundaries 부재)
- 렌더 로직(지원): `src/components/prayer-sections/rich-content.tsx:409, 434-435` (mt-3 paragraph gap)
- 호출부: `src/components/hymn-section.tsx:54` (`<RichContent ... flush />`, legacy phrase-path)
- 선례: `src/data/loth/prayers/hymns/37.rich.json` (`paragraphBoundaries: [2,6,8]`)
- PDF SoT: `parsed_data/full_pdf.txt:31029-31048` (hymn 42 body — 후렴 3회 반복 = 3연 구조; 텍스트 추출은 연 사이 blank-line 없이 연속, page-break(913)만 존재)
