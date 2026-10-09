import type { UserDto } from "@plana/shared";
import { create } from "zustand";

export type SessionStatus = "loading" | "authed" | "anon";

interface SessionState {
  status: SessionStatus;
  user: UserDto | null;
  setAuthed: (user: UserDto) => void;
  setUser: (user: UserDto) => void;
  setAnon: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: "loading",
  user: null,
  setAuthed: (user) => set({ status: "authed", user }),
  setUser: (user) => set({ user }),
  setAnon: () => set({ status: "anon", user: null }),
}));
