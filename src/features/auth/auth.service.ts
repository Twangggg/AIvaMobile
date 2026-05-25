import { apiClient } from '@/services/http/client';

import type { LoginPayload, Tokens } from './auth.types';

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<Tokens>('/auth/login', payload);
    return data;
  },
  async refresh(refreshToken: string) {
    const { data } = await apiClient.post<Tokens>('/auth/refresh', { refreshToken });
    return data;
  },
};
