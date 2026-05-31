# GOAL #116 — Psalm 63 Lauds Caption Misclassification Root Cause + Fix Plan

작성: dvo-res, task #127. 범위: 조사 산출물. 코드/데이터 수정은 하지 않음.

## 결론

2026-05-31 Lauds 첫째 시편은 `Psalm 63:2-9`이다. 원문 구조는 `Дуулал 63:2-9` → 제목 `Тэнгэрбурханаар цангаж буй сэтгэл` → 두 줄짜리 header/caption `Гэм нүглийн харанхуйгаас салсан... Тэнгэрбурханыг хүсэн тэмүүлнэ.` → 시편 본문 시작 `Тэнгэрбурхан, Та миний Тэнгэрбурхан`이다(`parsed_data/full_pdf.txt:1810-1815`, 같은 입력 파일 `parsed_data/week1/week1_final.txt:335-340`).

근본원인은 `scripts/extract-psalm-texts.js::extractPsalmBody`가 제목은 건너뛰지만(`scripts/extract-psalm-texts.js:277-299`), 제목 뒤 header/caption은 괄호 citation으로 끝나는 경우만 epigraph로 건너뛰기 때문이다(`scripts/extract-psalm-texts.js:301-304`, `:424-438`). Psalm 63의 두 줄은 괄호 citation 없이 끝나므로 `skipEpigraph`가 `startIdx`를 그대로 반환하고, body 수집 루프가 두 줄을 `bodyLines`에 저장한다(`scripts/extract-psalm-texts.js:306-329`). 그 결과 `src/data/loth/psalter-texts.json:2-17`와 `src/data/loth/prayers/commons/psalter-texts.rich.json:2-34`가 이 caption을 첫 stanza 본문으로 들고 있다.

`extract-psalter-headers.js`는 title과 first verse 사이 header metadata를 별도 추출 대상으로 정의하지만(`scripts/extract-psalter-headers.js:12-18`), 실제 패턴은 patristic/NT parenthetical attribution 중심이다(`scripts/extract-psalter-headers.js:5-10`). Psalm 63에는 해당 catalog entry가 없다. 명령 출력: `rg -n 'Psalm 63:2-9|Гэм нүглийн...' src/data/loth/prayers/commons/psalter-headers.rich.json; echo "exit=$?"` → `exit=1`.

## #105와의 상호작용

#105는 `extractPsalmPrayer`의 page-boundary continuation 문제다. mental model은 `extractPsalmPrayer` L397의 case gate를 완결성 기반으로 바꾸고, 시편기도 외 영역은 비목표라고 고정한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:27-31`, `:45-58`). 이번 문제는 `extractPsalmBody`의 title/epigraph/body 분류 문제이며 코드 구간이 다르다(`scripts/extract-psalm-texts.js:273-349` vs #105의 prayer loop). 따라서 로직 수정은 독립적이어야 한다.

공유되는 것은 재생성 산출물과 배포 운영이다. #105도 `psalter-texts.json`/`psalter-texts.rich.json` 변경과 `CACHE_VERSION` bump를 요구한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:70-82`). 현재 `public/sw.js`는 `divine-office-v43`이다(`public/sw.js:511`). 단 #105 mental model C8은 #90/#96/#98이 `v44`를 먼저 점유할 수 있다고 명시한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:79-80`). 따라서 Step 6 구현 시 현재값을 다시 확인하고, 먼저 머지되는 GOAL이 `v44`, 나중 GOAL은 `v45` 또는 통합 머지의 단일 bump를 사용해야 한다.

## 본래 위치 판정

이 두 줄은 antiphon이 아니다. 2026-05-31의 첫 시편 antiphon은 `week-1.json`의 `default_antiphon` 필드에 별도로 있다(`src/data/loth/psalter/week-1.json:8-14`). 원문에서도 계절 antiphon 변형들은 `Дуулал 63:2-9` 앞에 끝나고, 그 뒤에 제목과 두 줄 caption이 나온다(`parsed_data/full_pdf.txt:1806-1813`).

따라서 본래 위치는 사용자 지적대로 제목 `Тэнгэрбурханаар цангаж буй сэтгэл` 뒤가 맞다. 다만 데이터 필드는 stanza body가 아니라 psalm-header/caption 계열이어야 한다. 렌더러는 이미 title, optional `headerRich`, stanza 순서로 그릴 수 있다(`src/components/psalm-block.tsx:81-114`, `:117-240`).

## 범위

확정된 동일 텍스트 오염은 Psalm 63 한 건이다. 이 범위 주장은 아래 **exact text grep**과 **2-line structural signature sweep** 안에서만 유효하다. 1줄/3줄 이상 caption, 또는 본문 첫 줄도 무들여쓰기인 다른 형태의 caption은 이 sweep으로 corpus-wide 부재를 증명하지 못한다.

명령:

```bash
rg -n 'Гэм нүглийн харанхуйгаас салсан|Тэнгэрбурханыг хүсэн тэмүүлнэ' parsed_data src/data/loth scripts/out
```

주요 출력:

```text
parsed_data/week1/week1_final.txt:337:Гэм нүглийн харанхуйгаас салсан хэнбугай ч
parsed_data/week1/week1_final.txt:338:Тэнгэрбурханыг хүсэн тэмүүлнэ.
src/data/loth/psalter-texts.json:5:        "Гэм нүглийн харанхуйгаас салсан хэнбугай ч",
src/data/loth/psalter-texts.json:6:        "Тэнгэрбурханыг хүсэн тэмүүлнэ.",
src/data/loth/prayers/commons/psalter-texts.rich.json:12:                  "text": "Гэм нүглийн харанхуйгаас салсан хэнбугай ч"
parsed_data/full_pdf.txt:1812:Гэм нүглийн харанхуйгаас салсан хэнбугай ч
parsed_data/full_pdf.txt:1813:Тэнгэрбурханыг хүсэн тэмүүлнэ.
```

추가 구조 sweep도 했다. current `psalter-texts.json`에서 "첫 stanza 첫 두 줄은 무들여쓰기, 세 번째 줄부터 들여쓰기" signature는 3건이었다.

```text
two-unindented-then-indented signature count=3
Psalm 63:2-9 :: "Гэм нүглийн харанхуйгаас салсан хэнбугай ч" | "Тэнгэрбурханыг хүсэн тэмүүлнэ." | "  Тэнгэрбурхан, Та миний Тэнгэрбурхан"
Revelation 19:1-7 :: "Аллэлуяа!" | "Тэнгэрбурханд аврал нигүүлсэл, хүчин чадал" | "  хийгээд сүр жавхлан байдаг юм."
Psalm 139:1-18 :: "I" | "Аяа ЭЗЭН, Та намайг судлан, намайг мэдсэн билээ." | "  Миний сууж, босохыг ч хүртэл Та мэддэг юм."
```

수기 판정: `Revelation 19:1-7`은 원문 자체가 `Илчлэл 19:1-7` 뒤 `Аллэлуяа!`로 본문을 시작한다(`parsed_data/full_pdf.txt:2271-2278`, `src/data/loth/psalter-texts.json:239-248`). `Psalm 139:1-18`은 epigraph가 `(Ром 11:34)`로 끝난 뒤 `I` part marker와 본문이 시작한다(`parsed_data/full_pdf.txt:16066-16073`, `src/data/loth/psalter-texts.json:4422-4428`). 따라서 이 text-grep + 2-line signature 범위 안에서 실제 caption 오분류는 Psalm 63뿐이며, shape-only 제거 rule은 금지해야 한다.

## 수정 계획

1. `scripts/extract-psalm-texts.js`에 psalm-header/caption skip rule을 추가한다. 위치는 `extractPsalmBody`에서 title skip 직후, body collection 직전이다. 기존 `skipEpigraph`는 parenthetical citation용으로 유지한다. 새 rule은 **Psalm 63 exact-text/ref-keyed match**로 제한한다: `ref === "Psalm 63:2-9"`이고 다음 두 의미줄이 정확히 `Гэм нүглийн харанхуйгаас салсан хэнбугай ч` / `Тэнгэрбурханыг хүсэн тэмүүлнэ.`일 때만 body 수집 시작점을 두 줄 뒤로 이동한다. 일반적인 "2-unindented-then-indented" shape heuristic은 `Revelation 19:1-7`과 `Psalm 139:1-18` 정상 본문을 손상시키므로 금지한다(`parsed_data/full_pdf.txt:2271-2278`, `:16066-16073`).
2. 캡션 보존은 **필수**다. 이 두 줄은 PDF 원문에 존재하고(`parsed_data/full_pdf.txt:1812-1813`), 사용자 의도도 삭제가 아니라 제목 뒤 배치다. #105 mental model도 원문무손실 원칙을 둔다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:29`). 따라서 기본 수정안은 `src/data/loth/prayers/commons/psalter-headers.rich.json`에 `Psalm 63:2-9` entry를 추가하거나 header extractor에 uncited caption 타입을 추가해서, renderer가 이미 지원하는 title 뒤 / stanza 앞 위치에 보존하는 것이다(`src/components/psalm-block.tsx:81-114`). 단순 삭제는 금지한다.
3. 재생성 산출물:
   - `src/data/loth/psalter-texts.json`: `Psalm 63:2-9`의 `stanzas[0]`에서 두 caption 줄 제거. 첫 줄은 `Тэнгэрбурхан, Та миний Тэнгэрбурхан`이어야 한다.
   - `src/data/loth/prayers/commons/psalter-texts.rich.json`: `Psalm 63:2-9.stanzasRich.blocks[0].lines`에서도 같은 두 줄 제거. 이 rich builder는 source JSON을 입력으로 쓰므로 source 수정 뒤 재실행해야 한다(`scripts/build-psalter-texts-rich.mjs:4-7`, `:127-130`).
   - `src/data/loth/psalter/week-1.json`: ref/title/antiphon mapping은 이미 올바르므로 변경 대상이 아니다(`src/data/loth/psalter/week-1.json:8-14`).
   - `src/data/loth/prayers/commons/psalter-headers.rich.json`: Psalm 63 caption entry 추가 필수. 이 entry는 제목 뒤, 첫 stanza 앞에서 렌더되어야 한다.
4. #105와 같은 머지 wave에서 재추출한다면 `psalmPrayer` fix와 stanza/header fix를 한 번에 반영하되, diff 검토는 별도로 한다. #105는 `psalmPrayer`만, #116은 `stanzas/stanzasRich/headerRich`만 바꾸는 것이 기대 delta다.
5. `public/sw.js` `CACHE_VERSION`은 데이터 번들 변경으로 bump한다. 현재값은 v43(`public/sw.js:511`). #90/#96/#98 또는 #105가 먼저 `v44`를 사용하면 본 GOAL은 다음 번호를 사용한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:79-80`).

## 회귀 검증

필수 assertions:

```text
Psalm 63:2-9 stanzas[0][0] === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"
Psalm 63:2-9 stanzasRich first rendered line === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"
Psalm 63:2-9 header/caption renders after title and before first stanza
Psalm 63:2-9 antiphon remains src/data/loth/psalter/week-1.json default_antiphon
Revelation 19:1-7 stanzas[0][0] === "Аллэлуяа!"
Psalm 139:1-18 stanzas[0][0] === "I"
```

명령:

```bash
node scripts/verify-psalter-stanzas.js
node scripts/verify-psalter-pages.js
node scripts/audit-psalter-ref-consistency.js
```

#105와 같은 브랜치에서 검증할 때는 추가로 `node docs/research/GOAL100-truncation-sweep.mjs`를 실행해 시편기도 절단 count가 0인지 확인한다. 이 검증은 #105의 `extractPsalmPrayer`용이고, #116의 body/header fix를 대체하지 않는다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:74-77`).

## 명령 증거 요약

날짜/시편 식별은 Step 1과 동일하다. `src/data/loth/psalter/week-1.json:4-14`가 SUN/lauds 첫 항목을 `Psalm 63:2-9`로 지정한다. 원문 구조는 `parsed_data/full_pdf.txt:1810-1815`, 추출 입력 구조는 `parsed_data/week1/week1_final.txt:335-340`, 오염된 production data는 `src/data/loth/psalter-texts.json:2-17`, 오염된 rich data는 `src/data/loth/prayers/commons/psalter-texts.rich.json:2-34`에서 확인했다.

현재 header catalog 부재 확인:

```text
$ rg -n 'Psalm 63:2-9|Гэм нүглийн харанхуйгаас салсан|Тэнгэрбурханыг хүсэн тэмүүлнэ' src/data/loth/prayers/commons/psalter-headers.rich.json; echo "exit=$?"
exit=1
```

현재 JSON 상태 확인:

```json
{
  "hasHeaderPsalm63": false,
  "firstStanzaFirst2": [
    "Гэм нүглийн харанхуйгаас салсан хэнбугай ч",
    "Тэнгэрбурханыг хүсэн тэмүүлнэ."
  ]
}
```

## 리뷰 CONDITIONAL 5이슈 반영 요약

1. **over-broad-fix 회귀 위험**: fix rule을 Psalm 63 exact-text/ref-keyed match로 제한했고, `Revelation 19:1-7` 및 `Psalm 139:1-18` 음성 회귀 단언을 추가했다(`parsed_data/full_pdf.txt:2271-2278`, `:16066-16073`).
2. **rule-scope 모호성**: `fixed caption`을 일반 shape가 아니라 `ref === "Psalm 63:2-9"` + 정확한 두 원문 줄로 못박았다.
3. **캡션 보존**: `psalter-headers.rich.json`에 Psalm 63 entry를 추가해 제목 뒤 렌더로 보존하는 것을 필수 경로로 바꾸고, 단순 삭제를 금지했다(`parsed_data/full_pdf.txt:1812-1813`, `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:29`).
4. **범위 주장 한정**: scope 문장을 exact text grep + 2-line structural signature 범위로 제한하고, 다른 shape의 caption은 미검사임을 명시했다.
5. **cache bump 조율**: 현재 v43 확인과 함께 #90/#96/#98 또는 #105가 `v44`를 먼저 점유할 경우 다음 번호를 써야 한다고 명시했다(`public/sw.js:511`, `docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:79-80`).
