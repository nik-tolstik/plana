import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  title: "Дизайн-токены/Обзор",
};

export default meta;

const SURFACES: Array<{ token: string; className: string }> = [
  { token: "background (canvas)", className: "bg-background" },
  { token: "surface-raised", className: "bg-surface-raised" },
  { token: "surface-inset", className: "bg-surface-inset" },
  { token: "surface-subtle", className: "bg-surface-subtle" },
  { token: "surface-control", className: "bg-surface-control" },
  { token: "surface-hover", className: "bg-surface-hover" },
  { token: "surface-selected", className: "bg-surface-selected" },
];

const ACTIONS: Array<{ token: string; className: string; textClassName: string }> = [
  { token: "primary", className: "bg-primary", textClassName: "text-primary-foreground" },
  { token: "secondary", className: "bg-secondary", textClassName: "text-secondary-foreground" },
  { token: "muted", className: "bg-muted", textClassName: "text-foreground" },
  { token: "success", className: "bg-success", textClassName: "text-success-foreground" },
  {
    token: "destructive",
    className: "bg-destructive",
    textClassName: "text-destructive-foreground",
  },
];

const RADII = ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-full"] as const;

const TYPE_SCALE: Array<{ label: string; className: string }> = [
  { label: "text-xs · 12px", className: "text-xs" },
  { label: "text-sm · 14px", className: "text-sm" },
  { label: "text-base · 16px", className: "text-base" },
  { label: "text-lg · 18px", className: "text-lg" },
  { label: "text-xl · 20px", className: "text-xl" },
  { label: "text-2xl · 24px", className: "text-2xl font-semibold" },
];

export const Обзор: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-10 p-2 font-sans">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Поверхности</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SURFACES.map((surface) => (
            <div key={surface.token} className="flex flex-col gap-1.5">
              <div className={`h-14 rounded-lg border border-border ${surface.className}`} />
              <code className="text-xs text-muted-foreground">{surface.token}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Действия и статусы</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ACTIONS.map((action) => (
            <div key={action.token} className="flex flex-col gap-1.5">
              <div
                className={`flex h-14 items-center justify-center rounded-lg text-sm font-medium ${action.className} ${action.textClassName}`}
              >
                Aa
              </div>
              <code className="text-xs text-muted-foreground">{action.token}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Текст</h2>
        <div className="flex flex-col gap-2 rounded-lg bg-surface-raised border-border p-4">
          <p className="text-foreground">Обычный текст — foreground. Шрифт Onest Variable.</p>
          <p className="text-muted-foreground">Приглушённый текст — muted-foreground.</p>
          <p className="text-primary-text">Акцент как текст — primary-text.</p>
          {TYPE_SCALE.map((step) => (
            <div key={step.label} className="flex items-baseline gap-4">
              <code className="w-32 shrink-0 text-xs text-muted-foreground">{step.label}</code>
              <span className={step.className}>Задача на завтра</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Радиусы</h2>
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-1.5">
              <div className={`size-16 bg-primary ${radius}`} />
              <code className="text-xs text-muted-foreground">{radius}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Приоритеты задач</h2>
        <div className="flex gap-4">
          {[
            { token: "priority-low", className: "bg-priority-low" },
            { token: "priority-medium", className: "bg-priority-medium" },
            { token: "priority-high", className: "bg-priority-high" },
          ].map((priority) => (
            <div key={priority.token} className="flex flex-col items-center gap-1.5">
              <div className={`size-10 rounded-md ${priority.className}`} />
              <code className="text-xs text-muted-foreground">{priority.token}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
