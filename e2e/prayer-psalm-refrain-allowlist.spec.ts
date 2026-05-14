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
  // task #4 (2026-05-14) — phrase-builder 의 `lines[].role` →
  // `phrases[].role` 전파 로직이 `scripts/build-phrases-into-rich.mjs` 에
  // 추가되고 기존 카탈로그가 `scripts/migrate-phrase-role-from-lines.mjs`
  // 로 back-fill 되어 본 테스트는 phrase mode 시편들 (Psalm 24, 67,
  // Daniel 3 등) 에서도 정상 통과. test.fixme 해제.
  test('Psalm 24:1-10 forced lines tagged role=refrain (psalterWeek 1 TUE Lauds)', async ({
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
    // 안전 패턴 — Psalm 24 안에 refrain 마킹이 있든 (task #4 적용 후 phrase
    // mode 에서도 정상 마킹됨) 없든 새 정책은 "본문 안 어떤 refrain 도
    // 빨간색을 가져서는 안 됨" 으로 표현. red 클래스를
    // 가진 refrain 라인이 0건임을 직접 카운트한다 (empty-locator 안전).
    const redRefrains = ps24.locator(
      ':is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-700, :is([data-role="psalm-stanza-refrain"], [data-role="psalm-phrase-refrain"]).text-red-400',
    )
    expect(await redRefrains.count()).toBe(0)
  })

  // @fr FR-160
  // task #4 (2026-05-14) — phrase-builder role 전파 fix 적용 후 정상 통과.
  // test.fixme 해제.
  test('Psalm 67:2-8 forced lines tagged role=refrain (psalterWeek 3 TUE Lauds)', async ({
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
  // task #4 (2026-05-14) — phrase-builder 의 `lines[].role` →
  // `phrases[].role` 전파 fix (scripts/build-phrases-into-rich.mjs +
  // scripts/migrate-phrase-role-from-lines.mjs back-fill) 적용 후 정상
  // 통과. Daniel 3:57-88, 56 의 phrase mode 렌더에서 `psalm-phrase-refrain`
  // 38건 emit (44 line.role='refrain' 이 line-aggregation 으로 38 phrases
  // 에 cover — 32 single-line + 6 dual-line phrases; uncovered=0). ≥10
  // threshold 만족. test.fixme 해제.
  // conservative tie-break 의 실제 mixed-role skip 사례는 Revelation 19:1-7
  // 에서 발생 (line.refrain 12 → phrase.refrain 8, 4 line 은 비-refrain
  // line 과 같은 phrase 에 묶여 phrase.role 미부여) — 본 ref 와 별개.
  test('Daniel 3 canticle threshold refrains still detected (additive merge)', async ({
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
