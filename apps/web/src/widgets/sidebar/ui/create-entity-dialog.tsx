import { useEffect, useState } from "react";
import type { EntityIcon, ListColor } from "@plana/shared";
import { useCreateTag } from "@/features/tag-manage";
import { useCreateFolder, useCreateList } from "@/features/structure-manage";
import { errorMessage } from "@/shared/lib/error-message";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogWindow,
  Input,
  Label,
  StyleColorGrid,
  StyleIconGrid,
} from "@/shared/ui";

export type CreateEntityKind = "list" | "folder" | "tag";

const TITLES: Record<CreateEntityKind, { title: string; submit: string; label: string }> = {
  list: { title: "Новый проект", submit: "Создать проект", label: "Название проекта" },
  folder: { title: "Новая папка", submit: "Создать папку", label: "Название папки" },
  tag: { title: "Новый тег", submit: "Создать тег", label: "Название тега" },
};

interface CreateEntityDialogProps {
  kind: CreateEntityKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Проект создаётся сразу внутри этой папки. */
  folderId?: string;
  onError: (message: string) => void;
}

/**
 * Модалка создания проекта/папки/тега. У проекта и тега — имя, цвет и
 * иконка (сетками из StylePickers), у папки — только имя.
 */
export function CreateEntityDialog({
  kind,
  open,
  onOpenChange,
  folderId,
  onError,
}: CreateEntityDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ListColor>("gray");
  const [icon, setIcon] = useState<EntityIcon | null>(null);
  // Вид диалога фиксируется на момент открытия: во время exit-анимации
  // родитель уже сбросил kind (null → «list»), и без фиксации мелькает
  // заголовок «Новый проект» поверх закрывающейся «Новой папки».
  const [openedKind, setOpenedKind] = useState<CreateEntityKind>(kind);

  const createList = useCreateList();
  const createFolder = useCreateFolder();
  const createTag = useCreateTag();
  const busy = createList.isPending || createFolder.isPending || createTag.isPending;

  // Каждое открытие — чистая форма и актуальный kind.
  useEffect(() => {
    if (open) {
      setOpenedKind(kind);
      setName("");
      setColor("gray");
      setIcon(null);
    }
  }, [open, kind]);

  const texts = TITLES[openedKind];
  const styled = openedKind !== "folder";

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    try {
      if (openedKind === "list") {
        await createList.mutateAsync({ name: trimmed, color, icon, folderId });
      } else if (openedKind === "folder") {
        await createFolder.mutateAsync({ name: trimmed });
      } else {
        await createTag.mutateAsync({ name: trimmed, color, icon });
      }
      onOpenChange(false);
    } catch (cause) {
      onError(errorMessage(cause));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogWindow className="gap-4 sm:w-96" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{texts.title}</DialogTitle>
        </DialogHeader>
        <DialogContent className="flex flex-col gap-4 px-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            id="create-entity-form"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-entity-name">{texts.label}</Label>
              <Input
                id="create-entity-name"
                value={name}
                placeholder={texts.label}
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {styled ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Цвет</Label>
                  <StyleColorGrid value={color} onChange={setColor} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Иконка</Label>
                  <StyleIconGrid color={color} value={icon} onChange={setIcon} />
                </div>
              </>
            ) : null}
          </form>
        </DialogContent>
        <DialogFooter className="px-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-entity-form"
            disabled={busy || name.trim().length === 0}
          >
            {texts.submit}
          </Button>
        </DialogFooter>
      </DialogWindow>
    </Dialog>
  );
}
