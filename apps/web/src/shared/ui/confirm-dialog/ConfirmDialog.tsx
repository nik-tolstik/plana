import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Button } from "../button/index.js";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogWindow,
} from "../dialog/index.js";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Пояснение последствий («Задачи попадут в корзину»). */
  description: string;
  confirmLabel?: string;
  /** Асинхронное действие: кнопка держится disabled до завершения, диалог закрывается сам. */
  onConfirm: () => Promise<void>;
}

/**
 * Диалог подтверждения удаления: заменяет нативный window.confirm.
 * Одна схема действия (danger-кнопка с корзиной), Escape/клик по фону — отмена.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Удалить",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogWindow className="gap-4 sm:w-96" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Отмена
          </Button>
          <Button
            variant="danger"
            className={cn(busy && "opacity-80")}
            onClick={() => void confirm()}
            disabled={busy}
          >
            <Trash2Icon className="size-4" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogWindow>
    </Dialog>
  );
}
