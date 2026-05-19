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
  // 단 `rich.blocks` 안의 `rubric-line` (예: 부활 8일 축제 "Амилалтын
  // улирал:" 안내문) 는 PDF 의 빨간 시즌 cue 와 동일한 의미를 갖는 별도
  // 정보이므로 본문 6-line 위에 보존해 렌더한다. (plain 필드만으로는
  // 표현 불가)
  const richRubricLines: { text: string }[] =
    section.rich?.blocks.filter(
      (b): b is Extract<typeof b, { kind: 'rubric-line' }> =>
        b.kind === 'rubric-line',
    ) ?? []

  return (
    <section aria-label="Хариу залбирал" className="mb-4" data-role="responsory">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
        Хариу залбирал <PageRef page={section.page} />
      </p>

      {richRubricLines.map((b, i) => (
        <p
          key={`rl-${i}`}
          className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400"
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
              <span className="text-red-700 dark:text-red-400">- </span>
              {fullResponse}
            </p>
          )}
          {versicle && (
            <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{versicle}</p>
          )}
          {shortResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-red-700 dark:text-red-400">- </span>
              {shortResponse}
            </p>
          )}
          <p className="mt-2 font-serif text-stone-800 dark:text-stone-200">{GLORY_BE}</p>
          {fullResponse && (
            <p className="font-serif text-stone-800 dark:text-stone-200">
              <span className="text-red-700 dark:text-red-400">- </span>
              {fullResponse}
            </p>
          )}
        </>
      )}
    </section>
  )
}
