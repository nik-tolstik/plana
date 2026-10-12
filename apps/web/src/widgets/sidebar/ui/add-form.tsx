import { useState, type FormEvent, type KeyboardEvent } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { Input } from "@/shared/ui";

interface AddFormProps {
  placeholder: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}

/** Инлайн-форма добавления (список/папка). После успеха поле очищается — можно вводить следующее. */
export function AddForm({ placeholder, onSubmit, onCancel }: AddFormProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = value.trim();
    if (!name || busy) {
      return;
    }
    setBusy(true);
    try {
      await onSubmit(name);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onCancel();
    }
  }

  return (
    <form className="flex items-center gap-1 py-0.5" onSubmit={submit}>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus
        disabled={busy}
        className="min-h-8"
      />
      <button
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground disabled:opacity-50"
        type="submit"
        title="Добавить"
        disabled={busy}
      >
        <CheckIcon className="size-4" />
      </button>
      <button
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
        type="button"
        title="Отмена"
        onClick={onCancel}
      >
        <XIcon className="size-4" />
      </button>
    </form>
  );
}
