export const themeCookieName = 'plana-theme'
export const resolvedThemes = ['light', 'dark'] as const
export const themes = ['light', 'dark', 'system'] as const
export const defaultTheme: Theme = 'light'
export const defaultResolvedTheme: ResolvedTheme = 'light'

export type ResolvedTheme = (typeof resolvedThemes)[number]
export type Theme = (typeof themes)[number]

export function normalizeTheme(value: string | null | undefined) {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return null
}

export function normalizeResolvedTheme(value: string | null | undefined) {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return null
}

export function resolveTheme(
  theme: Theme,
  systemTheme: ResolvedTheme = defaultResolvedTheme,
) {
  return theme === 'system' ? systemTheme : theme
}

function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!cookie) {
    return null
  }

  return decodeURIComponent(cookie.slice(name.length + 1))
}

export function detectTheme({
  cookieHeader,
}: {
  cookieHeader?: string | null
}) {
  return (
    normalizeTheme(getCookieValue(cookieHeader, themeCookieName)) ??
    defaultTheme
  )
}

export function setThemeCookie(theme: Theme) {
  document.cookie = `${themeCookieName}=${encodeURIComponent(
    theme,
  )}; path=/; max-age=31536000; samesite=lax`
}
