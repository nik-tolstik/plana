import { describe, expect, it } from 'vitest'

import {
  defaultTheme,
  detectTheme,
  normalizeTheme,
  resolveTheme,
} from './theme'

describe('theme', () => {
  it('normalizes supported themes', () => {
    expect(normalizeTheme('light')).toBe('light')
    expect(normalizeTheme('dark')).toBe('dark')
    expect(normalizeTheme('system')).toBe('system')
  })

  it('rejects unsupported themes', () => {
    expect(normalizeTheme('solarized')).toBeNull()
    expect(normalizeTheme(undefined)).toBeNull()
  })

  it('detects theme from cookie header', () => {
    expect(detectTheme({ cookieHeader: 'plana-theme=dark; other=value' })).toBe(
      'dark',
    )
    expect(
      detectTheme({ cookieHeader: 'plana-theme=system; other=value' }),
    ).toBe('system')
  })

  it('falls back to the default theme', () => {
    expect(detectTheme({ cookieHeader: 'other=value' })).toBe(defaultTheme)
  })

  it('resolves system theme from the current system theme', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })
})
