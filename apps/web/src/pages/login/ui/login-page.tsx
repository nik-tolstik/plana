import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LoginForm, RegisterForm } from "@/features/auth";
import { Segmented } from "@/shared/ui";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="mx-auto mt-[10vh] max-w-[420px] px-4">
      <h1 className="mb-6 text-2xl font-bold">Plana</h1>
      <Segmented
        className="mb-4"
        name="auth-mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "login", label: "Вход" },
          { value: "register", label: "Регистрация" },
        ]}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
