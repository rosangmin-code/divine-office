# g-44 — 폰트 설정 불일치 근본원인 (라이브 측정 조사)

> **TL;DR** — 폰트 **크기** 설정은 전 요소에 정상 적용된다(버그 없음). 문제는 폰트
> **서체(현대/고전)** 설정이다. 앱은 `font-serif` **단일 클래스**로 두 개의 다른
> 역할("본문 읽기 서체" + "장식 serif 제목")을 겸하게 만들어서, 서체 설정 레버가
> 이 둘을 분리 제어하지 못한다. 그 결과 **정작 읽는 기도 본문은 serif로 영구 고정
> (설정 무시)**되고, **바뀌면 안 되는 라벨/헤더/시편 마침 기도만 뒤집힌다** — 완전한
> 역전. "변수명 불일치" 가설은 라이브 측정으로 **반박됨**(부수적 dead code일 뿐).
> 근본 해결은 "읽기 서체"를 하나의 CSS 변수로 분리(권장안 A)해야 하며, 부분 패치는
> 재발한다. **본 문서는 조사·측정만 — 코드 변경 없음.**

- 조사자: dvo-dev-cl · 날짜: 2026-07-11 · 대상 GOAL: #70-sub-2 (g-44)
- 측정 방법: dev 서버 `localhost:3200` + Playwright(computed-style), 뷰포트 420×900,
  `/pray/2026-07-11/lauds`. `document.documentElement.dataset.font*` 를
  `settings.tsx` 와 동일하게 토글하며 `getComputedStyle` 측정.
- 측정 스크립트: `measure-font.mjs`(대표 요소), `enumerate-font.mjs`(본문 전 요소 전수).

---

## 1. 라이브 측정표 — 결정적 증거

### (A) 폰트 **크기** 토글 `md(100%) → xl(125%)`

| 렌더 요소 | 폰트 클래스 | md | xl | 스케일? |
|---|---|---|---|---|
| hero h1 | serif | 30px | 37.5px | ✅ |
| psalm-stanza (시편 본문) | serif | 16px | 20px | ✅ |
| psalm-phrase (rich) | (상속) | 16px | 20px | ✅ |
| psalm-prayer (시편 마침 기도) | (상속) | 16px | 20px | ✅ |
| responsory versicle | serif | 16px | 20px | ✅ |
| hymn body (Магтуу) | serif | 16px | 20px | ✅ |
| gospel-canticle verse | serif | 16px | 20px | ✅ |
| intercessions petition | serif | 16px | 20px | ✅ |
| reading body | serif | 16px | 20px | ✅ |
| section label (rubric) | (상속) | 12px | 15px | ✅ |

**결론: 크기 설정은 전 요소에 100% 적용된다.** `html[data-font-size]{font-size:%}`
가 루트 폰트크기를 바꾸고, 앱의 모든 텍스트 유틸(`text-base`/`text-sm`/`text-xs`…)이
**rem 기반**이라 함께 스케일된다. `src/` 전체에 px 하드코딩 폰트크기 **0건**(확인:
`grep 'text-\[.*px\]|font-size:.*px'` → none). → **크기 쪽은 버그 아님.**

### (B) 폰트 **서체** 토글 `sans → serif`

| 렌더 요소 | 폰트 클래스 | sans 모드 | serif 모드 | 설정 따름? |
|---|---|---|---|---|
| hero h1 | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| psalm-stanza (시편 본문) | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| psalm-phrase (rich) | (상속·serif조상) | Noto Serif | Noto Serif | ❌ 고정 |
| responsory versicle | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| hymn body (Магтуу) | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| gospel-canticle verse | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| intercessions body | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| reading body | **serif** | Noto Serif | Noto Serif | ❌ 고정 |
| **psalm-prayer (시편 마침 기도)** | (상속·body) | Noto **Sans** | Noto Serif | ⚠️ 바뀜 |
| **section label (rubric)** | (상속·body) | Noto **Sans** | Noto Serif | ⚠️ 바뀜 |

raw computed fontFamily (sans 기준): serif 요소 = `"Noto Serif","Noto Serif Fallback"`,
psalm-prayer/label = `"Noto Sans","Noto Sans Fallback"`. serif 모드에서 body computed
= `"Noto Serif","Noto Serif Fallback", serif` → **`var(--font-serif)` 가 Noto Serif 로
정상 해석됨**.

### 본문 전 요소 전수 열거 — 섹션별 "설정 따르는 요소 수 / 전체"

| 섹션 | 바뀜/전체 | 바뀌는 것 | 고정(serif) |
|---|---|---|---|
| Магтуу (찬가/hymn) | **2/16** | 라벨 "Магтуу", "Бусад магтуу" 버튼 | 본문 14 |
| Хариу залбирал (응송/responsory) | **1/7** | 라벨만 | 본문 6 |
| Psalm 92 / 8, Deut 32 (시편/성경) | 8~10/42~45 | h4 헤더, antiphon, "Шад дуулал N:" 라벨, **시편 마침 기도**, "Дууллыг төгсгөх" 라벨 | 본문 32~37 |
| Захариагийн магтаал (복음 canticle) | 5/31 | 라벨, antiphon, "Шад магтаал:" | 본문 26 |
| Гуйлтын залбирал (청원) | 1/11 | 라벨만 | 본문 10 |
| Уншлага (독서) | 2/3 | 라벨 + 출처 ref | 본문 |
| Төгсгөл / 마침 기도들 | 1~3/2~11 | 라벨/지시문 | 본문 |

> **사용자 신고 vs 측정 불일치 (중요):** 사용자는 "responsory + 일부 hymn 에만
> 적용"이라 했으나, 측정상 **responsory·hymn 본문은 오히려 안 바뀌는** 쪽이다
> (Магтуу 16개 중 2개, Хариу залбирал 7개 중 1개만 = 전부 라벨/버튼). 실제 패턴은
> "**모든 섹션의 라벨·헤더·antiphon·시편마침기도는 설정을 따르고, 정작 읽는 기도
> 본문은 전 섹션에서 serif 로 고정**". 사용자는 라벨/헤더가 바뀌는 걸 보고 그 근처
> 섹션(응송/찬가)에 귀속시킨 것으로 보인다. → 어느 쪽이든 **"본문이 설정을 안 따른다"
> 는 핵심 문제는 동일**하며 측정으로 확정된다.

시각 corroboration: sans↔serif 스크린샷 한 쌍 캡처(찬가+첫 시편 영역). 유일한 시각
차이는 라벨/헤더("МАГТУУ", "Шад дуулал 1:", "PSALM 92:2-9")뿐, 본문 절은 두 모드
완전 동일 = serif 고정 확인.

---

## 2. 근본원인

### 2.1 적용 메커니즘 (확인됨)
- `src/lib/settings.tsx` L204-206: `<html>` 에 `data-font-size` / `data-font-family`
  속성 부여. (SSR flash 방지용 inline script 도 `layout.tsx` `<head>` 에 동일 로직.)
- `src/app/globals.css` L47-56: 크기 = `html[data-font-size=*]{font-size:%}` (루트 스케일).
- `src/app/globals.css` L66-68: 서체 = 규칙 **딱 하나**
  `html[data-font-family="serif"] body { font-family: var(--font-serif), serif }`.
  → **`body` 요소 자신의 font-family 만** 바꾼다.
- `src/app/layout.tsx`: `next/font` 가 `Noto_Serif({variable:'--font-serif'})` /
  `Noto_Sans({variable:'--font-sans'})` 로 두 변수를 **실제 정의**하고 `<body>` className
  (`${notoSans.variable} ${notoSerif.variable} font-sans`)에 주입. 기본 body 서체 = sans.

### 2.2 핵심 원인 — 하나의 `font-serif` 클래스가 두 역할을 겸함
서체 설정은 `body` 의 상속 서체를 바꾸는 방식인데, **직접 부여된 `.font-serif` 유틸
클래스는 상속값을 항상 이긴다**(directly-applied property > inherited). 그리고 앱의 거의
모든 기도 본문 렌더 경로가 `font-serif` 를 **하드코딩**한다(21개 파일, `BODY_CLASS`
포함). 따라서:

- **설정을 따라야 하는 것**(= DESIGN.md `body-reading` 역할 = 기도 본문) → `font-serif`
  하드코딩 때문에 **serif 로 영구 고정, 설정 무시**.
- **설정을 따르면 안 되는 것**(= DESIGN.md `label`/`title` = sans 역할 = 라벨/헤더/
  시편마침기도) → 폰트 클래스가 없어 body 를 상속하므로 **설정에 끌려 뒤집힘**.

= **이중 역전.** `font-serif` 라는 단일 클래스가 (a) "본문 읽기 서체" 와 (b) "장식용
serif 제목(hero/heading)" 두 역할을 겸하기 때문에, 서체 설정이라는 레버로 한쪽만 움직일
수 없다.

### 2.3 "변수명 불일치" 가설 — 라이브로 **반박**
리더 예비발견 #2("`@theme` 은 `--font-family-serif` 정의, `var(--font-serif)` 미정의
→ 폴백 serif")는 **틀렸다**:
- `var(--font-serif)` 는 미정의가 아니라 `next/font` 가 body 스코프에 정의 → serif 모드
  body computed = Noto Serif 로 **정상 해석**(§1.B raw 측정).
- `@theme` 의 `--font-family-sans` / `--font-family-serif`(globals.css L6-7)는 **참조
  0건** = **완전한 dead code**. Tailwind v4 의 `.font-serif`/`.font-sans` 유틸은
  `--font-*` 네임스페이스(= next/font 가 채우는 변수)로 작동하지 `--font-family-*` 가
  아니다. → 이름 불일치는 **활성 버그와 무관**한 부수적 정리 대상일 뿐.

### 2.4 "3번 고쳤는데 재발" 의 구조적 이유
본문 서체가 **15+ 개 컴포넌트에 `font-serif` 로 분산 하드코딩**돼 있고, 설정 메커니즘은
`body` 상속 한 지점만 건드린다. 개별 패치(한 렌더 경로의 클래스 조정 / CSS 규칙 추가)는
나머지 하드코딩과 hero/본문 역할 겸용 문제를 못 건드려 **whack-a-mole**. SSOT(단일
"읽기 서체" 소스)가 없어 재발이 구조적으로 보장된다.

---

## 3. 렌더경로 매핑 (설정을 따르는가?)

| 렌더 경로 | 파일 | 현재 클래스 | 서체 설정 따름? | DESIGN.md 의도 역할 |
|---|---|---|---|---|
| 시편 본문 | `psalm-block.tsx` | `font-serif` | ❌ 고정 | body-reading (serif) — **따라야** |
| rich 본문(SoT) | `rich-content.tsx` `BODY_CLASS` | `font-serif` | ❌ 고정 | body-reading — **따라야** |
| 응송/찬가/독서/청원/canticle/주님기도/마침기도 | 각 section 컴포넌트 | `font-serif` | ❌ 고정 | body-reading — **따라야** |
| hero 제목 h1 | `pray/[date]/[hour]/page.tsx` L99 | `font-serif` | ❌ 고정 | display (serif) — **고정이 맞음** ✅ |
| 정적 안내/미사 페이지 | `guide/page.tsx`, `ordinarium/page.tsx` | `font-serif` | ❌ 고정 | (별도 판단 필요) |
| 섹션 라벨(루브릭) | 각 section 헤더 `<p class="text-xs …">` | (상속 body) | ⚠️ 뒤집힘 | label (sans) — **고정돼야** |
| 시편 헤더 h4 / antiphon / "Шад дуулал" | `psalm-block.tsx` | (상속 body) | ⚠️ 뒤집힘 | title/body-md (sans) — **고정돼야** |
| 시편 마침 기도 | `psalm-block.tsx` psalm-prayer | (상속 body) | ⚠️ 뒤집힘 | body-reading? (**의도 확인 필요**) |

핵심: "따라야 할 것(본문)"과 "고정돼야 할 것(라벨)"이 현재 **정확히 반대로** 동작.

---

## 4. 해결안 비교

**전제(의도된 동작):** 서체 설정 UI 라벨은 `sans='Орчин үеийн'(현대)` /
`serif='Сонгодог'(고전)` 이고 샘플 버튼이 해당 글꼴로 렌더된다 → 이 설정의 목적은
**"기도 본문 읽기 글꼴을 현대(sans)/고전(serif)으로 전환"**. 장식용 serif(hero/제목)와
sans 라벨의 DESIGN.md 구분은 **보존**해야 한다. (이 제품 의도 자체는 사용자 최종
확인 권장 — §6.)

### 안 A — "읽기 서체"를 단일 CSS 변수로 분리 (권장) ⭐
1. `globals.css`:
   ```css
   html { --reading-font: var(--font-sans), sans-serif; }            /* 현대(기본) */
   html[data-font-family="serif"] { --reading-font: var(--font-serif), serif; } /* 고전 */
   .font-reading { font-family: var(--reading-font); }
   ```
2. 기존 `html[data-font-family="serif"] body{…}` 규칙 **제거**(라벨 오뒤집힘의 원인).
   → body 는 항상 sans, 라벨/헤더는 DESIGN.md 대로 sans 고정.
3. 본문 렌더 경로의 `font-serif` → `font-reading` 로 교체(SoT: `rich-content.tsx`
   `BODY_CLASS` 한 곳이 rich 경로 전부 커버; psalm-block + 나머지 section).
4. hero h1(및 정적 제목)은 `font-serif` **유지**(장식 serif = 항상 serif).

- 장점: 설정이 **정확히 기도 본문만** 구동. DESIGN.md serif-hero/sans-label 완전 보존.
  단일 SoT(`--reading-font`) → 재발 종식(DV2 derive-from-SoT).
- 단점: 본문 렌더 파일 ~15개의 클래스 스왑. `.font-serif` 를 selector 로 쓰는 e2e 3파일
  갱신 필요(§5).
- 규모: globals.css 3~4줄 + 컴포넌트 기계적 치환.

### 안 B — CSS 최소 패치(변수명 정합 + sans 규칙 추가 + specificity 상향)
- 내용: `@theme` 변수명 정정/삭제 + `html[data-font-family="sans"] body{…}` 규칙 추가 +
  `.font-serif` 를 이기도록 specificity/`!important` 상향.
- **부적합**: `.font-serif` 를 blanket override 하면 **hero/제목 장식 serif 도 같이
  sans 로 뒤집힌다**(본문과 hero 가 같은 클래스라 구분 불가). = 근본원인(역할 겸용)을
  못 건드림 → 또 다른 회귀. 사실상 whack-a-mole 의 CSS 버전.

### 안 C — 현상 유지 + 설정 제거/문서화
- 서체 설정이 본질적으로 본문에 못 미친다면 설정을 **숨기거나** "라벨/부가 텍스트에만
  적용" 으로 축소. 사용자 기대(본문 전환)와 어긋나므로 **비권장**, 단 빠른 임시
  조치로는 가능.

---

## 5. 영향범위 · 회귀 리스크 (권장안 A 기준)

**변경 표면(참고 — 본 조사에서는 변경 안 함):**
- `src/app/globals.css` (변수 + 유틸 + 규칙 제거)
- 본문 렌더 `font-serif` 보유 파일 중 **본문** 대상만: `rich-content.tsx`(`BODY_CLASS`),
  `psalm-block.tsx`, `responsory-section.tsx`, `gospel-canticle-section.tsx`,
  `intercessions-section.tsx`, `short-reading-section.tsx`, `our-father-section.tsx`,
  `concluding-prayer-section.tsx`, `marian-antiphon-section.tsx`, `invitatory-section.tsx`,
  `opening-versicle-section.tsx`, `hymn-section.tsx`(fallback), `examen/dismissal/blessing`.
  **제외(serif 유지)**: `pray/[…]/page.tsx` h1, `guide/page.tsx`, `ordinarium/page.tsx`(별도 판단).

**회귀 리스크:**
- 🟡 **e2e selector 결합**: `e2e/prayer-sections.spec.ts`(L107/123/278/281),
  `e2e/mobile.spec.ts`(L98)가 `.font-serif` 를 **기능 검증 selector** 로 사용 → 본문
  클래스 rename 시 깨짐. **완화**: 프로젝트 CLAUDE.md 원칙대로 `data-role` selector 로
  이관(권장) 또는 해당 테스트 갱신.
- 🟢 **메커니즘 e2e 안전**: `e2e/settings.spec.ts` L103-109 는 `data-font-family` **속성**
  만 검증 → 클래스 변경과 무관, 통과.
- 🟢 **단위 테스트 안전**: `settings.test.ts`(migrateSettings 검증)는 CSS 무관.
- 🟡 **SW 캐시**: CSS/클래스 변경은 정적 자산 내용 변경 → `public/sw.js` `CACHE_VERSION`
  bump 필요(CLAUDE.md 배포 회귀 1순위). 링크/Content-Type 변경은 없음.
- 🟢 **DESIGN.md 정합**: 안 A 는 body-reading(serif 기본)·label(sans)·display(serif)
  토큰 의도를 그대로 보존/강화.

---

## 6. 후속 결정 필요 (사용자)
1. **서체 설정의 정확한 범위**: (a) 기도 본문만 전환(권장·안 A) / (b) 본문+헤더까지 /
   (c) 설정 축소·제거(안 C). — UI 라벨상 (a)가 의도로 보이나 확정 필요.
2. **시편 마침 기도(psalm-prayer)** 를 "읽기 본문"(설정 따름)으로 볼지, 부가 텍스트로
   볼지 — 현재는 sans 상속이라 설정에 끌려 뒤집힘.
3. **정적 페이지**(guide/ordinarium)의 본문도 설정을 따르게 할지.
4. `@theme --font-family-*` dead code 삭제 여부(별도 소소 정리).

---

## 부록 — 측정 재현
```bash
# dev 서버(localhost:3200) 기동 상태에서
NODE_PATH=/home/min/myproject/divineoffice/node_modules \
  node measure-font.mjs      # 대표 요소 × (size/family) 변화표
  node enumerate-font.mjs    # 본문 전 요소 전수 열거 + 섹션 집계
```
(스크립트는 `document.documentElement.dataset.font*` 를 `settings.tsx` 와 동일하게
토글하고 `getComputedStyle().fontSize/fontFamily` 를 before/after 측정한다.)
