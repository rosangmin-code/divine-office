# psalter-texts.json key dedup audit (FR-160-D)

총 keys: **125**, duplicate-content groups: **0**, redundant keys: **0**, unique signatures: **125**

## Canonical 정책 (peer R1 revision)
1. propers/sanctoral/psalter/e2e 외부 참조 빈도 높은 키 우선 (de-facto 안정성)
2. 가장 넓은 verse range (rangeWidth = sum of (b-a))
3. `page` 필드 보유 우선
4. numeric verse order tie-break (start asc, then end asc)

## Groups
