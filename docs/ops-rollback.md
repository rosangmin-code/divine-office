# 운영 롤백 절차 (Vercel · GitHub · Service Worker)

대상: `divine-office.vercel.app` 프로덕션. 1인 운영 기준 1페이지.
전제(2026-09 이후): main push → CI(`Lint · Typecheck · Unit tests`, `Playwright · API smoke + core UI`)
→ Vercel Deployment Checks 통과 시에만 프로덕션 도메인 승격.

## 0. 먼저 판단할 것 (30초)

| 증상 | 조치 |
|---|---|
| 방금 배포 직후 화면/링크 깨짐, 원인 불명 | **A. Instant Rollback** (수 초) → 이후 B 로 영구 수정 |
| 원인 커밋을 알고 있고 되돌리기가 단순 | **B. `git revert` + push** (CI ≈5분 후 반영) |
| SW/캐시가 의심(새로고침해도 구 화면, 링크가 옛 주소) | **C. SW 관점 점검** 후 A 또는 B |
| Vercel 자체 장애 | https://www.vercel-status.com — 롤백으로 못 고침 |

## A. Instant Rollback (Vercel 대시보드)

1. https://vercel.com/rosangmin-3807s-projects/divine-office → Production Deployment 타일 → **Instant Rollback**.
2. 대상 선택 → Continue → 도메인 목록 확인 → **Confirm Rollback**. 재빌드 없이 도메인만 이전 배포로 붙는다.
3. **Hobby 플랜은 "직전 배포" 1개로만 롤백 가능.** 두 단계 이상 되돌리려면 B.
4. ⚠ 롤백 후 Vercel 은 **프로덕션 도메인 자동 할당을 끈다** — 이후 main 에 push 해도 프로덕션이 안 바뀐다.
   수정 커밋을 배포할 준비가 되면 반드시 **Undo Rollback**(타일의 버튼) 또는 `vercel promote <deployment-url>` 로 자동 할당을 되살린다.
5. 롤백은 환경변수·외부 상태를 되돌리지 않는다(이 앱은 외부 DB 없음, 해당 없음).
6. CLI 대안(로컬에 Vercel 로그인이 있을 때만): `vercel rollback [deployment-id]`, 되돌리기 `vercel promote [deployment-id]`.

## B. `git revert` + push (영구 수정)

```bash
git log --oneline -5                       # 문제 커밋 확인
git revert --no-edit <sha>                 # 머지 커밋이면 -m 1
git push origin main
gh run watch                               # CI green → Deployment Checks 통과 → 자동 승격
curl -s https://divine-office.vercel.app/ | grep -oE '/_next/static/[^/]+/' | head -1   # buildId 변경 확인
```

- A 를 먼저 했다면 push 전에 **Undo Rollback** 을 해야 새 배포가 프로덕션에 붙는다.
- CI 가 빨간불이면 배포되지 않는다(게이트가 의도대로 작동). 긴급하면 Vercel Deployments → 해당 배포 → **Force Promote** (게이트 우회 — 사후에 반드시 CI 복구).

## C. Service Worker 관점 안전성

- `public/sw.js` 는 `no-store` 로 서빙되고, `activate` 가 `CACHE_VERSION` 과 **다른 이름의 캐시를 전부 삭제**한다(크고 작음이 아니라 "다름"). 따라서 v83 → v82 로 되돌아가도 브라우저는 바이트가 달라진 sw.js 를 새로 설치하고 v83 캐시를 지운다. **롤백은 SW 관점에서 전진 배포와 동일하게 안전하다.**
- HTML(navigation) 은 `network-only` 라 롤백 즉시 구 HTML 이 서빙된다. `_next/static/*` 는 content-hash 라 구 HTML 이 참조하는 청크는 롤백된 배포가 그대로 제공한다.
- 남는 리스크(전진 배포와 동일): 롤백 시점에 **열려 있던 탭**이 신 빌드의 lazy chunk 를 요청하면 404 → 새로고침으로 해소. 사용자에게 "앱을 완전히 닫았다 열기" 안내.
- 롤백 대상 배포와 현재 배포의 `sw.js` 가 바이트 단위로 같으면(SW 무변경 배포 사이) SW 는 재설치되지 않지만, 그 경우 캐시에 HTML 이 없으므로 문제 없음.
- **하지 말 것**: 롤백을 위해 `CACHE_VERSION` 을 손으로 올린 커밋을 급히 push — 그건 B 경로(CI 통과 필요)이고, 롤백 자체엔 불필요.

## D. 롤백 후 체크리스트

- [ ] `curl -sI https://divine-office.vercel.app/ | grep -i x-vercel-id` 200 확인, `/sw.js` 의 `CACHE_VERSION` 이 기대 값인지 `curl -s …/sw.js | grep -oE 'divine-office-v[0-9]+'`
- [ ] 모바일 실기기(A2HS 포함)에서 앱 완전 종료 후 재실행 → 화면 정상 (CLAUDE.md "테스트가 못 잡는 것들")
- [ ] A 를 썼다면 **Undo Rollback** 했는지 (안 하면 다음 배포가 조용히 프로덕션에 안 붙음 — 2026-06-13 "36커밋 미배포" 류 사고 재발 경로)
- [ ] `docs/bug-reports/` 에 원인·로그 기록 (memory: 버그 발생 시 로그 포함 리포트)
