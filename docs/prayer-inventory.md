# 기도문 자산 인벤토리

Stage 0 산출물. PDF 원형 재현도 향상 작업(`/home/min/.claude/plans/elegant-tickling-gem.md`)의 baseline.

**집계 기준일**: 2026-04-22 (P0 본문 오염 6건 수정 커밋 `c92abf3` 직후)

---

## 요약

- 기도문 관련 JSON 총 **13,469줄** / **21개 파일**
- `concludingPrayer` 텍스트 중복이 심함: propers 5개 시즌 합산 **175개 → 73 unique** (102개 중복, 58% 감소 여지)
- Ordinary Time 내 `concludingPrayer` 중복 최고 빈도: **3x** (lauds/vespers/vespers2 같은 기도문 공유가 상시 패턴)
- 이중 저장: `Psalm 24/67/100` 은 `psalter-texts.json` 과 `ordinarium/invitatory.json` 양쪽에 존재. `Psalm 95` 는 invitatory 전용 (psalter-texts 에 없음)
- `ordinary-time.json` 은 `concludingPrayer` + `gospelCanticleAntiphon` 중심. `intercessions` / `shortReading` / `hymn` 은 **0건** → 이들은 다른 소스(공통/ psalter 주간)에서 내려옴
- `advent / lent / easter / christmas` 는 `shortReading` 이 채워져 있음 (총 63건)

---

## 파일별 집계

| 파일 | 줄수 | 주 필드 | 비고 |
|------|------|---------|------|
| `src/data/loth/psalter-texts.json` | 5402 | 시편/찬가 본문(stanzas, psalmPrayer) | 중앙 본문 저장소, 137 keys. P0 에서 5건 복원 |
| `src/data/loth/psalter/week-{1..4}.json` | 944–955 | 주간 일별 시편 참조(ref + antiphon_key) + lauds/vespers hymn | 본문 X, 참조만 |
| `src/data/loth/ordinarium/invitatory.json` | 129 | invitatoryPsalms 후보 4개(Ps 95/100/67/24) 본문 직접 포함 | **이중 저장 이슈** — Ps 24/67/100 이 psalter-texts 에도 있음 |
| `src/data/loth/ordinarium/invitatory-antiphons.json` | 62 | 초대송 antiphon 시즌별 맵 | antiphon 전용 |
| `src/data/loth/ordinarium/hymns.json` | 597 | 찬가 번호→본문 카탈로그 | Stage 3b 의 rich 대상 |
| `src/data/loth/ordinarium/hymns-index.json` | 176 | 찬가 번호↔제목 인덱스 | 메타만 |
| `src/data/loth/ordinarium/canticles.json` | 63 | 복음 찬가(Benedictus/Magnificat/Nunc Dimittis) | 공통 불변 |
| `src/data/loth/ordinarium/common-prayers.json` | 31 | Our Father, Gloria, etc. | 공통 불변, 카탈로그 후보 |
| `src/data/loth/ordinarium/compline.json` | 209 | 7일치 `{shortReading, responsory, concludingPrayer.{primary,alternate}}` | 유일하게 primary/alternate nested 구조 |
| `src/data/loth/propers/advent.json` | 414 | concludingPrayer, gospelCanticleAntiphon, shortReading, intercessions | shortReading 15건 |
| `src/data/loth/propers/christmas.json` | 293 | 동상 | shortReading 7건 |
| `src/data/loth/propers/lent.json` | 615 | 동상 | shortReading 22건, intercessions 있음 |
| `src/data/loth/propers/easter.json` | 544 | 동상 + alleluiaConditional | shortReading 19건 |
| `src/data/loth/propers/ordinary-time.json` | 791 | **concludingPrayer 중심** (98건 → 34 unique) | shortReading/intercessions/hymn 0건 |
| `src/data/loth/sanctoral/solemnities.json` | 159 | concludingPrayer 21건, gospelCanticleAntiphon, alleluiaConditional | 가장 완비됨 |
| `src/data/loth/sanctoral/feasts.json` | 94 | concludingPrayer(+alternative), alleluiaConditional | |
| `src/data/loth/sanctoral/memorials.json` | 53 | concludingPrayer 6건, alternative 3건 | |
| `src/data/loth/sanctoral/optional-memorials.json` | 41 | concludingPrayer 6건 | |
| `src/data/loth/gilh.json` | 194 | General Instructions of LOTH (참조 규범 문서) | 직접 소비 X |

---

## 필드 타입별 분포

### `concludingPrayer` (집전 기도문) — 가장 중복 많음

| 출처 | 총 횟수 | 고유 | 중복률 |
|------|---------|------|--------|
| ordinary-time.json | 98 | 34 | **2.88x** (lauds/vespers/vespers2 공유) |
| advent.json | 15 | 8 | 1.88x |
| lent.json | 22 | 11 | 2.0x |
| easter.json | 22 | 11 | 2.0x |
| christmas.json | 18 | 9 | 2.0x |
| **합계** | **175** | **73** | 약 58% 감소 여지 |

**패턴**: 일요일(`SUN`) 의 lauds/vespers/vespers2 가 같은 `concludingPrayer` 텍스트를 공유. Stage 6 카탈로그화 시 동일 텍스트 1건만 두고 시간별로 ref 하는 구조로 대체 가능.

**Top 빈도 예시** (ordinary-time.json):
- `"Аяа Эзэн минь, Та дэлхий ертөнцийн хэрэг явдлыг уд..."` — 3x
- `"Аяа, Тэнгэр газрын Эцэг минь, Та бидний даатгал за..."` — 3x
- `"Аяа, Тэнгэрбурхан Эзэн минь, Таныг сэтгэлийн гүнээ..."` — 3x
- (총 10개가 3x 등장 → 30건이 실제로 10개 unique)

### `alternativeConcludingPrayer` (대안 집전 기도문)
주로 `SUN` vespers 에 집중. ordinary-time 에서 매 주 SUN 마다 1개씩 (~34건) 외에 feasts/memorials 에서 2+3건.

### `gospelCanticleAntiphon` (복음 찬가 antiphon)
모든 propers 시즌에 존재. 중복률 낮음 — 날마다 다른 복음 구절이라 거의 unique.

### `shortReading` (단편 말씀)
- advent/christmas/lent/easter 만 채워져 있음 — 총 **63건**
- ordinary-time 은 0건 → **psalter/week-*.json 또는 별도 소스가 주관** (로더 쪽 확인 필요)
- compline 은 7건 (일별 1건씩, nested 구조)
- 구조: `{ ref, text?, page? }`

### `responsory`
- `compline.json` 에만 구조적으로 존재 (days.{DAY}.responsory)
- 시즌 propers 에는 **없거나 드물게 등장** — 확인 필요 (FR-152 Responsory 세션에서 추가된 듯)

### `intercessions` (중보기도)
- ordinary-time: 0건
- advent: 15건
- lent 에도 존재
- 구조: `string[]` (각 줄이 하나의 petition). Rich 화 시 `{ introduction, refrain, petitions[], closing }` 구조가 적합 (이미 `HourSection` 의 intercessions variant 가 이 필드들을 가짐)

### `hymn`
- psalter/week-*.json 의 lauds/vespers 에 상시 존재
- propers 시즌별 시간 override 도 가능 (현재는 ordinary-time 0건)
- `ordinarium/hymns.json` 이 번호→본문 마스터. 시편 주간은 번호만 지목

---

## 이중 저장 / 구조 이상 사례

### 1. Invitatory 시편의 이중 저장
`ordinarium/invitatory.json` 의 `invitatoryPsalms` 배열에 4개 시편 본문이 **직접** 박혀 있음:
- `Psalm 95:1-11` — psalter-texts.json 에 **없음** (invitatory 전용)
- `Psalm 100:1-5` — psalter-texts.json 에 **존재** (이중 저장)
- `Psalm 67:2-8` — psalter-texts.json 에 **존재** (이중 저장)
- `Psalm 24:1-10` — psalter-texts.json 에 **존재** (이중 저장)

**영향**: 같은 시편이라도 초대송 경로(invitatory)로 렌더될 때와 주중 시편 경로로 렌더될 때 줄바꿈/문구가 다를 수 있음 — UI 일관성 회귀 위험. Stage 6 에서 `src/lib/prayers/` catalog 의 `source: { kind: 'common', id: 'ps-24' }` 참조로 통합.

**Stage 3a 추가 과제**: `Psalm 95:1-11` 을 `psalter-texts.json` 에 편입해 단일 소스로.

### 2. compline 의 nested primary/alternate
`compline.json` 만 `concludingPrayer.{primary, alternate}` 구조. 다른 파일은 `concludingPrayer` + `alternativeConcludingPrayer` 두 개의 평평한 필드. **스키마 불일치** → 로더에서 정규화 필요.

### 3. canticle STANZA_SPLIT 패턴
Daniel 3, Tobit 13 등 refrain 이 있는 canticle 에서 반복구가 **독립 stanza 로 분리** 되어 JSON 의 stanza 수 ≫ PDF 의 stanza 수 (예: Dan 3 PDF 3 → JSON 15). Stage 3a 전수 재추출 시 "반복구는 마커(span 또는 별도 block kind)로" 일관 규칙.

---

## Stage 별 입력으로서의 함의

- **Stage 3a (본문 전수 재추출)**: `psalter-texts.json` 137 keys + `Psalm 95` 추가 + canticle refrain 규칙 통일 = 약 138~140 keys 대상.
- **Stage 3b (pilot rich)**: Ordinary Time Week 1 SUN Lauds 에 포함된 섹션은 `concludingPrayer` (+ alternative), `gospelCanticleAntiphon`, psalmody(시편 3개 + canticle 1개), 공통 섹션. intercessions/shortReading 은 **psalter 또는 common 에서 내려옴** (ordinary-time.json 에 없음) — pilot parser 가 어느 소스를 읽어야 할지 먼저 확인 필요.
- **Stage 2 (카탈로그/resolver)**: 우선순위 `override > sanctoral > seasonal > psalter > common` 은 현재 구조와 정합. 단, **compline 의 nested 구조**를 resolver 진입 전에 정규화하는 레이어가 필수.
- **Stage 6 (확산 + 저장 재배치)**:
  - 102개 `concludingPrayer` 중복 제거 → catalog 항목 73개 + seasonal 참조
  - invitatory 시편 이중 저장 제거 → catalog `common` 참조
  - canticle refrain 규칙 일괄 재적용

---

## 다음 단계 의존성

- Stage 3b pilot parser 는 "Week 1 SUN Lauds 의 intercessions/shortReading 이 어디서 오는지" 를 `src/lib/propers-loader.ts` 또는 `src/lib/hours/lauds.ts` 로부터 확정해야 착수 가능. Stage 2 resolver 설계 시 함께 파악.
- Stage 3a 에는 Psalm 95 / canticle refrain 규칙이 **추가 요구사항** 으로 반영돼야 함 (이 인벤토리의 발견).
