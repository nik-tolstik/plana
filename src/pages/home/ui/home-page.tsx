import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '#/shared/i18n/ui'

export function HomePage() {
  const { t } = useTranslation()
  const stackItems = [
    [t('home.stack.routing'), 'TanStack Router'],
    [t('home.stack.serverState'), 'TanStack Query'],
    [t('home.stack.uiSystem'), 'Tailwind + shadcn/Base UI'],
  ]

  return (
    <main className="min-h-svh bg-zinc-950 px-6 py-10 text-zinc-50">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-emerald-300">
              {t('app.name')}
            </p>
            <LanguageSwitcher />
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-pretty sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-300">
            {t('home.description')}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {stackItems.map(([label, value]) => (
            <div
              className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
              key={label}
            >
              <dt className="text-sm text-zinc-400">{label}</dt>
              <dd className="mt-2 text-lg font-medium text-zinc-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
