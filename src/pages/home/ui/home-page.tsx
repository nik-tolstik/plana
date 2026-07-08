import { useTranslation } from 'react-i18next'

import { ThemeSwitcher } from '#/features/theme-switcher'
import { LanguageSwitcher } from '#/shared/i18n/ui'

export function HomePage() {
  const { t } = useTranslation()
  const stackItems = [
    [t('home.stack.routing'), 'TanStack Router'],
    [t('home.stack.serverState'), 'TanStack Query'],
    [t('home.stack.uiSystem'), 'Tailwind + shadcn/Base UI'],
  ]

  return (
    <main className="min-h-svh bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="pt-2 text-sm font-medium text-primary">
              {t('app.name')}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-pretty sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {t('home.description')}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {stackItems.map(([label, value]) => (
            <div
              className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs"
              key={label}
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-lg font-medium text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
