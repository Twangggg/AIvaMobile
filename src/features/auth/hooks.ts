import { useAuthStore } from './auth.store';
import { roleFromTokens } from './auth.types';

export function useAuth() {
  const tokens = useAuthStore((s) => s.tokens);
  return {
    status: useAuthStore((s) => s.status),
    hydrated: useAuthStore((s) => s.hydrated),
    tokens,
    role: roleFromTokens(tokens),
    isParent: roleFromTokens(tokens) === 'parent',
    login: useAuthStore((s) => s.login),
    register: useAuthStore((s) => s.register),
    logout: useAuthStore((s) => s.logout),
    bootstrap: useAuthStore((s) => s.bootstrap),
    setUser: useAuthStore((s) => s.setUser),
    setTokens: useAuthStore((s) => s.setTokens),
  };
}
