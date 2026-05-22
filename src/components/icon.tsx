/**
 * Icon — 앱 전역 단일 아이콘 패밀리(Lucide) 얇은 래퍼.
 *
 * DESIGN.md Iconography 계약을 코드로 고정한다:
 *  - 단일 패밀리 = lucide-react. **앱 번들에 포함**(CDN 금지) — 느린/차단된
 *    네트워크에서도 빈 네모 박스 없이 항상 렌더되도록 import 로만 사용한다.
 *  - 기본 size 20, strokeWidth 1.75, color = currentColor.
 *    faint/아이콘 색은 상위에서 `text-stone-400`(#8e8b82) 등으로,
 *    강조는 `text-liturgical-gold`(#9a7b2e) 로 currentColor 를 제어한다.
 *  - 이모지(📖⊙⚙)·유니코드 글리프(▾▴‹›☩) 전면 금지.
 *    화면별 이모지/유니코드 → Icon 교체는 후속 화면 WI 범위.
 *
 * 사용:
 *   <Icon name="back" />                          // 20px, stroke 1.75, currentColor
 *   <Icon name="today" size={24} />
 *   <Icon name="settings" className="text-liturgical-gold" aria-hidden />
 *
 * 맵에 없는 아이콘이 필요하면 정리된 raw re-export 를 쓴다(여전히 번들 포함):
 *   import { ArrowLeft } from '@/components/icon'
 */
import {
  ArrowLeft,
  Settings,
  Sunrise,
  CalendarDays,
  BookOpen,
  ScrollText,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Church,
  ALargeSmall,
  Minus,
  Plus,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

/**
 * DESIGN.md Iconography 표준 매핑 — 의미 키 → lucide 아이콘.
 * 새 의미가 필요하면 여기에 추가하고 DESIGN.md 표도 함께 갱신한다.
 */
const ICONS = {
  back: ArrowLeft, // 뒤로
  settings: Settings, // 설정 (Тохиргоо)
  today: Sunrise, // 오늘 (Өнөөдөр)
  calendar: CalendarDays, // 달력 / 날짜
  guide: BookOpen, // 기도 안내 (заавар)
  order: ScrollText, // 예식 순서 (дэг жаяг)
  next: ChevronRight, // 펼침 / 이동(다음)
  prev: ChevronLeft, // 이동(이전)
  chevronUp: ChevronUp, // 세로 토글 — 펼치기(위로 당겨 열기)
  chevronDown: ChevronDown, // 세로 토글 — 접기(아래로 밀어 닫기)
  church: Church, // 절기 / 성당
  fontSize: ALargeSmall, // 글자 크기 ±
  minus: Minus, // 글자 크기 −
  plus: Plus, // 글자 크기 +
} satisfies Record<string, LucideIcon>

/** Icon 컴포넌트가 받는 표준 의미 키. */
export type IconName = keyof typeof ICONS

export interface IconProps extends LucideProps {
  /** DESIGN.md Iconography 표준 의미 키. */
  name: IconName
}

/**
 * 단일 아이콘 패밀리 래퍼. DESIGN.md 기본값(size 20, strokeWidth 1.75,
 * color = currentColor)을 적용하고, 호출부에서 size / strokeWidth /
 * className / aria-* 등으로 자유롭게 덮어쓸 수 있다.
 */
export function Icon({ name, size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  const Glyph = ICONS[name]
  return <Glyph size={size} strokeWidth={strokeWidth} {...props} />
}

/** 맵에 없는 아이콘이 필요할 때 쓰는 정리된 raw re-export(번들 포함 유지). */
export {
  ArrowLeft,
  Settings,
  Sunrise,
  CalendarDays,
  BookOpen,
  ScrollText,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Church,
  ALargeSmall,
  Minus,
  Plus,
  type LucideIcon,
  type LucideProps,
}
