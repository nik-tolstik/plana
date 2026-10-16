import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Управляемая однострочная (растущая по контенту) строка ввода инлайн-режимов.
 * Фокус при монтировании; каретка — в переданную позицию, иначе в конец.
 */
export function InlineInput({
  className,
  value,
  placeholder,
  ariaLabel,
  autoFocus = true,
  initialCaret,
  onChange,
  onCommit,
  onShiftEnter,
  onCancel,
  onBlur,
}: {
  className?: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  /** Позиция каретки при монтировании (например, место клика по названию). */
  initialCaret?: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  onShiftEnter?: () => void;
  onCancel: () => void;
  onBlur?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !autoFocus) return;
    node.focus();
    const caret =
      initialCaret !== undefined && initialCaret >= 0 && initialCaret <= node.value.length
        ? initialCaret
        : node.value.length;
    node.setSelectionRange(caret, caret);
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [autoFocus, initialCaret]);

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        event.target.style.height = "auto";
        event.target.style.height = `${event.target.scrollHeight}px`;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (event.shiftKey && onShiftEnter) {
            onShiftEnter();
            return;
          }
          onCommit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onBlur?.()}
      className={cn(
        // px-0 + leading-6: метрики совпадают со статичной кнопкой названия —
        // текст не сдвигается при входе/выходе из правки.
        "w-full resize-none rounded-md bg-transparent px-0 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground",
        className,
      )}
    />
  );
}
