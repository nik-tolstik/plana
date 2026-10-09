import { useState } from "react";
import { LoginForm, RegisterForm } from "@/features/auth";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <main className="auth-main">
      <h1>Plana</h1>
      <div role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => setMode("login")}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => setMode("register")}
        >
          Регистрация
        </button>
      </div>
      {mode === "login" ? <LoginForm /> : <RegisterForm />}
    </main>
  );
}
