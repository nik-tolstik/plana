import { ChevronDownIcon, LanguagesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'

import {
  defaultLocale,
  normalizeLocale,
  setLocaleCookie,
  supportedLocales,
} from '../locale'
import type { Locale } from '../locale'

const localeLabels: Record<Locale, 'language.english' | 'language.russian'> = {
  en: 'language.english',
  ru: 'language.russian',
}

function getCurrentLocale(language: string | undefined) {
  return normalizeLocale(language) ?? defaultLocale
}

function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const currentLocale = getCurrentLocale(i18n.resolvedLanguage ?? i18n.language)

  function handleLocaleChange(nextValue: string) {
    const nextLocale = normalizeLocale(nextValue)

    if (!nextLocale || nextLocale === currentLocale) {
      return
    }

    void i18n.changeLanguage(nextLocale).then(() => {
      setLocaleCookie(nextLocale)
      document.documentElement.lang = nextLocale
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t('language.switcherLabel')}
            className={cn('uppercase', className)}
            size="sm"
            variant="outline"
          />
        }
      >
        <LanguagesIcon data-icon="inline-start" />
        <span className="min-w-5">{currentLocale}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          onValueChange={handleLocaleChange}
          value={currentLocale}
        >
          <DropdownMenuLabel>{t('language.menuLabel')}</DropdownMenuLabel>
          {supportedLocales.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {t(localeLabels[locale])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { LanguageSwitcher }
