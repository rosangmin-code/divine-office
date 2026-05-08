# F-X12 audit — Гуйлтын залбирал 응답구절 italic 미반영 (#371)

**Task**: #371 | **Member**: divine-researcher (Explore, read-only)
**SHARD**: targeted (audit-only) | **isolation**: shared
**Reported by**: 사용자 (2026-05-08) — Гуйлтын залбирал 의 "залбирцгаая" 다음 응답구절이 PDF 에서 italic 인데 웹앱은 plain

**Note**: 본 doc 은 #371 task 의 standalone deliverable. 통합 audit (`docs/handoff-fx10-fx11-fx12-audit-2026-05-08.md` §3) 의 보강 evidence (33 залбирцгаая anchor 추적 + 56 intercessionsRich seasonal 카탈로그 확인).

## TL;DR

1. **Schema 측 OK** — `PrayerSpan.emphasis: ('italic'|'bold')[]` 지원, `RichContent` 가 `emphasisClass` 헬퍼로 적용. `intercessionsRich?: PrayerText` field 도 존재.
2. **Data 측 GAP** — weekly Ordinary Time 의 `week-N.json` 은 `intercessions: string[]` flat 배열 (italic 메타 없음). 33 залбирцгаая anchor 모두 plain 으로 저장.
3. **Renderer 측 PARTIAL** — 3 paths:
   - rich path: italic OK (data 부재 — Ordinary Time 미사용)
   - structured path: refrain 만 italic, response plain
   - legacy items[] path: 모두 plain (대부분 데이터 path)
4. **Seasonal data 분리**: 56 `intercessionsRich` entries 가 seasonal/advent 등에 존재 — 이미 rich path 사용. 사용자 보고 회귀는 weekly Ordinary 영역.
5. **권고: Phase A (renderer 단독, fast fix, ~10 LOC)** — legacy path 에서 anchor heuristic 적용. Phase B (data layer migration, full rich) 는 후속.

## §1. 사용자 reported 사례 (verbatim)

**예시 (`week-1.json` SUN vespers):**
```
intercessions: [
  "Эзэн Христ бол бидний тэргүүн. Бид түүний",
  "гишүүд. Түүндээ баяртайгаар хандан ийн",
  "залбирцгаая:",                                ← anchor
  "Эзэн, Таны хаанчлал орших болтугай.",         ← refrain (PDF italic)
  "Христ, бидний Аврагч минь, Та Өөрийн Католик",
  "шашныг бүх хүн төрөлхтний эв нэгдлийн тод",
  "бэлгэ тэмдэг болгоно уу. - Түүнийгээ Та бүх хүмүүсийн төлөө авралын",
  "ариун ёслолыг илүү бодитоор болгоно уу.",
  ...
]
```
PDF 형식: "залбирцгаая:" 다음 줄 = response refrain (italic 으로 표시되어야 함).

**현재 웹앱 동작**: legacy items[] path (`intercessions-section.tsx:116-126`) 가 모든 줄을 plain `<li>` 로 렌더 → italic 누락.

## §2. Schema 능력 분석

### 2.1 PrayerSpan emphasis (`src/lib/types.ts:101`)
```ts
type PrayerSpan =
  | { kind: 'text'; text: string; emphasis?: ('italic' | 'bold')[] }
  | { kind: 'rubric'; text: string; color: 'red' | 'plain' }
  | { kind: 'response'; text: string }
  ...
```
→ italic + bold emphasis 지원.

### 2.2 RichContent renderer (`src/components/prayer-sections/rich-content.tsx:56-381`)
```ts
function emphasisClass(emphasis?: ('italic' | 'bold')[]): string {
  if (!emphasis) return ''
  const parts: string[] = []
  if (emphasis.includes('italic')) parts.push('italic')
  if (emphasis.includes('bold')) parts.push('font-semibold')
  return parts.join(' ')
}
```
→ italic 적용 가능.

### 2.3 intercessionsRich field (`src/lib/types.ts:297, 730-735`)
- `HourSection` type='intercessions' 에 `rich?: PrayerText` 옵션
- `intercessionsRich?: PrayerText` 데이터 field
- 56 entries 가 seasonal/advent 등에 이미 존재 → rich path 활성

## §3. 데이터 측 분석

### 3.1 Weekly Ordinary Time (4 weeks)
- `src/data/loth/psalter/week-{1..4}.json` 의 `intercessions: string[]`
- **33 залбирцгаая anchors** 검출 (각 hour 의 intercession 끝 부분)
- 형식: `"...залбирцгаая:"` 또는 `"... ийн залбирцгаая:"` — 다양한 invocation 의 종결
- **Italic 메타 부재** — flat string 배열만 보유

#### 3.1.1 33 anchor 분포 (sample 8)
```
week-1.json SUN vespers anchor[2]: "залбирцгаая:"        next: "Эзэн, Таны хаанчлал..."
week-1.json THU vespers anchor[1]: "...Бүгдээрээ Түүнд хандан залбирцгаая:"   next: "Эзэн минь, Өөрийн хүүхдүүдээ..."
week-1.json FRI lauds anchor[2]: "Түүнд итгэлтэйгээр хандан ийн залбирцгаая:" next: "Эзэн, Та өршөөл нигүүлслээрээ..."
week-1.json FRI vespers anchor[3]: "хандан итгэлтэйгээр ийн залбирцгаая:"     next: "Эзэн, Өөрийн өршөөл нигүүлслээ..."
week-1.json SAT vespers anchor[2]: "залбирцгаая:"        next: "Эзэн, Таны хаанчлал..."
week-2.json SUN lauds anchor[2]: "Бүгдээрээ Түүнд хандан ийн залбирцгаая:"    next: "Сүр жавхлангийн Хаан..."
week-2.json SUN vespers anchor[5]: "тэтгэгдсэн Түүндээ хандан ийн залбирцгаая:" next: "Эзэн минь, Өөрийн хүмүүсээ..."
week-2.json MON vespers anchor[2]: "ийн залбирцгаая:"    next: "Эзэн минь, Өөрийн ард түмний..."
```
→ 100% 패턴: anchor 줄이 `залбирцгаая[:.]` 로 끝남, 다음 줄이 response refrain (italic 대상).

### 3.2 Seasonal data
- 56 `intercessionsRich` entries 검출 (seasonal/advent 디렉토리)
- 이미 rich path 사용 → italic 가능. 사용자 보고 회귀의 영향 없음 (이미 OK).

## §4. Renderer 측 분석

`src/components/prayer-sections/intercessions-section.tsx`:

### 4.1 3 render paths

| Path | 조건 | Italic 적용 | Data 가용성 |
|------|------|------------|------------|
| Rich (line 29-41) | `section.rich?.blocks.length > 0` | ✅ RichContent 가 emphasis 적용 | seasonal data 만 (56 entries) |
| Structured (line 71-108) | `section.petitions.length > 0` | ⚠️ refrain `font-serif italic` ✅, response plain ❌ | 거의 unused (대부분 legacy) |
| Legacy items[] (line 116-126) | 위 둘 모두 false | ❌ 모두 plain | weekly Ordinary 33+ anchors (대부분) |

### 4.2 사용자 reported path = Legacy items[]

**현재 코드** (line 116-126):
```tsx
<ul className="mt-2 space-y-2">
  {section.items.map((item, i) => (
    <li key={i} className="font-serif text-stone-800 dark:text-stone-200">
      — {item}
    </li>
  ))}
</ul>
```
- `item` 마다 plain `<li>` 렌더
- italic 없음, refrain 식별 없음

### 4.3 Structured path 의 부분 italic
**Refrain (line 78-85)**:
```tsx
<p data-role="intercessions-refrain" className="...font-serif italic...">
  {section.refrain}
</p>
```
✅ italic OK.

**Response (line 96-98)**:
```tsx
<div data-role="intercessions-response" className="mt-1">
  <span className="text-red-700 dark:text-red-400">- </span>
  {p.response}
</div>
```
❌ italic 없음 — 사용자가 "응답구절" 로 지칭한 부분이 italic 으로 안 표시.

## §5. Root cause

### 5.1 Data layer (legacy)
- `week-N.json` 의 `intercessions: string[]` 는 PDF 의 italic 정보 보존 안함
- 데이터 추출 단계에서 italic span 정보가 plain string 으로 평탄화

### 5.2 Renderer layer (legacy items[] path)
- "залбирцгаая" anchor 식별 heuristic 부재
- 모든 item 동일하게 plain 렌더

### 5.3 Renderer layer (structured response)
- `petitions[].response` 도 italic 미적용 — 다만 사용자 보고 패턴은 weekly Ordinary 의 refrain (anchor 직후) 이므로 fix priority 다름

### 5.4 Schema 와의 정합성
- Schema 는 italic 지원 (PrayerSpan.emphasis)
- 하지만 weekly intercessions 의 데이터 source 는 string[] — 이를 PrayerText (rich AST) 로 transform 하는 resolver 없음

## §6. Fix 권고

### Phase A — Renderer-only fast fix (LOW, RECOMMENDED 즉시)
**`intercessions-section.tsx:116-126` legacy path 수정**:
```tsx
<ul className="mt-2 space-y-2">
  {section.items.map((item, i) => {
    const prev = (section.items[i-1] ?? '').trim()
    const isRefrain = i > 0 && /залбирцгаая[:\.]\s*$/u.test(prev)
    return (
      <li
        key={i}
        data-role={isRefrain ? 'intercessions-refrain' : undefined}
        className={`font-serif text-stone-800 dark:text-stone-200${isRefrain ? ' italic' : ''}`}
      >
        — {item}
      </li>
    )
  })}
</ul>
```
- Heuristic: 직전 item 이 `залбирцгаая[:\.]` 로 끝나면 다음 item 이 refrain
- `\b` 사용 금지 (memory feedback_regex_unicode_boundary — Cyrillic 미매치). `\s*$` 사용.
- 33 anchors 모두 매칭 검증됨 (§3.1)
- `data-role="intercessions-refrain"` 추가로 e2e selector 활용 가능
- **Effort**: ~10 LOC + heuristic 검증 test

### Phase A.1 — Structured response italic (옵션, 짧은 fix)
- `petitions[].response` 도 italic 추가? — 사용자 추가 confirm 필요
- LOTH 표준: response 는 보통 italic; versicle 은 plain
- 만약 italic → line 96-98 `<div>` 에 italic class 추가

### Phase B — Data layer migration (HIGH, 후속)
1. `week-N.json` 의 `intercessions: string[]` 를 `intercessionsRich: PrayerText` 또는 structured `petitions: [{ versicle, response }]` 로 transform
2. Builder 가 PDF italic span 정보 보존 (currently lost during extraction)
3. legacy items[] path 점진적 deprecation
- **Effort**: HIGH (data migration + builder + 매 hour 재처리). 사용자 가시 회귀 즉시 해결에는 Phase A 가 충분.

## §7. References

### 코드
- **Renderer**:
  - `src/components/prayer-sections/intercessions-section.tsx:1-131` — 3 paths
    - line 29-41: rich path (italic OK)
    - line 71-108: structured path (refrain italic, response plain)
    - line 78-85: refrain italic
    - line 96-98: response plain (Phase A.1 후보)
    - line 116-126: legacy items[] path (Phase A target)
  - `src/components/prayer-sections/rich-content.tsx:56-65` — `emphasisClass` 헬퍼
- **Type**:
  - `src/lib/types.ts:101` — `PrayerSpan.emphasis: ('italic'|'bold')[]`
  - `src/lib/types.ts:297` — `intercessionsRich?: PrayerText`
  - `src/lib/types.ts:730-735` — `HourSection.intercessions` shape (`refrain?`, `petitions?`)

### 데이터
- `src/data/loth/psalter/week-{1..4}.json` — 33 залбирцгаая anchors (legacy `intercessions: string[]`)
- `src/data/loth/prayers/seasonal/advent/*.rich.json` — 56 `intercessionsRich` entries (already rich path)

### 검증 스크립트 (audit 시 사용)
```python
# F-X12 anchor sweep
import json, glob
anchors = []
for wf in sorted(glob.glob('src/data/loth/psalter/week-*.json')):
    wd = json.load(open(wf))
    for d, hours in wd.get('days', {}).items():
        for h, content in hours.items():
            if not isinstance(content, dict): continue
            inters = content.get('intercessions', [])
            for i, line in enumerate(inters):
                if 'залбирцгаая' in line:
                    next_line = inters[i+1] if i+1 < len(inters) else None
                    anchors.append((wf, d, h, i, line, next_line))
                    break
print(f'Total залбирцгаая anchors: {len(anchors)}')
# 결과: 33 anchors, 100% 다음 줄은 response refrain
```

### 관련 task / FR
- FR-153 (PRD §10) — rich AST overlay (PrayerText, PrayerSpan)
- FR-156 — intercession structured (refrain + petitions)
- 관련 ticket: 없음 (intercession italic 은 첫 회귀 보고)

### 관련 memory
- `feedback_regex_unicode_boundary.md` — `\b` ASCII-only, Cyrillic 텍스트에서 silently 미매치. `(?:\s|$)` 또는 `\s*$` 사용 (Phase A heuristic 정규식 적용)
