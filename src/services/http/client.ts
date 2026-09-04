import axios from 'axios';
import axiosRetry from 'axios-retry';

import { ENV } from '@/config/env';
import { authService } from '@/features/auth/auth.service';
import { useAuthStore } from '@/features/auth/auth.store';

import { ApiError } from './errors';

export const apiClient = axios.create({ baseURL: ENV.EXPO_PUBLIC_API_URL, timeout: 10000 });

export function setApiBaseUrl(url: string) {
  apiClient.defaults.baseURL = url;
}

axiosRetry(apiClient, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error),
});

apiClient.interceptors.request.use(async (config) => {
  const token =
    useAuthStore.getState().tokens?.accessToken || (await authService.getAccessToken());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');
    const isAuthEndpoint = /\/api\/auth\//.test(url);

    if (status === 401 && !isAuthEndpoint && !(error.config as { __isRetryRequest?: boolean })?.__isRetryRequest) {
      const store = useAuthStore;
      const refreshed = await store.getState().refreshSession();
      if (refreshed && error.config) {
        (error.config as { __isRetryRequest?: boolean }).__isRetryRequest = true;
        return apiClient.request(error.config);
      }
      if (ENV.EXPO_PUBLIC_APP_ENV !== 'development') {
        await store.getState().logout();
      }
    }
    throw new ApiError(
      error.response?.data?.message ?? error.message ?? 'API error',
      typeof status === 'number' ? status : 0,
    );
  },
);
