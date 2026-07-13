# MM — 복음 찬가(Benedictus/Magnificat) Шад магтаал 데이터 파이프라인 (g-48)

## 목적
사용자가 기도 화면에서 보는 "Шад магтаал: <안티폰 문장> (х. NNN)" 행이 어디서 오고, 무엇이 그 정확성을 보증하는지의 단일 모델.

## 데이터 흐름 (SoT → 화면)
1. **원본 SoT**: `parsed_data/full_pdf.txt` (몽골어 4주 시편집 전문 — untracked, 절대경로 참조). 모든 안티폰 문장·페이지 번호의 유일한 진실원.
2. **큐레이트 데이터**: `src/data/loth/psalter/week-{1..4}.json` — `days/<DAY>/<hour>.gospelCanticleAntiphon` (PDF-verbatim 문장) + `gospelCanticleAntiphonPage` (PDF 검증된 페이지, g-47 hidden-unless-verified 규칙: 미검증이면 필드 자체를 넣지 않는다).
3. **리졸버**: `src/lib/hours/resolvers/canticle.ts` + `src/lib/psalter-loader.ts` — 주간/요일/시간 데이터를 HourSection으로 전파 (`loth-service.ts`의 psalterCommons merge 지점 포함).
4. **렌더**: `src/components/prayer-sections/gospel-canticle-section.tsx` (+ `antiphon-box.tsx`) — 안티폰 문장 + `data-role=page-ref-link`로 `(х. NNN)` 표기 (g-29 no-wrap). 페이지 필드 부재 시 아무것도 렌더하지 않음.

## 불변식
- 안티폰 문장은 PDF-verbatim (MT/추측 번역 금지). 교정은 반드시 PDF 인용을 CR에 남긴다.
- 페이지 값은 PDF의 해당 찬가 블록으로 검증된 것만 저장 (44개 블록 전수 검증 완료 상태가 기준선).
- 원본 추출기의 다단(multi-column) 인터리브 때문에 raw exact-substring 매치는 신뢰 불가 — 검증은 시각적 읽기 순서(visual reading order) 재구성으로 한다 (wi-83-001 sweep 방법).
- 회귀 가드: `src/lib/__tests__/data/w3-mon-lauds-gospel-canticle-antiphon.test.ts` (데이터) + `src/components/prayer-sections/__tests__/gospel-canticle-antiphon-page.test.ts` (렌더).

## 이 GOAL(g-48)에서의 결함과 교정
- W3 MON lauds가 오유입 문장("Бидний ерөөлтэй еэ!")을 보였고 출처/페이지 표기가 없었다 → 문장 PDF-verbatim 교정 + 페이지 backfill(44블록) + 렌더 배선 신설.
