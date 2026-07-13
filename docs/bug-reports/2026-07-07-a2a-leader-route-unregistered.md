# 버그 리포트: Codex a2a send 성공 로그 후 leader 수신 실패

- **작성일**: 2026-07-07
- **팀/세션**: dvo / divineoffice
- **영향 범위**: Codex member -> leader a2a direct send, Codex lifecycle notify
- **심각도**: HIGH (멤버가 보낸 a2a가 성공처럼 보이나 leader 화면에 도달하지 않음)
- **현재 판정**: directive 문법 문제가 아니라 **leader a2a receive route 미등록 / 미확인**

## 요약

Codex 멤버가 `@@a2a-send to=dvo/leader` 형식으로 leader에게 메시지를 보냈고, MCP 로그에는
`a2a_send` tool call이 성공으로 기록됐다. 그러나 leader는 메시지를 수신하지 못했다.

조사 결과, 현재 a2a registry에는 Codex 멤버 4명만 등록되어 있고 leader 수신 route
(`dvo/leader` 또는 canonical 내부명 `dvo/dvo_LEADER`)가 없다. 동시에 durable pending queue에는
`dvo/dvo_LEADER` 앞으로 보류된 프레임 6건이 쌓여 있다.

즉 `a2a_send completed successfully`는 "tool call이 끝났다"는 뜻일 뿐, 현재 상태에서는
"leader 화면에 렌더됐다"는 증거가 아니다. leader가 pair-cowork channel에는 join되어 있지만
a2a hub registry에는 live-routable recipient로 등록되지 않은 상태가 핵심 결함이다.

## 증상

사용자가 Codex 멤버에게 leader에게 안부 인사를 보내라고 요청했다.

```
@@a2a-send to=dvo/leader
안녕하세요, dvo-dev-co입니다. a2a 연결 확인 겸 안부 인사드립니다.
```

이후 사용자가 "a2a send 가 제대로 작동을 안한다"고 보고했다.

## 증거

### 1. Codex 쪽 directive는 MCP tool call까지 도달함

로그 경로:

```
/home/min/.cache/claude-cli-nodejs/-home-min-myproject-divineoffice/mcp-logs-a2a-channel/2026-07-07T12-47-32-359Z.jsonl
```

발췌:

```json
{"debug":"Calling MCP tool: a2a_send","timestamp":"2026-07-07T12:49:41.279Z","sessionId":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","cwd":"/home/min/myproject/divineoffice"}
{"debug":"Tool 'a2a_send' completed successfully in 505ms","timestamp":"2026-07-07T12:49:41.783Z","sessionId":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","cwd":"/home/min/myproject/divineoffice"}
```

해석: directive line 파싱 실패나 MCP tool 미호출 문제는 아니다.

### 2. leader는 pair-cowork channel에는 join되어 있음

로그 경로:

```
/home/min/.claude/pair-cowork/teams/dvo/channel.jsonl
```

발췌:

```json
{"type":"host_change","host_sid":"6c47fe2e-6c0c-4e6b-be7e-c24aed120241","ts":"2026-07-07T12:47:31+00:00"}
{"type":"member_join","member":"dvo_LEADER","pid":3539681,"ts":"2026-07-07T12:47:32+00:00"}
```

해석: leader 프로세스 자체가 없는 상태는 아니다.

### 3. Codex lifecycle notify가 leader a2a delivery 미확인으로 반복 실패

같은 로그의 발췌:

```json
{"type":"provider_lifecycle_notify_failed","member":"dvo-dev-co","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T12:48:50+00:00"}
{"type":"provider_lifecycle_notify_failed","member":"dvo-test-co","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T12:49:11+00:00"}
{"type":"provider_lifecycle_notify_failed","member":"dvo-dev-co","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T12:55:12+00:00"}
{"type":"provider_lifecycle_notify_failed","member":"dvo-rev-co","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T12:55:22+00:00"}
{"type":"provider_lifecycle_notify_failed","member":"dvo-dev-co","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T12:59:56+00:00"}
{"type":"provider_lifecycle_notify_failed","member":"dvo-res","operation":"provider_lifecycle_emit","state":"connected","provider":"codex","error":"a2a delivery not confirmed (LOUD + durable pending_queue hold; drains on leader a2a reconnect)","ts":"2026-07-07T13:00:02+00:00"}
```

해석: 단일 메시지 문제가 아니라 Codex member -> leader a2a route 전반이 미확인 상태다.

### 4. a2a registry에 leader route가 없음

상태 파일:

```
/home/min/.claude/pair-cowork/teams/dvo/a2a-registry.json
```

현재 등록 멤버 발췌:

```json
{
  "v": 1,
  "team": "dvo",
  "members": {
    "dvo/dvo-dev-co": {
      "provider": "codex",
      "connection": {
        "transport": "app-server-ws",
        "app_server_url": "ws://127.0.0.1:4765",
        "thread_id": "019f3ca9-9964-71e2-9fc8-dc56db3e6911"
      }
    },
    "dvo/dvo-rev-co": {
      "provider": "codex",
      "connection": {
        "transport": "app-server-ws",
        "app_server_url": "ws://127.0.0.1:4765",
        "thread_id": "019f3ca5-78bf-70a1-b9fe-1896721470c2"
      }
    },
    "dvo/dvo-test-co": {
      "provider": "codex",
      "connection": {
        "transport": "app-server-ws",
        "app_server_url": "ws://127.0.0.1:4765",
        "thread_id": "019f3c9f-d00e-7222-8cd3-c8e245182bd8"
      }
    },
    "dvo/dvo-res": {
      "provider": "codex",
      "connection": {
        "transport": "app-server-ws",
        "app_server_url": "ws://127.0.0.1:4765",
        "thread_id": "019f3ca9-c209-7400-84d6-4833eb78d863"
      }
    }
  }
}
```

해석: leader가 live a2a recipient로 등록되어 있지 않다. `dvo/leader`도 `dvo/dvo_LEADER`도 없다.

### 5. pending queue는 leader 앞으로 누적 중

상태 파일:

```
/home/min/.claude/pair-cowork/teams/dvo/a2a-pending.json
```

발췌:

```json
{
  "v": 1,
  "team": "dvo",
  "pending": {
    "dvo/dvo_LEADER": [
      {
        "frame": {
          "held_by": "comms_fallback_precondition",
          "message_id": "019f3c9fbdd2-ca15a2336c35a1cb",
          "reason": "a2a_delivery_not_confirmed"
        },
        "delivery_key": "019f3c9fbdd2-ca15a2336c35a1cb"
      },
      {
        "frame": {
          "held_by": "comms_fallback_precondition",
          "message_id": "019f3caa01d1-502956c15aefaddc",
          "reason": "a2a_delivery_not_confirmed"
        },
        "delivery_key": "019f3caa01d1-502956c15aefaddc"
      }
    ]
  },
  "delivered": {},
  "dead_letter": [],
  "dead_letter_count": 0
}
```

원본 파일에는 `dvo/dvo_LEADER` 앞으로 총 6건이 있었다.

해석: 시스템도 leader에게 직접 delivery가 확인되지 않았음을 알고 있으며, leader reconnect 시 drain할 의도로 보류하고 있다.

### 6. Codex session binding과 pair-cli 해석에도 불일치 증상

Codex 세션 환경:

```bash
$ env | rg 'CODEX_THREAD_ID|PAIR|A2A|COWORK|TEAM|MEMBER'
CODEX_THREAD_ID=019f3ca9-9964-71e2-9fc8-dc56db3e6911
```

`pair-cli session scratch-path` 결과:

```json
{
  "success": false,
  "error": "Missing required field: 'filename' or 'prefix'",
  "code": "VALIDATION_ERROR",
  "hint": "No session binding found. Fix: pair-cli session autobind to check binding, or pair-cli session load --input '{\"session_key\": \"<key>\"}' to bind."
}
```

`pair-cli cowork comms-fallback` 결과:

```json
{
  "success": false,
  "error": "team required (JSON field 'team' or PAIR_COWORK_TEAM env)",
  "code": "INVALID_INPUT",
  "details": {"missing_field":"team"}
}
```

해석: 현재 Codex shell에는 `CODEX_THREAD_ID`만 있고 `PAIR_COWORK_TEAM`/`PAIR_COWORK_MEMBER`가 없다.
다만 a2a registry에는 Codex members가 등록되어 있으므로, 이 증상은 보조 단서다. 핵심 결함은
leader route 미등록이다.

## 근본원인 가설

가장 가능성이 높은 원인:

1. leader 세션의 a2a-channel MCP가 `PAIR_COWORK_TEAM=dvo`, `PAIR_COWORK_MEMBER=dvo_LEADER`
   identity로 hub에 register하지 못했다.
2. pair-cowork channel membership(`member_join`)과 a2a hub registry membership이 서로 분리되어
   있는데, leader는 전자에는 살아 있고 후자에는 없다.
3. Codex outgoing send path는 MCP tool call 성공을 반환하지만, leader 수신 렌더 확인까지 강하게
   실패로 전파하지 않아 사용자에게 "보낸 것처럼" 보인다.

## 기대 동작

- leader가 살아 있으면 `dvo/leader` 또는 내부 canonical `dvo/dvo_LEADER`가
  `a2a-registry.json`에 live-routable recipient로 등록되어야 한다.
- `@@a2a-send to=dvo/leader`는 leader 화면에 렌더되거나, 적어도 sender에게
  "not delivered / queued / unconfirmed"가 명시적으로 보여야 한다.
- lifecycle notify 실패는 즉시 operator-visible 해야 하며, 반복 실패 시 fallback 또는 reconnect 안내가 필요하다.

## 실제 동작

- `a2a_send` tool call은 성공으로 기록된다.
- leader route가 registry에 없어 수신 확인이 되지 않는다.
- durable pending queue에는 `dvo/dvo_LEADER` 앞으로 쌓인다.
- comms fallback은 꺼져 있어 send-keys fallback도 실행되지 않는다.

## 임시 조치

1. leader 세션에서 a2a-channel MCP를 재연결/재등록한다.
2. 재등록 후 아래 파일에서 leader entry가 생겼는지 확인한다.

   ```bash
   rg 'dvo/(leader|dvo_LEADER)' /home/min/.claude/pair-cowork/teams/dvo/a2a-registry.json
   ```

3. pending queue drain 여부를 확인한다.

   ```bash
   sed -n '1,220p' /home/min/.claude/pair-cowork/teams/dvo/a2a-pending.json
   ```

4. 즉시 전달성이 필요하면 team 환경을 명시해 fallback을 켠다.

   ```bash
   PAIR_COWORK_TEAM=dvo pair-cli cowork comms-fallback --set on
   ```

## 재발 방지 제안

1. `a2a_send` 결과를 "tool call success"와 "delivery confirmed"로 분리해 sender UI에 표시한다.
2. leader가 pair-cowork channel에 join될 때 a2a registry에 leader route가 없으면 LOUD warning을 띄운다.
3. Codex lifecycle notify가 `a2a_delivery_not_confirmed`로 pending queue에 들어가면, sender에게도
   즉시 "queued, not rendered" 상태를 보여준다.
4. `dvo/leader` alias와 `dvo/dvo_LEADER` canonical route의 매핑을 registry level에서 검증한다.
5. Codex binding 후 `pair-cli session scratch-path`가 "No session binding found"를 반환하지 않도록
   `$CODEX_THREAD_ID` -> team/member binding 확인 커맨드를 spawn 후 smoke test로 실행한다.

## 검증 체크리스트

- [ ] `a2a-registry.json`에 `dvo/dvo_LEADER` 또는 leader alias가 등록된다.
- [ ] `a2a-pending.json`의 `dvo/dvo_LEADER` pending 항목이 drain된다.
- [ ] Codex member가 `@@a2a-send to=dvo/leader`로 보낸 메시지가 leader 화면에 렌더된다.
- [ ] MCP 로그의 `a2a_send completed successfully` 외에 delivery confirmed 상태를 확인할 수 있다.
- [ ] lifecycle notify failure가 더 이상 `channel.jsonl`에 반복 기록되지 않는다.

