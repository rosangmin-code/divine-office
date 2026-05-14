# Handoff — 2026-05-14 Leader Compact

## TL;DR

이번 세션 (2026-05-14) UI/렌더 개선 4 GOAL 완료 + push. main HEAD `b5f6bde` (origin/main 동기화 완료, Vercel 자동 배포 트리거됨). 사용자 directive 4건 모두 land:
- **#1** 시편 본문 refrain 빨간색 제거 (FR-153f / FR-160 정책 정정)
- **#5** phrase-injection 파이프라인 line.role → phrase.role 전파 + ROLE_UNIFORMITY verifier
- **#6** 첫 화면 전례력 리스트 (FR-145, image.png 형식 + IntersectionObserver 무한 스크롤 + 인라인 hour cards)
- **#10** 풋터 클릭 토글 (FR-162, default collapsed + chevron + ARIA)

leader ctx ~430k+ 무거워 컴팩트.

## main HEAD progression (이번 세션, 13 commits)

```
c368e11 (이전 세션 핸드오프 baseline, 2026-05-12)
  ↓
8d69947  fix(psalter+sw): #3 시편 refrain 빨간색 제거 + 테스트/PRD 동기화
ff92328  fix(test): #3 iter 2 — Daniel 3 count test fixme + follow-up task #4
7fbdf41  Merge 3-dvo-dev-cl (WI: 3) — sw v28
e6e2bbf  fix(phrase-builder+sw): #4 line.role → phrase.role propagation
e6f750a  fix(verify+sw+test): #4 iter 2 — 3 reviewer findings + ROLE_UNIFORMITY
22195f6  Merge 4-dvo-dev-cl (WI: 4) — sw v29
b9fd909  feat(ui): #11 FR-162 — footer 클릭 토글
d18bd87  fix(ui): #11 iter 2 — focus-visible ring (gold)
275ecd3  Merge 11-dvo-ref (WI: 11)
42e6b77  feat(home+calendar): #8 FR-145 — 첫 화면 전례력 리스트 (P1+P2+P4+P5)
b6a9c99  fix(home+calendar): #8 iter 2 — 6 reviewer findings (2 major + 4 minor/nit)
b4b4225  Merge 8-dvo-dev-cl (WI: 8) — sw v30
b5f6bde  test(e2e+unit): #9 sequential merge — 3 of 4 #9 test specs (cherry-pick)
[현재 main HEAD = b5f6bde, origin/main 동기화 완료]
```

## In-flight / Pending

### In-flight (멤버 작업 중)
- 없음. 모든 활성 dispatch 완료 + 머지.

### Pending dispatch (새 leader)
- 사용자 신규 GOAL 등록 시 시작. 현재 backlog 없음.

### Deferred (식별만, 별도 GOAL 등록 시 dispatch)
- **Movable solemnity nameMn fallback** (Ascension/Pentecost/Trinity Sun): 첫 화면 list에서 정식 Mongolian 명 ("Эзэний Тэнгэрт Дээш Гарсан их баярын өдөр") 미노출, weekday fallback ("Дээгүүр өнгөрөх цаг улирлын 6-р долоо хоног") 표기. **회귀 아님** — 이전 single-day 카드도 동일 동작. RED accent + Ascension hour cards 진입은 정상. 권고: `src/lib/calendar.ts` sanctoral lookup을 movable feast (`propers/easter.json`의 `ascension`/`pentecost` 등 special key)로 확장. dvo-rev-cl iter 2 합의 deferred.
- **#9 superseded calendar-list.test.ts** (13 it.todo placeholders): #8 sequential merge 시 cherry-pick에서 skip됨. #8의 16 active cases가 superseded. 후속 작업 불필요.
- **마티아 사도 5/14 PDF 부재**: 사용자 결정 #2 "PDF-authored only" 정책상 추가 안 함. 일반 로마 전례력 사도 grade이지만 본 PDF는 selective coverage. 사용자가 정책 변경 시 sanctoral catalog (commune of apostles fallback 또는 explicit entry) 추가 가능.

## 사용자 결정 (이번 세션 land — 후속 GOAL 시 참고)

### GOAL #6 (전례력 첫 화면) 7개 결정 — `docs/PRD.md §15`에 verbatim 기록
1. **Calendar authority**: General Roman, no transfer (Ascension Thursday)
2. **Data source**: PDF-authored only — 마티아 등 미포함 항목 추가 안 함
3. **Auto default**: romcal pick — 'Today (Автомат)'
4. **List window**: 무한 스크롤 (오늘 중심) + 인라인 hour cards 펼침
5. **Pre-empted feasts**: PDF 데이터 없으면 미노출
6. **색상**: src/lib/mappings.ts liturgical RED 룰 (SOLEMNITY/FEAST 한정)
7. **Missing propers**: 데이터 없으면 옵션 미노출

### GOAL #1 (시편 refrain 색상) — FR-153f 정책 reverse
- 사용자 directive: "시편 본문에서는 모두 까만 글씨로 들어가야 해"
- FR-160/FR-161 refrain=빨간색 정책 reverse → refrain 포함 본문 까만색 통일
- data-role 메타데이터는 보존 (구조 식별 + e2e selector)

### GOAL #10 (풋터 토글)
- default collapsed (chevron만), 1번째 클릭 expand, 2번째 클릭 collapse (옵션 B 채택)

## SW 캐시 영향 (3단계 bump)
- v27 → **v28** (#3 색상 정책 + 정적 자산 변경)
- v28 → **v29** (#4 phrase-builder + 카탈로그 재생성)
- v29 → **v30** (#8 클라이언트 컴포넌트 chunk + server action endpoint + ?date/celebration 쿼리 의미 확장)

3단계 점프이므로 **iOS Safari 이전 캐시 / A2HS PWA 업그레이드 / Slow 3G** 시나리오는 사용자 실기기 검증 필요 (CLAUDE.md "테스트가 못 잡는 것들" 영역).

## Pair-mode iteration log

| WI | Author | Reviewer | Iter | Verdict | 주요 해소 |
|---|---|---|---|---|---|
| #3 | dvo-dev-cl | dvo-rev-cl | 2 | PASS | iter 1 Daniel 3 inconsistent weakening + 데이터 사실 오류 |
| #4 | dvo-dev-cl | dvo-rev-cl | 2 | PASS | iter 1 AC3 verifier defer + SW v29 rationale 부정확 + Daniel 3 코멘트 |
| #11 | dvo-ref | dvo-review | 2 | PASS | iter 1 a11y focus-visible 누락 (WCAG 2.4.7) → gold ring 보완 |
| #8 | dvo-dev-cl | dvo-rev-cl | 2 | PASS | iter 1 6 findings (auto-scroll initialDate / today collision / HTML5 ul>span>li / clampOffset / refProp / boundary) |

평균 iter = 2.0. 모두 max=3 미만 1회 iter로 PASS 도달. pair-mode + WI-105 HEAD-SHA cross-check 모두 작동.

## Auto-clear standing rule
- `dvo: enabled: true, cooldown_min: 15` 활성 (사용자 2회 enable, last_run_at는 세션 종료 시점 기록).
- 이번 세션 fire 횟수: 6+ (initial scan 1 + completion_report trigger 5+).
- 다음 세션 인계 시 자동 적용 — 새 leader가 첫 completion_report 받을 때 cooldown 체크 후 자동 clear.

## Member 상태 (세션 종료 시점)
- **CONNECTED 8**: dvo_LEADER, dvo-dev-cl, dvo-dev-co, dvo-plan, dvo-plan-cl, dvo-ref, dvo-rev-cl, dvo-review, dvo-test
- **OFFLINE 2**: dvo-rev-co (process dead 미복귀), dvo-res (clear 후 dead 상태)
- 신규 합류 (2026-05-14): dvo-plan-cl (claude planner, 사용자가 추가)
- 모두 idle (세션 종료 시점)

## 사용자 실기기 확인 권장 (push 후, Playwright 못 잡음)
- [ ] iOS Safari에서 이전 캐시 상태로 첫 화면 진입 (sw v27→v30 점프, 3단계)
- [ ] A2HS PWA 재실행 → 새 calendar list로 정상 전환
- [ ] Slow 3G에서 무한 스크롤 + IntersectionObserver server action 동작
- [ ] 풋터 토글 + back link `?date=&celebration=` selection 보존

## 환경 / 작업 환경 메모
- main HEAD: `b5f6bde` (origin/main과 동기화)
- 작업 트리: clean (CLAUDE.md M, image.png ?? 는 사용자 작업 영역 — 무시 가능)
- worktree: 모두 cleanup됨 (#3, #4, #8, #9, #11)
- 원격 브랜치: 13 commits push 완료
