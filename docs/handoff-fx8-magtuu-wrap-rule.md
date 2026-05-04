# F-X8 (#300) — Магтуу 류 찬미가 줄바꿈 규칙

> **TL;DR** — 122 찬미가 (hymn) 의 phrase 분해 가 PDF 시각 줄바꿈 (column wrap)
> 을 새 절(verse) 로 잘못 해석하던 문제를 두-pass post-process 로 수정.
> Pass A 가 자본문자 시작 행을 phrase 경계로, Pass B 가 소문자 시작 wrap 행을
> 직전 phrase 에 흡수. 렌더러 측 `RichContent flush` prop 으로 hanging indent
> 도 제거 (사용자 spec: "들여쓰기 없음"). 영향 — 122 hymn 중 111 hymn 의
> rich.json 재구성 (322 stanza split / 1039 새 sub-phrase 경계 / 3 stanza wrap
> merge / 4 phrase 흡수). 0 vitest 회귀 (937 PASS, was 916), tsc/lint clean.

---

## 1. 문제 정의 (사용자 보고 — 2026-05-03)

> Магтуу 류 찬미가 의 줄바꿈/들여쓰기 규칙이 일반 hymn 과 다름.
> 별도 처리 필요.
>
> **규칙 (사용자 spec)**:
> - **들여쓰기 없음** (no indent)
> - **대문자로 시작하는 line = 새로운 절(verse)의 시작** — phrase boundary
> - **소문자로 시작하는 line = 같은 절의 wrap continuation** — 이전 line 에 이어짐
> - 새 절 다시 시작 = 대문자

PDF 식자공이 컬럼 너비를 넘는 verse 를 다음 시각줄로 wrap 시킬 때 **재대문자화 없이**
소문자로 이어 쓰는 관행을 따른다 (Mongolian 키릴 typesetting 규약). F-X3 #291 의
b2 strict / a2 fallback 분해기는 이 wrap 시각 줄을 새 절 boundary 로 오해하여
두 가지 회귀를 만들었다:

1. **회귀 A** (a2_fallback, 174 stanza) — 13 줄 stanza 가 단일 [0,12] phrase 로
   포장되어 모든 verse 가 한 덩어리로 join. 새 절 경계 정보 손실.
2. **회귀 B** (b2_layer1, 25 stanza) — per-line phrase 가 정확하나 PDF wrap 으로
   생긴 소문자 시작 행 ("чамд өгье", "өргөе" 등) 이 별 phrase 로 emit 되어
   직전 verse 와 분리됨.

추가로 R-13 hanging indent (`pl-6 -indent-6`) 가 hymn 에도 적용되어 사용자 의도
("들여쓰기 없음") 와 mismatch.

## 2. 영향 audit

| 항목 | 수치 |
|------|------|
| 122 hymn 중 multi-line phrase 보유 (회귀 A 후보) | 174 a2_fallback + 75 a2_terminator + 134 a2_refrain |
| 122 hymn 중 소문자 시작 wrap 행 보유 (회귀 B 후보) | 36 hymn / 114 wrap line |
| F-X8 후 split 발동 stanza | 322 |
| F-X8 후 새 sub-phrase 경계 | 1039 |
| F-X8 후 cross-phrase merge 발동 stanza | 3 |
| F-X8 후 phrase 흡수 | 4 |
| 변경된 rich.json 파일 | 111 / 122 |

상위 wrap-line 보유 hymn (audit 기준):

```
106.rich.json  wraps=15  (stanzas=18, lines=76)
21.rich.json   wraps=10  (stanzas=2,  lines=23)
91.rich.json   wraps=10  (stanzas=7,  lines=45)
35.rich.json   wraps= 7  (stanzas=1,  lines=15)
104.rich.json  wraps= 6
105.rich.json  wraps= 6
48.rich.json   wraps= 6
```

전수 audit (122 hymn 중 36 hymn 에 wrap 발견, 86 hymn 은 wrap 없음 — 후자는
F-X8 의 Pass B 입장에서 no-op 이지만 Pass A 의 capital 경계 split 은 fire).

## 3. 해결 방안

데이터 측 + 렌더러 측 두 갈래.

### 3.1 데이터 측 — `scripts/build-hymn-phrases-into-rich.mjs`

기존 `planStanzaPhrasesWithDecision` (a2/b2) 출력을 그대로 두고 unconditional
post-process 두 pass 추가.

**Pass A — `splitMagtuuPhrasesOnCapitalBoundaries(lines, phrases)`**

각 phrase `[start, end]` 를 walk:
- `start+1..end` 의 각 line 에 대해
  - 첫 non-whitespace 가 Mongolian 키릴 lowercase → wrap continuation, 현 sub-
    phrase 에 attach (split 안 함)
  - 그 외 (capital, 숫자, punctuation, blank-skip) → 새 sub-phrase 시작
- parent phrase 의 `indent` / `role` 은 모든 sub-phrase 에 inherit (refrain
  propagation 보존).
- single-line phrase 는 pass-through.

**Pass B — `mergeLowercaseWraps(lines, phrases)`**

phrase 리스트 walk:
- 각 phrase i (i ≥ 1) 의 첫 line 이 lowercase → 직전 phrase i-1 의 lineRange
  를 [prev.start, cur.end] 로 확장, cur 흡수.
- 첫 phrase 가 lowercase 인 경우 (cross-stanza wrap edge case — hymn 1.b4,
  44.b4) 는 흡수 대상 없음 → 그대로 보존 (한계).

두 pass 모두 pure (입력 mutation 없음) + idempotent (재실행 = no-op).

### 3.2 렌더러 측 — `RichContent flush` prop

`src/components/prayer-sections/rich-content.tsx`:
- `phraseHangingIndentClass(level, flush=false)` — `flush=true` 일 때
  `pl-6 -indent-6` 페어 대신 빈 클래스 (level 0) / `pl-6` (level 1) /
  `pl-12` (level 2) 반환.
- `RichContent({ ..., flush?: boolean })` — 새 prop, default false.
- `renderBlock` signature 에 `flush: boolean` 추가, `phraseHangingIndentClass`
  에 forward.

`src/components/hymn-section.tsx`:
- `<RichContent content={section.textRich!} className="mt-2" flush />`
  로 hymn 만 flush 모드 활성화. psalm/responsory/intercession/short-reading/
  concluding-prayer 등은 default (hanging indent 유지).

### 3.3 Telemetry

빌더 CLI summary line 변경:

```
[hymn-phrases] decisions — total_hymn=122 total_stanza=552 ...
[hymn-phrases] magtuu-rule — split_stanzas=322 split_new_boundaries=1039 \
  merged_stanzas=3 phrases_absorbed=4
```

`--decisions` JSON line 에 `wrap_split` / `wrap_merged` 필드 추가.

## 4. 검증

| Gate | 결과 | 명령 |
|------|------|------|
| 빌더 단위 테스트 (Pass A/B + integration 8건 신규) | 48 / 48 PASS | `npx vitest run scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` |
| 렌더러 flush 테스트 (4건 신규) | 30 / 30 PASS | `npx vitest run src/components/prayer-sections/__tests__/rich-content-flow.test.ts` |
| 전체 vitest | 937 / 937 PASS (was 916) | `npm test` |
| TypeScript | 0 error | `npx tsc --noEmit` |
| ESLint | 0 error / 16 pre-existing warnings | `npm run lint` |
| Phrase coverage verifier (122 hymn) | 0 violation | `node scripts/verify-phrase-coverage.js --target src/data/loth/prayers/hymns/{N}.rich.json` |
| Page-noise verifier (F-X7 회귀 방어) | 0 occurrence | `node scripts/verify-no-page-noise.js` |
| Builder idempotency (--all 재실행) | byte-identical | `node scripts/build-hymn-phrases-into-rich.mjs --all && git diff src/data/loth/prayers/hymns/` |

## 5. Out-of-scope / 한계

- **Cross-stanza wrap (2 hymn)** — hymn 1.b4 / 44.b4 의 첫 line 이 lowercase
  로 시작 (이전 stanza b2 의 wrap 이 divider 를 건너 b4 로 spillover). 현
  Pass B 는 phrase 안에서만 merge 하므로 stanza 경계 너머로는 흡수하지 않음.
  필요 시 별 task 로 stanza-merge 파이프라인 검토.
- **Psalm / responsory / intercession / short-reading 등 비-hymn 영역** — F-X8
  은 hymn 만 영향. 시편의 hanging indent 는 R-13 contract (FR-161 R-13) 그대로
  유지.
- **Plain-text alt-pick 경로** — `ordinarium/hymns.json` 의 plain text 는 F-X7b
  scope. F-X8 은 rich path 만 처리. alt-pick 메뉴는 plain text 그대로 (사용자가
  default 가 아닌 다른 hymn 을 고른 case 만, 회귀 위험 0).

## 6. 참조 task

- F-X3 #228 audit (`docs/handoff-fx3-phrase-audit.md`) — 122 hymn audit
- F-X3 #291 b2 strict + 122 hymn sweep — base phrase 분해
- F-X7 #299 / F-X7b #317 — Магтуу page-info noise 제거 (orthogonal cleanup)
- F-X8 (이 task #300) — 줄바꿈 규칙 (rendering rule)

---

**Author**: member-01
**Status**: implemented + verified
