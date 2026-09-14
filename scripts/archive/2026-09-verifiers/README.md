# scripts/archive/2026-09-verifiers — 은퇴한 검증기 4종

2026-09-13 전체 앱 리뷰(`docs/app-review-2026-09-13.md` §3.2, P0-6) 에서 "영구 RED 이며
고칠 수 없는" 것으로 판정된 verifier 를 여기로 옮겼다
(`docs/bug-reports/2026-09-13-verifier-red-and-plain-rich-drift.md` §A "함께 RED 인 나머지 4종").
삭제 대신 archive 한 이유는 FR-156 / GOAL #115 문서가 이 스크립트들을 이력으로
참조하기 때문이다. **CI·`npm run verify:all`·Makefile 어디에도 연결하지 않는다.**

스크립트는 상대 경로(`ROOT`/`BASE`, `require('../../lib/...')`) 만 archive 위치에 맞게
고쳐 두었으므로 `node scripts/archive/2026-09-verifiers/<name>.js` 로 여전히 실행은 된다 —
단 아래 사유로 결과는 신뢰하지 말 것.

| 스크립트 | 원래 목적 | archive 사유 | 대체 검증기 |
|---|---|---|---|
| `verify-first-vespers.js` | FR-156 Phase 2 — `extract-first-vespers.js` 로 PDF 를 **재추출**해 `propers/*.json` 의 `firstVespers` 와 byte-equal diff | psalter/propers 데이터는 추출 이후 큐레이션(수동 교정) 이 누적되는 모델이다(메모리 규칙 "full 재추출 금지"). STC-003(`өвчтөнүүдийг` 교정, `docs/data/source-typo-ledger.md`) 이후 재추출본과 현행 JSON 은 **의도적으로** 다르므로 영구 value-mismatch. 재추출 diff 는 큐레이션과 양립 불가. | `scripts/verify-first-vespers-ref-coverage.js` (firstVespers ref ↔ psalter-texts 커버리지), `src/lib/__tests__/first-vespers.test.ts`, page 앵커는 `scripts/verify-propers-pages.js` |
| `verify-movable-first-vespers.js` | 이동 대축일 firstVespers 를 `extract-solemnity-first-vespers.js` 재추출본과 byte-equal diff | 위와 동일 + 후속에 추가된 `conditionalRubrics` 필드(FR-160-B, p.816/817 등) 를 "unexpected-in-actual" 로 판정. 추출기가 모르는 필드가 늘어날수록 RED 만 커진다. | `scripts/verify-conditional-rubrics.js` + `scripts/verify-conditional-rubric-coverage.js` (rubric 필드는 여기서 스키마·PDF 증거 검증), `verify-first-vespers-ref-coverage.js` |
| `verify-solemnity-first-vespers.js` | 고정 대축일(12-25 등) firstVespers 재추출 diff | 위와 동일 패턴 (`docs/research/goal115-solemnity-firstvespers-audit.md` 시점에 이미 mismatch 17 / unexpected 10). | 위와 동일 |
| `audit-canticle-refs.js` | `psalter/week-*.json` 의 `type:'canticle'` ref 가 여러 (week, day, hour) 슬롯에 반복되면 "duplicate" 로 exit 1 | 시편 110 · 묵시 19:1-7 등이 매주 주일 저녁기도에 반복되는 것은 **정상 전례**(4주 시편집 구조) 이지 복붙 버그가 아니다. 2026-04-19 일회성 헬퍼였고 24 "duplicate" 는 전부 false positive. | ref ↔ 본문 존재는 `scripts/audit-psalter-ref-consistency.js` (ref ↔ 선언 page 지문 정합, ±2), 키 중복은 `scripts/audit-psalter-key-dedup.js --check`, 본문 자체는 `scripts/verify-psalter-plain-rich-parity.js --check` |

## 다시 살리려면

재추출 diff 를 되살리는 것은 권장하지 않는다. 필요하다면 (a) `docs/data/source-typo-ledger.md`
의 STC 항목을 허용 diff 로 읽어 들이고, (b) 추출기가 모르는 필드(`conditionalRubrics`,
`pageRedirects`, `sectionOverrides` 등) 를 비교에서 제외하는 allowlist 를 먼저 설계할 것.
`audit-canticle-refs.js` 는 "duplicate" 판정을 제거하고 ref ↔ 본문 존재 검사만 남기면
`audit-psalter-ref-consistency.js` 와 중복이므로 되살릴 이유가 없다.
