'use client'

/**
 * 설정 화면의 토글 스위치.
 *
 * 접근성(M7, app-review 2026-09-13 §3.3): 이전에는 `<button role="switch">`
 * 자체가 28×48px 트랙이라 44px 터치 타겟(DESIGN.md · WCAG 2.5.8)에 못 미쳤다.
 * 트랙을 안쪽 `<span data-role="switch-track">` 으로 내리고, 실제 인터랙티브
 * 요소인 `<button>` 은 고정 `min-h-[44px] min-w-[44px]` 로 키운다 — rem 이
 * 아니라 px 인 이유는 작은 글씨 설정(`xs`, 14px root)에서도 44px 을 지키기
 * 위해서다. 늘어난 hit 영역은 음수 마진으로 상쇄해 시각적 위치는 그대로다.
 *
 * 라벨은 `aria-labelledby` 로 호출부의 제목 `<h2>` 에 연결한다 (기존 계약).
 */
export function Switch({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean
  onChange: () => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className="-my-2 -mr-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2"
    >
      <span
        data-role="switch-track"
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked
            ? 'bg-liturgical-gold dark:bg-liturgical-gold-dark'
            : 'bg-stone-300 dark:bg-stone-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}
