# 성경 본문 (Bible)

## 담당 소스 파일
- `src/lib/bible-loader.ts` — JSONL 파일에서 성경 데이터 로드, `lookupRef()`: verse suffix (a/b/c) 처리, psalm offset 보정
- `src/lib/scripture-ref-parser.ts` — 성경 참조 문자열 파싱

## 관련 데이터 파일
- `src/data/bible/bible_ot.jsonl` — 구약성경
- `src/data/bible/bible_nt_rest.jsonl` — 신약성경 (복음서 제외)
- `src/data/bible/bible_gospels.jsonl` — 복음서

## 관련 테스트 파일
- `src/lib/__tests__/scripture-ref-parser.test.ts` — 성경 참조 파싱 단위 테스트

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-070 | JSONL 파일 3개(bible_ot.jsonl, bible_nt_rest.jsonl, bible_gospels.jsonl)에서 성경 본문을 로드한다. | 완료 |
| FR-071 | 시편 참조(예: "Psalm 63:2-9")를 파싱하여 해당 절만 추출한다. | 완료 |
| FR-072 | 짧은 독서(short reading)의 성경 참조를 해석하여 본문을 로드한다. | 완료 |

## 의존성
- 없음 (기반 모듈)
