import type { Preview } from '@storybook/react-vite'
import { createElement } from 'react'

import '../src/styles.css'
import { I18nProvider, ThemeProvider } from '../src/app/providers'
import { defaultTheme, normalizeTheme } from '../src/shared/theme'
import type { Theme } from '../src/shared/theme'

function getThemeFromGlobals(value: unknown): Theme {
  return (
    normalizeTheme(typeof value === 'string' ? value : null) ?? defaultTheme
  )
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Preview theme',
      toolbar: {
        dynamicTitle: true,
        icon: 'circlehollow',
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
          { title: 'System', value: 'system' },
        ],
        title: 'Theme',
      },
    },
  },
  initialGlobals: {
    theme: defaultTheme,
  },
  decorators: [
    (Story, context) => {
      const theme = getThemeFromGlobals(context.globals.theme)

      return createElement(
        I18nProvider,
        { locale: 'en' },
        createElement(
          ThemeProvider,
          { initialTheme: theme, key: theme, persist: false },
          createElement(Story),
        ),
      )
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
