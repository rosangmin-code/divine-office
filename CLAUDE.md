# CLAUDE.md — Claude Code 작업 지침

이 프로젝트는 몽골어 성무일도(Liturgy of the Hours) Next.js 16 App Router 웹앱이다. 전체 기능/아키텍처는 `docs/PRD.md` 를 참고한다. 이 문서는 그 위에 **Claude 가 놓치기 쉬운 운영적 체크포인트** 만 얇게 얹는다.

---

## Service Worker 캐시 — 배포 회귀 1순위 리스크

`public/sw.js` 가 운영 중이다. Vercel 배포가 자동화되어 있어서 **기존 사용자 브라우저에 이전 버전 자산이 남아 있는 상태에서 새 코드가 내려간다**. 아래 변경은 전부 `sw.js` 와 함께 검토해야 한다:

- **링크 스키마 변경** — 앵커 href / target / rel, Next.js `<Link>` 경로 변경, 외부 URL ↔ 내부 라우트 전환
- **새 라우트 추가** — 링크 대상이 기존 캐시에 없는 URL 이 되는 경우
- **응답 Content-Type 변경** — HTML 이 JSON 이 되거나 PDF 가 HTML 이 되는 등
- **public/ 자산 경로 변경** — 이미지/폰트/워커 파일명 변경

**Navigation (HTML) 은 `network-only` 를 유지한다.** `caches.put(htmlResponse)` 는 절대 추가하지 않는다. 한번 캐시된 구 HTML 은 네트워크가 살아있어도 계속 서빙되어 **모바일 사용자에게 깨진 링크** 를 노출한다. 이 버그로 FR-017i 가 한 번 실족했다 (`b3d0ad7` 참고).

**`CACHE_VERSION` bump 기준**: 정적 자산 경로/내용 변경, 프리캐시 대상 변경, SW 자체 로직 변경이 있으면 `divine-office-vN` 을 올린다. `activate` 훅이 이전 버전 캐시를 전체 삭제한다. bump 를 빠뜨리면 구 자산이 `cache-first` 로 무한 서빙된다.

---

## 테스트가 못 잡는 것들

Playwright (`e2e/`) 는 매 테스트마다 깨끗한 브라우저 컨텍스트에서 돈다 — **기존 SW 등록이 있는 사용자 상태를 절대 재현하지 않는다**. 아래 시나리오는 테스트 통과해도 실제 모바일에서 깨질 수 있으므로 수동 확인이 필요하다:

- 이전 배포의 HTML 이 캐시된 브라우저에서의 동작
- Add-to-Home-Screen 으로 설치된 PWA 의 업그레이드 경험
- 느린 모바일 네트워크에서의 `network-first` fallback

PDF 뷰어 (`/pdf/[page]`) 는 `pdfjs-dist` 를 client dynamic import 로 로드한다. 서버 컴포넌트에서 import 하면 빌드가 깨진다. `src/components/pdf-viewer.tsx` 안에서만 `import('pdfjs-dist')` 호출할 것.

---

## 몽골어 UI — 교정 흔함

- "Гуйлтын" 이 옳다 (❌ `Гүйлтын`). 기도문 본문·`aria-label`·테스트 selector 전부 동일.
- "Зургаадугаар" (❌ `Зургадугаар`), dismissal 은 "Төгсгөл" (❌ `Илгээлт`).
- 외부 링크 텍스트와 aria-label 은 모두 몽골어 키릴. 영어 혼입 금지 (NFR-002).

---

## FR 번호 규칙

- 새 기능은 기존 범위 내에서 다음 번호를 쓴다 (예: `FR-017i` → `FR-017j`, `FR-032` → `FR-033`, `FR-142` → `FR-143`).
- 같은 기능군의 세부 변형은 알파벳 suffix (`FR-017a..i`) 로 묶는다.
- `docs/PRD.md` 의 해당 섹션 표에 한 행 추가 + `docs/traceability-matrix.md` 동시 갱신이 원칙.

---

## 변경 체크리스트 (self-review)

코드 변경을 커밋하기 전 다음을 소리 내어 확인한다:

- [ ] 링크/URL/자산 경로/Content-Type 중 하나라도 바뀌었는가? → `sw.js` navigation 정책 & `CACHE_VERSION` 검토
- [ ] 모바일에서 실제로 돌려봐야 하는 시나리오인가? → Playwright 만으로 끝내지 말 것
- [ ] 몽골어 라벨에 오타 없는가? → PDF 원문 맞춤법 기준
- [ ] PRD / traceability-matrix 의 해당 FR 행이 현재 구현과 일치하는가?
- [ ] 새 섹션 타입 / HourSection variant 를 추가했으면 `HourSection` 개수 (`docs/PRD.md` §5.1) 가 맞는가?
