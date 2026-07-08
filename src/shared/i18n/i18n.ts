import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { defaultLocale, supportedLocales } from './locale'
import type { Locale } from './locale'
import { defaultNS, resources } from './resources'

export function createI18nInstance(locale: Locale) {
  const i18n = createInstance()

  i18n.use(initReactI18next).init({
    defaultNS,
    fallbackLng: defaultLocale,
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    lng: locale,
    ns: [defaultNS],
    resources,
    returnNull: false,
    supportedLngs: [...supportedLocales],
  })

  return i18n
}
