# Service Worker `CACHE_VERSION` 운영 가이드

이 문서는 `public/sw.js` 의 `CACHE_VERSION` 상수를 cohort 작업에서 안전하게 올리는 절차와, 동시 worktree dispatch 가 같은 base 에서 분기할 때 흔히 발생하는 **collision** 회피 패턴을 기록한다.

`CACHE_VERSION` 의 기본 계약은 `CLAUDE.md` 의 "Service Worker 캐시 — 배포 회귀 1순위 리스크" 섹션을 참고. 이 문서는 그 위에 cohort 운영 노하우만 얇게 얹는다.

---

## 언제 bump 하나

다음 변경이 cohort 안에 있으면 `divine-office-v{N}` → `v{N+1}` bump 가 필수다:

- `public/sw.js` 의 PRECACHE 목록 변경 (자산 추가/삭제/경로 변경)
- `sw.js` 자체 로직 변경 (fetch 핸들러, install/activate 훅)
- 프리캐시 대상 정적 자산 내용 변경
- (선택) 사용자에게 보이는 데이터 (`rich.json` 등) 의 schema-breaking 변경

`activate` 훅이 이전 버전 캐시를 전체 삭제하므로 bump 를 빠뜨리면 구 자산이 `cache-first` 로 무한 서빙된다.

---

## Collision 패턴 — 둘 다 같은 next 버전을 찍을 때

여러 worktree 가 같은 base commit 에서 분기해 각자 `v{N+1}` 을 찍어 PR 을 올리면, leader merge 가 두 번째 PR 에서 텍스트 충돌 (`CACHE_VERSION = 'divine-office-v{N+1}'` 라인) 을 만난다. 한쪽 brunch 가 silent 로 동일 버전 라벨을 유지한 채 들어오면 **활성 캐시가 동일 키 아래 다른 자산을 가리키는 회귀** 가 가능하다.

실제 발생 사례:

```
2bfebf2 #489 ... CACHE v19
7f2bdf2 #490 ... CACHE v18→v19    ← #489 와 같은 v19 라벨
33a269e #492 ... CACHE v22
f34cec0 #494 ... CACHE v21→v22    ← #492 와 같은 v22 라벨
```

위 두 사례는 sequential merge 로 정합성이 자연 보존된 race resolution 이었지만, 두 PR 의 `CACHE_VERSION` 라인이 똑같이 보여서 git 충돌 검사를 그대로 통과한다 (literal match).

---

## 예방 — 두 가지 정책

### 1. Sequential bump (권장 기본값)

CACHE bump 가 필요한 cohort 는 leader 가 **하나의 dispatch 안에서 마지막 단계로 bump 를 묶어서 처리**한다. 데이터 변경 dispatch (예: phrase inject) 와 bump dispatch 를 분리하면, 데이터 dispatch 가 끝나기 전 까지는 누구도 `CACHE_VERSION` 라인을 만지지 않는다.

### 2. Bump-queue (병렬 cohort 가 불가피한 경우)

복수 worktree 가 동시에 데이터 변경 + bump 를 요구하면 leader 는 ff-merge 순서를 사전에 고정하고, 두 번째부터는 base 를 첫 merge 결과로 옮긴 뒤 dispatch 한다. 즉 `base_commit` 을 직전 merge 의 head 로 명시한다.

---

## 충돌 발생 시 복구 — race resolution

같은 버전 라벨이 두 번 들어왔다면 다음 단계로 복구한다:

1. 두 PR 의 sw.js diff 가 `CACHE_VERSION` 라인 외 다른 부분도 건드렸는지 확인
2. 다른 부분이 없으면 두 번째 merge 의 commit 메시지에 사실관계를 적고 (`CACHE bumped same label v{N} after #X — see race resolution`) 통과
3. 다른 부분이 있으면 (예: PRECACHE 목록 차이) 두 번째 PR 을 amend 하여 `v{N+1}` 또는 `v{N+2}` 로 재bump 후 머지

---

## CACHE_VERSION 현황

| 일자 (대략) | 버전 | 트리거 |
|------------|------|--------|
| F-X9/X10/X12 fix cohort | v8 | (#410) |
| F-X11 Phase 2-B | v9 | (#443) |
| F-X11 Phase 2-C | v10 | (#453) |
| F-X11 Phase 2-D | v11 | (#463) |
| F-X11 Phase 2-F | v15 | (#477 merge resolution) |
| F-X11 Phase 2-G/H | v17 → v18 | (#485) |
| F-X11 Phase 2-J | v22 | (#494) |
| renderer indent unification | v27 | (#502) |

(상기 표는 운영 추적용. 정합 SoT 는 `public/sw.js` 와 git log.)
