# 시편 머리말·제목 전수 대조 (2026-10-27)

증상·원인·검증은 `docs/bug-reports/2026-10-27-psalm-header-audit.md`.

머리말 = 시편 제목(빨간 부제) 아래의 이탤릭 인용과 출처 괄호, 예: «Надаас сур. Би дөлгөөн, зүрхэндээ даруу (Матай 11:29).» 본문 대조(`../psalm-omission-audit/`)의 인쇄면 행 스트림과 본문 블록 찾기를 그대로 쓰고, 본문 첫 행에서 위로 올라가며 머리말 행을 모은다. 부 표지 «I»·«II» 는 건너뛰고, 빨간 제목·후렴을 만나면 멈춘다.

| 파일 | 역할 |
|---|---|
| `audit_headers.py` | 자리마다 책 머리말·제목 ↔ 앱 비교. 앱 쪽은 로더와 같은 규칙(자리의 쪽 ±1 항목) |
| `emit-headers.py` | 자리마다 책 머리말 → `header-book.json` + 회귀 테스트 fixture(`src/lib/__tests__/data/psalm-book-headers.fixture.json`). 행 나눔은 pdfplumber, 띄어쓰기는 `parsed_data/full_pdf.txt` (pdfplumber 가 «Та нар оюун» 을 «Та нароюун» 으로 붙여 낸다) |
| `header-book.json` | 자리별 책 머리말 (검토용 중간 산출물) |
| `build-headers.mjs` | `psalter-headers.rich.json` 반영 + 시편 146 제목 (`--write`, 한 번만) |
| `emit-titles.py` | 데이터 항목마다(342) 책 제목(빨간 부제) 비교 → `title-book.json` + 회귀 테스트 fixture(`psalm-book-titles.fixture.json`). 제목 글자는 인쇄 행 — full_pdf.txt 는 짧은 제목을 같은 글자의 다른 행(시편 150 → 다니엘 3장 후렴)에 짝지어 쓰지 않는다 |
| `title-book.json` | 항목별 책 제목·앱 제목·상태 (검토용 중간 산출물 — 저장된 것은 수정 뒤에 다시 만든 것이라 상태가 ok/ok~/none 뿐) |
| `build-titles.mjs` | 주일 제1저녁 고유부·끝기도 제목 추가, II부·시락 36 제목 삭제, 시편 113·11·80 (`--write`; 수정 뒤의 `title-book.json` 으로 다시 돌리면 바꿀 것이 없다). 손으로 접은 객체가 있는 고유부 3개 파일은 `"title"` 행만 텍스트로 끼워 넣는다 |

```
S=/tmp/stream.json   # ../psalm-omission-audit/stream.py 로 만든다
python3 docs/research/psalm-header-audit/audit_headers.py $S
python3 docs/research/psalm-header-audit/emit-headers.py $S
node    docs/research/psalm-header-audit/build-headers.mjs        # dry-run
python3 docs/research/psalm-header-audit/emit-titles.py $S
node    docs/research/psalm-header-audit/build-titles.mjs         # dry-run
```

`build-headers.mjs` 는 끝에서 로더 규칙을 흉내 내 모든 자리(191곳)가 책과 같은 머리말을, 책에 없는 자리는 없음을 고르는지 점검한다. 새 항목 65개는 인쇄면 PNG 로 글자를 대조했다.

## 결과 (2026-10-30 개정판 기준)

```
머리말: 자리 195 — none 51, ok 144
제목 (항목 단위): 342 — none 22, ok 319, ok~ 1
```

제목 `ok~` 1 은 의도한 차이다: 이사야 40 «Хоньчин» 대문자(STC-009). 시편 113 «алдрыг магтан» 띄어쓰기(STC-021) 15곳은 2026-10-30 개정판이 책에서 고쳐 `ok` 가 됐다. 제목은 `docs/bug-reports/2026-10-27-psalm-title-audit.md`.
