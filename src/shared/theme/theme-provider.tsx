import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import {
  defaultResolvedTheme,
  defaultTheme,
  resolveTheme,
  setThemeCookie,
} from './theme'
import type { ResolvedTheme, Theme } from './theme'

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const systemDarkThemeQuery = '(prefers-color-scheme: dark)'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return defaultResolvedTheme
  }

  return window.matchMedia(systemDarkThemeQuery).matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement

  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

function ThemeProvider({
  children,
  initialTheme = defaultTheme,
  persist = true,
}: {
  children?: ReactNode
  initialTheme?: Theme
  persist?: boolean
}) {
  const [theme, setThemeState] = useState(initialTheme)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)
  const resolvedTheme = resolveTheme(theme, systemTheme)

  useEffect(() => {
    setThemeState(initialTheme)
  }, [initialTheme])

  useEffect(() => {
    const mediaQuery = window.matchMedia(systemDarkThemeQuery)

    function handleSystemThemeChange() {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    handleSystemThemeChange()
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)

    if (persist) {
      setThemeCookie(theme)
    }
  }, [persist, resolvedTheme, theme])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme,
      theme,
    }),
    [resolvedTheme, setTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

export { ThemeProvider, useTheme }
