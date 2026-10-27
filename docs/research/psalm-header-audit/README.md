# 시편 머리말 전수 대조 (2026-10-27)

증상·원인·검증은 `docs/bug-reports/2026-10-27-psalm-header-audit.md`.

머리말 = 시편 제목(빨간 부제) 아래의 이탤릭 인용과 출처 괄호, 예: «Надаас сур. Би дөлгөөн, зүрхэндээ даруу (Матай 11:29).» 본문 대조(`../psalm-omission-audit/`)의 인쇄면 행 스트림과 본문 블록 찾기를 그대로 쓰고, 본문 첫 행에서 위로 올라가며 머리말 행을 모은다. 부 표지 «I»·«II» 는 건너뛰고, 빨간 제목·후렴을 만나면 멈춘다.

| 파일 | 역할 |
|---|---|
| `audit_headers.py` | 자리마다 책 머리말·제목 ↔ 앱 비교. 앱 쪽은 로더와 같은 규칙(자리의 쪽 ±1 항목) |
| `emit-headers.py` | 자리마다 책 머리말 → `header-book.json` + 회귀 테스트 fixture(`src/lib/__tests__/data/psalm-book-headers.fixture.json`). 행 나눔은 pdfplumber, 띄어쓰기는 `parsed_data/full_pdf.txt` (pdfplumber 가 «Та нар оюун» 을 «Та нароюун» 으로 붙여 낸다) |
| `header-book.json` | 자리별 책 머리말 (검토용 중간 산출물) |
| `build-headers.mjs` | `psalter-headers.rich.json` 반영 + 시편 146 제목 (`--write`, 한 번만) |

```
S=/tmp/stream.json   # ../psalm-omission-audit/stream.py 로 만든다
python3 docs/research/psalm-header-audit/audit_headers.py $S
python3 docs/research/psalm-header-audit/emit-headers.py $S
node    docs/research/psalm-header-audit/build-headers.mjs        # dry-run
```

`build-headers.mjs` 는 끝에서 로더 규칙을 흉내 내 모든 자리(191곳)가 책과 같은 머리말을, 책에 없는 자리는 없음을 고르는지 점검한다. 새 항목 65개는 인쇄면 PNG 로 글자를 대조했다.

## 결과 (수정 후)

```
머리말: 자리 195 — none 51, ok 144
제목:   자리 195 — DIFF 1, EXTRA 11, MISSING 18, none 11, ok 154
```

제목(빨간 부제)은 이번 범위 밖 — bug report §6.
