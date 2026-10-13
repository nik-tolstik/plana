import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  CodeIcon,
  DumbbellIcon,
  GraduationCapIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  ListIcon,
  MusicIcon,
  PaletteIcon,
  PawPrintIcon,
  PlaneIcon,
  ShoppingCartIcon,
  TargetIcon,
  UtensilsIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { type EntityIcon, type ListColor } from "@plana/shared";

import { cn } from "@/shared/lib/cn";

/** Ключ иконки → lucide-компонент; набор закрыт enum EntityIcon в @plana/shared. */
export const ENTITY_ICON_COMPONENTS: Record<EntityIcon, LucideIcon> = {
  list: ListIcon,
  inbox: InboxIcon,
  calendar: CalendarIcon,
  briefcase: BriefcaseIcon,
  home: HomeIcon,
  cart: ShoppingCartIcon,
  book: BookOpenIcon,
  study: GraduationCapIcon,
  fitness: DumbbellIcon,
  food: UtensilsIcon,
  travel: PlaneIcon,
  pet: PawPrintIcon,
  music: MusicIcon,
  palette: PaletteIcon,
  code: CodeIcon,
  finance: WalletIcon,
  heart: HeartIcon,
  target: TargetIcon,
};

/** Иконка по ключу; неизвестный/нулевой ключ — нейтральный ListIcon. */
export function EntityIconView({
  icon,
  className,
}: {
  icon: EntityIcon | null;
  className?: string;
}) {
  const Icon = ENTITY_ICON_COMPONENTS[icon ?? "list"] ?? ListIcon;
  return <Icon aria-hidden className={className} />;
}

/** Цвета маркеров списков и тегов. Тема-независимые: точка читается в обеих темах. */
export const ENTITY_COLORS: Record<ListColor, string> = {
  gray: "#9ca3af",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
};

/** Цветной кружок-маркер. */
export function ColorDot({ color, className }: { color: ListColor; className?: string }) {
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full", className)}
      style={{ background: ENTITY_COLORS[color] }}
      aria-hidden
    />
  );
}

/**
 * Маркер сущности: иконка, покрашенная цветом; без иконки — цветная точка.
 * Единый вид списков и тегов в сайдбаре, панели задачи и пикерах.
 */
export function EntityMarker({
  icon,
  color,
  className,
  dotClassName,
}: {
  icon: EntityIcon | null;
  color: ListColor;
  className?: string;
  dotClassName?: string;
}) {
  if (icon === null) {
    return <ColorDot color={color} className={dotClassName} />;
  }
  // Цвет через style: hex из фиксированной палитры, а не токен темы —
  // маркер должен оставаться узнаваемым в обеих темах.
  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      style={{ color: ENTITY_COLORS[color] }}
      aria-hidden
    >
      <EntityIconView icon={icon} className="size-4" />
    </span>
  );
}
