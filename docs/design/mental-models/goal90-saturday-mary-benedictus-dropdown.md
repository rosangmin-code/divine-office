# Mental Model — 토요일 성모 기념 아침기도 Benedictus 후렴 드롭다운 + 안내 루브릭 (GOAL #90)

> 블루프린트 SSOT. 상세 원문확보=`docs/research/GOAL90-marian-antiphon-source.md`(#91), 설계 lock=`docs/research/GOAL90-sub3-spec.md`(#93). 본 문서는 그 둘의 의도·관찰가능결과·비목표·계약을 한 장으로 고정한다.

## Intended behavior (의도된 동작)
사용자가 연중 토요일에 **'토요일 성모 기념'(saturday-mary)** 을 선택하면, **아침기도(Lauds)** 의 Benedictus(즈가리야 노래 `Захариагийн магтаал`) 후렴이 평일(ferial)과 다른 **성모 고유 후렴**으로 표시된다. breviary 성모 공통(p863-864)이 제시하는 **6개 후렴 중 택1** 구조를 그대로 살려, **기본값=옵션1**을 보이되 **드롭다운으로 6개 중 선택** 할 수 있고, 그 위에 **안내 루브릭**("다음 후렴 중 하나를 고르십시오")이 표시된다.

## Observable outcome (관찰 가능한 결과 — 사용자 지각)
- saturday-mary Lauds 진입 → Benedictus 후렴 = 옵션1 원문(평일 후렴과 byte 불일치).
- 드롭다운에서 옵션2~6 선택 → 화면의 후렴이 해당 원문으로 즉시 교체.
- 드롭다운 위/옆에 빨간 안내 지시문(루브릭)이 보임.
- 날짜를 이동하거나 새로고침하면 선택이 **옵션1로 리셋**(다른 날짜로 선택이 새지 않음).
- 모든 후렴·루브릭 텍스트는 인쇄 breviary 성모 공통 원문과 일치하는 authentic 몽골어 키릴(영어 혼입 0).

## Non-goals (비목표)
- **Magnificat(저녁기도)**: 추가 안 함. 토요일 성모 기념은 Lauds 전용이고 토요일 저녁기도는 항상 다음 주일 제1저녁기도라 성모 후렴 렌더 기회가 영구히 없으며, authentic 원문도 부재(추측 금지). [A안 lock]
- **완전한 성모 공통**(시편후렴/짧은독서/응송/지향): 범위 외(별도 2안).
- **방문 간(cross-visit) 선택 영속 저장**: 채택 안 함 — ephemeral(기존 hymn/marianAntiphon UX 일관). 화면 내 선택은 유지되나 날짜이동/리로드 시 옵션1 리셋. (영속 저장은 별도 WI.)
- compline/기타 시간경 무관(Benedictus는 Lauds 전용).

## AC link
- [D1] saturday-mary Lauds Benedictus 후렴이 평일과 다르게 렌더 + 기본값=옵션1.
- [D2] 드롭다운으로 6개 택1 교체 + 날짜이동/리로드 시 옵션1 리셋(cross-date 누수 없음).
- [D3] 안내 루브릭이 후렴 본문과 분리되어 표시.
- [D4] 모든 후렴 = breviary p863-864 원문 일치 authentic 몽골어(맞춤법 NFR-002).

## Design contract (계약 — #93 lock 요약)
- `gospelCanticle` 섹션 + `HourPropers`에 `candidates`/`selectedIndex`/`rubric`(additive optional) 추가 — 기존 hymn/invitatory/marianAntiphon candidates 선례 차용, 신규 메커니즘 0. candidates 부재 시 레거시 단일 antiphon 경로 무변경.
- selectedIndex 영속성 = ephemeral, default 0(옵션1). 날짜-안정 key로 cross-date 리셋(prayer-renderer index-keying 누수 방지).
- 범위 밖 index → 옵션1 clamp(safeIdx 일관 사용).
- 루브릭 = 별도 필드(후렴 본문 혼입 금지), 드롭다운과 동반 렌더(role=instruction).
- 데이터: memorials.json saturday-mary.lauds에 6 candidates(propers_final.txt L9856-9882 verbatim)+rubric(L9854)+default 평문 동기화.
- 무결성: candidates 정확히 6·비공백·중복0·page(863/864) 커버리지.
- CACHE_VERSION v43→v44(데이터+렌더러 번들 변경).
- 변경 8파일 맵: `docs/research/GOAL90-sub3-spec.md §9` 참조.
