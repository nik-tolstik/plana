import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Input, Popover } from "@/shared/ui";

export interface MultiSelectOption {
  value: string;
  label: string;
  selected: boolean;
  /** Маркер слева в списке (цветная точка тега и т.п.). */
  leading?: React.ReactNode;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  onToggle: (value: string) => void;
  /** Создание нового значения по фильтру-строке (например, нового тега). */
  onCreate?: (name: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Мультиселект на Popover: триггер с чипами выбранных, в дропдауне —
 * поиск по списку, выбранные помечаются галочкой справа и созданием нового
 * значения. На Select не похож только снаружи; внутри те же токены (control/option).
 */
export function MultiSelect({
  options,
  onToggle,
  onCreate,
  placeholder = "Не выбрано",
  searchPlaceholder = "Поиск…",
  ariaLabel = "Выбор значений",
  disabled,
  className,
}: MultiSelectProps) {
  const [filter, setFilter] = useState("");

  const normalizedFilter = filter.trim().toLowerCase();
  const visible = useMemo(
    () =>
      normalizedFilter.length === 0
        ? options
        : options.filter((option) => option.label.toLowerCase().includes(normalizedFilter)),
    [options, normalizedFilter],
  );
  const selectedOptions = options.filter((option) => option.selected);
  const canCreate =
    onCreate !== undefined &&
    filter.trim().length > 0 &&
    !options.some((option) => option.label.toLowerCase() === normalizedFilter);

  return (
    <Popover
      placement="bottom-start"
      className="flex w-64 flex-col gap-1 p-2"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md bg-control px-2.5 py-1 text-left text-sm text-foreground shadow-xs transition-colors hover:bg-control-hover data-[state=open]:bg-control-hover data-[state=open]:[&>.multi-select-chevron]:rotate-180 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded-md bg-surface-selected px-1.5 py-0.5 text-xs font-medium"
              >
                {option.leading}
                {option.label}
              </span>
            ))
          )}
          <ChevronDownIcon
            aria-hidden
            className="multi-select-chevron ml-auto size-4 shrink-0 text-muted-foreground transition-transform"
          />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {onCreate || options.length > 8 ? (
            <Input
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={filter}
              className="min-h-8"
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCreate) {
                  onCreate?.(filter.trim());
                  setFilter("");
                }
                if (event.key === "Escape") {
                  setFilter("");
                  close();
                }
              }}
            />
          ) : null}
          <div
            className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
            role="listbox"
            aria-multiselectable
          >
            {visible.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.selected}
                className={cn(
                  "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-option-hover",
                  option.selected && "bg-option-selected",
                )}
                onClick={() => onToggle(option.value)}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.selected ? (
                  <CheckIcon aria-hidden className="size-4 shrink-0 text-primary-text" />
                ) : null}
              </button>
            ))}
            {visible.length === 0 && !canCreate ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Ничего не найдено</p>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-primary-text hover:bg-option-hover"
                onClick={() => {
                  onCreate?.(filter.trim());
                  setFilter("");
                }}
              >
                <PlusIcon className="size-4 shrink-0" />
                Создать «{filter.trim()}»
              </button>
            ) : null}
          </div>
        </>
      )}
    </Popover>
  );
}
