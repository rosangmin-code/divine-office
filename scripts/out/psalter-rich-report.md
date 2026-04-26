# psalter stanzasRich 확산 리포트 (FR-153f)

- 입력: `src/data/loth/psalter-texts.json` (139 refs)
- 출력 카탈로그: `src/data/loth/prayers/commons/psalter-texts.rich.json`
- 종합 gate: ✅ **139/139 PASS**
- 빌더: Layer F `buildPsalterStanzasRich` (3A Source JSON only)

## stanza 수 분포

- min = 1, median = 2, max = 15
- 1-stanza refs: 38건 (Ps 149 류 flat)

| stanza 수 | refs |
|---:|---:|
| 1 | 38 |
| 2 | 56 |
| 3 | 9 |
| 4 | 13 |
| 5 | 4 |
| 6 | 4 |
| 7 | 4 |
| 8 | 2 |
| 9 | 1 |
| 10 | 5 |
| 11 | 2 |
| 15 | 1 |

## 라인 수 분포

- min = 4, median = 26, max = 84, sum = 3968

## refrain 검출 요약

- refrain 보유 refs: **14** / 139

| ref | refrain keys | refrain 라인 |
|:---|---:|---:|
| `Daniel 3:57-88, 56` | 3 | 44 |
| `Psalm 136:10-26` | 3 | 29 |
| `Daniel 3:52-57` | 3 | 19 |
| `Revelation 19:1-7` | 3 | 12 |
| `Psalm 80:2-8, 15-20` | 3 | 9 |
| `Psalm 136:1-9` | 1 | 9 |
| `Psalm 46:2-12` | 2 | 6 |
| `Psalm 29:1-10` | 1 | 3 |
| `Psalm 118:1-16` | 1 | 3 |
| `Psalm 115:1-13` | 1 | 3 |
| `Psalm 118:1-14` | 1 | 3 |
| `Psalm 118:15-21` | 1 | 3 |
| `Psalm 118:22-27a` | 1 | 3 |
| `Psalm 118:27b-29` | 1 | 3 |

## FR-153g 재추출 우선순위 힌트

pilot (`psalter-texts.pilot.json`) 대비 main 이 stanza 분할이 coarse 한 refs. pilot 에서 Ps 63 은 main 2 → pilot 8, Dan 3 은 main 15 → pilot 19 로 세분화됨. FR-153g 은 다음 기준으로 우선순위:

- stanza 수 ≤ 2 이면서 라인 수 ≥ 20 → PDF 원형 대비 심히 coarse
- canticle (ref 가 Psalm 이외 book) → refrain 구조 풍부 예상

- coarse refs (stanza≤2, line≥20): **61건**
  - `Psalm 63:2-9` — stanza 2, line 25
  - `Psalm 149:1-9` — stanza 1, line 22
  - `Psalm 110:1-5, 7` — stanza 2, line 20
  - `Psalm 5:2-10, 12-13` — stanza 2, line 37
  - `Psalm 29:1-10` — stanza 2, line 35
  - `Psalm 11:1-7` — stanza 1, line 24
  - `Psalm 24:1-10` — stanza 2, line 27
  - `Psalm 16:1-6` — stanza 2, line 26
  - `Psalm 16:7-11` — stanza 2, line 26
  - `Psalm 20:2-8` — stanza 2, line 25
  - `Psalm 36:6-13` — stanza 2, line 33
  - `Judith 16:2-3a, 13-15` — stanza 1, line 21
  - `Psalm 119:145-152` — stanza 1, line 20
  - `Psalm 27:1-6` — stanza 2, line 29
  - `Psalm 57:2-12` — stanza 2, line 38
  - `Psalm 48:2-12` — stanza 2, line 34
  - `Psalm 32:1-11` — stanza 2, line 33
  - `Revelation 11:17-18; 12:10b-12a` — stanza 2, line 24
  - `Psalm 41:2-14` — stanza 2, line 31
  - `Psalm 46:2-12` — stanza 2, line 28
  - `Psalm 132:1-10` — stanza 2, line 22
  - `Psalm 132:11-18` — stanza 2, line 22
  - `Psalm 116:10-19` — stanza 2, line 21
  - `Psalm 8:1-10` — stanza 1, line 27
  - `Psalm 115:1-13` — stanza 2, line 42
  - `Sirach 36:1-7, 13-16` — stanza 1, line 20
  - `Psalm 45:2-10` — stanza 2, line 27
  - `Psalm 45:11-18` — stanza 2, line 27
  - `Psalm 43:1-5` — stanza 1, line 22
  - `Psalm 49:1-13` — stanza 2, line 29
  - … (31 건 생략)
- non-Psalm canticles: **33건**
  - `Daniel 3:57-88, 56` — stanza 15, line 84, refrain 44
  - `Revelation 19:1-7` — stanza 4, line 24, refrain 12
  - `1 Chronicles 29:10-13` — stanza 1, line 19, refrain 0
  - `Ephesians 1:3-10` — stanza 3, line 23, refrain 0
  - `Tobit 13:1-8` — stanza 10, line 47, refrain 0
  - `Revelation 4:11; 5:9-10, 12` — stanza 2, line 19, refrain 0
  - `Judith 16:2-3a, 13-15` — stanza 1, line 21, refrain 0
  - `Colossians 1:12-20` — stanza 6, line 36, refrain 0
  - `Jeremiah 31:10-14` — stanza 3, line 20, refrain 0
  - `Revelation 11:17-18; 12:10b-12a` — stanza 2, line 24, refrain 0
  - `Isaiah 45:15-26` — stanza 3, line 45, refrain 0
  - `Revelation 15:3-4` — stanza 2, line 11, refrain 0
  - `Exodus 15:1-4a, 8-13, 17-18` — stanza 11, line 51, refrain 0
  - `Philippians 2:6-11` — stanza 1, line 16, refrain 0
  - `Daniel 3:52-57` — stanza 7, line 30, refrain 19
  - `Sirach 36:1-7, 13-16` — stanza 1, line 20, refrain 0
  - `Isaiah 38:10-14, 17-20` — stanza 9, line 37, refrain 0
  - `1 Samuel 2:1-10` — stanza 8, line 44, refrain 0
  - `Isaiah 12:1-6` — stanza 1, line 12, refrain 0
  - `Habakkuk 3:2-4, 13a, 15-19` — stanza 3, line 33, refrain 0
  - `Deuteronomy 32:1-12` — stanza 7, line 39, refrain 0
  - `Isaiah 2:2-5` — stanza 2, line 20, refrain 0
  - `Isaiah 26:1-6` — stanza 1, line 25, refrain 0
  - `Isaiah 33:13-16` — stanza 4, line 20, refrain 0
  - `Isaiah 40:10-17` — stanza 6, line 32, refrain 0
  - `Jeremiah 14:17-21` — stanza 7, line 26, refrain 0
  - `Wisdom 9:1-6, 9-11` — stanza 6, line 39, refrain 0
  - `Isaiah 42:10-16` — stanza 2, line 26, refrain 0
  - `Daniel 3:26-27, 29, 34-41` — stanza 11, line 41, refrain 0
  - `Isaiah 61:10-62:5` — stanza 6, line 32, refrain 0
  - … (3 건 생략)
