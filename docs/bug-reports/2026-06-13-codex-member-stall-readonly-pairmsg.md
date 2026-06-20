# 버그 리포트: codex 멤버가 작업 재개 없이 무한 idle (read-only pair:msg + ack 맹신)

- **일시**: 2026-06-13 (UTC ~06:08 ~ ~06:44)
- **팀/세션**: dvo (pair-cowork), GOAL #177 Step 1 (#178 MM 정의), 멤버 dvo-dev2-co (codex/gpt-5.5)
- **신고 계기**: 사용자 — "코덱스가 보고를 잘못한다, 정기적으로 확인하라 했는데 하고 있는거야? 지금도 모두 놀고 있는데?"
- **심각도**: HIGH (작업 전면 정지, 리더가 인지 못한 채 대기)

---

## 증상

리더가 GOAL #177 Step 1(MM 정의, #178)을 codex 멤버 dvo-dev2-co에 디스패치했고, 멤버가 충돌점검(conflict-surfacing) 중 BLOCKER를 올려 일시정지했다. 리더가 결정을 회신한 뒤 멤버는 **"진행하겠다"고 ack만 하고 실제 작업(MM 문서 작성/커밋)을 0건도 하지 않은 채 idle 상태로 머물렀다.** 리더는 ack를 믿고 산출물을 검증하지 않아, 팀 전체가 진행 없이 멈춰 있었다.

확정 증상: dvo-dev2-co worktree에 커밋 0, MM 문서 부재, 그러나 멤버는 "Received the decision. I will proceed..." 라고 보고함 (= **보고와 실제 상태 불일치**).

---

## 재현 (이 인시던트의 실제 로그)

### 1) 리더 → 멤버 결정 회신 (read-only 경로)

```
$ pair-cowork member-msg send --team dvo --from-member team-lead \
    --to-member dvo-dev2-co --summary "GOAL#177 decision: ..." --message "<결정 본문>"
{"success": true, "message_id": "msg_20260613T0620190000_0d76", "team": "dvo",
 "from_member": "team-lead", "to_member": "dvo-dev2-co",
 "timestamp": "2026-06-13T06:20:19+00:00"}
```

### 2) 멤버 ack (오해를 부르는 낙관적 보고)

```
Reply from dvo-dev2-co (msg_id=msg_20260613T0620190000_0d76, status=ok)
{"message": "Received the GOAL #177 decision. I will proceed with the corrected
 MM model on the next actionable task trigger: current state = running-week
 regular Sunday Vespers base; target = running-week Sunday First Vespers
 fv-wN-sun-* set while preserving proper solemnity fields."}
```

→ "I will proceed ... **on the next actionable task trigger**" 은 사실상 "트리거를 기다리는 중(=멈춤)"이라는 뜻인데, "진행하겠다"로 읽혀 리더가 진행 중으로 오인.

### 3) 실측 — 실제로는 아무 작업도 안 함

```
$ git -C .claude/worktrees/178-dvo-dev2-co log --oneline main..HEAD
(빈 출력 — 커밋 0)

$ git -C .claude/worktrees/178-dvo-dev2-co status --porcelain
(빈 출력 — 미커밋 변경 0)

$ ls .claude/worktrees/178-dvo-dev2-co/docs/design/mental-models/goal177*
NO MM doc in worktree

$ cat ~/.claude/pair-cowork/members/dvo-dev2-co/session.json
  "last_active": "2026-06-13T06:21:14+00:00"   # 결정 회신(06:20) 직후 ack만 하고 멈춤
```

### 4) 멤버 tmux 페인 — 멈춘 이유가 화면에 찍혀 있었음

```
$ tmux capture-pane -t dvo_dvo-dev2-co -p | tail
• Replied to msg_20260613T0620190000_0d76 with status=ok.

  No worktree changes or tests were run under the read-only
  pair:msg trigger.

───────────────────────────────────────────────
› Explain this codebase            # ← 기본 idle 프롬프트로 복귀
  gpt-5.5 xhigh · ~/myproject/divineoffice · 5h 94% left
```

→ 멤버 스스로 "**No worktree changes or tests were run under the read-only pair:msg trigger**" 라고 명시. 즉 `member-msg send` 는 codex에 read-only `pair:msg` 트리거로 전달되며, 이는 정보성일 뿐 작업을 발화시키지 않는다(by design).

### 5) actionable 트리거로 재개 (해결)

```
$ tmux send-keys -t dvo_dvo-dev2-co 'pair:next' Enter
$ tmux send-keys -t dvo_dvo-dev2-co Enter        # 텍스트 입력 후 별도 제출 필요

$ tmux capture-pane -t dvo_dvo-dev2-co -p | tail
• I'm using pair-member-bridge again because pair:next is one of its triggers.
  I'll ... continue task 178 using the leader's decision.
• Ran pair-cli cowork member-queue-promote-next
  └ {"success": false, "code": "MEMBER_BUSY", "active": ["178"], ...}
• Working (19s • esc to interrupt)        # ← 실제 작업 재개
```

### 6) 재개 후 정상 완료 (검증됨)

```
commit 9679943 docs(goal177): WI-178 — define running First Vespers psalmody MM
docs/design/mental-models/goal177-...md  (14247 bytes, 14개 섹션, 4개 대축일 전수)
→ merge_commit bfa43a1 (main)
```

---

## 근본원인

1. **(1차) read-only 트리거로 작업 재개를 시도함.** 리더가 일시정지된 codex 디스패치 작업을 재개시키려고 `pair-cowork member-msg send`(= codex 측 read-only `pair:msg` 트리거)로 결정을 보냄. codex 브리지는 `pair:msg`를 **정보성/read-only**로 처리하여 worktree·test 동작을 하지 않음(설계대로). 따라서 멤버는 ack만 하고 idle 복귀.

2. **(2차) 리더가 ack를 산출물 검증 없이 신뢰함.** "I will proceed..." 라는 낙관적 ack를 진행 중으로 오인하고, worktree 커밋/문서/페인 상태를 확인하지 않음. → 멈춤을 사용자가 지적할 때까지 인지하지 못함.

3. **(기여) ack 문구의 모호성.** codex의 "proceed on the next actionable task trigger" 는 기술적으로는 참이나(트리거 대기 중), 리더 입장에선 "계속 진행"으로 읽힘.

부차 관찰: "모두 idle" 의 일부는 GOAL #177이 순차 RGR(한 스텝씩)이라 정상적으로 idle인 멤버도 있었으나, **핵심 정지 원인은 위 codex 스톨**이었다.

---

## 수정 / 완화

1. **codex 일시정지 작업 재개 = actionable 트리거 사용.** 결정/지시 후 해당 페인에
   `tmux send-keys -t dvo_<member> 'pair:next' Enter` (텍스트 입력 + 별도 Enter 제출).
   `member-msg send`(read-only `pair:msg`)만으로는 재개되지 않음.
2. **ack 맹신 금지 — 산출물로 실측.** 모든 codex 멤버에 대해 (a) worktree 커밋
   (`git -C .claude/worktrees/<task>-<member> log main..HEAD`), (b) 산출 파일 존재,
   (c) tmux capture-pane 로 실제 working 여부를 정기 확인. 보고서/ack는 증거가 아님.
3. **(systemic 제안)** `member-msg send` 가 codex 대상으로 actionable 의도(결정·재개)를
   담을 때, (a) read-only 임을 경고하거나 (b) actionable 전달 변형을 제공하거나,
   (c) dispatch 프로토콜에 "leader→codex 일시정지 작업 재개는 `pair:next` 필요" 를 명문화.

## 관련 기록
- 메모리: `codex-needs-actionable-trigger-verify-output`, `codex-pair-reviewer-needs-bridge`
- 사용자 지시(2026-06-13): codex 보고 정기 검증.
