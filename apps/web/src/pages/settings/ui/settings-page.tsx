import { useState } from "react";
import { useSessionStore } from "@/entities/user";
import { ThemeSwitch } from "@/features/theme-switch";
import { Checkbox, PageFade } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import {
  COMPLETION_SOUND_OPTIONS,
  getCompletionSoundId,
  isCompletionSoundEnabled,
  previewCompletionSound,
  setCompletionSoundEnabled,
  setCompletionSoundId,
  type CompletionSoundId,
} from "@/shared/lib/completion-sound";

/** Звук завершения задачи: включение и выбор мелодии с прослушиванием. */
function CompletionSoundSettings() {
  const [enabled, setEnabled] = useState(isCompletionSoundEnabled);
  const [soundId, setSoundId] = useState<CompletionSoundId>(getCompletionSoundId);

  function selectSound(id: CompletionSoundId) {
    setSoundId(id);
    setCompletionSoundId(id);
    previewCompletionSound(id);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          onCheckedChange={(next) => {
            setEnabled(next);
            setCompletionSoundEnabled(next);
          }}
          aria-label="Звук завершения задачи"
        />
        Звук завершения задачи
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm">Мелодия</span>
        <div
          aria-label="Мелодия завершения задачи"
          className="flex flex-col gap-1"
          role="radiogroup"
        >
          {COMPLETION_SOUND_OPTIONS.map(({ id, label }) => (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                "hover:bg-control-hover",
              )}
              key={id}
            >
              <input
                checked={soundId === id}
                className="sr-only"
                name="completion-sound"
                onChange={() => selectSound(id)}
                onClick={() => {
                  // Повторный клик по уже выбранной — прослушать ещё раз.
                  if (soundId === id) previewCompletionSound(id);
                }}
                type="radio"
              />
              <span
                aria-hidden
                className={cn(
                  "size-4 shrink-0 rounded-full border border-border bg-card",
                  soundId === id && "border-[5px] border-primary",
                )}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  const rows: Array<[string, string | undefined]> = [
    ["Имя", user?.name],
    ["Email", user?.email],
    ["Таймзона", user?.timezone],
  ];

  return (
    <PageFade className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Настройки</h1>
      <dl className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3">
        {rows.map(([label, value]) => (
          <div className="flex items-baseline justify-between gap-4" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mb-2 text-base font-semibold">Тема оформления</h2>
      <ThemeSwitch onUserUpdated={setUser} />
      <h2 className="mb-2 mt-6 text-base font-semibold">Звук</h2>
      <CompletionSoundSettings />
    </PageFade>
  );
}
