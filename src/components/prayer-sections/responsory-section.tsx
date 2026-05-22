import type { HourSection } from '@/lib/types'
import { PageRef } from '../page-ref'

const GLORY_BE = 'Эцэг, Хүү, Ариун Сүнсийг магтан дуулъя.'

export function ResponsorySection({
  section,
}: {
  section: Extract<HourSection, { type: 'responsory' }>
}) {
  const { fullResponse, versicle, shortResponse } = section
  // Triduum simplified form: only the antiphon (stored in `versicle`) is rendered.
  const simplified = !fullResponse && !shortResponse && !!versicle

  // #5 (WI 10) — Rich AST 본문은 PDF 6-line pattern 과 불일치한다:
  //   * commons/psalter/*.rich.json (452 files) 는 첫 cantor refrain 블록을
  //     누락한 5-block 패턴 (response/versicle/response/text/response). PDF 는
  //     refrain(cantor) / - refrain / versicle(cantor) / - shortResponse /
  //     gloryBe(cantor) / - refrain 의 universal 6-line 패턴.
  //   * Х. / В. 접두어는 rich-content.tsx 의 자체 마커이며 PDF 본문에는
  //     `-` 하이픈만 사용한다.
  // → 본문은 plain 3-필드 (fullResponse / versicle / shortResponse) 만으로
  //   결정되는 deterministic 6-line emission 으로 통일한다. `rich` 의 본문
  //   블록은 더 이상 참조하지 않는다.
  //
  // 단 `rich.blocks` 안에 `rubric-line` 블록이 나타나면 PDF 의 빨간 시즌
  // cue (예: 부활 8일 축제 "Амилалтын улирал:" 안내문) 와 동일한 의미의
  // 별도 정보이므로 본문 6-line 위에 보존해 렌더한다 (plain 필드만으로는
  // 표현 불가).
  //
  // NOTE — WI #12 (2026-05-19) commons psalter responsoryRich 113건 전수
  // 조사 결과 `rubric-line` 블록은 현재 데이터에 0건. 즉 5 블록
  // (response/versicle/response/text/response) → WI #10 Fix A 가 첫 cantor
  // refrain 을 prepend 해 6 라인 emit 으로 정합한 상태가 모든 책정 자료의
  // 실제 출력 패턴이다. 아래 filter 는 향후 propers / 시즌 오버레이가
  // `rubric-line` 을 도입할 가능성에 대비한 forward-compat 방어 코드로
  // 유지한다.
  const richRubricLines: { text: string }[] =
    section.rich?.blocks.filter(
      (b): b is Extract<typeof b, { kind: 'rubric-line' }> =>
        b.kind === 'rubric-line',
    ) ?? []

  return (
    <section aria-label="Хариу залбирал" className="mb-4" data-role="responsory">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-liturgical-red dark:text-liturgical-red-dark">
        Хариу залбирал <PageRef page={section.page} />
      </p>

      {richRubricLines.map((b, i) => (
        <p
          key={`rl-${i}`}
          className="mt-2 text-sm font-semibold text-stone-500 dark:text-stone-400"
          data-role="responsory-rubric-line"
        >
          {b.text}
        </p>
      ))}

      {simplified ? (
        <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{versicle}</p>
      ) : (
        <>
          {fullResponse && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{fullResponse}</p>
          )}
          {fullResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {fullResponse}
            </p>
          )}
          {versicle && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{versicle}</p>
          )}
          {shortResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {shortResponse}
            </p>
          )}
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{GLORY_BE}</p>
          {fullResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-liturgical-gold dark:text-liturgical-gold-dark">- </span>
              {fullResponse}
            </p>
          )}
        </>
      )}
    </section>
  )
}
