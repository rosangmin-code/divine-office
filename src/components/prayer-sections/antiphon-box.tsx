import { PageRef } from '../page-ref'

export function AntiphonBox({
  text,
  label = 'psalm',
  number,
  page,
  className = 'my-3',
}: {
  text: string
  label?: 'psalm' | 'canticle'
  number?: number
  page?: number
  className?: string
}) {
  const base = label === 'canticle' ? 'Шад магтаал' : 'Шад дуулал'
  const heading = number ? `${base} ${number}` : base
  return (
    <div
      data-role="antiphon"
      className={`${className} text-sm italic text-amber-800 dark:text-amber-300`}
    >
      <span className="font-semibold not-italic">{heading}: </span>
      {text}
      <PageRef page={page} />
    </div>
  )
}
