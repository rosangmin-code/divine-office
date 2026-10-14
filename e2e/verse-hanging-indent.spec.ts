import { test, expect } from '@playwright/test'

// FR-183 — 운문의 접힌 줄 들여쓰기 통일.
//
// 사용자 규칙 (2026-10-14): 책의 인쇄행을 1:1 재현하지 않는다. 책에서 접힌 행은
// 앞 행과 같은 논리 행이고, 앱은 그 논리 행을 화면 폭에 맞춰 다시 접으면서
// 접힌 줄에만 들여쓰기를 준다. 운문(시편·성경찬가·복음찬가)은 전부 이 규칙을
// 따르고, **산문(짧은독서·시편 마침기도)은 예외**로 평평하게 흐른다.
//
// 이전 결함: `psalm-block.tsx` 의 들여쓰기가 `phrases` 데이터 유무에 걸려 있어,
// phrase 가 없는 3 ref (`Psalm 118:1-16`, `Isaiah 61:10-62:5`, `Psalm 88:2-10`)
// 만 legacy-line 경로로 떨어져 접힌 줄이 평평해졌다. 실측(393px): phrase 경로
// 24/30/33/48px(md/xl/xxl/x5l) vs legacy 경로 0px.
//
// 아래 단언은 **렌더 모드를 묻지 않는다** — phrase 경로든 legacy 경로든 모든
// 시편 본문 줄이 행잉 들여쓰기를 갖는지만 본다. 3 ref 에 phrase 데이터가
// 채워져도 (별도 작업) 이 스펙은 그대로 유효하고, 반대로 어떤 ref 가 다시
// phrase 를 잃어도 렌더러가 규칙을 지키는지 잡아낸다.

// phrase 데이터가 없어 legacy-line 경로로 렌더되던 두 날짜.
//   2026-10-11 연중 제28주일 아침 → Psalm 118:1-16 (시편 4주 주일)
//   2026-10-14 수요일 아침        → Isaiah 61:10-62:5 (시편 4주 수요일)
const LEGACY_PATH_DATES = ['2026-10-11', '2026-10-14'] as const

// 글씨를 키울수록 접히는 줄이 많아진다 (Psalm 118 기준 md 0행 → x5l 59행).
// 기본 크기에서는 접힘이 거의 없어 결함이 드러나지 않았으므로 큰 글씨로 본다.
async function setFontSize(
  page: import('@playwright/test').Page,
  fontSize: string,
): Promise<void> {
  await page.addInitScript(
    (fs) => localStorage.setItem('loth-settings', JSON.stringify({ fontSize: fs })),
    fontSize,
  )
}

interface IndentProbe {
  total: number
  hanging: number
  flat: { text: string; pl: number; ti: number }[]
}

/** 시편 본문의 모든 줄 요소에서 padding-left / text-indent 를 수집한다. */
async function probePsalmLines(
  page: import('@playwright/test').Page,
): Promise<IndentProbe> {
  return page.evaluate(() => {
    const out = { total: 0, hanging: 0, flat: [] as { text: string; pl: number; ti: number }[] }
    const lines = document.querySelectorAll(
      'p[data-role="psalm-stanza"] > span',
    )
    for (const el of lines) {
      // `continuation` role 은 의도적으로 행잉을 취소하고 전체를 들여쓴다
      // (호칭 뒤에 이어지는 응답 행 — psalm-block.tsx 의 WI-28 주석 참고).
      if (el.getAttribute('data-role') === 'psalm-phrase-continuation') continue
      const cs = getComputedStyle(el)
      const pl = parseFloat(cs.paddingLeft)
      const ti = parseFloat(cs.textIndent)
      out.total++
      if (pl > 0 && ti < 0) out.hanging++
      else out.flat.push({ text: (el.textContent || '').trim().slice(0, 40), pl, ti })
    }
    return out
  })
}

test.describe('FR-183 — 운문 접힌 줄 들여쓰기 통일', () => {
  for (const date of LEGACY_PATH_DATES) {
    // @fr FR-183
    test(`${date} 아침기도: 시편 본문의 모든 줄이 행잉 들여쓰기를 갖는다`, async ({
      page,
    }) => {
      await setFontSize(page, 'x5l')
      await page.goto(`/pray/${date}/lauds`)
      await page.waitForLoadState('networkidle')

      const probe = await probePsalmLines(page)
      expect(probe.total, '시편 본문 줄이 렌더됨').toBeGreaterThan(0)
      expect(
        probe.flat,
        `행잉 들여쓰기가 빠진 줄 (pl>0 && ti<0 위반) — ${probe.hanging}/${probe.total} 통과`,
      ).toEqual([])
    })
  }

  // @fr FR-183
  test('행잉 들여쓰기 폭은 글씨 크기에 비례한다 (rem 기반)', async ({ browser }) => {
    // 고정 px 로 바꾸면 큰 글씨에서 들여쓰기가 상대적으로 사라져 절 경계가
    // 다시 모호해진다. 실측 기대값: md 24 / x5l 48px.
    const widths: Record<string, number> = {}
    for (const fontSize of ['md', 'x5l']) {
      const ctx = await browser.newContext({ viewport: { width: 393, height: 850 } })
      const page = await ctx.newPage()
      await setFontSize(page, fontSize)
      await page.goto('/pray/2026-10-11/lauds')
      await page.waitForLoadState('networkidle')
      widths[fontSize] = await page.evaluate(() => {
        const el = document.querySelector('p[data-role="psalm-stanza"] > span')
        return el ? parseFloat(getComputedStyle(el).paddingLeft) : 0
      })
      await ctx.close()
    }
    expect(widths.md, 'md 들여쓰기 > 0').toBeGreaterThan(0)
    expect(widths.x5l, 'x5l 들여쓰기는 md 보다 넓다').toBeGreaterThan(widths.md)
  })

  // @fr FR-183
  test('시편과 복음찬가가 같은 들여쓰기 폭을 쓴다', async ({ page }) => {
    await setFontSize(page, 'x5l')
    await page.goto('/pray/2026-10-11/lauds')
    await page.waitForLoadState('networkidle')

    const pair = await page.evaluate(() => {
      const psalmLine = document.querySelector('p[data-role="psalm-stanza"] > span')
      // 복음찬가는 각 절이 `<p>` 단위 (gospel-canticle-section.tsx).
      const canticle = document.querySelector('section[aria-label="Захариагийн магтаал"]')
      const canticleLine = canticle?.querySelector('p[class*="-indent-"]') ?? null
      const read = (el: Element | null) => {
        if (!el) return null
        const cs = getComputedStyle(el)
        return { pl: parseFloat(cs.paddingLeft), ti: parseFloat(cs.textIndent) }
      }
      return { psalm: read(psalmLine), canticle: read(canticleLine) }
    })

    expect(pair.psalm, '시편 줄 요소를 찾음').not.toBeNull()
    if (pair.canticle) {
      expect(pair.psalm!.pl, '시편과 복음찬가 들여쓰기 폭 일치').toBeCloseTo(
        pair.canticle.pl,
        1,
      )
      expect(pair.psalm!.ti).toBeCloseTo(pair.canticle.ti, 1)
    }
  })

  // @fr FR-183
  test('산문(짧은독서·시편 마침기도)은 들여쓰기 없이 평평하게 흐른다', async ({
    page,
  }) => {
    await setFontSize(page, 'x5l')
    await page.goto('/pray/2026-10-11/lauds')
    await page.waitForLoadState('networkidle')

    const prose = await page.evaluate(() => {
      const probe = (root: Element | null) => {
        if (!root) return null
        const body = root.querySelector('div[class*="font-reading"], p[class*="font-reading"]')
        if (!body) return null
        const cs = getComputedStyle(body)
        return { pl: parseFloat(cs.paddingLeft), ti: parseFloat(cs.textIndent) }
      }
      return {
        shortReading: probe(document.querySelector('section[aria-label="Уншлага"]')),
        psalmPrayer: probe(document.querySelector('[data-role="psalm-prayer"]')),
      }
    })

    for (const [name, box] of Object.entries(prose)) {
      if (!box) continue
      expect(box.ti, `${name} 은 행잉 들여쓰기를 쓰지 않는다`).toBe(0)
      expect(box.pl, `${name} 은 본문 좌측에서 시작한다`).toBe(0)
    }
  })
})
