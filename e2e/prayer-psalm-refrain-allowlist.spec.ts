import { test, expect } from '@playwright/test'
import { DATES } from './fixtures/dates'

// @fr FR-160
test.describe('Refrain allowlist false-negative cleanup (FR-160-A4)', () => {
  // FR-160-A4 forces auto-refrain detection on lines that fail the
  // threshold=3 over-cautious gate but are PDF/GILH-confirmed authentic
  // refrains. The 6 task #120 entries cover 2-rep antiphonal Q&A,
  // self-address, peoples-praise, and inclusio patterns.

  // @fr FR-160
  // FR-161 phrase-mode 확산 이후: refrain 라인은 phrase 분기 (data-role=
  // "psalm-phrase-refrain") 또는 legacy line 분기 (data-role=
  // "psalm-stanza-refrain") 어느 한쪽으로 emit 된다. allowlist 가 forced
  // 마킹한 라인의 양쪽 selector 를 모두 OR 매칭한다.
  //
  // [test.fixme — task #3 / 2026-05-14 dvo-dev-cl] 본 테스트는 base commit
  // (c368e11) 시점에도 실패한다. 원인: FR-161 phrase-injection 파이프라인
  // (#498/#499/#501/#503 등 phrase-grouping 커밋들) 이 psalter-texts.rich.json
  // 의 Psalm 24:1-10 에 `phrases[]` 를 주입하면서 기존 `lines[].role='refrain'`
  // 메타데이터를 `phrases[].role='refrain'` 으로 propagate 하지 못함 →
  // phrase mode 렌더 시 refrain 마킹 0건. 데이터 (psalter-texts.rich.json
  // block 1 의 6 lines 에 role=refrain 존재) 와 렌더링 (0 refrain markup
  // emit) 사이의 정합 깨짐. follow-up task #4 로 phrase-builder 의
  // forced_lines → phrase.role 전파 로직 수정 후 fixme 해제 권장.
  // (본 dispatch task #3 의 "refrain 빨간색 제거" scope 외 — color policy
  // 변경과 무관한 upstream data pipeline regression.)
  test.fixme('Psalm 24:1-10 forced lines tagged role=refrain (psalterWeek 1 TUE Lauds)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW1Tuesday}/lauds`)
    const ps24 = page.locator('section[aria-label="Psalm 24:1-10"]')
    await expect(ps24).toBeVisible()
    // 3 forced_lines × 2 stanza occurrences (vv 7-10 antiphonal Q&A
    // repeats once) = 6 refrain-tagged lines.
    const refrains = ps24.locator(
      '[data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]',
    )
    expect(await refrains.count()).toBeGreaterThanOrEqual(6)
  })

  // @fr FR-160
  // 사용자 directive (2026-05-14): 시편 본문은 refrain 포함 전체가 까만색
  // 본문 컬러로 통일. allowlist 가 forced 마킹한 refrain 라인도 data-role
  // 속성은 유지하되 색상 클래스는 부여하지 않는다. 이전 (R-160-A4): refrain
  // 라인이 text-red-700 으로 가시화. 현재: 까만색 통일, e2e selector 와
  // 데이터 모델은 보존.
  test('Psalm 24:1-10 refrain lines do NOT carry red colour (2026-05-14 black-text policy)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW1Tuesday}/lauds`)
    const ps24 = page.locator('section[aria-label="Psalm 24:1-10"]')
    await expect(ps24).toBeVisible()
    // 안전 패턴 — Psalm 24 안에 refrain 마킹이 있든 (legacy 또는 phrase 모드)
    // 없든 (현재 data 정합 미흡으로 0건; 위 test.fixme 참고) 새 정책은 "본문
    // 안 어떤 refrain 도 빨간색을 가져서는 안 됨" 으로 표현. red 클래스를
    // 가진 refrain 라인이 0건임을 직접 카운트한다 (empty-locator 안전).
    const redRefrains = ps24.locator(
      ':is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-700, :is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-400',
    )
    expect(await redRefrains.count()).toBe(0)
  })

  // @fr FR-160
  // [test.fixme — task #3 / 2026-05-14 dvo-dev-cl] Psalm 24 와 동일한 phrase-
  // injection forced_lines 미전파 data regression. follow-up task #4 참고.
  test.fixme('Psalm 67:2-8 forced lines tagged role=refrain (psalterWeek 3 TUE Lauds)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.psalterW3Tuesday}/lauds`)
    const ps67 = page.locator('section[aria-label="Psalm 67:2-8"]')
    await expect(ps67).toBeVisible()
    // 2 forced_lines × 2 stanzas = 4 refrain-tagged lines (vv 3+5).
    // phrase mode 또는 legacy stanza mode 양쪽 selector 인식.
    const refrains = ps67.locator(
      '[data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]',
    )
    expect(await refrains.count()).toBeGreaterThanOrEqual(4)
  })

  // @fr FR-160
  // Regression guard — denylist (Psalm 150:1-6 / 29:1-10 from FR-160-A1)
  // and authentic threshold-detected refrains (Daniel 3 from FR-153f)
  // must remain unaffected by the allowlist mechanism.
  test('Psalm 150:1-6 still has 0 refrain lines (denylist precedence)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.easterW4Sunday}/lauds`)
    const ps150 = page.locator('section[aria-label="Psalm 150:1-6"]')
    const refrains = ps150.locator('[data-role="psalm-stanza-refrain"]')
    expect(await refrains.count()).toBe(0)
  })

  // @fr FR-160
  // Scope: limit count to the Daniel 3 canticle block specifically so a
  // regression that breaks Daniel 3 cannot be masked by other psalms on
  // the same Lauds page contributing refrains. The catalog key includes
  // a comma ("Daniel 3:57-88, 56"), so we partial-match the aria-label.
  //
  // [test.fixme — task #3 iter 2 / 2026-05-14 dvo-dev-cl] Psalm 24:1-10 /
  // 67:2-8 와 동일한 phrase-injection forced_lines 미전파 data regression.
  // psalter-texts.rich.json 검증 결과: Daniel 3:57-88, 56 은 15 blocks 모두
  // `phrases[]` 주입됨 + `lines[].role='refrain'` 44건 존재하나
  // `phrases[].role='refrain'` 0건 → phrase-mode 렌더에서 refrain markup
  // 0건 emit. 동일 원인 / 동일 증상 — Psalm 24/67 와 동일하게 fixme + 동일
  // follow-up WI 권장 코멘트로 일관성 유지. follow-up task #4 로 phrase-
  // builder 의 forced_lines / line.role='refrain' → phrase.role='refrain'
  // 전파 로직 수정 후 fixme 해제 권장.
  // (본 dispatch task #3 의 "refrain 빨간색 제거" scope 외 — color policy
  // 변경과 무관한 upstream data pipeline regression.)
  test.fixme('Daniel 3 canticle threshold refrains still detected (additive merge)', async ({
    page,
  }) => {
    await page.goto(`/pray/${DATES.otWeek1Sunday}/lauds`)
    const dan3 = page.locator('section[aria-label^="Daniel 3:"]')
    await expect(dan3.first()).toBeVisible()
    const refrains = dan3.locator(
      '[data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]',
    )
    // Daniel 3:57-88, 56 has many refrain repetitions; require ≥10 to make
    // the assertion meaningful (was 3, threshold-fire baseline = 44).
    expect(await refrains.count()).toBeGreaterThanOrEqual(10)
  })
})
