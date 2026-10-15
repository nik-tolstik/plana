import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { ApiError } from "@/shared/api";
import { session } from "@/shared/api";
import { Button, Input, Label } from "@/shared/ui";
import { apiRegister } from "../api/auth-api";
import { applyTheme } from "@/features/theme-switch";

export function RegisterForm() {
  const navigate = useNavigate();
  const setAuthed = useSessionStore((state) => state.setAuthed);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await apiRegister({ name, email, password });
      session.setTokens(data.accessToken, data.refreshToken);
      applyTheme(data.user.theme);
      setAuthed(data.user);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Не удалось зарегистрироваться, попробуйте ещё раз",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name">Имя</Label>
        <Input
          id="register-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={error != null}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Пароль (минимум 8 символов)</Label>
        <Input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          aria-invalid={error != null}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Создаём…" : "Создать аккаунт"}
      </Button>
    </form>
  );
}
