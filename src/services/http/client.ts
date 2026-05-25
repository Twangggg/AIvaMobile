import axios from 'axios';
import axiosRetry from 'axios-retry';

import { ENV } from '@/config/env';
import { useAuthStore } from '@/features/auth/auth.store';

import { ApiError } from './errors';

export const apiClient = axios.create({ baseURL: ENV.EXPO_PUBLIC_API_URL, timeout: 10000 });

axiosRetry(apiClient, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error),
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await useAuthStore.getState().refreshSession();
      if (refreshed && error.config) {
        return apiClient.request(error.config);
      }
      await useAuthStore.getState().logout();
    }
    throw new ApiError(error.response?.data?.message ?? error.message ?? 'API error', error.response?.status ?? 500);
  },
);
