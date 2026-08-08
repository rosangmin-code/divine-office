# 분할 시편 II부가 5건 전부 누락 — I부가 두 번 렌더된다

- 발견일: 2026-08-08
- 발견 경위: GOAL 106 후속 `responsoryRich.page` 정합 작업 중 `verify-psalter-pages.js` 의
  `verified-correction` 버킷이 0 이 아닌 것을 확인(NFR-009c 위반)하고 원인을 추적하다 드러남
- 상태: **미수정** — 전례 본문 신규 입력이 필요하므로 사용자 승인 대기
- 영향: 저녁기도 5개 (시편 제2주간 월·화·목, 제3주간 목, 제4주간 금) — 4주마다 반복

---

## 증상

책은 긴 시편을 I부 / II부로 나눠 인쇄하고, 각 부에 고유한 후렴(`Шад дуулал 1` / `2`)을 붙인다.
앱은 **I부를 두 번** 렌더하고 II부를 한 번도 렌더하지 않는다.

두 번째 슬롯의 후렴은 II부의 것이 맞게 들어가 있어 겉보기에는 정상적인 두 번째 시편으로 보인다.
본문만 I부가 글자 그대로 반복된다.

## 전수 결과 (5건)

`week-*.json` 에서 같은 hour 안에 동일 `ref` 가 2회 나타나는 슬롯 = 정확히 이 5건.

| 요일 | 데이터 ref (양 슬롯 동일) | 있어야 할 II부 ref | 선언 쪽 (I / II) | 인쇄면 II부 위치 |
|---|---|---|---|---|
| w2 MON vespers | `Psalm 45:2-10` | `Psalm 45:11-18` | 203 / **203** | x. 204-205 |
| w2 TUE vespers | `Psalm 49:1-13` | `Psalm 49:14-21` | 219 / **219** | x. 220-221 |
| w2 THU vespers | `Psalm 72:1-11` | `Psalm 72:12-19` | 255 / 256 ✓ | x. 256-257 |
| w3 THU vespers | `Psalm 132:1-10` | `Psalm 132:11-18` | 367 / **367** | x. 369 |
| w4 FRI vespers | `Psalm 145:1-13` | `Psalm 145:14-21` | 497 / **497** | x. 498-499 |

두 번째 슬롯의 쪽 값은 Ps 72 만 맞고 나머지 4건은 I부 쪽을 그대로 복사해 두었다.
그래서 `verify-psalter-pages.js` 조차 Ps 72 한 건만 잡아냈다 (아래 참조).

## 재현

```
$ npm run dev
$ for d in 2026-08-31 2026-09-01 2026-09-03 2026-09-10 2026-09-18; do
    curl -s "http://localhost:3200/api/loth/$d/vespers" -o /tmp/x.json
    python3 -c "
import json,hashlib
d=json.load(open('/tmp/x.json'))
ps=[s for s in d['sections'] if s['type']=='psalmody'][0]['psalms']
print('$d psalterWeek', d.get('psalterWeek'))
for i,p in enumerate(ps):
    flat=[l for s in (p.get('stanzas') or []) for l in s]
    print('   ',i,p.get('reference'),'| page',p.get('page'),'| 행',len(flat),
          '| sha',hashlib.sha256(''.join(flat).encode()).hexdigest()[:10])
"
  done
```

```
2026-08-31 psalterWeek 2
    0 Psalm 45:2-10 | page 203 | 행 27 | sha 88dffcde7a
    1 Psalm 45:2-10 | page 203 | 행 27 | sha 88dffcde7a      ← [0] 과 SHA 동일
    2 Ephesians 1:3-10 | page 206 | 행 20 | sha 82bf274251
2026-09-01 psalterWeek 2
    0 Psalm 49:1-13 | page 219 | 행 29 | sha 6aefb91685
    1 Psalm 49:1-13 | page 219 | 행 29 | sha 6aefb91685      ← 동일
    2 Revelation 4:11; 5:9-10, 12 | page 222 | 행 21 | sha 6332d34cc3
2026-09-03 psalterWeek 2
    0 Psalm 72:1-11 | page 255 | 행 28 | sha 8450e4ea6a
    1 Psalm 72:1-11 | page 256 | 행 28 | sha 8450e4ea6a      ← 동일
    2 Revelation 11:17-18; 12:10b-12a | page 257 | 행 24 | sha e242703d8a
2026-09-10 psalterWeek 3
    0 Psalm 132:1-10 | page 367 | 행 22 | sha df6d2e53d0
    1 Psalm 132:1-10 | page 367 | 행 22 | sha df6d2e53d0      ← 동일
    2 Revelation 11:17-18; 12:10b-12a | page 370 | 행 24 | sha e242703d8a
2026-09-18 psalterWeek 4
    0 Psalm 145:1-13 | page 497 | 행 30 | sha c742c954e7
    1 Psalm 145:1-13 | page 497 | 행 30 | sha c742c954e7      ← 동일
    2 Revelation 15:3-4 | page 500 | 행 11 | sha d9c25f1ddf
```

Playwright 실렌더에서도 동일하게 재현된다 (2026-09-03 저녁기도):

```
THU w2 — PSALM 헤딩: [ 'PSALM 72:1-11 (Х. 255)', 'PSALM 72:1-11 (Х. 256)' ]
```

28행 본문이 `I` 마커까지 포함해 글자 그대로 두 번 나타난다. 콘솔 에러 없음.

## 원인

두 층이 동시에 비어 있다.

**(1) `src/data/loth/psalter/week-{2,3,4}.json` — 두 번째 슬롯의 `ref` 가 I부와 동일**

```
days.THU.vespers.psalms[0]  ref="Psalm 72:1-11"  page=255
days.THU.vespers.psalms[1]  ref="Psalm 72:1-11"  page=256   ← "Psalm 72:12-19" 이어야 함
```

**(2) `src/data/loth/psalter-texts.json` — II부 본문 자체가 없음**

```
$ python3 -c "import json; print([k for k in json.load(open('src/data/loth/psalter-texts.json')) if '72' in k])"
['Psalm 72:1-11']
```

`Psalm 45:11-18` · `49:14-21` · `72:12-19` · `132:11-18` · `145:14-21` 다섯 키가 전부 없다.
**ref 만 고치면 `resolvePsalm` 이 본문을 못 찾아 빈 시편이 된다 — 본문 입력이 선행되어야 한다.**

참고: `week-*.json` 이 참조하는 ref 중 `psalter-texts.json` 에 없는 것은 현재 0건이다.
즉 ref 중복이 "본문 없음" 을 가려 왔다. ref 를 고치는 순간 5건이 미해결 참조로 드러난다.

## verify-psalter-pages 와의 관계 — 오진 주의

```
verified-correction  week-2.json days.THU.vespers.psalms[1] Psalm 72:1-11
                     declared=256 → 255   (bodyStartPage=255)
```

ref 가 `72:1-11` 이라 본문 지문이 255 에서 잡히고, 선언된 256 을 틀렸다고 판단한 것이다.
**쪽 256 은 맞고 ref 가 틀렸다.** 이 제안을 그대로 반영하면 안 된다.

나머지 4건은 두 슬롯의 쪽이 같아서(203/203 등) verifier 가 아예 이상을 못 느꼈다 —
**이 verifier 는 ref 중복을 검출하지 못한다.**

## 사전 존재 확인 (격리 근거)

이번 작업(`responsoryRich.page` 13건 + `08-15` vespers2 마침기도 쪽 833→834)과 무관하다:

```
$ git stash push -- src/data/loth && node scripts/verify-psalter-pages.js | grep 'verified-correction *:'
  verified-correction           : 1        ← 내 변경 제외 상태
$ git stash pop && node scripts/verify-psalter-pages.js | grep 'verified-correction *:'
  verified-correction           : 1        ← 내 변경 포함 상태
```

`scripts/out/psalter-page-corrections.json` 은 2026-06-30(`00e0d2d`) 이후 재생성된 적이 없고,
verifier 는 그 뒤 2026-07-11(`91a0171` "strengthen psalter page anchors")에 강화됐다.
즉 Ps 72 건은 **약 4주간 산출물 stale 로 가려져** 있었고, 나머지 4건은 애초에 검출 대상이
아니었다.

## 제안 조치

1. 인쇄면에서 5개 II부 본문을 확보해 `psalter-texts.json` (+ `psalter-texts.rich.json` rich 쌍)에
   신규 키 5개 추가 — [[psalter-curated-no-full-reextract]] 원칙상 **surgical 추가만**, 전체
   재추출 금지
2. `week-{2,3,4}.json` 의 두 번째 슬롯 `ref` 5건 교정 + 쪽 4건 교정 (203→204, 219→220,
   367→369, 497→498)
3. `verify-psalter-pages.js` 재실행 → `verified-correction` 0 확인 (NFR-009c)
4. **ref 중복 검출을 verifier 또는 단위 테스트에 추가** — 같은 hour 안에 동일 ref 2회는 항상 결함
5. `CACHE_VERSION` bump (SSR 본문이 바뀜)

본문 신규 입력은 전례 텍스트이므로 사용자 승인 후 진행한다.
