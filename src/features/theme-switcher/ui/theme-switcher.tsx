import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '#/shared/lib/utils'
import { normalizeTheme, useTheme } from '#/shared/theme'
import type { Theme } from '#/shared/theme'
import { Segmented, SegmentedItem, SegmentedList } from '#/shared/ui/segmented'

const themeLabels: Record<
  Theme,
  'theme.light' | 'theme.dark' | 'theme.system'
> = {
  dark: 'theme.dark',
  light: 'theme.light',
  system: 'theme.system',
}

function ThemeSwitcher({ className }: { className?: string }) {
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation()

  function handleThemeChange(nextValue: unknown) {
    const nextTheme = normalizeTheme(
      typeof nextValue === 'string' ? nextValue : null,
    )

    selectTheme(nextTheme)
  }

  function selectTheme(nextTheme: Theme | null) {
    if (!nextTheme || nextTheme === theme) {
      return
    }

    setTheme(nextTheme)
  }

  function getThemeFromTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null
    }

    const item = target.closest<HTMLElement>('[data-theme-value]')

    return normalizeTheme(item?.dataset.themeValue)
  }

  function handleThemePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return
    }

    selectTheme(getThemeFromTarget(event.target))
  }

  function handleThemeKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    selectTheme(getThemeFromTarget(event.target))
  }

  return (
    <Segmented
      className={cn('shrink-0', className)}
      onValueChange={handleThemeChange}
      value={theme}
    >
      <SegmentedList
        aria-label={t('theme.switcherLabel')}
        onKeyDownCapture={handleThemeKeyDown}
        onPointerDownCapture={handleThemePointerDown}
      >
        <SegmentedItem data-theme-value="light" value="light">
          <SunIcon data-icon="inline-start" />
          {t(themeLabels.light)}
        </SegmentedItem>
        <SegmentedItem data-theme-value="dark" value="dark">
          <MoonIcon data-icon="inline-start" />
          {t(themeLabels.dark)}
        </SegmentedItem>
        <SegmentedItem data-theme-value="system" value="system">
          <MonitorIcon data-icon="inline-start" />
          {t(themeLabels.system)}
        </SegmentedItem>
      </SegmentedList>
    </Segmented>
  )
}

export { ThemeSwitcher }
