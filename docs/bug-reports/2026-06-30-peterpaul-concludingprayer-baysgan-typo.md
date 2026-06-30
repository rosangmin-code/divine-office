# 버그 리포트: 베드로·바오로 대축일 종결기도 "байсган" 오타 (→ баясган)

- **GOAL**: #2 (g-20) — "байсган" 오타 유입 원인 분석 + 수정방향
- **WI**: #2-sub-2 (task 10)
- **작성**: dvo-ref, 2026-06-30
- **상태**: 원인 규명 완료 / 데이터 수정 미수행(후속 GOAL)
- **증상 화면**: `Screenshot_20260629_085323_Samsung Browser.jpg` — ТӨГСГӨЛИЙН ДААТГАЛ ЗАЛБИРАЛ (X.830), 베드로·바오로 대축일(06-29) 종결기도

---

## 1. 증상

화면(06-29 베드로·바오로 대축일 종결기도) 본문:

> Та бидний **байсган** чигнүүлж байгаа билээ.

`байсган`은 오타. 정답은 `баясган` (баясга- = 기뻐하다/기쁘게 하다). я↔й 자모 순서·치환.

## 2. 오타 위치 특정 (repo 전수 grep)

```
$ grep -rn "байсган" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.txt" . | grep -v node_modules
./src/data/loth/sanctoral/solemnities.json:378:  "concludingPrayer": "...Та бидний байсган чигнүүлж байгаа билээ. ..."
./src/data/loth/sanctoral/solemnities.json:428:  "concludingPrayer": "...Та бидний байсган чигнүүлж байгаа билээ. ..."
```

JSON 키 경로(node 워크):

```
HIT: .06-29.lauds.concludingPrayer      (line 378)
HIT: .06-29.vespers2.concludingPrayer   (line 428)
```

→ 동일 문장이 **2곳**(아침기도 lauds + 제2저녁기도 vespers2)에 중복 입력됨. 둘 다 오타.
엔트리: `06-29` → `"name": "Петр, Паул гэгээнтнүүд"`.

## 3. PDF 원문 대조 — 결정적 증거

PDF 원문(`parsed_data/full_pdf.txt`)과 파생본(`parsed_data/propers/propers_final.txt`)은 **서로 완전 일치**하며, 해당 문장을 올바르게 담고 있다:

```
$ sed -n '28200,28212p' parsed_data/full_pdf.txt   # propers_final.txt:8880-8892 와 동일
Төгсгөлийн даатгал залбирал
Аяа. Тэнгэрбурхан Эцэг минь, өнөөдөр Петр,
Паул элч нарын их баярыг тэмдэглэснээр Та
биднийг баясган цэнгүүлж байгаа билээ. Тэр
хоёроор дамжуулан Таны Шашин анх итгэл
бишрэлийг хүлээн авсан тул тэдний номлол
сургаалд үнэнч байхад бидэнд тусална уу.
```

**즉 PDF 자체는 정상**(`баясган`). PDF→JSON 입력 과정에서 깨진 것이며, 추출 도구가 PDF의 `баясган`을 망가뜨린 것이 아니라 **수기 입력 시 PDF와 다르게 타이핑**된 것이다(아래 4. 참조).

## 4. 근본 원인 — 추출 아닌 수기 전사(transcription) 오류

JSON 문장은 PDF 원문과 **단 한 문장 안에서 4곳** 어긋난다 (오타 1곳이 아님):

| # | JSON (solemnities.json) | PDF 원문 (full_pdf.txt) | 성격 |
|---|---|---|---|
| 1 | тэмдэглэ**лцэж** | тэмдэглэ**снээр** | 어미 전체 상이 |
| 2 | бидни**й** | бидни**йг** | 대격 -г 누락 |
| 3 | б**ай**сган | б**ая**сган | **신고된 오타** (я↔й 전치) |
| 4 | **чи**гнүүлж | **цэ**нгүүлж | ц→ч, э→и 손상 |

PDF가 (full_pdf / propers_final 양쪽) 내부적으로 일관되게 정확한데 JSON만 한 문장에서 4곳 어긋난다는 것은, **프로그램 추출(extraction)이라면 PDF와 일치했어야** 함을 의미한다. 4곳 모두 몽골어 키릴의 시각·발음 유사 오류(look/sound-alike) 패턴 → **사람이 손으로 옮겨 적는 과정의 전사 오류**가 root cause.

### git 추적 — 유입 시점/커밋

```
$ git blame -L 378,378 src/data/loth/sanctoral/solemnities.json
933b062a (Sangmin Ro 2026-04-18 10:33:19 +0800 378) "concludingPrayer": "...Та бидний байсган чигнүүлж байгаа билээ. ..."
$ git blame -L 428,428 src/data/loth/sanctoral/solemnities.json
933b062a (Sangmin Ro 2026-04-18 10:33:19 +0800 428) (동일)
```

→ 두 줄 모두 커밋 `933b062a`(2026-04-18, 성인력 solemnities 초기 데이터 입력)에서 처음 들어왔고 이후 변경 없음. 이후의 오타 교정 커밋들(`9e93259` "apply source typo corrections", `800d62d` 맞춤법 정렬)이 이 문장은 잡지 못했다.

**결론**: 유입 단계 = **수동 데이터 입력(933b062a)**. PDF 원문 정상, 추출 스크립트 무관.

## 5. 권장 수정 방향 (※ 본 WI는 권고까지, 실제 수정은 후속 GOAL)

### SoT 파일·키
- 파일: `src/data/loth/sanctoral/solemnities.json`
- 키: `06-29.lauds.concludingPrayer` (line 378) + `06-29.vespers2.concludingPrayer` (line 428) — **두 곳 동시 수정**

### 수정 내용 (PDF-verbatim 원칙)
문장 전체를 PDF 원문에 맞춰 교정 권장. 신고된 오타 1곳만 고치면 나머지 3곳 어긋남이 남는다:

- 현재: `...их баярыг тэмдэглэлцэж Та бидний байсган чигнүүлж байгаа билээ.`
- 권장: `...их баярыг тэмдэглэснээр Та биднийг баясган цэнгүүлж байгаа билээ.`

> 단, #2~#4(тэмдэглэснээр / биднийг / цэнгүүлж)는 사용자가 명시 판정한 항목이 아니므로, PDF-verbatim 적용 여부를 후속 GOAL에서 사용자 확인 권장. 최소 수정은 `байсган→баясган` 1곳.

### 회귀 방지책
1. **lauds/vespers2 중복**: 같은 종결기도가 두 키에 복붙되어 있어 한 곳만 고치면 drift 발생. 후속 수정 시 두 키 모두 반영하고, e2e selector는 텍스트 결합 대신 `data-role`(기능)과 텍스트(맞춤법, NFR-002)를 분리(CLAUDE.md selector 원칙).
2. **sanctoral concludingPrayer ↔ PDF 정합 검증 부재**: psalter 계열은 `audit-psalter-ref-consistency.js`가 있으나 sanctoral 종결기도는 PDF 대조 verifier가 없다. 경량 가드 권장 — `solemnities.json`의 `concludingPrayer`를 `parsed_data/propers/propers_final.txt`(또는 full_pdf.txt) 본문과 정규화 비교해 suspect를 리포트하는 일회성/CI 스크립트. (이번 4곳 전사 오류는 이런 대조가 있었다면 검출됨.)

---

## 참고(references)
- 오타 SoT: `src/data/loth/sanctoral/solemnities.json:378` (`06-29.lauds.concludingPrayer`), `:428` (`06-29.vespers2.concludingPrayer`)
- PDF 원문(정답): `parsed_data/full_pdf.txt:28206`, 파생본 `parsed_data/propers/propers_final.txt:8885`
- 유입 커밋: `933b062a` (2026-04-18)
- 본 리포트: `docs/bug-reports/2026-06-30-peterpaul-concludingprayer-baysgan-typo.md`
