export {
  defaultLocale,
  detectLocale,
  getLocaleFromAcceptLanguage,
  getLocaleFromBrowserLanguages,
  getLocaleFromCookieHeader,
  isSupportedLocale,
  localeCookieName,
  normalizeLocale,
  serializeLocaleCookie,
  setLocaleCookie,
  supportedLocales,
} from './locale'
export type { Locale } from './locale'
export { createI18nInstance } from './i18n'
export { defaultNS, getAppTitle, resources } from './resources'
