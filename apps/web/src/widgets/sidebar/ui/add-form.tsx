import { useState, type FormEvent, type KeyboardEvent } from "react";

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
    <form className="add-form" onSubmit={submit}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus
        disabled={busy}
      />
      <button className="icon-btn" type="submit" title="Добавить" disabled={busy}>
        ✓
      </button>
      <button className="icon-btn" type="button" title="Отмена" onClick={onCancel}>
        ✕
      </button>
    </form>
  );
}
