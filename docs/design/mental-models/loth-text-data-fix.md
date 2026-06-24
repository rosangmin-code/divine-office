# Mental Model — LotH 몽골어 본문 데이터 교정 (page-break 추출손실/문단 오류)

GOAL #200~#204 (2026-06-23~24 사용자 신고분) 공유 blueprint.

## SoT (Source of Truth)
- **본문 원문 SoT = `parsed_data/full_pdf.txt`** (몽골어 성무일도 책 전체 추출본). 모든 본문/구조/맞춤법 판정의 기준. `parsed_data/full_pdf.txt`는 repo에 **untracked** — worktree에 없으므로 멤버는 절대경로 `/home/min/myproject/divineoffice/parsed_data/full_pdf.txt`로 Read.
- 전례/언어 정확성 결정은 **사용자 권한**. PDF로 단정 불가하면 MT/추측 금지 → 후보·근거 정리해 리더 pushback.

## 렌더 경로 (이중 데이터 — 둘 다 일치 필수)
- **시편 본문**: `src/data/loth/psalter-texts.json` (plain) + `src/data/loth/prayers/commons/psalter-texts.rich.json` (rich = 실제 화면 렌더). 둘이 어긋나면 화면은 rich를 따름 → 두 파일 동시 교정.
- **propers (절기/축일/대축일)**: `src/data/loth/propers/{advent,easter,lent,ordinary-time}.json` + `src/data/loth/sanctoral/*.json` + 해당 rich 경로.
- 데이터는 **큐레이트** — `extract-*` full 재추출 스크립트 비멱등(회귀 위험), **surgical 편집만** ([[psalter-curated-no-full-reextract]]).

## 결함 클래스
대부분 **page-break 추출손실**(책 페이지 경계에서 다음 페이지 줄이 유실) 또는 **문단 오분할/오삽입**. PDF에는 온전한데 앱 데이터에서 줄/문단이 빠지거나 잘못 끊김.

## 고침 절차
1. 화면 스크린샷(절대경로 Read) + `full_pdf.txt`(절대경로)에서 올바른 전문 확인.
2. PDF byte 그대로 surgical 교정 — plain + rich 동시.
3. propers 파일 수정 시 `scripts/__tests__/goal210-hymn-pagebreak-merge.test.mjs` AREA_HASHES 깨짐 → 변경 파일 hash 재잠금.
4. 검증: 관련 verifier(`scripts/verify-*-pages.js`) + targeted vitest + 가능하면 Playwright 렌더 스크린샷(육안).

## 검증 책임
멤버=targeted. 풀스위트(goal210 hash 포함 cross-cutting)=리더가 push 직전.
