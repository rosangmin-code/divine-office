# 인계 — 2026-09-13~17 전체 리뷰 세션

- **시작**: `94c89bc` / **끝**: `20bb333` (68 커밋, 전부 `origin/main` push·배포 완료, CI green)
- **작업 트리 clean, worktree·잔여 서버 없음**
- 종합 리뷰: `docs/app-review-2026-09-13.md` (§1 P0, §3 영역별, §7 e2e 101건, §8 전야 저녁기도, §9 주일 EP II)

---

## 1. 완료 (전부 배포됨)

### 전례 정확성 — 사용자 화면에 실제로 잘못 나가던 것
| 건 | 증상 | 커밋 |
|---|---|---|
| 연중 주일 본기도·후렴 | 시즌 카운터 `weekOfSeason` 으로 조회해 **모든 연중 주일**이 다른 주일 것 | `f769a5f` |
| 성삼일 | romcal 시즌 키 `'Holy Week'`(공백) 오타로 사순 1주 리셋, 6주 데이터 도달 불가 | `1eca5c7` |
| 주일 sanctoral 덮어쓰기 | MM-DD 단독 조회로 2028 사순 3주일이 "성 요셉" 등 | `4036840` |
| 토요일 저녁 대체 본기도 | 승격된 날 rank + 전야 요일을 섞어 판정 → **매 토요일(연 46회)** alternate | `becef1f` |
| rich 오염 26셀 | rich 가 plain 과 다른 소스에서 옴(모든 성인 당일에 연중 주일 본기도 등). UI 는 rich 우선이라 화면이 틀림 | `2601f59` |
| 주일 EP I 병합 | 사순·부활·대림 주일 제1저녁기도 독서·응송·청원이 시편집 발췌 | `17014b2` |
| **주님 공현** | romcal 이름 `"Epiphany"` 매칭 실패로 **매년 후렴·본기도 빈 값** | `8a95846` |
| 주일 제2저녁기도 | 주일 당일 저녁이 EP I 후렴 사용 (2026년 41회) + 데이터 4건 | `8a95846`, `a506ab6` |
| 성가정·세례 전야 | FEAST 특수키가 승격 경로에서 배제 | `dd82856` |

### 기반
- `next` 16.2.4 → 16.3.5, `pdfjs-dist` 5.6.205 → 6.3.289 → **audit 취약점 0**
- CI 강화: `next build` + audit(high) + 핵심 UI e2e 258케이스 + nightly 전체 e2e
- `verify:all`(14종) CI 연결, 검증기 RED 정리, plain↔rich parity verifier 신설
- UI e2e 사문화 101건 정리 (전체 934 통과)
- 시편 헤더 영문 참조 → 몽골어(`Дуулал 63:2-9`), settings localStorage 보호
- 접근성: 풋터 패널 dialog 시맨틱·포커스 복원, 공용 listbox(드롭다운 4곳 키보드·ARIA), radiogroup roving

---

## 2. 사용자 액션 대기

1. **Vercel Deployment Checks 등록** (이것만 하면 배포 게이트 완성 — 지금은 CI 실패해도 push 즉시 배포)
   - `vercel.com/…/divine-office/settings/build-and-deployment` → Deployment Checks → GitHub provider
   - job 2개 **둘 다** Required: `Lint · Typecheck · Unit tests`, `Playwright · API smoke + core UI`
   - (quality 실패 시 e2e 는 skipped → 하나만 걸면 통과로 셀 수 있음)
   - 전제: Settings → Environments → Production 의 "Auto-assign Custom Production Domains" ON
   - Hobby 에서 메뉴가 안 보이면 fallback 은 `scratchpad/gate/plan.md` §4.3 (GH Actions + Vercel CLI)
2. **실기기 1건**: 이전 SW(v83) 등록된 브라우저에서 `/pdf/58` → PDF 뷰어 정상 여부 (워커 자산 교체 + 24h HTTP 캐시 시나리오, Playwright 재현 불가)

---

## 3. 남은 과제 (착수 안 함)

| 우선 | 항목 | 메모 |
|---|---|---|
| 중 | CI Node 20 → 22 | `pdfjs-dist@6` engines `>=22.13`, Node 20 EOL. 현재 EBADENGINE 경고만 |
| 중 | 2027-12-25 토요일 성탄 카드 | `keepsSundayEveningPrayerII` 가 특권 **주일**만 보호 → 토요일 대축일 미보호, 본문↔카드 불일치 (기존 버그) |
| 중 | 잘못된 URL 이 HTTP 200 | `notFound()` 가 `loading.tsx` 스트리밍 뒤라 상태코드 미부착 (`/pray/2026-02-29/lauds`, `/pdf/0`) |
| 중 | 2028-01-01 → 공현 제1저녁기도 미승격 | 책이 공현 EP I 을 별도 블록으로 인쇄하지 않음 → **데이터 설계 결정 필요** |
| 낮 | 색 대비 H4 | `text-stone-400` 3.23:1 등, DESIGN.md 자체 AA 4.5:1 미달 |
| 낮 | 스위치 터치 타겟 | 28×48px (44px 미달) |
| 낮 | 대림·사순·부활 EP II 청원 rich | `w{1,6}-SUN-vespers2.rich.json` 에 shortReading 만 저작 (평문은 정상) |
| 낮 | `epiphanyWeek` 도달 불가 | 날짜 범위 매칭 미구현 |
| 낮 | 리포 위생 | 연구 shard 28MB·`scripts/out` 4MB 추적, loose 4,261개, `scripts/archive` 분류 |
| 낮 | docs 아카이브 | 루트 98 중 68이 완료 로그, README 없음 |

---

## 4. 이 세션에서 굳어진 작업 방식 (재사용 권장)

- **전례 로직 변경 검증 = main↔브랜치 전일자 지문 diff 스윕.** `assembleHour` 를 전 날짜 × 시간경으로 돌려 day 필드·섹션·후렴·본기도·rich page 를 비교하고 **"바뀐 셀이 의도한 범주뿐"** 을 표로 확인. 스크립트 패턴: 세션 scratchpad `eve/sweep.js`, `pd3/`, `vsp2fix/`.
- **데이터↔PDF 판정은 인쇄면 렌더로.** `pdftotext -f N -l N -layout` 로 물리 페이지 찾고 `pdftoppm -r 200 -png` 렌더 → PIL 크롭 → 이미지를 직접 보고 판독. 추출 텍스트만으로 판정 금지. (책 587 = 물리 294, 오프셋 ≈ -293)
- **worktree 에이전트의 함정**: SoT(`parsed_data/`, `public/psalter.pdf`) 가 gitignore 라 worktree 에서 `it.skipIf` 로 건너뛰는 테스트가 있다. 에이전트가 "전부 통과" 로 보고해도 **머지 후 main 에서 재실행**해야 한다. pdfjs 이관의 파서 회귀(82건)가 이렇게 드러났다.
- **`CACHE_VERSION` bump 기준 정리**: 고정 URL 자산의 *내용* 변경 + SW 로직 변경만. SSR HTML 변경은 navigation 이 network-only 라 불필요, `_next/static` 은 content-hash 라 불필요. v84(pdf.worker 교체)가 이 기준의 첫 사례. 이전 v42~v83 은 대부분 불필요한 보수적 bump.
- **rich 는 plain 과 같은 소스여야 한다**(`applyRichSourceParity`). UI 가 rich 우선 렌더라 rich 가 틀리면 화면이 틀린다. rich 관련 변경 시 plain↔rich page 일치 전수 확인.
