import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { ApiError } from "@/shared/api/client";
import { session } from "@/shared/api/session";
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
    <form onSubmit={onSubmit}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
