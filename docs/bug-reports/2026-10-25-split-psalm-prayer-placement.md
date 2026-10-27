# 분할 시편의 마침 기도 — I부 뒤에 나오거나, 두 번 나오거나, 아예 없음

- **발견**: 2026-10-24, 시편 139·144 II부 복원 중(`2026-10-24-psalter-139-missing-144-duplicate-verses.md` §7)
- **상태**: 수정 완료 2026-10-25 (사용자 지시 "마침 기도 위치 고쳐"). I부 뒤 영광송도 2026-10-27 책대로 뺌 (사용자 지시 "책대로 영광송 빼") — §6
- **영향**: 4주간 시편집의 분할 시편 10건 중 7건. 연중·대림·사순·부활 시기 모두 시편집을 쓰는 날이면 매번 나간다

---

## 1. 책의 규칙

책은 I부/II부로 나뉜 시편의 마침 기도(`Дууллыг төгсгөх залбирал`)를 **II부 뒤에 한 번만** 인쇄한다. 분할 시편 10건 전부 같다. I부 뒤에는 영광송도 기도도 없이 바로 II부 후렴이 온다(p.204 인쇄면 확인).

인쇄면 행 추출(`docs/research/split-psalm-part2/extract_shared.py` 의 `column_lines`)로 부 표지·영광송·기도 제목 순서를 본 결과:

```
ps27   p.118 II → p.119 Эцэг, Хүү… → p.119 Дууллыг төгсгөх залбирал
ps45   p.204 II → p.205 Эцэг, Хүү… → p.205 Дууллыг төгсгөх залбирал
ps49   p.220 II → p.221 Эцэг, Хүү… → p.221 Дууллыг төгсгөх залбирал
ps72   p.256 II → p.257 Эцэг, Хүү… → p.257 Дууллыг төгсгөх залбирал
ps132  p.369 II → p.369 Эцэг, Хүү… → p.369 Дууллыг төгсгөх залбирал
ps135  p.385 II → p.386 Эцэг, Хүү… → p.386 Дууллыг төгсгөх залбирал   (제3주간 금 저녁)
ps135  p.428 Дуулал 135:1-12 → p.429 Эцэг, Хүү… → p.429 Дууллыг…      (제4주간 월 아침, 단독)
ps136  p.434 II → p.435 Эцэг, Хүү… → p.435 Дууллыг төгсгөх залбирал
ps139  p.466 II → p.467 Эцэг, Хүү… → p.467 Дууллыг төгсгөх залбирал
ps144  p.481 II → p.482 Эцэг, Хүү… → p.482 Дууллыг төгсгөх залбирал
ps145  p.498 II → p.499 Эцэг, Хүү… → p.499 Дууллыг төгсгөх залбирал
```

## 2. 데이터는 어땠나

```
$ node -e '…week-*.json 에서 같은 시편 번호가 연달아 나오는 슬롯 + psalter-texts.json 기도…'
w1 WED vespers [0] Psalm 27:1-6       prayer=—
w1 WED vespers [1] Psalm 27:7-14      prayer=—                  ← 책 p.119 기도 없음
w2 MON vespers [0] Psalm 45:2-10      prayer=p.205 «Эзэн Есүс минь, Та бие махбод…»   ← I부에 붙음
w2 MON vespers [1] Psalm 45:11-18     prayer=—
w2 TUE vespers [0] Psalm 49:1-13      prayer=p.221 …   ← I부
w2 TUE vespers [1] Psalm 49:14-21     prayer=—
w2 THU vespers [0] Psalm 72:1-11      prayer=—
w2 THU vespers [1] Psalm 72:12-19     prayer=—                  ← 책 p.257 기도 없음
w3 THU vespers [0] Psalm 132:1-10     prayer=p.369 …   ← I부
w3 THU vespers [1] Psalm 132:11-18    prayer=—
w3 FRI vespers [0] Psalm 135:1-12     prayer=p.386 «Эцэг минь, Таны нэр алдар…»   ← 두 번
w3 FRI vespers [1] Psalm 135:13-21    prayer=p.386 «Эцэг минь, Таны нэр алдар…»
w4 MON vespers [1] Psalm 136:10-26    prayer=p.435 …   ✅
w4 WED vespers [1] Psalm 139:13-18, 23-24 prayer=p.undefined …   ← 쪽수 없음
w4 THU vespers [1] Psalm 144:9-15     prayer=p.482 …   ✅
w4 FRI vespers [0] Psalm 145:1-13     prayer=p.499 …   ← I부
w4 FRI vespers [1] Psalm 145:14-21    prayer=—
```

시편 45·49·132·145 의 rich 기도는 `source.id` 가 처음부터 II부 이름(`psalter-text-psalm-45-11-18-psalm-prayer` 등)이었다. 2026-08-08 II부를 따로 떼어 낼 때(`2026-08-08-split-psalm-part2-missing.md`) 기도가 I부 키에 남은 것으로 보인다. 기도 본문 자체는 6건 모두 인쇄면과 글자가 같았다.

## 3. 수정

재현 자료: `docs/research/split-psalm-prayer-placement/build.mjs` (`--write`).

| 시편 | 바꾼 것 |
|---|---|
| 45·49·132·145 | 기도(plain `psalmPrayer`·`psalmPrayerPage`, rich `psalmPrayerRich`)를 I부 키에서 II부 키로 옮김 |
| 27 | `Psalm 27:7-14` 에 p.119 기도 추가 (plain + rich) |
| 72 | `Psalm 72:12-19` 에 p.257 기도 추가 (plain + rich) |
| 135 | `135:1-12` 는 제4주간 월 아침에 단독 시편이라(p.429 기도) 카탈로그 기도를 뗄 수 없다. 제3주간 금 저녁 I부 자리(`week-3.json`)에만 `omitPsalmPrayer: true` (→ 2026-10-27 `continuesInNextPart` 로 바뀜, §6) |
| 139 | II부 기도 쪽수 `psalmPrayerPage: 467` |

`omitPsalmPrayer` 는 새 자리별 필드다(`PsalmEntry`, `PsalmEntrySchema`). `resolvePsalm` 의 두 return site 끝에서 기도 글·rich·쪽수를 모두 지운다. 기존 자리별 덮어쓰기(`psalmPrayer`·`psalmPrayerPage`, F-X2)와 같은 자리에 둔다.

새로 넣은 두 기도는 인쇄면 PNG(p.119, p.257)로 글자를 대조했다. «ерөөлтэй еэ», «хотол төгс» 등은 인쇄 그대로다.

## 4. 회귀 방지

`src/lib/__tests__/data/split-psalm-part2.test.ts` — "분할 시편의 마침 기도는 마지막 부 뒤에 한 번만 나온다": 모든 시간전례에서 같은 시편 번호가 연달아 나오는 묶음을 찾아, resolver 와 같은 우선순위로 자리별 실효 기도를 계산한다. 앞 부에 기도가 있거나, 마지막 부에 기도·쪽수가 없으면 실패한다. 묶음 수 10 과 135:1-12 단독 자리(제4주간 월 아침)의 기도 유지도 고정한다.

수정 전 데이터로 돌리면 12건을 잡는다:

```
- "week-1 WED vespers Psalm 27 — 마지막 부 Psalm 27:7-14 에 기도 없음",
- "week-2 MON vespers Psalm 45 — 앞 부 Psalm 45:2-10 에 기도",
- "week-2 MON vespers Psalm 45 — 마지막 부 Psalm 45:11-18 에 기도 없음",
- "week-2 TUE vespers Psalm 49 — 앞 부 Psalm 49:1-13 에 기도",
- "week-2 TUE vespers Psalm 49 — 마지막 부 Psalm 49:14-21 에 기도 없음",
- "week-2 THU vespers Psalm 72 — 마지막 부 Psalm 72:12-19 에 기도 없음",
- "week-3 THU vespers Psalm 132 — 앞 부 Psalm 132:1-10 에 기도",
- "week-3 THU vespers Psalm 132 — 마지막 부 Psalm 132:11-18 에 기도 없음",
- "week-3 FRI vespers Psalm 135 — 앞 부 Psalm 135:1-12 에 기도",
- "week-4 WED vespers Psalm 139 — 마지막 부 Psalm 139:13-18, 23-24 기도 쪽수 없음",
- "week-4 FRI vespers Psalm 145 — 앞 부 Psalm 145:1-13 에 기도",
- "week-4 FRI vespers Psalm 145 — 마지막 부 Psalm 145:14-21 에 기도 없음",
```

`src/lib/hours/resolvers/__tests__/psalm.test.ts` — `omitPsalmPrayer` 가 카탈로그 경로·성경 폴백 경로 모두에서 기도 글·rich·쪽수를 지우는지(쪽수 덮어쓰기가 있어도).

## 5. 검증

- vitest 2206 통과(+3), lint·tsc 0, `verify:all` 14/14(plain↔rich parity 포함), `audit-psalter-ref-consistency` suspects 0, `verify-psalter-pages` verified-correction 0, traceability OK.
- 운영 빌드 + Playwright(393px), 11개 화면에서 시편별 기도 위치:

```
Ps 27  /pray/2026-11-18/vespers   27:1-6 —        27:7-14 기도
Ps 45  /pray/2026-11-23/vespers   45:2-10 —       45:11-18 기도
Ps 49  /pray/2026-11-24/vespers   49:1-13 —       49:14-21 기도
Ps 72  /pray/2026-11-26/vespers   72:1-11 —       72:12-19 기도
Ps 132 /pray/2026-11-05/vespers   132:1-10 —      132:11-18 기도
Ps 135 /pray/2026-11-06/vespers   135:1-12 —      135:13-21 기도
Ps 135 /pray/2026-10-12/lauds     135:1-12 기도 (단독)
Ps 136 /pray/2026-11-09/vespers   136:1-9 —       136:10-26 기도
Ps 139 /pray/2026-11-11/vespers   139:1-12 —      139:13-18, 23-24 기도
Ps 144 /pray/2026-11-12/vespers   144:1-8 —       144:9-15 기도
Ps 145 /pray/2026-11-13/vespers   145:1-13 —      145:14-21 기도
console errors: 0
```

- CI 코어 e2e(CI 설정) 278 통과.

## 6. I부 뒤 영광송 — 2026-10-27 책대로 뺌

### 6.1 책

책은 I부 끝에 영광송(`Эцэг, Хүү, Ариун Сүнсэнд жавхланг…`)도, Benedicite 처럼 «영광송을 하지 않는다» 루브릭도 싣지 않는다. I부 본문 다음 행이 바로 `Шад дуулал 2` 다. 앱은 I부 자리도 `gloria_patri: true` 라 I부 뒤에 영광송 전문을 보여 주고 있었다.

`docs/research/split-psalm-prayer-placement/scan-gloria.py` — I부 시작 쪽부터 II부 끝 쪽까지 표지 행 순서. I부 앞의 `Эцэг, Хүү…` (p.116·367·464) 는 시작 기도의 영광송이다:

```
== ps45                                   == ps132
  p.203  Шад дуулал 1 Та бол мөнх бус…      p.367  Эцэг, Хүү, Ариун Сүнсэнд жавхланг   ← 시작 기도
  p.203  Дуулал 45                          p.367  Шад дуулал 1 Аяа, Эзэн минь, …
  p.204  Шад дуулал 2 Сүйт залуу энд…       p.367  Дуулал 132
  p.204  II                                 p.368  Шад дуулал 2 Эзэн Сионыг …
  p.205  Эцэг, Хүү, Ариун Сүнсэнд…          p.369  II
  p.205  Дууллыг төгсгөх залбирал           p.369  Эцэг, Хүү, Ариун Сүнсэнд жавхланг…
                                            p.369  Дууллыг төгсгөх залбирал
```

10건 모두 같은 모양이다(전체 출력은 스크립트로 재현). I부가 끝나는 자리 10곳을 인쇄면 PNG 로도 봤다 — p.117(27)·204(45)·220(49)·255(72)·368(132)·384(135)·433(136)·465(139)·481(144)·498(145). 모두 I부 마지막 행 다음이 빈칸 또는 II부 후렴이다. (p.465 시편 139 II부 후렴은 책에 `Шад дуулал 1` 로 찍혀 있다 — 조판 번호 오식으로 보이며 앱은 자리 순서대로 2 를 붙인다. 이번 범위 밖.)

### 6.2 수정

재현 자료: `docs/research/split-psalm-prayer-placement/build-gloria.mjs` (`--write`).

- 앞 부 자리 10곳(`week-1~4.json`): `gloria_patri: false` + 새 필드 `continuesInNextPart: true`.
- `gloria_patri: false` 만 두면 Benedicite 용 루브릭 «Эцэг, Хүү, Ариун Сүнсэнд жавхланг... уншихгүй» 가 뜬다(FR-128). 책은 I부 뒤에 그 루브릭도 싣지 않으므로 `psalm-block.tsx` 는 `continuesInNextPart` 이면 둘 다 그리지 않는다.
- `continuesInNextPart` 는 §3 의 `omitPsalmPrayer` 를 대체한다 — "앞 부 뒤에는 영광송도 기도도 없다" 는 같은 책 규칙이라 표시 하나로 묶었다. `resolvePsalm` 두 return site 가 마침 기도(글·rich·쪽수)를 지우고 표시를 `AssembledPsalm` 으로 넘긴다. `loth-service.ts` 의 resolve 실패 자리표시자도 표시를 넘긴다.
- 135:1-12 제4주간 월 아침 단독 자리는 그대로(`gloria_patri: true`, 기도 p.429).

### 6.3 회귀 방지

- `split-psalm-part2.test.ts` — "분할 시편의 영광송은 마지막 부 뒤에만": 앞 부는 `gloria_patri: false` + `continuesInNextPart`, 마지막 부는 `gloria_patri: true`, 앞 부 밖의 `continuesInNextPart` 금지, 앞 부 수 10, 135:1-12 단독 자리 영광송 유지.
- `psalm-block-gloria.test.ts` — 영광송 줄 세 갈래(전문 / Benedicite 루브릭 / 앞 부는 둘 다 없음).
- `psalm.test.ts` — 두 return site 모두 `gloriaPatri: false` 와 `continuesInNextPart: true` 를 넘긴다.

수정 전 데이터·UI 로 돌린 결과(복원 후 재확인):

```
× renders neither for a split psalm Part I (continuesInNextPart)
× 분할 시편의 마침 기도는 마지막 부 뒤에 한 번만 나온다
+   "week-3 FRI vespers Psalm 135 — 앞 부 Psalm 135:1-12 에 기도",
× 분할 시편의 영광송은 마지막 부 뒤에만 — 앞 부는 영광송도 생략 루브릭도 없다
+   "week-1 WED vespers Psalm 27:1-6 — 앞 부인데 영광송",
+   "week-1 WED vespers Psalm 27:1-6 — 앞 부 표시 없음",
    … (10 자리 × 2 = 20건)
Tests  3 failed | 7 passed (10)
```

### 6.4 검증

- vitest 2211 통과(+5), lint·tsc 0, `verify:all` 14/14, `audit-psalter-ref-consistency` suspects 0, `verify-psalter-pages` verified-correction 0, traceability OK.
- 운영 빌드 + Playwright(393px), 시편 블록별 영광송·기도:

```
== Ps 45  /pray/2026-11-23/vespers
   дуулал 1   —       —          ← I부: 영광송·루브릭·기도 없음
   дуулал 2   Gloria  prayer
   магтаал 3  Gloria  —
(27·49·72·132·135·136·139·144·145 저녁 모두 같은 모양)
== Ps 135 단독  /pray/2026-10-12/lauds
   дуулал 3   Gloria  prayer
== Benedicite  /pray/2026-11-15/lauds
   магтаал 2  rubric  —          ← FR-128 루브릭 유지
console errors: 0
```

- CI 코어 e2e(CI 설정) 278 통과.
