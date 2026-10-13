import { useState } from "react";
import { SettingsIcon } from "lucide-react";
import { ENTITY_ICONS, type EntityIcon, type ListColor } from "@plana/shared";

import { cn } from "@/shared/lib/cn";
import { Button, Input, Label, Popover } from "@/shared/ui";
import { ENTITY_COLORS, ENTITY_ICON_COMPONENTS } from "./EntityVisuals";

export interface EntityStyle {
  name: string;
  color: ListColor;
  icon: EntityIcon | null;
}

export interface EntityStylePatch {
  name?: string;
  color?: ListColor;
  icon?: EntityIcon | null;
}

/** Сетка выбора цвета (radiogroup). Общая для поповера настроек и модалки создания. */
export function StyleColorGrid({
  value,
  onChange,
}: {
  value: ListColor;
  onChange: (color: ListColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Цвет">
      {(Object.keys(ENTITY_COLORS) as ListColor[]).map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          title={color}
          className={cn(
            "size-6 cursor-pointer rounded-full transition-transform hover:scale-110",
            value === color && "outline-2 outline-offset-2 outline-[var(--control-focus)]",
          )}
          style={{ background: ENTITY_COLORS[color] }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

/** Сетка выбора иконки; первый пункт — «без иконки» (цветная точка). */
export function StyleIconGrid({
  color,
  value,
  onChange,
}: {
  color: ListColor;
  value: EntityIcon | null;
  onChange: (icon: EntityIcon | null) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      <button
        type="button"
        title="Без иконки"
        aria-pressed={value === null}
        className={cn(
          "flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-option-hover",
          value === null && "bg-option-selected",
        )}
        onClick={() => onChange(null)}
      >
        <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLORS[color] }} />
      </button>
      {ENTITY_ICONS.map((icon) => {
        const Icon = ENTITY_ICON_COMPONENTS[icon];
        return (
          <button
            key={icon}
            type="button"
            title={icon}
            aria-pressed={value === icon}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-option-hover",
              value === icon && "bg-option-selected",
            )}
            onClick={() => onChange(icon)}
          >
            <Icon className="size-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

interface EntityStylePopoverProps {
  style: EntityStyle;
  /** Частичные правки применяются сразу (родитель решает, как сохранять). */
  onChange: (patch: EntityStylePatch) => void;
  title: string;
  nameDisabled?: boolean;
}

/** Контент поповера; монтируется при каждом открытии — имя стартует актуальным. */
function StylePopoverContent({
  style,
  onChange,
  nameDisabled,
  close,
}: EntityStylePopoverProps & { close: () => void }) {
  const [name, setName] = useState(style.name);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed === style.name) {
      setName(style.name);
      return;
    }
    onChange({ name: trimmed });
  }

  return (
    <div className="flex w-64 flex-col gap-3 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entity-style-name">Название</Label>
        <Input
          id="entity-style-name"
          value={name}
          disabled={nameDisabled}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitName();
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Цвет</Label>
        <StyleColorGrid value={style.color} onChange={(color) => onChange({ color })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Иконка</Label>
        <StyleIconGrid
          color={style.color}
          value={style.icon}
          onChange={(icon) => onChange({ icon })}
        />
      </div>

      <Button variant="secondary" size="sm" className="self-end" onClick={() => close()}>
        Готово
      </Button>
    </div>
  );
}

/**
 * Поповер настроек списка/тега: имя, цвет, иконка. Цвет и иконка уходят
 * родителю сразу по клику, имя — по blur/Enter (не на каждый символ).
 */
export function EntityStylePopover({
  style,
  onChange,
  title,
  nameDisabled = false,
}: EntityStylePopoverProps) {
  return (
    <Popover
      placement="bottom-start"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
          title={title}
          aria-label={title}
        >
          <SettingsIcon className="size-3.5" />
        </button>
      )}
    >
      {({ close }) => (
        <StylePopoverContent
          style={style}
          onChange={onChange}
          title={title}
          nameDisabled={nameDisabled}
          close={close}
        />
      )}
    </Popover>
  );
}
