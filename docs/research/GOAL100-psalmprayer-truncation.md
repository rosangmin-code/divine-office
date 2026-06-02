# GOAL #100 — 삼위일체 1저녁기도 시편기도(Дууллыг төгсгөх залбирал) 절단 원인 + 범위

- **작성**: dvo-sol (research, task #101 / `[#100-sub-1]`); 적대 리뷰 반영 개정(dvo-rev-cl CONDITIONAL F1/F2/NIT)
- **일자**: 2026-05-30
- **결론 요약**: psalter-texts.json의 단일 시편기도(**Psalm 114:1-8**, 삼위일체 1저녁기도 첫 시편)가 페이지경계에서 절단됨. 근본원인 = 추출 파서 `scripts/extract-psalm-texts.js`의 **L397 lowercase-only continuation gate**. **범위 = 정확히 1건**(아래 §4 충실 파서 시뮬레이션이 권위 control). #51(intercessions 절단)과 동일 page-break-truncation 클래스.
- 코드/데이터/파서 **미수정**(조사만). peer(codex)·리뷰어(dvo-rev-cl) 모두 scope=1·cause(L397)·data cite 정확 확인.

---

## 1. 방법론

하이브리드: ① 절단 데이터 ↔ 소스 byte 대조로 발견 확정, ② 추출 파서 코드 정독으로 절단 메커니즘 file:line 규명, ③ **범위 control = 파서 수집루프를 정확 복제한 아티팩트-프리 시뮬레이션**(§4; weekN_final.txt 전수에서 L397 break 발화점 enumerate + 진짜절단/정상STOP 분류), 보조로 데이터측 종결부호 휴리스틱, ④ propers/sanctoral 가벼운 확인, ⑤ peer + 적대 리뷰로 과잉주장 제거. 모든 단정에 file:line/소스라인/명령출력 인용. **재현 스크립트는 repo에 커밋됨**: `docs/research/GOAL100-truncation-sweep.mjs`(감사가능; `node docs/research/GOAL100-truncation-sweep.mjs`로 실행). §4.2에 동일 로직을 self-contained로 임베드(이중 보장).

---

## 2. 발견 확정 — 절단된 시편기도

### 2.1 절단 데이터 (byte 대조)
- `src/data/loth/psalter-texts.json` key **"Psalm 114:1-8"** → `"psalmPrayer": "Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай далд нууц байдаг төгс хүчит Тэнгэрбурхан минь,"` (L236, **쉼표로 끝남**), `"psalmPrayerPage": 70`.
- `src/data/loth/prayers/commons/psalter-texts.rich.json` L3011: **동일 텍스트**(같은 쉼표 절단).

### 2.2 소스 전체 원문 (stitch)
소스 `parsed_data/full_pdf.txt`(기도 **텍스트**는 `parsed_data/week1/week1_final.txt`와 byte 일치 — 단 page-break 아티팩트 배치는 상이):
- **마커**: L2234 `Дууллыг төгсгөх залбирал`
- **전반**(L2235-2236): `Аяа, нэгдэл бөгөөд гурвалын мөнх амьтай / далд нууц байдаг төгс хүчит Тэнгэрбурхан минь,` ← 데이터와 byte 일치
- **페이지브레이크 아티팩트**(L2237-2243): 빈줄 + `71`(페이지번호) + `Ням гарагийн орой`(러닝헤더) + 빈줄 + `71`
- **후반**(L2244-2250, 누락분): `Та ус ба Сүнсний төрөлтөөр шинэ Израилийг амьдруулж, түүнийг сонгогдсон угсаа, хаан тахилч, ариун үндэстэн ба Өөрийн эзэмшлийн ард түмнийг болгосон билээ. Шинэ гэрлийн сүр жавхлангаар алхах гэж Танаар дуудагдсан тэдгээр бүх хүмүүс Танд зохистой үйлчилж, Таныг тахин шүтэх болтугай.`
- **다음 섹션**(L2251): `Шад магтаал Эзэн Тэнгэрбурхан...` (기도 종료 확인)

**완전한 기도** = 전반 + 후반(후반 약 2문장 + collect 종결어 `болтугай` 포함). 데이터는 전반만 보존, **후반 통째 누락**.

---

## 3. 근본 원인 — 추출 파서 메커니즘

### 3.1 추출 파이프라인 식별
- psalmPrayer **텍스트** 생성 스크립트 = `scripts/extract-psalm-texts.js` (출력 `src/data/loth/psalter-texts.json`, L34-37). `extractPsalmPrayer(lines, startIdx)`(L360-413)가 `Дууллыг төгсгөх залбирал` 마커 이후 기도문을 수집. (`scripts/extract-psalm-prayer-pages.js`는 page번호만 add-only — 절단 무관.)

### 3.2 절단 메커니즘 (단일 근본원인 = L397)
`extractPsalmPrayer` 본문(L376-408): 수집 중 빈줄을 만나면 page-break 가능성을 위해 **peek**(L388-398)으로 빈줄·노이즈를 건너뛰고 continuation을 찾는다.

- **노이즈 필터 정상 작동**: `SKIP_PATTERNS`(L41-51)는 `^\d+\s*$`(페이지번호 "71", L42) **및** `/гарагийн\s+(өглөө|орой)/i`(러닝헤더 "Ням гарагийн орой", **L46**)를 모두 필터. peek(L389-393)은 아티팩트를 정상 skip하고 실제 후반 "Та ус ба..."에 도달.
  > ⚠️ 초기 가설의 "러닝헤더 미필터" 주장은 **틀림**(L46이 필터). peer 적대검증이 반증 → 정정.
- **단일 원인 — L397**: `if (!/^[а-яёөү]/.test(next)) break` — continuation이 **lowercase 키릴 시작일 때만** wrap으로 인정. 후반 첫 단어 `Та`는 **대문자 Т**(전반이 호격 "...минь,"[쉼표]로 끝나고 후반은 **새 문장** "Та ус ба...") → `!test`=true → **break** → 후반 누락.

**근본원인 한 줄**: 페이지경계 넘는 시편기도에서 **continuation이 새 문장(대문자)으로 시작**하면 L397의 lowercase-only 휴리스틱이 wrap으로 인정 않고 break하여 후반을 버린다. (소문자 시작 wrap continuation은 정상 stitch.)

---

## 4. SCOPE — 범위 확정 (권위 control = 아티팩트-프리 파서 시뮬레이션)

### 4.1 control 선정 사유 (적대 리뷰 F1 반영)
실제 절단 게이트(L388-398)는 **아티팩트(페이지번호/러닝헤더)를 요구하지 않는다** — 빈줄(L380) 뒤 next가 대문자면 L397 break. 따라서 "아티팩트가 content와 continuation 사이에 있을 때만" 카운트하는 방식(이전 초안의 artifact-gated sweep)은 **무-아티팩트 빈줄+대문자 절단을 구조적으로 못 본다**(실제 그런 케이스 존재 — §4.3 week2 L3577, artifact=false). 그러므로 범위 control은 **빈줄 기준으로 L397 break를 전수**하는 충실 시뮬레이션을 채택한다.

### 4.2 시뮬레이터 (extract-psalm-texts.js 수집루프 정확 복제, 자기충족 재현)
**커밋 위치**: `docs/research/GOAL100-truncation-sweep.mjs`(repo 추적, `node docs/research/GOAL100-truncation-sweep.mjs` 실행). 파서 입력은 `loadWeekText`(L254)가 읽는 `weekN_final.txt`(w=1..4). 아래 임베드 스크립트(커밋본의 압축 동등물)는 `isNoiseLine`(SKIP_PATTERNS L41-51), `isEndMarker`(END_MARKERS L61-76), `ANY_PSALM/CANTICLE_HEADER_RE`(L220-221), `extractPsalmPrayer` 수집루프(L376-408)를 byte 단위로 복제하고 L397 break를 계측한다:

```js
// node 이 파일 (repo root). SKIP_PATTERNS/END_MARKERS/헤더정규식/수집루프는
// scripts/extract-psalm-texts.js L41-51,61-76,220-221,376-408 의 정확 복제.
import fs from 'node:fs'
const SKIP_PATTERNS=[/^\d+\s*$/,/^\d+\s+долоо хоног/,/^\d+\s+дүгээр долоо хоног/,/^\d+\s+дугаар долоо хоног/,/гарагийн\s+(өглөө|орой)/i,/^\d+\s+1 дүгээр/,/^\d+\s+2 дугаар/,/^\d+\s+3 дугаар/,/^\d+\s+4 дүгээр/]
const isNoise=l=>{const t=l.trim();return t?SKIP_PATTERNS.some(p=>p.test(t)):false}
const END=[/^Эцэг,?\s*Хүү/,/^Дууллыг төгсгөх залбирал/,/^Шад\s+(магтаал|дуулал)/,/^Дуулал\s+\d/,/^Магтаал(?:\s|$)/,/^Уншлага(?:\s|$)/,/^Богино уншлага/,/^Хариу залбирал/,/^Хариу дуулал/,/^Гуйлтын залбирал/,/^Залбирлын дуудлага/,/^Төгсгөлийн залбирал/,/^Урих дуудлага/,/^Даатгал залбирал/]
const isEnd=l=>END.some(p=>p.test(l.trim())), PH=/^Дуулал\s*\d/, CH=/^Магтаал(?:\s|$)/, MK=/^Дууллыг төгсгөх залбирал/
function run(L,m){const P=[];let saw=false,i=m+1,brk=null
  while(i<L.length){const t=L[i].trim()
    if(!t){if(!saw){i++;continue}let j=i+1
      while(j<L.length){const tj=L[j].trim();if(!tj||isNoise(L[j])){j++;continue}break}
      if(j>=L.length)break;const nx=L[j].trim()
      if(isEnd(nx)||PH.test(nx)||CH.test(nx))break            // L396 STOP
      if(!/^[а-яёөү]/.test(nx)){let a=false;for(let k=i+1;k<j;k++)if(L[k].trim()&&isNoise(L[k]))a=true
        brk={tail:P.join(' ').slice(-30),drop:nx.slice(0,50),art:a};break}  // L397
      i=j;continue}
    if(isEnd(t)||PH.test(t)||CH.test(t))break
    if(isNoise(L[i])){i++;continue}
    P.push(t);saw=true;i++}
  return brk}
const term=/[.!…)”»]\s*$/;let n=0;const br=[]
for(const w of [1,2,3,4]){const f=`parsed_data/week${w}/week${w}_final.txt`;if(!fs.existsSync(f))continue
  const L=fs.readFileSync(f,'utf-8').split(/\r?\n/)
  for(let i=0;i<L.length;i++){if(!MK.test(L[i].trim()))continue;n++;const b=run(L,i)
    if(b){const c=b.tail.trim();br.push({w,line:i+1,art:b.art,trunc:c.endsWith(',')||!term.test(c),tail:c,drop:b.drop})}}}
console.log('마커',n,'| L397 break',br.length,'| 진짜절단',br.filter(b=>b.trunc).length,'| 정상STOP',br.filter(b=>!b.trunc).length)
br.forEach(b=>console.log(`[${b.trunc?'TRUNC':'STOP'}] w${b.w} L${b.line} art=${b.art} 末:"${b.tail.slice(-26)}" drop:"${b.drop}"`))
```

### 4.3 실행 결과 (deterministic)
```
마커 102 | L397 break 5 | 진짜절단 1 | 정상STOP 4
[TRUNC] w1 L740  art=true  末:"хүчит Тэнгэрбурхан минь,"        drop:"Та ус ба Сүнсний төрөлтөөр шинэ Израилийг"
[STOP]  w2 L3577 art=false 末:"Та хамгаалж өгнө үү."           drop:"Амилалтын улирал: Эзэн Өөрийн ард түмнийг"
[STOP]  w3 L644  art=false 末:"бид хүсэн хүлээж байна."        drop:"Хоол хүнс өгчээ."
[STOP]  w4 L55   art=false 末:"мөнхийн хотод ирэх болно."      drop:"Манаач хүн өглөө болохыг хүлээхээс ч илүүгээр"
[STOP]  w4 L691  art=false 末:"гэрлийг харах болтугай."        drop:"(Х. Аллэлуяа!)"
```
- **진짜 절단 = 1건**: w1 L740 = **Psalm 114:1-8**. 수집末이 쉼표("минь,")로 **미완결**, dropped는 같은 기도의 continuation("Та ус ба...").
- **정상 STOP = 4건**: 수집末이 모두 **종결**("...өгнө үү.", "...байна.", "...болно.", "...болтугай.")이고 dropped는 **다음 섹션**(부활시기 후렴 "Амилалтын улирал:", 다음 시편 후렴, 알렐루야 응답). 파서가 올바른 위치에서 멈췄으며(단지 END_MARKERS가 그 줄을 인식 못해 L397 경로로 멈춤), 절단 아님.
- **week2 L3577은 art=false** — 아티팩트 없는 빈줄+대문자 break의 실재 증거(이전 artifact-gated 방식의 맹점). 다행히 정상STOP이나, control이 무-아티팩트도 포괄해야 함을 입증.

### 4.4 보조 신호 (데이터측, 빠른 cross-check)
`src/data/loth/psalter-texts.json` 85개 psalmPrayer 중 **쉼표(,)로 끝남 = 1건**(Psalm 114:1-8), 비종결 0건. 시뮬레이션의 진짜절단 1건과 일치. (이 데이터측 휴리스틱은 "전반이 마침표로 끝난 숨은 절단"은 못 잡으므로 단독 control 아님 — §4.2 시뮬레이션이 그 한계를 포괄: 시뮬레이션은 모든 L397 break를 보고 수집末 완결성으로 판정.)

### 4.5 다른 기도영역 가벼운 확인 [D]
- `src/data/loth/sanctoral/memorials.json` concludingPrayer 6건 → 쉼표/비종결 0건.
- propers/sanctoral 기도는 `extract-psalm-texts.js` 미처리(이 파서는 psalter weekN→psalter-texts.json 전용). 전역 grep `"psalmPrayer": "...,"` → psalter-texts.json만 매치(1건).

> **범위 결론**: 진짜 page-break 절단 = **정확히 1건(Psalm 114:1-8)**. 권위 control(아티팩트-프리 시뮬레이션)이 무-아티팩트 케이스까지 포괄하여 확인.

---

## 5. 결론 + 수정 방향(별도 GOAL — 본 task는 조사만)

- **[D1] 근본원인**: `scripts/extract-psalm-texts.js:397` lowercase-only continuation gate.
- **[D2] 범위**: **정확히 1건** = `Psalm 114:1-8` (psalter-texts.json L236 + psalter-texts.rich.json L3011). #51과 동일 클래스.
- **수정 discriminator(핵심 — §4.3이 직접 규정)**: L397 break를 **대소문자만으로 판정하면 안 됨**. 단순히 "대문자 continuation 허용"으로 바꾸면 §4.3의 **정상STOP 4건이 다음 섹션을 기도에 잘못 흡수**(부활후렴/알렐루야가 기도에 붙음). 올바른 조건 = **직전 수집텍스트가 미완결(쉼표/비종결어)일 때만 continuation 흡수**, 종결(마침표/болтугай/Амэн/уу.)이면 stop 유지. 이 판정은 Psalm 114(미완결→흡수)와 4 STOP(종결→유지)을 정확히 분리한다(시뮬레이터의 `trunc` 판정 그대로).
- **회귀 control(아티팩트-프리 시뮬레이션 사용 — F1c)**: 수정 후 §4.2 시뮬레이터 재실행 시 (a) Psalm 114가 완전 stitch(болтугай까지) byte 검증, (b) 정상STOP 4건이 **여전히 STOP**(다음 섹션 미흡수), (c) 새 절단(진짜절단 카운트 증가) 0. ※artifact-gated 방식은 무-아티팩트 신규 절단을 못 잡으므로 회귀는 반드시 아티팩트-프리로.
- **회귀 픽스처(peer 권고)**: 빈줄 + 페이지번호 + 러닝헤더 + **대문자 continuation(미완결 전반)** 패턴 + 빈줄 + 대문자 다음섹션(종결 전반) 패턴 양쪽.

---

## 6. 인용 색인
- 절단 데이터: `src/data/loth/psalter-texts.json:236`(key "Psalm 114:1-8"), `src/data/loth/prayers/commons/psalter-texts.rich.json:3011`
- 소스 원문: `parsed_data/full_pdf.txt:2234-2251`, `parsed_data/week1/week1_final.txt:740`
- 파서: `scripts/extract-psalm-texts.js` — SKIP_PATTERNS L41-51(러닝헤더 L46), END_MARKERS L61-76, ANY_PSALM/CANTICLE_HEADER_RE L220-221, extractPsalmPrayer L360-413, **절단 gate L397**; page번호 add-only `scripts/extract-psalm-prayer-pages.js`
- 범위 control 재현: **`docs/research/GOAL100-truncation-sweep.mjs`**(repo 커밋, `node docs/research/GOAL100-truncation-sweep.mjs` → §4.3 출력) + 보고서 §4.2 임베드(이중). F2(repro cite 깨짐) 보정 완료 — 더 이상 ephemeral scratch에 의존하지 않음.
- peer: codex research_methodologist, exchange ex_20260530T120437Z_6aa5bcac (APPROVED_WITH_ISSUES, 러닝헤더 misread 정정)
- 적대 리뷰: dvo-rev-cl CONDITIONAL — F1(Method 맹점→아티팩트-프리 control 채택), F2(repro cite→임베드), NIT(§2.2 표현) 반영.
