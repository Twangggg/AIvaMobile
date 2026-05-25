import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { Nullable } from '@/types/common';

import { authService } from './auth.service';
import type { LoginPayload, Tokens } from './auth.types';

type AuthState = {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  tokens: Nullable<Tokens>;
  hydrated: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const STORAGE_KEY = 'auth_tokens';

async function saveTokens(tokens: Nullable<Tokens>) {
  if (!tokens) return SecureStore.deleteItemAsync(STORAGE_KEY);
  return SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  tokens: null,
  hydrated: false,
  bootstrap: async () => {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return set({ hydrated: true, status: 'unauthenticated' });
    try {
      set({ hydrated: true, status: 'authenticated', tokens: JSON.parse(raw) as Tokens });
    } catch {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      set({ hydrated: true, status: 'unauthenticated', tokens: null });
    }
  },
  login: async (payload) => {
    set({ status: 'loading' });
    const tokens = await authService.login(payload);
    await saveTokens(tokens);
    set({ tokens, status: 'authenticated' });
  },
  logout: async () => {
    await saveTokens(null);
    set({ tokens: null, status: 'unauthenticated' });
  },
  refreshSession: async () => {
    const current = get().tokens;
    if (!current?.refreshToken) return false;
    try {
      const tokens = await authService.refresh(current.refreshToken);
      await saveTokens(tokens);
      set({ tokens, status: 'authenticated' });
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },
}));
