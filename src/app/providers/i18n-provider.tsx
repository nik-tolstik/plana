import { useEffect, useMemo } from 'react'
import { I18nextProvider } from 'react-i18next'

import { createI18nInstance } from '#/shared/i18n'
import type { Locale } from '#/shared/i18n'

export function I18nProvider({
  children,
  locale,
}: {
  children?: React.ReactNode
  locale: Locale
}) {
  const i18n = useMemo(() => createI18nInstance(locale), [locale])

  useEffect(() => {
    if (i18n.resolvedLanguage !== locale) {
      void i18n.changeLanguage(locale)
    }

    document.documentElement.lang = locale
  }, [i18n, locale])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
