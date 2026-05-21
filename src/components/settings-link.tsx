import Link from 'next/link'
import { Icon } from './icon'

interface SettingsLinkProps {
  /** When true, render the visible Mongolian label "Тохиргоо" next to
   *  the gear icon. Used by the home footer (wi-006 / #18) where the
   *  footer strip benefits from a label. Default (false) preserves the
   *  icon-only header anchor used at /guide / /ordinarium / /pray. */
  showLabel?: boolean
}

export function SettingsLink({ showLabel = false }: SettingsLinkProps = {}) {
  return (
    <Link
      href="/settings"
      aria-label="Тохиргоо"
      title="Тохиргоо"
      data-role="settings-link"
      className="inline-flex items-center gap-1 rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
    >
      <Icon name="settings" aria-hidden />
      {showLabel && <span className="text-sm">Тохиргоо</span>}
    </Link>
  )
}
