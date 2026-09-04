import * as SecureStore from 'expo-secure-store';

import type { PersonaId } from './safety.storage';

export type ChildProfile = {
  id: string;
  name: string;
  persona: PersonaId;
  ageYears: number;
};

type ChildrenState = {
  children: ChildProfile[];
  activeChildId: string;
};

const STORAGE_KEY = 'aiva_children';

export const DEFAULT_CHILD: ChildProfile = {
  id: 'child-1',
  name: 'Bé An',
  persona: 'robot',
  ageYears: 7,
};

const DEFAULT_STATE: ChildrenState = {
  children: [DEFAULT_CHILD],
  activeChildId: DEFAULT_CHILD.id,
};

export async function loadChildrenState(): Promise<ChildrenState> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as ChildrenState;
    if (!parsed.children?.length) return DEFAULT_STATE;
    if (!parsed.children.some((c) => c.id === parsed.activeChildId)) {
      parsed.activeChildId = parsed.children[0].id;
    }
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveChildrenState(state: ChildrenState): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
  void import('./preferences.sync').then((m) => m.pushPreferencesToCloud()).catch(() => {});
}

export async function getActiveChild(): Promise<ChildProfile> {
  const state = await loadChildrenState();
  return state.children.find((c) => c.id === state.activeChildId) ?? state.children[0];
}

export async function setActiveChild(id: string): Promise<ChildrenState> {
  const state = await loadChildrenState();
  if (!state.children.some((c) => c.id === id)) return state;
  const next = { ...state, activeChildId: id };
  await saveChildrenState(next);
  return next;
}

export async function upsertChild(child: ChildProfile): Promise<ChildrenState> {
  const state = await loadChildrenState();
  const idx = state.children.findIndex((c) => c.id === child.id);
  const children =
    idx >= 0
      ? state.children.map((c) => (c.id === child.id ? child : c))
      : [...state.children, child];
  const next = { ...state, children };
  await saveChildrenState(next);
  return next;
}

export async function removeChild(id: string): Promise<ChildrenState> {
  const state = await loadChildrenState();
  const children = state.children.filter((c) => c.id !== id);
  if (children.length === 0) {
    await saveChildrenState(DEFAULT_STATE);
    return DEFAULT_STATE;
  }
  const next = {
    children,
    activeChildId: state.activeChildId === id ? children[0].id : state.activeChildId,
  };
  await saveChildrenState(next);
  return next;
}
