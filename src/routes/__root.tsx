import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { I18nProvider, QueryProvider, ThemeProvider } from '#/app/providers'
import { detectLocale, getAppTitle } from '#/shared/i18n'
import { detectTheme, resolveTheme } from '#/shared/theme'
import appCss from '../styles.css?url'

const getRequestLocale = createServerFn({ method: 'GET' }).handler(() =>
  detectLocale({
    acceptLanguageHeader: getRequestHeader('accept-language'),
    cookieHeader: getRequestHeader('cookie'),
  }),
)

const getRequestTheme = createServerFn({ method: 'GET' }).handler(() =>
  detectTheme({
    cookieHeader: getRequestHeader('cookie'),
  }),
)

export const Route = createRootRoute({
  beforeLoad: async () => {
    const [locale, theme] = await Promise.all([
      getRequestLocale(),
      getRequestTheme(),
    ])

    return { locale, theme }
  },
  head: ({ match }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: getAppTitle(match.context.locale),
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale, theme } = Route.useRouteContext()
  const resolvedTheme = resolveTheme(theme)

  return (
    <html
      className={resolvedTheme === 'dark' ? 'dark' : undefined}
      lang={locale}
      style={{ colorScheme: resolvedTheme }}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <ThemeProvider initialTheme={theme}>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </I18nProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
