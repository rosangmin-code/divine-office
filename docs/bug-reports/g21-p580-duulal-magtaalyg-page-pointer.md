# 버그 리포트 — "Дуулал ба магтаалыг" 안내문의 `(х. 580)` page-pointer 오류

- **GOAL**: #3 / g-21
- **WI**: #3-sub-2 (task 11)
- **작성**: dvo-dev-cl (2026-06-30)
- **분류**: 데이터-렌더 결합 오류 (provenance 메타데이터를 사용자-네비게이션 page-pointer 로 오노출)
- **관련 FR**: FR-170 (대축일 psalmody fallback notice, GOAL #105) · FR-160-B PR-9a (conditional-rubric directive 렌더) · FR-017 (PageRef) · GOAL #201-sub-2 (`directiveSourcePage` 가 `evidencePdf.page` 를 전파)
- **상태**: 원인 파악 + 수정 제안 완료. **코드/데이터 수정은 후속 GOAL** (이 WI 제약).

---

## 1. 증상 (사용자 보고 + 스크린샷 재현)

스크린샷 `Screenshot_20260628_221618_Samsung Browser.jpg` — МАГТУУ(찬미가) 섹션 하단:

> *Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна.* **(х. 580)**
> (= "시편과 찬미가는 현재 진행 중인 주간에서 가져온다. (p.580)")

사용자: **"p580 에 안내문이 있다고 하는데 실제로는 없음."**

→ 안내문 옆 `(х. 580)` 페이지 링크를 따라가면, **그 전례일과 무관한 다른 날**(12월 24일/대림 시기)이 나온다. 즉 page-pointer 가 가리키는 페이지가 이 안내문의 맥락이 아니다. (대축일뿐 아니라 가동축일 5곳에서도 동일 — §5 참조.)

---

## 2. 텍스트·페이지 번호 생성 경로 추적

### 2.1 안내문 텍스트 + 페이지 번호의 출처 (데이터)

`(х. 580)` 은 **데이터 텍스트에 하드코드된 것이 아니다.** SoT 데이터 텍스트는 페이지 번호 없이 순수 안내문만 담고, `580` 은 별도의 `evidencePdf.page` 필드에서 온다.

**전체 `src/data/loth` node-walk** (solemnities.json 단독 스코프가 아님 — 가동축일 propers 포함):

```bash
$ python3 -c "...walk all src/data/loth/**/*.json for target.text=='Дуулал ба магтаалыг...' ..."
TOTAL directives with this notice text: 20
  14x  file=sanctoral/solemnities.json   action=prepend     page=580
   4x  file=propers/ordinary-time.json   action=prepend     page=580
   1x  file=propers/easter.json          action=prepend     page=580
   1x  file=propers/advent.json          action=substitute  page=580   # ← native Dec24 원본(정답)
```

→ **prepend 안내문 19곳** 전부 `page=580`. + advent.json 의 substitute 1곳(= 12/24 원본, 580 이 정답)을 합쳐 총 20개 directive 가 동일 안내문 텍스트를 공유한다.

해당 directive 구조 (St. Joseph firstVespers, line 99-119):

```json
{
  "rubricId": "sanctoral-solemnity-03-19-st-joseph-firstvespers-weekday-psalmody-notice",
  "action": "prepend",
  "target": { "text": "Дуулал ба магтаалыг явагдаж буй долоо хоногоос татаж авна." },
  "appliesTo": { "section": "psalmody" },
  "evidencePdf": { "page": 580, "line": 20071, "text": "Дуулал ба магтаалыг ..." },
  "liturgicalBasis": "... GILH §226 ... running four-week psalter ... reused without fabrication."
}
```

→ `(х. 580)` 의 `580` 은 **`evidencePdf.page` 필드**에서 나온다.

### 2.2 `evidencePdf.page` → 화면 `(х. NNN)` 렌더 파이프라인

```
solemnities.json: evidencePdf.page = 580
   │
   ▼  src/lib/hours/conditional-rubric-resolver.ts:150
      if (typeof rubric.evidencePdf?.page === 'number') out.page = rubric.evidencePdf.page
   │   (주석 L147: "the evidence SoT (evidencePdf.page), never hand-maintained")
   ▼  override.page = 580
   │
   ▼  src/components/prayer-sections/directive-block.tsx:15-19  directiveSourcePage(d)
      if (typeof d.page !== 'number') return undefined
      if (d.text != null && INLINE_PAGE_RE.test(d.text)) return undefined   // 텍스트에 인라인 'х.' 없음 → 통과
      return d.page                                                          // 580 반환
   │
   ▼  directive-block.tsx:58  {sourcePage != null && <PageRef page={sourcePage} />}
   ▼  src/components/page-ref.tsx:18  (х. {page})  →  화면에 "(х. 580)"
```

**렌더 로직은 정상이다.** `evidencePdf.page` 를 충실히 파생해 보여줄 뿐, DV2(SoT 파생) 관점에서 숫자 자체는 데이터에서 왔다. → **로직 버그 아님.**

---

## 3. 580 이 왜 "틀렸는지" — 근본 원인

### 3.1 안내문 텍스트는 PDF 전체에서 단 1회만 인쇄됨

```bash
$ grep -rn "Дуулал ба магтаалыг явагдаж буй" parsed_data/full_pdf.txt
20071:Дуулал ба магтаалыг явагдаж буй долоо хоногоос    # ← 유일한 출현
```

그 line 20071 의 인쇄 페이지(책 page marker):

```bash
$ awk 'NR>=20056 && NR<=20062' parsed_data/full_pdf.txt
20058: 580                       # ← 책 페이지 마커
20059: 580
20061: Ирэлтийн цаг улирал         # "대림 시기"
20062: 12 ДУГААР САРЫН 24          # "12월 24일"
...
20071: Дуулал ба магтаалыг ...    # 안내문 — 580페이지(=12월24일/대림) 맥락
```

→ **book page 580 = 12월 24일(대림 시기 / 성탄 전야)** 이다. 안내문 텍스트는 이 12월 24일 페이지에 인쇄된 generic 루브릭이고, **PDF 전체에서 여기 한 곳에만** 있다.

### 3.2 19개 prepend directive 가 native 원본(advent 12/24)에서 page 580 을 복제

`evidencePdf.page = 580` 은 **"이 재사용 안내문 문자열을 PDF 어디서 가져왔는가"** 의 provenance(출처 증거) 메타데이터다.

**native 원본** = `propers/advent.json` 의 `advent-dec24-sun-lauds-psalmody-substitute` (`action: substitute`, `evidencePdf.page=580, line=20071`). 이건 12/24 Lauds 의 *실제 인쇄 콘텐츠*로, 580 이 **정답**이다(book page 580 = 12/24 본문, §3.1).

이 native 안내문 텍스트 + `page=580` 이 **19개 prepend directive 로 복제(clone)** 되었다. 전체 `src/data/loth` walk(§2.1) 결과:

```
action=prepend, page=580  →  19곳:
  sanctoral/solemnities.json   14   (7 고정대축일 × firstVespers+vespers2)
    03-19 st-joseph / 03-25 annunciation / 06-24 baptist / 06-29 peter-paul /
    08-15 assumption / 11-01 all-saints / 12-08 immaculate-conception
  propers/ordinary-time.json    4   (firstVespers — 가동축일)
    ot-trinity / ot-corpus / ot-sacredheart / ot-christtheking
  propers/easter.json           1   (firstVespers)
    easter-ascension
```

이 19개 전례일(3/19, 삼위일체, 승천 등)은 **12월 24일과 전혀 무관**하다. native substitute(12/24)와 달리, 이들은 자기 날의 인쇄 페이지가 아니라 **빌려온 텍스트의 출처 페이지(580 = 12/24)** 를 그대로 물려받았다.

### 3.3 결론 — provenance 를 user-facing navigation 으로 오노출

> **모든 580 이 틀린 게 아니다.** native substitute(advent 12/24 Lauds)의 580 은 *정답*(그 페이지가 실제 12/24 본문). 결함은 **19개 cloned prepend** 가 자기 날과 무관한 이 580 을 user-facing page-pointer 로 노출하는 것이다.

`evidencePdf.page` 는 본래 **내부 출처 증거**(어느 PDF 라인에서 fallback 텍스트를 빌려왔는지)다. 그런데 GOAL #201-sub-2 가 이를 `override.page` → `PageRef` 로 연결하면서 **사용자 클릭용 `(х. 580)` 네비게이션 링크로 승격**시켰다.

- 이 안내문은 `liturgicalBasis` 가 명시하듯 **합성 fallback** 이다 — "시편/찬미가는 *현재 주간*에서 가져온다." 가리킬 고정 페이지가 **존재하지 않는다** (주간마다 다름).
- 그럼에도 19개 cloned prepend 모두가, **빌려온 문자열의 출처 페이지(580 = 12월 24일 native substitute)** 를 page-pointer 로 노출한다.
- 그래서 사용자가 예컨대 St. Joseph(3월 19일)·삼위일체·승천 등을 보다가 `(х. 580)` 을 따라가면 **12월 24일(대림)** 콘텐츠를 만난다 → "이 안내문이 p580 에 있다더니, (이 전례일 맥락에선) 실제로는 없다."

**한 줄 요약**: 데이터 값 `580` 자체는 native substitute(12/24)에선 정답이지만, 그 값을 19개 cloned prepend 가 물려받아 **provenance(증거 page)를 user-facing navigation page-pointer 로 surface 한 것이 결함**이다. cloned fallback 안내문은 가리킬 고정 페이지가 없으므로 애초에 page-pointer 를 달면 안 된다.

---

## 4. 수정 제안 (구현은 후속 GOAL)

> 핵심: **prepend fallback 안내문** directive(19곳)의 page-pointer 만 제거. `action: substitute` directive(advent 12/24 native @580, page 819/608 등 — 실제 콘텐츠 위치 인용)는 **정상 인용이므로 절대 건드리지 말 것.**

### (권장) 옵션 A — 렌더 단계에서 fallback 안내문 page-pointer 억제

`evidencePdf.page` 는 **provenance 전용**으로 취급하고, 사용자-노출 link 로 자동 승격하지 않는다.

- `conditional-rubric-resolver.ts:150` 에서 `prepend` 모드(= 합성 안내문)일 때 `out.page` 로 복사하지 않는다. `evidencePdf` 는 내부 증거로 그대로 보존(데이터 무손실).
- 또는 `directive-block.tsx::directiveSourcePage()` 에서 `d.mode === 'prepend'` (notice) 는 `undefined` 반환하도록 가드 추가.
- 장점: 데이터 19곳 일괄 무수정 + 스키마 변경 불요, "provenance ≠ display page" 라는 DV2-정합 경계가 코드에 1곳으로 박힘. substitute 인용(advent 12/24 native @580 포함)은 그대로 유지.

### 옵션 B — 데이터에서 19개 directive 의 `evidencePdf.page` 제거 (현 스키마상 무효)

- 19개 `*-weekday-psalmody-notice` directive 의 `evidencePdf.page` 키 삭제 발상.
- ⛔ **현 스키마상 그대로는 불가**: `evidencePdf.page` 는 **필수 필드**다 —
  - `src/lib/types.ts:728` `ConditionalRubricEvidencePdf { page: number }` (optional 아님)
  - `src/lib/schemas.ts:211` Zod `EvidencePdfSchema = z.object({ page: z.number().int().min(1), line: …optional(), text: … })`
  - 단순 삭제 시 **type-check + Zod 검증 실패**. B 를 쓰려면 `page` 를 optional 로 바꾸는 **스키마/타입 변경이 선행**돼야 함.
- 단점: 19곳 반복 편집 + 향후 동일 clone 추가 시 재발 가능(근본 경계가 코드에 없음). → **권장 Option A 는 스키마 변경 불요 + 재발 방지에 우월.**

### 비권장 — 580 을 "올바른 페이지"로 교체

- 안내문은 "현재 주간에서 가져옴" 이라 **고정 정답 페이지가 없다.** 어떤 단일 값으로 바꿔도 또 다른 주간에선 틀린다. → page-pointer 자체를 빼는 게 맞다.

### 회귀 가드 (후속 구현 시)

- `conditional-rubric-resolver.test.ts`: prepend 안내문 directive → resolved override 에 `page` 없음(또는 `directiveSourcePage() === undefined`) 단언.
- substitute directive(page 819 등) → `page` 유지 단언(억제가 과하게 번지지 않음을 pin).
- e2e: 대축일 hour 렌더 시 `[data-role="conditional-rubric-directive"]` 안내문 줄에 `[data-role="page-ref-link"]` 부재 단언.

---

## 5. 영향 범위

### 고정 대축일 (sanctoral/solemnities.json) — 14곳

| 대축일 | 날짜 | 영향 hour | directive 수 |
|---|---|---|---|
| St. Joseph | 03-19 | firstVespers, vespers2 | 2 |
| Annunciation | 03-25 | firstVespers, vespers2 | 2 |
| Birth of John the Baptist | 06-24 | firstVespers, vespers2 | 2 |
| Peter & Paul | 06-29 | firstVespers, vespers2 | 2 |
| Assumption | 08-15 | firstVespers, vespers2 | 2 |
| All Saints | 11-01 | firstVespers, vespers2 | 2 |
| Immaculate Conception | 12-08 | firstVespers, vespers2 | 2 |

### 가동축일 (propers/*.json) — 5곳 ★ (초기 조사 누락분 — solemnities.json 단독 스코프 한계)

| 가동축일 | 파일 | 영향 hour | directive 수 |
|---|---|---|---|
| Ascension (승천) | easter.json | firstVespers | 1 |
| Trinity Sunday (삼위일체) | ordinary-time.json | firstVespers | 1 |
| Corpus Christi (성체성혈) | ordinary-time.json | firstVespers | 1 |
| Sacred Heart (예수성심) | ordinary-time.json | firstVespers | 1 |
| Christ the King (그리스도왕) | ordinary-time.json | firstVespers | 1 |

총 **19개 prepend 안내문 directive** 가 모두 `(х. 580)` 오노출.

- **영향 없음 / 정상**: `propers/advent.json` 의 `advent-dec24-sun-lauds-psalmody-substitute` (action=substitute, page=580) = 12/24 native 원본 → 580 이 정답이므로 그대로 둠. 권장 Option A(prepend-only 억제)는 이 substitute 를 건드리지 않으므로 정상 유지된다.

---

## 부록 — 핵심 파일 경로

- 안내문 텍스트 + `evidencePdf.page=580` SoT (cloned prepend, 총 19곳):
  - `src/data/loth/sanctoral/solemnities.json` — 14곳 (line 79·87·109·117·…)
  - `src/data/loth/propers/ordinary-time.json` — 4곳 (trinity / corpus / sacredheart / christtheking firstVespers)
  - `src/data/loth/propers/easter.json` — 1곳 (ascension firstVespers)
- native 원본(정답 @580): `src/data/loth/propers/advent.json` — `advent-dec24-sun-lauds-psalmody-substitute` (action=substitute, evidencePdf.page=580, line=20071)
- `evidencePdf` 스키마(page 필수): `src/lib/types.ts:728` (`ConditionalRubricEvidencePdf { page: number }`) · `src/lib/schemas.ts:211` (`EvidencePdfSchema`, `page: z.number().int().min(1)`)
- page 전파 로직: `src/lib/hours/conditional-rubric-resolver.ts:150`
- page-pointer 노출 결정: `src/components/prayer-sections/directive-block.tsx:15-19, 58`
- 링크 렌더: `src/components/page-ref.tsx:18`
- PDF 원문 근거: `parsed_data/full_pdf.txt:20071` (book page 580 = 12월 24일/대림)
- 전체 인벤토리 재현: `python3` node-walk over `src/data/loth/**/*.json` → action=prepend+page=580 19곳 + advent substitute 1곳 (§2.1)
