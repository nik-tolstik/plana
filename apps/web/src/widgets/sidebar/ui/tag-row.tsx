import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { NavLink } from "react-router";
import type { PatchTagDto, TagDto } from "@plana/shared";
import { useDeleteTag, useUpdateTag } from "@/features/tag-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { ConfirmDeleteDialog, EntityMarker, EntityStylePopover } from "@/shared/ui";

interface TagRowProps {
  tag: TagDto;
  onError: (message: string) => void;
}

/** Строка тега в сайдбаре: переход, настройки (имя/цвет/иконка), удаление. */
export function TagRow({ tag, onError }: TagRowProps) {
  const [confirming, setConfirming] = useState(false);
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  async function applyStyle(input: PatchTagDto) {
    try {
      await updateTag.mutateAsync({ tagId: tag.id, ...input });
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  return (
    <div className="group relative flex min-h-8 items-center rounded-md pr-1 transition-colors hover:bg-surface-hover">
      <NavLink
        className={({ isActive }) =>
          `flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-left ${isActive ? "bg-surface-selected" : ""}`
        }
        to={`/tag/${tag.id}`}
      >
        <EntityMarker icon={tag.icon} color={tag.color} />
        <span className="truncate">{tag.name}</span>
      </NavLink>
      <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <EntityStylePopover
          title={`Настройки тега «${tag.name}»`}
          style={{ name: tag.name, color: tag.color, icon: tag.icon }}
          onChange={(patch) => void applyStyle(patch)}
        />
        <button
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
          type="button"
          title="Удалить"
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </span>
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Удалить тег «${tag.name}»?`}
        description="Тег снимется со всех задач."
        onConfirm={async () => {
          try {
            await deleteTag.mutateAsync(tag.id);
          } catch (cause) {
            onError(errorMessage(cause));
          }
        }}
      />
    </div>
  );
}
