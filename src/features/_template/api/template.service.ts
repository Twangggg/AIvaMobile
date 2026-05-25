import { apiClient } from '@/services/http/client';

import type { TemplateEntity } from '../types';

export const templateService = {
  async getAll() {
    const { data } = await apiClient.get<TemplateEntity[]>('/template');
    return data;
  },
};
