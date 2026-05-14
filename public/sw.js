// v29 — task #4: phrase-injection 파이프라인의 `lines[].role` →
// `phrases[].role` 전파 fix. `scripts/build-phrases-into-rich.mjs` 의
// `regroupPhrasesByCapitalStart()` 및 `translatePhrases()` 후처리에 role
// propagation pass 추가 (conservative tie-break — phrase coverage 내 모든
// 라인이 동일 defined role 일 때만 phrase.role 부여). 기존 카탈로그는
// `scripts/migrate-phrase-role-from-lines.mjs` 로 back-fill — 14 refs /
// 130 phrases 에 phrase.role='refrain' 주입 (이전 phrase mode 렌더에서
// refrain markup 0건 emit 되던 회귀 해소). 영향 refs:
//   - Daniel 3:57-88, 56 (44 line.refrain → 38 phrase.refrain via
//     line-aggregation, uncovered=0)
//   - Daniel 3:52-57 (19 → 12, uncovered=0)
//   - Revelation 19:1-7 (12 → 8, 4 uncovered — conservative tie-break
//     으로 mixed-role phrase 제외 사례)
//   - Psalm 24:1-10 (6 → 6), 67:2-8 (4 → 4), 8:2-10 (6 → 6),
//     42:2-6 (4 → 4), 46:2-12 (6 → 6), 99:1-9 (3 → 3),
//     115:1-13 (3 → 3), 116:10-19 (2 → 2), 80:2-8,15-20 (9 → 9),
//     136:1-9 (9 → 9), 136:10-26 (20 → 20)
// 데이터 변경: psalter-texts.rich.json 의 `phrases[].role='refrain'`
// 필드만 추가 (line.role 은 unchanged, indent/lineRange unchanged).
// 색상 변화는 없음 — task #3 의 시편 본문 까만색 정책 (text-red-*
// 트리거 제거) 은 무손상으로 유지.
//
// CACHE_VERSION bump 사유 (defensive conservative): SW 의 navigate (HTML)
// fetch handler 는 `network-only` + offline fallback (lines 357-365 참고)
// 이므로 HTML byte 출력 변화는 v28 precache snapshot 과 직접 충돌하지
// 않는다 — PRECACHE_URLS 는 `['/offline.html', '/icon.svg']` 만 보유,
// rich.json 같은 server-side import 데이터는 SW 시야 밖. 본 bump 의
// 실질 효과는 정적 자산 (script/style/font/image) 캐시의 강제 재정렬 —
// 다음 사용자 방문 시 cache-first 정적 자산이 신선한 빌드의 chunk hash
// 와 다시 정렬됨. CACHE_VERSION bump 정확 criteria (정적 자산 경로/
// 내용 변경 / 프리캐시 대상 변경 / SW 로직 변경) 어느 것도 본 PR 이
// strict 하게 트리거하지는 않지만, JSON 데이터 변경이 SSR HTML 출력에
// 새 markup 130건을 추가하므로 connected-deploy 일관성을 위해
// conservative bump 채택 (v27/v26 같은 indent/PB 데이터 변경 시점의
// 운영 관행과 정합).
// v28 — #503: Phase 2 R-3 Sweep — 나머지 122 refs (시편 + 구약/신약
// 찬가) paragraphBoundaries 일괄 재추출. #501 Pilot 의 Python
// pdfplumber y-gap extractor (1.4× median threshold) 를 rich.json
// 의 전체 ref/stanza 그리드 (368 stanza blocks across 125 refs) 에
// 적용. Psalm 42:2-6 + Psalm 63:2-9 (#501 Pilot) 은 idempotent 재계산
// 으로 bit-identical 결과 (regression guard 통과).
// 적용 결과 — block-level delta:
//   - SAME / SAME_EMPTY:    7  (이전 결과 보존: 주로 Pilot 2 refs +
//                                F-X11 기 정확 매치)
//   - NEW_EMPTY:          205  (이전 PB 없음 + 새 mechanism 도 없음:
//                                naturally single-paragraph stanza)
//   - NEW_ADD / ADD:      123  (이전 PB 없었으나 PDF y-gap 으로 detect:
//                                대부분 시편 본문의 stanza-internal
//                                paragraph break — F-X11 text heuristic
//                                이 놓쳤던 자연 paragraph)
//   - REMOVE:              13  (F-X11 text heuristic 이 false-positive
//                                로 추가했던 break: Daniel 3:57-88
//                                refrain b0/b1/b10/b11, Revelation 19
//                                refrain b1/b2/b3, Daniel 3:52-57
//                                b0/b2-b6 — y-gap 으로 검증 시 모두
//                                refrain continuation 으로 정상 분류)
//   - DIFF:                19  (PB 수/위치 변화: 대부분 추가 detect.
//                                Psalm 8:2-10 / Psalm 86:1-17 등이
//                                기존 [3,24] → [3,10,13,17,21,24] 처럼
//                                자연 paragraph 풍부하게 인식)
//   - SKIP:                 1  (Psalm 31:1-17 b1: rich.json L0 에
//                                section-title 노이즈 "Шөнийн даатгал
//                                залбирал" 가 포함된 data-quality
//                                결함 — 별 task. 기존 PB=[] 보존)
// Total PB entries: 88 → 458 (+370). Refs with PB delta: 102.
// Pilot idempotency: Psalm 42:2-6 b0=[4,8,12] / b3=[3,7,11,15,19],
// Psalm 63:2-9 b0=[2,8] / b1=[6] — bit-identical to #501 commit
// 19fab90.
// Mechanism 변경사항 vs Pilot extractor:
//   1. `--column multi` 모드 추가 — 동일 page 의 left+right 두 column
//      을 동일 line stream 에 흘려 보내고, cross-column 인접 line gap
//      을 None 으로 처리 (cross-page 와 동일). 한 block 이 column 경계
//      를 가로지르는 케이스 (Daniel 3:57-88 의 invocation+refrain
//      pair 가 left col 1줄 / right col 5줄 로 펴진 형태) 지원.
//   2. Page-header / section-title 노이즈 필터 (`is_page_header_line`
//      port from scripts/dev/page-header-filter.mjs) — 다른 column /
//      page 로 walk 시 running header ("Ням гарагийн өглөө 61" 류)
//      가 line stream 에 끼어들어 매칭 실패하던 root cause.
//   3. Whitespace-stripped equality (3rd tier in `line_matches` +
//      `try_wrap_bridge`) — pdfplumber 가 char spacing drift 로 인접
//      단어 사이 공백을 누락 (예 PDF "хийгээдсүр" vs rich
//      "хийгээд сүр") 시 fallback 매칭.
//   4. Reverse-bridge walker (`try_reverse_bridge`) — rich.json 이
//      1 visual PDF line 을 2~4 logical lines 로 split 한 케이스
//      (Revelation 4:11 b1 L14+L15 "Алдар ба" + "магтаалыг…",
//      Revelation 11 b0 L12+L13 "Эдүгээ… ялалт," + "ид чадал,")
//      를 1 PDF line 으로 absorb 후 consumption=0 으로 표기, gap=0
//      으로 처리 (paragraph break 미발생).
// 데이터 변경: rich.json paragraphBoundaries 만 변경, phrases /
// lines / indent 는 보존. Driver 는
// `scripts/dev/sweep-paragraphs-into-rich.mjs` (atomic 367-block
// inject). HTML byte 출력 (paragraph mt-3 위치 변경) 이 변하므로
// v27 precache snapshot 과 어긋날 수 있어 bump. v27 잔존 시 신규
// 자연 paragraph 분할이 노출되지 않음.
// v27 — #502: 시편/찬가 본문 왼쪽 여백 통일. Renderer 의 phrase.indent
// / line.indent 의 영향 제거 (모두 indent=0 = `pl-6 -indent-6` 레벨로
// 통일, hanging indent 는 wrap continuation 의 시각 구분 보존 위해
// 유지). 사용자 SoT — Psalm 63 b0 의 line 0-1 (indent=0) vs 2-12
// (indent=1) 의 들여쓰기 차이가 "갑자기 왼쪽 여백이 넓어지는" 효과
// 를 일으킴 → 가장 작은 들여쓰기 (현재 indent=0 = pl-6) 로 통일.
// 영향 범위:
//   - Phrase mode (block.phrases): pl-12 / pl-18 → pl-6 (indent 1/2)
//   - Legacy line mode (line.indent): pl-6 / pl-12 → '' (indent 1/2)
//   - Plain stanzas mode (leading-whitespace encoding): pl-6 / pl-12
//     → '' (level 1/2; leading whitespace 는 strip 유지)
// 데이터 (rich.json phrase.indent / line.indent) 는 변경하지 않음 —
// PDF SoT 보존, renderer 단에서만 무시. HTML className 변경 → v26
// precache snapshot 과 어긋날 수 있어 bump. v26 잔존 시 구 indent
// 분기 className 이 노출되어 사용자 issue 가 재현됨.
// v26 — #501: Phase 2 R-2 Pilot — paragraph extractor (Python pdfplumber +
// y-gap heuristic 1.4× median) 도입. PDF page-physical y-coordinate 측정
// 으로 stanza-internal 의 line-spacing baseline (median) 대비 ≥1.4× 인
// 위치를 paragraph 로 분류. Pilot 범위: Psalm 63:2-9 + Psalm 42:2-6 의
// 6 stanza blocks (PB-applicable 4 + refrain-empty 2).
//   - Psalm 63:2-9 b0: PB [8] → [2, 8]  (text-based old missed v3 paragraph
//                                         "Тэнгэрбурхан, Та миний…" — diff
//                                         vs F-X11 text heuristic surfaced
//                                         R-1 hypothesis)
//   - Psalm 63:2-9 b1: PB ∅ → [6]        (new paragraph at "Шөнөжин Таны…")
//   - Psalm 42:2-6 b0: PB ∅ → [4, 8, 12] (R-1 PoC consistent: PDF body
//                                         idx 4/8/13 maps to rich idx
//                                         4/8/12 after 1 wrap-join collapse)
//   - Psalm 42:2-6 b1 / b2: PB ∅          (6-line + 4-line refrains; gap
//                                         analysis finds no within-block
//                                         paragraph — expected)
//   - Psalm 42:2-6 b3: PB ∅ → [3, 7, 11, 15, 19]  (5 paragraphs across 20
//                                                  rich lines, 1 wrap-join)
// Mechanism (scripts/lib/extract-paragraphs-from-pdf.py): pdfplumber.chars
// → top-cluster lines → column filter (x0 < 297) → walk per-block lines
// with wrap-tolerant bridge (strict-eq first, then 12-char prefix +
// length fence) → gap = first_top[i] - last_top[i-1] (bottom-to-top
// across wrap-joined lines so the bridge does not inflate gaps by one
// line-spacing per wrap depth) → median across non-null gaps → classify
// (paragraph if gap ≥ 1.4 × median, stanza-break warning if gap ≥ 1.95 ×
// median).
// Node bridge (scripts/build-paragraphs-into-rich.mjs) child_process
// spawns the Python extractor per-block, parses JSON, replaces rich.json
// stanza block's paragraphBoundaries (or removes when extractor finds
// none). Pilot manifest enumerates the 6 blocks; sweep over remaining
// 122 refs follows in a separate task.
// HTML byte 출력 (paragraph 분할 위치 변경 → multi-line phrase mt-3
// boundary 변동) 변경 → v25 precache snapshot 과 어긋날 수 있어 bump.
// v25 잔존 시 Psalm 63 b0 의 첫 paragraph 분할이 누락된 구 렌더가 노출.
// v25 — #499: Phase 1 Sweep — phrase grouping rebuild 122 refs (제외
// Psalm 63/42). #498 pilot 결과를 사용자가 화면 검증 OK 후, 나머지
// 122 refs (시편 + 구약/신약 찬가 본문) 에 동일한 키릴 대문자 시작 규칙을
// 일괄 적용. 처리 범위 = 121 refs touched (out of 125 stanza-block refs):
//   - 121 refs 가 이전부터 phrases 보유 (F-X11 cohort PASS subset)
//   - 4 refs (Psalm 88:2-10 / Psalm 118:1-16 / Psalm 31:1-17 / Isaiah
//     61:10-62:5) 는 phrases 가 존재하지 않아 SKIP — 이전과 같이 legacy
//     line-render 유지 (별도 inject task 에서 처리 예정)
// Total phrase 집계: 3057 → 3133 (+76); 355 multi-line phrase 신규;
// 46 zero-delta refs (all-capital 라인 — 변동 없음).
// Outlier (사용자 spot-check 권고, 모두 narrator + quoted response/speech
// 의 mechanical merge 결과로 규칙대로의 출력):
//   - Revelation 19:1-7  25 → 17 phrases ('(Х. Аллэлуяа!)' response 가
//     paren 으로 시작 → 직전 narrator 라인의 continuation 으로 merge)
//   - Psalm 87:1-7       18 → 12 phrases (smart-quote 시작 quoted speech
//     dialog 라인 다수 → narrator phrase 와 merge)
// Pilot 재적용 idempotency 확인됨: Psalm 63:2-9 + Psalm 42:2-6 의 sweep
// 후 stanzasRich 가 #498 commit 806d8e7 의 결과와 bit-identical.
// HTML byte 출력 (phrase span 그룹화) 변경 → v24 precache snapshot 과
// 어긋날 수 있어 bump. 다른 정적 자산은 변동 없음.
// v24 — #498: Phase 1 Pilot — phrase grouping rebuild (Psalm 63 + Psalm
// 42 only). 키릴 대문자 시작 = 새 phrase 시작 규칙으로 multi-line phrase
// 묶음 (Cyrillic-capital-start rule). The rich.json `phrases` arrays for
// `Psalm 63:2-9` block 1 and `Psalm 42:2-6` blocks 0/3 collapse adjacent
// wrap-continuation lines (smart-quote dialogue prefix, lowercase
// continuation) into single multi-line PhraseGroups:
//   - Psalm 63:2-9 b1: 13 → 12 phrases  (L4-L5 merge: 'Ам минь
//     баясгалант уруулаар магтаалуудыг' + 'өргөнө.')
//   - Psalm 42:2-6 b0: 19 → 18 phrases  (L8-L9 merge: 'Хүмүүс надад'
//     + '"Чиний Тэнгэрбурхан хаана байна?"…')
//   - Psalm 42:2-6 b3: 20 → 18 phrases  (L11-L12 + L17-L18 merges:
//     both quote-prefixed continuation lines)
// `lines[]` text + `paragraphBoundaries` UNCHANGED — only the phrase
// grouping. Other 122 refs of psalter-texts.rich.json are NOT touched
// in this pilot (sweep follows post-user-validation).
// HTML byte 출력 (phrase span 그룹화) 변경 → v23 precache snapshot 과
// 어긋날 수 있어 bump. 다른 정적 자산은 변동 없음.
// v23 — #496: F-X11 Phase 2-K — Eph 1:3-10 b1 restructure (Col 1
// leakage 제거, F-X11 100% closure). #495 batch review 가 발견한
// MAJOR data-quality 회귀 fix:
//   b1 lines 4-7 (4 lines) 가 Colossians 1:12-13 본문이었음 —
//   초기 데이터 입력 시 인접 reading (Colossians 1:9b-13) 의 본문이
//   잘못 끼어든 leakage. 사용자 가시화면에 "Эцэгт талархал өргөөсэй
//   хэмээн хүсэж байна. / Тэр биднийг харанхуйн эрх мэдлээс
//   авраад, хайрт / Хүүгийнхээ хаанчлалд шилжүүлсэн юм." 등 Col 1
//   text 가 Eph 1 canticle 자리에 표시되던 회귀.
//   Fix: rich.json b1 L4-L7 (Col 1 leakage 4 lines) 제거 — b1 = 4
//   lines 로 축소 (PDF :2836-2839 verbatim 만 유지). 동시에 plain
//   catalog (psalter-texts.json) 의 동일 leakage 제거 — stanza 1
//   L3 의 concatenated 'Хишиг ивээлээ бидэнд хүртээсэн билээ.
//   өвийг хуваалцахад...' 를 'Хишиг ивээлээ бидэнд хүртээсэн
//   билээ.' 만 유지 + L4-L6 (Col 1 leakage 3 lines) 제거. SSOT
//   양쪽 동시 정정.
//   Inject delta: 3 stanza blocks (b0/b1/b2) phrases inject (0 PB —
//   single-paragraph stanzas).
//   Phase 2-K Post-fix dryrun: PASS 124 / DRIFT 0 ← F-X11 100%
//   closure (Eph 1 newly-PASS, 1 잔여 → 0). HTML byte 출력 (b1 4
//   lines 제거 + phrase 단위 indent) 변경 → v22 precache snapshot
//   과 어긋날 수 있어 bump.
// v22 — #494: F-X11 Phase 2-J — 4 refs phrases inject post-splitter-fix.
// #492 (Phase 2-I1b) pdftotext-column-splitter right-column-bleed fix
// 후, batch dryrun 의 verdict 가 변경된 4 refs 를 일괄 inject:
//   - Psalm 96:1-13       (newly-PASS, 2 stanzas / 27 phrases first inject)
//   - Psalm 42:2-6        (newly-PASS, 4 stanzas / 49 phrases first inject)
//   - Jeremiah 31:10-14   (collateral re-inject; phrases bit-identical
//                          to #490 post-typo-fix state — splitter fix
//                          had 0 effect on this ref's alignment)
//   - Psalm 144:11-15     (collateral re-inject; phrases bit-identical
//                          to #489 post-pageMap-fix state — splitter fix
//                          had 0 effect on this ref's alignment)
// Idempotency check (4 refs pre-J vs post-J JSON 비교):
//   Jer 31 / Ps 144:11 → IDENTICAL (splitter fix delta = 0 on these refs)
//   Psalm 96 / Psalm 42 → CHANGED (newly-injected, was empty)
// Post-J dryrun: PASS 123 (was 121, +2 newly-PASS) / DRIFT 1 (Eph 1 만,
// structural DEFER per #488 pushback). HTML byte 출력 (paragraph 분할
// + phrase 단위 indent) 변경 → v21 precache snapshot 과 어긋날 수 있어
// bump.
// v21 — #491+#493: Jer 14 + Exod 15 typography fix cohort (Phase 2-I1a +
// 2-I1a.5). #488 pushback (matcher cross-stanza 보강 → typography
// drift) 후 dev 가 typo + b3 unmask 처리.
// v20 — #489: F-X11 Phase 2-I2 pageMap fix Psalm 144:11-15 (#451 mirror).
//   page 483 → 481 정정 + phrases re-align inject.
// v19 — #490: F-X11 Phase 2-I3 Jeremiah 31:10-14 b1 typo fix + inject.
// b1 line 4 'Тэд иржу,' → 'Тэд ирж,' (extra 'у' 제거, PDF 4200 SoT)
// + b1 line 7 'улмаас баярлатгэнэ.' → 'улмаас гэрэлтэнэ.' (transcription
// 오류 — non-existent word → "shines/glows", PDF 4203 SoT). 두 typo 가
// matcher 의 12-char prefix tolerance 를 초과하여 alignAtProbe 가 b1
// L3 에서 stop 시켜 ext=3 reported (rich=9). 정정 후 b1 9 lines 가
// PDF 4197-4205 9 lines 와 정합되어 PASS. 동시에 plain catalog
// (psalter-texts.json) 의 동일 typo 2건도 정정 (rich.json 와 SSOT
// 일관성). Inject delta: 3 stanza blocks (b0/b1/b2) 에 phrases inject
// (16 phrases / 0 PB — natural single-paragraph stanzas).
// HTML byte 출력 (b1 line text 2자 변경 + phrase 단위 indent) 이
// 변하므로 v18 precache snapshot 과 어긋날 수 있어 bump. v18 잔존
// 시 'иржу'/'баярлатгэнэ' 오자가 그대로 노출됨.
// v18 — #485: F-X11 Phase 2-H. G4 depth-progression escalate (#481) 가
// process-fx11-phase2-batch.mjs depth predicate 변경으로 collateral
// newly-PASS 가 된 6 refs (1 Samuel 2:1-10, Daniel 3:57-88, 56,
// Daniel 3:26-27, 29, 34-41, Isaiah 38:10-14, 17-20, Colossians
// 1:12-20, Psalm 51:3-19) 의 paragraphBoundaries + phrases 를
// 처음으로 inject. 모두 page-bridge mechanism (forward gather depth
// 5+ 로 다음 PDF 페이지의 stanza 까지 매칭) 으로 align (#483 review
// 6/6 LEGITIMATE 검증). Total: 52 stanza blocks 에 241 phrases +
// 4 paragraphBoundaries (Daniel 3:57-88, 56 b3 의 refrain-style PB
// 만 비-empty). HTML byte 출력 (paragraph 분할 + phrase 단위
// indent + hanging-indent wrap continuation) 이 변하므로 v17
// precache snapshot 과 어긋날 수 있어 bump.
// v17 — #482: F-X11 Phase 2-G1.5 Wisdom 9 b4/b5 unmask typo fix
// (post-G1 propagation). G1 (#480) 이 b1/b3 typo fix 후 b4/b5 가
// 노출된 mask-shift 로 추가 typo 발견. PDF SoT 정정 (singular ↔
// plural 어형 + 어간 정정).
// v16 — #480: F-X11 Phase 2-G1 CAT-T1 typo fix. Wisdom 9:1-6, 9-11
// + Psalm 135:1-12 의 4 typo (PDF parsed_data 정정). DRIFT 잔여
// ~10 refs G-band fix 의 첫 단추.
// v15 — #476 + #477 통합 bump (CACHE conflict resolution).
//
// #477: F-X11 Phase 2-F builder propagation guard + 29 SAFE refs
// reinject. Phase 2-D (#463) 의 phrase.indent ← line.indent
// propagation 이 의도적 non-zero phrase.indent (Pattern B Roman
// 'I'/'II' centered marker / Pattern C 짧은 hanging-indent wrap-
// continuation) 까지 silently flatten 시키던 #475 audit MAJOR-2
// (39 refs / 331 mismatches) 결함의 build-side fix. skip-if-explicit
// guard (phrase.indent !== 0 && phrase.indent !== uniformLineIndent
// → preserve, do NOT propagate) 추가 후 audit GO_WITH_CAVEAT 의
// 29 SAFE refs (Pattern A only — Isaiah 26:1-6, Psalm 98:1-9 등)
// 에 한해 reinject, 10 EXCLUDE refs (Pattern B/C contamination —
// Psalm 49/145/45/62/139/27/132/72/136 + Revelation 15:3-4) 는
// --only allow-list 에서 의도적으로 제외. 28 SAFE refs 의
// phrase.indent 가 0 → 1 로 정정.
//
// #476: 1 Samuel 2:1-10 추가 typo fix (b4/b5/b6, PDF SoT 정정).
//   - b4 line 4: 'Дордруулдаг' → 'Дордуулдаг' (extra р 제거, PDF :7803)
//   - b5 line 1: 'үнс хогноос өргөмждөө' → 'үнс хогноос өргөхдөө' (PDF :7805)
//   - b6 line 2: 'Гагц гүүнийхээ дээр' → 'Гагц үүнийхээ дээр' (PDF :7825)
//
// 두 commit 모두 HTML byte 출력 변경 → v13 precache snapshot 과
// 어긋날 수 있어 v15 으로 한 번에 bump. v14 으로 각각 bump 시도가
// 동일 line 충돌 → manual resolve 로 v15 통합.
// v13 — #473: 1 Samuel 2:1-10 b2 typo fix (PDF SoT 정정). rich.json
// 한 line text 변경 (`Хамаг үйлсийг dэнслэгч` → `Хамаг үйлийг
// дэнслэгч` — singular accusative 'үйлийг' per PDF parsed_data
// /full_pdf.txt:7791). NFR-002 PDF verbatim 정책 엄격 적용 (user
// 결정). HTML byte 출력 (시편 본문 한 줄 문자) 이 바뀌므로 v12
// precache snapshot 과 어긋날 수 있어 bump. v12 잔존 시 구
// 'үйлсийг' 텍스트가 그대로 노출됨.
// v12 — #472: F-X11 Phase 2-E 4 typography drift typo fix (Psalm
// 100 b1 'тулгар' → 'тулгуур', Psalm 110 b3 'хлжэрээгүйг' →
// 'хижрээгүйг', Psalm 116:10-19 b3 'дээдэлэн' → 'дээдлэн',
// Tobit 13:1-8 b3 'буулга' → 'буулгаа') + Isaiah 33:13-16 PB
// inject. HTML byte 출력 (시편 본문 4 line text + Isaiah 33 PB)
// 이 바뀌므로 v11 precache snapshot 과 어긋날 수 있어 bump.
// v11 — #463: F-X11 Phase 2-D 데이터 변경 반영. translatePhrases() lineRange
// dedup pass 추가 (Psalm 16:1-6 b0 / Psalm 137:1-6 b1 의 NFR-009j 0-OVERLAP
// 회귀 fix — 두 phrase 가 같은 [k,k] 로 collapse 되어 화면에 같은 line 2회
// 렌더되던 결함) + 빌더의 phrase.indent 가 rich line.indent 를 채택하도록
// propagation 추가 (Psalm 30:2-13 b0/b2/b4 antiphon block 의 indent flatten
// fix). 추가로 #456 WI-A2-2 reverse-bridge matcher 로 newly-PASS 가 된
// 3 refs (Revelation 4:11; 5:9-10, 12 b1, Revelation 11:17-18; 12:10b-12a b0,
// Psalm 65:2-9 b0) 도 처음으로 phrases inject. 총 6 refs delta. HTML byte
// 출력 (phrase 단위 indent + 중복 line 제거) 이 바뀌므로 v10 precache
// snapshot 과 어긋날 수 있어 bump. v10 잔존 시 Psalm 16/137 의 중복
// 렌더링 버그가 그대로 노출됨.
// v10 — #453: F-X11 Phase 2-C 데이터 변경 반영. #452 matcher-side wrap-
// tolerant 비교 도입으로 6 refs (Psalm 16/21/30/119:105-112/137/144:1-10)
// 가 DRIFT_LINE_COUNT → PASS 전환, paragraphBoundaries + phrases 신규
// inject. Psalm 21:2-8, 14 block 0 PB=[8] (송영 구분), 그 외 5 refs 는
// phrases-only (PB 빈 배열, line-level grouping 만 추가). 추가로 Isaiah
// 61:10-62:5, Psalm 88:2-10 (newly-PASS, 미주입 잔여) 도 phrases inject.
// HTML byte 출력 (phrase 단위 wrap 적용) 이 바뀌므로 v9 precache snapshot
// 과 어긋날 수 있어 bump. v9 잔존 시 신규 phrase wrap 미적용 위험.
// v9 — #443: F-X11 Phase 2-B 데이터 변경 반영. 새 detectRefrains
// 일반화 heuristic (3+/4-line refrain 지원) 으로 124 refs 재추출,
// Psalm 24:1-10 + Daniel 3:52-57 multi-line refrain paragraphBoundaries
// 신규 detect, Psalm 46/80/8 hotfix SSOT consolidation. HTML byte
// 출력 (paragraph 분할 단위) 이 변하므로 v8 precache snapshot 과
// 어긋날 수 있어 bump. v8 잔존 시 깨진 paragraph 렌더링 노출 위험.
// v8 — #410: F-X9/X10/X12 fix cohort. psalter-headers data 재생성 (77
// entries, 시편 제목/성경구절 prefix/suffix 노이즈 제거), psalter-texts
// 119 refs +660 LOC re-injection (PDF 들여쓰기 wrap continuation 정상
// 분류), intercessions-section.tsx renderer (응답구절 italic 헤리스틱).
// HTML byte 출력이 변하므로 v7 precache snapshot 과 어긋날 수 있어 bump.
// v7 — #361: hour-card-list 의 라벨 옆 `→` 화살표를 모바일에서 숨김
// (`hidden md:inline` + aria-hidden). HTML byte 출력 (className 문자열 +
// span 가시성) 이 바뀌므로 v6 precache snapshot 과 어긋날 수 있어 bump.
// v6 — #360: mobile horizontal padding reduced (`px-4` → `px-2`) on all
// main page containers (pray/home/guide/ordinarium/settings + loadings).
// HTML byte output changes (className string), so existing precache
// snapshots could mismatch; bumping forces `activate` to evict v5 caches.
// v5 — FR-NEW #230 (F-X5): new routes `/pray/[date]/firstVespers` and
// `/pray/[date]/firstCompline` introduced; bumping invalidates the prior
// HTML/asset cache so existing PWA installs do NOT serve a 404 from
// stale `network-only` HTML or stale precache. See CLAUDE.md
// "Service Worker 캐시 — 배포 회귀 1순위 리스크".
const CACHE_VERSION = 'divine-office-v29'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [OFFLINE_URL, '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-only for HTML: Vercel already sends no-store headers, and
    // caching the response here caused stale markup to be served for users
    // whose PageRef links were still pointing at the old external PDF href.
    // Fall back to the offline page only when the network is unreachable.
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  const destination = request.destination
  if (
    destination === 'script' ||
    destination === 'style' ||
    destination === 'font' ||
    destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches
                .open(CACHE_VERSION)
                .then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
