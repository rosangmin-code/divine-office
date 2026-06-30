# МАГТУУ(찬미가) 줄바꿈 통합 근본원인 — X.912(GOAL #4) + X.897(GOAL #1)

- 작성일: 2026-06-30
- 작성자: dvo-sol (team dvo)
- 대상 GOAL: #4 (X.912 — "줄바꿈 전혀 미구현", systemic) / #1 (X.897 — "Их Эзэнийг" 비정상 분리, instance)
- 범위: **원인 진단 + 해결방안 권고만**. 본 리포트 외 소스 변경 없음(코드 수정은 후속 GOAL).
- 결론 한 줄: **두 증상은 같은 뿌리다 — 찬미가 본문이 PDF 단(段) 줄바꿈을 하드 `\n` 으로 품은 채 저장되고, "대문자=새 시행 / 소문자=wrap 연속" 휴리스틱(`regroupPhrasesByCapitalStart`)으로 시행을 복원하며, `flush`(들여쓰기 없음)로 렌더한다. (1) 휴리스틱이 대문자로 시작하는 wrap-연속행("Их Эзэнийг")을 새 시행으로 오분류하고(X.897), (2) flush 렌더가 viewport-wrap 연속과 시행 경계를 시각적으로 구분 불가능하게 만든다(X.912). 그리고 이 둘을 잡는 검출기가 없다.**

---

## 0. 재현 증거 (live render, 본인 확인)

dev 서버(`npm run dev`, port 3200)를 띄우고 실제 기도 시간 페이지를 모바일 폭(390px)에서 Playwright 로 렌더해 산출물 구조까지 추출했다.

| 대상 | 라우트 (rotation 계산으로 도출) | 렌더 모드 | 블록 수 |
|---|---|---|---|
| X.897 (hymn 21, "Баярлан магтан") | `/pray/2026-01-14/lauds` | `data-render-mode="phrase"` | 13 |
| X.912 (hymn 42, "Есүс хамгийн нандин нэр") | `/pray/2026-01-16/vespers` | `data-render-mode="phrase"` | 12 |

(스크린샷 파일: 세션 `/tmp/X897-lauds.png`, `/tmp/X912-vespers.png` — 사용자 원본 `Screenshot_20260629_*`(X.897)·`Screenshot_20260627_*`(X.912)와 픽셀 단위로 일치 재현.)

**X.897 추출된 블록 구조** (각 블록 = `<span class="block">` = 한 시행):
```
block[0]: Баярлан магтан хүндэтгэцгээе сүр жавхлантай
block[1]: Их Эзэнийг                       ← 고립(orphan). block[0]에 붙어야 함
block[2]: Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг мэт   ← 정상 병합됨
block[3]: Гэм ба зовлонг оргүй арилгаж эргэлзэх зүйлийг сарниулаад ← 정상 병합됨
... (이하 정상)
```

**X.912 추출된 블록 구조**:
```
block[0]: Есүс хамгийн нандин нэр юм аа
block[1]: Есүс Та үргэлж гуйлтад хариулдаг
block[2]: ӨӨ Есүс миний гараас барьдаг Эзэн   ← 한 시행으로 완결(데이터 정상)
... block[11]까지 12개 모두 완결된 시행
```
→ **X.912 의 데이터/구조는 현재 코드에서 정상**이다(시행 12개, orphan 없음). 390px 에서는 줄바꿈도 깨끗하게 12줄로 떨어진다. 사용자가 본 "통짜 흐름" 은 데이터 버그가 아니라 **렌더 인지(perception) 문제**다 — 아래 §3 참조.

---

## 1. 데이터 파이프라인 지도 (어디서 줄바꿈이 정해지는가)

```
parsed_data/full_pdf.txt (PDF 추출, 단 폭 줄바꿈이 \n 으로 박힘)
   │  extract-hymns* / strip-*-noise
   ▼
src/data/loth/ordinarium/hymns.json   ← plain text: "text" 필드에 \n 으로 시행 저장
   │  build-hymn-phrases-into-rich.mjs  +  regroupPhrasesByCapitalStart()
   ▼
src/data/loth/prayers/hymns/{n}.rich.json  ← hymnRich.blocks[].lines[] + phrases[]{lineRange,indent}
   │  loadHymnRichOverlay(n)   (rich-overlay.ts L217)
   │  loth-service.ts L905-917 (rotation pick → textRich)
   ▼
HymnSection (hymn-section.tsx L52)  →  <RichContent flush />  (rich-content.tsx)
```

핵심 사실:
- **시행(줄바꿈) 단위를 구동하는 것은 `lines[]` 가 아니라 `phrases[]` 다.** 렌더러(`rich-content.tsx` L382-439)는 stanza 에 `phrases` 가 있으면 phrase 별로 `lines[start..end]` 를 공백으로 join 해 **phrase 당 한 개의 `<span class="block">`** 를 emit 한다. `phrases` 가 없을 때만 `lines[]` 당 한 줄(legacy)로 떨어진다.
- 따라서 **`lines[]` 의 PDF-wrap 분절을 다시 시행으로 합치는 책임은 전적으로 `phrases[]` 빌더에 있다.**
- 매핑: `ordinarium/hymns.json` 키 `"42"` = page 912 = X.912, 키 `"21"` = page 897 = X.897. rich 파일은 hymn-number 기준(`42.rich.json`, `21.rich.json`).

원본 plain text (`hymns.json`)에 PDF 단 줄바꿈이 박혀 있는 증거 (hymn 21):
```
line0: Баярлан магтан хүндэтгэцгээе сүр жавхлантай
line1: Их Эзэнийг                  ← line0 의 wrap 연속(한 문장)
line2: Бидний сэтгэл Түүний өмнө дэлгэрч байгаа цэцэг
line3: мэт                          ← line2 의 wrap 연속
line4: ...зүйлийг / line5: сарниулаад   ← 동일 패턴 반복
```
즉 `\n` 은 **시행 경계가 아니라 PDF 인쇄 폭에서 잘린 지점**이다. `phrases[]` 빌더의 임무는 이 잘린 조각들을 원래 시행으로 되붙이는 것.

---

## 2. GOAL #1 (X.897) — instance: 빌더 휴리스틱의 대문자 오분류

### 원인 (확정)
`scripts/build-phrases-into-rich.mjs::regroupPhrasesByCapitalStart` (L194-223):
```js
const CYRILLIC_CAPITAL_START_RE = /^[А-ЯЁӨҮ]/   // L172
...
for (let i = 1; i < lines.length; i++) {
  const text = (lines[i].spans ?? []).map(sp => sp.text ?? '').join('').replace(/^\s+/, '')
  const isCapital = CYRILLIC_CAPITAL_START_RE.test(text)
  if (isCapital) {                  // ← 대문자로 시작하면 무조건 새 phrase(=새 시행)
    pushPhrase(curStart, i - 1, curIndent)
    curStart = i
    ...
  }
  // 소문자/숫자/따옴표 = wrap 연속 → 직전 phrase 에 병합
}
```

휴리스틱의 전제: **"PDF 에서 모든 시행은 대문자로 시작하고, 단 폭 wrap 연속행은 소문자로 시작한다."**

hymn 21 에 적용한 결과:
| line | 텍스트 | 첫 글자 | 빌더 판정 | 실제 |
|---|---|---|---|---|
| 0 | Баярлан... сүр жавхлантай | Б(대) | 새 시행 ✓ | 시행 시작 |
| **1** | **Их Эзэнийг** | **И(대)** | **새 시행 ✗** | **line0 의 wrap 연속** |
| 2 | Бидний... цэцэг | Б(대) | 새 시행 ✓ | 시행 시작 |
| 3 | мэт | м(소) | 병합 ✓ | line2 의 wrap 연속 |

→ `phrases[0]=[0,0]`, `phrases[1]=[1,1]` 로 분리되어 "Их Эзэнийг" 가 고립. 나머지 wrap 연속(мэт, сарниулаад, илэрхийлж, цуурайтна, горхи ч, магтагтун, учраас, бялхсан, болсон тул, байгаач)은 전부 소문자라 정상 병합됐다. **유일하게 대문자로 시작한 wrap 연속행 "Их Эзэн(ийг)"(전능하신 주님 — 신적 칭호라 대문자) 만 오분류.**

휴리스틱 주석(L125-160) 자체가 한계를 일부 인지하고 있다(라틴 대문자는 제외, Ө/Ү 추가). 그러나 **"문장 중간의 대문자 고유명사/신적 칭호가 wrap 연속행 머리에 올 수 있다"** 는 케이스는 고려되지 않았다.

### provenance
`f323f6f #499 Phase 1 Sweep — capital-start phrase rebuild 122 refs` 및 hymn 계열 `#279/#291 (F-X3 Phase B)` 에서 capital-start 규칙이 전 코퍼스에 일괄 적용됨.

### 해결방안 (권고)
"Их Эзэнийг" 한 건 수정은 `phrases[0]` 를 `[0,1]` 로 병합하면 끝나지만(데이터 1줄), **근본 해법은 빌더의 분절 판정을 휴리스틱 단독에서 벗어나게 하는 것**:

1. **(권장) SoT 대조 병합 신호 추가** — wrap 연속 여부를 "대문자냐" 가 아니라 **직전 행이 문장종결 부호(`. ! ? … :`)로 끝났는가 + 다음 행 첫 글자가 대문자인가** 의 결합 신호로 판정(이미 `rich-content.tsx` 의 `isSentenceBoundary`(L170-177)·`SENTENCE_END_RE`(L137)가 동일 패턴을 보유 — SSOT 재사용 가능). "...жавхлантай"(종결부호 없음) → "Их Эзэнийг" 는 **연속**으로 본다.
2. **대문자 wrap 예외 사전** — 신적 칭호("Их Эзэн", "Эзэн", "Тэнгэр", "Бурхан" 등)가 행 머리에 단독/짧게 오고 직전 행이 미종결이면 연속으로 강제. (데이터 큐레이트 보강 — `psalter-curated-no-full-reextract` 원칙과 동일하게 surgical.)
3. 어느 방식이든 **수정 후 §4 의 검출 가드로 회귀 차단**.

⚠️ 주의: PDF SoT 에 없는 줄바꿈/문자를 삽입하는 MT(machine translation/추측) 금지. 본문 글자는 그대로, **`phrases[].lineRange` 병합만** 손댄다(`lines[]` 불변).

---

## 3. GOAL #4 (X.912) — systemic: flush 렌더의 wrap/시행 구분 불가

### 원인 (확정)
X.912(hymn 42)의 **데이터는 정상**이다(§0: 시행 12개 완결, orphan 0). 그럼에도 사용자가 "줄바꿈 전혀 미구현 / 너비-wrap 통짜 흐름" 으로 인지하는 이유:

`hymn-section.tsx` L52 → `<RichContent flush />`. `flush=true` 는 F-X8(#300)에서 도입된 규칙으로, phrase wrap 연속행의 hanging indent(`pl-6 -indent-6`, FR-161 R-13)를 **제거**한다(`rich-content.tsx` L37-50, L399). 결과:

- 시행이 viewport 폭보다 길면 wrap 되고, 그 **연속 조각이 들여쓰기 없이 column 0 에 그대로 붙는다.**
- 그래서 화면에는 (a) 진짜 시행 경계, (b) viewport-wrap 연속, (c) 정상 병합된 phrase 의 wrap — **세 가지가 모두 좌측 정렬 조각으로 똑같이 보인다.**

§0 의 X.897 스크린샷이 이 메커니즘의 결정적 증거다: 한 화면에 "жавхлантай", "Их Эзэнийг", "мэт", "сарниулаад", "Эзэн", "илэрхийлж", "цуурайтна", "горхи ч"... 좌측 정렬 조각이 줄줄이 늘어서 있다. 그 중 **"Их Эзэнийг" 만 진짜 버그(b/c 가 아닌 잘못된 a)** 인데, 나머지 정상 wrap 들과 시각적으로 똑같아서 **시행 구조 자체가 없는 것처럼 읽힌다.** 사용자가 X.912 를 "통짜 흐름" 이라 표현한 것이 바로 이 인지다(X.912 는 진짜 orphan 이 없을 뿐, 긴 시행 4개가 wrap 되며 동일하게 좌측 정렬 조각을 만든다).

390px 에서 X.912 가 깨끗하게 보인 것은 12개 시행이 마침 그 폭에 안 잘렸기 때문이다. **사용자 단말은 폰트가 더 크거나 본문 column 이 더 좁아** 긴 시행(2,4,6,10번)이 wrap 되고, flush 때문에 그 조각들이 시행처럼 보인다.

### "5회 전수조사 누락 / 재발" 의 의미
- F-X8(#300)은 사용자 요청("들여쓰기 없음")으로 hanging indent 를 **껐다**. 그런데 들여쓰기 제거가 곧 **wrap/시행 구분 신호 제거**라서, 모바일에서 시행이 wrap 될 때마다 "줄바꿈이 안 된 것처럼" 보이는 인지 회귀가 생겼다. 이전 수정들이 "들여쓰기"·"phrase 병합" 같은 데이터/표시 축은 건드렸지만 **이 인지 문제 자체는 한 번도 타겟되지 않았다** → 재발.
- 그리고 page 전수조사(§4)는 이 축을 아예 검사하지 않는다.

### 해결방안 (권고) — 후속 GOAL 에서 택1
사용자 #300 요청("들여쓰기 없음")과 #4 요구("시행 구조가 보여야 함")는 충돌처럼 보이지만, **"시행 시작은 flush, viewport-wrap 연속만 들여쓰기"** 로 양립 가능하다:

1. **(권장) wrap-only hanging indent 복원** — phrase 의 **첫 줄은 flush(column 0)**, 그러나 viewport-wrap 으로 넘어간 **연속 줄에만** 작은 hanging indent. 이러면 시행 시작은 들여쓰기 없이 깔끔하고, wrap 연속은 들여써져 "이건 앞 시행의 연속" 임이 한눈에 보인다. (FR-161 R-13 의 원래 의도 = 정확히 이것. F-X8 이 이를 hymn 에서 통째로 꺼버린 것이 과교정.)
2. 또는 **시행 시작 글머리 마커**(작은 점/색)로 시행 경계만 표시(들여쓰기 0 유지).
3. 어느 쪽이든 사용자에게 mock 두 안 비교 후 결정(시각 결정이므로 AskUser 권장).

---

## 4. 검출 누락(왜 전수조사가 못 잡았나) + systemic 대책

### 검출 공백 (확정)
`scripts/` 의 hymn/verify 계열을 전수 확인한 결과:

| 스크립트 | 검사 대상 | 줄바꿈/병합 정확성? |
|---|---|---|
| `verify-hymn-pages.js` | hymns.json 의 **page 번호** (dual-anchor) | ✗ |
| `verify-phrase-coverage.js` | **psalter-texts.rich.json** 의 phrase 스키마/bounds/non-overlap/**coverage**/role | ✗ (아래) |
| `verify-{psalter,compline,propers,sanctoral}-pages.js` | page 번호 | ✗ |
| `verify-no-page-noise.js` / `verify-body-purity.js` | 본문 잡음/순수성 | ✗ |
| `audit-psalter-ref-consistency.js` | ref↔page stanza 지문 | ✗ |

두 가지 결정적 공백:

1. **coverage ≠ correctness.** `verify-phrase-coverage.js` 의 5대 불변식 중 "coverage" 는 *phrases 가 `lines[]` 를 빈틈/겹침 없이 contiguous 하게 덮는가* 만 본다. orphan 분절 `[0,0],[1,1]` 도 **완벽하게 타일링**되므로 통과한다. 즉 "조각을 빠짐없이 덮었나" 는 검사하지만 **"올바른 경계에서 덮었나" 는 검사하지 않는다.** X.897 은 이 가드를 green 으로 통과한다.
2. **hymn 은 phrase 가드 대상이 아예 아니다.** `verify-phrase-coverage.js` 는 FR-161 R-6 으로 `prayers/commons/psalter-texts.rich.json` **한 파일만** 검사한다. `prayers/hymns/*.rich.json` 122개는 어떤 phrase 검증기도 보지 않는다.
3. **사용자의 "5회 전수조사" 는 전부 page audit** 였다(git: `verifier-out 6영역 page audit`). 줄바꿈/시행 분절 축은 검사 항목에 존재한 적이 없다. → 5번 돌려도 0건 검출은 당연.

### systemic 대책 (권고)

**(A) phrase-merge 정확성 가드 신설 — hymn 포함.** `verify-phrase-coverage.js` 를 hymn rich 파일까지 확장하고, coverage 위에 **병합 정확성 불변식**을 추가:
- *의심 규칙*: phrase 가 `[n,n]` 단일행이고, 그 행 텍스트가 짧으며(≤3어 등), **직전 phrase 가 문장종결 부호로 끝나지 않으면** → "orphan 의심" 으로 flag(exit 1 또는 manual-review 버킷). `rich-content.tsx` 의 `SENTENCE_END_RE`/`isSentenceBoundary` 를 SSOT 로 공유.
- 본 리포트의 systemic 스캔(아래)이 그대로 프로토타입이 된다.

**(B) 빌더를 SoT-결합으로 (DV2).** §2 권고대로 분절 판정을 "대문자" 단독이 아닌 "직전행 미종결 + 대문자" 결합 신호로. 빌더와 검출기가 **같은 경계 규칙(SSOT)** 을 쓰면 빌더 산출물이 가드를 자동 통과(드리프트 0).

**(C) hymn 시각 회귀 테스트.** 단위 테스트(`hymn-section-red.test.ts`)는 메커니즘만 본다. 모바일 폭에서 "시행 시작 vs wrap 연속" 이 구분되는지(예: wrap 연속에 들여쓰기 class 부여 여부)를 **좁은 viewport 렌더로 assert** 하는 테스트 1개 추가(§3 해결안 채택 후). 이게 X.912 류 인지 회귀를 잡는 유일한 자동 신호.

### systemic 스캔 결과 (현 시점, 참고치)
본 리포트용 1회성 스캔(전 hymn rich 122개에서 "대문자 시작 + ≤3어 + 직전행 미종결" 단일행 phrase):
- **467건 / 73개 hymn** flag.
- ⚠️ **이 숫자는 과대보고**다. hymn 101("Хайр атаархдаггүй / Хайр өөрийнхийг..." — 각 행이 "Хайр(사랑)" 로 시작하는 정상 anaphora), hymn 107(두운 시 — 각 시행이 같은 글자로 시작) 등 **정당한 시행**이 다수 포함된다.
- 정확한 의미: **"휴리스틱이 의미 검증 없이 단독 판정한 모호 케이스가 73개 hymn 에 467곳 존재하며, 각각은 빌더가 맞췄는지 틀렸는지 아무도 검사하지 않은 동전던지기"** 라는 뜻. X.897 은 그 중 사용자 신고로 드러난 **확정 오판 1건**. 진짜 systemic 리스크는 "N개 버그" 가 아니라 **"검증 불가능한 휴리스틱이 코퍼스 전체의 시행 경계를 결정하고, 결과를 대조할 SoT 가드가 없다"** 는 구조다.

→ 후속 작업: (A) 가드를 만들어 467건을 manual-review 로 내리고 SoT(PDF/원본 시행 구조) 대조로 진짜 오판만 surgical 수정. 일괄 자동수정 금지(정상 anaphora 파괴 위험).

---

## 5. 요약 — 두 GOAL 의 관계

| | GOAL #1 (X.897) | GOAL #4 (X.912) |
|---|---|---|
| 성격 | instance(특정 데이터 오판) | systemic(인지·코퍼스 차원) |
| 데이터 버그? | **있음** — phrase `[0,1]` 미병합("Их Эзэнийг" 대문자 오분류) | **없음** — 시행 12개 정상 |
| 근본층 | 빌더 휴리스틱(`regroupPhrasesByCapitalStart`) | 렌더 인지(F-X8 flush, wrap=시행 구분 불가) |
| 공통 뿌리 | **PDF 단 줄바꿈을 하드 `\n` 으로 품은 데이터 + 휴리스틱 시행복원 + flush 렌더, 그리고 이를 검사하는 가드 부재** | (좌동) |
| 즉효 수정 | `21.rich.json` phrase[0]→[0,1] (데이터 1줄, surgical) | 후속 GOAL: wrap-only hanging indent 등 시각 결정 |
| 재발 방지 | §4 (A)(B)(C) | §4 (A)(C) |

코드 수정은 본 리포트 범위 밖(후속 GOAL). 본 리포트는 원인 + 권고까지.
