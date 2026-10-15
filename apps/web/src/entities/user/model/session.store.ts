import type { UserDto } from "@plana/shared";
import { create } from "zustand";

export type SessionStatus = "loading" | "authed" | "anon";

interface SessionState {
  status: SessionStatus;
  user: UserDto | null;
  /** Устанавливает пользователя (и при логине, и при обновлении профиля). */
  setAuthed: (user: UserDto) => void;
  setAnon: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: "loading",
  user: null,
  setAuthed: (user) => set({ status: "authed", user }),
  setAnon: () => set({ status: "anon", user: null }),
}));
