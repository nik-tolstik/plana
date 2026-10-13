import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { Popover } from "@/shared/ui/popover";

export interface SelectOption<TValue extends string | number = string> {
  value: TValue;
  label: React.ReactNode;
}

export interface SelectProps<TValue extends string | number = string> {
  options: SelectOption<TValue>[];
  value: TValue | undefined;
  onChange: (value: TValue) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * finnn → Plana (упрощён): single-select на Popover (floating-ui) вместо
 * нативного меню ОС. Дропдаун шириной с триггер, выбор закрывает список.
 */
export function Select<TValue extends string | number>({
  options,
  value,
  onChange,
  placeholder = "Выберите…",
  disabled,
  id,
  className,
}: SelectProps<TValue>) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-start"
      offset={4}
      className="p-1"
      style={{ width: "var(--popover-trigger-width)" }}
      trigger={({ ref, ...triggerProps }) => (
        <button
          ref={ref}
          type="button"
          id={id}
          disabled={disabled}
          data-slot="select-trigger"
          className={cn(
            "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md bg-control px-3 text-sm outline-none transition-[color,background-color,box-shadow] hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:ring-2 focus-visible:ring-control-focus/30 ring-inset",
            !selectedOption && "text-muted-foreground",
            open && "bg-control-hover",
            className,
          )}
          {...triggerProps}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
          />
        </button>
      )}
    >
      <div role="listbox" className="flex max-h-72 flex-col overflow-y-auto">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-option-hover focus-visible:bg-option-hover",
                selected && "bg-option-selected",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {selected ? (
                <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
              ) : null}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
