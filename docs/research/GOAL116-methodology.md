# GOAL #116 — Lauds Psalm 63 Front-Text Ordering: Investigation Methodology

작성: dvo-res, task #126. 범위: 조사 방법론 + 초기 증거만. 코드/데이터는 수정하지 않음.

## 1. 조사 질문

대상 증상은 2026-05-31 Lauds 첫째 시편 `Psalm 63:2-9`에서 본문 앞에 `Гэм нүглийн харанхуйгаас салсан... Тэнгэрбурханыг хүсэн тэмүүлнэ.`가 보이는 순서 문제다. 먼저 구분할 질문은 세 가지다.

1. **원문/추출 순서 오류인가?** PDF 원문에서 이 두 줄이 `Дуулал 63:2-9` 및 제목 `Тэнгэрбурханаар цангаж буй сэтгэл` 뒤, 본문 앞의 epigraph/preface인지 확인한다. `parsed_data/full_pdf.txt:1810-1819`는 `Дуулал 63:2-9` → 제목 → 두 줄 → 실제 시편 첫 줄 순서다.
2. **데이터 필드 오배치인가?** 현재 `src/data/loth/psalter-texts.json:2-6` 및 rich catalog `src/data/loth/prayers/commons/psalter-texts.rich.json:2-22`는 두 줄을 `stanzas[0]`/`stanzasRich` 첫 줄로 저장한다. 반면 FR-160-C 헤더 카탈로그 설명은 시편 header/preface가 title과 첫 verse 사이에 별도 데이터로 존재해야 함을 말한다(`src/data/loth/prayers/commons/psalter-headers.rich.json:1-3`).
3. **렌더 순서 오류인가?** 현재 렌더러는 antiphon 다음 제목을 출력하고(`src/components/psalm-block.tsx:81-91`), `headerRich`가 있으면 그 다음 출력한 뒤(`src/components/psalm-block.tsx:92-114`), 마지막으로 stanzas를 출력한다(`src/components/psalm-block.tsx:117-240`). 따라서 원인 후보는 렌더 순서 자체보다 "두 줄이 stanzas로 들어간 이유" 쪽이 우선이다.

날짜 식별: `node -e "...romcal..."` 실행 결과 `{"date":"2026-05-31","name":"Trinity Sunday","type":"SOLEMNITY","season":"Later Ordinary Time","psalterWeek":1}`. `node -e "...Date..."` 결과 `{"date":"2026-05-31","utcDay":0,"dayCode":"SUN"}`. `src/lib/calendar.ts:43-51`도 date → dayOfWeek/psalterWeek 매핑을 정의한다. 따라서 첫째 시편은 `src/data/loth/psalter/week-1.json:4-14`의 SUN/lauds 첫 항목 `Psalm 63:2-9`, 제목 `Тэнгэрбурханаар цангаж буй сэтгэл`.

## 2. 후보 접근법과 순서

1. **실화면/API 재현**: 먼저 `/api/loth/2026-05-31/lauds`와 `/pray/2026-05-31/lauds`를 확인해 현재 사용자 표면이 "제목 앞 노출"인지 "제목 뒤 본문 앞 노출"인지 고정한다. Playwright evidence: `titleIndex=3`, `noiseIndex=4`, excerpt가 `PSALM 63:2-9` → `Тэнгэрбурханаар...` → `Гэм нүглийн...` 순서였다. API evidence도 firstPsalm title 뒤 firstStanza 첫 두 줄로 해당 텍스트를 반환했다.
2. **데이터 grep**: `rg -n "Гэм нүглийн харанхуйгаас салсан|Тэнгэрбурханыг хүсэн тэмүүлнэ"` 결과 해당 두 줄은 `src/data/loth/psalter-texts.json:5-6`, rich catalog `:12/:21`, 원문 `parsed_data/full_pdf.txt:1812-1813`, 2-up layout `scripts/out/psalter-fulltext.txt:21-22`에 있다. `Тэнгэрбурханаар цангаж буй сэтгэл`은 `src/data/loth/psalter/week-1.json:12`와 원문 `parsed_data/full_pdf.txt:1811`에 있다.
3. **추출 스크립트 추적**: `scripts/extract-psalm-texts.js`가 `src/data/loth/psalter-texts.json`을 만든다(`scripts/extract-psalm-texts.js:3-4`, `:34-37`). 이 스크립트는 제목을 skip하고(`scripts/extract-psalm-texts.js:277-299`), 괄호로 끝나는 epigraph만 skip한다(`scripts/extract-psalm-texts.js:301-304`, `:424-438`). Psalm 63의 두 줄은 괄호 citation이 없으므로 bodyLines로 들어가는 가설이 강하다(`scripts/extract-psalm-texts.js:306-329`).
4. **헤더 파이프라인 대조**: `scripts/extract-psalter-headers.js:12-18`는 title과 첫 verse 사이 header metadata를 별도 추출 대상으로 정의하지만, 현재 `psalter-headers.rich.json`에는 `Psalm 63:2-9` 엔트리가 grep되지 않는다. 즉 "header catalog 누락 + body extractor의 epigraph skip 한계" 조합을 우선 조사한다.
5. **GOAL100 교차참조**: `docs/research/GOAL100-psalmprayer-truncation.md`는 같은 `scripts/extract-psalm-texts.js` 계열에서 page-break/continuation 휴리스틱이 데이터를 잘못 만든 사례다. 이번 건은 절단이 아니라 title/body/header 분류 문제이므로 같은 파이프라인을 보되 별도 failure class로 다룬다.

## 3. 결정적 소스

- 원문: `parsed_data/full_pdf.txt:1810-1819` 및 2-up layout `scripts/out/psalter-fulltext.txt:19-28`. 원문 순서와 좌우 컬럼 혼입 여부를 판정한다.
- 시편 매핑: `src/data/loth/psalter/week-1.json:4-14`가 2026-05-31 SUN/lauds 첫 시편을 지정한다.
- 본문 데이터: `src/data/loth/psalter-texts.json:2-35`와 `src/data/loth/prayers/commons/psalter-texts.rich.json:2-22`가 현재 두 줄을 본문으로 저장했음을 보여준다.
- 헤더 데이터: `src/data/loth/prayers/commons/psalter-headers.rich.json:1-3` 및 loader `src/lib/prayers/rich-overlay.ts:299-366`. Psalm 63용 header entry가 있는지/없어야 하는지 확인한다.
- 추출 코드: `scripts/extract-psalm-texts.js:273-349`, 특히 title skip `:277-299`, epigraph skip `:301-304/:424-438`, body collection `:306-329`.
- 렌더 코드: `src/lib/loth-service.ts:130-148`, `src/lib/hours/resolvers/psalm.ts:55-80`, `src/components/psalm-block.tsx:81-240`.

## 4. 기대 출력 형식

후속 조사 산출물은 다음 형식이면 리뷰 가능하다.

- **원인**: 예) `Psalm 63:2-9`의 두 줄은 PDF header/preface인데 `extract-psalm-texts.js`가 괄호 citation 없는 epigraph를 skip하지 못해 `stanzas[0]`에 넣었다, 또는 반대로 해당 줄은 공식 본문이라는 반증.
- **근거**: 원문 line, JSON line, extractor line, 렌더 line, 재현 명령 출력 각각 최소 1개 이상.
- **수정 계획**: 데이터 단기 패치인지, extractor rule 확장인지, `psalter-headers.rich.json` 엔트리 추가인지 명시. 수정 시에는 Psalm 63 두 줄이 제목 뒤 header/preface로 렌더되고 첫 stanza는 `Тэнгэрбурхан, Та миний Тэнгэрбурхан`으로 시작하는 API/Playwright assertion을 붙인다.

## 5. 현재 재현 스냅샷

`npm run dev` 후 `curl -s http://localhost:3200/api/loth/2026-05-31/lauds | node -e ...`:

```json
{
  "date": "2026-05-31",
  "dayName": "Trinity Sunday",
  "psalterWeek": 1,
  "firstPsalm": {
    "reference": "Psalm 63:2-9",
    "title": "Тэнгэрбурханаар цангаж буй сэтгэл",
    "firstStanza": [
      "Гэм нүглийн харанхуйгаас салсан хэнбугай ч",
      "Тэнгэрбурханыг хүсэн тэмүүлнэ.",
      "  Тэнгэрбурхан, Та миний Тэнгэрбурхан",
      "  Би Таныг эртлэн хайх болой."
    ]
  }
}
```

Playwright page text:

```json
{
  "titleIndex": 3,
  "noiseIndex": 4,
  "excerpt": [
    "Шад дуулал 1: ...",
    "ДУУЛАЛ",
    "PSALM 63:2-9",
    "Тэнгэрбурханаар цангаж буй сэтгэл",
    "Гэм нүглийн харанхуйгаас салсан хэнбугай ч",
    "Тэнгэрбурханыг хүсэн тэмүүлнэ."
  ]
}
```

초기 판정: 현재 화면은 제목 앞 노출은 아니며, 두 줄이 제목 뒤/본문 앞에 있다. 그러나 데이터 계층에서는 이 두 줄이 header/preface가 아니라 stanza body로 저장되어 있으므로, 후속 원인 조사는 "렌더 순서"보다 "추출 단계의 field classification"을 우선해야 한다.
