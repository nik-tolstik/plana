import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { ApiError } from "@/shared/api/client";
import { session } from "@/shared/api/session";
import { Button, Input, Label } from "@/shared/ui";
import { apiLogin } from "../api/auth-api";
import { applyTheme } from "@/features/theme-switch/model/theme";

export function LoginForm() {
  const navigate = useNavigate();
  const setAuthed = useSessionStore((state) => state.setAuthed);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await apiLogin({ email, password });
      session.setTokens(data.accessToken, data.refreshToken);
      applyTheme(data.user.theme);
      setAuthed(data.user);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось войти, попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={error != null}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Пароль</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
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
        {pending ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
