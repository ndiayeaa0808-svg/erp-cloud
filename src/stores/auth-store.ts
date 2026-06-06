import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  session: unknown | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: unknown | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, session: null, isLoading: false }),
}));
