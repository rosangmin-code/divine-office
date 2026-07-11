# G45 시편 페이지 참조 off-by-one 근본원인

작성: dvo-res, task 75  
범위: PDF·데이터·검증기·렌더 경로 조사. 코드/데이터 변경 없음.

## 요약

Psalm 92 사용자 신고는 **절반은 맞고 절반은 아니다**.

- 제2주간 토요일 아침기도의 `Шад дуулал 1` 후렴은 인쇄책 **278쪽**에서
  시작한다. 앱이 이 후렴 옆에 `х.279`를 붙이는 것은 off-by-one이다.
- 그러나 `Дуулал 92` 헤더와 첫 연 `ЭЗЭНд талархлыг өргөх нь сайн.`은 둘 다
  **279쪽**에서 시작한다. 시편 헤더 옆의 `х.279`는 맞다.
- 제4주간의 같은 시편도 동일하다. 후렴은 504쪽, 헤더와 첫 연은 505쪽이다.

따라서 Psalm 92의 직접 근본원인은 “헤더와 첫 연이 서로 다른 쪽인데 검증기가
`+1`을 허용했다”가 아니다. 하나의 `PsalmEntry.page`를 후렴과 시편 본문 두 UI에
동시에 재사용한 **페이지 의미의 과부하**다. `PsalmBlock`은 후렴의 `AntiphonBox`와
시편 헤더의 `PageRef` 양쪽에 똑같은 `psalm.page`를 넘긴다.

다만 리더의 예비 가설도 별도의 실제 클래스에서 성립한다. 현 검증기 기준
`header = declared`, `first-stanza fingerprint = declared + 1`인데도 `agree` 처리되는
항목이 **22건**이다. 검증기는 Anchor S를 `p_h` 또는 `p_h+1`이면 허용하고,
선언값이 헤더 또는 본문 시작 중 어느 하나와 같아도 통과시킨다. `page`의 계약을
“첫 연 시작 페이지”라고 볼 경우 이 22건은 검토 대상으로 승격되어야 한다.

권장 해결은 `page`를 본문 첫 연 시작 페이지로 엄격히 정의하고, 별도
`antiphonPage`를 추가하는 것이다. 2-up 지면에서 헤더가 앞쪽, 본문이 다음 쪽인
경우는 오류가 아니다. `headerPage = bodyPage - 1`을 위치 관계로 허용하되,
선언된 본문 페이지는 반드시 Anchor S와 같게 하면 정당한 spread와 실제 오류를
구분할 수 있다.

## Psalm 92 PDF 대조 확정

### 제2주간 토요일 아침기도

`parsed_data/full_pdf.txt`의 인쇄 페이지 경계는 다음과 같다.

| 요소 | 근거 줄 | 인쇄 페이지 |
| --- | --- | ---: |
| `Шад дуулал 1 Өглөөний гэгээнээр...` 후렴 시작 | `:9472-9474` | 278 |
| 다음 페이지 마커 | `:9480-9484` | 279 |
| `Дуулал 92` 헤더 | `:9486` | 279 |
| 첫 연 `ЭЗЭНд талархлыг өргөх нь сайн.` | `:9490` | 279 |

`src/data/loth/psalter/week-2.json:967-972`의 `page: 279`는 시편 본문에는
정확하지만, 같은 엔트리의 후렴에는 정확하지 않다.

### 제4주간 토요일 아침기도

| 요소 | 근거 줄 | 인쇄 페이지 |
| --- | --- | ---: |
| 페이지 504 마커 | `parsed_data/full_pdf.txt:17433-17436` | 504 |
| `Шад дуулал 1 Аяа Дээдийн дээд...` 후렴 시작 | `:17460-17463` | 504 |
| 다음 페이지 마커 | `:17467-17471` | 505 |
| `Дуулал 92` 헤더 | `:17478` | 505 |
| 첫 연 `ЭЗЭНд талархлыг өргөх нь сайн.` | `:17482` | 505 |

`src/data/loth/psalter/week-4.json:1002-1008`도 `page: 505`로 본문에는 맞고
후렴에는 한 쪽 늦다. 이 구조는 W2의 `278 → 279`와 동일한 `504 → 505` split이다.

## `page` 필드의 유입·전파·렌더 흐름

### 유입

`page: 279`는 커밋 `f6249b9`(2026-04-10, “Add PDF page reference display with
settings toggle”)에서 처음 추가됐다. 이 커밋은 페이지 UI와 약 200개 시편 page
주석을 한 번에 도입했고, W2 Psalm 92에 279를 직접 기록했다. 당시
`antiphonPage`와 page 검증기는 없었다.

후속 `scripts/extract-psalter-pages.js`는 기존 값을 재추출하지 않는다. 파일의
계약은 ADD-ONLY이며, 기존 `page`가 있으면 `unchanged`로 건너뛴다
(`scripts/extract-psalter-pages.js:7-12`, `:56-63`). 즉 현재 279는 매 빌드에서
도출되는 값이 아니라, 최초 주석 후 보존되는 큐레이트 값이다.

W4 Psalm 92는 처음에는 잘못된 `513`(Compline 오매핑)이었고, 커밋 `3851c51`이
PDF 본문 위치를 수동 대조하여 `505`로 교정했다. 이 교정도 시편 본문 위치만
맞췄으며 후렴 페이지를 별도 표현하지 않았다.

### 전파

`PsalmEntry`와 `AssembledPsalm`에는 의미가 구체화되지 않은 `page?: number`
하나만 있다(`src/lib/types.ts:231-248`, `:873-886`). resolver는 이를 변환 없이
`page: entry.page`로 넘긴다(`src/lib/hours/resolvers/psalm.ts:78-99`, `:140-152`).

### 렌더

`PsalmBlock`은 같은 값을 세 곳에 사용한다.

1. 앞 후렴: `AntiphonBox ... page={psalm.page}`
   (`src/components/psalm-block.tsx:74-80`).
2. 시편 헤더: `<PageRef page={psalm.page} />`
   (`src/components/psalm-block.tsx:86-92`).
3. 뒤 반복 후렴: 다시 `AntiphonBox ... page={psalm.page}`
   (`src/components/psalm-block.tsx:355-356`).

`AntiphonBox`는 전달받은 page를 그대로 표시한다
(`src/components/prayer-sections/antiphon-box.tsx:3-25`). 따라서 후렴이 앞쪽에
인쇄되고 시편 헤더·본문이 다음 쪽에서 시작하는 순간, 하나의 숫자로 세 위치를
모두 정확히 표시할 수 없다.

## 현 검증기의 마스킹 방식

### 현재 규칙

`scripts/verify-psalter-pages.js`와 PRD NFR-009c의 규칙은 다음과 같다.

- H: 헤더 토큰이 있는 페이지 `p_h`.
- S: 첫 연 지문이 `p_h` **또는 `p_h+1`**이면 hard anchor 충족.
- A: `Шад дуулал N` 위치는 soft evidence일 뿐, 합격 조건에 사용하지 않음
  (`scripts/verify-psalter-pages.js:8-18`, `:187-205`).
- 선언 page가 `p_h` 또는 `stanzaPageForStar` 중 하나와 같으면 `agree`
  (`:244-261`).

코드 주석은 선언 관례가 “page where the psalm body begins”라고 말하면서도
헤더 페이지와 본문 페이지를 모두 합격시킨다(`:251-259`). 계약과 판정식이
일치하지 않는다.

### 실제 실행 결과

작업 트리에는 `parsed_data/full_pdf.txt`가 없어, 원본 corpus와 현재 스크립트·JSON을
session scratch mirror에 연결해 검증기를 실행했다. 저장소 파일은 변경하지 않았다.

```text
agree:                160
verified-correction:    0
manual-review:          2
part-II-skipped:        6
corrections JSON:       0 entries
review JSON:            8 entries (2 manual + 6 skip)
```

W2/W4 Psalm 92는 corrections와 review 어느 쪽에도 나오지 않고 `agree`로
사라진다. H와 S가 각각 279/279 및 505/505라 body 검증에는 맞기 때문이다.
Anchor A는 278/504에 존재하지만 soft라서 후렴 page mismatch를 판정하지 않는다.

## off-by-one 클래스 전수 조사

### A. 요청된 `H = declared`, `S = declared + 1` 클래스: 22건

현재 verifier의 `agree` 증거를 동일한 fingerprint 로직으로 전수 기록한 뒤
`pStar === declared && stanza.page === declared + 1`로 필터했다. 160개 `agree`
중 22개가 일치했다.

| # | 위치 | ref | H/declared | S |
| ---: | --- | --- | ---: | ---: |
| 1 | W1 FRI vespers `[0]` | Psalm 41:2-14 | 150 | 151 |
| 2 | W1 FRI vespers `[1]` | Psalm 46:2-12 | 152 | 153 |
| 3 | W1 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 |
| 4 | W2 SUN lauds `[2]` | Psalm 150:1-6 | 180 | 181 |
| 5 | W2 SUN vespers `[1]` | Psalm 115:1-13 | 186 | 187 |
| 6 | W2 MON lauds `[1]` | Sirach 36:1-7, 13-16 | 197 | 198 |
| 7 | W2 TUE lauds `[2]` | Psalm 65:2-9 | 214 | 215 |
| 8 | W2 THU lauds `[1]` | Isaiah 12:1-6 | 248 | 249 |
| 9 | W2 THU lauds `[2]` | Psalm 81:2-11 | 250 | 251 |
| 10 | W2 THU vespers `[0]` | Psalm 72:1-11 | 254 | 255 |
| 11 | W2 SAT lauds `[2]` | Psalm 8:2-10 | 282 | 283 |
| 12 | W2 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 |
| 13 | W3 SUN vespers `[0]` | Psalm 110:1-5, 7 | 304 | 305 |
| 14 | W3 MON vespers `[0]` | Psalm 123:1-4 | 322 | 323 |
| 15 | W3 TUE vespers `[1]` | Psalm 131:1-3 | 338 | 339 |
| 16 | W3 FRI lauds `[1]` | Jeremiah 14:17-21 | 377 | 378 |
| 17 | W3 SAT vespers `[0]` | Psalm 113:1-9 | 287 | 288 |
| 18 | W4 SUN lauds `[0]` | Psalm 118:1-16 | 405 | 406 |
| 19 | W4 MON vespers `[0]` | Psalm 136:1-9 | 432 | 433 |
| 20 | W4 TUE lauds `[1]` | Daniel 3:26-27, 29, 34-41 | 442 | 443 |
| 21 | W4 SAT vespers `[0]` | Psalm 122:1-9 | 398 | 399 |
| 22 | W4 SAT vespers `[2]` | Philippians 2:6-11 | 401 | 402 |

이 표는 곧바로 22개 값을 자동 변경하라는 뜻은 아니다. 첫 연 fingerprint가
카탈로그의 진짜 첫 인쇄 행인지 각 항목을 확인해야 한다. 그러나 현재 검증기의
`agree`가 “선언 page = 첫 연 시작 page”를 보장하지 않는다는 것은 확정한다.

### B. Psalm 92가 속한 후렴→본문 split 클래스

generic `Шад дуулал N` 대신 각 `default_antiphon`의 앞 6개 정규화 토큰을
`declared ± 1` 창에서 전수 대조했다. numeric `page`가 있는 168개 엔트리 결과:

| 후렴 지문 위치 | 건수 |
| --- | ---: |
| `declared - 1` | **53** |
| `declared` | 87 |
| `declared + 1` | 5 |
| 창 안에서 복수 매치 또는 미확정 | 23 |

W2 Psalm 92는 후렴 278 / declared 279, W4 Psalm 92는 후렴 504 / declared 505로
두 경우 모두 `declared - 1`의 유일 매치였다. 따라서 사용자 신고는 고립된
데이터 오타가 아니라, 최소 53개 기본 후렴에서 발생 가능한 렌더 모델 문제다.
23개 미확정 항목은 추측하지 말고 review로 남겨야 한다.

## 재발 이력과 구조적 이유

| 시점 | 조치 | 왜 근본 해결이 아니었나 |
| --- | --- | --- |
| 2026-04-10 `f6249b9` | page badge와 단일 `page` 필드 도입 | 후렴 page와 본문 page를 구분하지 않음. W2 Psalm 92의 279도 이때 수기 주석됨. |
| 2026-04-21 `a75bf53` | NFR-009c verifier 도입, 53개 시편 page 교정 | H/S는 body 계열만 hard. A는 soft라 후렴 mismatch를 합격/실패에 사용하지 않음. |
| 2026-04-24 `95b750e` | header 또는 body-start 어느 쪽과 같아도 `agree`로 완화 | “본문 시작” 계약을 엄격히 하지 않아 H→S `+1` 클래스가 green에 남음. |
| 2026-06-07 `743fc43` (WI-76) | Saturday Mary 후렴 page 863→862 한 줄 수정 | 해당 scalar만 고쳤고, 범용 page 의미·검증 규칙은 바꾸지 않음. 후보별 page는 별도로 존재해 모델 분리가 가능했지만 psalter에는 적용되지 않음. |
| 2026-06-24 `51cc7d0` (GOAL200/WI-209) | W4 THU Psalm 144 page 481→480 | 복원된 본문 지문이 verifier를 깨워 개별 값을 고침. H와 S가 모두 480인 사례라 H/S split 또는 후렴 split은 탐지하지 않음. |
| 현재 Psalm 92 | 후렴 278인데 UI가 279, 헤더도 279 | 단일 page를 양 UI에 재사용하는 구조가 그대로 남아 다시 표면화. |

개별 숫자 패치는 각 신고를 닫았지만, “어떤 텍스트의 시작 page인가”를 타입과
검증기에 고정하지 않았다. 이것이 세 번 이상 재발한 구조적 이유다.

## 해결안 비교

### 안 1 — `page = 첫 연 시작`, `antiphonPage` 분리 (권장)

계약:

- `PsalmEntry.page`: 시편/찬가 **첫 연 본문이 시작하는 인쇄 페이지**.
- `PsalmEntry.antiphonPage`: 해당 occurrence의 후렴이 시작하는 인쇄 페이지.
- `AssembledPsalm`에도 같은 두 필드를 전파.
- 시편 헤더의 PageRef는 `page`, 앞·뒤 AntiphonBox는 `antiphonPage`를 사용.

검증:

1. Anchor S의 유일 페이지를 `bodyStartPage`로 계산하고 `declared === bodyStartPage`를
   강제한다. 선언값에 대한 ±1 허용은 제거한다.
2. Anchor H는 S의 같은 쪽 또는 직전 쪽(`H ∈ {S-1, S}`)이면 위치 근거로 허용한다.
   이것이 정당한 2-up spread를 보존한다. H와 S가 다른 사실 자체는 오류가 아니다.
3. generic `Шад дуулал N`은 block locator로만 사용하고, 실제 선택 후렴 텍스트
   fingerprint를 hard anchor로 삼아 `antiphonPage`를 검증한다.
4. unique match가 아니면 값을 추정하지 않고 review로 보낸다(NFR-009b 유지).
5. Part II는 헤더가 Part I에 있으므로 기존 skip/전용 규칙을 유지하되, S와 실제
   `Шад дуулал N`을 기준으로 body/antiphon page를 각각 검증한다.

장점은 Psalm 92를 정확히 `{antiphonPage: 278, page: 279}`로 표현하며, 22개 H/S
split도 계약 위반 여부가 드러난다는 점이다. 단점은 스키마·resolver·renderer·JSON
backfill·테스트가 함께 바뀌는 중간 규모 migration이라는 점이다.

### 안 2 — 단일 `page`를 첫 연 시작으로만 엄격화

현 스키마를 유지하고 `declared === S`만 강제한다. 22개 클래스는 review 또는
교정으로 올라오며, body link 품질은 좋아진다. 하지만 Psalm 92 후렴에는 여전히
279가 표시된다. 후렴 PageRef를 숨기지 않는 한 현재 신고를 근본 해결하지 못한다.

장점은 데이터 모델 변경이 작다는 것, 단점은 같은 UI 오류가 남는다는 것이다.
따라서 독립 해결안이 아니라 안 1의 1단계로만 적합하다.

### 안 3 — 단일 `page`를 전례 블록/후렴 시작으로 재정의

Psalm 92 W2의 page를 278로 바꾸고, 시편 헤더 PageRef도 278을 표시하게 한다.
사용자 신고 화면은 맞지만, `Дуулал 92`와 첫 연을 찾으려는 사용자는 다음 쪽으로
넘겨야 한다. 반대로 body 중심 항목과 Part II의 의미도 흔들린다.

장점은 필드 추가가 없다는 것, 단점은 오류를 한 UI에서 다른 UI로 옮긴다는 것이다.
시편 헤더의 PageRef를 제거하고 블록 시작 링크 하나만 남기는 제품 결정이 없다면
권장하지 않는다.

### 안 4 — 검증기만 detection-only로 강화

기존 렌더를 유지하되 `H≠S`, `A/antiphon≠declared`를 별도 review bucket으로
출력한다. 즉시 위험 목록을 만들 수 있고 rollout 리스크가 작다. 그러나 UI가 같은
scalar를 공유하므로 데이터 모델 결함은 남는다. 안 1 전의 안전한 준비 단계다.

## 권장 실행 순서와 영향 범위

1. **계약 고정**: PRD NFR-009c를 `page = Anchor S`로 개정하고
   `antiphonPage` 계약을 추가한다.
2. **검증기 선행**: `scripts/verify-psalter-pages.js`가 `bodyStartPage`,
   `headerPage`, `antiphonStartPage`를 별도 evidence로 출력하게 한다. green
   `agree` 행도 필요한 경우 audit 가능해야 한다.
3. **review-first backfill**: week-1~4의 168개 엔트리를 스캔한다. 유일 매치만
   `antiphonPage` 후보로 만들고, 23개 복수/미확정 및 Part II는 수동 review한다.
   22개 H/S split도 PDF 첫 실제 행을 확인한 뒤 `page`를 정정한다.
4. **타입·resolver**: `src/lib/types.ts`, `src/lib/hours/resolvers/psalm.ts`에
   `antiphonPage`를 추가·전파한다.
5. **렌더 분리**: `src/components/psalm-block.tsx`의 두 AntiphonBox에는
   `psalm.antiphonPage`, 헤더에는 `psalm.page`를 전달한다. 미검증 항목은 잘못된
   fallback 숫자를 표시하기보다 후렴 page를 숨기는 편이 NFR-009b에 맞다.
6. **회귀 가드**:
   - W2 Psalm 92: antiphon 278 / body 279.
   - W4 Psalm 92: antiphon 504 / body 505.
   - H=S-1의 정당한 spread: declared는 S와 같아야 PASS.
   - H=S인 일반 항목 PASS.
   - declared=H, S=H+1이면 review/correction.
   - ambiguous antiphon fingerprint는 미할당/review.

영향 파일은 최소 `src/lib/types.ts`, `src/lib/hours/resolvers/psalm.ts`,
`src/components/psalm-block.tsx`, `src/data/loth/psalter/week-{1..4}.json`,
`scripts/verify-psalter-pages.js`, 대응 unit/e2e, `docs/PRD.md`다.

주요 회귀 위험은 (a) 기존 API consumer가 `page`의 느슨한 의미를 기대하는 경우,
(b) seasonal antiphon이 default와 다른 쪽에서 시작하는 예외, (c) 반복 텍스트의
fingerprint ambiguity, (d) Part II의 헤더 부재다. 이를 피하려면 일괄 `±1` 산술
보정이 아니라 실제 후렴/S fingerprint의 unique-match와 review bucket을 사용해야
한다.

## 결론

Psalm 92의 올바른 값은 “278 또는 279 중 하나”가 아니다. 화면 요소별로
**후렴 278 / 시편 본문 279**가 맞다(W4는 504 / 505). 현 모델은 이 두 사실을
하나의 `page`로 표현하려 하므로 어떤 숫자를 넣어도 둘 중 하나는 틀린다.

또한 verifier green은 첫 연 시작 페이지 정합을 보장하지 않는다. 현재 22개의
H→S `+1` 항목을 허용하고, 후렴은 hard validation하지 않는다. 따라서 근본 해결은
개별 값을 279→278로 바꾸는 것이 아니라, page 의미를 분리하고 Anchor S 및 실제
후렴 텍스트를 각각 엄격히 검증하는 것이다.

## 주요 근거

- `docs/research/g45-page-ref-offbyone-rootcause.md` — 본 판정과 전수 목록
- `parsed_data/full_pdf.txt:9472-9490`, `:17460-17482` — Psalm 92 후렴/본문 페이지 경계
- `src/data/loth/psalter/week-2.json:967-972`
- `src/data/loth/psalter/week-4.json:1002-1008`
- `scripts/verify-psalter-pages.js:8-18`, `:187-205`, `:244-261`, `:315-398`
- `scripts/extract-psalter-pages.js:7-12`, `:56-81`
- `src/components/psalm-block.tsx:74-92`, `:355-356`
- `src/components/prayer-sections/antiphon-box.tsx:3-25`
- `src/lib/hours/resolvers/psalm.ts:78-99`, `:140-152`
- `src/lib/types.ts:231-248`, `:873-886`
- `docs/PRD.md:354-355` — NFR-009b/c 현재 계약
- Git history: `f6249b9`, `a75bf53`, `3851c51`, `95b750e`, `743fc43`, `51cc7d0`
