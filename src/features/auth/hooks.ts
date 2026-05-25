import { useAuthStore } from './auth.store';

export function useAuth() {
  return {
    status: useAuthStore((s) => s.status),
    hydrated: useAuthStore((s) => s.hydrated),
    login: useAuthStore((s) => s.login),
    logout: useAuthStore((s) => s.logout),
    bootstrap: useAuthStore((s) => s.bootstrap),
  };
}
