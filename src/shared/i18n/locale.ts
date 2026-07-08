export const supportedLocales = ['en', 'ru'] as const

export type Locale = (typeof supportedLocales)[number]

export const defaultLocale: Locale = 'en'
export const localeCookieName = 'plana-locale'

const localeSet = new Set<string>(supportedLocales)
const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365

export function isSupportedLocale(value: string): value is Locale {
  return localeSet.has(value)
}

export function normalizeLocale(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim().toLowerCase().replace('_', '-')
  const [language] = normalizedValue.split('-')

  if (isSupportedLocale(normalizedValue)) {
    return normalizedValue
  }

  if (language && isSupportedLocale(language)) {
    return language
  }

  return null
}

export function getLocaleFromCookieHeader(
  cookieHeader: string | null | undefined,
) {
  if (!cookieHeader) {
    return null
  }

  for (const cookiePart of cookieHeader.split(';')) {
    const separatorIndex = cookiePart.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const name = cookiePart.slice(0, separatorIndex).trim()
    const value = cookiePart.slice(separatorIndex + 1).trim()

    if (name === localeCookieName) {
      return normalizeLocale(decodeURIComponent(value))
    }
  }

  return null
}

export function getLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null | undefined,
) {
  if (!acceptLanguageHeader) {
    return null
  }

  return (
    acceptLanguageHeader
      .split(',')
      .map((languagePart, index) => {
        const [languageRange = '', ...parameterParts] = languagePart
          .trim()
          .split(';')
        const qualityParameter = parameterParts.find((parameterPart) =>
          parameterPart.trim().startsWith('q='),
        )
        const quality = qualityParameter
          ? Number.parseFloat(qualityParameter.split('=')[1] ?? '')
          : 1

        return {
          index,
          locale: normalizeLocale(languageRange),
          quality: Number.isFinite(quality) ? quality : 0,
        }
      })
      .filter((candidate) => candidate.locale !== null && candidate.quality > 0)
      .sort(
        (left, right) =>
          right.quality - left.quality || left.index - right.index,
      )
      .at(0)?.locale ?? null
  )
}

export function getLocaleFromBrowserLanguages(
  browserLanguages: ReadonlyArray<string> | null | undefined,
) {
  if (!browserLanguages) {
    return null
  }

  for (const browserLanguage of browserLanguages) {
    const locale = normalizeLocale(browserLanguage)

    if (locale) {
      return locale
    }
  }

  return null
}

export function detectLocale({
  acceptLanguageHeader,
  browserLanguages,
  cookieHeader,
}: {
  acceptLanguageHeader?: string | null
  browserLanguages?: ReadonlyArray<string> | null
  cookieHeader?: string | null
}) {
  return (
    getLocaleFromCookieHeader(cookieHeader) ??
    getLocaleFromAcceptLanguage(acceptLanguageHeader) ??
    getLocaleFromBrowserLanguages(browserLanguages) ??
    defaultLocale
  )
}

export function serializeLocaleCookie(locale: Locale) {
  return [
    `${localeCookieName}=${encodeURIComponent(locale)}`,
    'Path=/',
    `Max-Age=${localeCookieMaxAgeSeconds}`,
    'SameSite=Lax',
  ].join('; ')
}

export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = serializeLocaleCookie(locale)
}
