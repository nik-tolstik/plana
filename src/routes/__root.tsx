import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import { I18nProvider, QueryProvider } from '#/app/providers'
import { detectLocale, getAppTitle } from '#/shared/i18n'
import appCss from '../styles.css?url'

const getRequestLocale = createServerFn({ method: 'GET' }).handler(() =>
  detectLocale({
    acceptLanguageHeader: getRequestHeader('accept-language'),
    cookieHeader: getRequestHeader('cookie'),
  }),
)

export const Route = createRootRoute({
  beforeLoad: async () => {
    const locale = await getRequestLocale()

    return { locale }
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
  const { locale } = Route.useRouteContext()

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <QueryProvider>{children}</QueryProvider>
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
