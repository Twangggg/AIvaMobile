import { create } from 'zustand';

import type { TemplateEntity } from '../types';

export const useTemplateStore = create<{ selected: TemplateEntity | null; setSelected: (value: TemplateEntity | null) => void }>((set) => ({
  selected: null,
  setSelected: (value) => set({ selected: value }),
}));
