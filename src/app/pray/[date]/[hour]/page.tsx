import Link from 'next/link'
import { notFound } from 'next/navigation'
import { assembleHour, isFirstVespersEligibleDate } from '@/lib/loth-service'
import { isValidDateStr } from '@/lib/date-validation'
import { PrayerRenderer } from '@/components/prayer-renderer'
// GOAL #24 WI-C (#31) — 상단 ⚙ SettingsLink 제거 (D5=a). 진입점은 하단
// PrayerFooter 의 [⚙ Тохиргоо] 메뉴로 단일화. SettingsLink import 도
// 제거 — 다른 페이지 (home / settings / guide / ordinarium) 에서는
// 사용 유지될 수 있으나 본 prayer page 에서는 사라짐.
import { PrayerFooter } from '@/components/prayer-footer'
import { Footer } from '@/components/footer'
import { Icon } from '@/components/icon'
import type { HourType } from '@/lib/types'
import { BORDER_COLOR_CLASSES } from '@/lib/liturgical-colors'
import { formatDateMn, romanNumeral } from '@/lib/mappings'

const VALID_HOURS: HourType[] = ['lauds', 'vespers', 'compline', 'firstVespers', 'firstCompline']

export default async function PrayPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string; hour: string }>
  searchParams: Promise<{ celebration?: string }>
}) {
  const { date, hour: hourParam } = await params
  const { celebration } = await searchParams

  if (!isValidDateStr(date)) {
    notFound()
  }

  if (!VALID_HOURS.includes(hourParam as HourType)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Буруу цагийн төрөл: {hourParam}</p>
      </div>
    )
  }

  const hourType = hourParam as HourType

  // #242 F-X5 FU#2 — 404 gate for firstVespers/firstCompline URLs on
  // dates that do NOT carry First Vespers content (ordinary weekdays
  // with no Solemnity/Feast). Without this gate, the URL silently
  // returned an out-of-rubric Sunday-vespers fallback. The eligibility
  // check is independent of `assembleHour` (which still falls back to a
  // surface-level structure) so the 404 fires before the assembler is
  // even invoked.
  if (
    (hourType === 'firstVespers' || hourType === 'firstCompline') &&
    !isFirstVespersEligibleDate(date)
  ) {
    notFound()
  }

  const assembled = await assembleHour(date, hourType, { celebrationId: celebration })

  if (!assembled) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-stone-500 dark:text-stone-400">Өгөгдөл олдсонгүй: {date}</p>
      </div>
    )
  }

  const { liturgicalDay } = assembled

  return (
    // GOAL #66 sub-2 (#68) — 상시 strip 제거로 하단 여백은 `pb-6` 로 축소.
    // 설정 패널은 fixed overlay 라 본문 flow 를 차지하지 않는다.
    <div className="mx-auto max-w-2xl lg:max-w-3xl px-1 md:px-3 py-6 pb-6">
      {/* 상단 ⚙ SettingsLink 없음 — 설정 진입점은 하단 PrayerFooter(본문
          탭 → Тохиргоо 패널)로 단일화. 좌측 return link 는 날짜 홈으로의
          명시적 회귀 path 로 유지(#68 에서 Огноо 메뉴 제거 후 유일한 날짜
          홈 진입로). */}
      <div className="mb-4 flex items-center">
        <Link
          href={`/?date=${date}${celebration && celebration !== 'default' ? `&celebration=${encodeURIComponent(celebration)}` : ''}`}
          aria-label="Бүх цагийн залбирлууд руу буцах"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <Icon name="back" size={16} aria-hidden="true" />
          Бүх цагийн залбирал
        </Link>
      </div>

      {/* Hero — WI-62 재스킨 (#54): 승인 모습(public/_mockup/final-claude-gold.html)
          기준 editorial 헤더. 골드 kicker(절기/축일명, 대문자 letterspaced) +
          세리프 ink 제목(시간전례명) + 메타 캡션(날짜·시편주간) + 하단 헤어라인.
          제목 앞 장식 아이콘 박스 없음(DESIGN.md — 장식 아이콘/빈 글리프 박스
          금지, 사용자 이전 지적). 절기 의미색은 좌측 얇은 accent rule 로만
          보존(DESIGN.md: 절기색은 hero·구분선에 제한적 — 악센트는 골드 통일,
          빨강 등은 절기 의미색으로만). 제목은 ink(절기색 제거). */}
      <header className={`mb-6 border-l-2 ${BORDER_COLOR_CLASSES[liturgicalDay.color]} pl-4`}>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-liturgical-gold dark:text-liturgical-gold-dark">
          {liturgicalDay.nameMn}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium leading-tight tracking-tight text-stone-900 dark:text-stone-100">
          {assembled.hourNameMn}
        </h1>
        {(() => {
          const { formatted, weekday } = formatDateMn(date)
          return (
            <p className="mt-2 border-b border-stone-200 pb-5 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              {formatted} {weekday} · Дуулалтын {romanNumeral(liturgicalDay.psalterWeek)}
            </p>
          )
        })()}
      </header>

      {/* Prayer content */}
      <article>
        <PrayerRenderer hour={assembled} />
      </article>

      {/* Footer — credit chevron 별개 컴포넌트 (D4=b). PrayerFooter 와
          공존: PrayerFooter 가 fixed bottom (z-40) 으로 viewport 하단에
          sticky, Footer 는 normal flow 안에서 본문 끝에 등장 (스크롤 시
          본문과 함께 위로 흘러감). FR-162 chevron toggle 동작 보존. */}
      <Footer />

      {/* GOAL #66 sub-2 (#68) — PrayerFooter: 상시 strip 없음. 본문 아무
          곳을 탭하면 설정(Тохиргоо) 패널이 하단에서 슬라이드업. expanded
          state 는 컴포넌트 내부 useState 로 자기 관리 (uncontrolled mode). */}
      <PrayerFooter />
    </div>
  )
}
