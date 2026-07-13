# 버그 리포트: Codex a2a route DEAD와 reviewer active-slot 대기로 인한 팀 교착

- **작성일**: 2026-07-13
- **팀/세션**: dvo / divineoffice
- **영향 범위**: Codex author → leader/reviewer 준비 신호, pair reviewer active queue, 후속 review task 101/102
- **심각도**: HIGH (완료된 구현 2건이 약 85분 동안 리뷰에 진입하지 못하고 팀 리뷰 큐 전체를 막음)
- **현재 판정**: **a2a route DEAD로 author-ready 신호가 유실되고, HEAD 대기 중인 `pair_reviewer_assigned`가 reviewer active slot을 점유해 후속 리뷰까지 막은 복합 교착**

## 요약

2026-07-13 UTC 기준, `wi-83-001`과 `wi-90-004`의 author는 각각 clean commit
`80b512c`와 `38bf445`를 만든 뒤 pair verdict를 기다리고 있었다. 그러나 author가 보낸
“ready for review / HEAD” a2a 신호가 leader/reviewer 흐름에 도달하지 않았다. 진단 시점의
fresh census는 여섯 Codex member route를 다음과 같이 판정했다.

```text
a2a_route_dead=true
reason="hub invalidated on dropped wake"
```

동시에 reviewer `dvo-rev2-co`와 `dvo-rev-co`는 각각 `wi-83-001`, `wi-90-004`의
`pair_reviewer_assigned`를 active slot에 둔 채 author HEAD를 기다렸다. 이 때문에 별도로
dispatch된 review task 102와 101은 `MEMBER_BUSY`로 promote되지 못했다. 즉 신호 한 건의
유실이 단일 리뷰 지연에 그치지 않고 reviewer queue 전체를 막는 교착으로 증폭됐다.

03:43~03:45에 leader가 commit/clean-tree 상태를 직접 확인하고 durable `member-msg`로 HEAD를
relay한 뒤 `pair:msg` wake를 보냈다. 두 reviewer는 relay를 수신했다고 ack했고 즉시 review를
재개했다. `dvo-rev-co`는 03:47:36에 `wi-90-004` PASS를, `dvo-rev2-co`는 03:48:13에
`wi-83-001` FAIL(실제 데이터 결함 발견)을 제출했다. 이는 reviewer 프로세스나 worktree가
고장 난 것이 아니라 **준비 신호 전달과 slot 상태 결합**이 정지 원인이었음을 입증한다.

## 사용자 영향

- 두 author는 구현과 commit을 끝냈지만 “Standing by” 상태에서 약 85분 동안 진전이 없었다.
- 두 reviewer는 실제로 실행 중이었지만 HEAD 입력을 기다리는 active pair slot 때문에 새 review
  task 101/102를 처리할 수 없었다.
- leader 관점에서는 02:16 이후 inbound a2a가 완전히 끊겼고, durable inbox도 02:17:49 이후
  03:43 relay까지 새 이벤트가 없었다.
- tmux member session은 살아 있었고 worktree도 clean했으므로, 일반 liveness/프로세스 감시만으로는
  이 “살아 있지만 진행 불가” 상태를 구분할 수 없었다.

## 타임라인 (UTC)

| 시각 | 사건 | 증거 / 해석 |
|---|---|---|
| 01:14~01:15 | `wi-83-001`, `wi-83-002` dispatch. author wake 확인 실패(`queue_hold`), 당시 send-keys fallback OFF | `channel.jsonl`은 01:15:37 `codex_wake_dropped ... route_dead`; a2a audit는 `wi-83-001` wake를 `dead-route-loss`로 기록. leader가 fallback과 `member-trigger-claim`을 사용했을 때 claim 자체는 이미 반영돼 있었음 |
| 01:23~01:38 | `wi-83-002`는 2회 pair cycle을 정상 완료 | 이 구간에는 `dvo-dev-co` → leader inbound a2a가 실제로 작동. route 장애가 세션 전체에서 처음부터 영구 고정된 것이 아니라 중간에 악화됐음을 보여 줌 |
| 02:04 | leader session 기준 `wi-90-004` dispatch/work 시작 | durable inbox의 `task_dispatch` timestamp는 02:12:56으로 남아 있어 관찰 시각과 SSOT 기록 사이 8분 56초 차이가 있음 |
| 02:14 | review 101 → `dvo-rev-co` | 이미 active인 `wi-90-004` reviewer slot 뒤에 대기 |
| 02:16 | 마지막 inbound a2a (`dvo-plan-co` reply) | 이후 약 85분 동안 inbound a2a 완전 침묵 |
| 02:17 | review 102 → `dvo-rev2-co` | 이미 active인 `wi-83-001` reviewer slot 뒤에 대기. durable inbox 마지막 이벤트는 02:17:49 |
| 03:41:50 | leader 진단 | 두 worktree에는 완료 commit이 있고 clean. authors는 verdict 대기, reviewers는 HEAD 대기. tmux sessions는 살아 있음 |
| 03:43:40~03:44:29 | leader가 durable `member-msg` + `pair:msg`로 HEAD relay | `wi-83-001@80b512c...`, `wi-90-004@38bf445...`를 reviewer에게 전달 |
| 03:44:49 | `dvo-rev2-co` ack | a2a ack `019f5993da76-2e4fe0879addcdc6`: relay 수신, review 재개 |
| 03:45:41 | `dvo-rev-co` ack | a2a ack `019f5994a66c-a212ff75903c4e4e`: relay 수신, HEAD 검증 후 review 재개 |
| 03:47:36 | `wi-90-004` PASS verdict | leader relay 뒤 실제 review가 완료됨 |
| 03:48:13 | `wi-83-001` FAIL verdict | reviewer가 4-week sweep 누락을 실제로 발견. relay가 단순 slot close가 아니라 정상 review 실행을 복구했음을 입증 |

## 로그 증거

### 1. 진단 시각

출처: `stall-now.txt`

```text
2026-07-13T03:41:50Z
```

### 2. 두 worktree는 이미 commit 완료 + clean

출처: `stall-worktrees.txt`

```text
=== wi-83-001-dvo-dev2-co log+status ===
80b512c fix: WI-wi-83-001 correct gospel canticle antiphon data
dd78148 chore: psalter-prayers-rich-failures.md 검증 산출물 갱신
6322f29 docs: a2a 버그 리포트 2건 추가 (leader route 미등록 / self-send 미소비)
ok=== wi-90-004-dvo-ref-co log+status ===
38bf445 fix: WI-wi-90-004 unify app font family
0a98c22 docs: g-49 폰트 사용 전수 감사 리포트 (WI 100, dvo-res)
4d916fc fix: WI-wi-83-002 align psalter reading type
ok
```

`ok`는 각 `git status --porcelain` 결과가 비어 있음을 표시한다. 즉 author가 수정 중이거나
미commit 상태라서 reviewer가 기다린 것이 아니다.

### 3. author는 verdict를, reviewer는 HEAD를 기다림

출처: `stall-panes.txt`

```text
Review requested for wi-83-001 at 80b512c18fbba39efcb53a4ab4c5b7a5c82f6caa; awaiting the required
pair verdict.

Standing by for pair:cr wi-83-001 or pair:fix wi-83-001.
```

```text
Ran pair-cli cowork member-queue-promote-next
  {"success": false, "code": "MEMBER_BUSY", "active": ["wi-90-004"], "team": "dvo", "member":
  "dvo-rev-co"}

Review 101 is queued behind active wi-90-004, which still awaits dvo-ref-co’s explicit HEAD:
<sha>. No slot was closed.
```

```text
Ran pair-cli cowork member-queue-promote-next
  {"success": false, "code": "MEMBER_BUSY", "active": ["wi-83-001"], "team": "dvo", "member":
  "dvo-rev2-co"}

Review 102 cannot be promoted; wi-83-001 still occupies the active reviewer slot pending its
author’s explicit HEAD: <sha> signal.
```

이 세 캡처를 함께 보면 양쪽이 서로 기다리는 상태가 명확하다. author는 이미 HEAD를 만들고
review를 요청했다고 믿으며 verdict를 기다렸고, reviewer는 같은 HEAD 신호를 받지 못했다고
판단해 active slot을 유지했다.

### 4. durable inbox도 85분 가까이 정지

출처: `stall-inbox.txt`

```text
2026-07-13T02:12:56+00:00 | task_dispatch | None -> None | [#90-sub-5c] 전 화면 단일 설정 서체 구현 — body=reading-font 전역화 + 제목 serif 고정 해제
2026-07-13T02:12:56+00:00 | pair_reviewer_assigned | team-lead -> dvo-rev-co | pair-reviewer assignment for wi-90-004
2026-07-13T02:14:32+00:00 | task_dispatch | None -> None | [#90-review-iter1] pair-review: wi-90-001 guide/ordinarium font alignment (autho
2026-07-13T02:17:49+00:00 | task_dispatch | None -> None | [#90-review-iter1] pair-review: wi-90-002 DESIGN.md typography contract (author
```

이후 03:43:40의 leader relay까지 inbox event가 없다. 작업이 없었던 것이 아니라 완료 commit과
대기 중 review가 있었으므로, event silence 자체가 진행 정지 신호였다.

### 5. 세션은 살아 있었음

출처: `stall-procs.txt`

```text
--- socket cowork-dvo:
dvo_dvo-dev-co: 1 windows
dvo_dvo-dev2-co: 1 windows
dvo_dvo-plan-co: 1 windows
dvo_dvo-ref-co: 1 windows
dvo_dvo-res: 1 windows
dvo_dvo-rev-co: 1 windows
dvo_dvo-rev2-co: 1 windows
dvo_dvo-sol-co: 1 windows
dvo_dvo-test-co: 1 windows
--- socket cowork-dvo-leader:
dvo-leader: 1 windows (attached)
```

따라서 프로세스/세션 종료가 아니라 논리적 전달 교착이다.

### 6. 진단 census: 여섯 live Codex route DEAD

leader 수집본 `stall-census.txt`의 공통 member excerpt:

```json
{
  "migration_phase": "dual-mode-degraded",
  "a2a_registered": true,
  "a2a_provider": "codex",
  "a2a_route_dead": true,
  "a2a_reachable": false,
  "stale_binding": true,
  "reason": "gate ON; a2a entry present but route DEAD (hub invalidated on dropped wake) — a2a leg BROKEN while inbox works"
}
```

해당 live member는 정확히 다음 6명이다.

```text
dvo-dev-co
dvo-dev2-co
dvo-plan-co
dvo-ref-co
dvo-rev-co
dvo-rev2-co
```

같은 03:41 진단 snapshot:

```json
"pending_durability": {
  "pending_total": 3,
  "pending_by_recipient": {
    "dvo/dvo-rev2-co": 2,
    "dvo/dvo-rev-co": 1
  }
},
"comms_fallback": {
  "sendkeys_fallback_enabled": true,
  "engage_count": 17,
  "last_engage_reason": "a2a_delivery_not_confirmed"
}
```

본 보고서 작성 중 `pair-cli a2a-phase-census`를 다시 실행한 fresh snapshot에서도 동일한 6개
live Codex route가 DEAD였다. 그 사이 pending/fallback 수치는 더 늘었다.

```json
"pending_durability": {
  "pending_total": 4,
  "pending_by_recipient": {
    "dvo/dvo-rev2-co": 2,
    "dvo/dvo-rev-co": 2
  }
},
"comms_fallback": {
  "sendkeys_fallback_enabled": true,
  "engage_count": 18,
  "last_engage_reason": "a2a_delivery_not_confirmed"
},
"summary": {
  "live_parity_gaps": [
    "dvo-dev-co",
    "dvo-dev2-co",
    "dvo-plan-co",
    "dvo-ref-co",
    "dvo-rev-co",
    "dvo-rev2-co"
  ],
  "phase3_removal_safe": false
}
```

이 변화는 fallback이 켜진 뒤에도 dead route가 self-heal하지 않았고, 새 frame이 계속 durable
pending으로 들어갔음을 보여 준다.

### 7. leader relay 자체의 a2a leg도 DEAD였지만 durable 경로는 동작

출처: `/home/min/.claude/pair-cowork/teams/dvo/a2a-send-audit.jsonl`

```json
{"msg_id":"019f59930774-fc67b2fc8ae203ca","from":"dvo/dvo_LEADER","to":"dvo/dvo-rev2-co","summary":"UNSTICK: author-ready relay wi-83-001 HEAD=80b512c1","sent_at":"2026-07-13T03:44:26Z","disposition":"dropped","loss_class":"dead-route-loss","route_alive":false,"reason":"codex member 'dvo/dvo-rev2-co' thread is loaded but NOT consumed by a live session — no delivered:True for an unconsumed thread"}
```

```json
{"msg_id":"019f59935068-1fa2ebe3637777f9","from":"dvo/dvo_LEADER","to":"dvo/dvo-rev-co","summary":"UNSTICK: author-ready relay wi-90-004 HEAD=38bf445","sent_at":"2026-07-13T03:44:46Z","disposition":"dropped","loss_class":"dead-route-loss","route_alive":false,"reason":"codex member 'dvo/dvo-rev-co' thread is loaded but NOT consumed by a live session — no delivered:True for an unconsumed thread"}
```

그러나 동일 relay는 durable inbox에 남았고 `pair:msg` trigger를 통해 소비됐다.

```text
03:43:40 msg_20260713T0343400000_58ce
UNSTICK: author-ready relay wi-83-001 HEAD=80b512c1

03:44:14 msg_20260713T0344140000_65bb
UNSTICK: author-ready relay wi-90-004 HEAD=38bf445
```

reviewer ack:

```json
{"msg_id":"019f5993da76-2e4fe0879addcdc6","from":"dvo/dvo-rev2-co","to":"dvo/dvo_LEADER","sent_at":"2026-07-13T03:44:49Z","disposition":"routed","loss_class":"delivered-confirmed"}
{"msg_id":"019f5994a66c-a212ff75903c4e4e","from":"dvo/dvo-rev-co","to":"dvo/dvo_LEADER","sent_at":"2026-07-13T03:45:41Z","disposition":"routed","loss_class":"delivered-confirmed"}
```

`wi-90-004` PASS(03:47:36)와 `wi-83-001` FAIL(03:48:13)이 연이어 제출됐으므로, relay가
실제 review execution을 복구했다.

## 근본원인 분석

### 1. 직접 원인: author-ready a2a 신호 유실

Codex author가 commit 후 leader/reviewer에게 보낸 “ready for review, HEAD=…” 신호는 member
화면에서는 send가 실행된 것처럼 보였지만, recipient가 소비 가능한 live route가 아니었다.
fresh census의 `a2a_route_dead=true`, `hub invalidated on dropped wake`, a2a audit의
`dead-route-loss`/`thread is loaded but NOT consumed`가 동일 현상을 서로 다른 surface에서 확인한다.

이 결함은 2026-07-07의 leader route 미등록 사고와 같은 “tool/send 성공처럼 보이나 최종 소비가
보장되지 않음” 계열이다. 다만 이번에는 registry entry가 아예 없는 경우가 아니라 entry는 있으나
hub가 dropped wake 뒤 route를 DEAD로 무효화한 상태다. self-send 보고서와도 최종 consume 확인이
없다는 공통점이 있다.

### 2. 증폭 원인: HEAD 대기 상태가 reviewer active slot을 점유

`pair_reviewer_assigned`는 author HEAD 신호가 오기 전에 reviewer의 active queue slot을 차지한다.
HEAD 신호가 유실되면 reviewer는 안전을 위해 review를 시작하지 못하고 slot도 닫지 않는다.
그 결과 관련 없는 후속 review task까지 `MEMBER_BUSY` 뒤에서 무기한 대기한다.

이번 사고의 wait graph는 다음과 같다.

```text
author wi-83-001 (HEAD=80b512c, verdict 대기)
  └─ lost ready signal
      └─ dvo-rev2-co active=wi-83-001 (HEAD 대기)
          └─ review 102 promote 불가

author wi-90-004 (HEAD=38bf445, verdict 대기)
  └─ lost ready signal
      └─ dvo-rev-co active=wi-90-004 (HEAD 대기)
          └─ review 101 promote 불가
```

즉 a2a delivery 결함과 reviewer queue 상태 모델이 결합해 deadlock을 만들었다. 어느 한쪽만 있었다면
영향은 제한됐을 수 있다. durable ready 신호가 있었다면 reviewer가 시작할 수 있었고, HEAD 대기가
active slot을 독점하지 않았다면 후속 review 101/102는 계속 진행될 수 있었다.

### 3. 기여 요인

1. 첫 dispatch 때 send-keys fallback이 OFF여서 `queue_hold`/dropped wake를 즉시 보완하지 못했다.
2. fallback을 켠 뒤에도 이미 DEAD가 된 Codex route가 재등록/self-heal하지 않았다.
3. author-ready가 a2a-only 신호였고, commit 존재 + clean worktree라는 durable 사실에서 자동으로
   review-ready를 복원하는 watchdog이 없었다.
4. reviewer는 leader가 검증해 relay한 HEAD를 받을 수 있었지만, 이 경로가 자동 fallback이 아니라
   85분 뒤 수동 진단으로만 실행됐다.
5. session/tmux liveness는 정상이므로 기존 “프로세스 살아 있음” 검사는 논리적 교착을 건강으로
   오판할 수 있다.

## 복구 조치와 판정

leader는 다음을 수동 수행했다.

1. 두 author worktree의 HEAD와 clean status를 확인했다.
2. durable `member-msg`에 work item, author, full HEAD, worktree path를 기록했다.
3. `pair:msg` trigger로 각 reviewer가 durable message를 fetch하도록 했다.
4. reviewer가 직접 `git rev-parse HEAD`를 검증한 뒤 기존 active pair review를 계속하게 했다.

두 reviewer 모두 ack했고 실제 verdict를 제출했으므로 이 복구 경로는 유효하다. 따라서 현재 판정은
“member session 재시작 필요”가 아니라 “ready 신호의 durable 전환 + reviewer slot 상태 개선 필요”다.

## 권고사항

### P0: author-ready를 durable SSOT로 전환

- author의 `ready for review`는 `member-msg`/inbox에 work item, author, full HEAD, worktree path를
  원자적으로 기록한다.
- a2a는 저지연 wake로만 사용하고, 전달 실패/DEAD route여도 durable message는 남아야 한다.
- sender UI는 `tool call success`, `queued`, `delivery confirmed`, `consumed`를 분리해 표시한다.

### P0: dropped wake 뒤 route self-heal

- hub가 route를 `DEAD`로 invalidation하면 다음 member activity, fallback consume, session binding 확인
  시 자동 re-register/re-probe한다.
- `stale_binding=true`와 live tmux/session이 동시에 관찰되면 LOUD 경고와 재등록을 시도한다.
- fallback engage가 성공해도 route health가 회복됐다고 가정하지 말고 census로 확인한다.

### P1: leader watchdog

- `worktree commit present + clean + author pane가 verdict 대기 + reviewer slot이 HEAD 대기`가 N분
  (예: 5분) 이상 지속되면 leader가 자동으로 HEAD를 durable relay한다.
- inbox/a2a inbound silence, pending durability 증가, `MEMBER_BUSY` 반복을 함께 교착 지표로 사용한다.
- watchdog 결과에는 how/what/where를 남겨 자동 relay가 어떤 HEAD와 slot에 적용됐는지 감사 가능해야 한다.

### P1: reviewer slot 상태 분리

- `pair_reviewer_assigned`의 “HEAD 대기”를 reviewer의 유일한 active execution slot과 분리하거나,
  제한 시간 뒤 parked/waiting 상태로 옮겨 후속 review task를 처리할 수 있게 한다.
- reviewer는 author 직접 신호뿐 아니라 leader가 commit/clean-tree를 검증한 relay를 공식 HEAD source로
  받아야 한다. 이번 사고에서 이 경로가 실제로 동작했다.
- relay 후에도 reviewer가 full SHA를 직접 검증하는 기존 안전 조건은 유지한다.

### P2: 회귀 시나리오

1. Codex author route를 의도적으로 DEAD로 만든다.
2. author가 commit 후 ready 신호를 보낸다.
3. durable inbox에 ready record가 남고 reviewer가 HEAD를 소비하는지 확인한다.
4. 신호가 지연돼도 reviewer의 다른 review task가 무기한 `MEMBER_BUSY`가 되지 않는지 확인한다.
5. route가 self-heal하고 pending frame이 drain되는지 확인한다.

## 관련 보고서

- `docs/bug-reports/2026-07-07-a2a-leader-route-unregistered.md` — leader route가 registry에 없어
  member send가 최종 수신되지 않은 이전 사고
- `docs/bug-reports/2026-07-07-a2a-self-send-not-consumed.md` — route/notification은 있으나 Codex
  turn으로 최종 consume되지 않은 이전 사고

세 보고서의 공통점은 “send/tool 완료”가 “recipient가 처리 가능한 turn으로 소비”되었음을 보장하지
않는다는 것이다. 이번 사고는 여기에 reviewer active-slot 점유가 결합해 팀 단위 교착으로 확대됐다.

## 결과 검증 (how / what / where)

### how

main checkout에서 이 파일을 직접 읽고, 필수 header(작성일/팀/영향 범위/심각도/현재 판정), 요약,
UTC 타임라인, leader-collected log excerpt, fresh census, 근본원인, 권고사항, 관련 보고서가 존재하는지
`test`, `rg`, `sed`로 검사한다.

### what

기대 결과: `docs/bug-reports/2026-07-13-team-stall-a2a-route-dead-review-deadlock.md`에 한국어 incident
report가 있고, 기존 2026-07-07 보고서 형식을 따르며, 사건의 사용자 영향·시간순서·verbatim 로그·복합
근본원인·복구·재발 방지를 독자가 한 파일에서 재구성할 수 있어야 한다.

관찰 결과(명령 exit 0):

```text
필수 header: lines 3-7 모두 발견
필수 section: 요약=9, 타임라인=42, 로그 증거=59, 근본원인 분석=264,
             권고사항=325, 결과 검증=374, 증거 출처=397
ack: 019f5993da76=lines 54/257, 019f5994a66c=lines 55/258
census delta: pending_total 3→4, engage_count 17→18 발견
leader evidence: stall-now/worktrees/panes/inbox/procs/census 6개 경로 모두 발견
git diff --check: PASS
wc -l: 410 (검증 캡처 반영 전)
git status: ?? docs/bug-reports/2026-07-13-team-stall-a2a-route-dead-review-deadlock.md
```

마지막 `??`는 dispatch의 “Do NOT commit; leader integration-commit 대기” 조건에 따른 의도된
untracked 상태다. 파일 내용·형식 검증은 통과했다.

### where

- 사용자 확인 surface: 본 문서 전체
- 핵심 원인 surface: `## 근본원인 분석`
- 원본 캡처 surface: `## 로그 증거`
- 운영 조치 surface: `## 권고사항`

## 증거 출처

- `docs/bug-reports/2026-07-13-team-stall-a2a-route-dead-review-deadlock.md`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-now.txt`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-worktrees.txt`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-panes.txt`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-inbox.txt`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-procs.txt`
- `/tmp/claude-1000/-home-min-myproject-divineoffice/32c6d2e1-22cd-420c-913d-02fd304eae6d/scratchpad/stall-census.txt`
- `/home/min/.claude/pair-cowork/teams/dvo/a2a-send-audit.jsonl`
- `/home/min/.claude/pair-cowork/teams/dvo/inbox.jsonl`
- `pair-cli a2a-phase-census` fresh 실행 결과(2026-07-13, task 105 작성 중)
- `docs/bug-reports/2026-07-07-a2a-leader-route-unregistered.md`
- `docs/bug-reports/2026-07-07-a2a-self-send-not-consumed.md`
