# Handoff — 대축일 제1저녁기도 시편 = Laudate 교정 (2026-06-08)

> 작성: 세션 7a51444e / 검증 완료분 인계용. 다른 세션이 **재검증 없이** 착수할 수 있도록 verbatim 본문·출처·file:line·작업항목·금지사항을 자족적으로 담음.

---

## TL;DR

대축일 **제1저녁기도(First Vespers)** 시편은 「시간전례 총지침(GILH/IGLH)」 **§226** 에 따라 **Laudate 시편**(시 113·117·135·146·147A·147B 중 2개 + 신약 찬가)이어야 한다. 그런데 현재 앱은 **제1주간 주일 "제1저녁기도" 시편(시 141:1-9 / 시 142:1-7 / 필리 2:6-11)** 으로 채워져 있다. 이는 GILH·몽골어 책 의도와 어긋난 **타협(#165)** 이며 교정 대상이다.

- 몽골어 책(발췌판)은 대축일 시편을 인쇄하지 않고 **GILH에 위임**한다 → 그러므로 "발췌판이라서 제1주간 주일로 복사"는 책 의도가 아님.
- **교정의 실질 장벽** = 완전판 몽골어 기도서(Залбиралт цагийн ёслол)의 **대축일별 제1저녁 시편 고유 후렴(antiphon)**. 발췌판·프로젝트엔 없음. **후렴 fabricate / 영어 Universalis에서 추론 금지(MT 금지).**

---

## 1. 검증 완료 사실 (재확인 불필요)

### 1.1 GILH §225–229 — 대축일 시간경별 시편 출처 (1차 PDF 2종 직접 `pdftotext` 추출, 번호 연속 대조 완료)

"1) The Office for Solemnities" 소제목 아래 §225→229 가 끊김 없이 이어짐 (§221–224 와 연속 확인됨):

```
225. Solemnities have an evening prayer I on the preceding day.

226. At evening prayer I and II, the hymn, the antiphons, the short reading with its responsory,
     and the concluding prayer are proper. Where anything proper is missing, it is supplied from
     the common. In keeping with an ancient tradition, AT EVENING PRAYER I BOTH PSALMS ARE AS A
     RULE TAKEN FROM THE LAUDATE PSALMS (Ps 113, 117, 135, 146, 147 A, 147 B). The New Testament
     canticle is noted in its appropriate place. AT EVENING PRAYER II THE PSALMS AND CANTICLES
     ARE PROPER; the intercessions are either proper or from the common.

227. At morning prayer ... THE PSALMS ARE TO BE TAKEN FROM THE SUNDAY OF WEEK I OF THE FOUR-WEEK
     PSALTER; the intercessions are either proper or from the common.

228. In the office of readings, everything is PROPER: the hymn, the antiphons and psalms ...

229. At daytime prayer, the hymn of the weekday is used ... THE PSALMS ARE FROM THE GRADUAL PSALMS
     with a proper antiphon. On Sundays the psalms are taken from the Sunday of Week I of the
     four-week psalter ... But ON CERTAIN SOLEMNITIES OF THE LORD THERE ARE SPECIAL PSALMS.
```

→ 대축일은 **시간경마다 시편 출처가 다르다**:

| 시간경 | GILH | 시편 출처 |
|---|---|---|
| 제1저녁기도 | **§226** | **Laudate 시편**(113·117·135·146·147A·147B 중 2개) + 신약 찬가 |
| 아침기도 | **§227** | **제1주간 주일** 시편+찬가 |
| 독서기도 | §228 | 고유(proper) |
| 낮기도 | **§229** | **오름 시편(Gradual)**; 주일이면 제1주간 주일; 일부 주님 대축일은 고유 시편 |
| 제2저녁기도 | §226 | 고유(proper) |

"제1주간 주일"은 **§227(아침기도) 전용** 규정이며, 대축일 전체 규정이 아니다.

**출처 (직접 추출·대조):**
- catholic-resources.org/LoH/LiturgyOfTheHours-GeneralInstruction.pdf (Felix Just) — §221–229 연속 확인
- oplhrpdx.org/wp-content/uploads/2018/10/Liturgy-of-the-Hours.pdf (Oregon 도미니코회) — §225–229 일치
- liturgyoffice.org.uk/Resources/Rites/GILH.pdf (잉글랜드·웨일스판) — 내용 일치(시편 번호만 Grail/Vulgata 체계)
- ewtn.com/.../general-instruction-on-the-liturgy-of-the-hours-2175 — §226/227/229 일치

### 1.2 §134 = 같은 내용의 요약본
시편 분배 章의 §134 가 위 규칙을 한 문단으로 압축. (catholicculture.org §134, liturgyhours.wordpress.com 에서 확인) → §134(요약)와 §225–229(상세)는 **동일 규칙이 두 군데 실린 것**. "227/229는 가짜 번호"는 오판이었음.

### 1.3 발췌판 몽골어 책은 대축일 시편을 GILH/완전판에 위임
- `parsed_data/full_pdf.txt:18897-18901` (계절 고유부 서문) / `:27934-27937` (성인 고유부 서문):
  *"달리 지시하지 않는 한(өөрөөр заагаагүй бол) 시편기도는 '시편집의 네 주간'에 있다."*
- `parsed_data/full_pdf.txt:18894-18896` / `:27931-27933`:
  *"모든 텍스트는 「시간전례 예식서(Залбиралт цагийн ёслол)」·「그리스도인 기도서」에서 찾으라"* → **이 PDF는 고유부만 추린 발췌판**.
- `parsed_data/full_pdf.txt:1446-1465` (시편집 서문) = **GILH §133 해당(4주↔전례력 연동)만** 담고, **대축일 시간경별 규정은 없음**.
- 책은 벗어날 땐 콕 집어 지시함: `:20071-20072` 12/24 = *"현재 주간"*, `:20722` 성가정 = *"시편기도: 제1주간"*.

### 1.4 대축일은 책에서 고유부만 인쇄(시편 지시 전무) — 발췌판 실증
세 대축일 모두 제1저녁·아침·제2저녁이 후렴·복음찬가·기도만 있고 **"제1주간"도 "Laudate"도 없음**:
- 삼위일체: `parsed_data/full_pdf.txt:25879-25932`
- 성모승천(8/15): `:28282-28340`
- 주님탄생예고(3/25): `:28049-28093`

→ 책은 대축일에 **일괄 "Week 1" 지시를 일부러 안 줌** = 보편 GILH(§226/227/229)에 따르라는 의도.

---

## 2. 현재 앱 상태 = 버그

- **데이터:** `src/data/loth/propers/ordinary-time.json:3470-3524`
  - `trinitySunday.SUN.firstVespers.psalms` = 시 141:1-9(p.49) / 시 142:1-7(p.51) / 필리 2:6-11(p.53)
  - `antiphon_key`: `fv-w1-sun-ps1` · `fv-w1-sun-ps2` · `fv-w1-sun-cant` → **제1주간 주일 제1저녁 시편 그대로 복사** (= §226 Laudate 위반)
- **리졸버:** `src/lib/loth-service.ts`
  - `firstVespers` → `dataLookupHour='vespers'` 매핑 `:121-128`
  - 기본 시편 = Sunday `vespers` 로드 `:130-147`
  - sanctoral→movable→plain-Sunday firstVespers 조회 `:317-380`; `firstVespersData.psalms` 있을 때만 교체 `:382-388`
  - `getSeasonFirstVespers` 가 movable special-key 블록 우선 반환 `src/lib/propers-loader.ts:262-276`
- **테스트:** `src/lib/__tests__/first-vespers.test.ts:821-835` (Trinity 제1저녁 후렴/기도만 검증, 시편은 미검증) / `src/lib/__tests__/movable-solemnity-vespers2.test.ts:110-120` (제2저녁 = 제1주간 주일 시편 검증)

---

## 3. 내부 이력 (왜 이렇게 됐나)

- **GOAL150** (`docs/research/GOAL150-trinity-1vespers-psalms.md`): 제1저녁 = **Laudate(시 113:1-9 / 시 147:12-20 / Eph 1:3-10)** 로 교정 제안. 단 *"Trinity 고유 후렴 출처 미발견"* 으로 implementation 보류. (후렴/페이지 별건: `docs/research/GOAL150-trinity-proper-antiphons-pages.md`)
- **#165** (메모리 노트 `solemnity-firstvespers-book-fallback`): GOAL150 의 Laudate 를 뒤집고 제1주간 주일로 되돌림. 근거 = *"Laudate 는 Universalis 추정이라 배제, 책 재현이 원칙."*
  - ⚠️ **전제 오류:** Laudate 는 Universalis 특유물이 아니라 **GILH §226 의 보편 규정**이고, 이 책 자체가 거기에 위임함(§1.3). 즉 #165 는 "책 재현"을 명분으로 오히려 책 의도에서 멀어짐. 실제 동기는 전례 정확성이 아니라 **후렴 데이터 가용성**(제1주간 주일은 후렴이 이미 있음).

---

## 4. 작업 항목 (Work Items)

### WI-1 (BLOCKER) — 완전판 기도서/Ordo 에서 대축일별 제1저녁 시편 고유 후렴 소싱
- 대상: 완전판 몽골어 「Залбиралт цагийн ёслол」 또는 몽골 교구 Ordo.
- 각 대축일의 제1저녁 **Laudate 시편 2개 선택 + 신약 찬가 + 각 항목 고유 후렴(Шад дуулал) + 페이지** 확보.
- 산출물: 대축일별 `{ ref, antiphon(Mn), page }` 표.
- **AC:** 출처가 권위 있는 몽골어 자료로 명시될 것. 영어/Universalis 추론·MT 금지.

### WI-2 — 데이터 교정 (제1저녁 → Laudate)  *(WI-1 선행 필수)*
- `ordinary-time.json` 등 각 대축일 `firstVespers.psalms` 를 Laudate 선택으로 교체, WI-1 의 고유 후렴/페이지 주입.
- Trinity 확정 타깃(GOAL150): 시 113:1-9 / 시 147:12-20 / Eph 1:3-10. 본문 텍스트 로컬 존재 — `psalter-texts.json:1667`(113) / `:4520`(147B) / `:424`(Eph1); rich = `prayers/commons/psalter-texts.rich.json:22244` / `:59051` / `:5828`. **후렴만 WI-1 필요.**
- `gloria_patri: true` 유지. 제2저녁(`vespers2`)은 **건드리지 말 것**(별건, 테스트 있음).
- 테스트: `first-vespers.test.ts` 에 Trinity 제1저녁 시편 = 113/147B/Eph1 단정 추가, `@fr` 태그 부여.
- **AC:** `/api/loth/2026-05-31/firstVespers` → 113/147B/Eph1; `/vespers`(제2저녁)는 110/114/Rev19 그대로.

### WI-3 — 기록 정정
- 메모리 노트 `solemnity-firstvespers-book-fallback` 정정: "Laudate=Universalis 오판" 프레임 제거, 제1저녁의 올바른 출처 = Laudate(§226), 제1주간 주일은 **데이터 가용성 타협**임을 명기. 아침기도(§227)에만 "제1주간 주일 복사" 휴리스틱이 맞음을 명시.
- #165 결정 기록에도 같은 정정 주석.

### WI-4 (SCOPE) — Trinity 단독이 아님: 모든 대축일 sweep
- 고정 대축일(`full_pdf.txt`): 3/19, 3/25, 6/24, 6/29, 8/15, 11/1, 12/8 (Их баяр) + 이동 대축일(승천·성령강림·삼위일체·성체·성심·그리스도왕).
- 각각 현재 제1저녁 시편 출처를 감사 → 동일 패턴이면 WI-1/2 적용.
- **AC:** 모든 대축일 제1저녁이 Laudate(또는 그 대축일 고유 시편)인지 일람표로 보고.

---

## 5. 하지 말 것 (Do NOT)

- ❌ 후렴/시편 **fabricate** 또는 영어 Universalis 에서 몽골어 추론(MT 금지). 권위 있는 몽골어 출처만.
- ❌ `extract-psalm-texts.js` 등 **full-overwrite 재추출** (비멱등, refs 회귀 — 메모리 `psalter-curated-no-full-reextract` 참조).
- ❌ 제2저녁기도(`trinitySunday.SUN.vespers2`) 수정 — 별건이고 기존 테스트 보호 중.
- ❌ 책 발췌판에 ':' 없는 데이터 임의 삽입(파서 colonless route 별도, 메모리 `intercessions-colonless-parser-bug`).

---

## 6. 검증 커맨드 (CLAUDE.md self-review)

```bash
node scripts/verify-psalter-pages.js          # verified-correction bucket = 0 (NFR-009c)
node scripts/verify-propers-pages.js          # propers page 값 변경 시 (NFR-009d)
node scripts/audit-psalter-ref-consistency.js # suspect 수 미증가
node scripts/generate-test-fr-map.mjs --check # @fr 태그 누락 감지
```
- link/asset/Content-Type 변경 없음 → `sw.js`/`CACHE_VERSION` 무관(데이터 전용 변경).
- 시각 검증: `/pray/2026-05-31/firstVespers` Playwright 스크린샷으로 시 113/147B 본문 마커 표시, 시 141/142 비표시 확인.

---

## 7. 참고 파일 인덱스

| 용도 | 경로 |
|---|---|
| GILH 추출본(로컬 txt) | `~/.claude/projects/-home-min-myproject-divineoffice/7a51444e-.../tool-results/webfetch-*.txt` (catholic-resources/oplhrpdx/liturgyoffice) |
| 발췌판 원문 | `parsed_data/full_pdf.txt` (Trinity `:25872-25932`, 서문 `:18889-18901`/`:27920-27937`/`:1446-1465`) |
| 현재 데이터 | `src/data/loth/propers/ordinary-time.json:3468-3524` |
| 리졸버 | `src/lib/loth-service.ts` / `src/lib/propers-loader.ts:262-276` |
| 선행 연구 | `docs/research/GOAL150-trinity-1vespers-psalms.md`, `docs/research/GOAL150-trinity-proper-antiphons-pages.md` |
| 본문 텍스트(Laudate) | `psalter-texts.json` 113@1667 / 147B@4520 / Eph1@424 |
| 테스트 | `first-vespers.test.ts:821-835`, `movable-solemnity-vespers2.test.ts:110-120` |
| 메모리 정정 대상 | `solemnity-firstvespers-book-fallback`, `psalter-curated-no-full-reextract` |
