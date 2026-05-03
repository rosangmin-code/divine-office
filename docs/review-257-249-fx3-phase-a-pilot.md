# Review #257 — #249 F-X3 Phase A pilot (5 hymn phrase-unit 주입, method a2)

> **TL;DR** — `APPROVED_WITH_ISSUES`. Phase A pilot 자체는 method (a2) spec 대로 정확히 구현되었고 idempotent + 0 회귀 + 7/11 AC `MET` (3 `PARTIALLY_MET`). 핵심 제약 2개는 **Phase B sweep 가이드**로 남긴다: ① terminator-less 찬가 91% 비율 ② refrain prefix 가 `Дахилт` 단일 — `Нийтээр:` / `Эсвэл:` 미감지. peer 합의 (codex/quality_auditor) AGREE / HIGH confidence. **Status**: REVIEW COMPLETE. **Risk**: LOW (Phase A) / MEDIUM (Phase B 적용 시). **Next**: completion_report → team-lead.

---

## 0. Review metadata

| 항목 | 값 |
|------|----|
| Review task | #257 |
| Subject task | #249 (F-X3 Phase A pilot — 5 hymn phrase-unit method a2) |
| Author | member-01 |
| Reviewer | divine-review (adversarial-reviewer profile) |
| Subject commit | `3721723` (worktree-249-member-01) |
| Merged into main | `c55da1e` (#249) |
| Review base | `90c74155` (`Merge 251-divine-review`) |
| Audit reference | `docs/handoff-fx3-phrase-audit.md` (#228, P1-A 권고) |
| Method choice | (a2) sentence-terminator + Дахилт-prefix — no PDF re-parse |
| Peer | codex / quality_auditor (HIGH confidence AGREE) |
| Tools | `pair-perfect --adhoc`, `pair-cli peer call`, `pair-cli discussion submit-stance` |
| Worktree | `257-divine-review` (base verified by `pair-cli cowork worktree-verify-base --fix`) |

**Files changed in subject commit** (9 files, +883 / −4):

| File | LOC delta | 종류 |
|------|-----------|------|
| `scripts/build-hymn-phrases-into-rich.mjs` | +313 (NEW) | builder (pure module + CLI) |
| `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` | +143 (NEW) | unit tests (10) |
| `scripts/__tests__/verify-phrase-coverage.test.mjs` | +37 (AMEND) | hymn-shape integration tests (2) |
| `scripts/verify-phrase-coverage.js` | +30 −4 | top-level `hymnRich.blocks` iterator |
| `src/data/loth/prayers/hymns/{1,11,26,40,76}.rich.json` | +360 (data) | phrase metadata 주입 |

---

## 1. Verdict

| 차원 | 결과 |
|------|------|
| **Final verdict** | `APPROVED_WITH_ISSUES` |
| **Phase A merge** | ✅ blocking issue 없음 — 이미 `c55da1e` 로 merge 완료 |
| **Phase B sweep readiness** | ⚠️ method (a2) limits 명문화 후 진행 권장 (3.1, 3.2) |
| **Tests / lint / tsc** | ✅ all green (888 / 0 / 0) |
| **Renderer regression** | ✅ 0 변경 (commit 주장 일치) |
| **Peer consensus** | AGREE @ R1, HIGH confidence (codex/quality_auditor) |

근거: AC matrix (§2) 7 `MET` + 3 `PARTIALLY_MET` + 1 `MET` (구조적 0-diff). PARTIALLY_MET 모두 forward-looking — Phase B sweep 시 보강 필요한 영역이며 Phase A pilot 자체의 결함은 아니다.

---

## 2. AC Matrix

11개 AC 중 7 `MET` / 3 `PARTIALLY_MET`. 검증 명령은 모두 worktree `257-divine-review` 에서 실제 실행, 결과는 §4.2 Evidence 에 verbatim quote.

| AC | Type | 기준 | Verdict | Evidence |
|----|------|------|---------|----------|
| AC-1 | structural | Builder method (a2) — sentence-terminator + Дахилт prefix only, no PDF re-parse | `MET` | `build-hymn-phrases-into-rich.mjs` 에 PDF 파서 import 없음. `TERMINATORS = Set([. ! ? …])` (line 63). `REFRAIN_PREFIX_RE = /^\s*Дахилт(\s*\d+)?\s*:/` (line 69). `injectPhrasesIntoHymnRich` (line 188) → `planStanzaPhrases` (line 142) 순수 함수 |
| AC-2 | executable | Builder idempotent — 재실행 시 byte-identical | `MET` | 5 pilot file backup → `node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76` 재실행 → `diff -q` ALL IDEMPOTENT (5/5) |
| AC-3 | executable | Builder unit tests + 충분한 coverage | `PARTIALLY_MET` | `npx vitest run scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` → **10 passed** (commit 주장 11 — off-by-one). `Дахилт 2:` / `Дахилт 3:` numbered + `Дахилт:<text>` no-space variant assertion 없음 (실제 corpus 존재) |
| AC-4 | executable | Verifier psalter 회귀 0 (215/0) | `MET` | `node scripts/verify-phrase-coverage.js` → `OK — 215 stanza(s) with phrases inspected, 0 violations` |
| AC-5 | executable | 5 pilot 35 stanzas / 0 violations | `MET` | per-file: 12+1+1+17+4 = **35 stanzas, 0 violations** (4.2 §5 quote) |
| AC-6 | structural | 5 hymn 분해 결과가 PDF logical phrase 와 일치 | `PARTIALLY_MET` | hymn 1, 40 (terminator-rich) → 결과 적절. hymn 11, 26 (terminator-less) → single-phrase fallback (예상). **hymn 76 → audit §6.2 가 page 933 에서 stanza-당 2 phrases 기대**했으나 method (a2) 는 1 phrase 산출. 음악적/시각적 phrase 단위가 method (a2) 한계로 sub-optimal |
| AC-7 | executable | full vitest 888+ passed | `MET` | `npm test` → `Test Files 46 passed (46) / Tests 888 passed (888) / 0 failed` (5.81s) |
| AC-8 | executable | lint 0 errors | `MET` | `npm run lint` → `✖ 16 problems (0 errors, 16 warnings)` — 16 warnings 모두 unchanged 파일 (pre-existing) |
| AC-9 | executable | tsc clean | `MET` | `npx tsc --noEmit` → exit 0 |
| AC-10 | semantic | Method (a2) limitations 명문화 + Phase B sweep 위험 평가 | `PARTIALLY_MET` | builder docstring + commit message 에 "price of method a2" 명문화. **다만 Phase B 적용 시 risk 가 정량적으로 미평가 — 본 review 가 §3.1 에서 보강** |
| AC-11 | structural | Renderer 변경 0 | `MET` | `git diff c0d3f24..3721723 -- src/components/` → empty diff |

---

## 3. Findings (severity 분류)

### 3.1 MAJOR (Phase B sweep readiness gate)

#### F1. Phase B sweep 시 hymn 91% 가 sub-optimal phrase 산출 — **method (a2) limit 의 실제 영향 측정**

| 분류 | 비율 |
|------|------|
| 모든 stanza 에 terminator 존재 (method a2 최적 동작) | **11 hymn (9%)** |
| **NO** stanza 에 terminator (모든 stanza 가 single-phrase fallback) | **71 hymn (58%)** |
| Mixed (일부 stanza 만 terminator 보유) | 40 hymn (33%) |

- **출처**: 본 review 자체 통계 — 122 hymn 전수 sweep (`src/data/loth/prayers/hymns/*.rich.json`), stanza 별 `text` join 후 `[.!?…]` 패턴 검사.
- **의미**: Phase B (~30 hymn week 1 + 나머지 92) 의 ~91% 는 method (a2) 가 phrase 단위 boundary 를 detect 하지 못해 stanza 당 1 phrase 로 fallback. audit `docs/handoff-fx3-phrase-audit.md` §6.2 이 page 933 hymn 76 sample 에서 **stanza 당 2 phrases (logical phrase boundary 기준)** 를 기대한 것에 비하면 sub-optimal.
- **Pilot 대표성**: hymn 11 (single big stanza, 0 terminator), 26 (4 line, 0 terminator), 76 (4 stanza, 0 terminator, 모두 refrain) 가 fallback bucket 에 속해 5 pilot 중 3 / 5 가 fallback 케이스 — 즉 pilot diversity 는 이미 Phase B 의 91% 케이스를 representative 하게 보여준다. ✅
- **Phase A 영향**: NONE (pilot 자체는 method 명세대로 작동). **Phase B 영향**: HIGH — sweep 전 method (a1) PDF column-aware 또는 hybrid (a1+a2) 검토 권장.
- **Renderer UX 결과**: fallback hymn 들은 phrase branch 가 활성화되긴 하지만 모든 stanza-line 이 한 phrase 로 join 되어 **viewport 자연 wrap 만 적용** — 기존 hard-line-break (legacy stanza branch) 대비 일부 개선 (좁은 viewport 에서 깨지지 않음) 이지만 audit 의 logical-phrase-단위 분해 목표 달성은 ❌.

권고: Phase B kickoff 전에 (a) PDF column-aware builder spike (audit method a1), 또는 (b) `Дахилт`/`Нийтээр`/`Эсвэл` 외 추가 휴리스틱 (예: line length pattern + indent break) 평가 — 미적용 시 91% 의 sweep 결과가 audit-fidelity 미달임을 PRD 또는 Phase B handoff 에 명시.

#### F2. Refrain prefix 가 `Дахилт` 단일 — `Нийтээр:` / `Эсвэл:` 미감지

| Prefix | 의미 | 코퍼스 instance | 처리 |
|--------|------|-----------------|------|
| `Дахилт:` / `Дахилт N:` / `Дахилт:<text>` | refrain (반복) | 다수 (모든 hymn) | ✅ `role: 'refrain'` 부여 |
| `Нийтээр:` | "all/everyone:" — 회중 응답 | hymn 1 block[2] 등 | ❌ 미감지 (현 spec: Дахилт only) |
| `Эсвэл:` | "or:" — 대체 안 rubric | 2 instances | ❌ 미감지 |
| `Дахилт:Үнэн<text>` (콜론 후 공백 없음) | refrain 변형 | 1 instance | ✅ regex match (그러나 unit test 부재) |

- **출처**: `grep -E '"text": "[А-Яа-я]{3,15}\s*(\d+)?\s*:[^"]{0,30}' src/data/loth/prayers/hymns/*.rich.json | grep -vE 'Дахилт' | sort -u`
- **Pilot 영향**: hymn 1 의 block[0] (`Энэрлийн нөхөр мэт буун тэдэнд хаан болтугай.`) 은 `Нийтээр:` 가 없는 verse. 그러나 block[2] = `Нийтээр: Нялх хүүхдийн туйлын хайртай хаан,` 은 `Нийтээр:` 로 시작 — 회중 응답 의미상 refrain 과 동등하나 현재 `phrases: [{lineRange:[0,0], indent:0}]` (no role). renderer 에서 refrain 스타일링 (italic / 들여쓰기) 미적용.
- **Phase A 영향**: hymn 1 의 회중 응답 line 들이 일반 verse 와 동일 스타일로 렌더 — UX 측면 작은 회귀 가능성. 그러나 pilot 합격 기준 (commit spec) 은 `Дахилт` 만 명시했으므로 **spec 준수**. design 결정 재검토 필요.
- **Phase B 영향**: 122 hymn 전수에서 `Нийтээр:` / `Эсвэл:` 가 얼마나 빈번한지 별도 sweep 미실시 (본 pilot review scope 외).

권고: `Нийтээр:` 는 회중 응답 = 사실상 refrain 과 등가 — `REFRAIN_PREFIX_RE` 확장 (`/^\s*(Дахилт(\s*\d+)?|Нийтээр)\s*:/`) 또는 별도 `role: 'response'` 도입 검토. Phase B sweep 전 design 결정 권장.

### 3.2 MAJOR (test gap)

#### F3. `closesPhrase` trailing-character strip 의 미커버 패턴

`closesPhrase` 의 strip 정규식 `/[\s"'»«„""'']+$/u` 는 trailing whitespace + 직접/굴린 인용부호 만 제거. peer (quality_auditor) 가 식별한 추가 우려:

| 패턴 | 현재 동작 | 위험 |
|------|----------|------|
| `...магтагдтугай.)` (terminator + closing paren) | `)` 제거 안 됨 → last char `)` → CLOSE 안 됨 | LOW (pilot 코퍼스 내 0 instance) |
| `...магтагдтугай.]` (square bracket) | 동일 | LOW (0 instance) |
| `...магтагдтугай.»)` (composite trailing) | strip → `..магтагдтугай.»)` → `)` non-quote → CLOSE 안 됨 | LOW (0 instance) |
| `...магтагдтугай。` (CJK fullwidth period) | TERMINATORS 미포함 | NONE (Mongolian 코퍼스 0 instance) |
| `...магтагдтугай！` / `？` (CJK fullwidth) | TERMINATORS 미포함 | NONE (0 instance) |

- **결론**: 이론적 false-negative 가능하나 코퍼스 sweep 에서 현재 instance 0. defensive 강화 시 MAX_JOIN_DEPTH 패턴 (시편 R-12.3) 처럼 strip set 확장 가능.
- **Severity**: MAJOR (peer 식별, theoretical) → 실제 코퍼스 영향 LOW. Phase B sweep 시 한 번 더 sweep 권장.

### 3.3 MINOR

#### F4. Builder unit test count off-by-one

- Commit body: "13 신규 단위 테스트 추가 (builder 11 + verifier hymn-shape 2)"
- 실제: builder 10 tests + verifier hymn-shape 2 tests = **12 신규**
- Reproducible: `npx vitest run scripts/__tests__/build-hymn-phrases-into-rich.test.mjs --reporter=verbose` 의 verbose summary `Tests 10 passed (10)` (4.2 §3 evidence quote).
- 영향: NONE (행동 정확). 차후 commit message accuracy 만.

#### F5. Test coverage gap — `Дахилт N:` numbered + no-space variant

- 코퍼스 실제 prefix: `Дахилт 1:` / `Дахилт 2:` / `Дахилт 3:` (numbered) + `Дахилт:Үнэн итгэл хай` (콜론 직후 공백 없음).
- 현재 단위 테스트: `Дахилт 1:` 1건 + lone `Дахилт:` 1건. `Дахилт 2:` / `Дахилт 3:` / no-space 변형 assertion 없음.
- Regex `/^\s*Дахилт(\s*\d+)?\s*:/` 은 모두 매치 (보호되어 있음). 그러나 explicit assertion 부재로 regex change 시 회귀 감지 부재.
- 권고: `Дахилт 2:` + no-space 케이스 1-2 test 추가 (Phase B 진입 전 follow-up).

### 3.4 NIT

#### F6. `planStanzaPhrases` 의 `phrases.length === 0` 방어 코드 — peer 가 dead code 로 분류

- Builder line 168-170: `if (phrases.length === 0 && lines.length > 0)` fallback. peer adversarial: "any non-empty `lines` array → 무조건 한 terminator 또는 tail branch 가 phrase emit. 0-phrase 도달 불가 = effectively dead code."
- 검증: tail branch (line 159-161) `if (start <= lines.length - 1)` 은 lines 비어있지 않으면 항상 trigger. 즉 phrases.length === 0 도달 조건은 lines.length === 0 단 한 케이스인데, 그건 함수 진입 line 143 에서 이미 early-return.
- 영향: NONE. defensive 의도이므로 leave 가 일반적이지만 dead code lint warning 미해당 (실제 실행 안 되어도 무해).
- 권고: 변경 불필요. 차후 cleanup 시 옵션.

#### F7. Hymn 11 / 26 / 76 — fallback 이 single-phrase covering 으로 join → 사용자 visible 줄바꿈 변형

- hymn 11 (13 lines, 0 terminator) → 1 phrase. renderer phrase branch 에서 13 lines 가 자연 wrap 단위로 합쳐져 viewport 폭에 따라 다르게 wrap. 기존 (legacy) 동작 = 13 hard-break.
- 의미: 시각적 line-break 가 사라지고 자연 wrap 으로 흐름. 모바일 좁은 viewport 에서는 깨지지 않으나 일부 사용자가 "원래의 line-break 가 사라졌다" 고 느낄 가능성.
- Pilot acceptable 여부: builder docstring 이 명시적으로 "the price of method a2" 라 명문화 → 사용자 의도된 trade-off. ✅
- Phase B 영향: 71 hymns (58%) 가 동일 fallback. UX 변형이 의도된 것인지 사용자 검증 권장.

---

## 4. Adversarial scan + 추가 검증

### 4.1 Adversarial 가설

| # | 가설 | 결과 |
|---|------|------|
| H1 | Method (a2) 가 false-positive (구절 중간 마침표가 phrase split 일으킴) | **0 instance** in 5 pilot (terminator 가 line-end 에만 존재 — 인용/약어 등 line-mid period 없음) |
| H2 | `Нийтээр:` / `Хариу:` 등 Дахилт 외 refrain prefix 미감지 | **CONFIRMED** — F2 finding |
| H3 | Builder 두 번 실행 시 byte-identical 깨짐 | DENIED — diff -q 5/5 IDEMPOTENT |
| H4 | Renderer 변경 0 주장이 거짓 (rich-content.tsx 등이 hymn 처리 위해 미세 조정) | DENIED — `git diff` empty for `src/components/` |
| H5 | Verifier psalter 회귀 발생 | DENIED — 215/0 변동 없음 |
| H6 | hymnRich shape vs psalmRich shape 의 schema 차이로 phrase branch 가 hymn 에서 깨짐 | **부분 검증** — peer 가 식별: psalm body 는 `psalm-block.tsx` (별도 phrase branch), hymn 은 `rich-content.tsx` 위임. 두 branch 가 schema-호환 하나 코드 path 가 다름 — 그러나 hymnRich payload 가 psalter 와 동일한 PrayerBlock 구조이므로 동작 호환 (data-only). NIT |
| H7 | Phase B sweep 위험 (어떤 hymn 구조가 method a2 로 깨질 가능성) | F1 — 91% 의 hymn 이 sub-optimal 산출. pilot 대표성 있음 (3/5 fallback) |
| H8 | `closesPhrase` 가 trailing punctuation 변형 (`. )`, `.»`, CJK) 으로 false-negative | F3 — theoretical, 코퍼스 instance 0 |

### 4.2 Evidence — verbatim command output

#### §1. Worktree base verification
```
$ pair-cli cowork worktree-verify-base --input '{"team":"divineoffice","task_id":"257","member":"divine-review","fix":true}'
{"success": true, "status": "fixed", "task_id": "257", "member": "divine-review", "head": "90c74155965b456c925b96478fa039acf91cf9bc", "previous_head": "c0d3f2427cf6c2c9f4593df410ffb3af21366a2d", "expected_base": "90c74155965b456c925b96478fa039acf91cf9bc"}
```

#### §2. Idempotency check
```
$ node scripts/build-hymn-phrases-into-rich.mjs --ids 1,11,26,40,76
[hymn-phrases] WRITE mode — 5 hymn(s) ...
hymn 1: OK (12 stanza block(s))
hymn 11: OK (1 stanza block(s))
hymn 26: OK (1 stanza block(s))
hymn 40: OK (17 stanza block(s))
hymn 76: OK (4 stanza block(s))
[hymn-phrases] done — OK=5 FAIL=0
$ diff -q /tmp/hymn{1,11,26,40,76}-before.json src/data/loth/prayers/hymns/{1,11,26,40,76}.rich.json
ALL IDEMPOTENT
```

#### §3. Builder unit tests (verbose)
```
$ npx vitest run scripts/__tests__/build-hymn-phrases-into-rich.test.mjs --reporter=verbose
✓ planStanzaPhrases — terminator detection > closes a phrase at a line ending with `.`
✓ planStanzaPhrases — terminator detection > emits separate phrases when multiple terminators appear in one stanza
✓ planStanzaPhrases — terminator detection > falls back to one covering phrase when the stanza has no terminators
✓ planStanzaPhrases — terminator detection > respects a tail without terminator after a closed phrase
✓ planStanzaPhrases — refrain detection > propagates `role:refrain` to every phrase when first line opens with "Дахилт N:"
✓ planStanzaPhrases — refrain detection > treats a lone "Дахилт:" rubric line as part of the next phrase, not a splitter
✓ planStanzaPhrases — refrain detection > does NOT mark refrain when the first line is a verse number opener
✓ injectPhrasesIntoHymnRich — block-level integration > preserves dividers and writes phrases only on stanza blocks
✓ injectPhrasesIntoHymnRich — block-level integration > is idempotent — re-injecting on already-annotated data yields identical phrases
✓ injectPhrasesIntoHymnRich — block-level integration > reports an error for malformed input (no blocks array)
Test Files  1 passed (1)
Tests  10 passed (10)        ← commit body 의 "11" 와 off-by-one
```

#### §4. Verifier — psalter 회귀 baseline
```
$ node scripts/verify-phrase-coverage.js
[verify-phrase-coverage] OK — 215 stanza(s) with phrases inspected, 0 violations
```

#### §5. Verifier — 5 pilot hymns
```
$ for id in 1 11 26 40 76; do node scripts/verify-phrase-coverage.js --target src/data/loth/prayers/hymns/${id}.rich.json; done
[verify-phrase-coverage] OK — 12 stanza(s) with phrases inspected, 0 violations
[verify-phrase-coverage] OK —  1 stanza(s) with phrases inspected, 0 violations
[verify-phrase-coverage] OK —  1 stanza(s) with phrases inspected, 0 violations
[verify-phrase-coverage] OK — 17 stanza(s) with phrases inspected, 0 violations
[verify-phrase-coverage] OK —  4 stanza(s) with phrases inspected, 0 violations
total: 35 stanzas, 0 violations
```

#### §6. Full vitest suite
```
$ npm test 2>&1 | tee /tmp/test-out.log | tail -10
RUN  v4.1.4 /home/min/myproject/divine office/.claude/worktrees/257-divine-review

 Test Files  46 passed (46)
      Tests  888 passed (888)
   Start at  19:30:20
   Duration  5.81s (transform 11.01s, setup 0ms, import 20.44s, tests 11.10s, environment 8ms)
```

#### §7. Lint / tsc
```
$ npm run lint
✖ 16 problems (0 errors, 16 warnings)
( all 16 warnings in pre-existing files: scripts/build-psalter-texts-rich.pilot.mjs, scripts/dev/auto-reconcile-wraps.mjs, scripts/parsers/pdf-lexer.poc.mjs, src/app/api/calendar/today/route.ts, src/components/prayer-sections/rich-content.tsx [phraseSpans pre-existing], src/lib/__tests__/first-vespers.test.ts, src/lib/__tests__/hymn-rotation.test.ts )

$ npx tsc --noEmit
exit=0
```

#### §8. Renderer unchanged
```
$ git diff c0d3f24..3721723 --stat -- src/components/
(no output — 0 files changed)
```

#### §9. Phase B sweep risk — 122 hymn terminator 분포
```
total hymns: 122
all stanzas have terminators: 11 ex=["6(17)","14(3)","16(6)","35(1)","39(17)"]
NO stanzas have terminators: 71 ex=["2(5)","4(2)","7(3)","9(2)","10(1)"]
mixed (some stanzas with/without): 40
```

#### §10. Refrain prefix 변형 sweep
```
$ /usr/bin/grep -hroE '"text": "[А-Яа-я]{3,15}\s*(\d+)?\s*:[^"]{0,30}' src/data/loth/prayers/hymns/*.rich.json | /usr/bin/grep -vE 'Дахилт' | sort -u
"text": "Нийтээр: Аврагч мандан ирэв. Аллэлуяа,
"text": "Нийтээр: Мариа аа! Бидэнд гуйн
"text": "Нийтээр: Нялх хүүхдийн туйлын хайртай 
"text": "Эсвэл: Аж сайхан төрүүлж
"text": "Эсвэл: Ачилж магтмуй.
```

#### §11. Peer call summary (codex/quality_auditor, R1)
```
exchange_id: ex_20260503T113250Z_6d50bb4c
provider: codex
peer_role_key: quality_auditor
peer_persona_hash: 40f5763ee8520790
duration: 156649ms
stance: AGREE / HIGH confidence
verdict: APPROVED_WITH_ISSUES (consensus reached @ R1)
warnings: ["FR-35 relay violation: prompt contains 3 file path(s)"]  ← divine-review 의 prompt construction 문제, peer 결과 무영향
```

---

## 5. Phase B 권고 (forward-looking)

| # | 권고 | 우선도 | 적용 시점 |
|---|------|--------|-----------|
| R1 | `REFRAIN_PREFIX_RE` 확장 — `Нийтээр:` / `Эсвэл:` 추가 (또는 별도 `role: 'response'` 도입) | HIGH | Phase B kickoff 전 |
| R2 | Method (a1) PDF column-aware spike — terminator-less hymn 71개 (58%) sweep 전 logical phrase boundary recovery 가능 여부 평가 | HIGH | Phase B kickoff 전 |
| R3 | `Дахилт 2:` / `Дахилт 3:` / no-space `Дахилт:<text>` unit test 추가 | LOW | Phase B follow-up |
| R4 | `closesPhrase` strip set 확장 검토 — `)`, `]`, CJK punctuation (코퍼스 0 instance 이지만 defensive) | LOW | Phase B follow-up 또는 skip |
| R5 | Phase A pilot 의 사용자 visible 결과 (특히 hymn 11/26/76 fallback case) 모바일 / 데스크탑 viewport 에서 시각 검증 | MEDIUM | Phase B kickoff 전 |
| R6 | Commit message off-by-one fix (10 builder + 2 verifier = 12) — 차후 git notes 또는 PRD trace 갱신 시 정정 | LOW | OOS for this review |

---

## 6. References

- `docs/handoff-fx3-phrase-audit.md` (#228, audit P1-A 권고)
- `scripts/build-hymn-phrases-into-rich.mjs` (subject builder, 313 LOC)
- `scripts/__tests__/build-hymn-phrases-into-rich.test.mjs` (10 unit tests)
- `scripts/verify-phrase-coverage.js` (verifier, hymnRich shape iter 추가)
- `src/data/loth/prayers/hymns/{1,11,26,40,76}.rich.json` (5 pilot data)
- `src/components/prayer-sections/rich-content.tsx` line ~333-358 (phrase branch — psalter + hymn 공유)
- `src/components/psalm-block.tsx` line ~54 (psalm body 별도 phrase branch — peer 식별)
- `src/components/hymn-section.tsx` (hymn → RichContent 위임)
- Peer exchange: `.claude/pair-working/sessions/adhoc-review-257-fx3-pilot/peer/exchanges/ex_20260503T113250Z_6d50bb4c/`
- Discussion record: round 1, consensus AGREE @ both

---

## 7. Decision

**Verdict**: `APPROVED_WITH_ISSUES`
**Phase A merge**: ✅ 통과 (이미 `c55da1e`)
**Phase B sweep**: ⚠️ R1 + R2 (refrain prefix 확장 + method a1 spike) 적용 후 진행 권장
**Reviewer**: divine-review
**Peer concurrence**: codex/quality_auditor — AGREE / HIGH (consensus @ R1)
**Issued**: 2026-05-03
