# 진단 리포트 — 초대송(Invitatory) 줄바꿈 미구현

- **GOAL**: #1 / g-27
- **WI**: #1-sub-1 (task 2) — Step 1 Bug reproduction (RED), 진단+수정제안 전용(구현 금지)
- **작성**: dvo-dev-cl (2026-07-02)
- **원인 확정**: **(a) DATA (primary) + (c) RENDER (contributing)**. (b) 파서는 배제.
- **상태**: 진단 완료. 코드/데이터 수정 없음(후속 #3 Develop, 승인 후).

---

## 1. 증상 (사용자 신고 + 스크린샷)

`Screenshot_20260702_075300_Samsung Browser.jpg` (좁은폭 모바일): 초대송 = Дуулал 100(Ps 100, 대체 초대송) 본문 + 후렴 "Шад дуулал: Ирэгтүн! Эзэн бол бидний Тэнгэрбурхан тул Түүндээ мөргөцгөөе! (х. 30)" ×2 + МАГТУУ X.902. 사용자: "초대송 줄바꿈이 제대로 구현 안 됨".

화면 관찰(마지막 연, Ps 100 stanza 3):
- "Учир нь ЭЗЭН бол сайн." (1행)
- "Түүний хайр энэрэл / мөнхийнх бөгөөд" (viewport-wrap 2행, 연속행 column-flush)
- "Түүний итгэлтэй байдал Бүх / үеийнхэнд юм." (wrap 2행, **엉뚱한 지점**에서 끊김)

---

## 2. 렌더 경로

초대송은 정규 시편(psalm-block.tsx, rich phrases[] + hanging indent)과 **다른** 전용 경로로 렌더된다:

- 데이터: `src/data/loth/ordinarium/invitatory.json` `invitatoryPsalms[]` — 각 psalm = `{ref, title, page, stanzas: string[][]}`. `stanzas` = 연 배열, 각 연 = **행 문자열 배열**. (rich blocks/phrases/paragraphBoundaries 구조 아님)
- 렌더: `src/components/invitatory-section.tsx` L149-160 —
  ```tsx
  activePsalm.stanzas.map((stanza, si) => (
    <div key={si}>
      <div className="mt-3 space-y-1 pl-2">
        {stanza.map((line, li) => (
          <p className="font-serif text-base leading-relaxed ...">{line}</p>  // ← 각 행 = 1 <p>, hanging indent 없음
        ))}
      </div>
      <AntiphonBox text={section.antiphon} .../>   // 각 연 뒤 후렴 반복
    </div>
  ))
  ```
  각 데이터 행이 plain `<p>` 1개로 렌더. **viewport-wrap 시 hanging indent 미적용** (`pl-2` 는 있으나 `-indent-*` 없음). 연 뒤 후렴 반복은 PDF(각 연 뒤 "(Шад дуулал давтагдана)")와 일치 — 정상.

---

## 3. PDF 대조 — 데이터가 PDF 인쇄 행구조와 불일치

`parsed_data/full_pdf.txt` (메인 절대경로 Read). Ps 100 = page 30(х.30 후렴과 일치):

**PDF 원문 (line 921-937, 17 poetic 행):**
```
921 Бүх газар дэлхий,
922 ЭЗЭНд баясалтайгаар хашхирагтун.
923 ЭЗЭНд баяртайгаар үйлчил.
924 Түүний өмнө баясалтайгаар дуулан ирэгтүн.
925 ЭЗЭН Өөрөө бол Тэнгэрбурхан гэдгийг мэдтүгэй.
926 Биднийг бүтээсэн нь Тэр бөгөөд
927 Бид өөрсдөө бус юм.
928 Бид Түүний ард түмэн,
929 Түүний бэлчээрийн хонин сүрэг.
930 Түүний дааман хаалгаар талархалтайгаар,
931 Түүний хашаанд магтаалтайгаар ор.
932 Түүнд талархал өргөж,
933 Түүний нэрийг магт.
934 Учир нь ЭЗЭН бол сайн.
935 Түүний хайр энэрэл мөнхийнх бөгөөд
936 Түүний итгэлтэй байдал
937 Бүх үеийнхэнд юм.
```

**데이터 (candidate[1] Ps 100, 12행) — PDF 여러 행을 병합:**
| 데이터 행 | = PDF |
|---|---|
| `Бүх газар дэлхий, ЭЗЭНд баясалтайгаар хашхирагтун.` | 921+**922** |
| `Биднийг бүтээсэн нь Тэр бөгөөд Бид өөрсдөө бус юм.` | 926+**927** |
| `Бид Түүний ард түмэн, Түүний бэлчээрийн хонин сүрэг.` | 928+**929** |
| `Түүнд талархал өргөж, Түүний нэрийг магт.` | 932+**933** |
| `Түүний итгэлтэй байдал Бүх үеийнхэнд юм.` | 936+**937** |

→ 데이터 12행 vs PDF 17행. 병합된 행들이 화면에서 임의 지점에 wrap(스크린샷 "Түүний итгэлтэй байдал Бүх / үеийнхэнд юм." ≠ PDF 936/937 경계 "Түүний итгэлтэй байдал / Бүх үеийнхэнд юм.").

**행 수 비교 (전 candidate):** Ps95 데이터 18 / Ps100 12(PDF 17) / Ps67 11 / Ps24 11. Ps 95(page28-29)도 동일 병합 존재 (예: 데이터 `ЭЗЭН бол аугаа их Тэнгэрбурхан бөгөөд Бүх бурхдын дээд аугаа Хаан юм.` = PDF 852+853). ※ 단 PDF 에는 진짜 poetic 행 경계(852 vs 853)와 좁은 단(column) wrap(856→857 "…Тэрээр түүнийг / бүтээсэн Нэгэн бөгөөд")이 섞여 있어, 재분할 시 둘을 구분해야 함(column-wrap 은 rejoin, poetic 행은 분리) — 이는 #3 Develop 의 정밀 큐레이션.

---

## 4. 원인 확정

| 후보 | 판정 | 근거 |
|---|---|---|
| **(a) DATA — phrases/행 경계 병합** | **✅ PRIMARY** | invitatory.json `invitatoryPsalms[].stanzas` 가 PDF poetic 행들을 병합(§3). 화면 행구조가 책과 불일치, 병합행이 엉뚱한 지점 wrap. |
| (b) PARSER — 후렴/구절 경계 미처리 | **배제** | 초대송은 colon/파서 경로를 안 씀. `stanzas: string[][]` 사전구조 데이터를 invitatory-section.tsx 가 그대로 렌더(파서 개입 없음). intercessions colonless 류 파서 버그와 무관. |
| **(c) RENDER — hanging indent 미적용** | **✅ CONTRIBUTING** | invitatory-section.tsx L153 plain `<p>` (hanging indent 없음). psalm-block.tsx(rich phrases)·rich-content.tsx(g-22 `pl-6 -indent-6`)와 달리 초대송만 wrap-continuation 처리 부재. PDF-충실 행(935 "Түүний хайр энэрэл мөнхийнх бөгөөд")도 320px 에서 wrap → 연속행 column-flush → 행 경계 모호(g-22 가 hymn 에서 고친 것과 동일 class). |

**요약**: 근본은 (a) 데이터가 PDF 행구조를 병합한 것, 그 위에 (c) 초대송 전용 렌더가 wrap hanging-indent 를 안 걸어 잔여 wrap 도 모호. 둘이 겹쳐 "줄바꿈 미구현" 으로 보임.

---

## 5. 수정 제안 (후속 #3 — 승인 후 구현; 이 WI 미실행)

> 본문 글자 불변·MT 금지. PDF-SoT(parsed_data/full_pdf.txt p28-31) 기준.

- **옵션 A (데이터, PRIMARY)**: `invitatory.json` `invitatoryPsalms[].stanzas` 를 PDF poetic 행 경계로 재분할. 병합된 hemistich 를 분리하되, PDF 의 좁은-단 column-wrap(예: Ps95 856/857)은 rejoin(한 poetic 행 유지). 같은 단어, 행 경계만 PDF 에 맞춤(글자 불변). 4 candidate 전수(Ps95/100/67/24). ⚠ column-wrap vs poetic-break 판별에 PDF 라인별 정밀 대조 필요.
- **옵션 B (렌더, 보조/일관성)**: invitatory-section.tsx L149-160 psalm 행에 hanging-indent 적용(psalm-block/rich-content 컨벤션, g-22 `pl-6 -indent-6` 패턴) — wrap 연속행 시각 부착. 또는 초대송을 rich phrases 렌더 경로로 이관.
- **권고**: A+B 병행. A 로 대부분 짧은 hemistich 가 모바일에 맞아 wrap 감소, B 로 잔여 wrap 부착. A 단독도 큰 개선.
- 후렴(AntiphonBox) 연-뒤 반복 위치는 PDF("(Шад дуулал давтагдана)" 각 연 뒤)와 이미 일치 → 무변경.
- 시각 디자인 선택(들여쓰기 폭 등)은 mock 없이 옵션만: hanging indent 폭은 기존 psalm-block/rich-content 와 동일 `-indent-6`(1.5rem) 권고(신규 선택 불요).

---

## 부록 — 핵심 파일·근거

- 데이터(원인 a): `src/data/loth/ordinarium/invitatory.json` `invitatoryPsalms[].stanzas` (병합행)
- 렌더(원인 c): `src/components/invitatory-section.tsx:149-160` (plain `<p>`, hanging indent 없음)
- 대조 기준: psalm-block.tsx(rich phrases) / rich-content.tsx(g-22 `pl-6 -indent-6`)
- PDF SoT: `parsed_data/full_pdf.txt` — Ps95 p28-29(line 846-900), Ps100 p30(line 921-937), Ps67 p30-31, Ps24 p31
- 증거 스크린샷: `Screenshot_20260702_075300_Samsung Browser.jpg`
