import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useSessionStore } from "@/entities/user";
import { ApiError } from "@/shared/api/client";
import { session } from "@/shared/api/session";
import { apiRegister } from "../api/auth-api";
import { applyTheme } from "@/features/theme-switch/model/theme";

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
    <form onSubmit={onSubmit}>
      <label>
        Имя
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
        />
      </label>
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
        Пароль (минимум 8 символов)
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Создаём…" : "Создать аккаунт"}
      </button>
    </form>
  );
}
