import { ArrowUpDownIcon, CheckIcon } from "lucide-react";
import { Popover } from "@/shared/ui";
import type { ListDisplaySettings, ListGroupMode, ListSortMode } from "../model/list-display";

const GROUP_OPTIONS: { value: ListGroupMode; label: string }[] = [
  { value: "none", label: "Без группировки" },
  { value: "date", label: "По дате" },
  { value: "priority", label: "По приоритету" },
];

const SORT_OPTIONS: { value: ListSortMode; label: string }[] = [
  { value: "manual", label: "Вручную (перетаскиванием)" },
  { value: "date", label: "По дате" },
  { value: "priority", label: "По приоритету" },
  { value: "title", label: "По названию" },
];

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-option-hover"
      onClick={onClick}
    >
      {label}
      {active ? <CheckIcon aria-hidden className="size-4 shrink-0 text-primary-text" /> : null}
    </button>
  );
}

/** Кнопка «Группировка и сортировка» в хедере страницы списка. */
export function ListDisplaySettingsButton({
  settings,
  onChange,
}: {
  settings: ListDisplaySettings;
  onChange: (settings: ListDisplaySettings) => void;
}) {
  return (
    <Popover
      placement="bottom-end"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          title="Группировка и сортировка"
          aria-label="Группировка и сортировка"
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
        >
          <ArrowUpDownIcon className="size-4" />
        </button>
      )}
    >
      <div className="flex w-64 flex-col gap-3 p-2">
        <div role="group" aria-label="Группировка">
          <p className="px-2 pb-1 text-xs text-muted-foreground">Группировка</p>
          {GROUP_OPTIONS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              active={settings.group === option.value}
              onClick={() => onChange({ ...settings, group: option.value })}
            />
          ))}
        </div>
        <div role="group" aria-label="Сортировка">
          <p className="px-2 pb-1 text-xs text-muted-foreground">Сортировка</p>
          {SORT_OPTIONS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              active={settings.sort === option.value}
              onClick={() => onChange({ ...settings, sort: option.value })}
            />
          ))}
        </div>
      </div>
    </Popover>
  );
}
