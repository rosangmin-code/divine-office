# 버그 리포트: Codex a2a self-send가 notification 수신 후 대화 턴으로 소비되지 않음

- **작성일**: 2026-07-07
- **팀/세션**: dvo / divineoffice
- **영향 범위**: Codex member -> same Codex member a2a self-send
- **심각도**: MEDIUM-HIGH (send 성공처럼 보이나 사용자가 기대한 자기 수신/턴 주입이 발생하지 않음)
- **현재 판정**: hub 라우팅 실패가 아니라 **동일 세션 inbound notification의 turn-consume/주입 실패**

## 요약

Codex 멤버가 자기 자신(`dvo/dvo-dev-co`)에게 a2a 메시지를 보낸 경우, a2a registry에는 자기 route가 있고
MCP 로그에도 inbound `notifications/claude/channel`이 찍힌다. 즉 hub -> MCP notification까지는 돌아온다.

그러나 그 notification이 현재 Codex 대화에 새 사용자 턴처럼 주입되어 처리되지 않는다. 따라서 사용자는
"스스로에게 메시지를 못 보낸다"고 관찰한다.

이는 별도 리포트 `2026-07-07-a2a-leader-route-unregistered.md`의 leader route 미등록 문제와 다르다.
leader 문제는 수신자 route 자체가 registry에 없었고, self-send 문제는 route와 notification은 있으나
최종 consume/render 단계가 빠진다.

## 증상

자가 테스트 메시지가 같은 Codex 세션으로 돌아와야 했지만, 대화 턴으로 나타나지 않았다.

테스트 의도:

```text
[self-test] 리더 a2a 수신 경로 확인용 자가 메시지. 이게 turn-injection 으로 돌아오면 바인딩 정상, 안 오면 stale...
```

## 증거

### 1. 자기 자신은 a2a registry에 등록되어 있음

상태 파일:

```text
/home/min/.claude/pair-cowork/teams/dvo/a2a-registry.json
```

발췌:

```json
{
  "dvo/dvo-dev-co": {
    "provider": "codex",
    "session_name": {
      "pty": null,
      "ssot_id": "019f3ca9-9964-71e2-9fc8-dc56db3e6911"
    },
    "connection": {
      "transport": "app-server-ws",
      "app_server_url": "ws://127.0.0.1:4765",
      "thread_id": "019f3ca9-9964-71e2-9fc8-dc56db3e6911"
    }
  }
}
```

해석: self target 미등록 문제는 아니다.

### 2. self-send는 MCP tool call과 inbound notification까지 도달함

로그 경로:

```text
/home/min/.cache/claude-cli-nodejs/-home-min-myproject-divineoffice/mcp-logs-a2a-channel/2026-07-07T12-47-32-359Z.jsonl
```

발췌:

```json
{"debug":"Calling MCP tool: a2a_send","timestamp":"2026-07-07T13:20:46.131Z","sessionId":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","cwd":"/home/min/myproject/divineoffice"}
{"debug":"notifications/claude/channel: [self-test] 리더 a2a 수신 경로 확인용 자가 메시지. 이게 turn-injection 으로 돌아오면 바인딩 정상, 안 오면 stal","timestamp":"2026-07-07T13:20:46.151Z","sessionId":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","cwd":"/home/min/myproject/divineoffice"}
{"debug":"Tool 'a2a_send' completed successfully in 506ms","timestamp":"2026-07-07T13:20:46.637Z","sessionId":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","cwd":"/home/min/myproject/divineoffice"}
```

해석:

1. `a2a_send` tool call은 실행됐다.
2. 같은 MCP channel이 inbound notification을 받았다.
3. tool call은 성공으로 종료됐다.
4. 그러나 그 notification이 Codex 대화 입력/turn으로 소비되지 않았다.

### 3. pending queue에는 self-send가 없음

상태 파일:

```text
/home/min/.claude/pair-cowork/teams/dvo/a2a-pending.json
```

현재 pending은 leader 앞으로만 존재:

```json
{
  "pending": {
    "dvo/dvo_LEADER": [
      {
        "frame": {
          "held_by": "comms_fallback_precondition",
          "reason": "a2a_delivery_not_confirmed"
        }
      }
    ]
  }
}
```

해석: self-send는 offline queue로 밀린 것이 아니라 live route에서 notification까지 처리된 것으로 봐야 한다.

### 4. 구현 주석에 self-send 관련 과거 결함 단서가 있음

파일:

```text
/home/min/venv/lib/python3.12/site-packages/pair_working/a2a/hub.py
```

관련 주석:

```text
the head-of-line-blocking bug: an un-consumable self-send stalled the whole relay
```

해석: 시스템 구현도 self-send를 일반 peer-send와 다른 위험 케이스로 이미 인식하고 있다.

## 근본원인 가설

가장 가능성이 높은 원인:

1. self-send의 sender와 recipient가 동일한 Codex `thread_id`다.
2. hub는 registry route를 통해 메시지를 동일 세션의 channel notification으로 되돌린다.
3. 하지만 현재 Codex/Claude channel notification layer는 같은 세션으로 돌아온 notification을
   새 사용자 turn으로 재주입하지 않는다.
4. 결과적으로 로그에는 notification 수신이 남지만, 에이전트는 새 메시지로 처리하지 않는다.

## 기대 동작

둘 중 하나가 명확해야 한다.

1. self-send 지원:
   - `@@a2a-send to=dvo/dvo-dev-co`가 실제 새 turn으로 소비되어 에이전트가 메시지를 처리한다.
   - `a2a_send` 결과가 routed + consumed/rendered 상태를 분리해 보여준다.

2. self-send 미지원:
   - `from == to`를 명시적으로 거부한다.
   - sender에게 `self_send_unsupported` 같은 LOUD 상태를 반환한다.
   - tool success처럼 보이게 하지 않는다.

## 실제 동작

- self route는 registry에 있다.
- `a2a_send` tool call은 성공한다.
- inbound `notifications/claude/channel` 로그도 찍힌다.
- 그러나 현재 Codex 대화에는 새 turn으로 주입되지 않는다.
- 사용자는 "스스로에게 메시지를 못 보낸다"고 관찰한다.

## 재발 방지 / 수정 제안

1. `a2a_send` 결과에 `routed`와 `consumed/rendered`를 분리해 표시한다.
2. `from == to`이면 명시적으로 self-send 정책을 적용한다.
   - 지원하지 않을 경우: `dropped/self_send_unsupported`
   - 지원할 경우: notification이 현재 thread의 새 turn으로 실제 소비되는지 확인
3. self-send smoke test의 성공 기준을 MCP notification 로그가 아니라 "실제 대화 turn 소비"로 둔다.
4. self-send가 consume 불가한 구조라면 watcher watermark/head-of-line 보호 로직만으로는 부족하므로,
   sender-facing fail-loud feedback을 추가한다.

## 검증 체크리스트

- [ ] `@@a2a-send to=dvo/dvo-dev-co` 실행 후 MCP notification 로그가 남는다.
- [ ] 같은 메시지가 Codex 대화에 새 사용자 turn으로 실제 주입된다.
- [ ] 또는 self-send가 명시적으로 거부되고 `self_send_unsupported` 상태가 sender에게 보인다.
- [ ] `a2a_send completed successfully`만으로 delivered/consumed 성공으로 오해하지 않게 된다.
- [ ] self-send 실패가 다른 outbound turn의 watermark 진행을 막지 않는다.

