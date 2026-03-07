import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  login: (token: string, expiresAt: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      login: (token, expiresAt) => set({ token, expiresAt, isAuthenticated: true }),
      logout: () => set({ token: null, expiresAt: null, isAuthenticated: false }),
    }),
    { name: 'tuesday-auth' },
  ),
);
