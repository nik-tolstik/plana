export function HomePage() {
  return (
    <main className="min-h-svh bg-zinc-950 px-6 py-10 text-zinc-50">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium text-emerald-300">Plana</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-pretty sm:text-5xl">
            Project foundation is ready for feature work
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-300">
            The app is structured around FSD, TanStack Start, TanStack Query,
            Tailwind CSS, Base UI, React Hook Form, Zod, and Playwright.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ['Routing', 'TanStack Router'],
            ['Server state', 'TanStack Query'],
            ['UI system', 'Tailwind + shadcn/Base UI'],
          ].map(([label, value]) => (
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
