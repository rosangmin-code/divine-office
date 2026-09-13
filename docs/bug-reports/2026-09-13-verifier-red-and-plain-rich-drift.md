# 버그 리포트 — 데이터 검증기 RED 5종 (미감지 5개월) + plain↔rich 시편 본문 드리프트

- **작성**: 2026-09-13 전체 앱 리뷰 (team-lead; 데이터 파이프라인 리뷰 에이전트가 verifier 27종 실행 → 리더가 드리프트 grep 재확인)
- **분류**: (A) 데이터 계약 위반 + 검증기 CI 미연결 / (B) 이중 소스(plain/rich) 동기화 누락
- **심각도**: 높음 (A 는 데이터 계약 위반이 5개월간 미감지, B 는 fallback·검증기 경로가 구본문을 읽음)
- **상태**: 재현 로그 확보. 수정은 후속 작업.

---

## A. `verify-conditional-rubric-coverage.js` RED (exit 1, 10 errors)

### 재현

```
node scripts/verify-conditional-rubric-coverage.js
```

출력 (2026-09-13, 세션 scratchpad `data/logs/verify-conditional-rubric-coverage.js.log`):

```
Per-season PDF mention vs JSON marking:
  advent            pdf=   4  json=   4  coverage=100%
  christmas         pdf=  13  json=  11  coverage=85%
  lent              pdf=  15  json=  10  coverage=67%
  easter            pdf=  37  json=  13  coverage=35%
  ordinary-time     pdf= 130  json=  14  coverage=11%
  sanctoral         pdf= n/a  json=  37  coverage=n/a

[verify-conditional-rubric-coverage] 10 error(s):
  - easter.json.weeks.ascension.SUN.lauds.conditionalRubrics[0]: evidencePdf.text not found at PDF page 731
  - easter.json.weeks.ascension.SUN.vespers2.conditionalRubrics[0]: … page 732
  - ordinary-time.json.weeks.trinitySunday.SUN.lauds.conditionalRubrics[0]: … page 747
  - ordinary-time.json.weeks.trinitySunday.SUN.vespers2.conditionalRubrics[0]: … page 748
  - ordinary-time.json.weeks.corpusChristi.SUN.lauds.conditionalRubrics[0]: … page 749
  - ordinary-time.json.weeks.corpusChristi.SUN.vespers2.conditionalRubrics[0]: … page 750
  - ordinary-time.json.weeks.sacredHeart.SUN.lauds.conditionalRubrics[0]: … page 751
  - ordinary-time.json.weeks.sacredHeart.SUN.vespers2.conditionalRubrics[0]: … page 752
  - ordinary-time.json.weeks.christTheKing.SUN.lauds.conditionalRubrics[0]: … page 816
  - ordinary-time.json.weeks.christTheKing.SUN.vespers2.conditionalRubrics[0]: … page 817
```

### 원인

이동 대축일 5개(승천·삼위일체·성체성혈·예수성심·그리스도왕) 의 psalmody-substitute rubric 이 `evidencePdf.text` 에 PDF 인용문이 아닌 설명문(`"[Ерөнхий хэм хэмжээ] … (Амилалт/Пэнтикост х.58 загвар)"`) 을 넣었다. 검증기 계약은 "해당 page 에 verbatim 존재" 이다. 해당 데이터는 2026-04-27 1커밋으로 들어간 뒤 이 검증기가 CI·Makefile 어디에도 연결되지 않아 5개월간 미감지.

### 함께 RED 인 나머지 4종 (죽은 검증기로 판단)

| 스크립트 | 결과 | 판단 |
|---|---|---|
| `verify-first-vespers.js` | exit 1, value-mismatch | PDF 재추출 ↔ 현재 JSON diff. STC-003(`өвчтөнүүдийг` 교정) 이후 영구 실패 |
| `verify-movable-first-vespers.js` | exit 1, `conditionalRubrics` unexpected-in-actual (p.816/817) | 후속 추가된 필드를 모름 |
| `verify-solemnity-first-vespers.js` | exit 1, 동일 패턴 | 동일 |
| `audit-canticle-refs.js` | exit 1, 24 "duplicate refs" | 시편 110·묵시 19 의 주일 저녁 반복(정상 전례) 을 버그로 판정. 2026-04-19 일회성 헬퍼 |

나머지 22종은 PASS (`audit-psalter-ref-consistency` suspects 0, `verify-body-purity` 0 violations, `verify-phrase-coverage` 0, `verify-hymn-phrase-merge` 0 orphans, page verifier 6종 corrections 0, `vitest run scripts` 472/472).

### 수정 제안

1. 이동 대축일 rubric 의 `evidencePdf` 에 `kind: 'rationale'` 을 허용하거나 실제 PDF 문구로 교체 → 검증기 GREEN.
2. `npm run verify:all` 타깃을 만들고 CI 에 연결 (SoT `parsed_data/full_pdf.txt` 는 CI 에서 `pdftotext -layout public/psalter.pdf` 로 재생성).
3. 죽은 검증기 4종은 `scripts/archive/` 로 이동하거나 ledger 기반 허용 diff 를 넣는다.

---

## B. plain(`psalter-texts.json`) ↔ rich(`psalter-texts.rich.json`) 본문 드리프트 5건

### 재현

```
for w in эвлэрүүлэхийг эвлэрүүлснийг Цаашаа Цаашид; do
  echo -n "$w plain="; grep -c "$w" src/data/loth/psalter-texts.json
  echo -n "  rich=";  grep -c "$w" src/data/loth/prayers/commons/psalter-texts.rich.json
  echo -n "  pdf=";   grep -c "$w" parsed_data/full_pdf.txt
done
```

출력 (2026-09-13):

```
эвлэрүүлэхийг  plain=1  rich=0  pdf=0
эвлэрүүлснийг  plain=0  rich=1  pdf=5
Цаашаа         plain=1  rich=0  pdf=0
Цаашид         plain=0  rich=1  pdf=1
```

데이터 리뷰 에이전트의 전수 대조(키 135/135 일치, 본문 5건 상이):

| 항목 | plain | rich | PDF |
|---|---|---|---|
| Colossians 1:12-20 | `эвлэрүүлэхийг` | `эвлэрүүлснийг` | rich 일치 (5회) |
| Wisdom 9 | `бас` | `биш` | rich 일치 |
| Isaiah 61 | `Цаашаа` | `Цаашид` | rich 일치 |
| Jeremiah 14 | `.` | `!` | rich 일치 |
| Psalm 135 | `Далайнууд` | `Далайнуудад` | 양쪽 0 (별도 판정 필요) |

`git log -S` 로 확인: 4건은 2026-05-10 PDF 검증 오탈자 수정(#472/#484, 커밋 caecca1/77c6252) 이 **rich 에만** 적용된 것.

### 영향

- UI 는 rich 우선 렌더(`src/components/psalm-block.tsx:169`) 라 사용자에게는 보이지 않는다.
- 그러나 `audit-psalter-ref-consistency.js` 지문, `verify-psalter-pages.js` 지문, `src/lib/hours/loaders.ts` 의 plain fallback 은 구본문을 읽는다. rich overlay 가 실패하는 순간 구본문이 노출된다.
- plain↔rich 를 대조하는 검증기가 0개라 재발 감지 불가.

### 수정 제안

1. plain 4건을 rich 와 동기화 (Psalm 135 는 PDF 인쇄면 렌더로 판정 후 결정).
2. plain↔rich 텍스트 동등성 verifier 신설 (구두점 정규화 허용표 포함) → `verify:all` 에 편입.

---

## 관련

- 종합 리뷰: `docs/app-review-2026-09-13.md`
- `docs/data/source-typo-ledger.md` (STC-001~004)
- 메모리: psalter 데이터는 큐레이트, full 재추출 금지
