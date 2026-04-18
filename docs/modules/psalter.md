# 4주 시편집 (Psalter)

## 담당 소스 파일
- `src/lib/psalter-loader.ts` — `getPsalterPsalmody()`: 시편 로드, `getPsalterCommons()`: 공통문 로드, `getComplinePsalmody()`, `getFullComplineData()`: 끝기도 고정 주기

## 관련 데이터 파일
- `src/data/loth/psalter/week-1.json`
- `src/data/loth/psalter/week-2.json`
- `src/data/loth/psalter/week-3.json`
- `src/data/loth/psalter/week-4.json`
- `src/data/loth/ordinarium/compline.json`

### 페이지 주석 (FR-017a / FR-017e)

`scripts/extract-psalter-pages.js` 가 `parsed_data/week{N}_full.txt` (또는 `_final.txt`) 와 `parsed_data/week{2,3}/page-mapping.json` 을 결합해 시편/짧은독서/응송 객체에 `page`, intercessions 옆에 `intercessionsPage` 병행 키를 채운다. **add-only 모드** — 기존 손-주석 페이지는 절대 덮어쓰지 않는다 (PRD §7 NFR-009b). `concludingPrayerPage` 는 자동 매칭 신뢰도가 낮아 보류 (FR-017e).

`PsalterCommons` 인터페이스는 `shortReading.page`, `responsory.page`, `intercessionsPage`, `concludingPrayerPage`, `gospelCanticleAntiphonPage` 를 모두 노출하며 `loth-service.ts` Layer 1 병합에서 mergedPropers 로 전파된다.

## 관련 테스트 파일
- `e2e/prayer-psalter-commons.spec.ts`
- `src/lib/__tests__/psalter-loader.test.ts` — `getPsalterCommons()` 페이지 노출 검증

## 기능 요구사항

| ID | 요구사항 | 상태 |
|----|----------|------|
| FR-020 | 4주 주기 시편집에서 각 기도시간의 시편을 로드한다 (week-1.json ~ week-4.json). | 완료 |
| FR-021 | GILH SS157/SS183/SS199에 따라, 연중 평일의 짧은 독서/화답/중보기도/복음찬가교송/마침기도를 4주 주기 공통문(psalter commons)에서 순환 배정한다. | 완료 |
| FR-022 | 끝기도는 7일(요일별) 고정 주기를 사용한다 (compline.json). | 완료 |
| FR-023 | 시편 본문을 성경 JSONL에서 참조(reference) 기반으로 로드하고, 절 범위(verse range)와 접미사(a/b/c 반절)를 지원한다. | 완료 |

## 의존성
- **bible** — 시편 본문을 성경 JSONL에서 로드 (FR-023)
