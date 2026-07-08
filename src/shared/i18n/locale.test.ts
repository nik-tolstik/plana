import { describe, expect, it } from 'vitest'

import {
  defaultLocale,
  detectLocale,
  getLocaleFromAcceptLanguage,
  getLocaleFromCookieHeader,
  normalizeLocale,
} from './locale'

describe('locale helpers', () => {
  it('reads a supported locale from cookie headers', () => {
    expect(getLocaleFromCookieHeader('theme=dark; plana-locale=ru')).toBe('ru')
    expect(getLocaleFromCookieHeader('plana-locale=en; theme=dark')).toBe('en')
  })

  it('ignores unsupported locale cookies', () => {
    expect(getLocaleFromCookieHeader('plana-locale=de')).toBeNull()
  })

  it('normalizes regional locale values', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru')
    expect(normalizeLocale('en_US')).toBe('en')
  })

  it('resolves the first supported Accept-Language value by quality', () => {
    expect(getLocaleFromAcceptLanguage('de-DE,de;q=0.9,ru-RU;q=0.8')).toBe('ru')
    expect(getLocaleFromAcceptLanguage('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru')
  })

  it('falls back to English for unknown locale inputs', () => {
    expect(
      detectLocale({
        acceptLanguageHeader: 'de-DE,de;q=0.9',
        cookieHeader: 'plana-locale=fr',
      }),
    ).toBe(defaultLocale)
  })
})
