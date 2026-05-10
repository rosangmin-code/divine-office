# Phase 2-D MAJOR-2 audit — 39 refs / 331 phrase.indent mismatches — 2026-05-10

**Audit by**: divine-researcher (Explore profile, read-only) — task #475
**Doc materialized by**: leader
**main HEAD**: 3e32847 (#474 parser fix merged, #473 1 Sam 2 b2 typo merged)

## Verdict: **GO_WITH_CAVEAT**

39 refs / 331 mismatches 정확히 재현 (#464 review claim 100% 일치). Phase 2-F (full-corpus reinject) 안전, 단 3 implementation conditions 준수 + 10 EXCLUDE refs --only skip.

Peer (codex) consensus reached at R3 AGREE/HIGH.

## §1. Pattern Distribution

| Pattern | Count | % | Description | Phase 2-F 안전? |
|---|---|---|---|---|
| **A** | 319/331 | 96.4% | line.indent=1, phrase.indent=0 (표준 시편 body wrap indent — propagation INTENDED target) | ✓ CAT-X1 Drift |
| **B** | 8/331 | 2.4% | line.indent=0, phrase.indent=2 (Roman numeral 'I'/'II' 섹션 마커 — 의도적 centered) | ✗ CAT-X2 Intentional |
| **C** | 4/331 | 1.2% | line.indent=0, phrase.indent=1 (짧은 wrap-continuation hanging indent — 의도적) | ✗ CAT-X2 Intentional |

## §2. PDF Spot-check (10 refs verified)

| Ref | PDF line | Pattern verified |
|---|---|---|
| Isaiah 26:1-6 | 11378 | A — body text wrap indent |
| Psalm 98:1-9 | 11958 | A |
| Psalm 33:1-9 | 3114 | A |
| Psalm 81:2-11 | 8489 | A |
| Psalm 32:1-11 | 4509 | A |
| Psalm 49:1-13 | 7439 (body), 7462 ('II' marker) | A + B (mixed) |
| Psalm 85:2-14 | 11311 | A |
| Psalm 63:2-9 | 1812 | A |
| Psalm 29:1-10 | 2565 | A |
| Psalm 145:1-13 | 17245 (body), 17270 ('II' marker) | A + B (mixed) |

## §3. Per-ref Categorization

### 29 SAFE refs (Pattern A only — Phase 2-F 안전)

Isaiah 26:1-6, Psalm 98:1-9, Psalm 33:1-9, Psalm 81:2-11, Psalm 32:1-11, Psalm 85:2-14, Psalm 5:2-10/12-13, Psalm 29:1-10, Psalm 115:1-13, Psalm 147:1-11, Isaiah 2:2-5, Psalm 63:2-9, Psalm 108:2-7, Psalm 148:1-14, Psalm 143:1-11, Psalm 92:2-9, Psalm 146:1-10, Psalm 48:2-12, Psalm 8:2-10, Psalm 130:1-8, Psalm 114:1-8, Psalm 101:1-8, Revelation 19:1-7, Psalm 116:10-19, Psalm 112:1-10, Isaiah 42:10-16, Tobit 13:1-8, Psalm 117:1-2, Psalm 125:1-5

### 10 EXCLUDE refs (Pattern B/C contamination — Phase 2-F --only skip)

| Ref | Reason |
|---|---|
| Psalm 49:1-13 | Pattern B — 'I'/'II' Roman section marker |
| Psalm 145:1-13 | Pattern B — 'I'/'II' Roman section marker |
| Psalm 45:2-10 | Pattern B |
| Psalm 62:2-9 | Pattern C — short wrap-continuation hanging indent |
| Psalm 139:1-18 | Pattern C |
| Revelation 15:3-4 | Pattern C ×2 |
| Psalm 27:1-6 | Pattern B |
| Psalm 132:1-10 | Pattern B |
| Psalm 72:1-11 | Pattern B |
| Psalm 136:1-9 | Pattern B |

## §4. Phase 2-F Implementation Conditions (3, mandatory)

### (a) --only EXCLUDES 10 EXCLUDE refs
Use `--only` allow-list with **only the 29 SAFE refs**. EXCLUDE 10 must NOT be in allow-list.

### (b) Builder propagation guard
Location: `scripts/build-phrases-into-rich.mjs:846-859` (where `if (uniform) phrase.indent = headIndent`).

Guard insertion BEFORE propagation:
```javascript
// Skip-if-explicit guard (Phase 2-D MAJOR-2 mitigation)
if (phrase.indent !== 0 && phrase.indent !== uniformLineIndent) {
  // explicit non-zero indent (intentional Pattern B/C) — preserve, do NOT propagate
  continue;
}
// safe: propagate uniform line.indent
phrase.indent = uniformLineIndent;
```

### (c) Post-Phase-2-F verifier
Run identical audit algorithm (per-ref mismatch count) → SAFE 29 refs 0-mismatch 확인. Mismatch 재발생 시 verifier failure → Phase 2-F 롤백.

## §5. Caveat — not-yet-injected 18 refs

125 total - 107 with phrases = 18 not-yet-injected. Pre-flight 전수 스캔 권고 (line[0] Roman numeral OR existing phrase.indent>0 패턴 있는지 확인). 신규 Pattern B/C contamination 발견 시 EXCLUDE 추가.

## §6. References

- `src/data/loth/prayers/commons/psalter-texts.rich.json` (audit target, 57890 lines)
- `scripts/build-phrases-into-rich.mjs:825-859` (#463 phrase.indent propagation)
- `parsed_data/full_pdf.txt` (PDF SoT, 32761 lines, 10 spot-checks)
- `#464 review` (MAJOR-2 39/331 claim — verified)
- `#473 dev completion` (1 Sam 2 b2 typo fix)
- `#474 solver completion` (parser fail-open fix)
- Decision: `.claude/pair-working/decision-trails/wi-475-phase-2-d-major-2-audit-verdict.decision.json`
