# 기도시간 조립 (Hour Assembly)

## 담당 소스 파일
- `src/lib/loth-service.ts` — 메인 조립 오케스트레이터 (`assembleHour()`)
- `src/lib/hours/index.ts` — 기도시간별 assembler 라우팅
- `src/lib/hours/lauds.ts` — 아침기도 조립기
- `src/lib/hours/vespers.ts` — 저녁기도 조립기
- `src/lib/hours/compline.ts` — 끝기도 조립기
- `src/lib/hours/shared.ts` — 공통 유틸: 시편 해석, 통상문 로드, 요일 변환

## 관련 데이터 파일
- 없음 (다른 모듈에서 데이터를 받아 조립)

## 관련 테스트 파일
- `e2e/prayer-lauds.spec.ts` — 아침기도: header, 핵심 section 존재, invitatory V./R., back link
- `e2e/prayer-vespers.spec.ts` — 저녁기도: header, no invitatory, Magnificat, Our Father, hymn/psalmody/dismissal
- `e2e/prayer-compline.spec.ts` — 끝기도: header, no invitatory, Nunc Dimittis, blessing, 고정 주간 주기 검증
- `src/lib/__tests__/hours/`

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-010 | 아침기도(Lauds) 조립: 하루의 첫 기도시간일 때는 초대송으로 시작하고 도입 서창(Удиртгал)은 생략(GILH §266); 그 외에는 도입 서창으로 시작. 이어서 찬미가, 시편 3개, 짧은 독서, 화답, 복음찬가(Benedictus)+교송, 중보기도, 주님의 기도, 마침기도, 파견. 초대송과 도입 서창은 상호 배타이다. | 완료 |
| FR-011 | 저녁기도(Vespers) 조립: 찬미가, 시편 3개, 짧은 독서, 화답, 복음찬가(Magnificat)+교송, 중보기도, 주님의 기도, 마침기도, 파견. | 완료 |
| FR-012 | 끝기도(Compline) 조립: 양심성찰, 찬미가, 시편, 짧은 독서, 화답, Nunc Dimittis+교송, 마침기도, 강복, 성모교송(Salve Regina 등). | 완료 |
| FR-016 | 초대송(Invitatory): 하루의 첫 기도시간(기본: Lauds)에 포함하며, 초대송이 바쳐지면 도입 서창(Deus in adiutorium / Удиртгал)은 생략된다 (GILH §266). | 완료 |

## 의존성
- **calendar** — 전례일 정보 (시기, 등급, 시편집 주간)
- **psalter** — 4주 시편집 및 공통문 데이터
- **propers** — 계절/성인축일 고유문, fallback 로직
- **bible** — 성경 본문 로드 (시편, 찬가, 짧은 독서)
- **hymns** — 찬미가 배정
