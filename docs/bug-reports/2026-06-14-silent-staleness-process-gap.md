# 이슈리포트 — Silent Staleness Process Gap (미push 누적 → 프로덕션 구버전 동결, 무경고)

- **작성일**: 2026-06-14
- **작성자**: dvo-plan-cl (GOAL #193 / #193-sub-2)
- **분류**: **코드 버그 아님 — 운영 워크플로 process gap (silent staleness)**
- **심각도**: 중 (사용자 체감 = "고쳤다는 게 안 고쳐짐"; 데이터 무결성 영향 없음)
- **상태**: 즉시조치 = push 1회로 해소 가능 / 재발방지 = 워크플로 단계 추가 권고
- **관련**: GOAL #191 (Гэнгэрбурханд 화면 잔존), wi-191-001 RCA, GOAL #128/#172/#177

---

## 1. 사건 요약 (D1)

오타 수정(`Гэнгэрбурханд` → `Тэнгэрбурханд`, GOAL #128 STC-002)을 비롯한 **36개 커밋이
로컬 `main` 에는 머지됐지만 `origin/main` 으로 한 번도 push 되지 않았다.** Vercel 프로덕션
(`divine-office.vercel.app`)은 `origin/main` 을 자동 배포하므로, **6/10 빌드(`v58` + 구 데이터)
에 며칠간 동결**된 채로 서비스되고 있었다.

그 결과 사용자는 화면에서 **"이미 고쳤다고 한 오타"(`Гэнгэрбурханд`)를 계속 보게 됐다** —
로컬에는 고쳐져 있으나(`Тэнгэрбурханд`), 그 수정이 사용자에게 도달하는 마지막 단계(push→배포)가
밟히지 않았기 때문이다. 그리고 **이 "벌어진 상태"를 아무도 경고하지 않았다.**

핵심은 수정의 실패가 아니라 **"작업 완료(로컬 머지) ≠ 사용자 반영(배포)" 사이의 간극이
조용히 며칠간 누적됐는데 그걸 가시화하는 단계가 워크플로에 없었다**는 점이다.

---

## 2. 분류 — 코드 버그가 아니라 process gap

### 2.1 사용자 분석 (verbatim, 2026-06-14 — GOAL #193 USER REQUEST 인용)

> 코드 버그(소프트웨어 결함)는 아니고, 운영 워크플로의 빈틈(process gap)이라고 보는 게 정확합니다.
>
> **버그가 아닌 쪽 (해당)**
> - 코드·데이터·앱 로직은 정상입니다. 오타 수정도 제대로 됐고 로컬 main에 잘 들어가 있습니다.
> - "로컬 머지는 자동, 원격 푸시는 사용자 승인 필요"는 의도된 안전장치입니다. 푸시는 라이브
>   프로덕션에 즉시 반영되는 외부 행위라, 함부로 자동화하지 않는 게 정상적인 설계입니다.
>
> **그럼에도 "결함"이라 부를 수 있는 쪽 (process gap)**
> - 문제는 "로컬에는 반영됐지만 사용자에게는 안 보이는" 상태가 며칠간 조용히 누적됐는데 아무도
>   경고하지 않았다는 점입니다. 36커밋이 미배포로 쌓이는 동안 "origin/main과 로컬이 N커밋
>   벌어져 있다 / 프로덕션이 구버전이다"를 알려주는 장치가 없었습니다.
> - 즉 코드 결함은 아니지만, 운영상의 사각지대(silent staleness) — "작업 완료 ≠ 사용자 반영"인데
>   그 간극을 가시화하는 단계가 워크플로에 없었던 것 — 은 고쳐야 할 빈틈이 맞습니다.
>
> **비유**: 편지를 다 써서 봉투에 넣어 책상 서랍(로컬 main)에 잘 보관했는데, 우체통(GitHub→Vercel)에
> 넣는 단계가 절차에 없어서 며칠째 안 부쳐진 상태입니다. 편지 자체는 멀쩡하니 "편지 버그"는 아니지만,
> "다 썼는데 안 부쳐졌다는 걸 알려주는 알림이 없었다"는 건 절차의 결함입니다.

### 2.2 정리

| 측면 | 판정 | 근거 |
|------|------|------|
| 코드/데이터/앱 로직 | **정상** | 로컬 데이터에 수정 반영 확인(§3 E5); 머지 정상; 빌드/렌더 경로 무결(wi-191-001 RCA) |
| "로컬 머지 자동 / push 사용자 승인" 정책 | **의도된 안전장치 (결함 아님)** | push는 라이브 프로덕션에 즉시 반영되는 외부 행위 — 비자동화가 올바른 설계 |
| **미배포 누적의 가시화 단계 부재** | **process gap (고쳐야 할 결함)** | 36커밋·며칠간 동결되도록 "벌어졌다/구버전이다" 경고가 한 번도 없었음 |

이 결함은 **push 정책을 바꾸자는 게 아니다.** push 승인 게이트는 그대로 두되, **"미배포가 쌓이고
있다"는 사실 자체를 종결 시점에 보이게 만드는 단계**가 빠져 있다는 것이다.

---

## 3. 증거 (검증 명령 + 출력, 2026-06-14 실측)

### E1 — 로컬이 origin 대비 36커밋 ahead / 0 behind, 전부 미push
```
$ git rev-list --left-right --count origin/main...main
0	36
```
`origin/main` 대비 0 behind, **36 ahead** (전부 미push).

### E2 — 미push 커밋 36건 (최근 작업 전부 포함)
```
$ git log --oneline origin/main..main | wc -l
36
$ git log --oneline origin/main..main | head
0731837 Merge 179-dvo-sol (WI: 179)
3087fb5 fix(goal177): #177-sub-5 GREEN — movable-Solemnity First Vespers ...
bfa43a1 Merge 178-dvo-dev2-co (WI: 178)
75beb77 fix(goal172): #172-sub-2 GREEN — W3 Psalm 110 antiphon straight→curly ...
6b0399a Merge wi-156-004-dvo-test-co (WI: wi-156-004)   ← GOAL #128 typo 작업
9e93259 fix(data): WI-156-003 — apply source typo corrections  ← Гэнгэрбурханд 수정
...
```
GOAL #128(오타 수정)·#172·#177·#127·#129·#138·#116·#125 — 최근 작업 전부 미배포.

### E3 — origin/local HEAD 시점 차 (프로덕션 동결 시점 = 6/10)
```
$ git log -1 --format='%h %ci %s' origin/main
ca33609 2026-06-08 16:19:56 +0800 Merge wi-113-001-dvo-dev2-co (WI: wi-113-001)
$ git log -1 --format='%h %ci %s' main
0731837 2026-06-13 15:22:15 +0800 Merge 179-dvo-sol (WI: 179)
```
`origin/main` 은 6/8 커밋에 멈춰 있고(프로덕션 sw.js `last-modified: Wed, 10 Jun 2026` — wi-191-001 RCA),
로컬은 6/13까지 전진.

### E4 — 프로덕션이 구 빌드 + 구 데이터 (브라우저 캐시 아님)
```
$ curl -s https://divine-office.vercel.app/sw.js | grep 'const CACHE_VERSION'
const CACHE_VERSION = 'divine-office-v58'          ← 로컬은 v60

$ curl -s -D - https://divine-office.vercel.app/api/loth/2026-06-13/vespers -o resp.json | grep -i x-vercel-cache
x-vercel-cache: MISS                                ← 신선한 서버 응답(브라우저/CDN 캐시 아님)
$ grep -o 'Гэнгэрбурханд' resp.json
Гэнгэрбурханд                                       ← 프로덕션은 여전히 오타(구 데이터)
```
프로덕션 API가 **fresh MISS인데도 구 오타를 반환** → 디바이스/SW 캐시 잔존이 아니라 **배포된 빌드
자체가 구버전**임을 입증. (Service Worker / A2HS 캐시는 재배포 후의 2차 잔존 이슈일 뿐 — wi-191-001 RCA §2.)

### E5 — 로컬에는 수정이 정상 반영됨 (= 코드/데이터 결함 아님)
```
$ grep -rc 'Гэнгэрбурханд' src/data/        → 0  (로컬 데이터에 오타 없음)
$ grep -o 'Христээр дамжуулан Тэнгэрбурханд магтаалын' \
    src/data/loth/prayers/commons/psalter-headers.rich.json
Христээр дамжуулан Тэнгэрбурханд магтаалын          ← 수정형 존재
```

**종합:** 로컬 = 수정 완료(`Тэнгэрбурханд`, sw `v60`) / origin·프로덕션 = 6/10 구 빌드(`Гэнгэрбурханд`,
sw `v58`). 둘 사이 36커밋의 간극이 **무경고로** 며칠간 유지됨.

---

## 4. 재발 방지책 (D2 — 어디에 · 무엇을 · 어떻게)

종결 시점에 **"미배포 누적"을 가시화**하는 단계를 추가한다. push 자체는 여전히 사용자 승인을 거치되,
"벌어졌다"는 사실을 강제로 보이게 만든다. 위치는 두 갈래로 구분해 권고한다.

### (A) pair-cowork 오케스트레이션 시스템 (외부) — 근본 위치
- **무엇을**: GOAL 종결(close / `/pair-cowork-handoff`) 단계에 **push-staleness 게이트** 추가.
- **어떻게**: 리더가 GOAL 을 닫을 때
  ```bash
  AHEAD=$(git rev-list --count origin/main..main)
  ```
  `AHEAD > 0` 이면 종결 요약에 **"⚠ 미push 커밋 ${AHEAD}개 — 프로덕션이 구버전일 수 있음"** 경고를
  띄우고 **push 여부를 명시적으로 질의**(예: AskUserQuestion `[지금 push] / [나중에] / [의도적 보류]`).
  보류 시 사유를 종결 레코드에 남긴다.
- **장점**: 결함이 정확히 "종결 워크플로의 빈틈"이므로 가장 정합적인 위치.
- **단점**: 외부 시스템(pair-cowork) 변경이 필요 — 이 레포에서 즉시 못 함.

### (B) 프로젝트 레벨 (이 레포 — 즉시 실천 가능)
- **CLAUDE.md 체크리스트 1줄** (가장 최소·즉시): 기존 "변경 체크리스트 (self-review)" 에
  > - [ ] GOAL/작업 종결 시 `git rev-list --count origin/main..main` 확인 — `>0` 이면 "미push N개 +
  >   프로덕션 구버전" 경고하고 push 여부를 사용자에게 명시적으로 질의 (silent staleness 방지, 이슈
  >   2026-06-14 참고)
- **헬퍼 스크립트** `scripts/check-push-staleness.sh` (선택): ahead 수 + (옵션) 프로덕션 `sw.js`
  `CACHE_VERSION` 대조를 한 번에 출력. 리더가 종결 시 1회 실행.
  ```bash
  #!/usr/bin/env bash
  ahead=$(git rev-list --count origin/main..main 2>/dev/null || echo '?')
  [ "$ahead" != 0 ] && echo "⚠ origin/main 대비 미push 커밋 ${ahead}개 — 프로덕션이 구버전일 수 있음. push 검토."
  ```
- **Claude Code Stop / SessionEnd 훅** (자동화 강화, 선택): 위 스크립트를 훅으로 걸어 세션 종료 시
  자동 경고. "에이전트가 깜빡함"에 강건.

### CI 는 이 결함의 올바른 위치가 아님 (주의)
이 결함은 **"push 가 안 됨"** 자체다. CI 는 **push 이후**에만 도므로, "아직 push 안 된 상태"를
경고할 수 없다(닭-달걀). 따라서 경고는 **로컬/종결 시점(클라이언트 측)** 에 있어야 하며 CI 층이 아니다.

### ★ 즉시 실천 최소안 (1개)
**(B)의 CLAUDE.md 체크리스트 1줄 추가** — 인프라 0, 외부 시스템 변경 0, 즉시 적용. 근본 해결은
(A) pair-cowork 종결 게이트로 승격하되, 그 전까지의 brige 로 (B)를 둔다.

---

## 5. 즉시 조치 (이번 건 해소)

`git push origin main` 1회 → Vercel 자동 재배포 → 프로덕션이 `v60`(이후 #191 머지 시 `v61`) + 수정
데이터로 갱신. 검증:
```bash
curl -sS https://divine-office.vercel.app/sw.js | grep CACHE_VERSION              # v60+ 기대
curl -sS https://divine-office.vercel.app/api/loth/2026-06-13/vespers | grep -o 'Тэнгэрбурханд'  # 수정형 기대, Гэнгэр 없음
```
(push 는 사용자 승인 행위 — 본 리포트는 권고까지. A2HS/PWA 설치 기기는 재배포 후에도 SW activate
전까지 잔존 가능 → 강제종료·재실행/사이트데이터삭제로 해소. CLAUDE.md §"테스트가 못 잡는 것들".)

---

## 참고 (References)

- 본 리포트: `docs/bug-reports/2026-06-14-silent-staleness-process-gap.md`
  (사본: `/home/min/gdrive/bugreport/bugreport_silent_staleness_process_gap_20260614.md`)
- wi-191-001 RCA(배포 vs SW캐시 규명): `~/.claude/pair-cowork/scratch/dvo/goal191-cache-rca.md`
- 검증 명령: `git rev-list --left-right --count origin/main...main`,
  `git log --oneline origin/main..main`,
  `curl https://divine-office.vercel.app/{sw.js, api/loth/2026-06-13/vespers}`
- 정책 맥락: `CLAUDE.md` §"Service Worker 캐시 — 배포 회귀 1순위 리스크",
  §"테스트가 못 잡는 것들"(SW/A2HS 수동 확인).
- 사용자 분석 원문: GOAL #193 description (TaskGet #193, 2026-06-14).
