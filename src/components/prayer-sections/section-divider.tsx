export function SectionDivider() {
  // WI-62 재스킨: 장식용 ✝ 유니코드 글리프 제거 (DESIGN.md — 이모지/유니코드
  // 전면 금지 + 장식 아이콘 금지). 섹션 구분은 globals.css `.section-divider`
  // 의 헤어라인 rule(::before/::after) 만으로 표현 — 승인 모습(final-claude-gold)
  // 의 절제된 구분선과 정합.
  return <div className="section-divider" role="separator" />
}
