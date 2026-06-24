# 마침기도(concludingPrayer) 결론부 doxology systemic 절단

- **일자**: 2026-06-24
- **GOAL**: #203 (WI-212 신고 2건 → WI-215 systemic 잔여)
- **심각도**: user-facing (전례 본문 누락 — 기도가 본문 petition에서 끊김)
- **분류**: 데이터 추출손실 (PDF→텍스트 페이지나눔 시 결론부 유실)

## 증상

마침기도(Төгсгөлийн даатгал залбирал)가 본문 petition에서 끝나고, 닫는
삼위일체 doxology(`Тантай, Ариун Сүнсний нэгдэлтэй … тийн болтугай.` 또는
짧은 변형 `Тэрээр Тантай … цорын ганц Тэнгэрбурхан билээ.`)가 화면에서 누락.
사용자 신고 2건(WI-212): 주4 화요일 아침(책 p.448), 세례자 요한 6/24
아침·2저녁(p.828).

## 전수조사 방법 + 결과

`parsed_data/full_pdf.txt`(원문 SoT)를 정규화(공백 collapse)한 뒤,
psalter+sanctoral 전 `concludingPrayer` 280개에 대해:
data 문자열이 SoT에 verbatim 존재하고 **바로 뒤에 `Тантай, Ариун Сүнсний
нэгдэлтэй`가 오는데 data엔 빠진 경우**만 TRUNCATED로 판정(page-break noise
= 페이지번호·러닝헤더 제거 후).

결과:
- **TRUNCATED LIVE 9곳** = 신고 2(WI-212) + 추가 7(WI-215):
  | # | 위치 | doxology | 페이지나눔 |
  |---|------|----------|-----------|
  | (212) | psalter/week-4 TUE.lauds | 표준 | 무 (p.448) |
  | (212) | solemnities 06-24.lauds | 표준 | 무 (p.828) |
  | (212) | solemnities 06-24.vespers2 | 표준 | 무 (p.828) |
  | 1 | psalter/week-4 FRI.vespers | 표준 | **유 p.502→503** |
  | 2 | memorials 11-02.lauds | 표준 | 무 (p.852) |
  | 3 | memorials 11-02.vespers | 표준 | 무 |
  | 4 | memorials deceased.lauds | 표준 | 무 |
  | 5 | memorials deceased.vespers | 표준 | 무 |
  | 6 | solemnities 03-19.lauds | **Тэрээр 변형** | **유 p.823→824** |
  | 7 | solemnities 03-19.vespers2 | Тэрээр 변형 | 유 |
- **DEAD 키 2곳**(렌더X, 미수정): 03-19.vespers, 06-24.vespers — solemnity의
  `hour==='vespers'`는 `loth-service.ts` L572-573에서 `sanctoral.vespers2`로
  스왑되어 plain key는 미렌더.
- **NOT_IN_SOT 29곳**(별개 클래스, 미수정): data 텍스트가 SoT에 verbatim
  부재. 다수가 **정상 단축맺음 collect**(절단 아님)라 일괄수정 시 오정정
  위험 → 개별 SoT 검증 필요. 후속 판단 사항.

## 메커니즘

PDF→텍스트 추출 시 본문과 doxology 사이에 페이지 경계가 들어가면, 추출기가
페이지번호/러닝헤더(`503 Баасан гарагийн орой 503`, `824 824 Гэгээнтнүүдийн
Онцлог шинж`)를 끼워 넣거나 doxology 단락을 누락시켜 data 큐레이션에서
결론부가 빠짐. (#212 2건은 페이지나눔 없이도 누락 — 단락 분리 누락.)

## 수정 (WI-215 범위 = LIVE 7곳)

각 `concludingPrayer`에 SoT byte 그대로 결론부 doxology를 `body + 공백 +
doxology` 단일 문자열로 복원. plain 데이터만(7곳 모두 concludingPrayerRich
오버레이 부재 확인). goal210 AREA_HASHES의 memorials.json + solemnities.json
hash 재잠금. 실제 어셈블러(`buildConcludingPrayerFields`) 경유 회귀 테스트
추가.

## 미해결 (flag — 후속 검토 권장)

- **위령(11-02/deceased) `alternativeConcludingPrayer`**(11-02.vespers,
  deceased.lauds/vespers): (a) 자체 doxology 누락 가능성 + (b) 기존 wording이
  SoT와 불일치(`Эцэг`↔`Эзэн`, `болоод`↔`зөв`, `цагааттасан`↔`цагаатгасан`,
  `орон рууга`↔`орон руугаа`, `гүйж`↔`гуйж`). MEMORIAL rank라 기본 렌더는
  primary(수정됨)지만 토글(`Сонголтот залбирал`)로 노출됨. WI-215 디스패치
  7곳(primary) 밖이라 **미수정 — 별도 WI 권장**.
- NOT_IN_SOT 29곳 개별 검증.
