# Typo unmask cascade — first-mismatch-stop 매처의 함정

이 문서는 phrase-matcher / wrap-rate matcher 류 알고리즘이 stanza 안에서 **첫 mismatch 에 정지** 하기 때문에 typo fix 가 한 번에 하나의 typo 만 노출시키는 패턴을 기록한다.

목적은 두 가지:

1. dev / solver 가 typo fix 후 **post-fix dryrun 을 빠뜨리지 않게** 강제한다.
2. leader 가 typo fix dispatch instruction 에 명시할 보일러플레이트를 통일한다.

---

## 메커니즘 — 왜 cascade 가 생기나

`detectRefrains` / `phrase-matcher` 류 알고리즘은 stanza 의 line 시퀀스를 PDF 추출 결과와 line-by-line 으로 비교한다. 첫 mismatch 가 발견된 stanza 는 그 시점에 DRIFT 로 분류되고 그 다음 차이는 마스킹된다 — 한 stanza 의 모든 typo 가 동시에 surface 되지 않는다.

따라서 **하나의 typo 를 고치면 다음 typo 가 unmask** 되어 다음 dryrun 에서 새로운 DRIFT 로 잡힌다. 같은 ref 안에 typo 가 N 개 있으면 N 번의 fix + dryrun cycle 이 필요하다.

---

## 실제 발생 cohort (F-X11 Phase 2-G ~ I)

| 단계 | 작업 | unmask 결과 |
|------|------|-------------|
| G1 | Wisdom 9 b4 'үрнэгчид' / Psalm 135 b1 typo fix | Wisdom 9 b4 dryrun에서 b5 의 새 typo unmask |
| G1.5 | Wisdom 9 b4 + b5 unmask typo 후속 fix | Colossians 1 b5 line 7 의 typo unmask |
| G1.6 | Colossians 1:12-20 b5 line 7 typo fix | (cascade 종결) |
| I1a | Exodus 15 b2 typo fix (Jer 14 b6 동시) | Exodus 15 b3 의 typo unmask |
| I1a.5 | Exodus 15 b3 unmask typo fix | (cascade 종결) |

위 cohort 는 5 회의 fix dispatch 로 종료됐다. 매 dispatch 마다 post-fix dryrun 을 빠뜨리면 다음 cycle 의 발견이 1 라운드 미뤄진다.

---

## 권고 — dispatch instruction 보일러플레이트

typo fix dispatch (특히 phrase-matcher / refrain-matcher 가 관여한 ref) 의 instruction 에 다음 줄을 명시한다:

```
post-fix dryrun MANDATORY:
- fix 적용 후 `node scripts/verify-phrase-coverage.js --check` 또는
  해당 cohort 의 verifier 를 즉시 재실행한다.
- 새 typo / mismatch 가 unmask 되면 즉시 follow-up dispatch 로 처리
  (cascade-{N+1}).
- 추가 typo 없음이 확인된 dryrun 결과를 completion_report 에 첨부.
```

---

## 권고 — solver / dev 의 self-check

매처-관여 ref 의 typo fix 가 끝나면 다음 단계를 표준으로 만든다:

1. fix commit
2. `git status` clean 확인
3. **dryrun (해당 cohort verifier)**
4. dryrun 결과 캡처
5. unmask 가 있으면 follow-up 작업 자체 dispatch / leader 보고
6. unmask 없으면 completion_report 에 "post-fix dryrun: cascade 종결" 명시

3번을 건너뛴 경우 leader 는 dispatch 의 "post-fix dryrun MANDATORY" 라인을 근거로 pushback 한다.

---

## 자동화 여지

장기적으로는 매처를 **multi-mismatch 모드** 로 확장 (한 stanza 안의 모든 mismatch 를 동시에 보고) 하면 cascade 가 한 라운드에 종결된다. 다만 false-positive 가 늘 수 있으므로:

- 1차: cohort verifier 에 `--report-all-mismatches` 옵션을 추가 (opt-in)
- 2차: 옵트인 모드의 false-positive 율이 baseline 보다 낮으면 default 로 승격

이 옵션이 도입되기 전까지는 위의 dispatch boilerplate + self-check 로 운영한다.
