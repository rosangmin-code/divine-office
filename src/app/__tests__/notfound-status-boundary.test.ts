import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const APP = resolve(__dirname, '..')

// @fr FR-174
//
// app-review 2026-09-13 §2 (HTTP 스모크): `/pray/2026-02-29/lauds`,
// `/pdf/0` 등 존재하지 않는 URL 이 not-found UI 를 그리면서도 HTTP **200**
// 을 반환했다. 원인은 Next 의 스트리밍 경계다 —
//
//     <Layout>
//       <Suspense fallback={<Loading/>}>   ← loading.tsx
//         <Page/>                          ← 여기서 notFound() 를 던지면
//       </Suspense>                           헤더가 이미 나간 뒤라 200
//     </Layout>
//
// 고정 방법은 두 가지이며, 둘 다 파일 배치로만 유지된다. 코드가 아니라
// 배치라서 리뷰에서 놓치기 쉬우므로 여기서 구조를 못 박는다.
describe('notFound() 가 실제 404 상태코드를 내도록 하는 라우트 경계', () => {
  it('루트 `app/loading.tsx` 가 없다 (있으면 앱 전체가 스트리밍 경계 안으로 들어간다)', () => {
    expect(
      existsSync(resolve(APP, 'loading.tsx')),
      'src/app/loading.tsx 를 되살리면 /pdf/0 같은 모든 라우트의 notFound() 가 다시 200 이 된다. ' +
        '홈 스켈레톤이 필요하면 src/app/(home)/loading.tsx 에 둘 것.',
    ).toBe(false)
  })

  it('홈 스켈레톤은 `(home)` 라우트 그룹 안에 있다', () => {
    expect(existsSync(resolve(APP, '(home)/loading.tsx'))).toBe(true)
    expect(existsSync(resolve(APP, '(home)/page.tsx'))).toBe(true)
  })

  it('`/pray/[date]/[hour]` 의 검증은 layout 에 있다 (loading 경계 바깥)', () => {
    const layoutPath = resolve(APP, 'pray/[date]/[hour]/layout.tsx')
    expect(existsSync(layoutPath)).toBe(true)

    const layout = readFileSync(layoutPath, 'utf8')
    expect(layout).toContain('notFound()')
    expect(layout).toContain('isValidDateStr')
    expect(layout).toContain('isValidHourType')
    expect(layout).toContain('isFirstVespersEligibleDate')
  })

  it('page.tsx 는 검증을 중복하지 않는다 (중복하면 상태코드가 틀린 경로가 부활)', () => {
    const page = readFileSync(resolve(APP, 'pray/[date]/[hour]/page.tsx'), 'utf8')
    const code = page.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toContain('notFound')
    expect(code).not.toContain('Буруу цагийн төрөл')
  })
})
