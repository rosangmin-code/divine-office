# GOAL #116 — Psalm 63 Lauds Caption Misclassification Root Cause + Fix Plan

작성: dvo-res, task #127. 범위: 조사 산출물. 코드/데이터 수정은 하지 않음.

## 결론

2026-05-31 Lauds 첫째 시편은 `Psalm 63:2-9`이다. 원문 구조는 `Дуулал 63:2-9` → 제목 `Тэнгэрбурханаар цангаж буй сэтгэл` → 두 줄짜리 header/caption `Гэм нүглийн харанхуйгаас салсан... Тэнгэрбурханыг хүсэн тэмүүлнэ.` → 시편 본문 시작 `Тэнгэрбурхан, Та миний Тэнгэрбурхан`이다(`parsed_data/full_pdf.txt:1810-1815`, 같은 입력 파일 `parsed_data/week1/week1_final.txt:335-340`).

근본원인은 `scripts/extract-psalm-texts.js::extractPsalmBody`가 제목은 건너뛰지만(`scripts/extract-psalm-texts.js:277-299`), 제목 뒤 header/caption은 괄호 citation으로 끝나는 경우만 epigraph로 건너뛰기 때문이다(`scripts/extract-psalm-texts.js:301-304`, `:424-438`). Psalm 63의 두 줄은 괄호 citation 없이 끝나므로 `skipEpigraph`가 `startIdx`를 그대로 반환하고, body 수집 루프가 두 줄을 `bodyLines`에 저장한다(`scripts/extract-psalm-texts.js:306-329`). 그 결과 `src/data/loth/psalter-texts.json:2-17`와 `src/data/loth/prayers/commons/psalter-texts.rich.json:2-34`가 이 caption을 첫 stanza 본문으로 들고 있다.

`extract-psalter-headers.js`는 title과 first verse 사이 header metadata를 별도 추출 대상으로 정의하지만(`scripts/extract-psalter-headers.js:12-18`), 실제 패턴은 patristic/NT parenthetical attribution 중심이다(`scripts/extract-psalter-headers.js:5-10`). Psalm 63에는 해당 catalog entry가 없다. 명령 출력: `rg -n 'Psalm 63:2-9|Гэм нүглийн...' src/data/loth/prayers/commons/psalter-headers.rich.json; echo "exit=$?"` → `exit=1`.

## #105와의 상호작용

#105는 `extractPsalmPrayer`의 page-boundary continuation 문제다. mental model은 `extractPsalmPrayer` L397의 case gate를 완결성 기반으로 바꾸고, 시편기도 외 영역은 비목표라고 고정한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:27-31`, `:45-58`). 이번 문제는 `extractPsalmBody`의 title/epigraph/body 분류 문제이며 코드 구간이 다르다(`scripts/extract-psalm-texts.js:273-349` vs #105의 prayer loop). 따라서 로직 수정은 독립적이어야 한다.

공유되는 것은 재생성 산출물과 배포 운영이다. #105도 `psalter-texts.json`/`psalter-texts.rich.json` 변경과 `CACHE_VERSION` bump를 요구한다(`docs/design/mental-models/goal105-psalmprayer-truncation-fix.md:70-82`). 현재 `public/sw.js`는 `divine-office-v43`이다(`public/sw.js:511`). 두 GOAL이 모두 데이터 번들 출력을 바꾸면 머지 순서에 따라 단일 cache bump를 조율해야 한다.

## 본래 위치 판정

이 두 줄은 antiphon이 아니다. 2026-05-31의 첫 시편 antiphon은 `week-1.json`의 `default_antiphon` 필드에 별도로 있다(`src/data/loth/psalter/week-1.json:8-14`). 원문에서도 계절 antiphon 변형들은 `Дуулал 63:2-9` 앞에 끝나고, 그 뒤에 제목과 두 줄 caption이 나온다(`parsed_data/full_pdf.txt:1806-1813`).

따라서 본래 위치는 사용자 지적대로 제목 `Тэнгэрбурханаар цангаж буй сэтгэл` 뒤가 맞다. 다만 데이터 필드는 stanza body가 아니라 psalm-header/caption 계열이어야 한다. 렌더러는 이미 title, optional `headerRich`, stanza 순서로 그릴 수 있다(`src/components/psalm-block.tsx:81-114`, `:117-240`).

## 범위

확정된 동일 텍스트 오염은 Psalm 63 한 건이다.

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

수기 판정: `Revelation 19:1-7`은 원문 자체가 `Илчлэл 19:1-7` 뒤 `Аллэлуяа!`로 본문을 시작한다(`parsed_data/full_pdf.txt:2271-2278`, `src/data/loth/psalter-texts.json:239-248`). `Psalm 139:1-18`은 epigraph가 `(Ром 11:34)`로 끝난 뒤 `I` part marker와 본문이 시작한다(`parsed_data/full_pdf.txt:16066-16073`, `src/data/loth/psalter-texts.json:4422-4428`). 이 sweep에서 실제 caption 오분류는 Psalm 63뿐이다.

## 수정 계획

1. `scripts/extract-psalm-texts.js`에 psalm-header/caption skip rule을 추가한다. 위치는 `extractPsalmBody`에서 title skip 직후, body collection 직전이다. 기존 `skipEpigraph`는 parenthetical citation용으로 유지하되, Psalm 63처럼 citation 없는 fixed caption을 body에서 제거하는 좁은 rule이어야 한다.
2. 캡션을 보존하려면 `src/data/loth/prayers/commons/psalter-headers.rich.json`에 `Psalm 63:2-9` entry를 추가하거나, header extractor에 uncited caption 타입을 추가한다. 현재 renderer는 `headerRich`를 title 뒤, stanza 앞에 표시할 수 있으므로 UI 순서 변경은 불필요하다(`src/components/psalm-block.tsx:81-114`).
3. 재생성 산출물:
   - `src/data/loth/psalter-texts.json`: `Psalm 63:2-9`의 `stanzas[0]`에서 두 caption 줄 제거. 첫 줄은 `Тэнгэрбурхан, Та миний Тэнгэрбурхан`이어야 한다.
   - `src/data/loth/prayers/commons/psalter-texts.rich.json`: `Psalm 63:2-9.stanzasRich.blocks[0].lines`에서도 같은 두 줄 제거. 이 rich builder는 source JSON을 입력으로 쓰므로 source 수정 뒤 재실행해야 한다(`scripts/build-psalter-texts-rich.mjs:4-7`, `:127-130`).
   - `src/data/loth/psalter/week-1.json`: ref/title/antiphon mapping은 이미 올바르므로 변경 대상이 아니다(`src/data/loth/psalter/week-1.json:8-14`).
   - `src/data/loth/prayers/commons/psalter-headers.rich.json`: caption 보존을 선택하면 Psalm 63 entry 추가. 보존하지 않기로 결정한다면 명시적인 데이터 제거 근거가 필요하다.
4. #105와 같은 머지 wave에서 재추출한다면 `psalmPrayer` fix와 stanza/header fix를 한 번에 반영하되, diff 검토는 별도로 한다. #105는 `psalmPrayer`만, #116은 `stanzas/stanzasRich/headerRich`만 바꾸는 것이 기대 delta다.
5. `public/sw.js` `CACHE_VERSION`은 데이터 번들 변경으로 bump한다. 현재값은 v43(`public/sw.js:511`). #105 또는 다른 GOAL이 먼저 bump하면 다음 번호를 사용한다.

## 회귀 검증

필수 assertions:

```text
Psalm 63:2-9 stanzas[0][0] === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"
Psalm 63:2-9 stanzasRich first rendered line === "Тэнгэрбурхан, Та миний Тэнгэрбурхан"
Psalm 63:2-9 header/caption, if preserved, renders after title and before first stanza
Psalm 63:2-9 antiphon remains src/data/loth/psalter/week-1.json default_antiphon
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
