# 공통문 (дэг жаяг)

## 담당 소스 파일

### 페이지
- `src/app/ordinarium/page.tsx` — дэг жаяг 읽기 페이지 (Server Component, 정적 생성)

### 데이터
- `src/data/loth/ordinarium.json` — PDF p.22-48 몽골어 원문 구조화 (아침 8개 · 저녁 7개 서브섹션, 171개 block)

## 관련 컴포넌트
- `src/components/footer.tsx` — Footer 공유
- `src/components/settings-link.tsx` — SettingsLink 공유
- 내부: `TableOfContents`, `SectionContent`, `SubsectionContent`, `BlockRenderer`, `PageNum` (page.tsx 내부에 정의)

## 관련 테스트 파일
- `e2e/ordinarium.spec.ts` — 제목/TOC/앵커 이동/시편 95 본문/루브릭 스타일/Magnificat/홈 링크/뒤로가기 검증

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-103 | **공통문 페이지 렌더링** (`/ordinarium`): 몽골어 원서 p.22-48 "Залбиралт цагийн ёслолын дэг жаяг" 섹션(아침·저녁 기도 공통문·루브릭)을 구조화된 형태로 표시한다. 원문을 앞뒤로 스크롤하며 연속으로 읽을 수 있다. 범위: 원서 p.22-38(Өглөөний даатгал залбирал) + p.39-48(Оройн даатгал залбирал). | 완료 |
| FR-104 | **공통문 목차(Гарчиг)**: 2개 대섹션(morning/evening) + 각 대섹션 하위 서브섹션(아침 8 / 저녁 7) 구조. 각 항목에 원서 PDF 페이지 번호(х.N) 표시. 클릭 시 해당 섹션으로 스크롤. | 완료 |
| FR-105 | **블록 타입별 타이포**: `blocks[]`의 각 블록은 type에 따라 시각적으로 구분된다. `rubric`은 빨간 계열, `versicle`은 stone 박스 + `R.` prefix, `psalm-stanza`는 왼쪽 경계선, `antiphon-group`은 시기별 헤더 + 요일 리스트, `paragraph`/`heading`은 기본 serif 본문. | 완료 |

## 데이터 구조 (ordinarium.json)

```
{
  "title": "Залбиралт цагийн ёслолын дэг жаяг",
  "sections": [
    {
      "id": "morning" | "evening",
      "title": string,
      "page": number,
      "subsections": [
        {
          "id": string,           // 앵커 ID (예: "morning-invitatory-psalms")
          "title": string,
          "page"?: number,
          "blocks": Block[]
        }
      ]
    }
  ]
}

type Block =
  | { type: "paragraph",     text: string }
  | { type: "rubric",        text: string }                                      // 빨간 루브릭(지침)
  | { type: "versicle",      v: string, r: string }                              // V./R. 대화
  | { type: "heading",       text: string, subtitle?: string }                   // 서브 헤딩
  | { type: "psalm-stanza",  lines: string[] }                                   // 시편/magnificat/benedictus stanza
  | { type: "antiphon-group", season: string, page?: number,
      items: { day: string, text: string }[] }                                   // 시기/요일별 antiphon 묶음
```

## 원본 텍스트 출처

`psalter_full_text.txt` (몽골어 축약본 OCR 텍스트) 줄 644-1375에서 추출. PDF 섹션별 매핑:

| 섹션 | 몽골어 제목 | PDF 페이지 |
|------|------------|-----------|
| 아침 — 공통 구조(섹션 divider) | Залбиралт цагийн ёслолын дэг жаяг | 21 |
| 아침 — Урих дуудлага (요일·시기별 Ирэгтүн) | Өглөөний даатгал залбирал / Урих дуудлага | 22-27 |
| 아침 — Урих дуудлагын дуулал (Дуулал 95/100/67/24) | — | 28-32 |
| 아침 — Магтуу · Дууллын залбирал | — | 33 |
| 아침 — Уншлага · Хариу залбирал | — | 33 |
| 아침 — Захариагийн магтаал (Benedictus) | Сайнмэдээний айлдлын магтаал | 34-35 |
| 아침 — Гуйлтын залбирал · Эзэний даатгал залбирал | — | 36-37 |
| 아침 — Төгсгөл | — | 37-38 |
| 저녁 — Удиртгал | Оройн даатгал залбирал | 39 |
| 저녁 — Магтуу · Дууллын залбирал | — | 39 |
| 저녁 — Уншлага · Хариу залбирал | — | 40 |
| 저녁 — Мариагийн магтаал (Magnificat) | Сайнмэдээний айлдлын магтаал | 40-42 |
| 저녁 — Гуйлтын залбирал · Эзэний даатгал залбирал | — | 42-43 |
| 저녁 — Төгсгөл | — | 43-45 |

## 스코프 제한

- **끝기도(Compline) 공통문**(원서 p.512+, 목차상 "Шөнийн даатгал залбирал" 별도 섹션)은 본 페이지 범위 밖이다. 별도 요구사항으로 추후 추가할 수 있다.
- **찬미가 전체**(원서 p.870+ "Магтуу" 섹션)도 본 페이지 범위 밖. `/pray/[date]/[hour]`에서 시기별로 개별 할당된다.
- **`/pray/[date]/[hour]`의 `х.N` PageRef 크로스-링크**(이 페이지의 앵커로 점프)는 별도 PR에서 구현한다.

## 의존성
- 없음 (독립 정적 페이지, API 호출 없음)
