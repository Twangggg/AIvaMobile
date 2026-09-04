import { create } from 'zustand';

import { ENV } from '@/config/env';
import { pullPreferencesFromCloud } from '@/features/aiva/services/preferences.sync';
import type { Nullable } from '@/types/common';

import { authService } from './auth.service';
import type { LoginPayload, RegisterPayload, Tokens, UserInfo } from './auth.types';

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  tokens: Nullable<Tokens>;
  hydrated: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: UserInfo) => Promise<void>;
  setTokens: (tokens: Tokens) => Promise<void>;
};

const DEV_DEMO = { email: 'teacher@aiva.app', password: 'Demo@1234' };

async function afterAuth(tokens: Tokens) {
  if (tokens.user?.role === 'parent') {
    await pullPreferencesFromCloud().catch(() => {});
  }
}

async function loginDemo(): Promise<Tokens | null> {
  try {
    return await authService.login(DEV_DEMO);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  tokens: null,
  hydrated: false,
  bootstrap: async () => {
    try {
      const refreshed = await authService.refresh();
      if (refreshed) {
        await afterAuth(refreshed);
        set({ tokens: refreshed, status: 'authenticated', hydrated: true });
        return;
      }
    } catch {
      /* fall through */
    }

    if (ENV.EXPO_PUBLIC_APP_ENV === 'development') {
      const demo = await loginDemo();
      if (demo) {
        await afterAuth(demo);
        set({ tokens: demo, status: 'authenticated', hydrated: true });
        return;
      }
    }

    set({ hydrated: true, status: 'unauthenticated', tokens: null });
  },
  login: async (payload) => {
    set({ status: 'loading' });
    try {
      const tokens = await authService.login(payload);
      await afterAuth(tokens);
      set({ tokens, status: 'authenticated' });
    } catch (e) {
      set({ status: 'unauthenticated' });
      throw e;
    }
  },
  register: async (payload) => {
    set({ status: 'loading' });
    try {
      const tokens = await authService.register(payload);
      await afterAuth(tokens);
      set({ tokens, status: 'authenticated' });
    } catch (e) {
      set({ status: 'unauthenticated' });
      throw e;
    }
  },
  logout: async () => {
    await authService.logout().catch(() => {});
    set({ tokens: null, status: 'unauthenticated' });
  },
  setUser: async (user) => {
    const current = get().tokens;
    if (!current) return;
    set({ tokens: { ...current, user } });
  },
  setTokens: async (tokens) => {
    set({ tokens, status: 'authenticated' });
  },
  refreshSession: async () => {
    try {
      const tokens = await authService.refresh();
      if (!tokens) return false;
      set({ tokens, status: 'authenticated' });
      return true;
    } catch {
      return false;
    }
  },
}));
